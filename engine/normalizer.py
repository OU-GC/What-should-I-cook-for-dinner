import unicodedata
from typing import Dict, List

class DataNormalizer:
    def __init__(self, synonyms: Dict[str, str]):
        self.synonyms = synonyms

    def normalize(self, ingredient: str) -> str:
        # Normalize unicode (full-width to half-width), strip, and remove all spaces
        normalized = unicodedata.normalize('NFKC', ingredient).strip().replace(" ", "")
        # Apply synonym mapping
        return self.synonyms.get(normalized, normalized)

    def normalize_list(self, ingredients: List[str]) -> List[str]:
        return [self.normalize(i) for i in ingredients if i.strip()]
