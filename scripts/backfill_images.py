"""Backfill Unsplash images for existing recipes that have no image_url.

Usage:
    python scripts/backfill_images.py            # process all recipes without images
    python scripts/backfill_images.py --limit 20 # cap at 20 (useful for demo-tier 50/hr)
    python scripts/backfill_images.py --dry-run  # show what would happen, don't write

Required env (in .env):
    POSTGRES_URL
    OPENAI_API_KEY        (for translating recipe names -> english keywords)
    UNSPLASH_ACCESS_KEY

Re-runnable: only touches recipes where image_url IS NULL.
"""
import argparse
import os
import sys
import time

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(PROJECT_ROOT, '.env'))
except ImportError:
    pass

from engine.storage import RecipeStorage
from engine.recipe_generator import RecipeGenerator
from engine.unsplash import UnsplashClient


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=0,
                        help='Max recipes to process (0 = all).')
    parser.add_argument('--dry-run', action='store_true',
                        help='Show what would happen without writing to DB.')
    parser.add_argument('--sleep', type=float, default=0.5,
                        help='Seconds to sleep between Unsplash calls (default 0.5).')
    args = parser.parse_args()

    storage = RecipeStorage()
    generator = RecipeGenerator()
    unsplash = UnsplashClient()

    if not unsplash.access_key:
        print("ERROR: UNSPLASH_ACCESS_KEY not set in .env")
        sys.exit(1)

    pending = storage.list_without_image()
    if args.limit > 0:
        pending = pending[:args.limit]

    if not pending:
        print("No recipes need backfilling. All have images.")
        return

    print(f"Found {len(pending)} recipe(s) without image. Translating names...")
    try:
        queries = generator.generate_image_queries(pending)
    except Exception as e:
        print(f"ERROR: failed to translate recipe names via LLM: {e}")
        sys.exit(1)

    print(f"Got {len(queries)} translations.\n")

    success = 0
    no_image = 0
    failed = 0

    for r in pending:
        name = r['name']
        rid = r['recipe_id']
        query = queries.get(name)

        if not query:
            print(f"  [skip] {name}: no english query from LLM")
            failed += 1
            continue

        photo = unsplash.search_photo(query)
        if not photo:
            print(f"  [none] {name} (query='{query}'): no Unsplash result")
            if not args.dry_run:
                # Still save the query so we know we tried.
                storage.update_image(rid, None, None, query)
            no_image += 1
            time.sleep(args.sleep)
            continue

        print(f"  [ok]   {name} (query='{query}') -> {photo['credit']['photographer']}")
        if not args.dry_run:
            storage.update_image(rid, photo['url'], photo['credit'], query)
        success += 1
        time.sleep(args.sleep)

    print(f"\nDone. ok={success} no_image={no_image} failed={failed}"
          + (" (DRY RUN, nothing written)" if args.dry_run else ""))


if __name__ == '__main__':
    main()
