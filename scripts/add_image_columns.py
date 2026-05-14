"""One-time migration: add image columns to recipes table.

Usage (locally):
    1. Set POSTGRES_URL in .env (copy from Vercel Storage tab).
    2. Run: python scripts/add_image_columns.py

Safe to run multiple times (uses IF NOT EXISTS).
"""
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(PROJECT_ROOT, '.env'))
except ImportError:
    pass

import psycopg


def main():
    dsn = os.environ.get('POSTGRES_URL') or os.environ.get('DATABASE_URL')
    if not dsn:
        print("ERROR: POSTGRES_URL or DATABASE_URL not set in .env")
        sys.exit(1)

    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        print("Adding image columns to recipes table...")
        cur.execute("""
            ALTER TABLE recipes
                ADD COLUMN IF NOT EXISTS image_url    TEXT,
                ADD COLUMN IF NOT EXISTS image_credit JSONB,
                ADD COLUMN IF NOT EXISTS image_query  TEXT
        """)
        conn.commit()

        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'recipes'
              AND column_name IN ('image_url', 'image_credit', 'image_query')
            ORDER BY column_name
        """)
        rows = cur.fetchall()

    print("\nCurrent image columns on `recipes`:")
    for name, dtype in rows:
        print(f"  - {name}: {dtype}")

    if len(rows) == 3:
        print("\nDone.")
    else:
        print(f"\nWARNING: expected 3 columns, got {len(rows)}.")
        sys.exit(1)


if __name__ == '__main__':
    main()
