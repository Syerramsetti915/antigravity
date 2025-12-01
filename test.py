from vertexai.vision_models import Image
from vertexai.generative_models import GenerativeModel
import vertexai

import google.auth

credentials, project = google.auth.default()
print("Authenticated principal:", credentials.service_account_email if hasattr(credentials, "service_account_email") else "user credentials")

from google.cloud import aiplatform

aiplatform.init(project="projectk-458016", location="us-central1")

vertexai.init(project="projectk-458016", location="us-central1")

models = aiplatform.Model.list()
for model in models:
    print(model.display_name)

model = GenerativeModel("gemini-1.0-pro")  # Use only available models

# Load image
image = Image.load_from_file("test.png")

response = model.generate_content(
    ["What's in this image?", image]
)

print(response.text)