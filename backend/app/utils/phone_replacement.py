import os.path
import argparse
import textgrids
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv
from collections import OrderedDict

load_dotenv()

ADMIN = os.getenv("ADMIN")


def run_replacement(
    input: str,
    output: str,
    lang: str,
    new_dict: str,
    mapping_file: str,
    orig_phone_column,
    mod_phone_column,
    ngin,
):
    inName = input
    outName = output

    words_data = None
    phones_data = None
    phones_data_for_mod = None
    phones_with_xmin_as_key = OrderedDict()

    words_grid_string = None
    phones_grid_string = None

    # Try to open the file as textgrid
    try:
        print(inName)
        grid = textgrids.TextGrid(inName)
    # Discard and try the next one
    except Exception as ex:
        print("Error happened when trying to create the grid ", inName, ex)
        return

    mapping_data = (
        pd.read_csv(mapping_file, sep="\t") if os.path.exists(mapping_file) else None
    )

    mapping_file = f"{ADMIN}/{lang}/{lang}_complex2simple.json"
    print(f"Mapping file: {mapping_file}")

    mapping_data = pd.read_json(mapping_file)

    old_phones = mod_phone_column
    new_phones = orig_phone_column

    unique_old_phones_indexes = pd.unique(mapping_data[old_phones].to_list())

    mapping_data = mapping_data.set_index(old_phones)

    new_phones_data = mapping_data[[new_phones]]

    phones_map_dict = {}
    for ind in unique_old_phones_indexes:
        if type(new_phones_data.loc[ind, new_phones]) == str:
            phones_map_dict[ind] = new_phones_data.loc[ind, new_phones]
        else:
            phones_map_dict[ind] = new_phones_data.loc[ind, new_phones].values.tolist()

    for key in grid.keys():
        print(key)
        if key.split("-"):
            if "word" in key.split("-")[-1].strip():
                print("word in key")
                words_data = grid[key]
                words_grid_string = key
            elif "phone" in key.split("-")[-1].strip():
                print("phone in key")
                phones_data = grid[key]
                phones_grid_string = key
        else:
            if "word" in key:
                print("word in key")
                words_data = grid[key]
                words_grid_string = key
            elif "phone" in key:
                print("phone in key")
                phones_data = grid[key]
                phones_grid_string = key

    assert words_data != None
    assert phones_data is not None

    phones_data_for_mod = phones_data.copy()

    for syll in grid[phones_grid_string]:
        # Convert Praat to Unicode in the label
        label = syll.text.transcode()
        # Print label and syllable duration, CSV-like
        #     print('"{}";{}'.format(label, syll.xmin))
        phones_with_xmin_as_key[syll.xmin] = syll

    with open(new_dict, "r", encoding="utf-8") as orig_file:
        orig_data = orig_file.read().splitlines()

        # mod_data = mod_file.read().splitlines()

    orig_data_len = len(orig_data)
    # mod_data_len =  len(mod_data)

    done = False
    orig_dict = {}  # the original dictionary mapping of words to phones
    mod_dict = {}  # the modified dictionary

    for data in orig_data:
        line = data.split("\t")
        lower_word = line[0].lower()

        if lower_word not in orig_dict:
            orig_dict[lower_word] = []
        if len(line) < 2:
            print(line)
        orig_dict[lower_word].append(line[1].split())

    # for data in mod_data:
    #     line = data.split('\t')
    #     lower_word = line[0].lower()

    #     if lower_word not in mod_dict:
    #         mod_dict[lower_word] = []
    #     mod_dict[lower_word].append(line[1].split())

    phones_iter = iter(phones_with_xmin_as_key.items())

    last_phone_data = None
    ended = False
    phone_pos = 0
    init_phone_pos = 0
    count = 0
    phones_xmin_keys = list(phones_with_xmin_as_key.keys())
    for syll in grid[words_grid_string]:
        # Convert Praat to Unicode in the label
        label = syll.text.transcode()

        if label == "":
            continue
        if label == "<unk>":  # <unk> is spn so no need changing it.
            continue
        word_xmin = syll.xmin
        word_xmax = syll.xmax

        phone_data = []
        phone_data_keys = []

        ended = False
        while not ended:
            xmin_key = phones_xmin_keys[phone_pos]
            dat = phones_with_xmin_as_key[xmin_key]
            phone_xmax = dat.xmax

            if round(word_xmin, 3) <= round(dat.xmin, 3) and round(
                word_xmax, 3
            ) >= round(phone_xmax, 3):
                # if word_xmin <= dat.xmin and word_xmax >= phone_xmax:
                phone_data.append(dat.text)
                phone_data_keys.append(phones_xmin_keys[phone_pos])
                if compare_floats(word_xmax, phone_xmax):
                    # if word_xmax == phone_xmax:
                    ended = True
                    break

            elif word_xmin > dat.xmin and word_xmax < phone_xmax:
                print(
                    "Something is logically wrong here... Or the textgrid is wrong.",
                    word_xmin,
                    dat.xmin,
                    phone_pos,
                )

            phone_pos += 1

        possible_phones = (
            orig_dict[label.lower()] if ngin in ["FAVE", "FASE"] else orig_dict[label]
        )
        num_phones = len(phone_data)
        indexes = (
            []
        )  # Indexing into the original dictionary where we have same list of phones as the dictionary
        for i in range(len(possible_phones)):
            if len(possible_phones[i]) == num_phones:
                indexes.append(i)
        if len(indexes) > 1:
            #         print("Possible issues here. A word has equal number of phones.")
            possible_phones_interest = [possible_phones[ind] for ind in indexes]
            print("possible_phones_interest: ", possible_phones_interest)
            remove_indexes = []
            one_or_less_remains = False
            print(possible_phones_interest, "phone_data: ", phone_data)
            for j in range(num_phones):
                base_phone = phone_data[j]

                for k in range(len(possible_phones_interest)):
                    if type(phones_map_dict[base_phone]) == str:
                        if (
                            not possible_phones_interest[k][j]
                            == phones_map_dict[base_phone]
                        ):
                            remove_indexes.append(k)
                            if len(remove_indexes) >= len(indexes) - 1:
                                one_or_less_remains = True
                                break
                    else:
                        if (
                            not possible_phones_interest[k][j]
                            in phones_map_dict[base_phone]
                        ):
                            remove_indexes.append(k)
                            if len(remove_indexes) >= len(indexes) - 1:
                                one_or_less_remains = True
                                break
                if one_or_less_remains:
                    break
            tmp = []
            for ind in indexes:
                if ind not in remove_indexes:
                    tmp.append(ind)
            indexes = tmp.copy()

            print(label, remove_indexes, indexes)

        elif len(indexes) == 0:
            print(
                "Possible issues here. Cannot find equal length phone list from the textgrid and the original dictionry."
            )

        try:
            assert len(possible_phones[indexes[0]]) == len(phone_data_keys)
        except IndexError as e:
            print(label, len(phone_data_keys), word_xmin)
            raise

        for i in range(len(possible_phones[indexes[0]])):
            possible_phones_list = possible_phones[indexes[0]]
            phones_with_xmin_as_key[
                phone_data_keys[i]
            ].text = textgrids.transcript.Transcript(possible_phones_list[i])

    phones_mod_values = list(phones_with_xmin_as_key.values())
    phones_mod_tier = textgrids.Tier(phones_mod_values)
    grid[phones_grid_string] = phones_mod_tier

    # outName = f'output/{filename}'
    # This has not yet been testted if it works with all textgrids
    # It is merely to solve a bug associated with textgrids library where
    # items are not listed consecutively. Instead, they are all having number 1.
    grid_str = grid.format()
    text_data = replace_numbers(grid_str)

    with open(outName, "w") as outfile:
        outfile.write(text_data)

    # grid.write(outName, fmt=textgrids.TEXT_LONG)


