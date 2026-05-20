"""Unsplash API client for fetching recipe images.

Reads UNSPLASH_ACCESS_KEY from env. Returns None on any failure so callers
can fall back gracefully (image is optional, not load-bearing).
"""
import json
import os
import urllib.parse
import urllib.request
from typing import Optional, Dict, Any, List


_API_BASE = "https://api.unsplash.com"
_TIMEOUT = 3.0
_THUMB_PARAMS = "&w=600&h=400&fit=crop&q=80"
_PER_PAGE = 5


class UnsplashClient:
    def __init__(self, access_key: Optional[str] = None):
        self.access_key = access_key or os.environ.get("UNSPLASH_ACCESS_KEY")

    def search_photo(self, query: str) -> Optional[Dict[str, Any]]:
        """Search Unsplash and pick the photo whose description best matches `query`.

        Returns {url, credit: {photographer, photographer_url, photo_url}}
        or None if no result / API not configured / network error.
        """
        if not self.access_key or not query or not query.strip():
            return None
        q = query.strip().lower()
        results = _fetch_results(self.access_key, q)
        if not results:
            return None
        photo = _pick_best(results, q)
        return _format_photo(photo)


def _fetch_results(access_key: str, query: str) -> List[Dict[str, Any]]:
    params = urllib.parse.urlencode({
        "query": query,
        "per_page": _PER_PAGE,
        "orientation": "landscape",
        "content_filter": "high",
    })
    url = f"{_API_BASE}/search/photos?{params}"
    req = urllib.request.Request(url, headers={
        "Authorization": f"Client-ID {access_key}",
        "Accept-Version": "v1",
    })
    try:
        with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"[unsplash] search failed for '{query}': {e}")
        return []
    return data.get("results") or []


def _pick_best(results: List[Dict[str, Any]], query: str) -> Dict[str, Any]:
    """Re-rank results by counting how many query keywords appear in each
    photo's alt_description / description / tag titles. Falls back to the
    first result on ties or when no descriptions are available.
    """
    keywords = [w for w in query.split() if len(w) > 2]
    if not keywords:
        return results[0]

    def score(photo: Dict[str, Any]) -> int:
        haystack_parts = [
            photo.get("alt_description") or "",
            photo.get("description") or "",
        ]
        for tag in photo.get("tags") or []:
            if isinstance(tag, dict):
                haystack_parts.append(tag.get("title") or "")
        haystack = " ".join(haystack_parts).lower()
        return sum(1 for kw in keywords if kw in haystack)

    scored = [(score(p), idx, p) for idx, p in enumerate(results)]
    scored.sort(key=lambda t: (-t[0], t[1]))
    return scored[0][2]


def _format_photo(photo: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    raw_url = (photo.get("urls") or {}).get("raw")
    if not raw_url:
        return None
    user = photo.get("user") or {}
    user_links = user.get("links") or {}
    photo_links = photo.get("links") or {}
    return {
        "url": raw_url + _THUMB_PARAMS,
        "credit": {
            "photographer": user.get("name") or "",
            "photographer_url": user_links.get("html") or "",
            "photo_url": photo_links.get("html") or "",
        },
    }
