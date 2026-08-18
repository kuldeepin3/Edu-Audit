"""
EduAudit AI - Computer Vision Training Pipeline
YOLOv11-Nano training for school infrastructure defect detection

Usage:
    python train.py --data data/dataset.yaml --epochs 150 --batch 16 --model yolov11n.pt
    python train.py --eval-only --weights runs/best.pt
    python train.py --export --weights runs/best.pt --format onnx
"""
import argparse
import os
import json
import shutil
from pathlib import Path
from datetime import datetime

import yaml
import torch
import numpy as np
from PIL import Image, ImageDraw, ImageFont


# ============================================================================
# DATASET CONFIGURATION
# ============================================================================

DATASET_YAML = """
# EduAudit AI - School Infrastructure Defect Dataset
# YOLOv11 format

path: /data/eduaudit_dataset  # dataset root
train: images/train
val: images/val
test: images/test

# Class definitions
names:
  0: broken_toilet
  1: damaged_wall
  2: roof_leakage
  3: no_water_facility
  4: unsafe_wiring
  5: broken_furniture
  6: poor_sanitation
  7: structural_damage
  8: broken_window_door
  9: playground_hazard

# Number of classes
nc: 10
"""


def create_dataset_config(output_dir: str = "data"):
    """Create YOLO dataset configuration file"""
    os.makedirs(output_dir, exist_ok=True)
    config_path = os.path.join(output_dir, "dataset.yaml")
    with open(config_path, "w") as f:
        f.write(DATASET_YAML)
    print(f"✅ Dataset config created: {config_path}")
    return config_path


# ============================================================================
# DATA AUGMENTATION PIPELINE
# ============================================================================

class AugmentationPipeline:
    """
    Custom augmentation pipeline for school infrastructure images.
    Handles domain-specific augmentations beyond YOLO's built-in.
    """

    def __init__(self):
        import albumentations as A
        self.transform = A.Compose([
            # Geometric
            A.RandomRotate90(p=0.3),
            A.HorizontalFlip(p=0.5),
            A.ShiftScaleRotate(
                shift_limit=0.1, scale_limit=0.2, rotate_limit=15, p=0.5
            ),
            A.Perspective(scale=(0.05, 0.1), p=0.2),

            # Photometric
            A.RandomBrightnessContrast(
                brightness_limit=0.3, contrast_limit=0.3, p=0.5
            ),
            A.OneOf([
                A.MotionBlur(blur_limit=5, p=0.2),
                A.GaussNoise(var_limit=(10, 50), p=0.2),
                A.ISONoise(color_shift=(0.01, 0.05), p=0.2),
            ], p=0.4),

            # Quality degradation (simulates phone cameras)
            A.ImageCompression(quality_lower=60, quality_upper=95, p=0.3),

            # Weather conditions
            A.OneOf([
                A.RandomRain(blur_value=3, brightness_change=0.1, p=0.2),
                A.RandomFog(fog_coef_lower=0.1, fog_coef_upper=0.4, p=0.15),
                A.RandomSunFlare(flare_roi=(0, 0, 1, 0.5), p=0.1),
            ], p=0.3),

            # Color jitter for different lighting
            A.HueSaturationValue(
                hue_shift_limit=15, sat_shift_limit=20, val_shift_limit=20, p=0.3
            ),
        ], bbox_params=A.BboxParams(
            format='yolo', label_fields=['class_ids'], min_visibility=0.3
        ))

    def augment(self, image, bboxes, class_ids):
        """Apply augmentations to image and bboxes"""
        result = self.transform(
            image=image, bboxes=bboxes, class_ids=class_ids
        )
        return result


# ============================================================================
# TRAINING PIPELINE
# ============================================================================

