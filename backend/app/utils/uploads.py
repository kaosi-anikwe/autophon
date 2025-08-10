import re
import os
import math
import json
import shutil
import zipfile
import tempfile
import traceback
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
MFA_GENERATE_DICTIONARY = os.getenv("MFA_GENERATE_DICTIONARY")

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


def processTextGridNew(
    textgrid, missing_path, missing_dict_path, user_id, lang=None, dictionary_cache=None
):
    """Optimized version with dictionary caching and reduced I/O"""
    if dictionary_cache is None:
        dictionary_cache = {}

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

    # load known words (with caching)
    logger.info(f"LANG: {lang}")
    cache_key_known = f"known_{lang}"
    if cache_key_known not in dictionary_cache:
        try:
            with open(f"{ADMIN}/{lang}/{lang}.json", "r", encoding="utf-8") as f:
                dictionary_cache[cache_key_known] = json.load(f)
            logger.info("known words loaded and cached")
        except (FileNotFoundError, json.JSONDecodeError) as e:
            logger.error(f"Failed to load known words for {lang}: {e}")
            dictionary_cache[cache_key_known] = {}
    known_words = dictionary_cache[cache_key_known]

    # load user words (with caching)
    user_words = None
    user_dict_path = os.path.join(UPLOADS, str(user_id), "dic", f"{lang}.json")
    cache_key_user = f"user_{user_id}_{lang}"

    if cache_key_user not in dictionary_cache:
        if os.path.exists(user_dict_path):
            try:
                with open(user_dict_path, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                    if content:
                        dictionary_cache[cache_key_user] = json.loads(content)
                        logger.info("user words loaded and cached")
                    else:
                        dictionary_cache[cache_key_user] = None
            except (json.JSONDecodeError, FileNotFoundError) as e:
                logger.warning(f"Failed to load user dictionary: {e}")
                dictionary_cache[cache_key_user] = None
        else:
            dictionary_cache[cache_key_user] = None
    user_words = dictionary_cache[cache_key_user]

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


def uploaderOps(
    files: list,
    user_id: str,
    task_id: str,
    upload_log=None,
    final_temp=None,
):
    import uuid
    from praatio import textgrid
    from app.extensions import db
    from app.models import Task, TaskFile, TaskFileName, FileType, TaskStatus

    verify = True
    verify_msg = "File upload successful."
    lang = None
    langs = {}
    logger.info("files are")
    logger.info(f"There are {len(files) * 2} files")
    logger.info(files)
    num_texts = 0
    text_files = []
    num_wavs = 0
    wav_files = []
    sizes = []
    task_paths = []
    file_names = {}
    held_paths = []
    missing_words = set()
    tot_words = 0
    multitier = False
    suggested = False
    n_tiers = 0

    # Cache for loaded dictionaries to avoid repeated file I/O
    dictionary_cache = {}

    # Batch tracking for database operations
    task_files_to_insert = []
    task_filenames_to_insert = []
    task_updates = {}

    # Get the task object first
    task = Task.query.filter_by(task_id=task_id).first()
    if not task:
        return {"success": False, "msg": "Task not found"}

    def batch_update_task(field, value):
        """Queue task field update for batch processing"""
        task_updates[field] = value

    def apply_task_updates():
        """Apply all queued task updates in a single transaction"""
        if task_updates:
            for field, value in task_updates.items():
                setattr(task, field, value)
            task.update()
            task_updates.clear()

    try:
        final_path = os.path.join(
            UPLOADS,
            str(user_id),
            "dic",
            "missing",
            f"suggpron_{datetime.now().strftime('%Y-%m-%d_%H.%M.%S')}.txt",
        )

        for fileGroup in files:
            missing_dict_path = os.path.join(
                UPLOADS, str(user_id), "dic", "missing", "missing.dict"
            )
            missing_path = os.path.join(UPLOADS, str(user_id), "dic", "missing")
            missing_path_temp = os.path.join(
                UPLOADS, str(user_id), "dic", "missing", task_id
            )
            missingpron_path = os.path.join(
                UPLOADS,
                str(user_id),
                "dic",
                "missing",
                task_id,
                "missingpron.dict",
            )
            os.makedirs(
                os.path.join(UPLOADS, str(user_id), "dic", "missing", task_id),
                exist_ok=True,
            )
            for file in fileGroup:
                p = os.path.basename(file)
                logger.info(f"filename is: {p}")
                audio_ext = isAudioFile(p)
                if audio_ext != False:
                    num_wavs += 1
                    wav_files.append(os.path.splitext(p)[0])
                elif p.endswith(".TextGrid"):
                    num_texts += 1
                    # for every text file, logger.info the file name & a gues of its file encoding
                    logger.info(f"File\t\tEncoding")
                    result = charset_normalizer.detect(open(file, "rb").read())
                    logger.info(f"{p} {result['encoding']}")

                    # filter time
                    filterTextGridTime(file)
                    # load text grid with praatio
                    textgrid_object = textgrid.openTextgrid(
                        fnFullPath=file,
                        includeEmptyIntervals=True,
                    )
                    processed = processTextGridNew(
                        textgrid_object,
                        missing_path,
                        missing_dict_path,
                        user_id=user_id,
                        dictionary_cache=dictionary_cache,
                    )
                    multitier = processed["multitier"]
                    n_tiers += processed["n_tiers"]
                    n_words = processed["n_words"]
                    suggested = processed["suggested"]
                    lang = processed["lang"]
                    tot_words += n_words
                    text_files.append(os.path.splitext(p)[0])
                    # add record to lang dict
                    if lang not in langs:
                        langs[lang] = 1
                    else:
                        langs[lang] += 1

                    logger.info(f"Suggested lang: {lang}")
                else:
                    logger.info("File type not supported")
                    verify = False
                    verify_msg = f"File {p} is not supported. There should be equal number of wav and lab/txt files."
                    # Multi Process
                    response = {"success": False, "msg": verify_msg}
                    batch_update_task("pre_error", True)
                    apply_task_updates()
                    return response

        # Check that files match before proceeding
        if sorted(text_files) != sorted(wav_files):
            logger.info(f"Sorted text files\n{text_files}")
            logger.info(f"Sorted wav files\n{wav_files}")
            verify = False
            verify_msg = "The wav filename(s) should exactly match with .txt/.lab label filename(s)."
            response = {"success": False, "msg": verify_msg}
            batch_update_task("pre_error", True)
            apply_task_updates()
            return response

        if num_texts != num_wavs:
            verify = False
            verify_msg = f"There should be equal number of wav and lab/txt files."
            # Multi Process
            response = {"success": False, "msg": verify_msg}
            batch_update_task("pre_error", True)
            apply_task_updates()
            return response

        if verify == False:
            response = {"success": False, "msg": verify_msg}
            batch_update_task("pre_error", True)
            apply_task_updates()
            return response
            # return render_template('messages.html', users=[], inbox_messages=[], sent_messages=[], res=verify_msg, balance=user_balance)

        # per_word_price = 1 / getPricePerWord(lang)
        # cost = round(per_word_price * tot_words, 2)

        # logger.info("Cost per word")
        # costdec = "{0:.2f}".format(round(per_word_price * tot_words, 2))
        # logger.info("costdec: ", costdec)
        # if user_balance < per_word_price * tot_words:
        #     balance_failed_msg = f"Your balance is too low. For {tot_words} words you need at least {costdec.replace('.',',')} SEK in balance."
        #     response = {"success": False, "msg": balance_failed_msg}
        #     return response

        # calculate lang
        logger.info(f"LANGS RESULT: {langs}")
        lang = max(langs, key=langs.get)
        # batch update task with new fields
        batch_update_task("lang", f"{lang} (suggested)" if suggested else lang)
        batch_update_task("words", tot_words)
        batch_update_task("download_counts", num_wavs)
        batch_update_task("multitier", multitier)
        batch_update_task("no_of_tiers", n_tiers)
        batch_update_task("no_of_files", len(files))

        for fileGroup in files:
            missing_dict_path = os.path.join(
                UPLOADS, str(user_id), "dic", "missing", "missing.dict"
            )
            missing_path = os.path.join(UPLOADS, str(user_id), "dic", "missing")
            missing_path_temp = os.path.join(
                UPLOADS, str(user_id), "dic", "missing", task_id
            )
            missingpron_path = os.path.join(
                UPLOADS,
                str(user_id),
                "dic",
                "missing",
                task_id,
                "missingpron.dict",
            )

            os.makedirs(
                os.path.join(UPLOADS, str(user_id), "dic", "missing", task_id),
                exist_ok=True,
            )
            processed_paths = []
            file_id = f"{uuid.uuid4().hex}"[:5]
            for i, file in enumerate(fileGroup):
                logger.info("ITERATION")
                logger.info(f"{i, file}")
                p = os.path.join(
                    os.path.dirname(file.replace(f"{final_temp}/", "")),
                    f"{file_id}{os.path.splitext(file)[1]}",
                )
                logger.info("Getting file size")
                size = get_file_size_in_bytes_2(file)
                sizes.append(size)
                size_in_kb = size / 1024
                logger.info(f"File size in kilobytes : {size_in_kb}")
                if size_in_kb > current_app.size_limit:
                    ps = [UPLOADS, str(user_id), task_id]
                    if os.path.exists(os.path.join(*ps)):
                        shutil.rmtree(os.path.join(*ps))
                    verify = False
                    verify_msg = f"Error: File exceeds limit of {convert_size(current_app.size_limit * 1000)}."
                    # Multi Process
                    response = {"success": False, "msg": verify_msg}
                    batch_update_task("pre_error", True)
                    apply_task_updates()
                    return response
                logger.info(p)
                audio_ext = isAudioFile(p)
                if not audio_ext:
                    # original TextGrid file path
                    orig_p = file.replace(f"{final_temp}/", "")
                    # store original file path with dummy file id
                    file_names[file_id] = orig_p
                    back_p = p
                    paths = [UPLOADS, str(user_id), "upl", task_id]  # task folder
                    backpath = [
                        UPLOADS,
                        str(user_id),
                        "held",
                        task_id,
                    ]  # held transcripts folder

                    file_path = os.path.join(*paths, p)
                    os.makedirs(os.path.dirname(file_path), exist_ok=True)
                    processed_paths.append(file_path)
                    logger.info(f"saving file to: {file_path}")
                    # copy to task folder
                    shutil.copy(file, file_path)
                    # filter TextGrid file
                    filterTextGridTime(file_path)
                    charEncoding = charset_normalizer.detect(
                        open(file_path, "rb").read()
                    )["encoding"]
                    fileOps(file_path, lang)
                    p = p.replace(p.split(".")[-1], "wav")
                    # Open the file in os.path.join(os.path.join(*backpath), back_p) and process it
                    textgrid_object = textgrid.openTextgrid(
                        fnFullPath=file_path,
                        includeEmptyIntervals=True,
                    )
                    logger.info(f"New Encoding: {charEncoding}")
                    processed = processTextGridNew(
                        textgrid_object,
                        missing_path,
                        missing_dict_path,
                        user_id,
                        lang,
                        dictionary_cache=dictionary_cache,
                    )
                    # save textgrid
                    textgrid_object.save(
                        fn=file_path, format="long_textgrid", includeBlankSpaces=True
                    )
                    # copy to held transcripts folder
                    back_filepath = os.path.join(*backpath, back_p)
                    os.makedirs(os.path.dirname(back_filepath), exist_ok=True)
                    shutil.copy(file_path, back_filepath)
                    held_paths.append(back_filepath)
                    logger.info(f"File copied to: {back_filepath}")
                    logger.info(f"File copied from: {file_path}")
                    # missing words
                    missing_words = missing_words | set(processed["missing_words"])
                    # Queue TextGrid file record for batch insert
                    task_files_to_insert.append(
                        TaskFile(
                            task_id=task.id,
                            file_type=FileType.TEXTGRID,
                            file_path=file_path,
                            original_filename=orig_p,
                            file_key=file_id,
                        )
                    )
                else:
                    p = os.path.join(
                        os.path.dirname(file.replace(f"{final_temp}/", "")),
                        f"{file_id}{os.path.splitext(file)[1]}",
                    )
                    paths = [UPLOADS, str(user_id), "upl", task_id]
                    file_path = os.path.join(*paths, p)
                    os.makedirs(os.path.dirname(file_path), exist_ok=True)
                    logger.info(f"wav filename: {file_path}")
                    shutil.copy(file, file_path)
                    file_path = fileOps(file_path, lang)
                    processed_paths.append(file_path)
                    # Queue audio file record for batch insert
                    task_files_to_insert.append(
                        TaskFile(
                            task_id=task.id,
                            file_type=FileType.AUDIO,
                            file_path=file_path,
                            file_key=file_id,
                        )
                    )

            task_paths.append(processed_paths)
            logger.info(
                f"{MFA_GENERATE_DICTIONARY} {ADMIN}/{lang}/{lang}_g2p_model.zip {missing_dict_path} {missingpron_path}"
            )
            try:
                generation = subprocess.Popen(
                    f"{MFA_GENERATE_DICTIONARY} {ADMIN}/{lang}/{lang}_g2p_model.zip {missing_dict_path} {missingpron_path}",
                    shell=True,
                )
                # Check output
                logger.info(generation.wait())
            except Exception as e:
                logger.error(e)

            # Copy content to final missing path
            with open(missingpron_path, "r") as missing_file:
                missing_content = missing_file.read()
            with open(final_path, "a") as final_file:
                final_file.write(missing_content)
            # Delete mssing path
            if os.path.exists(missingpron_path):
                os.remove(missingpron_path)
            # Delete missing.dict
            if os.path.exists(missing_dict_path):
                os.remove(missing_dict_path)
            # Delete missingpron's folder
            if os.path.exists(missing_path_temp):
                shutil.rmtree(missing_path_temp)

        # Batch update task with new fields
        batch_update_task("missing_words", len(missing_words))
        batch_update_task("missingprondict", final_path)

        # Queue held file paths as TaskFile records
        for held_path in held_paths:
            task_files_to_insert.append(
                TaskFile(task_id=task.id, file_type=FileType.HELD, file_path=held_path)
            )

        # Queue file names as TaskFileName records
        for file_key, original_name in file_names.items():
            task_filenames_to_insert.append(
                TaskFileName(
                    task_id=task.id, file_key=file_key, original_name=original_name
                )
            )

        # copy log to task folder
        log_path = os.path.join(*paths, os.path.basename(upload_log))
        shutil.copy(upload_log, log_path)
        logger.info(f"Log file copied to: {log_path}")

        # Queue log file record
        task_files_to_insert.append(
            TaskFile(
                task_id=task.id,
                file_type=FileType.OUTPUT,
                file_path=log_path,
                original_filename=os.path.basename(upload_log),
            )
        )

        # Update task with log path
        batch_update_task("log_path", log_path)

        # Optimize file sorting: use Python instead of subprocess
        if os.path.exists(final_path):
            with open(final_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
            # Remove duplicates and sort
            unique_sorted_lines = sorted(
                set(line.strip() for line in lines if line.strip())
            )
            with open(final_path, "w", encoding="utf-8") as f:
                f.write("\n".join(unique_sorted_lines))
        total_size = sum(sizes)
        logger.info(f"Total size in bytes: {total_size}")
        size_in_kb = total_size / 1024
        logger.info(f"Total size in kilobytes: {size_in_kb}")
        size_in_mb = round(size_in_kb / 1024, 1)
        batch_update_task("size", size_in_mb)
        logger.info(f"Total size in megabytes: {size_in_mb}")

        if size_in_kb > current_app.size_limit:
            ps = [UPLOADS, str(user_id), task_id]
            if os.path.exists(os.path.join(*ps)):
                shutil.rmtree(os.path.join(*ps))
            verify = False
            verify_msg = f"Error: File exceeds limit of {convert_size(current_app.size_limit*1000)}."
            response = {"success": False, "msg": verify_msg}
            batch_update_task("pre_error", True)
            apply_task_updates()  # Apply error status immediately
            return response

        # Final batch update with task status
        batch_update_task("task_status", TaskStatus.UPLOADED)

        # Perform all database operations in batches for optimal performance
        try:
            # Apply all task updates in one transaction
            apply_task_updates()

            # Bulk insert task files
            if task_files_to_insert:
                db.session.add_all(task_files_to_insert)
                logger.info(f"Bulk inserting {len(task_files_to_insert)} task files")

            # Bulk insert task filenames
            if task_filenames_to_insert:
                db.session.add_all(task_filenames_to_insert)
                logger.info(
                    f"Bulk inserting {len(task_filenames_to_insert)} task filenames"
                )

            # Commit all inserts
            db.session.commit()
            logger.info("All database operations completed successfully")

        except Exception as e:
            db.session.rollback()
            logger.error(f"Database operation failed: {str(e)}")
            batch_update_task("pre_error", True)
            apply_task_updates()
            return {"success": False, "msg": f"Database error: {str(e)}"}
        response = {
            "success": True,
            "msg": verify_msg,
            "tmap": task_id,
            "num_wavs": num_wavs,
            "tot_words": tot_words,
            "lang": lang,
            "totalFiles": len(files) * 2,
        }
        return response
    except Exception as e:
        logger.error("Error occurred during uploadops")
        logger.error(traceback.format_exc())
        batch_update_task("pre_error", True)
        apply_task_updates()
        return {"success": False, "msg": f"Upload processing failed: {str(e)}"}


def filterTextGridTime(fnFullPath: str) -> None:
    from praatio import textgrid
    from .helpers import change_codec

    # change codec to utf-16
    change_codec(fnFullPath)
    # open TextGrid
    tg = textgrid.openTextgrid(
        fnFullPath=fnFullPath, includeEmptyIntervals=True, duplicateNamesMode="rename"
    )
    # get IntervalTier (first)
    tier = tg.getTier(tg.tierNames[0])
    # get max for last entry
    xmax = tier.entries[-1][1]

    # compare values
    if not xmax == tier.maxTimestamp == tg.maxTimestamp:
        # change values to match
        tier.maxTimestamp = xmax
        tg.maxTimestamp = xmax

    # save TextGrid to same path
    tg.save(fn=fnFullPath, format="long_textgrid", includeBlankSpaces=True)


def get_file_size_in_bytes_2(file_path):
    """Get 97 % size of file at given path in bytes"""
    # get size of file in bytes
    size = os.path.getsize(file_path)
    return size * 0.97
