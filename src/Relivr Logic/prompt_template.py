import asyncio
import logging
import numpy as np
from typing import List, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from sentence_transformers import SentenceTransformer, util
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.messages import SystemMessage, HumanMessage

# Initialize logger
logger = logging.getLogger("gunicorn.error")

#sentence-transformers Lightweight & fast
st_model = SentenceTransformer('all-MiniLM-L6-v2')

# Model for Node-1 output
class ImageDescription(BaseModel):
    id: int = Field(
        ...,
        description="The unique identifier for the image. This should match the ID from the input data.",
        example=1,
    )
    image_text: str = Field(
        ...,
        description="A concise and meaningful description of the image, capturing events, emotions, and the theme.",
        example="Friends laughing at a sunny park picnic. Joy and friendship.",
    )
    image_quality: int = Field(
        ...,
        description="A quality score for the image, ranging from 0 to 100. Higher scores indicate better quality based on resolution, sharpness, and vibrancy.",
        ge=0,
        le=100,
        example=76,
    )

class PreprocessNodeOutput(BaseModel):
    images: List[ImageDescription] = Field(
        ...,
        description="A list of image descriptions, each containing the image ID, description, and quality score.",
        example=[
            {"id": 2, "image_text": "Calm sunset over mountains. Peace and nature.", "image_quality": 85},
            {"id": 1, "image_text": "Friends laughing at a sunny park picnic. Joy and friendship.", "image_quality": 76},
        ],
    )

# Model for Node-2 output
class FirstPageOutput(BaseModel):
    photo_book_title: str = Field(
        ...,
        description="An engaging and meaningful title for the photo book, capturing the essence of the theme and images in 4–8 words.",
        example="Memories of Joy: A Celebration of Friendship and Nature",
        min_length=10,
        max_length=300,  # Allowing some flexibility in length
    )

# Model for Node-3 output
class Page(BaseModel):
    page_caption: str = Field(
        ...,
        description="A personalized caption for the page, reflecting the theme and the images on the page. Should be 12–16 words long.",
        example="Memories of joy and friendship captured in vibrant moments. A reflection of timeless bonds.",
        min_length=5,
        max_length=300,  # Allowing some flexibility in length
    )
    images: List[int] = Field(
        ...,
        description="A list of image IDs included on this page. Each ID must correspond to an image from the input data.",
        example=[4, 1, 3],
        min_items=1,
        max_items=3,  # Assuming a maximum of 3 images per page
    )

class PhotoBookProcessOutput(BaseModel):
    pages: List[Page] = Field(
        ...,
        description="A list of pages, each containing a caption and a list of image IDs. All image IDs must be included without duplication or omission.",
        example=[
            {
                "page_caption": "Memories of joy and friendship captured in vibrant moments. A reflection of timeless bonds.",
                "images": [3, 1, 2],
            },
            {
                "page_caption": "New adventures await as we explore the unknown, creating stories that will last a lifetime.",
                "images": [6, 7],
            },
        ],
    )

class NewPageCaption(BaseModel):
    page_caption: str = Field(
        ...,
        description="A personalized caption for the page, reflecting the theme and the images on the page. Should be 12–16 words long.",
        example="Memories of joy and friendship captured in vibrant moments. A reflection of timeless bonds.",
        min_length=5,
        max_length=300,  # Allowing some flexibility in length
    )

# Model for Node-4 output
class LastPageOutput(BaseModel):
    closing_title: str = Field(
        ...,
        description="A reflective and concluding title for the photo book, encapsulating the journey in 10–15 words.",
        example="A Heartfelt Conclusion: Celebrating Memories and Stories",
        min_length=10,
        max_length=300,  # Allowing some flexibility in length
    )

def get_photo_book_chain(llm_engine, prompt, content, output_model):
    parser = PydanticOutputParser(pydantic_object=output_model)
    system_message = SystemMessage(content=f"{parser.get_format_instructions()}\n\n{prompt}")
    human_message = HumanMessage(content=content)
    prompt_tmpl = ChatPromptTemplate.from_messages([system_message, human_message])
    return prompt_tmpl | llm_engine | parser


