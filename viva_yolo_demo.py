import cv2
from ultralytics import YOLO
import sys
import os

def demo_yolo(image_path):
    print("==================================================")
    print("🤖 EduAudit YOLOv11 Demonstration")
    print("==================================================")
    
    # 1. Check if image exists
    if not os.path.exists(image_path):
        print(f"❌ Error: Could not find image at {image_path}")
        print("Please provide a valid image path.")
        sys.exit(1)

    print(f"📸 Loading Image: {image_path}")
    
    # 2. Load the YOLO Model (using custom EduAudit model)
    print("⏳ Loading custom EduAudit YOLOv11 model (cv_models/yolov11_nano.pt)...")
    try:
        model = YOLO("cv_models/yolov11_nano.pt") 
        print("✅ Model loaded successfully!")
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        sys.exit(1)

    # 3. Run Inference
    print("\n🔍 Analyzing image for objects/defects...")
    results = model(image_path)

    # 4. Display Results in Terminal
    print("\n📊 --- ANALYSIS RESULTS ---")
    
    # Extract the first result (since we only passed one image)
    result = results[0]
    
    if len(result.boxes) == 0:
        print("No objects detected in this image.")
    else:
        for box in result.boxes:
            class_id = int(box.cls[0])
            class_name = model.names[class_id]
            confidence = float(box.conf[0]) * 100
            
            # Print to terminal for the examiner to see
            print(f"   -> Detected: {class_name.upper()} | Confidence: {confidence:.2f}%")

    # 5. Save Annotated Image
    output_path = "viva_demo_result.jpg"
    print(f"\n🎨 Drawing bounding boxes and saving as {output_path}...")
    result.save(filename=output_path)
    
    print("\n✅ Demonstration Complete!")
    print(f"Open '{output_path}' to see the AI bounding boxes drawn on the image.")
    print("==================================================")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python viva_yolo_demo.py <path_to_image.jpg>")
    else:
        test_image = sys.argv[1]
        demo_yolo(test_image)
