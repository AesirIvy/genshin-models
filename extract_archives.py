import sys
import json
import shutil
import zipfile
from pathlib import Path

import rarfile
import py7zr

def flatten_if_single_folder(dest_dir):
    """
    If dest_dir contains exactly one item and that item is a directory,
    move its contents one level up and remove the now-empty directory.
    """
    items = list(dest_dir.iterdir())
    if len(items) != 1:
        return
    single = items[0]
    if not single.is_dir():
        return
    for item in single.iterdir():
        target = dest_dir / item.name
        shutil.move(str(item), str(target))
    single.rmdir()

def rename_largest_pmx(dest_dir):
    """
    The .pmx files inside the archive have Chinese names,
    so we would either have additional logic to match them to English name
    or simply rename the file to character.pmx. I chose the latter.

    The archive also contains .pmx files for weapons and other accessories, but I assume
    the one with the largest file size is the character model.
    """
    pmx_files = list(dest_dir.rglob("*.pmx"))
    if not pmx_files:
        return
    largest = max(pmx_files, key=lambda p: p.stat().st_size)
    new_name = largest.parent / "character.pmx"
    if largest == new_name:
        return
    largest.rename(new_name)
    print(f"Renamed {largest} → {new_name}")

def get_empty_file(target_dir):
    for content in target_dir.iterdir():
        if content.is_dir():
            continue
        if content.stat().st_size == 0:
            content.unlink()
            return content.stem
    return ""

def remove_parent_name_in_files(target_dir, parent_name):
    for content in list(target_dir.iterdir()):
        if content.is_dir() and content.stem == parent_name[:-1]:
            sub_parent_name = get_empty_file(content)
            remove_parent_name_in_files(content, sub_parent_name)
            new_dir = content.with_name(sub_parent_name[:-1])
            content.rename(new_dir)
        elif content.is_file() and content.stem.startswith(parent_name):
            new_stem = content.stem.replace(parent_name, "")
            content.rename(content.with_stem(new_stem))

def print_error(error):
    print("\x1b[31m" + error + "\x1b[0m", file=sys.stderr)

ver_dir = Path("ver")
data_file = ver_dir / "data.json"

if not ver_dir.is_dir():
    print_error(f"Directory {ver_dir} not found inside {Path.cwd()}")
    sys.exit(1)
if not data_file.is_file():
    print_error(f"File {data_file} not found inside {Path.cwd()}")
    sys.exit(1)

with open(data_file, "r", encoding="utf-8") as file:
    zip_map = json.loads(file.read())["zipMap"]

for subdir in ver_dir.iterdir():
    if not subdir.is_dir():
        continue

    for fpath in subdir.iterdir():
        if fpath.suffix.lower() not in (".7z", ".zip", ".rar"):
            continue

        stem = fpath.stem
        rel_dir = subdir.relative_to(ver_dir)
        dest_dir = Path("site") / "models" / rel_dir / stem

        if dest_dir.is_dir():
            continue

        dest_dir.mkdir(parents=True, exist_ok=True)

        rel_path = fpath.as_posix()
        archive_path = fpath
        if rel_path in zip_map:
            mapped = Path(zip_map[rel_path])
            if not mapped.is_file():
                print_error(f"Mapped archive not found: {mapped}")
                continue
            archive_path = mapped

        print(f"Extracting {archive_path} → {dest_dir}")

        try:
            ext = archive_path.suffix.lower()
            if ext == ".zip":
                with zipfile.ZipFile(archive_path, "r") as zf:
                    zf.extractall(dest_dir)
            elif ext == ".rar":
                with rarfile.RarFile(str(archive_path), "r") as rf:
                    rf.extractall(str(dest_dir))
            elif ext == ".7z":
                with py7zr.SevenZipFile(str(archive_path), "r") as szf:
                    szf.extractall(str(dest_dir))
        except Exception as error:
            print_error(f"Failed to extract {archive_path}: {error}")
            continue

        flatten_if_single_folder(dest_dir)
        rename_largest_pmx(dest_dir)

        # normalize archive's structure
        parent_name = get_empty_file(dest_dir)
        remove_parent_name_in_files(dest_dir, parent_name)