#Node-1
async def photo_book_data_preprocess_tmpl(llm_engine, state, user_content, original_ids, max_retries=3):
    preprocess_node_prompt = """
You are a photo book assistant. Your task is to analyze images and provide the following:

**Ensure ID Consistency**
- Use IDs exactly as provided—do not modify, omit, or duplicate.
- Assign each ID to the `id` field in the output.

**Generate Image Descriptions**
- Write concise, meaningful descriptions for each image based on events, emotions, and the theme: {theme}.
- Update the `image_text` field with a meaningful, concise description.

**Evaluate Image Quality** 
- Score images (0-100) based on **resolution, sharpness, and vibrancy**.
- Store the score in the `image_quality` field.
""".format(theme=state.theme)
    # Split user_content into batches
    batch_size = 8
    batches = [user_content[i:i + batch_size] for i in range(0, len(user_content), batch_size)]

    # Process all batches concurrently
    tasks = []
    for batch in batches:
        pb_chain = get_photo_book_chain(llm_engine, preprocess_node_prompt, batch, PreprocessNodeOutput)
        task = pb_chain.ainvoke({"theme": state.theme})
        tasks.append(task)

    # Wait for all tasks to complete
    all_results = await asyncio.gather(*tasks)
    data = [img for output in all_results for img in output.dict().get('images', [])]
    new_ids = [rec.get('id', 0) for rec in data]
    if sorted(original_ids) != sorted(new_ids) and max_retries:
        max_retries -= 1
        logger.info(f"Node:1 - Error: {data}------{sorted(original_ids)}--{sorted(new_ids)}--{max_retries}")
        return await photo_book_data_preprocess_tmpl(llm_engine, state, user_content, original_ids, max_retries)
    return data

#Node-2
async def first_page_process_tmpl(llm_engine, state, user_content):
    first_page_prompt= """Your task is to create an engaging and meaningful title for a photo book.  

1. Analyze the provided image descriptions to identify key elements, emotions, or stories that reflect the theme: {theme}.  
2. Create a title that captures the essence of the photo book in 4–8 words.
""".format(theme=state.theme)

    pb_chain = get_photo_book_chain(llm_engine, first_page_prompt, user_content, FirstPageOutput)

    output_model = await pb_chain.ainvoke({
        "theme": state.theme,
    })
    return output_model.dict()

async def generate_caption_with_llm(llm_engine, state, prompt):
    """
    Helper function to generate captions using an LLM.
    """
    sys_prompt = """Create personalized captions for each page, reflecting the theme: {theme}, with 12-16 words that complement the images on the page.""".format(theme=state.theme)
    pb_chain = get_photo_book_chain(llm_engine, sys_prompt, prompt, NewPageCaption)

    output = await pb_chain.ainvoke({
        "theme": state.theme,
    })
    return output.page_caption

async def make_even_pages(pages, llm_engine, state):
    """
    Ensures the total number of pages is even by merging or splitting pages.
    Captions are dynamically updated using an LLM.
    """
    # Check if the total number of pages is odd
    if len(pages) % 2 != 0:
        last_page = pages[-1]
        second_last_page = pages[-2] if len(pages) > 1 else None

        # Case 1: Last page has only one image
        if len(last_page["images"]) == 1:
            # Check if second last page exists and has only one image
            if second_last_page and len(second_last_page["images"]) == 1:
                # Merge the last page's image into the second last page
                second_last_page["images"].extend(last_page["images"])
                # Generate a new caption for the merged page using LLM
                merge_prompt = (
                    f"Combine these two captions into one cohesive caption:\n"
                    f"Caption 1: {second_last_page['page_caption']}\n"
                    f"Caption 2: {last_page['page_caption']}"
                )
                second_last_page["page_caption"] = await generate_caption_with_llm(llm_engine, state, merge_prompt)
                pages.pop()  # Remove the last page
            else:
                # Split the second last page if it exists and has more than one image
                if second_last_page and len(second_last_page["images"]) > 1:
                    # Create a new page with the last image of the second last page
                    new_image = second_last_page["images"].pop()
                    # Generate a new caption for the split page using LLM
                    split_prompt = (
                        f"Create a new caption for a page containing the image split from this caption:\n"
                        f"Original Caption: {second_last_page['page_caption']}"
                    )
                    new_caption =  await generate_caption_with_llm(llm_engine, state, split_prompt)
                    new_page = {"page_caption": new_caption, "images": [new_image]}
                    pages.insert(-1, new_page)
                # Keep the last page as it is
        else:
            # Case 2: Last page has more than one image, split it into two pages
            new_image = last_page["images"].pop()
            # Generate a new caption for the split page using LLM
            split_prompt = (
                f"Create a new caption for a page containing the image split from this caption:\n"
                f"Original Caption: {last_page['page_caption']}"
            )
            new_caption = await generate_caption_with_llm(llm_engine, state, split_prompt)
            new_page = {"page_caption": new_caption, "images": [new_image]}
            pages.append(new_page)

    return pages

