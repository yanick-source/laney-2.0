import os
import asyncio
import logging
from typing import List, Optional
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_community.callbacks.manager import get_openai_callback
from langchain_community.utilities.dalle_image_generator import DallEAPIWrapper
from langchain_community.tools.openai_dalle_image_generation.tool import OpenAIDALLEImageGenerationTool

from app.config import OPENAI_API_KEY

logger = logging.getLogger("gunicorn.error")

# Initialize the LLM
llm_engine = ChatOpenAI(
    temperature=1.2,
    openai_api_key=OPENAI_API_KEY,
    model_name="gpt-4o-mini",
)

# Configure DALL-E API Wrapper
dalle = DallEAPIWrapper(
    model="dall-e-3",
    size="1024x1024",
    quality="standard",
    n=1
)
dalle_tool = OpenAIDALLEImageGenerationTool(api_wrapper=dalle)

dalle_cost = 0.08 # DALL·E 3 * Standard * 1024x1024

class BackgroundColor(BaseModel):
    bg_color: str = Field(
        None,
        description="The background color for the photo book. This can be a solid color or a gradient."
    )

class BackgroundDetails(BaseModel):
    is_color_generation: bool = Field(
        None,
        description="Determines whether the background generation is for a color (True) or an image (False). This value is required and highly depends on the theme and user input.",
    )
    title: str = Field(
        ...,
        description="A short 4-8 word title describing the photo book background. This title is required and should be inspired by the theme and user input, capturing the essence of the design.",
        example="Vibrant Sunset Gradient"
    )

class BackgroundState(BaseModel):
    theme: str = ""
    title: str = ""
    user_input: str = ""
    bg_image: str = ""
    bg_color: str = ""
    is_color_generation: bool = False

def get_photo_book_chain(llm_engine, prompt, output_model):
    parser = PydanticOutputParser(pydantic_object=output_model)
    system_message = SystemMessage(content=f"{parser.get_format_instructions()}\n\n{prompt}")
    prompt_tmpl = ChatPromptTemplate.from_messages([system_message])
    return prompt_tmpl | llm_engine | parser

async def generate_image(prompt: str) -> str:
    url = await dalle_tool.arun(prompt)
    return url

# Decision node
async def decision_node(state: BackgroundState):
    prompt = """You are a photo book assistant. Your task is to decide whether to generate a **background image** or a **background color** based on the provided User Input. Follow these guidelines:

    **Input**:
    - Theme: {theme}
    - User Input: {user_input}
    
    **Decision Rules**:
    1. If the User Input suggests a complex, detailed, or visually rich composition, set `is_color_generation` to **False** (generate an image).
    2. If the User Input is minimalistic, abstract, or focused on specific colors, set `is_color_generation` to **True** (generate a color).
    3. Always analyze the **User Input** before deciding, ensuring the choice aligns with the context.

    **Output**:
    - `is_color_generation`: A boolean value (True for color, False for image).
    - `title`: Generate a short, 4-8 word title inspired by the Theme and User Input, capturing the essence of the background design with a touch of creativity and randomness. The title should feel evocative, intriguing, and slightly unexpected.""".format(theme=state.theme, user_input=state.user_input)

    pb_chain = get_photo_book_chain(llm_engine, prompt, BackgroundDetails)
    output = await pb_chain.ainvoke({
        "theme": state.theme,
        "user_input": state.user_input,
    })
    return {'title': output.title, "is_color_generation": output.is_color_generation}

# Assistant node for image generation
async def image_generation_node(state: BackgroundState):
    prompt = """Create a seamless, high-quality background image that enhances the {theme} without overpowering its content.
    - **Minimal & Elegant:** Soft gradients and neutral tones.
    - **No Distractions:** Avoid distinct objects, busy patterns, or harsh contrasts.
    - **Subtle Depth:** Use light and shadow to create a smooth, immersive feel.
    - **Balanced Composition:** Add faint design accents on edges to maintain cohesion.
    - **Full-Screen Integration:** Include subtle design elements on the **corners and side panels** for a seamless, polished look.
    - **Versatile & Adaptive:** Must complement various album elements effortlessly.
    - **User input:** {user_input}""".format(theme=state.theme, user_input=state.user_input)
    url = await generate_image(prompt)
    return {"bg_image": url}

# Assistant node for color generation
async def color_generation_node(state: BackgroundState):
    prompt = """Generate a creative and visually appealing photo book page background color based on the provided theme and user input:

   **Background Color (`bg_color`)**:
   - Dynamically generate a `bg_color` that aligns with the theme: **{theme}** and user input: **{user_input}**, ensuring a balance between aesthetics and storytelling.
   - Use a mix of **solid colors** and **gradients** to add depth and uniqueness.
   - Randomly explore different gradient styles, including **Radial, Angular, Diamond, Mesh, Shape Blur, Linear, and Freeform Multiple**, selecting the one that best enhances the visual flow of the page.
   - Suggest complementary or contrasting tones to elevate the theme, making the background feel immersive and engaging without overpowering the foreground content.
   - If gradients are used, blend colors smoothly with artistic transitions, ensuring a natural and seamless design.
   - Inject high creativity and extreme randomness into the generation process, ensuring each output is unique, unpredictable, and visually diverse.
   - Adapt the color scheme dynamically to fit various lighting conditions, moods, and tones inspired by **{theme}** and **{user_input}**.  """.format(theme=state.theme, user_input=state.user_input)

    pb_chain = get_photo_book_chain(llm_engine, prompt, BackgroundColor)
    output = await pb_chain.ainvoke({
        "theme": state.theme,
        "user_input": state.user_input,
    })
    return {'bg_color': output.bg_color}


# Build the graph
builder = StateGraph(BackgroundState)

# Define nodes: these do the work
builder.add_node("decision", decision_node)
builder.add_node("image_generation", image_generation_node)
builder.add_node("color_generation", color_generation_node)

# Define edges: these determine how the control flow moves
builder.add_edge(START, "decision")
builder.add_conditional_edges(
    "decision",
    lambda state: "color_generation" if state.is_color_generation else "image_generation",
)
builder.add_edge("image_generation", END)
builder.add_edge("color_generation", END)

react_graph = builder.compile()


async def get_theme_bg_style(theme, user_input):
    logger.info(f"BG Style: Generating theme for prompt: {theme}, {user_input}")
    initial_state = BackgroundState(theme=theme, user_input=user_input)
    with get_openai_callback() as cb:
        tasks = [
            react_graph.ainvoke(initial_state),
            react_graph.ainvoke(initial_state)
        ]
        results = await asyncio.gather(*tasks)

        total_requests = cb.successful_requests + (0 if results[0].get('is_color_generation') else 2)
        total_cost = cb.total_cost + (0 if results[0].get('is_color_generation') else dalle_cost)
        total_tokens_used = cb.total_tokens

    logger.info(f"BG Style: result: {results}")
    return results, total_requests, total_cost, total_tokens_used
