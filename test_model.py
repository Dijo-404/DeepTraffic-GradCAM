import os
from ultralytics import YOLO

# 1. Define your paths clearly
# Make sure the weight file name matches exactly what you downloaded
weights_path = '/home/dj/Projects/DeepTraffic-GradCAM/best.pt'
video_path = '/home/dj/Downloads/Intern-Stuffs/test.mp4'

# 2. Load the model
# Using the weights you trained (custom model)
model = YOLO(weights_path)

# 3. Run Inference on the Video
# show=True  -> Opens a window to play the video live
# save=True  -> Saves the output video with boxes to 'runs/detect/predict'
# conf=0.4   -> Only shows detections with >40% confidence (cleans up noise)
print(f"Processing {video_path}...")

results = model.predict(
    source=video_path,
    show=True,      # Set to False if you are on a server/headless machine
    save=True,      # Saves the result
    conf=0.4,       # Confidence threshold
    iou=0.5,        # NMS threshold (helps with overlapping cars)
    imgsz=640       # processing size
)

print("------------------------------------------------")
print("Done! The output video is saved in the 'runs/detect' folder created in your current directory.")
