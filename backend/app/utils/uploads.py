import re
import os
import math
import json
import shutil
import zipfile
import tempfile
import subprocess
import charset_normalizer
from datetime import datetime
from flask import current_app
from dotenv import load_dotenv
from werkzeug.datastructures import FileStorage

from app.utils.logger import get_logger

load_dotenv()

ADMIN = os.getenv("ADMIN")
UPLOADS = os.getenv("UPLOADS")

logger = get_logger(__name__)


def isAudioFile(file):
    for ext in current_app.audio_extensions:
        if file.endswith(ext):
            return ext
    return False


def check_phones(dictcustom, phonearr):
    valid = True
    dictcustom_lines = dictcustom.split("\n")
    invalid_phones = set()
    for i in range(len(dictcustom_lines)):
        line = dictcustom_lines[i]
        if line != "":
            line_phones = line.split(" ")
            word = line_phones[0]
            phones = line_phones[1:]
            for j in range(len(phones)):
                phone = phones[j].strip()
                if phone != "" and phone not in phonearr:
                    logger.info(f"Invalid phone: {phone} in word: {word}")
                    invalid_phones.add(phone)
                    valid = False
    return {
        "valid": valid,
        "invalid_phones": invalid_phones,
    }


def convert_size(size_bytes):
    if size_bytes == 0:
        return "0B"
    size_name = ("B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB")
    i = int(math.floor(math.log(size_bytes, 1000)))
    p = math.pow(1000, i)
    s = int(math.ceil(size_bytes / p))
    return "%s %s" % (s, size_name[i])


def formatUserDict(file_path):
    """Properly formats user dict before saving."""
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        lines = [re.sub(r"\s+", " ", line) for line in lines if line.split()]
        lines = [
            f"{line.split()[0].lower()}\t{' '.join(line.split()[1:])}" for line in lines
        ]
    with open(file_path, "w", encoding="utf-8") as f:
        [f.write(line + "\n") for line in lines]


def delete_folders(folder_path: str, search_str: str) -> None:
    # recursively delete all folders with user id
    if os.path.exists(folder_path):
        for entry in os.scandir(folder_path):
            if entry.is_dir():
                if search_str in entry.path:
                    if os.path.exists(entry.path):
                        shutil.rmtree(entry.path)
                delete_folders(entry.path, search_str)


def processTextGridNew(textgrid, missing_path, missing_dict_path, user_id, lang=None):
    suggested = False
    multitier = False
    n_words = 0
    missing_words = set()
    # detect language
    if not lang:
        suggested = True
        logger.info("Detecting Language...")
        # get sample text from textgrid
        sample_text = ""
        for _, _, text in textgrid.tiers[0].entries:
            sample_text += f"{text} "
        logger.info(f"Sample text: {sample_text}")
        lang = predict_lang(sample_text.strip(), textgrid)
    # load known words
    logger.info(f"LANG: {lang}")
    known_words = json.load(
        open(
            f"{ADMIN}/{lang}/" + lang + ".json",
            "r",
            encoding="utf-8",
        )
    )
    logger.info("known words loaded")
    # get the first word from each line in the user dict and save it to a set called user_words
    user_words = None
    # If exists and the file is not empty
    if os.path.exists(
        os.path.join(
            UPLOADS,
            str(user_id),
            "dic",
            lang + ".json",
        )
    ):
        isEmpty = (
            len(
                open(
                    os.path.join(
                        UPLOADS,
                        str(user_id),
                        "dic",
                        lang + ".json",
                    )
                ).read()
            )
            == 0
        )
        if not isEmpty:
            user_words = json.load(
                open(
                    os.path.join(
                        UPLOADS,
                        str(user_id),
                        "dic",
                        lang + ".json",
                    ),
                    "r",
                    encoding="utf-8",
                )
            )
            logger.info("user words loaded")

    # check if multitier
    if len(textgrid.tiers) > 1:
        multitier = True
    for tier in textgrid.tiers:
        for _, _, text in tier.entries:
            # remove all punctuation marks
            line = re.sub(
                r"[\.\!\?\,\"\<\>\)\(\*\{\}\[\]\¿\¡‘’‚‛“”„‟«»‹›❛❜❝❞「」『』〝〞〟﹁﹂﹃﹄]+",
                "",
                text,
            )
            line = re.sub(r":( |$)", "\\1", text)
            line = re.sub(r"( |^):", "\\1", text)
            line = re.sub(r"\s+", " ", text)
            n_words += len(line.split())
            for word in line.split():
                if word.lower() not in known_words:
                    if user_words != None:
                        if word.lower() not in user_words:
                            logger.info(f"Not in user words: {word.lower()}")
                            missing_words.add(word.lower())
                        else:
                            logger.info(f"In user words: {word}")
                    else:
                        missing_words.add(word.lower())
        logger.info(f"missing words in tier {tier.name}: {missing_words}")
    # Write the missing words to a missing.dict line by line
    if len(missing_words) > 0:
        logger.info("missing words > 0")
        os.makedirs(missing_path, exist_ok=True)
    with open(missing_dict_path, "w", encoding="utf-8") as f:
        if len(missing_words) > 0:
            logger.info(f"writing missing words to missing.dict: {missing_dict_path}")
            logger.info("\n".join(missing_words))
            f.writelines("\n".join(missing_words))
        else:
            logger.info("no missing words")
            f.writelines("")
    logger.info(f"n_words: {n_words}")
    logger.info(f"missing_words: {len(missing_words)}")
    return {
        "n_words": n_words,
        "missing_words": missing_words,
        "multitier": multitier,
        "n_tiers": len(textgrid.tiers),
        "lang": lang,
        "suggested": suggested,
    }