#Node-3
async def photo_book_process_tmpl(llm_engine, state, user_content, original_ids,  max_retries=3):
    preprocess_node_prompt ="""You are tasked with organizing images into a photo book. Follow these steps:

1. **Reorder Images**: Arrange images by similarity in events, emotions, and theme: {theme}. Use timestamp or geo-location (if available) for better ordering.

2. **Organize Images**:
    - Allocate 1,2 or 3 images per page based on the page size `{layout_width}x{layout_height}`.
    - Review both the page size `{layout_width}x{layout_height}` and image size to determine how many images can be accommodated on each page.
    - Ensure proper consideration of landscape and portrait orientations while creating the page layout.
    - Distribute images efficiently to avoid excessive empty space or overcrowding.

3. **Generate Captions**: Create personalized captions for each page, reflecting the theme: {theme}, with 12-16 words that complement the images on the page.

**Output Requirements:**
- Ensure all images IDs are included exactly once in the output, without duplication or omission, and match the IDs from the input data.
""".format(theme=state.theme, layout_width=state.layout_width, layout_height=state.layout_height)

    # Step 1: Extract the 'Text' field from each record
    texts = [item['text'].split("Text: ")[1].split(", Datetime")[0] for item in user_content]

    # Step 2: Convert the texts into sentence embeddings
    sentence_vectors = st_model.encode(texts)

    # Step 3: Compute similarity and reorder the records
    similarity_matrix = util.cos_sim(sentence_vectors, sentence_vectors)
    reordered_indices = np.argsort(-similarity_matrix.sum(axis=1))  # Sort by total similarity

    # Reorder the user_content based on the similarity scores
    reordered_user_content = [user_content[i] for i in reordered_indices]

    # Split user_content into batches
    batch_size = 6
    batches = [reordered_user_content[i:i + batch_size] for i in range(0, len(reordered_user_content), batch_size)]
    if len(batches[-1]) == 1:
        batches[-2].extend(batches[-1])
        batches.pop()

    # Process all batches concurrently
    tasks = []
    for batch in batches:
        pb_chain = get_photo_book_chain(llm_engine, preprocess_node_prompt, batch, PhotoBookProcessOutput)
        task = pb_chain.ainvoke({
            "theme": state.theme,
            "layout_width": state.layout_width,
            "layout_height": state.layout_height,
        })
        tasks.append(task)

    # Wait for all tasks to complete
    all_results = await asyncio.gather(*tasks)
    pages = [page for output in all_results for page in output.dict().get('pages', [])]
    new_ids = [image for page in pages for image in page.get("images", [])]
    if sorted(original_ids) != sorted(new_ids) and max_retries:
        max_retries -= 1
        logger.info(f"Node:3 - Error: {pages}------{sorted(original_ids)}--{sorted(new_ids)}--{max_retries}")
        return await photo_book_process_tmpl(llm_engine, state, user_content, original_ids, max_retries)
    return await make_even_pages(pages, llm_engine, state)

#Node-4
async def last_page_process_tmpl(llm_engine, state, user_content):
    last_page_prompt= """Your task is to create a meaningful closing title for a photo book.

1. Analyze the provided images and text to identify the key elements and emotions that reflect the theme: {theme}.  
2. Write a reflective and concluding title in 10–15 words that encapsulates the journey of the photo book.
""".format(theme=state.theme)

    pb_chain = get_photo_book_chain(llm_engine, last_page_prompt, user_content, LastPageOutput)

    output_model = await pb_chain.ainvoke({
        "theme":state.theme
    })
    return output_model.dict()
