import os
import csv
import pympi
import pandas as pd
from pandas import DataFrame
from praatio import textgrid

# local imports
from app.utils.logger import get_logger

logger = get_logger(__name__)


def convert_eaf_to_tsv(input_path, output_path):
    # Read the EAF file
    eaf = pympi.Elan.Eaf(file_path=input_path)
    # Open the output file for writing
    with open(output_path, "w") as output_file:
        # Iterate through tiers in the EAF file
        for tier_name in eaf.get_tier_names():
            # Iterate through annotations in the tier
            for annotation in eaf.get_annotation_data_for_tier(tier_name):
                # Get the start and end times and the transcription for the annotation
                start_time, end_time, transcription = annotation

                # If either time is None, skip this annotation
                if start_time is None or end_time is None:
                    logger.info(
                        f"Skipped annotation with missing time values in file {input_path} in tier {tier_name}. Annotation: {annotation}"
                    )
                    continue

                # Convert the times from milliseconds to seconds
                start_time /= 1000
                end_time /= 1000

                # Write the data to the output file
                output_file.write(
                    f"{tier_name}\t{start_time}\t{end_time}\t{transcription}\n"
                )

    logger.info(f"Converted {input_path} to {output_path}")


def validate_tsv_file(df: DataFrame, file):
    # Check the number of columns
    if df.shape[1] < 3:
        raise Exception(
            f"{os.path.basename(file)}: should have at least three columns with content."
        )

    # Check data types of columns 2 and 3 again (starting from row 2)
    if not pd.api.types.is_numeric_dtype(
        pd.to_numeric(df.iloc[1:, 1], errors="coerce").dropna()
    ) or not pd.api.types.is_numeric_dtype(
        pd.to_numeric(df.iloc[1:, 2], errors="coerce").dropna()
    ):
        raise Exception(
            f"{os.path.basename(file)}: Columns 2 and 3 should contain numerical values."
        )

    # Check if end_time is greater than start_time
    numeric_end_time = pd.to_numeric(df.iloc[:, 2], errors="coerce")
    numeric_start_time = pd.to_numeric(df.iloc[:, 1], errors="coerce")
    if (numeric_end_time <= numeric_start_time).any():
        raise Exception(
            f"{os.path.basename(file)}: end_time (column 3) should be greater than start_time (column 2)."
        )
    return df


def convert_tsv_to_tsv(tsv_file, output_tsv_file):
    try:
        with open(tsv_file, "r", encoding="utf-8") as file:
            # Read lines and strip trailing white spaces or tabs
            lines = [line.strip() for line in file]
        with open(tsv_file, "w", encoding="utf-8") as file:
            file.write("\n".join(lines))

        # Read the TSV file into a DataFrame
        df = pd.read_csv(tsv_file, sep="\t", header=None)

        # Validate the TSV file
        validate_tsv_file(df, tsv_file)

        # Check if content is consistently surrounded by quotes in each column
        for col in df.columns:
            if (
                df[col]
                .apply(
                    lambda x: isinstance(x, str)
                    and x.startswith('"')
                    and x.endswith('"')
                )
                .all()
            ):
                df[col] = df[col].str.strip('"')

    except pd.errors.ParserError as e:
        logger.info(f"Skipped {tsv_file}: Error parsing TSV file - {e}")
        return
    except ValueError as e:
        logger.info(f"Skipped {tsv_file}: {e}")
        return

    # Open the output TSV file for writing
    with open(output_tsv_file, "w") as output_file:
        # Iterate through rows in the DataFrame
        for _, row in df.iterrows():
            if len(row) < 4:
                tier_name = "transcription"
                start_time = row[0]
                end_time = row[1]
                transcription = row[2]
            elif len(row) > 4:
                tier_name = row[1]
                start_time = row[2]
                end_time = row[3]
                transcription = row[4]
            else:
                tier_name = row[0]
                start_time = row[1]
                end_time = row[2]
                transcription = row[3]

            # Write the data to the output TSV file
            output_file.write(
                f"{tier_name}\t{start_time}\t{end_time}\t{transcription}\n"
            )

    logger.info(f"Converted {tsv_file} to {output_tsv_file}")


