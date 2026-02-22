import cv2
from ultralytics import YOLO
import torch

# 1. Setup hardware
device = 0 if torch.cuda.is_available() else 'cpu'
model = YOLO('/home/dj/Downloads/best.pt')

# 2. Run Inference with a persistent window
# Using 'stream=True' is more memory-efficient for local video
results = model.predict(
    source='/home/dj/Downloads/traffic.mp4',
    device=device,
    stream=True,     # Generator for better performance
    conf=0.3,        # Slightly higher confidence to clean up the view
    iou=0.5          # Tighter NMS to avoid crowded box overlapping
)

print("Starting live detection... Press 'q' to stop.")

try:
    for r in results:
        # Get the annotated frame (numpy array)
        annotated_frame = r.plot()

        # Display the frame
        cv2.imshow("YOLOv8 Traffic Detection", annotated_frame)

        # Break the loop if 'q' is pressed
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
except cv2.error as e:
    print("\n[ERROR] Your OpenCV installation does not support GUI windows.")
    print("Run: 'sudo pacman -S python-opencv' to fix this on Arch.")
finally:
    cv2.destroyAllWindows()
