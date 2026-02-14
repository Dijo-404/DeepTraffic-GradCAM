# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Set up the Python Backend (YOLOv8 + BoT-SORT)

1. Create a virtual environment:
   ```sh
   python3 -m venv venv
   source venv/bin/activate
   ```

2. Install dependencies:
   ```sh
   pip install -r backend/requirements.txt
   ```

3. Start the backend server:
   ```sh
   cd backend
   python main.py
   ```
   The API will start at `http://localhost:8000`.

# Step 4: Start the Frontend

```sh
npm run dev
```
The frontend will proxy `/api` requests to the backend.

## Hybrid Architecture

This project uses a **hybrid traffic analysis engine**:

1.  **YOLOv8 (Backend)**: Runs on the server to detect vehicles and track them using **BoT-SORT** (Multi-Object Tracking).
    *   **Model**: `backend/models/best.pt`
    *   **Tracker**: BoT-SORT (custom config in `backend/botsort.yaml`)
2.  **MobileNetV2 (Frontend)**: Runs in the browser (TensorFlow.js) to classify overall traffic density.
3.  **Grad-CAM**: Generates heatmaps for density explanation.

## Data Flow

1.  **Video Input**: User drops a video file.
2.  **Frame Capture**: Frontend captures frames at ~10 FPS.
3.  **Inference**: Frames are sent to `POST /api/detect`.
4.  **Tracking**: Backend runs YOLO inference + BoT-SORT tracking.
5.  **Visualization**: Frontend renders bounding boxes with persistent Track IDs.


**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
