"""
DeepTraffic-GradCAM Backend Server

FastAPI backend providing real-time YOLO vehicle detection
with BoT-SORT multi-object tracking.

Endpoints:
  GET  /api/health     - Server & model health check
  GET  /api/model-info - Model metadata & class names
  POST /api/detect     - Single-frame inference with tracking
"""

import base64
import time
from pathlib import Path
from contextlib import asynccontextmanager

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
from pytorch_grad_cam.utils.image import show_cam_on_image
from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights
import torch

# ─── Configuration ──────────────────────────────────────────────────
MODEL_PATH = Path(__file__).parent / "models" / "best.pt"
TRACKER_CONFIG = Path(__file__).parent / "botsort.yaml"
DEFAULT_CONF = 0.4
DEFAULT_IOU = 0.5
DEFAULT_IMGSZ = 640

# ─── Global model reference ────────────────────────────────────────
model: YOLO | None = None
explain_model = None
cam_extractor = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup, cleanup on shutdown."""
    global model
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model weights not found at {MODEL_PATH}")
    model = YOLO(str(MODEL_PATH))
    # Warm-up inference with a dummy frame
    dummy = np.zeros((640, 640, 3), dtype=np.uint8)
    model.predict(dummy, verbose=False)
    print(f"✓ Model loaded: {MODEL_PATH.name}")
    print(f"✓ Classes: {model.names}")
    print(f"✓ Tracker: BoT-SORT ({TRACKER_CONFIG.name})")

    # Load MobileNetV3 for Grad-CAM
    global explain_model, cam_extractor
    explain_model = mobilenet_v3_small(weights=MobileNet_V3_Small_Weights.DEFAULT)
    explain_model.eval()
    target_layers = [explain_model.features[-1]]
    cam_extractor = GradCAM(model=explain_model, target_layers=target_layers)
    print("✓ Explainability: MobileNetV3 + GradCAM ready")
    yield
    model = None


app = FastAPI(
    title="DeepTraffic-GradCAM API",
    description="YOLOv8 + BoT-SORT vehicle detection & tracking",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request / Response Schemas ─────────────────────────────────────

class DetectRequest(BaseModel):
    """Base64-encoded video frame for inference."""
    frame: str  # base64
    conf: float = DEFAULT_CONF
    iou: float = DEFAULT_IOU
    imgsz: int = DEFAULT_IMGSZ


class BBox(BaseModel):
    x: float       # Normalized x-center (0-1)
    y: float       # Normalized y-center (0-1)
    width: float   # Normalized width  (0-1)
    height: float  # Normalized height (0-1)


class DetectionResult(BaseModel):
    track_id: int
    class_name: str
    class_id: int
    confidence: float
    bbox: BBox


class DetectResponse(BaseModel):
    detections: list[DetectionResult]
    vehicle_count: int
    count_by_class: dict[str, int]
    inference_time_ms: float
    frame_width: int
    frame_height: int
class DetectResponse(BaseModel):
    detections: list[DetectionResult]
    vehicle_count: int
    count_by_class: dict[str, int]
    inference_time_ms: float
    frame_width: int
    frame_height: int
    tracker: str = "botsort"


class ExplainRequest(BaseModel):
    frame: str # base64


class ExplainResponse(BaseModel):
    heatmap: str # base64
    inference_time_ms: float


# ─── Endpoints ──────────────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "model_path": str(MODEL_PATH.name),
        "tracker": "botsort",
    }


@app.get("/api/model-info")
async def model_info():
    if model is None:
        raise HTTPException(503, "Model not loaded")
    return {
        "model_name": MODEL_PATH.stem,
        "model_type": "YOLOv8",
        "tracker": "BoT-SORT",
        "classes": model.names,
        "num_classes": len(model.names),
        "input_size": DEFAULT_IMGSZ,
        "framework": "PyTorch (ultralytics)",
    }


@app.post("/api/detect", response_model=DetectResponse)
async def detect(req: DetectRequest):
    """Run YOLO detection + BoT-SORT tracking on a single frame."""
    if model is None:
        raise HTTPException(503, "Model not loaded")

    # Decode base64 frame
    try:
        img_bytes = base64.b64decode(req.frame)
        np_arr = np.frombuffer(img_bytes, dtype=np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Failed to decode image")
    except Exception as e:
        raise HTTPException(400, f"Invalid frame data: {e}")

    h, w = frame.shape[:2]

    # Run tracking inference (BoT-SORT)
    t0 = time.perf_counter()
    results = model.track(
        frame,
        tracker=str(TRACKER_CONFIG),
        persist=True,
        conf=req.conf,
        iou=req.iou,
        imgsz=req.imgsz,
        verbose=False,
    )
    inference_ms = (time.perf_counter() - t0) * 1000

    # Parse results
    detections: list[DetectionResult] = []
    count_by_class: dict[str, int] = {}

    if results and results[0].boxes is not None:
        boxes = results[0].boxes
        for i in range(len(boxes)):
            # Get box in xyxy format
            xyxy = boxes.xyxy[i].cpu().numpy()
            x1, y1, x2, y2 = xyxy

            # Normalize coordinates to 0-1
            cx = ((x1 + x2) / 2) / w
            cy = ((y1 + y2) / 2) / h
            bw = (x2 - x1) / w
            bh = (y2 - y1) / h

            conf = float(boxes.conf[i].cpu())
            cls_id = int(boxes.cls[i].cpu())
            cls_name = model.names.get(cls_id, f"class_{cls_id}")

            # Get track ID (fallback to -1 if not tracked)
            track_id = -1
            if boxes.id is not None:
                track_id = int(boxes.id[i].cpu())

            detections.append(DetectionResult(
                track_id=track_id,
                class_name=cls_name,
                class_id=cls_id,
                confidence=round(conf, 4),
                bbox=BBox(x=round(cx, 4), y=round(cy, 4),
                          width=round(bw, 4), height=round(bh, 4)),
            ))

            count_by_class[cls_name] = count_by_class.get(cls_name, 0) + 1

    return DetectResponse(
        detections=detections,
        vehicle_count=len(detections),
        count_by_class=count_by_class,
        inference_time_ms=round(inference_ms, 2),
        frame_width=w,
        frame_height=h,
    )
    return DetectResponse(
        detections=detections,
        vehicle_count=len(detections),
        count_by_class=count_by_class,
        inference_time_ms=round(inference_ms, 2),
        frame_width=w,
        frame_height=h,
    )


@app.post("/api/explain", response_model=ExplainResponse)
async def explain(req: ExplainRequest):
    """Generate Grad-CAM heatmap for the given frame."""
    if cam_extractor is None:
        raise HTTPException(503, "Explainability model not loaded")

    t0 = time.perf_counter()
    
    # Decode frame
    try:
        img_bytes = base64.b64decode(req.frame)
        np_arr = np.frombuffer(img_bytes, dtype=np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Failed to decode")
    except Exception as e:
        raise HTTPException(400, f"Invalid frame: {e}")

    # Preprocess for MobileNet (resize to 224x224, normalize)
    # MobileNet expects RGB 0-1 float
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    rgb_frame_float = np.float32(rgb_frame) / 255
    input_tensor = cv2.resize(rgb_frame_float, (224, 224))
    input_tensor = torch.from_numpy(input_tensor).permute(2, 0, 1).unsqueeze(0)

    # Generate CAM
    # Target: 670 (Motor scooter), 817 (Sports car), 751 (Racer), 436 (Beach wagon)
    # We'll use a loose target or sum of vehicle targets if generic, 
    # but for simplicity, let's target the predicted class or a generic "vehicle" proxy.
    # Since we don't classify first here, we target "Street sign" (919) or "Traffic light" (920)? 
    # Or better: "Trailer truck" (867), "Moving van" (675).
    # Let's target "Sports car" (817) as a proxy for "cars".
    # Or better, we can let GradCAM pick the top category.
    targets = None # Targets the highest confidence category

    # Generate grayscale CAM
    grayscale_cam = cam_extractor(input_tensor=input_tensor, targets=targets)
    grayscale_cam = grayscale_cam[0, :]
    
    # Resize mask back to original frame size
    h, w = frame.shape[:2]
    grayscale_cam_resized = cv2.resize(grayscale_cam, (w, h))

    # Create visualization
    visualization = show_cam_on_image(rgb_frame_float, grayscale_cam_resized, use_rgb=True)
    
    # Convert to BGR for encoding
    vis_bgr = cv2.cvtColor(visualization, cv2.COLOR_RGB2BGR)

    # Encode
    _, buffer = cv2.imencode(".jpg", vis_bgr)
    b64_str = base64.b64encode(buffer).decode("utf-8")
    
    inference_ms = (time.perf_counter() - t0) * 1000

    return ExplainResponse(
        heatmap=b64_str,
        inference_time_ms=round(inference_ms, 2)
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