def parse_args():
    """
    Parse input arguments
    """
    parser = argparse.ArgumentParser(description="Textgrid Phone Replacement")
    parser.add_argument(
        "--input_filename",
        dest="input_filename",
        help="The input textgrid file name. Can also be a folder for bulk operation.",
        default=input_filename,
        type=str,
    )
    parser.add_argument(
        "--output_filename",
        dest="output_filename",
        help="The output folder name to save to.",
        default=output_filename,
        type=str,
    )
    parser.add_argument(
        "--lang",
        dest="lang",
        help="The language of the input file and dicts",
        default="da_DK",
        type=str,
    )
    parser.add_argument(
        "--new_dict",
        dest="new_dict",
        help="The dictionary to use for the replacement.",
        default=new_dict,
        type=str,
    )
    parser.add_argument(
        "--mapping_filename",
        dest="mapping_filename",
        help="The file to use for the mapping. It is assumed to be a csv file containing at least 2 columns. \
                        The first row should be the column names.",
        default="phonconv.csv",
        type=str,
    )
    parser.add_argument(
        "--orig_phone_column",
        dest="orig_phone_column",
        help="The phone column that we are mapping into.",
        default="orig",
        type=str,
    )
    parser.add_argument(
        "--mod_phone_column",
        dest="mod_phone_column",
        help="The phone column that we are mapping from. It is expected that the values should be same as that \
                            of the textgrid.",
        default="c",
        type=str,
    )
    parser.add_argument(
        "--ngin",
        dest="ngin",
        help="The engine used for alignment.",
        default="MFA1",
        type=str,
    )

    args = parser.parse_args()

    return args


