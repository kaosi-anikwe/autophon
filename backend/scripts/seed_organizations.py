#!/usr/bin/env python3
"""
Seed script to populate the organizations table with data from JSON file.
This script can be run multiple times safely - it will only add new organizations
and skip existing ones.
"""

import sys
import os
import json
import argparse
import unicodedata

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.extensions import db
from app.models.organization import Organization


def normalize_organization_name(name):
    """
    Normalize organization name to handle Unicode variations.
    This uses the same normalization as the Organization model.
    """
    return Organization.normalize_name(name)


def load_organizations_from_json(json_path):
    """Load organizations from JSON file with proper Unicode handling"""
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            # Read the raw content first
            content = f.read()

        # Parse JSON with proper Unicode handling
        # The strict=False allows control characters and ensures Unicode escapes are handled
        data = json.loads(content, strict=False)

        # Ensure all strings are properly decoded Unicode
        if isinstance(data, list):
            # Process each organization name to ensure proper Unicode decoding
            organizations = []
            for org_name in data:
                if isinstance(org_name, str):
                    # Ensure Unicode escape sequences are properly handled
                    # and normalize any encoding issues
                    try:
                        # Handle potential double-encoding or escape sequence issues
                        if "\\u" in org_name:
                            # Try to decode Unicode escape sequences manually if needed
                            decoded_name = org_name.encode("utf-8").decode(
                                "unicode_escape"
                            )
                            organizations.append(decoded_name)
                        else:
                            organizations.append(org_name)
                    except UnicodeError:
                        # If decoding fails, use the original string
                        organizations.append(org_name)
                else:
                    organizations.append(org_name)
            return organizations
        else:
            return data

    except FileNotFoundError:
        print(f"❌ JSON file not found: {json_path}")
        return []
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing JSON file: {e}")
        return []
    except UnicodeError as e:
        print(f"❌ Unicode encoding error in JSON file: {e}")
        return []


def seed_organizations(json_path=None, force_reseed=False):
    """Seed the database with organizations from JSON file"""
    app = create_app()

    with app.app_context():
        # Determine JSON file path
        if not json_path:
            # Default to admin directory
            admin_dir = os.path.join(
                os.path.dirname(os.path.dirname(__file__)), "..", "admin"
            )
            json_path = os.path.join(admin_dir, "organizations.json")

        print(f"Loading organizations from: {json_path}")
        organizations_data = load_organizations_from_json(json_path)

        if not organizations_data:
            print("❌ No organizations data found or failed to load")
            return False

        print(f"Loaded {len(organizations_data)} organizations from JSON")

        # Show some examples of Unicode processing for debugging
        unicode_examples = [
            org for org in organizations_data if any(ord(char) > 127 for char in org)
        ][:5]
        if unicode_examples:
            print(f"Sample Unicode organizations found:")
            for example in unicode_examples:
                normalized = normalize_organization_name(example)
                print(f"  '{example}' -> '{normalized}'")

        # Create tables if they don't exist
        try:
            db.create_all()
        except Exception as e:
            print(f"Warning: Could not create tables: {e}")

        try:
            existing_count = Organization.query.count()
            print(f"Current organizations in database: {existing_count}")
        except Exception as e:
            print(f"Warning: Could not query organizations table: {e}")
            existing_count = 0

        if force_reseed and existing_count > 0:
            print("🔄 Force reseed enabled - clearing existing organizations...")
            Organization.query.delete()
            db.session.commit()
            print("✅ Existing organizations cleared")

        # Get existing organization names for duplicate checking
        existing_names = set()
        existing_normalized_names = set()
        if not force_reseed:
            existing_orgs = Organization.query.all()
            existing_names = {org.name for org in existing_orgs}
            existing_normalized_names = {
                normalize_organization_name(org.name) for org in existing_orgs
            }
            print(f"Found {len(existing_names)} existing organization names")
        else:
            # Even with force reseed, we need to track within this batch
            existing_names = set()
            existing_normalized_names = set()

        # Prepare new organizations (skip duplicates)
        new_organizations = []
        skipped_count = 0
        processed_normalized_names = set()  # Track normalized names within this batch

        for org_name in organizations_data:
            if not org_name or not org_name.strip():
                continue

            clean_name = org_name.strip()
            normalized_name = normalize_organization_name(clean_name)

            # Check for exact name duplicates first (more specific)
            if clean_name in existing_names:
                print(f"  Skipping exact duplicate: '{clean_name}'")
                skipped_count += 1
                continue

            # Check if this normalized name already exists (in DB or current batch)
            if (
                normalized_name in existing_normalized_names
                or normalized_name in processed_normalized_names
            ):
                print(
                    f"  Skipping duplicate (normalized): '{clean_name}' -> '{normalized_name}'"
                )
                skipped_count += 1
                continue

            org = Organization(name=clean_name)
            new_organizations.append(org)
            existing_names.add(clean_name)  # Track exact names
            existing_normalized_names.add(normalized_name)  # Track normalized names
            processed_normalized_names.add(
                normalized_name
            )  # Prevent duplicates within this batch

        print(f"New organizations to add: {len(new_organizations)}")
        print(f"Duplicates skipped: {skipped_count}")

        if new_organizations:
            try:
                # Check for any final duplicates by querying the database again
                print("🔍 Performing final duplicate check before insertion...")
                final_duplicates = 0
                organizations_to_insert = []

                for org in new_organizations:
                    existing = Organization.query.filter_by(name=org.name).first()
                    if existing:
                        print(
                            f"  Final check: Skipping duplicate '{org.name}' (found in DB)"
                        )
                        final_duplicates += 1
                    else:
                        organizations_to_insert.append(org)

                if final_duplicates > 0:
                    print(
                        f"  Final check: Found {final_duplicates} additional duplicates"
                    )

                if organizations_to_insert:
                    # Batch insert for better performance
                    db.session.add_all(organizations_to_insert)
                    db.session.commit()
                    print(
                        f"✅ Successfully added {len(organizations_to_insert)} new organizations!"
                    )
                else:
                    print("ℹ️  No organizations to insert after final duplicate check")

            except Exception as e:
                db.session.rollback()
                print(f"❌ Error adding organizations: {e}")
                # Print more details about the error
                if "Duplicate entry" in str(e):
                    print(
                        "This appears to be a duplicate key error. The organization may have been inserted by another process."
                    )
                print(f"Full error details: {type(e).__name__}: {e}")
                raise
        else:
            print("ℹ️  No new organizations to add")

        # Final verification
        final_count = Organization.query.count()
        print(f"✅ Total organizations in database: {final_count}")

        # Show some examples
        if new_organizations:
            sample_new = new_organizations[:3]
            print(f"\nSample new organizations added:")
            for org in sample_new:
                print(f"  + {org.name}")

        return True


