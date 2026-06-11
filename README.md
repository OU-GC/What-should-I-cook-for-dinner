# What Should I Cook for Dinner?

Enter the ingredients you have in the fridge and the app recommends home-style
dishes you can actually make, ranked by ingredient match, missing-item tolerance,
and the appliances you own — no more "looks great but can't make it" recipes.
When the database doesn't have enough matching dishes, it uses an LLM to generate
new recipes tailored to your ingredients on the fly.

## Features

- **Ingredient input & normalization**: handles synonyms, full-/half-width, and
  whitespace (e.g. 甘藍→高麗菜, 蔥→蔥花).
- **Staple condiment exclusion**: salt, soy sauce, oil, etc. are not counted as missing.
- **Match-score ranking**: score = matched non-staple ingredients ÷ total non-staple
  ingredients required by the recipe.
- **Missing-item tolerance slider**: 0–3, default 1; recipes over the threshold are hidden.
- **Appliance filtering**: recipes requiring appliances you don't have are dropped;
  if no appliances are set, filtering is skipped.
- **On-the-fly LLM expansion**: when fewer than 3 recipes match, OpenAI generates new
  recipes from the user's ingredients and stores them.
- **LLM input validation**: flags nonsense ingredients/appliances (e.g. 龍肉, asdf) in the UI.
- **Unsplash imagery**: fetches a finished-dish photo for recipes that lack one.
- **Talking fridge**: generates a short, in-character companion message for the results.

## Tech Stack

- **Backend**: Python + Flask
- **Database**: PostgreSQL (via `psycopg` 3)
- **External services**: OpenAI (`gpt-4o-mini` — recipe generation, input validation,
  image keywords, fridge message), Unsplash (images)
- **Frontend**: vanilla HTML / CSS / JS (`templates/`, `static/`)
- **Deployment**: Vercel (`api/index.py` entry point, configured in `vercel.json`)

## Project Structure

```
app.py                  Flask app and routes
api/index.py            Vercel serverless entry point
engine/
  recommender.py        Main pipeline: appliance filter → missing calc → tolerance → sort
  calculator.py         Missing / matched / non-staple count calculations
  normalizer.py         Ingredient normalization and synonyms
  validator.py          Recipe data completeness validation
  models.py             User / Recipe data models
  storage.py            PostgreSQL access layer
  recipe_generator.py   OpenAI recipe generation, input validation, image keywords, fridge message
  unsplash.py           Unsplash image lookup
data/config.json        Staple condiment list and synonym dictionary
templates/ static/      Frontend pages and assets
tests/test_engine.py    Recommendation engine unit tests
PRD.md               Product requirements document
```

## Environment Variables

Create a `.env` file in the project root (loaded automatically at startup):

| Variable | Required | Purpose |
| --- | --- | --- |
| `POSTGRES_URL` or `DATABASE_URL` | Yes | PostgreSQL connection string |
| `OPENAI_API_KEY` | No* | Recipe generation, input validation, image keywords, fridge message |
| `UNSPLASH_ACCESS_KEY` | No | Fetching finished-dish photos |

\* Without `OPENAI_API_KEY` the app still recommends existing recipes from the
database, but all LLM-powered features are disabled.

## Getting Started

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure .env (see Environment Variables above)

# 3. Initialize the database schema (first run only)
python -c "from engine.storage import RecipeStorage; RecipeStorage().init_schema()"

# 4. Run
python app.py
```

Recipes are stored in PostgreSQL and generated on demand by the LLM. You can
also add entries to the database manually.

## Deployment

Deployed on Vercel — try it at [what-should-i-cook-for-dinner.vercel.app](https://what-should-i-cook-for-dinner.vercel.app/).

## API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | Frontend page |
| GET | `/api/config/staples` | Staple condiment list (deduped and merged for display) |
| POST | `/recommend` | Main recommendation: ingredients, appliances, tolerance → ranked recipes |
| POST | `/appliance/add` | Add an appliance (name sanity-checked in the `/recommend` batch) |
| POST | `/recipes/expand` | Expand the recipe database via the LLM |

`POST /recommend` request example:

```json
{
  "ingredients": ["雞蛋", "高麗菜"],
  "appliances": ["平底鍋"],
  "missing_tolerance": 1
}
```

## Testing

```bash
pytest
```

## Pipeline

1. Input guard: 0 ingredients aborts immediately.
2. Appliance filter: drop recipes missing required appliances (skipped if none set).
3. Missing calc: after excluding staple condiments, count missing non-staple ingredients.
4. Tolerance filter: drop recipes over the slider setting.
5. Score & sort: order by missing count (asc), matched count (desc), score (desc).
6. If fewer than 3 results, trigger LLM generation from the ingredients and recompute.
7. If still no results, return friendly suggestions to relax the constraints.

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.