def train(
    data_yaml: str,
    model_name: str = "yolov11n.pt",
    epochs: int = 150,
    batch_size: int = 16,
    img_size: int = 640,
    device: str = "",  # auto-detect
    workers: int = 8,
    project: str = "runs/train",
    name: str = "eduaudit_yolo11",
    patience: int = 30,
    resume: bool = False,
):
    """
    Train YOLOv11-Nano on school infrastructure defect dataset.

    Strategy:
    1. Phase 1 (epochs 1-50): Freeze backbone, train head only
    2. Phase 2 (epochs 51-150): Unfreeze all, fine-tune with lower LR
    """
    from ultralytics import YOLO

    print("=" * 60)
    print("  EduAudit AI - YOLOv11 Training Pipeline")
    print("=" * 60)
    print(f"  Model:     {model_name}")
    print(f"  Data:      {data_yaml}")
    print(f"  Epochs:    {epochs}")
    print(f"  Batch:     {batch_size}")
    print(f"  Image:     {img_size}")
    print(f"  Device:    {device or 'auto'}")
    print("=" * 60)

    # Load model
    model = YOLO(model_name)

    # Phase 1: Train head (freeze backbone)
    print("\n🧊 Phase 1: Training head layers (backbone frozen)")
    phase1_epochs = min(50, epochs // 3)
    model.train(
        data=data_yaml,
        epochs=phase1_epochs,
        batch=batch_size,
        imgsz=img_size,
        device=device,
        workers=workers,
        project=project,
        name=f"{name}_phase1",
        freeze=10,  # Freeze first 10 layers (backbone)
        patience=patience,
        pretrained=True,
        optimizer="AdamW",
        lr0=0.001,
        lrf=0.01,
        weight_decay=0.0005,
        warmup_epochs=5,
        warmup_momentum=0.8,
        box=7.5,
        cls=0.5,
        dfl=1.5,
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        degrees=10,
        translate=0.1,
        scale=0.3,
        shear=2.0,
        flipud=0.0,
        fliplr=0.5,
        mosaic=1.0,
        mixup=0.1,
        copy_paste=0.1,
        close_mosaic=10,
        amp=True,
        verbose=True,
    )

    # Phase 2: Fine-tune all layers
    print(f"\n🔥 Phase 2: Fine-tuning all layers ({epochs - phase1_epochs} epochs)")
    best_weights = os.path.join(project, f"{name}_phase1", "weights", "best.pt")
    model = YOLO(best_weights)
    model.train(
        data=data_yaml,
        epochs=epochs,
        batch=batch_size,
        imgsz=img_size,
        device=device,
        workers=workers,
        project=project,
        name=f"{name}_phase2",
        freeze=0,  # Unfreeze all
        patience=patience,
        pretrained=False,
        optimizer="AdamW",
        lr0=0.0001,  # Lower LR for fine-tuning
        lrf=0.01,
        weight_decay=0.0005,
        warmup_epochs=3,
        mosaic=0.5,  # Reduce mosaic
        mixup=0.05,
        amp=True,
        verbose=True,
    )

    print("\n✅ Training complete!")
    print(f"   Best weights: {project}/{name}_phase2/weights/best.pt")
    print(f"   Last weights: {project}/{name}_phase2/weights/last.pt")

    return model


# ============================================================================
# EVALUATION
# ============================================================================

def evaluate(weights: str, data_yaml: str, img_size: int = 640, device: str = ""):
    """Evaluate trained model on test set"""
    from ultralytics import YOLO

    model = YOLO(weights)
    results = model.val(
        data=data_yaml,
        imgsz=img_size,
        device=device,
        split="test",
        conf=0.45,
        iou=0.45,
        save_json=True,
        save_txt=True,
        plots=True,
        verbose=True,
    )

    print("\n" + "=" * 60)
    print("  EVALUATION RESULTS")
    print("=" * 60)
    print(f"  mAP@0.5:     {results.box.map50:.4f}")
    print(f"  mAP@0.5:0.95: {results.box.map:.4f}")
    print(f"  Precision:    {results.box.mp:.4f}")
    print(f"  Recall:       {results.box.mr:.4f}")

    # Per-class metrics
    print("\n  Per-Class Results:")
    print(f"  {'Class':<25} {'Precision':>10} {'Recall':>10} {'mAP50':>10} {'mAP':>10}")
    print("  " + "-" * 65)

    class_names = {
        0: "Broken Toilet", 1: "Damaged Wall", 2: "Roof Leakage",
        3: "No Water", 4: "Unsafe Wiring", 5: "Broken Furniture",
        6: "Poor Sanitation", 7: "Structural Damage",
        8: "Broken Window", 9: "Playground Hazard",
    }

    if hasattr(results.box, "ap_class_index") and results.box.ap_class_index is not None:
        for i, cls_idx in enumerate(results.box.ap_class_index):
            name = class_names.get(int(cls_idx), f"Class {cls_idx}")
            p = results.box.p[i] if results.box.p is not None else 0
            r = results.box.r[i] if results.box.r is not None else 0
            ap50 = results.box.ap50[i] if results.box.ap50 is not None else 0
            ap = results.box.ap[i] if results.box.ap is not None else 0
            print(f"  {name:<25} {p:>10.4f} {r:>10.4f} {ap50:>10.4f} {ap:>10.4f}")

    return results


# ============================================================================
# EXPORT / DEPLOYMENT
# ============================================================================

def export_model(
    weights: str,
    format: str = "onnx",
    img_size: int = 640,
    half: bool = True,  # FP16 for mobile
    int8: bool = False,  # INT8 for edge
    simplify: bool = True,
    dynamic: bool = False,
):
    """
    Export trained model to deployment format.

    Supported formats:
    - onnx (default, cross-platform)
    - tflite (Android)
    - coreml (iOS)
    - openvino (Intel)
    - tensorrt (NVIDIA)
    - ncnn (mobile)
    """
    from ultralytics import YOLO

    model = YOLO(weights)

    print(f"\n📦 Exporting model to {format}...")
    model.export(
        format=format,
        imgsz=img_size,
        half=half,
        int8=int8,
        simplify=simplify,
        dynamic=dynamic,
    )

    export_path = weights.replace(".pt", f".{format}")
    if os.path.exists(export_path):
        size_mb = os.path.getsize(export_path) / (1024 * 1024)
        print(f"✅ Exported: {export_path} ({size_mb:.2f} MB)")
    else:
        print(f"✅ Export complete. Check {os.path.dirname(weights)}")

    return export_path


# ============================================================================
# INFERENCE BENCHMARK
# ============================================================================

def benchmark(weights: str, img_size: int = 640, device: str = "", iterations: int = 100):
    """Benchmark inference speed"""
    from ultralytics import YOLO
    import time

    model = YOLO(weights)
    dummy = np.random.randint(0, 255, (img_size, img_size, 3), dtype=np.uint8)

    # Warmup
    for _ in range(10):
        model.predict(dummy, verbose=False)

    # Benchmark
    times = []
    for _ in range(iterations):
        start = time.perf_counter()
        model.predict(dummy, verbose=False)
        elapsed = (time.perf_counter() - start) * 1000  # ms
        times.append(elapsed)

    print(f"\n⚡ Inference Benchmark ({iterations} iterations)")
    print(f"  Mean: {np.mean(times):.2f} ms")
    print(f"  P50:  {np.percentile(times, 50):.2f} ms")
    print(f"  P95:  {np.percentile(times, 95):.2f} ms")
    print(f"  P99:  {np.percentile(times, 99):.2f} ms")
    print(f"  Min:  {np.min(times):.2f} ms")
    print(f"  Max:  {np.max(times):.2f} ms")


# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="EduAudit AI - CV Training Pipeline")

    subparsers = parser.add_subparsers(dest="command", help="Command")

    # Train
    train_parser = subparsers.add_parser("train", help="Train the model")
    train_parser.add_argument("--data", default="data/dataset.yaml", help="Dataset YAML path")
    train_parser.add_argument("--model", default="yolov11n.pt", help="Pre-trained model")
    train_parser.add_argument("--epochs", type=int, default=150)
    train_parser.add_argument("--batch", type=int, default=16)
    train_parser.add_argument("--img-size", type=int, default=640)
    train_parser.add_argument("--device", default="")
    train_parser.add_argument("--workers", type=int, default=8)

    # Evaluate
    eval_parser = subparsers.add_parser("eval", help="Evaluate model")
    eval_parser.add_argument("--weights", required=True, help="Model weights path")
    eval_parser.add_argument("--data", default="data/dataset.yaml")
    eval_parser.add_argument("--img-size", type=int, default=640)
    eval_parser.add_argument("--device", default="")

    # Export
    export_parser = subparsers.add_parser("export", help="Export model")
    export_parser.add_argument("--weights", required=True)
    export_parser.add_argument("--format", default="onnx", choices=["onnx", "tflite", "coreml", "openvino", "tensorrt", "ncnn"])
    export_parser.add_argument("--img-size", type=int, default=640)
    export_parser.add_argument("--int8", action="store_true", help="Quantize to INT8")
    export_parser.add_argument("--half", action="store_true", help="FP16 quantization")

    # Benchmark
    bench_parser = subparsers.add_parser("benchmark", help="Benchmark inference speed")
    bench_parser.add_argument("--weights", required=True)
    bench_parser.add_argument("--img-size", type=int, default=640)
    bench_parser.add_argument("--device", default="")
    bench_parser.add_argument("--iterations", type=int, default=100)

    # Create dataset config
    subparsers.add_parser("setup", help="Create dataset configuration")

    args = parser.parse_args()

    if args.command == "train":
        train(args.data, args.model, args.epochs, args.batch, args.img_size, args.device, args.workers)
    elif args.command == "eval":
        evaluate(args.weights, args.data, args.img_size, args.device)
    elif args.command == "export":
        export_model(args.weights, args.format, args.img_size, args.half, args.int8)
    elif args.command == "benchmark":
        benchmark(args.weights, args.img_size, args.device, args.iterations)
    elif args.command == "setup":
        create_dataset_config()
    else:
        parser.print_help()