def test_normalization():
    """Test the Unicode normalization functionality"""
    print("\n🔤 Testing Unicode normalization...")

    # Test cases with different Unicode representations
    test_cases = [
        "Alice-Salomon-Fachhochschule für Sozialarbeit und Sozialpädagogik Berlin",
        "Alice-Salomon-Fachhochschule fur Sozialarbeit und Sozialpädagogik Berlin",
        "École Normale Supérieure",
        "Ecole Normale Superieure",
        "Universität München",
        "Universitat Munchen",
        "São Paulo University",
        "Sao Paulo University",
    ]

    normalized_map = {}
    for name in test_cases:
        normalized = normalize_organization_name(name)
        if normalized in normalized_map:
            print(f"  ✅ DUPLICATE DETECTED:")
            print(f"    Original 1: '{normalized_map[normalized]}'")
            print(f"    Original 2: '{name}'")
            print(f"    Normalized: '{normalized}'")
        else:
            normalized_map[normalized] = name
            print(f"  '{name}' -> '{normalized}'")


def test_search():
    """Test the search functionality"""
    app = create_app()

    with app.app_context():
        print("\n🔍 Testing search functionality...")

        # Test various searches
        test_queries = ["harvard", "university", "college", "institute", "stanford"]

        for query in test_queries:
            results = Organization.search(query, limit=5)
            print(f"  Search '{query}': {len(results)} results")
            if results:
                print(f"    First result: {results[0].name}")


def main():
    """Main function with command line argument handling"""
    parser = argparse.ArgumentParser(
        description="Seed organizations table from JSON file",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python seed_organizations.py                       # Use default JSON file
  python seed_organizations.py --json custom.json    # Use custom JSON file
  python seed_organizations.py --force               # Clear and re-seed all
  python seed_organizations.py --test-only           # Only run search tests
  python seed_organizations.py --test-normalization  # Test Unicode normalization
        """,
    )

    parser.add_argument(
        "--json",
        "--json-file",
        dest="json_path",
        help="Path to JSON file containing organizations (default: ../admin/organizations.json)",
    )

    parser.add_argument(
        "--force",
        "--force-reseed",
        action="store_true",
        help="Clear existing organizations and re-seed from scratch",
    )

    parser.add_argument(
        "--test-only",
        action="store_true",
        help="Only run search functionality tests, skip seeding",
    )

    parser.add_argument(
        "--test-normalization",
        action="store_true",
        help="Test Unicode normalization functionality",
    )

    args = parser.parse_args()

    try:
        if args.test_normalization:
            test_normalization()
        elif args.test_only:
            test_search()
        else:
            success = seed_organizations(
                json_path=args.json_path, force_reseed=args.force
            )
            if success:
                test_search()

        print("\n🎉 Script completed successfully!")

    except KeyboardInterrupt:
        print("\n⚠️  Script interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Script failed: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
