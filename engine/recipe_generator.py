import json
import os
from typing import List, Dict, Any, Optional


class RecipeGenerator:
    """
    Uses OpenAI GPT-4o-mini to generate recipes for a given appliance.
    Returns a list of recipe dicts compatible with RecipeStorage.add().
    """

    SYSTEM_PROMPT = (
        "你是一位專業的家庭料理顧問。"
        "使用者會給你一項廚房器具，請你發想 5 道適合以該器具製作的家常台灣菜譜。"
        "請只輸出 JSON，符合下列格式："
        "{\n"
        "  \"recipes\": [\n"
        "    {\n"
        "      \"name\": \"菜名\",\n"
        "      \"ingredients\": [\"食材1\", \"食材2\", ...],\n"
        "      \"required_appliances\": [\"廚具名\"],\n"
        "      \"steps\": [\"步驟1\", \"步驟2\", ...],\n"
        "      \"cook_time\": 30,\n"
        "      \"image_query\": \"english search keywords\"\n"
        "    }\n"
        "  ]\n"
        "}\n"
        "規則：\n"
        "1. ingredients 為精簡的主食材列表，使用繁體中文，不要重量單位。\n"
        "2. required_appliances 必須包含使用者提供的廚具名稱。\n"
        "3. steps 為條列式做法，每個步驟一句話。\n"
        "4. cook_time 為整數，單位為分鐘。\n"
        "5. 菜名請貼近台灣家庭用語。\n"
        "6. image_query 為英文短詞，用於圖庫搜尋這道菜的成品照（例如 \"stir fried cabbage with egg\"），2-5 個字、全小寫、不含標點。"
    )

    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4o-mini"):
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        self.model = model

    def _client(self):
        if not self.api_key:
            raise RuntimeError(
                "OPENAI_API_KEY 未設定，無法呼叫 GPT-4o-mini。請於 .env 中設定 OPENAI_API_KEY。"
            )
        from openai import OpenAI
        return OpenAI(api_key=self.api_key)

    EXPAND_SYSTEM_PROMPT = (
        "你是一位專業的家庭料理顧問。"
        "使用者會給你目前資料庫中已有的菜譜列表，請你依照同樣的資料結構，"
        "發想全新的家常台灣菜譜。"
        "請只輸出 JSON，符合下列格式："
        "{\n"
        "  \"recipes\": [\n"
        "    {\n"
        "      \"name\": \"菜名\",\n"
        "      \"ingredients\": [\"食材1\", \"食材2\", ...],\n"
        "      \"required_appliances\": [\"廚具名\"],\n"
        "      \"steps\": [\"步驟1\", \"步驟2\", ...],\n"
        "      \"cook_time\": 30,\n"
        "      \"image_query\": \"english search keywords\"\n"
        "    }\n"
        "  ]\n"
        "}\n"
        "規則：\n"
        "1. ingredients 為精簡的主食材列表，使用繁體中文，不要重量單位。\n"
        "2. required_appliances 請從常見家用廚具中選擇（例如：平底鍋、快煮鍋、微波爐、明火瓦斯爐、電鍋、烤箱、氣炸鍋）。\n"
        "3. steps 為條列式做法，每個步驟一句話。\n"
        "4. cook_time 為整數，單位為分鐘。\n"
        "5. 菜名請貼近台灣家庭用語。\n"
        "6. 新菜譜的菜名不可與使用者提供的既有菜名重複。\n"
        "7. image_query 為英文短詞，用於圖庫搜尋這道菜的成品照（例如 \"stir fried cabbage with egg\"），2-5 個字、全小寫、不含標點。"
    )

    def generate_from_existing(
        self,
        existing_recipes: List[Dict[str, Any]],
        count: int = 3,
    ) -> List[Dict[str, Any]]:
        client = self._client()

        existing_names = [r.get('name', '') for r in existing_recipes if r.get('name')]
        sample = existing_recipes[:5]
        sample_payload = [
            {
                "name": r.get("name"),
                "ingredients": r.get("ingredients", []),
                "required_appliances": r.get("required_appliances", []),
                "steps": r.get("steps", []),
                "cook_time": r.get("cook_time"),
            }
            for r in sample
        ]
        user_prompt = (
            f"資料庫中已有的菜名（不可重複）：{json.dumps(existing_names, ensure_ascii=False)}\n"
            f"參考既有菜譜結構：{json.dumps(sample_payload, ensure_ascii=False)}\n"
            f"請依照相同的 JSON 結構，生成 {count} 道全新且不重複的家常菜譜。"
        )

        response = client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self.EXPAND_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.9,
        )

        content = response.choices[0].message.content or "{}"
        data = json.loads(content)
        raw_recipes = data.get("recipes", []) if isinstance(data, dict) else []

        existing_lower = {n.strip().lower() for n in existing_names}
        cleaned: List[Dict[str, Any]] = []
        for raw in raw_recipes:
            if not isinstance(raw, dict):
                continue
            name = str(raw.get("name", "")).strip()
            if not name or name.lower() in existing_lower:
                continue
            ingredients = [str(i).strip() for i in raw.get("ingredients", []) if str(i).strip()]
            appliances_list = [str(a).strip() for a in raw.get("required_appliances", []) if str(a).strip()]
            steps = [str(s).strip() for s in raw.get("steps", []) if str(s).strip()]
            try:
                cook_time = int(raw.get("cook_time")) if raw.get("cook_time") is not None else None
            except (TypeError, ValueError):
                cook_time = None
            image_query = str(raw.get("image_query", "")).strip().lower() or None
            cleaned.append({
                "name": name,
                "ingredients": ingredients,
                "required_appliances": appliances_list,
                "steps": steps,
                "cook_time": cook_time,
                "image_query": image_query,
            })
            existing_lower.add(name.lower())
        return cleaned

    IMAGE_QUERY_SYSTEM_PROMPT = (
        "你是一個翻譯助手，會收到中文台灣家常菜名與主要食材，"
        "請輸出每道菜對應的英文圖庫搜尋關鍵字（2-5 個字、全小寫、不含標點），"
        "用於 Unsplash 圖片搜尋這道菜的成品照。\n"
        "請只輸出 JSON，格式為：{\"queries\": {\"中文菜名\": \"english keywords\", ...}}"
    )

    def generate_image_queries(self, recipes: List[Dict[str, Any]]) -> Dict[str, str]:
        """Batch-translate a list of recipes into English image search keywords.

        Input: [{name, ingredients}, ...]
        Returns: {recipe_name: english_query}
        """
        recipes = [r for r in recipes if r.get('name')]
        if not recipes:
            return {}

        client = self._client()
        payload = [
            {"name": r['name'], "ingredients": r.get('ingredients', [])}
            for r in recipes
        ]
        user_prompt = (
            "請為以下每道菜產生英文圖庫搜尋關鍵字：\n"
            + json.dumps(payload, ensure_ascii=False)
        )

        response = client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self.IMAGE_QUERY_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
        )

        content = response.choices[0].message.content or "{}"
        data = json.loads(content)
        raw = data.get("queries", {}) if isinstance(data, dict) else {}
        return {
            str(k): str(v).strip().lower()
            for k, v in raw.items()
            if isinstance(v, str) and v.strip()
        }

    INGREDIENT_SYSTEM_PROMPT = (
        "你是一位專業的家庭料理顧問。"
        "使用者會給你冰箱裡現有的食材清單，請你發想 3 道善用這些食材的家常台灣菜譜。"
        "請只輸出 JSON，符合下列格式："
        "{\n"
        "  \"recipes\": [\n"
        "    {\n"
        "      \"name\": \"菜名\",\n"
        "      \"ingredients\": [\"食材1\", \"食材2\", ...],\n"
        "      \"required_appliances\": [\"廚具名\"],\n"
        "      \"steps\": [\"步驟1\", \"步驟2\", ...],\n"
        "      \"cook_time\": 30,\n"
        "      \"image_query\": \"english search keywords\"\n"
        "    }\n"
        "  ]\n"
        "}\n"
        "規則：\n"
        "1. 每道菜的 ingredients 中，至少要包含使用者提供的食材中的 1-2 樣。\n"
        "2. ingredients 為精簡的主食材列表，使用繁體中文，不要重量單位。\n"
        "3. required_appliances 請從常見家用廚具中選擇（例如：平底鍋、快煮鍋、微波爐、明火瓦斯爐、電鍋、烤箱、氣炸鍋）。\n"
        "4. steps 為條列式做法，每個步驟一句話。\n"
        "5. cook_time 為整數，單位為分鐘。\n"
        "6. 菜名請貼近台灣家庭用語，且不可與使用者提供的既有菜名重複。\n"
        "7. image_query 為英文短詞，用於圖庫搜尋這道菜的成品照（例如 \"stir fried cabbage with egg\"），2-5 個字、全小寫、不含標點。"
    )

    def generate_for_ingredients(
        self,
        ingredients: List[str],
        existing_recipes: List[Dict[str, Any]],
        count: int = 3,
        appliances: List[str] = None,
    ) -> List[Dict[str, Any]]:
        ingredients = [i.strip() for i in (ingredients or []) if i and i.strip()]
        if not ingredients:
            return []

        client = self._client()
        existing_names = [r.get('name', '') for r in existing_recipes if r.get('name')]
        appliances = [a.strip() for a in (appliances or []) if a and a.strip()]
        user_prompt = (
            f"使用者目前擁有的食材：{json.dumps(ingredients, ensure_ascii=False)}\n"
        )
        if appliances:
            user_prompt += (
                f"使用者擁有的廚具：{json.dumps(appliances, ensure_ascii=False)}\n"
                f"每道菜的 required_appliances 只能使用上述廚具，不可使用其他廚具。\n"
            )
        user_prompt += (
            f"資料庫中已有的菜名（不可重複）：{json.dumps(existing_names, ensure_ascii=False)}\n"
            f"請依照規則，生成 {count} 道善用這些食材的家常菜譜。"
        )

        response = client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self.INGREDIENT_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
        )

        content = response.choices[0].message.content or "{}"
        data = json.loads(content)
        raw_recipes = data.get("recipes", []) if isinstance(data, dict) else []

        existing_lower = {n.strip().lower() for n in existing_names}
        cleaned: List[Dict[str, Any]] = []
        for raw in raw_recipes:
            if not isinstance(raw, dict):
                continue
            name = str(raw.get("name", "")).strip()
            if not name or name.lower() in existing_lower:
                continue
            ingredients_list = [str(i).strip() for i in raw.get("ingredients", []) if str(i).strip()]
            appliances_list = [str(a).strip() for a in raw.get("required_appliances", []) if str(a).strip()]
            steps = [str(s).strip() for s in raw.get("steps", []) if str(s).strip()]
            try:
                cook_time = int(raw.get("cook_time")) if raw.get("cook_time") is not None else None
            except (TypeError, ValueError):
                cook_time = None
            image_query = str(raw.get("image_query", "")).strip().lower() or None
            cleaned.append({
                "name": name,
                "ingredients": ingredients_list,
                "required_appliances": appliances_list,
                "steps": steps,
                "cook_time": cook_time,
                "image_query": image_query,
            })
            existing_lower.add(name.lower())
        return cleaned

    def generate_for_appliance(self, appliance: str, count: int = 3) -> List[Dict[str, Any]]:
        appliance = (appliance or "").strip()
        if not appliance:
            return []

        client = self._client()
        user_prompt = f"請為「{appliance}」這項廚具，生成 {count} 道適合的家常菜譜。"

        response = client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.8,
        )

        content = response.choices[0].message.content or "{}"
        data = json.loads(content)
        raw_recipes = data.get("recipes", []) if isinstance(data, dict) else []

        cleaned: List[Dict[str, Any]] = []
        for raw in raw_recipes:
            if not isinstance(raw, dict):
                continue
            name = str(raw.get("name", "")).strip()
            if not name:
                continue
            ingredients = [str(i).strip() for i in raw.get("ingredients", []) if str(i).strip()]
            appliances_list = [str(a).strip() for a in raw.get("required_appliances", []) if str(a).strip()]
            if appliance not in appliances_list:
                appliances_list.append(appliance)
            steps = [str(s).strip() for s in raw.get("steps", []) if str(s).strip()]
            try:
                cook_time = int(raw.get("cook_time")) if raw.get("cook_time") is not None else None
            except (TypeError, ValueError):
                cook_time = None
            image_query = str(raw.get("image_query", "")).strip().lower() or None
            cleaned.append({
                "name": name,
                "ingredients": ingredients,
                "required_appliances": appliances_list,
                "steps": steps,
                "cook_time": cook_time,
                "image_query": image_query,
            })
        return cleaned