def check_batch(file_string):
    """
    We assume that if a folder name is given instead of a filename as input, then multiple textgrids
    in the folder. So it is a batch operation.
    """

    if Path(file_string).exists():
        if Path(file_string).is_dir():
            return True
        elif Path(file_string).is_file():
            return False


def replace_numbers(string):
    count = 1
    old_substring = "item [1]:"
    indexes = find_all_occurrences(string, old_substring)
    for i in range(len(indexes)):
        index = indexes[i]
        if index != -1:
            string = (
                string[:index] + f"item [{i+1}]:" + string[index + len(old_substring) :]
            )
            count += 1
    return string


def find_all_occurrences(string, substring):
    occurrences = []
    start = 0
    while True:
        index = string.find(substring, start)
        if index == -1:
            break
        occurrences.append(index)
        start = index + len(substring)
    return occurrences


def compare_floats(a, b, tolerance=0.0001):
    print(f"comparing {a} with {b}")
    return abs(a - b) < tolerance


if __name__ == "__main__":
    # q = Queue()
    input_filename = "textgrids"
    output_filename = f"output"
    new_dict = None
    mapping_filename = None
    orig_phone_column = None
    mod_phone_column = None

    for path in Path(".").rglob("*.dict"):
        if "dict.dict" in str(path.name):
            print("present")
            new_dict = str(path.absolute())

    args = parse_args()

    if args.new_dict is None:
        raise Exception("The new dictionary is missing.")

    if not check_batch(args.input_filename):
        run_replacement(
            args.input_filename,
            args.output_filename,
            args.lang,
            args.new_dict,
            args.mapping_filename,
            args.orig_phone_column,
            args.mod_phone_column,
            args.ngin,
        )

    else:
        for file_name in os.listdir(args.input_filename):
            # construct full file path
            input_textgrid = os.path.join(args.input_filename, file_name)
            output_textgrid = os.path.join(args.output_filename, file_name)

            if ".TextGrid" in input_textgrid:
                run_replacement(
                    input_textgrid,
                    output_textgrid,
                    args.lang,
                    args.new_dict,
                    args.mapping_filename,
                    args.orig_phone_column,
                    args.mod_phone_column,
                    args.ngin,
                )