def predict_lang(sample_text: str, textgrid=None) -> str:
    import langid
    from app.models.language import Language

    prediction = langid.classify(sample_text.lower())
    logger.info(f"Prediction: {prediction}")
    predicted_lang = prediction[0]
    predicted_lang = "no" if predicted_lang == "nn" else predicted_lang
    predicted_lang = "fr" if predicted_lang == "pt" else predicted_lang
    predicted_lang = "swe" if predicted_lang == "sv" else predicted_lang
    predicted_lang = "fao" if predicted_lang == "fo" else predicted_lang
    predicted_lang = "spa" if predicted_lang == "es" else predicted_lang
    lang = ""
    langs = Language.active()
    for language in langs:
        lang_id = language.code  # Use SQLAlchemy model attribute
        if predicted_lang in lang_id:
            logger.info(f"LANG ID: {lang_id}")
            # Check if language has alternatives
            alternatives_query = language.alternatives.all()
            if alternatives_query:
                lang_found = {"lang": "", "n_words": False}
                # Build alternatives list including the main language
                alt_codes = [alt.code for alt in alternatives_query]
                alt_codes.append(lang_id)

                for alt_lang in alt_codes:
                    missing_words = 0
                    try:
                        known_words = json.load(
                            open(
                                f"{ADMIN}/{alt_lang}/{alt_lang}.json",
                                "r",
                                encoding="utf-8",
                            )
                        )
                        for tier in textgrid.tiers:
                            for _, _, text in tier.entries:
                                text = re.sub(r"[^\w\s]", "", text)
                                for word in text.split():
                                    if word.lower() not in known_words:
                                        missing_words += 1
                        if lang_found["n_words"] is False:
                            logger.info(
                                f"Assigning value for the first time: {missing_words}"
                            )
                            lang_found["n_words"] = missing_words
                        if missing_words <= lang_found["n_words"]:
                            logger.info(
                                f"{missing_words} is less than or equal to {lang_found['n_words']}"
                            )
                            lang_found["lang"] = alt_lang
                        logger.info(f"PREDICTION: {lang_found}")
                    except (FileNotFoundError, json.JSONDecodeError) as e:
                        logger.warning(
                            f"Could not load language data for {alt_lang}: {e}"
                        )
                        continue
                lang = lang_found["lang"]
            else:
                lang = lang_id
        if lang:
            break
    if not lang:
        lang = "engGB_MFA1_v010"
    return lang


def convert_to_wav(file):
    newName = file.replace(file.split(".")[-1], "wav")
    oldFile = file + ".old"
    os.rename(file, oldFile)
    command = ["ffmpeg", "-y", "-i", f"{oldFile}", newName]
    subprocess.run(command, stdout=subprocess.DEVNULL, stdin=subprocess.DEVNULL)
    os.remove(oldFile)
    return newName


