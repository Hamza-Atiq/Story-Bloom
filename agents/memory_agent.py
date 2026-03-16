"""
Manages story sessions in memory.
"""
from typing import Dict, Optional
from models.story_models import SessionMemory
from config import MAX_HISTORY_TURNS

_sessions: Dict[str, SessionMemory] = {}


def create_session(
    session_id: str,
    hero_name: str,
    world_name: str,
    genre: str,
    animal: Optional[str] = None,
) -> SessionMemory:
    session = SessionMemory(
        session_id=session_id,
        hero_name=hero_name,
        world_name=world_name,
        genre=genre,
        animal=animal,
    )
    _sessions[session_id] = session
    return session


def get_session(session_id: str) -> Optional[SessionMemory]:
    return _sessions.get(session_id)


def update_last_image_prompt(session_id: str, image_prompt: str) -> None:
    session = _sessions.get(session_id)
    if session:
        session.last_image_prompt = image_prompt


def add_to_history(session_id: str, role: str, content: str) -> None:
    session = _sessions.get(session_id)
    if not session:
        return
    session.history.append({"role": role, "content": content})
    max_entries = MAX_HISTORY_TURNS * 3
    if len(session.history) > max_entries:
        session.history = session.history[-max_entries:]


def increment_scene(session_id: str) -> None:
    session = _sessions.get(session_id)
    if session:
        session.scene_number += 1


def get_history_text(session_id: str) -> str:
    session = _sessions.get(session_id)
    if not session or not session.history:
        return "This is the very beginning of the story."
    lines = []
    for entry in session.history:
        if entry["role"] == "user":
            lines.append(f"Child chose: {entry['content']}")
        else:
            lines.append(f"Story: {entry['content'][:300]}...")
    return "\n".join(lines)
