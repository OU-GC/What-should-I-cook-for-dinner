import json
import os
import time
from flask import Flask, render_template, request, jsonify
from engine.models import User
from engine.recommender import RecommendationEngine
from engine.storage import RecipeStorage
from engine.recipe_generator import RecipeGenerator

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

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
storage = RecipeStorage()
recipe_generator = RecipeGenerator()

DEFAULT_APPLIANCES = {"快煮鍋", "平底鍋", "微波爐", "明火瓦斯爐"}

CACHE_TTL_SECONDS = 60
_engine_cache = {'engine': None, 'expires_at': 0.0}

def get_engine() -> RecommendationEngine:
    now = time.time()
    if _engine_cache['engine'] is None or now >= _engine_cache['expires_at']:
        _engine_cache['engine'] = RecommendationEngine(config, storage.list_all())
        _engine_cache['expires_at'] = now + CACHE_TTL_SECONDS
    return _engine_cache['engine']

def invalidate_engine_cache() -> None:
    _engine_cache['engine'] = None
    _engine_cache['expires_at'] = 0.0

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
        
        result = get_engine().get_recommendations(user, ingredients)
        
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

@app.route('/appliance/add', methods=['POST'])
def add_appliance():
    try:
        data = request.json or {}
        appliance = str(data.get('appliance', '')).strip()
        if not appliance:
            return jsonify({"error": "請提供廚具名稱", "added": 0}), 400

        # Skip generation if the appliance is part of the default set.
        if appliance in DEFAULT_APPLIANCES:
            return jsonify({
                "appliance": appliance,
                "added": 0,
                "skipped": True,
                "message": "此廚具已是預設選項，無需追加菜譜。"
            })

        # Avoid duplicate generation if recipes already exist for this appliance.
        existing = [
            r for r in storage.list_all()
            if appliance in (r.get('required_appliances') or [])
        ]
        if existing:
            return jsonify({
                "appliance": appliance,
                "added": 0,
                "skipped": True,
                "message": f"資料庫中已有 {len(existing)} 道使用「{appliance}」的菜譜。"
            })

        try:
            generated = recipe_generator.generate_for_appliance(appliance, count=3)
        except RuntimeError as e:
            return jsonify({"error": str(e), "added": 0}), 500
        except Exception as e:
            return jsonify({"error": f"產生菜譜時發生錯誤：{e}", "added": 0}), 500

        added_names = []
        for recipe in generated:
            try:
                storage.add(recipe)
                added_names.append(recipe['name'])
            except Exception:
                # If a unique-name conflict or other DB error happens, skip silently.
                continue

        if added_names:
            invalidate_engine_cache()

        return jsonify({
            "appliance": appliance,
            "added": len(added_names),
            "recipes": added_names,
        })
    except Exception as e:
        return jsonify({"error": str(e), "added": 0}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5002)
