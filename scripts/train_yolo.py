import os, sys, shutil, argparse
from pathlib import Path
import torch
from ultralytics import YOLO

def train(data_yaml='dataset/eduaudit_final/data.yaml', model_name='yolo11n.pt', epochs=10, batch_size=16, img_size=416, device='cpu', output_dir='runs/detect', target_model_path='cv_models/yolov11_nano.pt', threads=4, resume=False):
    if device == 'cpu':
        torch.set_num_threads(threads)
    
    last_ckpt = Path('runs/detect/runs/detect/eduaudit_yolov11/weights/last.pt')
    if resume and last_ckpt.exists():
        print('=' * 60)
        print('🔄 RESUMING EDUAUDIT YOLOV11 TRAINING FROM CHECKPOINT')
        print(f'Loading weights from: {last_ckpt}')
        print('=' * 60)
        model = YOLO(str(last_ckpt))
        results = model.train(resume=True)
    else:
        print('=' * 60)
        print('EDUAUDIT AI - CUSTOM YOLOV11 DEFECT DETECTION TRAINING')
        print('=' * 60)
        print(f'Dataset: {data_yaml} | Base: {model_name} | Epochs: {epochs} | Device: {device} | CPU Threads: {threads}')
        model = YOLO(model_name)
        results = model.train(
            data=data_yaml,
            epochs=epochs,
            batch=batch_size,
            imgsz=img_size,
            device=device,
            project=output_dir,
            name='eduaudit_yolov11',
            save=True,
            save_period=1,
            workers=2,
            exist_ok=True,
            plots=True
        )

    best_weights = Path('runs/detect/runs/detect/eduaudit_yolov11/weights/best.pt')
    if best_weights.exists():
        os.makedirs(os.path.dirname(target_model_path), exist_ok=True)
        shutil.copy2(str(best_weights), target_model_path)
        print(f'Model deployed to: {target_model_path}')
    val_metrics = model.val(data=data_yaml, split='test')
    print(f'mAP@50: {val_metrics.box.map50:.4f}')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', default='dataset/eduaudit_final/data.yaml')
    parser.add_argument('--model', default='yolo11n.pt')
    parser.add_argument('--epochs', type=int, default=10)
    parser.add_argument('--batch', type=int, default=16)
    parser.add_argument('--imgsz', type=int, default=416)
    parser.add_argument('--device', default='cpu')
    parser.add_argument('--target', default='cv_models/yolov11_nano.pt')
    parser.add_argument('--resume', action='store_true', help='Resume training from last.pt checkpoint')
    args = parser.parse_args()
    train(args.data, args.model, args.epochs, args.batch, args.imgsz, args.device, target_model_path=args.target, resume=args.resume)
