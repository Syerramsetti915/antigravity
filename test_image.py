import os
from google import genai
from PIL import Image
from dotenv import load_dotenv
import io

# Load env
load_dotenv()

api_key = os.environ.get("GOOGLE_API_KEY")
if not api_key:
    print("Error: GOOGLE_API_KEY not found.")
    exit(1)

client = genai.Client(api_key=api_key)

from google.genai import types

# ... imports ...

# ... client init ...

# Create a simple test image (red square)
img = Image.new('RGB', (100, 100), color = 'red')
print("Created test image (Red Square)")

def test_model(model_name):
    try:
        print(f"\nTesting with model: {model_name}")
        
        # Convert image to bytes for the API if needed, or let SDK handle PIL
        # The SDK usually handles PIL images in types.Part.from_image or similar, 
        # but let's use the most robust way: bytes
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='JPEG')
        img_bytes = img_byte_arr.getvalue()

        response = client.models.generate_content(
            model=model_name,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_text(text="What color is this image?"),
                        types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg")
                    ]
                )
            ]
        )
        print("Response:")
        print(response.text)
    except Exception as e:
        print(f"Error with {model_name}: {e}")

test_model("gemini-2.0-flash")
test_model("gemini-1.5-flash")
