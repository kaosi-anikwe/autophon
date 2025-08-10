import os
import shutil
from flask import current_app

# local imports
from .conv2functions import *
from app.config import logger


ext_to_function = {
    ".eaf": convert_eaf_to_tsv,
    ".tsv": convert_tsv_to_tsv,
    ".txt": convert_tsv_to_tsv,
    ".xls": convert_excel_to_tsv,
    ".xlsx": convert_excel_to_tsv,
}


# Function to log messages
def log_message(message, log_file):
    logger.info(message)
    with open(log_file, "a") as file:
        file.write(message + "\n")


def is_audio_file(file_path):
    for ext in current_app.audio_extensions:
        if file_path.endswith(ext):
            return ext
    return False


def get_all_audio_files(input_folder):
    audio_files = {}
    for root, _, files in os.walk(input_folder):
        for file in files:
            if is_audio_file(os.path.join(root, file)) and not file.startswith("~$"):
                audio_root_name = os.path.splitext(file)[0]
                audio_files[audio_root_name] = os.path.join(root, file)
    return audio_files


def copy_audio_files(output_folder, audio_files):
    for root_name, file_path in audio_files.items():
        file_name = os.path.basename(file_path)
        output_audio_file_path = os.path.join(output_folder, file_name)
        os.makedirs(output_folder, exist_ok=True)
        shutil.copy(file_path, output_audio_file_path)
        logger.info(f"Audio file copied: {file_name}")


def file_check(filename: str):
    if filename.startswith("~$"):
        logger.info(f"IGNORING: {filename}")
        return False
    if ".pfsx" in os.path.splitext(filename):
        logger.info(f"IGNORING: {filename}")
        return False
    if ".001" in os.path.splitext(filename):
        logger.info(f"IGNORING: {filename}")
        return False
    return filename


def conv2TG2(input_folder, output_folder, log_file):
    # Check the input folder and identify file extensions
    file_names = {}
    for root, _, files in os.walk(input_folder):
        for file_ in files:
            if file_check(file_):
                name, ext = os.path.splitext(os.path.join(root, file_))
                if name in file_names and ext not in file_names[name]:
                    file_names[name].append(ext)
                    log_message(
                        f"Warning: Multiple extensions found for {os.path.basename(name)}",
                        log_file,
                    )
                else:
                    file_names[name] = [ext]

    for filepath, exts in file_names.items():
        for ext in exts:
            if ext in ext_to_function.keys():
                log_message(
                    f"Converting {os.path.basename(filepath + ext)} to TextGrid",
                    log_file,
                )
                # convert to txt
                input_path = f"{filepath}{ext}"
                txt_path = os.path.join(
                    input_folder, f"{os.path.basename(filepath)}.txt"
                )
                ext_to_function[ext](input_path, txt_path)
                # convert to TextGrid
                tg_path = os.path.join(
                    output_folder, f"{os.path.basename(filepath)}.TextGrid"
                )
                tsv_to_textgrid(txt_path, tg_path)
            elif ext not in ext_to_function.keys() and "TextGrid" in ext:
                from app.utils.helpers import change_codec, character_resolve

                # copy TextGrid to output folder.
                input_path = f"{filepath}{ext}"
                change_codec(input_path)
                character_resolve(input_path)
                tg_path = os.path.join(
                    output_folder, f"{os.path.basename(filepath)}.TextGrid"
                )
                shutil.copy(input_path, tg_path)

    audio_files = get_all_audio_files(input_folder)
    copy_audio_files(output_folder, audio_files)
