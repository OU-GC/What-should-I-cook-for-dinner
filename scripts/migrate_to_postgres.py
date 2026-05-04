"""One-time migration: data/recipes.json -> Postgres.

Usage (locally):
    1. Set POSTGRES_URL in .env (copy from Vercel Storage tab).
    2. Run: python scripts/migrate_to_postgres.py
"""
import json
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(PROJECT_ROOT, '.env'))
except ImportError:
    pass

from engine.storage import RecipeStorage


def main():
    storage = RecipeStorage()

    print("Creating schema if not exists...")
    storage.init_schema()

    recipes_path = os.path.join(PROJECT_ROOT, 'data', 'recipes.json')
    with open(recipes_path, encoding='utf-8') as f:
        recipes = json.load(f)

    print(f"Loaded {len(recipes)} recipes from {recipes_path}")

    inserted = 0
    skipped = 0
    for r in recipes:
        try:
            new_id = storage.add_with_id(r)
            if new_id:
                inserted += 1
            else:
                skipped += 1
                print(f"  - Skipped (already exists): id={r.get('recipe_id')} {r.get('name')}")
        except Exception as e:
            skipped += 1
            print(f"  - Failed: {r.get('name')} -> {e}")

    print("\nResetting recipe_id sequence to MAX(recipe_id)...")
    storage.reset_sequence()

    print(f"\nDone. Inserted: {inserted}, Skipped: {skipped}")


if __name__ == '__main__':
    main()
