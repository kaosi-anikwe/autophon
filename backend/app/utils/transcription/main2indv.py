import re
import os
import math
import shutil
import pandas as pd
from flask import current_app

# local imports
from app.config import logger


def find_transcription_file(folder_path, log_file):
    transcription_files = []
    for file in os.listdir(folder_path):
        if file.endswith((".xlsx", ".tsv", ".txt")) and not file.startswith("~$"):
            transcription_files.append(file)

    if len(transcription_files) == 1:
        return transcription_files[0]
    elif len(transcription_files) > 1:
        error_message = "More than one transcription file found in the input folder"
        with open(log_file, "a") as f:
            f.write(error_message + "\n")
        logger.info(error_message)
    else:
        error_message = "No transcription file found in the input folder."
        with open(log_file, "a") as f:
            f.write(error_message + "\n")
        logger.info(error_message)
    raise Exception(error_message)


def is_number(s):
    try:
        if "," in str(s):
            s = str(s).replace(",", ".")
        float(s)
        return True
    except ValueError:
        return False


def read_data_file(file_path):
    # Read the file assuming no header initially
    if file_path.endswith(".xlsx"):
        data = pd.read_excel(file_path, header=None, engine="openpyxl")
    elif file_path.endswith(".tsv") or file_path.endswith(".txt"):
        data = pd.read_csv(file_path, sep="\t", header=None)

    # Check if the second and third values of the first row are non-numeric
    if not is_number(data.iloc[0, 1]) and not is_number(data.iloc[0, 2]):
        # Remove the first row if it is a header
        data = data.iloc[1:].reset_index(drop=True)

    return data


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


def clean_list(iterable: list):
    """Returns the `iterable` with all non-`str` and `nan` values removed"""
    new_list = []
    for item in iterable:
        if isinstance(item, float):
            if not math.isnan(item):
                new_list.append(item)
        else:
            new_list.append(item)
    return new_list


def process_transcription_file(
    transcription_path, input_folder_path, output_folder_path, log_file
):
    from app.utils.helpers import replace_decomposed

    output_dict = {}
    data = read_data_file(transcription_path)
    for index, row in data.iterrows():
        # Removed the condition to skip the first row
        line = clean_list(row.tolist())
        key = line[0]
        # remove file extension from filename
        key = os.path.splitext(key)[0]
        content = line
        if key not in output_dict:
            output_dict[key] = [content]
        else:
            output_dict[key].append(content)

    transcription_keys = set(output_dict.keys())
    audio_files = get_all_audio_files(input_folder_path)
    audio_keys = set(
        os.path.splitext(os.path.basename(path))[0] for path in audio_files.values()
    )

    missing_transcriptions = audio_keys - transcription_keys
    missing_audios = transcription_keys - audio_keys

    with open(log_file, "a") as log_file:
        if missing_transcriptions:
            log_file.write("Audio files without transcriptions:\n")
            log_file.write("\n".join(missing_transcriptions) + "\n\n")

        if missing_audios:
            log_file.write("Transcription files without audio files:\n")
            log_file.write("\n".join(missing_audios) + "\n")

    for key in output_dict:
        with open(os.path.join(output_folder_path, key + ".txt"), "w") as f:
            for line in output_dict[key]:
                text = "\t".join(map(str, line)) + "\n"
                f.write(replace_decomposed(text))


def copy_audio_files(output_folder, audio_files):
    for root_name, file_path in audio_files.items():
        file_name = os.path.basename(file_path)
        output_audio_file_path = os.path.join(output_folder, file_name)
        os.makedirs(output_folder, exist_ok=True)
        shutil.copy(file_path, output_audio_file_path)
        logger.info(f"Audio file copied: {file_name}")


# Main Execution
def main(input_folder, output_folder, log_file):
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    transcription_file = find_transcription_file(input_folder, log_file)
    if not transcription_file:
        return log_file

    audio_files = get_all_audio_files(input_folder)
    transcription_file_path = os.path.join(input_folder, transcription_file)
    process_transcription_file(
        transcription_file_path, input_folder, output_folder, log_file
    )
    copy_audio_files(output_folder, audio_files)

    return log_file
