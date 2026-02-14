import { useState, useRef, useCallback } from "react";

/**
 * YOLO Vehicle Detection Hook — Real Backend Integration
 *
 * Sends video frames to the FastAPI backend running YOLOv8 + BoT-SORT
 * and returns real detection results with persistent track IDs.
 *
 * Architecture:
 *   Frontend (canvas → base64) → POST /api/detect → Backend (YOLO + BoT-SORT) → JSON
 */

export interface Detection {
  id: string;
  class: VehicleClass;
  confidence: number;
  trackId: number;       // BoT-SORT persistent track ID
  bbox: {
    x: number;           // Normalized center-x (0-1)
    y: number;           // Normalized center-y (0-1)
    width: number;       // Normalized width (0-1)
    height: number;      // Normalized height (0-1)
  };
}

export type VehicleClass = "car" | "truck" | "bus" | "motorcycle" | "bicycle";

// Map backend class names to the frontend VehicleClass type
const CLASS_NAME_MAP: Record<string, VehicleClass> = {
  car: "car",
  truck: "truck",
  bus: "bus",
  motorcycle: "motorcycle",
  motorbike: "motorcycle",
  bicycle: "bicycle",
  bike: "bicycle",
};

interface DetectionState {
  detections: Detection[];
  vehicleCount: number;
  countByClass: Record<VehicleClass, number>;
  isDetecting: boolean;
  fps: number;
  lastInferenceTime: number;
  activeTrackIds: number[];
  backendConnected: boolean;
}

interface UseYOLODetectionOptions {
  /** Minimum confidence threshold for detection (default: 0.4) */
  confidenceThreshold?: number;
  /** Target classes to detect (default: all vehicles) */
  targetClasses?: VehicleClass[];
  /** Enable Non-Maximum Suppression (default: true) */
  nmsEnabled?: boolean;
  /** NMS IoU threshold (default: 0.45) */
  nmsThreshold?: number;
}

/** Capture a video frame as a base64-encoded JPEG string */
const captureFrameAsBase64 = (video: HTMLVideoElement): string | null => {
  if (!video || video.readyState < 2) return null;
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  // Get data URL and strip the prefix
  const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
  return dataUrl.split(",")[1] ?? null;
};