def new_convert_to_wav(file):
    # Check if the input file is a WAV file
    if file.lower().endswith(".wav"):
        logger.info(f"WAV file: {file}")
        # Get the audio channel layout
        channel_layout = get_audio_channel_layout(file)
        logger.info(f"Audio format is: {channel_layout}")
        # Check if the WAV file is stereo
        if channel_layout == "stereo":
            logger.info(f"Converting to mono")
            # Generate new file name with .wav extension
            new_name = file.replace(file.split(".")[-1], "wav")
            # Rename original file to .old
            old_file = file + ".old"
            os.rename(file, old_file)
            # Define ffmpeg command with desired settings to convert stereo to mono
            command = ["ffmpeg", "-y", "-i", old_file, "-ac", "1", new_name]
            # Execute ffmpeg command
            subprocess.run(command, stdout=subprocess.DEVNULL, stdin=subprocess.DEVNULL)
            # Remove the temporary .old file
            os.remove(old_file)
            return new_name
        else:
            logger.info("WAV file is mono")
            # WAV file is mono, leave it as is
            return file
    else:
        logger.info(f"not WAV file: {file}")
        # If the input file is not a WAV file, convert it to WAV mono
        # Generate new file name with .wav extension
        new_name = file.replace(file.split(".")[-1], "wav")
        # Define ffmpeg command with desired settings to convert to WAV mono
        command = ["ffmpeg", "-y", "-i", file, "-ar", "32000", "-ac", "1", new_name]
        # Execute ffmpeg command
        subprocess.run(command, stdout=subprocess.DEVNULL, stdin=subprocess.DEVNULL)
        os.remove(file)
        return new_name


def get_audio_channel_layout(file):
    # Use FFprobe to get audio channel layout
    logger.info("Getting audio channel layout")
    ffprobe_command = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "stream=channel_layout",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        file,
    ]
    ffprobe_output = subprocess.check_output(ffprobe_command).decode().strip()
    # Check if stereo or mono
    if "stereo" in ffprobe_output.lower():
        return "stereo"
    else:
        return "mono"


def replaceTextGridTranscript(cleanup_file):
    # Read the cleanup file into a dictionary
    encodingcl = charset_normalizer.detect(open(cleanup_file, "rb").read())
    if "kr" in encodingcl["encoding"].lower() or "jp" in encodingcl["encoding"].lower():
        encodingcl["encoding"] = "utf-8"
    logger.info(f"Cleaning up using file: {cleanup_file}")
    srcList = []
    replList = []
    rsrcList = []
    rreplList = []
    with open(cleanup_file, "r", encoding=encodingcl["encoding"]) as f:
        for line in f:
            line = line.strip()
            if line.startswith("#"):
                continue
            if line == "":
                continue
            if len(line.split("substitute")) > 1:
                src, repl = line.split("substitute")
                srcList.append(src.replace('"', "").strip())
                replList.append(repl.replace('"', "").strip())
            if len(line.split("rsubstitute")) > 1:
                src, repl = line.split("rsubstitute")
                try:
                    src = re.compile(src.replace('"', "").strip(), re.IGNORECASE)
                    rsrcList.append(src)
                    rreplList.append(repl.replace('"', ""))
                except re.error:
                    logger.info(f"Invalid regular expression: {src}")
                    continue


def fileOps(file, language):
    logger.info("fileOps")
    if isAudioFile(file):
        file = new_convert_to_wav(file)
        logger.info(f"Wave file path is: {file}")
        # date240227optimizeAudio(file)
    if file.endswith(".TextGrid"):
        logger.info(f"TextGrid file path is {file} and language is {language}")
        replaceTextGridTranscript(
            os.path.join(ADMIN, language, f"{language}_cleanup.txt")
        )
    return file


