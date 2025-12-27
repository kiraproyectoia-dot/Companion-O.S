# Lily Project - AI Companion

This is a real-time, voice-interactive AI companion application built with React, TypeScript, and the Gemini API.

## How It Works: In-Browser Transpilation

This project is written in React and TypeScript (`.tsx` files). Browsers cannot run this code directly. To make it work on GitHub Pages without requiring a local build setup (like Node.js, npm, Vite, etc.), this project uses **Babel Standalone**.

A script in `index.html` loads Babel, which automatically finds the `<script type="text/babel">` tag and transpiles the TypeScript/JSX code into plain JavaScript that the browser can execute on the fly. This makes deployment as simple as pushing your code to GitHub.

## How to Deploy to GitHub Pages

This project is configured to be deployed as a static site on GitHub Pages. Note that a valid Google Gemini API key must be available in the execution environment as `process.env.API_KEY`.

### Prerequisites

1.  A GitHub account.
2.  `git` installed on your local machine.

### Deployment Steps

1.  **Create a GitHub Repository:**
    Create a new, empty repository on your GitHub account.

2.  **Initialize Git and Push:**
    In your project folder, run the following commands, replacing `<your-username>` and `<your-repo-name>` with your details:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    git branch -M main
    git remote add origin https://github.com/<your-username>/<your-repo-name>.git
    git push -u origin main
    ```

3.  **Configure GitHub Pages:**
    *   Go to your repository on GitHub.
    *   Click on the **"Settings"** tab.
    *   In the left sidebar, click on **"Pages"**.
    *   Under the "Build and deployment" section, for "Source", select **"Deploy from a branch"**.
    *   Under "Branch", select `main` and `/ (root)`.
    *   Click **"Save"**.

4.  **Wait for Deployment:**
    GitHub will start a deployment process. It might take a few minutes. Once it's done, your site will be live at `https://<your-username>.github.io/<your-repo-name>/`. You can find the URL on the same "Pages" settings screen.
