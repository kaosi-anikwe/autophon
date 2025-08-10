import os


def rename_path(root_dir, old_substr, new_substr):
    for dirpath, dirnames, filenames in os.walk(root_dir, topdown=False):
        # Rename files
        for filename in filenames:
            if old_substr in filename:
                old_file_path = os.path.join(dirpath, filename)
                new_filename = filename.replace(old_substr, new_substr)
                new_file_path = os.path.join(dirpath, new_filename)
                os.rename(old_file_path, new_file_path)
                print(f"Renamed file: {old_file_path} to {new_file_path}")

        # Rename directories
        for dirname in dirnames:
            if old_substr in dirname:
                old_dir_path = os.path.join(dirpath, dirname)
                new_dirname = dirname.replace(old_substr, new_substr)
                new_dir_path = os.path.join(dirpath, new_dirname)
                os.rename(old_dir_path, new_dir_path)
                print(f"Renamed directory: {old_dir_path} to {new_dir_path}")


root_directory = ["admin_updates", "app/static", "uploads"]

langs = {
    "da_DK": "danDK_MFA1_v030",
    "da_XX": "danXX_MFA1_v040",
    "ov_SE": "ovdSE_MFA1_v010",
    "en_GB": "engGB_MFA1_v010",
    "en_US": "engUS_MFA1_v010",
    "fo_FO": "faoFO_MFA1_v010",
    "fi_FI": "finFI_MFA1_v010",
    "fr_FR": "fraFR_MFA1_v010",
    "fr_CA": "fraCA_MFA1_v010",
    "de_DE": "deuDE_MFA1_v010",
    "kl_GL": "kalGL_MFA1_v010",
    "is_IS": "islIS_MFA1_v010",
    "no_NO": "norNO_MFA1_v010",
    "se_NO": "smiNO_MFA1_v010",
    "sv_SE": "sweSE_MFA1_v010",
}


for dir in root_directory:
    for old, new in langs.items():
        rename_path(dir, old, new)

# rename user_dict to dic
rename_path("uploads", "user_dicts", "dic")
