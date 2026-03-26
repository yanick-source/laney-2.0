import time
import base64
import asyncio
import aiohttp
import logging
import operator
from io import BytesIO
from datetime import datetime
from pydantic import BaseModel
from PIL import Image, ImageOps
from typing import List, Annotated
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END

from app.config import OPENAI_API_KEY
from . import prompt_template as im_prompt

# Initialize logger
logger = logging.getLogger("gunicorn.error")

# LLM initialization
llm_engine = ChatOpenAI(
    temperature=0.2,
    openai_api_key=OPENAI_API_KEY,
    model_name="gpt-4o-mini",
)

class PageState(BaseModel):
    theme: str = ""
    page_size: str = ""
    layout_width: int = 2048
    layout_height:int = 2048
    images: List[dict] = []
    pages: Annotated[List[dict], operator.add] = []


    def get_scale_down_based_layout(self, img_width, img_height):
        # Scale down based on height if needed
        if img_height > self.layout_height:
            scale_factor = self.layout_height / img_height
            img_width = int(img_width * scale_factor)
            img_height = int(img_height * scale_factor)

        # Scale down based on width if needed
        if img_width > self.layout_width:
            scale_factor = self.layout_width / img_width
            img_width = int(img_width * scale_factor)
            img_height = int(img_height * scale_factor)

        return img_width, img_height

    async def process_images_async(self):
        """Process all images asynchronously."""
        start_time = time.time()
        logger.info("Node:1 - Starting to process images asynchronously.")
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            for img_data in self.images:
                # Create a task for each image
                task = asyncio.create_task(
                    self._fetch_and_process_image(session, img_data)
                )
                tasks.append(task)

            # Wait for all tasks to complete and collect results
            results = await asyncio.gather(*tasks)
        
        end_time = time.time()
        logger.info(f"Node:1 - Finished processing images asynchronously. Time taken: {end_time - start_time:.2f} seconds")
        return results

    async def _fetch_and_process_image(self, session, img_data):
        """Fetch and process a single image."""
        try:
            # Fetch image content
            async with session.get(img_data['image']) as response:
                if response.status != 200:
                    raise Exception(f"Failed to fetch image: {response.status}")
                content = await response.read()

            # Get file extension from URL
            file_extension = img_data['image'].split('.')[-1].lower()
            img = None
            content_io = BytesIO(content)

            # Handle AVIF format
            if file_extension == 'avif':
                try:
                    import av
                    # PyAV can work with BytesIO objects
                    container = av.open(content_io)
                    frame = next(container.decode(video=0))
                    img_array = frame.to_ndarray(format='rgb24')
                    img = Image.fromarray(img_array)
                    logger.info(f"Successfully converted AVIF: {img_data['image']}")
                except Exception as e:
                    logger.error(f"Failed to process AVIF image: {str(e)}")
                    raise

            # Handle HEIC/HEIF format
            elif file_extension in ['heic', 'heif']:
                try:
                    import pillow_heif
                    pillow_heif.register_heif_opener()

                    # Unfortunately, pillow_heif requires a file path for some operations
                    # We'll use a temporary in-memory solution with BytesIO when possible
                    try:
                        # Try direct BytesIO approach first
                        img = Image.open(content_io)
                    except Exception:
                        # If BytesIO approach fails, we'll need to use the memory plugin of pillow_heif
                        heif_container = pillow_heif.read_heif(content)
                        image = heif_container[0]
                        img = Image.frombytes(
                            mode=image.mode,
                            size=(image.size[0], image.size[1]),
                            data=image.data,
                        )

                    logger.info(f"Successfully opened HEIC/HEIF: {img_data['image']}")
                except ImportError:
                    logger.error("HEIC/HEIF support requires 'pillow-heif' package")
                    raise
                except Exception as e:
                    logger.error(f"Failed to process HEIC/HEIF image: {str(e)}")
                    raise

            # Handle normal image formats
            else:
                img = Image.open(content_io)

            # Extract EXIF data
            exif_data = img._getexif() if hasattr(img, '_getexif') else None
            img = ImageOps.exif_transpose(img)  # Apply EXIF orientation

            # Get the original dimensions
            original_width, original_height = img.size
            img_data["size"] = self.get_scale_down_based_layout(original_width, original_height)
            logger.info(f"Processed ID:{img_data['id']} | Original: {original_width}x{original_height} | Scaled: {img_data['size']}")

            # Define max_size
            max_size = 1024

            # Check if resizing is necessary
            if original_width > max_size or original_height > max_size:
                # Calculate the scaling factor to maintain the aspect ratio
                scale_factor = min(max_size / original_width, max_size / original_height)

                # Calculate the new dimensions
                new_width = int(original_width * scale_factor)
                new_height = int(original_height * scale_factor)

                # Resize the image
                img = img.resize((new_width, new_height))

            # Convert the image to RGB if it's in RGBA mode
            if img.mode in ('RGBA', 'P', 'LA'):
                img = img.convert('RGB')

            # Convert resized image to base64
            buffer = BytesIO()
            img.save(buffer, format="JPEG")
            img_data["base64_image"] = base64.b64encode(buffer.getvalue()).decode()
            
            # Add datetime
            img_data["datetime"] = exif_data[36867] if exif_data and 36867 in exif_data else None

            # Add location
            img_data["location"] = None
            if exif_data and 34853 in exif_data:
                gps_info = exif_data[34853]
                if gps_info:
                    lat = gps_info[2][0] + gps_info[2][1] / 60 + gps_info[2][2] / 3600
                    lon = gps_info[4][0] + gps_info[4][1] / 60 + gps_info[4][2] / 3600
                    lat = lat * (-1 if gps_info[1] == 'S' else 1)
                    lon = lon * (-1 if gps_info[3] == 'W' else 1)
                    img_data["location"] = f"{lat:.6f}, {lon:.6f}"

        except Exception as e:
            logger.error(f"Node:1 - Error processing image {img_data['image']}: {e}")
            # Set default values in case of error
            img_data["size"] = (2048, 2048)
            img_data["datetime"] = None
            img_data["location"] = None

        return img_data


