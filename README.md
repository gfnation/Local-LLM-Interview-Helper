# Interactive AI Interview Prep

This is a full-stack Flask and React web application designed to help software engineers prepare for technical interviews. The application acts as a technical interview simulator, pulling from a bank of 100 senior-level engineering questions and using local LLMs via Ollama to evaluate the user's answers.

The question bank covers a diverse range of topics:
- React architecture (Fiber, Hooks, Server Components)
- Flask and Python internals (GIL, Thread Locals, memory management)
- Computer Vision (CNNs, Object Detection, ViTs)
- Artificial Intelligence and System Design

## Architecture

- **Backend**: Python / Flask (Runs on port 5001)
  - Serves REST API endpoints for questions, model discovery, and evaluation.
  - **Dynamic model discovery**: Automatically fetches all available models from your local Ollama instance.
  - **Free Web Search**: Uses DuckDuckGo search for live grounding (State-of-the-Art documentation verification) without requiring any API keys.
- **Frontend**: React / TypeScript / Vite (Runs on port 5173)
  - Features a modern, premium dark-mode interface with smooth animations.
  - **Interactive Concept Links**: AI feedback identifies key technical terms and wraps them in links. Clicking them triggers an architect-level "Deep Dive".
  - **Premium UI**: Dedicated emerald-styled "Ideal Answer" box and indigo "Deep Dive" pop-outs.
  - **Markdown Support**: Full rendering for code blocks, lists, and formatted technical documentation.

## Prerequisites

- [Node.js](https://nodejs.org/) (for the React frontend)
- [Python 3](https://www.python.org/)
- [Ollama](https://ollama.com/) running locally.
  - Ensure Ollama is running via `ollama serve`.
  - Recommended models: `llama3.1:8b` or `qwen2.5-coder:7b`.

## Setup and Running

1. **Start the Flask Backend**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python3 app.py
   ```
   *The API will start on `http://127.0.0.1:5001`.*

2. **Start the React Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *The frontend will start on `http://localhost:5173/`.*

## Features
- **Instant AI Feedback**: Submit your answer and get an immediate critique tailored to a senior engineering standard.
- **Search Web Grounding**: Toggle web search to ensure the AI's feedback is grounded in the latest 2024/2025 documentation.
- **Interactive Deep-Dives**: Click on highlighted technical concepts within feedback to get a dense, under-the-hood explanation.
- **Ideal Answer Comparison**: Request a senior-level "Ideal Response" to see exactly how a top-tier candidate would have answered the same question.
- **Dynamic Model Selection**: Connects directly to Ollama. Use the dropdown to switch between any models you have downloaded locally.
- **Smart Auto-scroll**: The interface automatically follows the AI's generation, keeping the latest insights in view.
