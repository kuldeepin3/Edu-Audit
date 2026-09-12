import argparse
import os
from pathlib import Path
from ultralytics import YOLO

def run_yolo_demo(image_path: str, model_path: str = 'cv_models/yolov11_nano.pt', conf: float = 0.20):
    print('=' * 65)
    print('EDUAUDIT AI - YOLOV11 INFRASTRUCTURE DEFECT DETECTION DEMO')
    print('=' * 65)
    print(f'Model Weights : {model_path}')
    print(f'Input Image   : {image_path}')
    print(f'Confidence Cut: {conf*100:.0f}%')
    print('=' * 65)

    if not os.path.exists(image_path):
        print(f'Error: Image not found at {image_path}')
        return

    print('\n[1/3] Loading YOLOv11 Neural Network Architecture...')
    model = YOLO(model_path)
    print(f'      Learned Classes: {list(model.names.values())}')

    print('\n[2/3] Running Forward Pass and Bounding Box Extraction...')
    results = model.predict(image_path, conf=conf, save=True, project='runs/demo', name='yolo_output', exist_ok=True)
    res = results[0]

    print('\n[3/3] Inference Results and Detected Bounding Boxes:')
    if len(res.boxes) == 0:
        print('      No defect bounding boxes found above threshold.')
    else:
        for i, box in enumerate(res.boxes):
            cls_id = int(box.cls[0])
            cls_name = model.names.get(cls_id, 'Unknown')
            confidence = float(box.conf[0]) * 100
            coords = [round(float(c), 1) for c in box.xyxy[0]]
            print(f'      Box #{i+1}: [{cls_name.upper()}] - Confidence: {confidence:.1f}% | Coordinates [x1, y1, x2, y2]: {coords}')

    output_img = Path('runs/demo/yolo_output') / Path(image_path).name
    print('\n' + '=' * 65)
    print(f'Output Annotated Image Saved To: {output_img}')
    print('=' * 65)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Run YOLOv11 Demo on an Image')
    parser.add_argument('--image', default='dataset/eduaudit_final/images/test/campus_manhole_1001.jpg', help='Path to input image')
    parser.add_argument('--model', default='cv_models/yolov11_nano.pt', help='Path to YOLO weights')
    parser.add_argument('--conf', type=float, default=0.20, help='Confidence threshold')
    args = parser.parse_args()

    run_yolo_demo(args.image, args.model, args.conf)
