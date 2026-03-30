import json
import os
from flask import Flask, render_template, request, jsonify
from engine.models import User
from engine.recommender import RecommendationEngine

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')

def load_json(filename):
    filepath = os.path.join(DATA_DIR, filename)
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        raise RuntimeError(f"Data file not found: {filepath}")
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Invalid JSON in {filepath}: {e}")

config = load_json('config.json')
raw_recipes = load_json('recipes.json')

engine = RecommendationEngine(config, raw_recipes)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/recommend', methods=['POST'])
def recommend():
    try:
        data = request.json
        ingredients = data.get('ingredients', [])
        appliances = data.get('appliances', [])
        try:
            missing_tolerance = int(data.get('missing_tolerance', 1))
        except (TypeError, ValueError):
            return jsonify({"error": "missing_tolerance 必須為整數", "recipes": []}), 400
        if not (0 <= missing_tolerance <= 3):
            return jsonify({"error": "missing_tolerance 範圍須介於 0 至 3", "recipes": []}), 400
        
        user = User(
            user_id="anonymous",
            appliances=appliances,
            missing_tolerance=missing_tolerance
        )
        
        result = engine.get_recommendations(user, ingredients)
        
        formatted_recipes = []
        for r in result.get('recipes', []):
            recipe_obj = r['recipe']
            
            missing_text = ""
            if r['missing_count'] == 0:
                missing_text = "可直接做🎉"
                tag_class = "ready"
            elif r['missing_count'] == 1:
                missing_text = f"幾乎可以做，還缺 1 樣: {r['missing_items'][0]}"
                tag_class = "almost"
            else:
                missing_text = f"還缺 {r['missing_count']} 樣: {', '.join(r['missing_items'])}"
                tag_class = "missing"
                
            formatted_recipes.append({
                "recipe_id": recipe_obj.recipe_id,
                "name": recipe_obj.name,
                "image_url": recipe_obj.image_url,
                "cook_time": recipe_obj.cook_time,
                "steps": recipe_obj.steps,
                "required_appliances": recipe_obj.required_appliances,
                "ingredients": recipe_obj.ingredients,
                "tag_text": missing_text,
                "tag_class": tag_class,
                "score": r['score']
            })
            
        response = {
            "error": result.get("error"),
            "recipes": formatted_recipes,
            "fallback": None
        }
        
        # Fallsback when no recipes matched but valid input
        if not formatted_recipes and not response["error"]:
            response["fallback"] = {
                "message": "目前沒有完全符合的菜譜 😢",
                "suggestions": [
                    "試著放寬「缺少食材容忍值」",
                    "輸入更多你擁有的食材",
                    "更新你的廚房或取消部分不必要的廚具限制"
                ]
            }
            
        return jsonify(response)
        
    except Exception as e:
        return jsonify({"error": str(e), "recipes": []}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5002)
