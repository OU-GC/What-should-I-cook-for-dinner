import os
from typing import List, Dict, Any, Optional
import psycopg
from psycopg.types.json import Jsonb


class RecipeStorage:
    def __init__(self, dsn: Optional[str] = None):
        self._explicit_dsn = dsn

    @property
    def dsn(self) -> str:
        dsn = self._explicit_dsn or os.environ.get('POSTGRES_URL') or os.environ.get('DATABASE_URL')
        if not dsn:
            raise RuntimeError(
                "Postgres connection string not found. "
                "Set POSTGRES_URL or DATABASE_URL environment variable."
            )
        return dsn

    def _connect(self):
        return psycopg.connect(self.dsn)

    def init_schema(self) -> None:
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS recipes (
                    recipe_id           SERIAL PRIMARY KEY,
                    name                TEXT NOT NULL UNIQUE,
                    ingredients         JSONB NOT NULL,
                    required_appliances JSONB NOT NULL,
                    steps               JSONB,
                    cook_time           INTEGER,
                    created_at          TIMESTAMPTZ DEFAULT NOW()
                )
            """)
            conn.commit()

    def list_all(self) -> List[Dict[str, Any]]:
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute("""
                SELECT recipe_id, name, ingredients, required_appliances,
                       steps, cook_time
                FROM recipes
                ORDER BY recipe_id
            """)
            rows = cur.fetchall()
        return [{
            'recipe_id': str(r[0]),
            'name': r[1],
            'ingredients': r[2] or [],
            'required_appliances': r[3] or [],
            'steps': r[4] or [],
            'cook_time': r[5],
        } for r in rows]

    def add(self, recipe: Dict[str, Any]) -> str:
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute("""
                INSERT INTO recipes
                    (name, ingredients, required_appliances, steps, cook_time)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING recipe_id
            """, (
                recipe['name'],
                Jsonb(recipe.get('ingredients', [])),
                Jsonb(recipe.get('required_appliances', [])),
                Jsonb(recipe.get('steps', [])),
                recipe.get('cook_time'),
            ))
            new_id = cur.fetchone()[0]
            conn.commit()
        return str(new_id)

    def add_with_id(self, recipe: Dict[str, Any]) -> str:
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute("""
                INSERT INTO recipes
                    (recipe_id, name, ingredients, required_appliances,
                     steps, cook_time)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (recipe_id) DO NOTHING
                RETURNING recipe_id
            """, (
                int(recipe['recipe_id']),
                recipe['name'],
                Jsonb(recipe.get('ingredients', [])),
                Jsonb(recipe.get('required_appliances', [])),
                Jsonb(recipe.get('steps', [])),
                recipe.get('cook_time'),
            ))
            row = cur.fetchone()
            conn.commit()
        return str(row[0]) if row else ''

    def increment_rec_times(self, recipe_id: str) -> int:
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute("""
                UPDATE recipes
                SET rec_times = COALESCE(rec_times, 0) + 1
                WHERE recipe_id = %s
                RETURNING rec_times
            """, (int(recipe_id),))
            row = cur.fetchone()
            conn.commit()
        return int(row[0]) if row else 0

    def reset_rec_times(self, recipe_id: str) -> None:
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(
                "UPDATE recipes SET rec_times = 0 WHERE recipe_id = %s",
                (int(recipe_id),),
            )
            conn.commit()

    def reset_sequence(self) -> None:
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute("""
                SELECT setval(
                    pg_get_serial_sequence('recipes', 'recipe_id'),
                    COALESCE((SELECT MAX(recipe_id) FROM recipes), 1),
                    true
                )
            """)
            conn.commit()
