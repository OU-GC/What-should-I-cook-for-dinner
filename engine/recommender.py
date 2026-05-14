from typing import List, Dict, Any
from engine.models import User, Recipe
from engine.calculator import IngredientCalculator
from engine.normalizer import DataNormalizer
from engine.validator import DataValidator

class ApplianceFilter:
    @staticmethod
    def is_valid(user: User, recipe: Recipe) -> bool:
        # Bypass logic: if user has no appliances set, do not filter
        if not user.appliances:
            return True
        
        user_appliances = set(user.appliances)
        for req in recipe.required_appliances:
            if req not in user_appliances:
                return False
        return True

class Sorter:
    @staticmethod
    def sort_results(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        # Sort by:
        # 1. missing_count (asc)
        # 2. match_count (desc)
        # 3. score (desc)
        results.sort(key=lambda x: (x['missing_count'], -x['match_count'], -x['score']))
        return results

class RecommendationEngine:
    def __init__(self, config: Dict[str, Any], raw_recipes: List[Dict[str, Any]]):
        self.normalizer = DataNormalizer(config.get('synonyms', {}))
        normalized_condiments = self.normalizer.normalize_list(config.get('standard_condiments', []))
        self.calculator = IngredientCalculator(normalized_condiments)
        
        # Load and validate recipes
        self.recipes = []
        for raw in raw_recipes:
            recipe = DataValidator.validate_recipe(raw)
            if recipe:
                self.recipes.append(recipe)

    def get_recommendations(
        self,
        user: User,
        raw_ingredients: List[str],
        always_include_names: List[str] = None,
    ) -> Dict[str, Any]:
        # Zero Input Prevention
        if not raw_ingredients or not [i for i in raw_ingredients if i.strip()]:
            return {"error": "請至少輸入一項食材", "recipes": []}

        # Normalize user input ingredients
        available_ingredients = self.normalizer.normalize_list(raw_ingredients)

        # Recipes whose name is listed here bypass the tolerance filter — used
        # for freshly LLM-generated recipes tailored to the user's ingredients.
        always_include = {n.strip().lower() for n in (always_include_names or [])}

        results = []

        for recipe in self.recipes:
            # 1. Appliance Filter
            if not ApplianceFilter.is_valid(user, recipe):
                continue

            # Normalize recipe ingredients
            normalized_reqs = self.normalizer.normalize_list(recipe.ingredients)

            # 2. Missing calculation
            missing_items = self.calculator.get_missing_ingredients(normalized_reqs, available_ingredients)
            missing_count = len(missing_items)

            # 3. Tolerance filter
            if missing_count > user.missing_tolerance and recipe.name.strip().lower() not in always_include:
                continue
                
            # 4. Score calculation
            non_standard_count = self.calculator.get_non_standard_count(normalized_reqs)
            match_count = self.calculator.get_match_count(normalized_reqs, available_ingredients)

            # 5. Must contain at least one user-provided ingredient
            if match_count < 1:
                continue

            score = (match_count / non_standard_count) if non_standard_count > 0 else 1.0

            results.append({
                "recipe": recipe,
                "missing_count": missing_count,
                "missing_items": missing_items,
                "match_count": match_count,
                "score": score
            })

        # Sort the results
        sorted_results = Sorter.sort_results(results)
        
        return {
            "recipes": sorted_results,
            "error": None
        }
