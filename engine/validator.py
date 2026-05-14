from typing import Dict, Any, Optional
from engine.models import Recipe

class DataValidator:
    @staticmethod
    def validate_recipe(data: Dict[str, Any]) -> Optional[Recipe]:
        """
        Validates a raw recipe dictionary. Returns a Recipe object if valid, else None.
        A recipe must contain 'recipe_id', 'name', 'ingredients', and 'required_appliances'.
        """
        required_keys = ['recipe_id', 'name', 'ingredients', 'required_appliances']
        for key in required_keys:
            if key not in data:
                return None
            if key in ['ingredients', 'required_appliances'] and not isinstance(data[key], list):
                return None
            
        return Recipe(
            recipe_id=str(data['recipe_id']),
            name=str(data['name']),
            ingredients=[str(i).strip() for i in data['ingredients'] if i],
            required_appliances=[str(a).strip() for a in data['required_appliances'] if a],
            steps=data.get('steps', []),
            cook_time=data.get('cook_time'),
            image_url=data.get('image_url'),
            image_credit=data.get('image_credit'),
        )