export const useYOLODetection = (options: UseYOLODetectionOptions = {}) => {
  const {
    confidenceThreshold = 0.4,
    targetClasses = ["car", "truck", "bus", "motorcycle", "bicycle"],
    nmsEnabled = true,
    nmsThreshold = 0.45,
  } = options;

  const [state, setState] = useState<DetectionState>({
    detections: [],
    vehicleCount: 0,
    countByClass: { car: 0, truck: 0, bus: 0, motorcycle: 0, bicycle: 0 },
    isDetecting: false,
    fps: 0,
    lastInferenceTime: 0,
    activeTrackIds: [],
    backendConnected: false,
  });

  const frameTimestamps = useRef<number[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const inflightRef = useRef(false);

  /** Set the video element reference for frame capture */
  const setVideoElement = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
  }, []);

  /**
   * Send a frame to the backend for detection + tracking.
   * Throttled: skips if a request is already inflight.
   */
  const detectFrame = useCallback(async () => {
    // Skip if already waiting for a response
    if (inflightRef.current) return;

    const video = videoRef.current;
    if (!video) {
      // No video element — run in demo/fallback mode (no-op)
      return;
    }

    const base64 = captureFrameAsBase64(video);
    if (!base64) return;

    inflightRef.current = true;
    setState(prev => ({ ...prev, isDetecting: true }));

    try {
      const resp = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frame: base64,
          conf: confidenceThreshold,
          iou: nmsThreshold,
        }),
      });

      if (!resp.ok) {
        throw new Error(`Backend returned ${resp.status}`);
      }

      const data = await resp.json();

      // Map backend results to frontend Detection type
      const detections: Detection[] = (data.detections ?? [])
        .map((det: any) => {
          const cls = CLASS_NAME_MAP[det.class_name] ?? null;
          if (!cls || !targetClasses.includes(cls)) return null;
          // Use stable ID for tracked objects (prevents React re-renders)
          const id = det.track_id && det.track_id > 0
            ? `track_${det.track_id}`
            : `det_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          return {
            id,
            class: cls,
            confidence: det.confidence,
            trackId: det.track_id,
            bbox: {
              // Backend sends center-based coords; convert to top-left for overlay
              x: det.bbox.x - det.bbox.width / 2,
              y: det.bbox.y - det.bbox.height / 2,
              width: det.bbox.width,
              height: det.bbox.height,
            },
          } as Detection;
        })
        .filter(Boolean) as Detection[];

      // Count by class
      const countByClass: Record<VehicleClass, number> = {
        car: 0, truck: 0, bus: 0, motorcycle: 0, bicycle: 0,
      };
      for (const det of detections) {
        countByClass[det.class]++;
      }

      // Active track IDs
      const activeTrackIds = [...new Set(detections.map(d => d.trackId))];

      // Calculate FPS
      const now = performance.now();
      frameTimestamps.current.push(now);
      if (frameTimestamps.current.length > 30) {
        frameTimestamps.current.shift();
      }
      const fps = frameTimestamps.current.length > 1
        ? 1000 / ((now - frameTimestamps.current[0]) / frameTimestamps.current.length)
        : 0;

      setState({
        detections,
        vehicleCount: detections.length,
        countByClass,
        isDetecting: false,
        fps: Math.round(fps * 10) / 10,
        lastInferenceTime: data.inference_time_ms ?? 0,
        activeTrackIds,
        backendConnected: true,
      });
    } catch {
      // Backend unreachable — mark disconnected
      setState(prev => ({
        ...prev,
        isDetecting: false,
        backendConnected: false,
      }));
    } finally {
      inflightRef.current = false;
    }
  }, [confidenceThreshold, targetClasses, nmsThreshold]);

  const reset = useCallback(() => {
    frameTimestamps.current = [];
    inflightRef.current = false;
    setState({
      detections: [],
      vehicleCount: 0,
      countByClass: { car: 0, truck: 0, bus: 0, motorcycle: 0, bicycle: 0 },
      isDetecting: false,
      fps: 0,
      lastInferenceTime: 0,
      activeTrackIds: [],
      backendConnected: state.backendConnected,
    });
  }, [state.backendConnected]);

  /**
   * Hybrid density estimation combining YOLO count with classification
   */
  const getHybridDensity = useCallback((
    classificationStatus: "low" | "high" | "analyzing"
  ): { status: "low" | "high"; confidence: number; source: "yolo" | "classifier" | "hybrid" } => {
    const count = state.vehicleCount;
    const LOW_THRESHOLD = 5;
    const HIGH_THRESHOLD = 8;

    if (classificationStatus === "analyzing") {
      if (count >= HIGH_THRESHOLD) return { status: "high", confidence: 85, source: "yolo" };
      return { status: "low", confidence: 80, source: "yolo" };
    }

    if (count >= HIGH_THRESHOLD && classificationStatus === "high") {
      return { status: "high", confidence: 95, source: "hybrid" };
    }
    if (count < LOW_THRESHOLD && classificationStatus === "low") {
      return { status: "low", confidence: 95, source: "hybrid" };
    }
    if (count >= HIGH_THRESHOLD + 3) {
      return { status: "high", confidence: 88, source: "yolo" };
    }
    if (count <= 2) {
      return { status: "low", confidence: 88, source: "yolo" };
    }
    return { status: classificationStatus, confidence: 75, source: "classifier" };
  }, [state.vehicleCount]);

  return {
    ...state,
    detectFrame,
    reset,
    getHybridDensity,
    setVideoElement,
    settings: {
      confidenceThreshold,
      targetClasses,
      nmsEnabled,
      nmsThreshold,
    },
  };
};
