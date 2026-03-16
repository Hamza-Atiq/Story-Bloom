"""
download_sounds.py
------------------
Downloads real animal sound recordings from Wikimedia Commons
into frontend/public/sounds/ for offline / faster playback.

OPTIONAL — the app already plays sounds directly from Wikimedia Commons
in the browser. Run this script only if you want to cache them locally
(e.g. for offline use or faster load times).

Run once:
    python download_sounds.py

Wikimedia Commons sounds are public domain / CC licensed.
Files are saved as OGG (natively supported by all modern browsers).
"""

import os
import time
import requests
from pathlib import Path

OUTPUT_DIR = Path("frontend/public/sounds")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Each entry: animal_id → list of Wikimedia Commons filenames to try (in order)
# If the first one fails, the script tries the next one.
ANIMAL_SOUNDS = {
    "cow":      ["Cattle_lowing.ogg", "Cattle-moo.ogg", "Moo.ogg"],
    "goat":     ["Domestic_Goat_Bleating.ogg", "Goat_Maaing.ogg", "Goat_sound.ogg"],
    "hen":      ["Chicken_cluck.ogg", "Domestic_chicken_sound.ogg", "Rooster_crowing.ogg"],
    "duck":     ["Mallard_duck_quacking.ogg", "Duck_quacking.ogg", "Duck_sound.ogg"],
    "horse":    ["Cheval.ogg", "Horse_sound.ogg", "Neighing_horses.ogg"],
    "sheep":    ["Sheep_sound.ogg", "Sheep_bleating.ogg", "Ovine_sound.ogg"],
    "pig":      ["Pig_squeal.ogg", "Pig_grunting.ogg", "Sus_scrofa_sound.ogg"],
    "lion":     ["Lion_waiting_in_Namibia.ogg", "Lion_roaring.ogg", "Panthera_leo_roar.ogg"],
    "elephant": ["African_elephant_trumpet.ogg", "Elephant_trumpet.ogg", "Loxodonta_sound.ogg"],
    "monkey":   ["Howler_Monkey.ogg", "Monkey_sound.ogg", "Primate_call.ogg"],
    "rabbit":   ["Rabbit_sound.ogg", "Oryctolagus_cuniculus.ogg"],
    "frog":     ["Frog_Rana_cameranoi_chirp.ogg", "Frog_croaking.ogg", "Frog_sound.ogg"],
    "cat":      ["Cat_meow_2.ogg", "Domestic_cat_sound.ogg", "Meow.ogg"],
    "dog":      ["Dog_barking_(Canis_lupus_familiaris).ogg", "Dog_bark.ogg", "Bark.ogg"],
    "parrot":   ["African_grey_parrot.ogg", "Parrot_sound.ogg", "Psittacus_sound.ogg"],
    "owl":      ["Barn_Owl_2.ogg", "Owl_sound.ogg", "Strix_aluco_sound.ogg"],
    "penguin":  ["Penguin_sound.ogg", "Spheniscus_sound.ogg"],
    "deer":     ["Red_deer_rut_roar.ogg", "Deer_sound.ogg", "Cervus_elaphus_sound.ogg"],
}

WIKIMEDIA_BASE = "https://upload.wikimedia.org/wikipedia/commons"
COMMONS_API    = "https://commons.wikimedia.org/w/api.php"

HEADERS = {"User-Agent": "StoryBloom/1.0 (hackathon project; contact via GitHub)"}


def get_wikimedia_url(filename: str) -> str | None:
    """Resolve a Wikimedia Commons filename to its CDN URL via the API."""
    params = {
        "action": "query",
        "titles": f"File:{filename}",
        "prop": "imageinfo",
        "iiprop": "url",
        "format": "json",
    }
    try:
        r = requests.get(COMMONS_API, params=params, headers=HEADERS, timeout=10)
        r.raise_for_status()
        pages = r.json().get("query", {}).get("pages", {})
        for page in pages.values():
            info = page.get("imageinfo", [])
            if info:
                return info[0]["url"]
    except Exception as e:
        print(f"    API lookup failed for {filename}: {e}")
    return None


def search_wikimedia_audio(animal_name: str) -> str | None:
    """Search Wikimedia Commons for an audio file matching the animal."""
    params = {
        "action": "query",
        "list": "search",
        "srsearch": f"{animal_name} sound filetype:ogg",
        "srnamespace": "6",
        "srlimit": "10",
        "format": "json",
    }
    try:
        r = requests.get(COMMONS_API, params=params, headers=HEADERS, timeout=10)
        r.raise_for_status()
        results = r.json().get("query", {}).get("search", [])
        for result in results:
            title = result["title"]  # e.g. "File:Cat_meow_2.ogg"
            if title.lower().endswith((".ogg", ".mp3")):
                url = get_wikimedia_url(title.replace("File:", ""))
                if url:
                    return url
    except Exception as e:
        print(f"    Search failed for {animal_name}: {e}")
    return None


def download_file(url: str, dest: Path) -> bool:
    """Download a file from url to dest. Returns True on success."""
    try:
        r = requests.get(url, headers=HEADERS, timeout=30, stream=True)
        r.raise_for_status()
        dest.write_bytes(r.content)
        size_kb = len(r.content) // 1024
        print(f"    [OK] Saved {dest.name} ({size_kb} KB)")
        return True
    except Exception as e:
        print(f"    [FAIL] Download failed: {e}")
        if dest.exists():
            dest.unlink()
        return False


def main():
    print(f"\nDownloading animal sounds to {OUTPUT_DIR}/\n")
    success, skipped, failed = [], [], []

    for animal_id, filenames in ANIMAL_SOUNDS.items():
        dest = OUTPUT_DIR / f"{animal_id}.ogg"

        if dest.exists():
            print(f"[SKIP] {animal_id:10s} - already exists")
            skipped.append(animal_id)
            continue

        print(f"[SEARCH] {animal_id:10s} ...")
        downloaded = False

        # Try each known filename first
        for filename in filenames:
            url = get_wikimedia_url(filename)
            if url:
                print(f"    Trying: {filename}")
                if download_file(url, dest):
                    success.append(animal_id)
                    downloaded = True
                    break
            time.sleep(0.3)  # be polite to Wikimedia API

        # If nothing worked, fall back to a search query
        if not downloaded:
            print(f"    Falling back to search for '{animal_id}'...")
            url = search_wikimedia_audio(animal_id)
            if url and download_file(url, dest):
                success.append(animal_id)
                downloaded = True

        if not downloaded:
            print(f"    [WARN] Could not find sound for {animal_id} - will use voice fallback")
            failed.append(animal_id)

        time.sleep(0.5)  # rate limit

    print(f"\n{'-'*50}")
    print(f"[OK]   Downloaded : {len(success)} - {success}")
    print(f"[SKIP] Skipped    : {len(skipped)} (already existed)")
    if failed:
        print(f"[WARN] Missing    : {len(failed)} - app will use voice for these: {failed}")
    print(f"\nDone! Sounds saved to {OUTPUT_DIR}/")
    print("Restart your Next.js app and real animal sounds will play.\n")


if __name__ == "__main__":
    main()
