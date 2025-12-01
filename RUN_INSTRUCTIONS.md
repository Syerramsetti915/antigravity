# How to Run the Natarajan Project

This document provides detailed instructions on how to set up and run the Natarajan image analysis application. You can choose between running it via Docker (recommended for quick start) or manually (recommended for development).

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Git**: To clone the repository.
*   **Google AI Studio API Key**: You need an API key from [Google AI Studio](https://aistudio.google.com/).

### For Docker Method (Recommended)
*   **Docker** and **Docker Compose**.

### For Manual Method
*   **Python 3.11+**
*   **Node.js 18+** and **npm**

---

## 1. Configuration (Required for both methods)

1.  **Navigate to the project directory**:
    ```bash
    cd natarajan
    ```

2.  **Set up Environment Variables**:
    Copy the example environment file to create your local `.env` file.
    ```bash
    cp env.example .env
    ```

3.  **Edit `.env`**:
    Open `.env` in your text editor and fill in your Google AI Studio API Key:
    ```env
    GOOGLE_API_KEY=your_api_key_here
    # Optional: GOOGLE_CLOUD_PROJECT is no longer strictly required for the Gemini API but good to keep.
    ```

---

## 2. Method A: Running with Docker (Recommended)

This is the easiest way to get the app running.

1.  **Build and Start Services**:
    ```bash
    docker-compose up --build
    ```
    *   The `--build` flag ensures that the latest changes are compiled.

2.  **Access the Application**:
    *   **Frontend**: Open [http://localhost:7002](http://localhost:7002) in your browser.
    *   **Backend API**: Running at [http://localhost:7001](http://localhost:7001).
    *   **API Docs**: Available at [http://localhost:7001/docs](http://localhost:7001/docs).

3.  **Stop the Application**:
    Press `Ctrl+C` in the terminal, or run:
    ```bash
    docker-compose down
    ```

---

## 3. Method B: Manual Setup (For Development)

Use this method if you want to develop or debug the application locally without Docker.

### Backend Setup

1.  **Navigate to the root directory** (`natarajan/`).

2.  **Create a Virtual Environment**:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

3.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run the Backend**:
    ```bash
    uvicorn app:app --host 0.0.0.0 --port 7001 --reload
    ```
    The backend should now be running at `http://localhost:7001`.

### Frontend Setup

1.  **Open a new terminal** and navigate to the frontend directory:
    ```bash
    cd frontend
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Run the Frontend**:
    ```bash
    PORT=7002 npm start
    ```
    The frontend should automatically open at `http://localhost:7002`.

---

## 4. Troubleshooting

*   **Port Conflicts**:
    *   If port `7002` or `7001` is already in use, you can change the mapping in `docker-compose.yml` or the run commands.
    *   *Docker*: Change `"7002:7000"` to `"7003:7000"` in `docker-compose.yml`.
    *   *Manual*: Run `PORT=7003 npm start` for frontend.

*   **Gemini API Errors**:
    *   Ensure your `GOOGLE_API_KEY` in `.env` is valid.
    *   Check if you have quota available in Google AI Studio.

*   **Frontend Connection Issues**:
    *   If the frontend cannot talk to the backend, check the browser console.
    *   Ensure the backend is running and accessible at `http://localhost:7001`.
    *   The frontend expects the backend at `http://localhost:7001` (configured in `docker-compose.yml` or defaults).
