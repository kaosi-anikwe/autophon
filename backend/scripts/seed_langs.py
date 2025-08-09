import json
from app import create_app
from app.extensions import db
from app.models.language import Language, LanguageType
from app.models.engine import Engine


def seed_from_json(json_file):
    app = create_app()
    with app.app_context():
        # Load JSON data
        with open(json_file, "r") as f:
            data = json.load(f)

        # Seed engines first
        engines_map = {}
        for engine_data in data["ngins"]:
            engine = Engine(
                code=engine_data["code"],
                name=engine_data["name"],
                documentation_link=engine_data["link"],
            )
            db.session.add(engine)
            engines_map[engine_data["code"]] = engine

        db.session.commit()

        # Seed languages
        languages_map = {}
        for lang_data in data["langs"]:
            # Extract engine from language code
            engine_code = extract_engine_from_code(lang_data)

            language = Language(
                code=list(lang_data.keys())[0],
                display_name=lang_data[list(lang_data.keys())[0]],
                language_name=lang_data["language"],
                type=LanguageType(lang_data["type"]),
                alphabet=lang_data["alphabet"],
                priority=lang_data["priority"],
                homepage=lang_data["homepage"],
            )

            # Associate with engine
            if engine_code in engines_map:
                language.engines.append(engines_map[engine_code])

            db.session.add(language)
            languages_map[language.code] = language

        db.session.commit()

        # Add alternatives relationships
        for lang_data in data["langs"]:
            code = list(lang_data.keys())[0]
            if "alternatives" in lang_data:
                language = languages_map[code]
                for alt_code in lang_data["alternatives"]:
                    if alt_code in languages_map:
                        language.alternatives.append(languages_map[alt_code])

        db.session.commit()
        print("Languages and engines seeded successfully!")


def extract_engine_from_code(lang_data):
    """Extract engine code from language code like 'danDK_MFA1_v040' -> 'MFA1'"""
    code = list(lang_data.keys())[0]
    if "_MFA1_" in code:
        return "MFA1"
    elif "_MFA2_" in code:
        return "MFA2"
    elif "_FAVE_" in code:
        return "FAVE"
    elif "_FASE_" in code:
        return "FASE"
    return "MFA1"  # default


if __name__ == "__main__":
    seed_from_json()
