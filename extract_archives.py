import os
import shutil
import zipfile
import glob
import sys
import subprocess

import rarfile

def flatten_if_single_folder(dest_dir):
    """
    If dest_dir contains exactly one item and that item is a directory,
    move its contents one level up and remove the now-empty directory.
    """
    items = os.listdir(dest_dir)
    if len(items) != 1:
        return
    single = items[0]
    single_path = os.path.join(dest_dir, single)
    if not os.path.isdir(single_path):
        return
    for name in os.listdir(single_path):
        src = os.path.join(single_path, name)
        dst = os.path.join(dest_dir, name)
        shutil.move(src, dst)
    os.rmdir(single_path)

def rename_largest_pmx(dest_dir):
    """
    The .pmx files inside the archive have Chinese names,
    so we would either have additional logic to match them to English name
    or simply rename the file to character.pmx. I chose the latter.

    The archive also contains .pmx files for weapons and other accessories, but I assume
    the one with the largest file size is the character model.
    """
    pmx_files = glob.glob(os.path.join(dest_dir, "**", "*.pmx"), recursive=True)
    if not pmx_files:
        return
    largest = max(pmx_files, key=os.path.getsize)
    new_name = os.path.join(os.path.dirname(largest), "character.pmx")
    if os.path.normpath(largest) == os.path.normpath(new_name):
        return
    os.rename(largest, new_name)
    print(f"Renamed {largest} -> {new_name}")


def print_error(error):
  print("\x1b[31m" + error + "\x1b[0m", file=sys.stderr)


ver_dir = "ver"
if not os.path.isdir(ver_dir):
    print_error(f"Directory {ver_dir} not found inside {os.getcwd()}")
    sys.exit(1)

for root, dirs, files in os.walk(ver_dir):
    for fname in files:
        ext = os.path.splitext(fname)[1].lower()
        if ext not in (".zip", ".rar"):
            continue

        archive_path = os.path.join(root, fname)

        rel_dir = os.path.relpath(root, ver_dir)
        stem = fname.split(".")[0]
        if rel_dir == ".":
            dest_dir = os.path.join("site", "models", stem)
        else:
            dest_dir = os.path.join("site", "models", rel_dir, stem)

        if os.path.isdir(dest_dir):
            # Skipping already extracted archive
            continue

        os.makedirs(dest_dir, exist_ok=True)
        print(f"Extracting {archive_path} -> {dest_dir}")

        try:
            if ext == ".zip":
                with zipfile.ZipFile(archive_path, "r") as zf:
                    zf.extractall(dest_dir)
            else:
                with rarfile.RarFile(archive_path, "r") as rf:
                    rf.extractall(dest_dir)
        except Exception as error:
            print_error(f"Failed to extract {archive_path}: {error}")
            continue

        flatten_if_single_folder(dest_dir)
        rename_largest_pmx(dest_dir)