def transcription_mode(
    file_paths: list,
    transcription_type: str,
    original_dir: str = None,
    user_id=None,
):
    """Takes in a list of uploaded files to to work on based on the `transcription_type`.
    Returns list of file paths in the standard TextGrid, audio file format
    together with the upload log file and the last temp folder used for processing.
    """

    from .transcription import master2lab, main2indv, conv2TG2, lab2TextGrid

    log_file = os.path.join(
        UPLOADS, user_id, "log", f"README_{datetime.now().strftime('%H%M%S%f')}.txt"
    )
    os.makedirs(os.path.join(UPLOADS, user_id, "log"), exist_ok=True)
    open(log_file, "w").close()  # empty log file
    input_folder = original_dir
    logger.info(f"INPUT FOLDER: {input_folder}")

    if transcription_type == "exp-a":
        trans_temp_1 = tempfile.mkdtemp()
        os.makedirs(trans_temp_1, exist_ok=True)
        master2lab(input_folder, trans_temp_1, log_file)
        shutil.rmtree(input_folder)
        trans_temp_2 = tempfile.mkdtemp()
        os.makedirs(trans_temp_2, exist_ok=True)
        lab2TextGrid(trans_temp_1, trans_temp_2, log_file, original_dir=trans_temp_1)
        shutil.rmtree(trans_temp_1)
        file_paths = [
            os.path.join(root, file)
            for root, _, files in os.walk(trans_temp_2)
            for file in files
        ]
        return file_paths, log_file, trans_temp_2
    elif transcription_type == "exp-b":
        trans_temp_1 = tempfile.mkdtemp()
        os.makedirs(trans_temp_1, exist_ok=True)
        main2indv(input_folder, trans_temp_1, log_file)
        shutil.rmtree(input_folder)
        trans_temp_2 = tempfile.mkdtemp()
        os.makedirs(trans_temp_2, exist_ok=True)
        conv2TG2(trans_temp_1, trans_temp_2, log_file)
        shutil.rmtree(trans_temp_1)
        file_paths = [
            os.path.join(root, file)
            for root, _, files in os.walk(trans_temp_2)
            for file in files
        ]
        return file_paths, log_file, trans_temp_2
    elif transcription_type == "comp-ling":
        trans_temp_1 = tempfile.mkdtemp()
        os.makedirs(trans_temp_1, exist_ok=True)
        lab2TextGrid(input_folder, trans_temp_1, log_file, original_dir)
        shutil.rmtree(input_folder)
        file_paths = [
            os.path.join(root, file)
            for root, _, files in os.walk(trans_temp_1)
            for file in files
        ]
        return file_paths, log_file, trans_temp_1
    elif transcription_type == "var-ling":
        trans_temp_1 = tempfile.mkdtemp()
        os.makedirs(trans_temp_1, exist_ok=True)
        conv2TG2(input_folder, trans_temp_1, log_file)
        shutil.rmtree(input_folder)
        file_paths = [
            os.path.join(root, file)
            for root, _, files in os.walk(trans_temp_1)
            for file in files
        ]
        return file_paths, log_file, trans_temp_1
    else:
        return [], log_file, input_folder


def extract_upload_zip(zip_file: FileStorage, maintain_structure: bool = False):
    files = []
    with tempfile.TemporaryDirectory() as zip_dir:
        zip_name = zip_file.filename.split("/")[-1]
        tmp_zip = os.path.join(zip_dir, zip_name)
        zip_file.save(tmp_zip)
        with tempfile.TemporaryDirectory() as tmp_dir:
            with zipfile.ZipFile(tmp_zip, "r") as zip_ref:
                for file_info in zip_ref.infolist():
                    if (
                        "__MACOSX" in file_info.filename
                        or ".DS_Store" in file_info.filename
                    ):
                        logger.info(f"Skipping {file_info.filename}")
                        continue
                    if file_info.filename.endswith("/"):
                        # Skip directory entries
                        continue
                    if maintain_structure:
                        file_path = os.path.join(tmp_dir, file_info.filename)
                        os.makedirs(os.path.dirname(file_path), exist_ok=True)
                    else:
                        file_path = os.path.join(
                            tmp_dir, os.path.basename(file_info.filename)
                        )
                    with zip_ref.open(file_info) as source, open(
                        file_path, "wb"
                    ) as target:
                        # Extract and write the file content
                        target.write(source.read())
                    file_storage = FileStorage(
                        open(file_path, "rb"),
                        filename=file_path.replace(f"{tmp_dir}/", ""),
                    )
                    files.append(file_storage)
    logger.info(f"EXTRACTED {len(files)} FILES")
    return files
