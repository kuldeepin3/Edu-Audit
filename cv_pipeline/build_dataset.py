"""
EduAudit AI - Dataset Builder
Helps collect, organize, and annotate the training dataset
"""
import os
import json
import shutil
import random
from pathlib import Path

import yaml


def build_dataset_structure(root: str = "eduaudit_dataset"):
    """Create YOLO-format directory structure"""
    dirs = [
        "images/train", "images/val", "images/test",
        "labels/train", "labels/val", "labels/test",
    ]
    for d in dirs:
        os.makedirs(os.path.join(root, d), exist_ok=True)
    print(f"✅ Dataset structure created at {root}/")


def split_dataset(
    source_dir: str,
    dest_dir: str = "eduaudit_dataset",
    train_ratio: float = 0.7,
    val_ratio: float = 0.2,
    test_ratio: float = 0.1,
    seed: int = 42,
):
    """
    Split raw dataset into train/val/test.
    Source should have: images/ and labels/ directories.
    """
    random.seed(seed)
    build_dataset_structure(dest_dir)

    images = list(Path(source_dir, "images").glob("*.[jp][pn]g"))
    random.shuffle(images)

    n = len(images)
    n_train = int(n * train_ratio)
    n_val = int(n * val_ratio)

    splits = {
        "train": images[:n_train],
        "val": images[n_train:n_train + n_val],
        "test": images[n_train + n_val:],
    }

    for split, imgs in splits.items():
        for img_path in imgs:
            # Copy image
            shutil.copy2(
                img_path,
                Path(dest_dir, "images", split, img_path.name),
            )
            # Copy corresponding label
            label_path = Path(source_dir, "labels", img_path.stem + ".txt")
            if label_path.exists():
                shutil.copy2(
                    label_path,
                    Path(dest_dir, "labels", split, label_path.name),
                )

        print(f"  {split}: {len(imgs)} images")


def generate_roboflow_export():
    """Generate Roboflow API script for dataset download"""
    script = """
import roboflow

rf = roboflow.Roboflow(api_key="YOUR_API_KEY")
project = rf.workspace("eduaudit").project("school-infrastructure-defects")
version = project.version(1)
dataset = version.download("yolov11")

print(f"Dataset downloaded to: {dataset.location}")
"""
    with open("download_dataset.py", "w") as f:
        f.write(script)
    print("✅ Run `python download_dataset.py` to fetch dataset from Roboflow")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--action", choices=["build", "split", "roboflow"], default="build")
    parser.add_argument("--source", default="raw_dataset")
    parser.add_argument("--dest", default="eduaudit_dataset")
    args = parser.parse_args()

    if args.action == "build":
        build_dataset_structure(args.dest)
    elif args.action == "split":
        split_dataset(args.source, args.dest)
    elif args.action == "roboflow":
        generate_roboflow_export()
