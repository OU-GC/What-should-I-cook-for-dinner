import unittest
import copy
from engine.models import User
from engine.recommender import RecommendationEngine

CONFIG = {
  "standard_condiments": [
    "鹽巴", "醬油", "沙拉油", "水"
  ],
  "synonyms": {
    "高麗菜": "甘藍",
    "蔥花": "蔥"
  }
}

MOCK_RECIPES = [
  {
    "recipe_id": "1",
    "name": "高麗菜炒蛋",
    "ingredients": ["高麗菜", "雞蛋", "鹽巴", "沙拉油"],
    "required_appliances": ["平底鍋"],
  },
  {
    "recipe_id": "2",
    "name": "水煮蛋",
    "ingredients": ["雞蛋", "水"],
    "required_appliances": ["快煮鍋"],
  },
  {
    "recipe_id": "3",
    "name": "蔥爆豬肉",
    "ingredients": ["豬肉片", "蔥花", "醬油"],
    "required_appliances": ["平底鍋", "明火瓦斯爐"],
  },
  {
    "recipe_id": "4",
    "name": "烤地瓜",
    "ingredients": ["地瓜"],
    "required_appliances": ["烤箱"],
  },
  {
    "name": "invalid raw data without recipe_id",
    "ingredients": [],
    "required_appliances": []
  }
]

class TestRecommendationEngine(unittest.TestCase):
    def setUp(self):
        self.engine = RecommendationEngine(CONFIG, MOCK_RECIPES)

    def test_validation_ignores_invalid_recipes(self):
        # We passed 5 recipes but 1 is invalid, so only 4 should be loaded
        self.assertEqual(len(self.engine.recipes), 4)

    def test_ac1_precise_matching_and_sorting(self):
        # User has "雞蛋", "高麗菜", standard condiments are ignored as missing.
        # Recipe 1 -> missing 0
        # Recipe 2 -> missing 0
        user = User(user_id="u1", appliances=["平底鍋", "快煮鍋", "明火瓦斯爐"], missing_tolerance=3)
        res = self.engine.get_recommendations(user, ["雞蛋", "高麗菜"])
        recipes = res['recipes']
        
        self.assertTrue(len(recipes) > 0)
        r1 = recipes[0]
        # "高麗菜炒蛋" matches 2 items vs "水煮蛋" matching 1, so it should be first
        self.assertEqual(r1['recipe'].name, "高麗菜炒蛋")
        self.assertEqual(r1['missing_count'], 0)
        
        r3 = next((r for r in recipes if r['recipe'].name == "蔥爆豬肉"), None)
        self.assertIsNotNone(r3)
        self.assertEqual(r3['missing_count'], 2) # missing 豬肉片, 蔥花

    def test_ac2_tolerance_slider(self):
        # Slider = 0
        user = User(user_id="u1", appliances=["平底鍋", "快煮鍋", "明火瓦斯爐"], missing_tolerance=0)
        res = self.engine.get_recommendations(user, ["雞蛋", "高麗菜"])
        recipes = res['recipes']
        
        names = [r['recipe'].name for r in recipes]
        self.assertIn("高麗菜炒蛋", names)
        self.assertIn("水煮蛋", names)
        self.assertNotIn("蔥爆豬肉", names)

    def test_ac3_appliance_hard_filter(self):
        # Only have 快煮鍋
        user = User(user_id="u1", appliances=["快煮鍋"], missing_tolerance=3)
        res = self.engine.get_recommendations(user, ["雞蛋", "高麗菜", "豬肉片", "蔥花", "地瓜"])
        recipes = res['recipes']
        
        names = [r['recipe'].name for r in recipes]
        self.assertIn("水煮蛋", names)
        self.assertNotIn("高麗菜炒蛋", names)
        self.assertNotIn("烤地瓜", names)

    def test_appliance_bypass(self):
        # Edge Case 11.1
        user = User(user_id="u1", appliances=[], missing_tolerance=3)
        res = self.engine.get_recommendations(user, ["地瓜"])
        recipes = res['recipes']
        
        names = [r['recipe'].name for r in recipes]
        self.assertIn("烤地瓜", names) # bypass is active

    def test_zero_input_prevention(self):
        # Edge Case 11.4
        user = User(user_id="u1", appliances=["快煮鍋"], missing_tolerance=3)
        res = self.engine.get_recommendations(user, [])
        self.assertIsNotNone(res['error'])
        self.assertEqual(len(res['recipes']), 0)
        
        res2 = self.engine.get_recommendations(user, ["   "])
        self.assertIsNotNone(res2['error'])
        self.assertEqual(len(res2['recipes']), 0)

if __name__ == '__main__':
    unittest.main()
