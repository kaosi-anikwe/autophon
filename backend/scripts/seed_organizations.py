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

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.extensions import db
from app.models.organization import Organization


def load_organizations_from_json(json_path):
    """Load organizations from JSON file"""
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"❌ JSON file not found: {json_path}")
        return []
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing JSON file: {e}")
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

        existing_count = Organization.query.count()
        print(f"Current organizations in database: {existing_count}")

        if force_reseed and existing_count > 0:
            print("🔄 Force reseed enabled - clearing existing organizations...")
            Organization.query.delete()
            db.session.commit()
            print("✅ Existing organizations cleared")

        # Get existing organization names for duplicate checking
        existing_names = set()
        if not force_reseed:
            existing_orgs = Organization.query.all()
            existing_names = {org.name for org in existing_orgs}
            print(f"Found {len(existing_names)} existing organization names")

        # Prepare new organizations (skip duplicates)
        new_organizations = []
        skipped_count = 0

        for org_name in organizations_data:
            if not org_name or not org_name.strip():
                continue

            clean_name = org_name.strip()

            if clean_name in existing_names:
                skipped_count += 1
                continue

            org = Organization(name=clean_name)
            new_organizations.append(org)
            existing_names.add(clean_name)  # Prevent duplicates within this batch

        print(f"New organizations to add: {len(new_organizations)}")
        print(f"Duplicates skipped: {skipped_count}")

        if new_organizations:
            try:
                # Batch insert for better performance
                db.session.add_all(new_organizations)
                db.session.commit()
                print(
                    f"✅ Successfully added {len(new_organizations)} new organizations!"
                )
            except Exception as e:
                db.session.rollback()
                print(f"❌ Error adding organizations: {e}")
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
  python seed_organizations.py                    # Use default JSON file
  python seed_organizations.py --json custom.json # Use custom JSON file
  python seed_organizations.py --force            # Clear and re-seed all
  python seed_organizations.py --test-only        # Only run search tests
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

    args = parser.parse_args()

    try:
        if args.test_only:
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