async def photo_book_data_preprocess_node(state: PageState):
    """Node to preprocess photo book data."""
    start_time = time.time()
    logger.info("Node:1 - Starting photo book data preprocessing.")
    
    await state.process_images_async()
    content_list = [
        item for img_data in state.images for item in [
            {"type": "text", "text": f"ID:{img_data['id']}"},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_data.pop('base64_image')}"}},
        ]
    ]
    original_ids = [rec['id'] for rec in state.images]
    output = await im_prompt.photo_book_data_preprocess_tmpl(llm_engine, state, content_list, original_ids)
    output_dict = {item["id"]: item for item in output}
    images = [{**image, **output_dict[image["id"]]} for image in state.images]
    
    end_time = time.time()
    logger.info(f"Node:1 - Finished photo book data preprocessing. Time taken: {end_time - start_time:.2f} seconds")
    return {"images": images}

async def first_page_process_node(state: PageState):
    """Node to process the first page of the photo book."""
    start_time = time.time()
    logger.info("Node:2 - Starting first page processing.")
    
    # Step 1: Find the first page image (is_cover = True)
    first_page_image = next((image for image in state.images if image['is_cover']), None)

    images_text = " ".join(img['image_text'] for img in state.images)
    content_list = [{"type": "text", "text": images_text}]

    output = await im_prompt.first_page_process_tmpl(llm_engine, state, content_list)

    end_time = time.time()
    logger.info(f"Node:2 - Finished first page processing. Time taken: {end_time - start_time:.2f} seconds")
    return {"pages": [{"page_caption": output.get('photo_book_title', ""),
      "images": [first_page_image],
    }]}

async def photo_book_process_node(state: PageState):
    """Node to process the main content of the photo book."""
    start_time = time.time()
    logger.info("Node:3 - Starting photo book processing.")
    
    non_cover_images = [image for image in state.images if not image['is_cover']]
    last_image = max(non_cover_images, key=lambda image: image['image_quality'])
    remaining_images = [image for image in non_cover_images if image['id'] != last_image['id']]

    original_ids = [img['id'] for img in remaining_images]
    content_list = [{"type": "text", "text": f"ID:{img['id']} , Size: {img['size']}, Text: {img['image_text']}, Datetime: {img['datetime']}, Location: {img['location']}"} for img in remaining_images]
    pages = await im_prompt.photo_book_process_tmpl(llm_engine, state, content_list, original_ids)

    image_ids = {img['id']: img for img in remaining_images}
    for page in pages:
        page['images'] = [image_ids[img_id] for img_id in page.get('images', []) if img_id in image_ids]

    end_time = time.time()
    logger.info(f"Node:3 - Finished photo book processing. Time taken: {end_time - start_time:.2f} seconds")
    return {"pages": pages}

async def last_page_process_node(state: PageState):
    """Node to process the last page of the photo book."""
    start_time = time.time()
    logger.info("Node:4 - Starting last page processing.")
    
    non_cover_images = [image for image in state.images if not image['is_cover']]
    last_image = max(non_cover_images, key=lambda image: image['image_quality'])  

    images_text = " ".join(img['image_text'] for img in state.images)
    content_list = [{"type": "text", "text": images_text}]

    output = await im_prompt.last_page_process_tmpl(llm_engine, state, content_list)
    
    end_time = time.time()
    logger.info(f"Node:4 - Finished last page processing. Time taken: {end_time - start_time:.2f} seconds")
    return {"pages": [{"page_caption": output.get('closing_title', ""),
      "images": [last_image],
    }]}

# Define the graph
workflow = StateGraph(PageState)

# Add nodes to the graph
workflow.add_node("node_1_photo_book_data_preprocess_node", photo_book_data_preprocess_node)
workflow.add_node("node_2_first_page_process_node", first_page_process_node)
workflow.add_node("node_3_photo_book_process_node", photo_book_process_node)
workflow.add_node("node_4_last_page_process_node", last_page_process_node)

# Set the entry point
workflow.add_edge(START, "node_1_photo_book_data_preprocess_node")

# Define the sequence
workflow.add_edge("node_1_photo_book_data_preprocess_node", "node_2_first_page_process_node")
workflow.add_edge("node_1_photo_book_data_preprocess_node", "node_3_photo_book_process_node")
workflow.add_edge("node_1_photo_book_data_preprocess_node", "node_4_last_page_process_node")

# Set the end point
workflow.add_edge("node_2_first_page_process_node", END)
workflow.add_edge("node_3_photo_book_process_node", END)
workflow.add_edge("node_4_last_page_process_node", END)

# Compile the graph
graph = workflow.compile()
#graph.get_graph().draw_mermaid_png(output_file_path="workflow_graph.png")
