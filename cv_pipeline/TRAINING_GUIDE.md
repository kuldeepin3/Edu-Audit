# Unified school-infrastructure model

The deployed model currently has only three labels. This pipeline prepares a
single 11-class YOLO detection dataset for a replacement model.

## Prepare sources

Download each approved Roboflow dataset in **YOLOv11 Object Detection** format.
Keep every export in `raw_datasets/`; do not overwrite `eduaudit_dataset/`.
Review sample images and labels before including them.

Copy `data/unified_sources.example.yaml` to `data/unified_sources.yaml`. Add a
source only when every source label in `class_map` has the same meaning as the
target label. The builder skips images containing unmapped labels so they never
become accidental negative examples.

Do not use the public `Standing Water` label as `roof_leakage` without manual
re-annotation. Do not combine segmentation and detection exports unless the
source is reviewed; the builder can reduce a segmentation polygon to a box, but
that loses mask precision.

## Build and validate

```powershell
cd cv_pipeline
Copy-Item data/unified_sources.example.yaml data/unified_sources.yaml
python prepare_unified_dataset.py --sources data/unified_sources.yaml --output unified_dataset
```

Open `unified_dataset/dataset_report.json`. Every target class should have
meaningful instance counts in train, validation, and test splits before
training. Add school-specific photos and intact/normal examples for each class.

## Train and install

```powershell
python train.py train --data unified_dataset/data.yaml --epochs 100 --batch 8
python train.py eval --weights runs/train/eduaudit_yolo11_phase2/weights/best.pt --data unified_dataset/data.yaml
```

Only install the new weights after reviewing per-class precision, recall, mAP,
and the confusion matrix. Copy the accepted `best.pt` to
`cv_models/yolov11_nano.pt`, then restart the API container.
