from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class User:
    user_id: str
    appliances: List[str] = field(default_factory=list)
    missing_tolerance: int = 1

@dataclass
class Recipe:
    recipe_id: str
    name: str
    ingredients: List[str]
    required_appliances: List[str]
    steps: List[str] = field(default_factory=list)
    cook_time: Optional[int] = None
