import os
import csv
import json


def tsv_to_json(tsv_file, json_file):
    data = []

    # Read the TSV file
    with open(tsv_file, "r", newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file, delimiter="\t")

        # Parse the TSV content and convert to list of dictionaries
        for row in reader:
            data.append(row)

    # Convert the list of dictionaries to JSON and save to file
    with open(json_file, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=2)


def ipa_to_json(tsv_file, json_file):
    data = []

    # Read the TSV file
    with open(tsv_file, "r", newline="", encoding="utf-8") as file:
        reader = csv.reader(file, delimiter="\t")

        # Parse the TSV content and convert to list of dictionaries
        for row in reader:
            data.append({"dummy": row[0], "ipa": row[1], "example": ""})

    # Convert the list of dictionaries to JSON and save to file
    with open(json_file, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=2, ensure_ascii=False)


langs = {
    "da_DK": "danDK_MFA1_v030",
    "da_XX": "danXX_MFA1_v040",
    "en_GB": "engGB_MFA1_v010",
    "en_US": "engUS_MFA1_v010",
    "fo_FO": "faoFO_MFA1_v010",
    "fr_FR": "fraFR_MFA1_v010",
    "fr_CA": "fraCA_MFA1_v010",
    "de_DE": "deuDE_MFA1_v010",
    "is_IS": "islIS_MFA1_v010",
    "no_NO": "norNO_MFA1_v010",
    "sv_SE": "sweSE_MFA1_v010",
}

print(langs)

for lang in langs.values():
    print(f"converting tsv for {lang}")
    folder = os.path.join("admin_updates", lang)
    tsv_file = f"{lang}_complex2simple.tsv"
    json_file = f"{lang}_complex2simple.json"
    tsv_to_json(
        tsv_file=os.path.join(folder, tsv_file),
        json_file=os.path.join(folder, json_file),
    )
    os.remove(os.path.join(folder, tsv_file))

    print(f"converting ipa for {lang}")
    folder = os.path.join("admin_updates", lang)
    ipa_file = f"{lang}_IPA.txt"
    json_file = f"{lang}_IPA.json"
    ipa_to_json(
        tsv_file=os.path.join(folder, ipa_file),
        json_file=os.path.join(folder, json_file),
    )
    os.remove(os.path.join(folder, ipa_file))

print("done")
