# Image Analysis with Vertex AI

A web application that uses Google Cloud Vertex AI to analyze images with customizable system instructions. This project features:

- React frontend with image upload capabilities
- FastAPI backend for image processing
- Integration with Google Cloud Vertex AI for image analysis
- Ability to customize system instructions for the AI model

## Architecture

![Architecture Overview](./architecture.png)

- **Frontend**: React with Chakra UI for styling
- **Backend**: FastAPI (Python)
- **ML Engine**: Google Cloud Vertex AI (Gemini Pro Vision)

## Prerequisites

- Google Cloud Platform account with Vertex AI API enabled
- Google Cloud service account with permissions for Vertex AI
- Node.js and npm for frontend development
- Python 3.11+ for backend development
- Docker and Docker Compose (optional)

## Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd image-analysis-app
```

### 2. Set up Google Cloud credentials

1. Create a service account in Google Cloud Console
2. Grant it access to Vertex AI
3. Download the JSON credentials file
4. Save it as `credentials.json` in the project root or set the path in the .env file

### 3. Create environment file

Copy the example environment file:

```bash
cp env.example .env
```

Update the values in `.env`:

```
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/credentials.json
```

### 4. Start with Docker Compose (Recommended)

```bash
docker-compose up
```

This will start both frontend and backend services.

### 5. Manual Setup (Alternative)

#### Backend Setup:

```bash
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the backend
uvicorn app:app --reload
```

#### Frontend Setup:

```bash
cd frontend

# Install dependencies
npm install

# Run the frontend
npm start
```

## Usage

1. Open your browser and navigate to `http://localhost:3008`
2. Enter system instructions in the text area (or use the default)
3. Upload an image by dragging and dropping or clicking on the upload area
4. Click "Analyze Image" to send the image to the API
5. View the analysis results below

## System Instructions Examples

You can customize the system instructions to guide the AI's analysis. Here are some examples:

- **General analysis**: "You are a helpful AI assistant that analyzes images and provides detailed information about what you see."
- **Plant identification**: "You are a plant expert. Identify the plant species in the image and provide care instructions."
- **Medical imaging**: "You are a medical imaging assistant. Describe what you observe in the medical scan in detail."
- **Art analysis**: "You are an art critic. Analyze the artistic elements, style, and possible historical context of the artwork."

## Development

- Backend API is available at `http://localhost:8008`
- Frontend development server runs at `http://localhost:3008`
- API documentation is available at `http://localhost:8008/docs`

## License

[MIT License](LICENSE) 