import os
import roboflow
import shutil
from pathlib import Path

# Initialize Roboflow
rf = roboflow.Roboflow(api_key="fVyebpyqmkMov63aqp2M")
project = rf.workspace("forpurpose").project("my-first-project-3iphs")
version = project.version(1)

print("Downloading dataset from Roboflow...")
dataset = version.download("yolov11")
print(f"Dataset downloaded to: {dataset.location}")

# We want the dataset to be in a consistent location, e.g. cv_pipeline/eduaudit_dataset
# Let's move/symlink it if necessary
dest_path = Path("eduaudit_dataset")
if dest_path.exists():
    shutil.rmtree(dest_path)

shutil.move(dataset.location, dest_path)
print(f"Dataset successfully moved to: {dest_path.resolve()}")

# Update path in dataset.yaml to be relative or point to this directory
dataset_yaml_path = dest_path / "data.yaml"
if dataset_yaml_path.exists():
    with open(dataset_yaml_path, "r") as f:
        config = f.read()
    
    # Update the path line to point to the absolute path of eduaudit_dataset
    lines = config.split("\n")
    for i, line in enumerate(lines):
        if line.startswith("path:"):
            lines[i] = f"path: {dest_path.resolve()}"
            break
            
    with open(dataset_yaml_path, "w") as f:
        f.write("\n".join(lines))
    print(f"Updated path in dataset config: {dataset_yaml_path}")
