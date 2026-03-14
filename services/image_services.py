"""
Generates story illustrations using Pollinations.ai — completely FREE,
no API key required. 
"""
from urllib.parse import quote


async def generate_image(image_prompt: str) -> str | None:
    """
    Generate a children's storybook illustration using Pollinations.ai.
    """
    try:
        # Truncate prompt — long prompts cause errors on Pollinations.ai
        short_prompt = image_prompt[:200]

        styled_prompt = (
            f"children's storybook illustration, colorful cartoon style, "
            f"safe for kids: {short_prompt}"
        )

        encoded_prompt = quote(styled_prompt)

        return (
            f"https://image.pollinations.ai/prompt/{encoded_prompt}"
            f"?width=800&height=450&nologo=true&model=flux"
        )

    except Exception as e:
        print(f"[image_services] Image generation failed: {e}")
        return None
