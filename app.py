from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import base64
import os
from typing import Optional
import asyncio
from pydantic import BaseModel
import io
import google.genai as genai
from google.genai import types
from dotenv import load_dotenv
from PIL import Image

# Load environment variables
load_dotenv()

app = FastAPI()

# Add CORS middleware to allow frontend to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:3008", "http://127.0.0.1:3001", "http://127.0.0.1:3008", "http://localhost:7002", "http://127.0.0.1:7002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global client variable
client = None

# Initialize Gemini AI
def init_gemini():
    global client
    try:
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            print("Warning: GOOGLE_API_KEY not found in environment variables")
            return False
            
        print("Initializing Google AI Studio (Gemini) with new SDK...")
        client = genai.Client(api_key=api_key)
        return True
    except Exception as e:
        print(f"Error initializing Gemini: {e}")
        return False


@app.on_event("startup")
async def startup_event():
    init_gemini()


# Function to compress image size
def compress_image(image_data, max_size=(800, 800), quality=85):
    """Compress image to reduce size while maintaining reasonable quality"""
    try:
        # Open image from bytes
        img = Image.open(io.BytesIO(image_data))
        
        # Calculate new size while maintaining aspect ratio
        img.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        # Convert to RGB if image has alpha channel to ensure JPEG compatibility
        if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3] if img.mode == 'RGBA' else None)
            img = background
        
        # Save compressed image to bytes
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=quality, optimize=True)
        output.seek(0)
        
        print(f"Image compressed from {len(image_data)} bytes to {len(output.getvalue())} bytes")
        return output.getvalue(), 'image/jpeg'
    except Exception as e:
        print(f"Error compressing image: {e}")
        # Return original image if compression fails
        return image_data, None


@app.post("/analyze-image")
async def analyze_image(
    image: UploadFile = File(None),
    prompt: str = Form(None),
    system_instructions: str = Form(...),
    history: str = Form(None),
):
    """
    Endpoint to analyze an image using Google AI Studio Gemini with custom system instructions
    """
    global client
    try:
        if not client:
            if not init_gemini():
                return {"error": "Gemini client not initialized"}
        try:
            print("Using Gemini 2.0 Flash Experimental model...")
            
            # Initialize contents list
            contents_list = []
            
            # Process history if provided
            if history:
                try:
                    import json
                    history_data = json.loads(history)
                    print(f"Processing {len(history_data)} history messages")
                    roles_trace = []
                    
                    for msg in history_data:
                        role = "user" if msg.get('isUser') else "model"
                        roles_trace.append(role)
                        parts = []
                        
                        # Add text content
                        if msg.get('content'):
                            parts.append(types.Part.from_text(text=msg['content']))
                            
                        # Add image content from history (base64)
                        if msg.get('image'):
                            try:
                                # Format is usually "data:image/jpeg;base64,..."
                                img_str = msg['image']
                                if "base64," in img_str:
                                    header, encoded = img_str.split("base64,", 1)
                                    mime_type = header.split(":")[1].split(";")[0]
                                    img_data = base64.b64decode(encoded)
                                    parts.append(types.Part.from_bytes(data=img_data, mime_type=mime_type))
                            except Exception as img_err:
                                print(f"Error processing history image: {img_err}")
                        
                        if parts:
                            contents_list.append(types.Content(role=role, parts=parts))
                            
                except Exception as e:
                    print(f"Error parsing history: {e}")
            
            if 'roles_trace' in locals():
                print(f"History roles: {roles_trace}")

            # User prompt (default if empty)
            user_prompt = prompt if prompt else "Analyze this image."
            
            current_parts = [types.Part.from_text(text=user_prompt)]
            
            if image:
                # Read the image file
                contents = await image.read()
                
                # Compress the image to reduce token usage
                compressed_image, mime_type = compress_image(contents)
                if not mime_type:
                    mime_type = image.content_type

                # Prepare content for the new SDK
                pil_image = Image.open(io.BytesIO(compressed_image))
                pil_image.load() # Ensure image data is loaded
                
                print(f"Image details - Size: {pil_image.size}, Mode: {pil_image.mode}, Format: {pil_image.format}")
                
                # Convert PIL image to bytes for the API part
                img_byte_arr = io.BytesIO()
                pil_image.save(img_byte_arr, format='JPEG')
                img_bytes = img_byte_arr.getvalue()
                
                current_parts.append(types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg"))
            
            # Add current message to contents
            contents_list.append(types.Content(role="user", parts=current_parts))
            
            print(f"System Instructions (Persona): {system_instructions[:50]}...")
            print(f"User Prompt: {user_prompt}")
            print(f"Total messages sent to Gemini: {len(contents_list)}")
            
            print("Calling Google AI Studio API (New SDK)...")

            response = client.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=contents_list,
                config=types.GenerateContentConfig(
                    system_instruction=system_instructions,
                    max_output_tokens=2048,
                    temperature=0.2,
                    top_p=0.95,
                )
            )
            
            print("Successfully received response from Gemini")
            
            if response.text:
                return {"response": response.text}
            else:
                return {
                    "response": "The model couldn't generate a proper analysis for this image.",
                    "raw_response_available": False
                }
                
        except Exception as api_error:
            print(f"Gemini API Error: {api_error}")
            import traceback
            traceback_str = traceback.format_exc()
            print(f"Traceback: {traceback_str}")
            return {"error": f"Gemini API Error: {str(api_error)}", "traceback": traceback_str}
            
    except Exception as e:
        print(f"General Error: {e}")
        import traceback
        traceback_str = traceback.format_exc()
        print(f"Traceback: {traceback_str}")
        return {"error": f"General Error: {str(e)}", "traceback": traceback_str}


@app.get("/test")
async def test_endpoint():
    """Test endpoint that doesn't use Vertex AI"""
    return {"message": "Test endpoint works! Backend is running correctly."}


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Natarajan Backend is running. Go to /docs for API documentation."}


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=7001, reload=True) 