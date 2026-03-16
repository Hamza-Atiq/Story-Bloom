"""
animal_sound_service.py
-----------------------
Fetches real animal sound recordings from Wikimedia Commons.

Flow:
  1. Search Wikimedia Commons API for an audio file matching the animal
  2. Get the direct CDN URL from the API response
  3. Download the audio bytes (server-side — no CORS issue)
  4. Cache in memory so each animal is only fetched once per server run

This runs server-side, so there are no browser CORS restrictions.
"""
import httpx
from typing import Optional

COMMONS_API = "https://commons.wikimedia.org/w/api.php"
HEADERS = {"User-Agent": "StoryBloom/1.0 (educational children app)"}

# In-memory cache: animal_id → audio bytes
_sound_cache: dict[str, bytes] = {}

# Search terms per animal — ordered from most specific to most generic.
# The service tries each term until it finds a usable OGG file.
ANIMAL_SEARCH_TERMS: dict[str, list[str]] = {
    "cow":      ["cattle lowing moo",     "cow mooing",       "cattle sound"],
    "goat":     ["goat bleating",          "goat maaing",      "domestic goat sound"],
    "hen":      ["chicken clucking",       "hen cluck",        "domestic chicken sound"],
    "duck":     ["duck quacking",          "mallard quack",    "duck sound"],
    "horse":    ["horse neighing",         "horse neigh",      "horse sound"],
    "sheep":    ["sheep bleating",         "sheep baa",        "sheep sound"],
    "pig":      ["pig oink grunting",      "pig squeal",       "swine sound"],
    "lion":     ["lion roaring",           "lion roar",        "panthera leo sound"],
    "elephant": ["elephant trumpet",       "elephant sound",   "african elephant call"],
    "monkey":   ["monkey vocalization",    "howler monkey",    "primate call"],
    "rabbit":   ["rabbit sound",           "rabbit squeak"],
    "frog":     ["frog croaking",          "frog ribbit",      "frog sound"],
    "cat":      ["cat meow",               "domestic cat meow","cat sound"],
    "dog":      ["dog barking",            "dog bark",         "domestic dog sound"],
    "parrot":   ["parrot sound",           "african grey parrot call", "parrot vocalization"],
    "owl":      ["owl hooting",            "barn owl sound",   "owl call"],
    "penguin":  ["penguin sound",          "penguin vocalization"],
    "deer":     ["deer bellow roar",       "red deer rut",     "deer sound"],
}


async def _search_wikimedia(search_term: str) -> Optional[str]:
    """
    Search Wikimedia Commons for an OGG audio file matching search_term.
    Returns the direct CDN download URL, or None if not found or network unavailable.
    """
    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=15.0, follow_redirects=True) as client:
            search_resp = await client.get(COMMONS_API, params={
                "action":      "query",
                "list":        "search",
                "srsearch":    f"{search_term} filetype:ogg",
                "srnamespace": "6",
                "srlimit":     "10",
                "format":      "json",
            })
            search_resp.raise_for_status()
            results = search_resp.json().get("query", {}).get("search", [])

            for result in results:
                title = result.get("title", "")
                if not title.lower().endswith(".ogg"):
                    continue

                info_resp = await client.get(COMMONS_API, params={
                    "action":  "query",
                    "titles":  title,
                    "prop":    "imageinfo",
                    "iiprop":  "url|size",
                    "format":  "json",
                })
                info_resp.raise_for_status()
                pages = info_resp.json().get("query", {}).get("pages", {})
                for page in pages.values():
                    info_list = page.get("imageinfo", [])
                    if info_list:
                        url = info_list[0].get("url")
                        size = info_list[0].get("size", 0)
                        if url and 0 < size < 2_000_000:
                            return url
    except Exception as e:
        print(f"[animal_sound] Network unavailable for search '{search_term}': {e}")

    return None


async def get_animal_sound_bytes(animal_id: str) -> Optional[bytes]:
    """
    Return OGG audio bytes for the given animal_id.
    Uses in-memory cache after first fetch.
    """
    # Return cached result immediately
    if animal_id in _sound_cache:
        return _sound_cache[animal_id]

    search_terms = ANIMAL_SEARCH_TERMS.get(animal_id, [animal_id + " sound"])

    cdn_url: Optional[str] = None
    for term in search_terms:
        cdn_url = await _search_wikimedia(term)
        if cdn_url:
            break

    if not cdn_url:
        print(f"[animal_sound] No Wikimedia audio found for '{animal_id}'")
        return None

    # Download the audio
    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=30.0, follow_redirects=True) as client:
            r = await client.get(cdn_url)
            r.raise_for_status()
            audio_bytes = r.content
            _sound_cache[animal_id] = audio_bytes
            print(f"[animal_sound] Cached {animal_id} ({len(audio_bytes)//1024} KB)")
            return audio_bytes
    except Exception as e:
        print(f"[animal_sound] Download failed for '{animal_id}': {e}")
        return None
    # Note: on machines without internet access, this endpoint returns 503.
    # The frontend falls back to direct browser audio loading as primary method.
