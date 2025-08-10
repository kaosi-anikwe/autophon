import os
import shutil
import pandas as pd
from flask import current_app

# local imports
from app.utils.logger import get_logger

logger = get_logger(__name__)


def find_transcription_file(folder_path, log_file):
    transcription_files = []
    for dirpath, _, files in os.walk(folder_path):
        for file in files:
            if file.endswith((".xlsx", ".tsv", ".txt")) and not file.startswith("~$"):
                transcription_files.append(os.path.join(dirpath, file))

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


def read_data_file(file_path):
    if file_path.endswith(".xlsx"):
        return pd.read_excel(file_path, header=None, engine="openpyxl")
    elif file_path.endswith(".tsv"):
        return pd.read_csv(file_path, sep="\t", header=None)
    elif file_path.endswith(".txt"):
        return pd.read_csv(file_path, sep="\t", header=None)


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


def find_value(iterable, index: int = 0):
    """Returns the index of the next `str` value in iterable starting from `index`"""
    for i in range(index, len(iterable)):
        if isinstance(iterable[i], str):
            return i


def create_lab_files(data, input_folder, output_folder, audio_files, log_file):
    from app.utils.helpers import replace_decomposed

    audio_files_not_found = set(audio_files.keys())
    audio_files_listed_but_not_found = []

    for _, row in data.iterrows():
        audio_index = find_value(row)
        trans_index = find_value(row, audio_index + 1)

        audio_file_name = os.path.splitext(str(row[audio_index]))[0]
        transcription = replace_decomposed(str(row[trans_index]))

        if audio_file_name in audio_files:
            lab_filename = audio_file_name + ".lab"
            lab_filename = os.path.splitext(audio_files[audio_file_name])[0] + ".lab"
            lab_filename = lab_filename.replace(f"{input_folder}/", "")
            lab_filepath = os.path.join(output_folder, lab_filename)
            os.makedirs(os.path.dirname(lab_filepath), exist_ok=True)
            with open(lab_filepath, "w") as f:
                f.write(transcription)
            logger.info(f"Lab file created: {lab_filepath}")
            audio_files_not_found.remove(audio_file_name)

    # Log the audio files that were not listed in the transcription document
    with open(log_file, "a") as f:
        for audio_file in audio_files_not_found:
            f.write(
                f"Audio file {audio_file} was not listed in the transcription document\n"
            )
            logger.info(
                f"Audio file {audio_file} was not listed in the transcription document"
            )

        for audio_file in audio_files_listed_but_not_found:
            f.write(
                f"Audio file {audio_file} listed in transcription file but not found in input folder\n"
            )
            logger.info(
                f"Audio file {audio_file} listed in transcription file but not found in input folder"
            )


def copy_audio_files(input_folder, output_folder, audio_files):
    for root_name, file_path in audio_files.items():
        file_name = file_path.replace(f"{input_folder}/", "")
        output_audio_path = os.path.join(output_folder, file_name)
        os.makedirs(os.path.dirname(output_audio_path), exist_ok=True)
        shutil.copy(file_path, output_audio_path)
        logger.info(f"Audio file copied: {file_name}")


def main(input_folder, output_folder, log_file):
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    transcription_file_path = find_transcription_file(input_folder, log_file)
    if transcription_file_path is None:
        return log_file

    # transcription_file_path = os.path.join(input_folder, transcription_file_path)
    data = read_data_file(transcription_file_path)

    audio_files = get_all_audio_files(input_folder)

    create_lab_files(data, input_folder, output_folder, audio_files, log_file)
    copy_audio_files(input_folder, output_folder, audio_files)

    return log_file
