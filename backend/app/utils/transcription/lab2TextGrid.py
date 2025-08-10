import os
import shutil
import parselmouth
from praatio import textgrid
from collections import defaultdict
from tempfile import NamedTemporaryFile
from praatio.utilities.constants import Interval

# local imports
from app.utils.logger import get_logger

logger = get_logger(__name__)


def log_skipped_files(
    log_file_path,
    skipped_audio_files,
    skipped_lab_files,
    duplicate_audio_files,
    duplicate_lab_files,
    incompatible_audio_files,
):
    with open(log_file_path, "a") as log_file:
        sections = [
            (
                "Audio files skipped (no matching .lab file)",
                [os.path.basename(file_) for file_ in skipped_audio_files],
            ),
            (
                "Lab files skipped (no matching audio file)",
                [os.path.basename(file_) for file_ in skipped_lab_files],
            ),
            (
                "Audio files skipped (one or more had the same name)",
                duplicate_audio_files,
            ),
            (
                "Lab files skipped (one or more had the same name)",
                [os.path.basename(file_) for file_ in duplicate_lab_files],
            ),
            (
                "Audio files incompatible for identifying start and end times",
                [os.path.basename(file_) for file_ in incompatible_audio_files],
            ),
        ]

        for title, files in sections:
            if files:
                log_file.write(f"{title}:\n")
                for file in files:
                    log_file.write(f"- {file}\n")
                log_file.write("\n")

        if not any(files for _, files in sections):
            log_file.write("No files were skipped.\n")

        logger.info(f"Log file created: {log_file_path}")


def get_sound_boundaries(sound):
    start_time = sound.xmin
    end_time = sound.xmax
    return start_time, end_time


def find_files(directory):
    for dirpath, _, filenames in os.walk(directory):
        for f in filenames:
            filepath = os.path.join(dirpath, f)
            if (
                not f.startswith(".") and os.path.getsize(filepath) > 1
            ):  # Skip hidden files and empty files
                yield filepath


def lab2TextGrid(input_folder, output_folder, log_file, original_dir=None):
    from app.utils.helpers import replace_decomposed

    # Create output folder if it does not exist
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    audio_files = list(find_files(input_folder))
    lab_files = list(find_files(input_folder))

    audio_files = [f for f in audio_files if os.path.splitext(f)[1] not in (".lab",)]
    lab_files = [f for f in lab_files if f.endswith(".lab")]

    # Check for duplicate base names
    audio_base_names = defaultdict(list)
    lab_base_names = defaultdict(list)

    for f in audio_files:
        base_name = os.path.splitext(f)[0]
        audio_base_names[base_name].append(f)

    for f in lab_files:
        base_name = os.path.splitext(f)[0]
        lab_base_names[base_name].append(f)

    duplicate_audio_files = [
        item
        for sublist in [v for k, v in audio_base_names.items() if len(v) > 1]
        for item in sublist
    ]
    duplicate_lab_files = [
        item
        for sublist in [v for k, v in lab_base_names.items() if len(v) > 1]
        for item in sublist
    ]

    audio_files = [
        f for f in audio_files if len(audio_base_names[os.path.splitext(f)[0]]) == 1
    ]
    lab_files = [
        f for f in lab_files if len(lab_base_names[os.path.splitext(f)[0]]) == 1
    ]

    lab_files_base = {os.path.splitext(f)[0]: f for f in lab_files}

    skipped_audio_files = []
    skipped_lab_files = []
    incompatible_audio_files = []

    for full_audio_path in audio_files:
        base_name = os.path.splitext(full_audio_path)[0]
        lab_path = lab_files_base.pop(base_name, None)

        base_name = base_name.replace(f"{original_dir}/", "")
        audio_path = full_audio_path.replace(f"{original_dir}/", "")

        if lab_path:
            try:
                try:
                    audio = parselmouth.Sound(full_audio_path)
                except Exception as e:
                    logger.info(f"Error loading audio file {full_audio_path}: {str(e)}")
                    incompatible_audio_files.append(full_audio_path)
                    continue

                with NamedTemporaryFile(delete=False) as temp_wav:
                    audio.save(str(temp_wav.name), "WAV")
                    sound = parselmouth.Sound(temp_wav.name)

                start_time, end_time = get_sound_boundaries(sound)
                logger.info(f"START TIME: {start_time}")
                logger.info(f"END TIME: {end_time}")

                if start_time is not None and end_time is not None:
                    with open(lab_path, "r") as text_file:
                        transcription = replace_decomposed(text_file.read().strip())

                    tg = textgrid.Textgrid()
                    interval = Interval(start_time, end_time, transcription)
                    tier = textgrid.IntervalTier(
                        name="transcription",
                        entries=[interval],
                        minT=start_time,
                        maxT=end_time,
                    )
                    tg.addTier(tier)
                    # save file
                    tg_filename = os.path.join(output_folder, f"{base_name}.TextGrid")
                    os.makedirs(os.path.dirname(tg_filename), exist_ok=True)
                    tg.save(
                        fn=tg_filename, format="long_textgrid", includeBlankSpaces=True
                    )

                    # Copy audio file to output folder
                    audio_filename = os.path.join(output_folder, audio_path)
                    os.makedirs(os.path.dirname(audio_filename), exist_ok=True)
                    shutil.copy(
                        full_audio_path,
                        audio_filename,
                    )
                else:
                    logger.info(
                        f"Speech boundaries could not be detected for {full_audio_path}"
                    )
                    incompatible_audio_files.append(full_audio_path)

                os.remove(temp_wav.name)
            except Exception as e:
                logger.info(f"Error processing {full_audio_path}: {str(e)}")
                skipped_audio_files.append(full_audio_path)
        else:
            skipped_audio_files.append(full_audio_path)

    # Remaining lab files in lab_files_base do not have a matching audio file
    skipped_lab_files.extend(lab_files_base.values())

    log_skipped_files(
        log_file,
        skipped_audio_files,
        skipped_lab_files,
        duplicate_audio_files,
        duplicate_lab_files,
        incompatible_audio_files,
    )
    logger.info("Process completed.")
