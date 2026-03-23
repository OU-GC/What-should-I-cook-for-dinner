from typing import List

class IngredientCalculator:
    def __init__(self, standard_condiments: List[str]):
        # Normalize and store as set for O(1) lookup
        self.standard_condiments = set([c.strip() for c in standard_condiments])

    def get_missing_ingredients(self, required: List[str], available: List[str]) -> List[str]:
        # Filter out standard condiments from required ingredients
        non_standard_required = [r for r in required if r not in self.standard_condiments]
        
        # Calculate exactly what is missing
        available_set = set(available)
        missing = [req for req in non_standard_required if req not in available_set]
        
        return missing

    def get_match_count(self, required: List[str], available: List[str]) -> int:
        non_standard_required = [r for r in required if r not in self.standard_condiments]
        available_set = set(available)
        match_count = sum(1 for req in non_standard_required if req in available_set)
        return match_count

    def get_non_standard_count(self, required: List[str]) -> int:
        return len([r for r in required if r not in self.standard_condiments])