def validate_excel_file(df, file):
    # Check the number of columns
    if df.shape[1] < 3:
        raise Exception(
            f"{os.path.basename(file)}: should have at least three columns with content."
        )

    # Check data types of columns 2 and 3 again (starting from row 2)
    if not pd.api.types.is_numeric_dtype(
        pd.to_numeric(df.iloc[1:, 1], errors="coerce").dropna()
    ) or not pd.api.types.is_numeric_dtype(
        pd.to_numeric(df.iloc[1:, 2], errors="coerce").dropna()
    ):
        raise Exception(
            f"{os.path.basename(file)}: Columns 2 and 3 should contain numerical values."
        )

    # Check if end_time is greater than start_time
    numeric_end_time = pd.to_numeric(df.iloc[:, 2], errors="coerce")
    numeric_start_time = pd.to_numeric(df.iloc[:, 1], errors="coerce")
    if (numeric_end_time <= numeric_start_time).any():
        raise Exception(
            f"{os.path.basename(file)}: end_time (column 3) should be greater than start_time (column 2)."
        )
    return df


def convert_excel_to_tsv(excel_file, tsv_file):
    # Read the Excel file into a DataFrame without header
    df = pd.read_excel(excel_file, header=None)

    try:
        # Validate the Excel file
        validate_excel_file(df, excel_file)
    except ValueError as e:
        logger.info(f"Skipped {excel_file}: {e}")
        return

    # Open the TSV file for writing
    with open(tsv_file, "w") as output_file:
        # Iterate through rows in the DataFrame
        for _, row in df.iterrows():
            if len(row) < 4:
                tier_name = "transcription"
                start_time = row[0]
                end_time = row[1]
                transcription = row[2]
            elif len(row) > 4:
                tier_name = row[1]
                start_time = row[2]
                end_time = row[3]
                transcription = row[4]
            else:
                tier_name = row[0]
                start_time = row[1]
                end_time = row[2]
                transcription = row[3]

            # Write the data to the TSV file
            output_file.write(
                f"{tier_name}\t{start_time}\t{end_time}\t{transcription}\n"
            )

    logger.info(f"Converted {excel_file} to {tsv_file}")


def make_float(s):
    if "," in str(s):
        s = str(s).replace(",", ".")
    return float(s)


def detect_header(data):
    try:
        make_float(data[1])
        make_float(data[2])
        return False
    except ValueError:
        return True


def tsv_to_textgrid(tsv_file, textgrid_file):
    from app.utils.helpers import replace_decomposed

    tiers = {}
    with open(tsv_file, "r") as tsv:
        reader = csv.reader(tsv, delimiter="\t", quoting=csv.QUOTE_NONE)
        first_row = next(reader)

        has_header = detect_header(first_row)

        # Skip the header if it exists
        if has_header:
            rows_to_process = list(reader)
        else:
            rows_to_process = [first_row] + list(reader)

        for row in rows_to_process:
            logger.info(f"ROW TO PROCESS: {row}")
            try:
                row = row[1:] if len(row) > 4 else row  # reduce to 4 cols if more
                tier_name = os.path.splitext(row[0])[0]
                start_time = make_float(row[1])
                end_time = make_float(row[2])
                text = row[3] if len(row) > 3 else ""

                if start_time >= end_time:
                    logger.info(
                        f"Warning: Skipping invalid interval in {tsv_file} from {start_time} to {end_time}."
                    )
                    continue

                interval = (start_time, end_time, replace_decomposed(text))

                if tier_name not in tiers:
                    tiers[tier_name] = []

                tiers[tier_name].append(interval)
            except ValueError as e:
                logger.info(f"Error reading line in {os.path.basename(tsv_file)}: {e}")
                raise Exception(
                    f"Error reading line in {os.path.basename(tsv_file)}: {e}"
                )

    min_time = min(
        min(intervals, key=lambda x: x[0])[0] for intervals in tiers.values()
    )
    max_time = max(
        max(intervals, key=lambda x: x[1])[1] for intervals in tiers.values()
    )
    textgrid_obj = textgrid.Textgrid(minTimestamp=min_time, maxTimestamp=max_time)

    for tier_name, intervals in tiers.items():
        if not intervals:
            continue

        interval_tier = textgrid.IntervalTier(
            name=tier_name, entries=intervals, minT=min_time, maxT=max_time
        )
        textgrid_obj.addTier(interval_tier)

    textgrid_obj.save(textgrid_file, format="long_textgrid", includeBlankSpaces=True)
