story_memory = {}

def get_memory(session_id: str) -> str:
    return story_memory.get(session_id, [])

def update_memory(session_id: str, event: str) -> None:
    if session_id not in story_memory:
        story_memory[session_id] = []
    story_memory[session_id].append(event)