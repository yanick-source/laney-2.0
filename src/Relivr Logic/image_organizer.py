import time
import aiohttp
import logging
from app.config import  BACKEND_URL
from app.services.graph_workflow import PageState, graph
from langchain_community.callbacks.manager import get_openai_callback

logger = logging.getLogger("gunicorn.error")


class ImageOrganizer:
    def __init__(self, BACKEND_URL):
        self.api_url = BACKEND_URL

    def aspect_ratio(self, width, height):
        return width / height if height else 0

    async def fetch_layouts(self, layout_slot, page_size, primary_front, primary_back):
        # Prepare the base parameters
        params = {
            "layout_slot": layout_slot,
            "page_size__size": page_size,
        }
        # Conditionally add primary_front if it is not None
        if primary_front:
            params["primary_front"] = "true"

        # Conditionally add primary_back if it is not None
        if primary_back:
            params["primary_back"] = "true"

        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.api_url}/api/v1/page-layouts/",
                params=params
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return data['results']
                else:
                    raise Exception(f"Failed to fetch layouts: {response.status}")

    async def find_best_layout(self, image_sizes, page_size='A4', primary_front=False, primary_back=False):
        # Fetch layouts based on layout_slot and page_size
        try:
            layouts = await self.fetch_layouts(len(image_sizes), page_size, primary_front, primary_back)
        except Exception as e:
            logger.error(f"Failed to fetch layouts: {e}")
            return None
        
        # Calculate aspect ratios of the images
        image_aspect_ratios = [self.aspect_ratio(width, height) for width, height in image_sizes]
        
        # Initialize variables to track the best layout
        best_layout_id = None
        min_deviation = float('inf')
        
        for layout in layouts:
            layout_slots = layout['layout']

            # Calculate aspect ratios of the layout slots
            layout_aspect_ratios = [self.aspect_ratio(slot["width"], slot["height"]) for slot in layout_slots]
            
            # Calculate the total deviation between image and layout aspect ratios
            deviation = 0
            for i in range(len(image_aspect_ratios)):
                if image_aspect_ratios[i] >= 1:
                    deviation += image_aspect_ratios[i] - layout_aspect_ratios[i]
                else:
                    deviation += abs(image_aspect_ratios[i] - layout_aspect_ratios[i])

            # Normalize the deviation by dividing by the number of images
            deviation /= len(image_sizes)
            
            # Update the best layout if this layout has a smaller deviation
            if deviation < min_deviation:
                min_deviation = deviation
                best_layout_id = layout['id']
                
                # Break early if a perfect match is found
                if deviation == 0:
                    break
        
        # Return the best layout ID and layout
        return best_layout_id


async def image_organizer(theme, page_size, layout_width, layout_height, images):
    """
    Organizes images into pages based on the provided theme, page size, and layout dimensions.
    Also finds the best layout for each page based on the image sizes.

    Args:
        theme (str): The theme of the photo book.
        page_size (str): The size of the pages (e.g., "A4", "Letter").
        layout_width (int): The width of the layout in pixels.
        layout_height (int): The height of the layout in pixels.
        images (List[dict]): A list of image dictionaries containing image data.

    Returns:
        List[dict]: A list of pages, each containing images and their corresponding layout IDs.
    """
    start_time = time.time()
    logger.info("Starting image organization process....")

    # Initialize the ImageOrganizer with the backend URL
    im_organizer = ImageOrganizer(BACKEND_URL)

    # Create the initial state for the workflow
    initial_state = PageState(
        theme=theme,
        page_size=page_size,
        layout_width=layout_width,
        layout_height=layout_height,
        images=images
    )

    # Execute the graph workflow asynchronously
    logger.info("Invoking the graph workflow to process images.")
    with get_openai_callback() as cb:
        output = await graph.ainvoke(initial_state)
        total_requests = cb.successful_requests
        total_cost = cb.total_cost
        total_tokens_used = cb.total_tokens

    # Process each page to find the best layout for the images
    logger.info("Finding the best layout for each page.")
    pages = output.get('pages', [])
    total_pages = len(pages)

    for index, page in enumerate(pages):
        # Extract image sizes for the current page
        image_sizes = [image.get('size') for image in page["images"]]

        # Determine if current page is first or last
        primary_front = index == 0
        primary_back = index == total_pages - 1

        # Find the best layout for the current page based on image sizes
        best_layout_id = await im_organizer.find_best_layout(image_sizes, page_size=page_size, primary_front=primary_front, primary_back=primary_back)

        # Assign the best layout ID to the page
        page["layout_id"] = best_layout_id
        logger.info(f"Assigned layout ID {best_layout_id} to page with images: {[img['id'] for img in page['images']]}, image sizes:{image_sizes}")

    end_time = time.time()
    logger.info(f"Finished image organization process. Time taken: {end_time - start_time:.2f} seconds")

    # Return the organized pages
    return output.get('pages', []), total_requests, total_cost, total_tokens_used
