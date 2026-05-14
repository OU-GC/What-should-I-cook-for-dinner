"""Unsplash API client for fetching recipe images.

Reads UNSPLASH_ACCESS_KEY from env. Returns None on any failure so callers
can fall back gracefully (image is optional, not load-bearing).
"""
import json
import os
import urllib.parse
import urllib.request
from functools import lru_cache
from typing import Optional, Dict, Any


_API_BASE = "https://api.unsplash.com"
_TIMEOUT = 3.0
_THUMB_PARAMS = "&w=600&h=400&fit=crop&q=80"


class UnsplashClient:
    def __init__(self, access_key: Optional[str] = None):
        self.access_key = access_key or os.environ.get("UNSPLASH_ACCESS_KEY")

    def search_photo(self, query: str) -> Optional[Dict[str, Any]]:
        """Search Unsplash for the best matching photo for `query`.

        Returns {url, credit: {photographer, photographer_url, photo_url}}
        or None if no result / API not configured / network error.
        """
        if not self.access_key or not query or not query.strip():
            return None
        return _search_cached(self.access_key, query.strip().lower())


@lru_cache(maxsize=256)
def _search_cached(access_key: str, query: str) -> Optional[Dict[str, Any]]:
    params = urllib.parse.urlencode({
        "query": query,
        "per_page": 1,
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
        return None

    results = data.get("results") or []
    if not results:
        return None

    photo = results[0]
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
