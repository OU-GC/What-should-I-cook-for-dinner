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
        "使用者會給你一項廚房器具，請你發想 3 道適合以該器具製作的家常台灣菜譜。"
        "請只輸出 JSON，符合下列格式："
        "{\n"
        "  \"recipes\": [\n"
        "    {\n"
        "      \"name\": \"菜名\",\n"
        "      \"ingredients\": [\"食材1\", \"食材2\", ...],\n"
        "      \"required_appliances\": [\"廚具名\"],\n"
        "      \"steps\": [\"步驟1\", \"步驟2\", ...],\n"
        "      \"cook_time\": 30\n"
        "    }\n"
        "  ]\n"
        "}\n"
        "規則：\n"
        "1. ingredients 為精簡的主食材列表，使用繁體中文，不要重量單位。\n"
        "2. required_appliances 必須包含使用者提供的廚具名稱。\n"
        "3. steps 為條列式做法，每個步驟一句話。\n"
        "4. cook_time 為整數，單位為分鐘。\n"
        "5. 菜名請貼近台灣家庭用語。"
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
        "      \"cook_time\": 30\n"
        "    }\n"
        "  ]\n"
        "}\n"
        "規則：\n"
        "1. ingredients 為精簡的主食材列表，使用繁體中文，不要重量單位。\n"
        "2. required_appliances 請從常見家用廚具中選擇（例如：平底鍋、快煮鍋、微波爐、明火瓦斯爐、電鍋、烤箱、氣炸鍋）。\n"
        "3. steps 為條列式做法，每個步驟一句話。\n"
        "4. cook_time 為整數，單位為分鐘。\n"
        "5. 菜名請貼近台灣家庭用語。\n"
        "6. 新菜譜的菜名不可與使用者提供的既有菜名重複。"
    )

    def generate_new_recipes(
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
            cleaned.append({
                "name": name,
                "ingredients": ingredients,
                "required_appliances": appliances_list,
                "steps": steps,
                "cook_time": cook_time,
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
            cleaned.append({
                "name": name,
                "ingredients": ingredients,
                "required_appliances": appliances_list,
                "steps": steps,
                "cook_time": cook_time,
            })
        return cleaned
