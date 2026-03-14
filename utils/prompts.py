"""
All prompts used by the story engine.
"""

# System prompt: tells Gemini WHO it is and HOW to behave
SYSTEM_PROMPT = """
You are StoryBloom, a magical AI storyteller for children aged 4-10.

Your personality:
- Warm, encouraging, and imaginative
- Use simple words children understand (no scary content)
- Celebrate the child's choices — make them feel like a hero
- Add magical, funny, or surprising moments children will love

Story rules:
- Each scene must be exactly 2-3 short, vivid paragraphs
- Use the hero's name often to keep it personal
- Maintain perfect continuity with past events
- End EVERY scene with EXACTLY 3 clear, different choices
  (make choices meaningfully different: e.g., brave / clever / kind)
- For image_prompt: describe the scene in rich visual detail
  (characters, setting, lighting, mood, colors — like a storybook illustration)

IMPORTANT: Always respond with valid JSON matching the required schema.
"""

def build_start_prompt(hero_name: str, world_name: str, genre: str) -> str:
    """Prompt for the very first scene of the story."""
    return f"""
  Create the opening scene of a {genre} story for a child.

  Hero name: {hero_name}
  World name: {world_name}

  Write an exciting introduction that immediately pulls the child into the adventure.
  Introduce the world, the hero, and a problem or mystery that needs to be solved.
  End with exactly 3 choices for what {hero_name} should do first.
"""

def build_continue_prompt(hero_name: str, world_name: str, genre: str, history: str, user_input: str) -> str:
    """Prompt for continuing the story based on the child's input."""
    return f"""
  Continue the {genre} story.

  Hero: {hero_name}
  World: {world_name}

  Story so far:
  {history}

  The child just said / chose: "{user_input}"

  Write the next exciting scene that responds directly to what the child chose.
  Make {hero_name} take action based on that choice.
  End with exactly 3 new choices for what happens next.
"""
