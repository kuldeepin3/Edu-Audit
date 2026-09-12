"""Build one YOLO detection dataset from reviewed Roboflow exports.

This script deliberately does not download or relabel public data blindly.
Each source needs an explicit class_map in unified_sources.yaml, so a class
such as ``Standing Water`` cannot accidentally become ``roof_leakage``.
"""
import argparse
import json
import shutil
from pathlib import Path

import yaml

CLASSES = [
    "broken_toilet", "no_water_facility", "unsafe_wiring", "damaged_wall",
    "roof_leakage", "broken_furniture", "broken_window_door", "missing_ramp",
    "poor_sanitation", "boundary_wall_damage", "playground_hazard",
]
CLASS_IDS = {name: index for index, name in enumerate(CLASSES)}
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


def names_from_yaml(path: Path):
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    names = data.get("names", {})
    if isinstance(names, list):
        return {index: value for index, value in enumerate(names)}
    return {int(key): value for key, value in names.items()}


def yolo_box(parts):
    """Return a detection box, converting a YOLO segmentation polygon if needed."""
    values = [float(value) for value in parts[1:]]
    if len(values) == 4:
        return values
    if len(values) >= 6 and len(values) % 2 == 0:
        xs, ys = values[::2], values[1::2]
        left, right = min(xs), max(xs)
        top, bottom = min(ys), max(ys)
        return [(left + right) / 2, (top + bottom) / 2, right - left, bottom - top]
    return None


def source_split(root: Path, split: str):
    aliases = {"train": ("train",), "val": ("valid", "val"), "test": ("test",)}[split]
    for name in aliases:
        for image_dir in (root / name / "images", root / "images" / name):
            if image_dir.exists():
                label_dir = image_dir.parent / "labels" if image_dir.parent.name in aliases else root / "labels" / name
                return image_dir, label_dir
    return None, None


def copy_source(source, output: Path, report):
    root = Path(source["path"]).resolve()
    names = names_from_yaml(root / source.get("data_yaml", "data.yaml"))
    mapping = {key.lower().strip(): value for key, value in source["class_map"].items()}
    slug = source["name"].replace(" ", "_").lower()

    for split in ("train", "val", "test"):
        image_dir, label_dir = source_split(root, split)
        if image_dir is None:
            continue
        for image in image_dir.rglob("*"):
            if image.suffix.lower() not in IMAGE_SUFFIXES:
                continue
            input_label = label_dir / image.relative_to(image_dir).with_suffix(".txt")
            rows = input_label.read_text(encoding="utf-8").splitlines() if input_label.exists() else []
            converted = []
            unsupported = False
            for row in rows:
                parts = row.split()
                if not parts:
                    continue
                label = mapping.get(str(names.get(int(parts[0]), "")).lower().strip())
                box = yolo_box(parts)
                if label is None:
                    unsupported = True
                    continue
                if box is None:
                    report["invalid_annotations"] += 1
                    continue
                converted.append(f"{CLASS_IDS[label]} " + " ".join(f"{value:.6f}" for value in box))

            # Do not turn an image containing an unmapped object into a false
            # negative training example. Review it and add a mapping first.
            if unsupported:
                report["skipped_unmapped_images"] += 1
                continue

            destination = output / "images" / split / f"{slug}_{image.name}"
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(image, destination)
            label_destination = output / "labels" / split / destination.with_suffix(".txt").name
            label_destination.parent.mkdir(parents=True, exist_ok=True)
            label_destination.write_text("\n".join(converted), encoding="utf-8")
            report["images"][split] += 1
            for line in converted:
                report["instances"][CLASSES[int(line.split()[0])]] += 1


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sources", default="data/unified_sources.yaml")
    parser.add_argument("--output", default="unified_dataset")
    args = parser.parse_args()
    config = yaml.safe_load(Path(args.sources).read_text(encoding="utf-8"))
    output = Path(args.output).resolve()
    if output.exists():
        raise SystemExit(f"Output already exists: {output}. Choose a new --output path.")

    report = {"images": {"train": 0, "val": 0, "test": 0}, "instances": {name: 0 for name in CLASSES}, "skipped_unmapped_images": 0, "invalid_annotations": 0}
    for source in config["sources"]:
        copy_source(source, output, report)

    (output / "data.yaml").write_text(yaml.safe_dump({"path": str(output), "train": "images/train", "val": "images/val", "test": "images/test", "names": {index: name for index, name in enumerate(CLASSES)}}, sort_keys=False), encoding="utf-8")
    (output / "dataset_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
