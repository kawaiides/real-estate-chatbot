from fastapi import FastAPI, UploadFile, File, Request, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from google.cloud import vision
import google.generativeai as genai
import tempfile
import os
import getpass
from dotenv import load_dotenv

load_dotenv()

# Set API keys from terminal prompt if not already set
if not os.environ.get("GOOGLE_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = getpass.getpass("Enter your Google Gemini API key: ")
genai.configure(api_key=os.environ["GOOGLE_API_KEY"])

if not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = getpass.getpass("Enter your Google Cloud Vision API key path: ")

# Initialize FastAPI
app = FastAPI()

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Init Vision client
vision_client = vision.ImageAnnotatorClient()

# Init Gemini model
model = genai.GenerativeModel("gemini-1.5-flash")

# Helper functions
def analyze_image(image_path: Optional[str]):
    if not image_path:
        return []
    with open(image_path, "rb") as image_file:
        content = image_file.read()
    image = vision.Image(content=content)
    response = vision_client.label_detection(image=image)
    return [label.description for label in response.label_annotations]

def route_query(text: str) -> str:
    response = model.generate_content([
        "Classify as 'faq' or 'issue'. Respond only with one word.",
        text
    ])
    return response.text.strip().lower()

def handle_agent1(text: str, image_path: Optional[str]) -> str:
    labels = analyze_image(image_path)
    prompt = f"""
    Property Issue Analysis Task:
    User Query: {text}
    Image Labels: {', '.join(labels) if labels else 'No image provided'}
    
    Identify potential property issues and provide:
    1. Problem diagnosis
    2. Recommended solutions
    3. Suggested professionals to contact

    Example Interaction:
    User: “What’s wrong with this wall?” (User uploads image)
    Agent 1: “It appears there is mould growth near the ceiling. This might be due to high
    humidity or a leak. I recommend checking for water seepage and using a dehumidifier.”
    """
    response = model.generate_content(prompt)
    return response.text

def handle_agent2(query: str) -> str:
    prompt = f"""
    Tenancy Law Expert Response:
    Question: {query}
    
    Provide detailed answer considering:
    - Standard tenancy laws
    - Landlord/tenant responsibilities
    - Location-specific variations (ask for location if needed)
    - Practical resolution steps

    User: “Can my landlord evict me without notice?”
    Agent 2: “In most jurisdictions, landlords must give written notice before
    eviction, unless it’s an emergency situation like non-payment or illegal activity.
    Please let me know your city or region for more accurate info.”
    """
    response = model.generate_content(prompt)
    return response.text

# Endpoint with optional image and flexible input
@app.post("/api/chat")
async def chat_endpoint(request: Request, image: Optional[UploadFile] = File(None), text: Optional[str] = Form(None)):
    # Handle JSON payloads
    if request.headers.get("content-type", "").startswith("application/json"):
        json_data = await request.json()
        text = json_data.get("text", "")

    # If neither text nor image is provided
    if not text and not image:
        return JSONResponse(content={"error": "Either text or image must be provided."}, status_code=400)

    # If only image is provided
    if image and not text:
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(await image.read())
            tmp_path = tmp.name
        response = handle_agent1("Image submitted for analysis", tmp_path)
        os.unlink(tmp_path)
        return {"response": response}

    # If text is provided (with or without image)
    if image:
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(await image.read())
            tmp_path = tmp.name
        response = handle_agent1(text, tmp_path)
        os.unlink(tmp_path)
    else:
        category = route_query(text)
        if category == 'faq':
            response = handle_agent2(text)
        else:
            response = handle_agent1(text, None)

    return {"response": response}