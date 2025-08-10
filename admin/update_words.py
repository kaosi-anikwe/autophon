# For each .dict file generate a .json file that has the first word of each line for faster lookups
# detect the encoding of the .dict file and use that encoding to open the file
import os
import chardet
import json


def generate_words():
    # Get all the .dict files in the folder
    files = os.listdir("language_dictionaries")
    for file in files:
        if file.endswith(".dict") and "_simple" not in file:
            jsonObj = {}
            # Open the file with the UTF-8 encoding
            with open("language_dictionaries/" + file, encoding="utf-8") as f:
                # Get the first word of each line, remove any non-breaking spaces
                # and add it to the json object
                # if the line contains a word or letters and symbols
                for line in f:
                    if line.split():
                        jsonObj[line.split()[0].replace("\u00a0", "").lower()] = True
            # Write the words to a .json file, each word on is a key
            with open(
                "language_dictionaries/" + file.replace(".dict", ".json"),
                mode="w",
                encoding="utf-8",
            ) as f:
                json.dump(jsonObj, f, indent=4, ensure_ascii=False)
            print(f"Processed {file}")  # Print confirmation message


generate_words()
