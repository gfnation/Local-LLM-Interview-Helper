import os
import json
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

from duckduckgo_search import DDGS

# --- Configuration ---
OLLAMA_API_URL = "http://localhost:11434/api/generate"
OLLAMA_MODELS_URL = "http://localhost:11434/api/tags"

def perform_web_search(query):
    """
    Performs a COMPLETELY FREE web search using DuckDuckGo.
    Returns a string summary of the search results for grounding.
    """
    try:
        results = []
        with DDGS() as ddgs:
            # We fetch top 5 results
            for r in ddgs.text(query, max_results=5):
                results.append(f"- {r['title']}: {r['body']}")
        
        return "\n".join(results) if results else "No grounding source found."
    except Exception as e:
        print(f"Search Warning (Non-critical): {str(e)}")
        return "" # Fail gracefully so grounding doesn't stop the core app

def load_questions():
    with open("questions.json", "r") as f:
        return json.load(f)

@app.route("/api/models", methods=["GET"])
def get_models():
    try:
        response = requests.get(OLLAMA_MODELS_URL, timeout=5)
        response.raise_for_status()
        data = response.json()
        models = [m["name"] for m in data.get("models", [])]
        return jsonify(models)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/questions", methods=["GET"])
def get_questions():
    topic = request.args.get("topic")
    questions = load_questions()
    
    if topic:
        filtered = [q for q in questions if q.get("topic") == topic]
        return jsonify(filtered)
    
    return jsonify(questions)

@app.route("/api/evaluate", methods=["POST"])
def evaluate_answer():
    data = request.json
    question = data.get("question")
    answer = data.get("answer")
    model = data.get("model", "llama3.1:8b") # default
    detailed = data.get("detailed", False)
    grounded = data.get("grounded", False)

    if not question or not answer:
        return jsonify({"error": "Missing question or answer"}), 400

    search_context = ""
    if grounded:
        search_context = perform_web_search(f"Senior engineering interview answer: {question}")
        if search_context:
            search_context = f"\n\n--- SEARCH GROUNDING DATA (LATEST INFO) ---\n{search_context}\n--- END SEARCH DATA ---\n"

    if detailed:
        prompt = f"""You are a senior engineering interviewer. The candidate has already provided an answer, and now they want to see the **IDEAL response** and have a further technical discussion.{search_context}
Question: {question}

Candidate's Answer: {answer}

First, provide the **Ideal Response** that a top-tier senior candidate would give. 
Then, provide a comprehensive deep-dive into the underlying architecture, edge cases, industry best practices, and advanced concepts related to this topic.
"""
    else:
        prompt = f"""You are a senior engineering interviewer. Evaluate the candidate's answer to the following question:{search_context}
"{question}"

Candidate's Answer:
"{answer}"

Provide constructive feedback (2-3 sentences max).
Crucially, identify 2-3 key technical concepts or terms mentioned in your feedback that are important for a senior role and wrap them in a special tag like this: [concept:Technical Term].
Example: "Your use of [concept:VDOM] is correct, but consider [concept:Reconciliation] overhead."
"""

    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False
    }

    try:
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=120)
        response.raise_for_status()
        result = response.json()
        return jsonify({"feedback": result.get("response")})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/deep_dive", methods=["POST"])
def deep_dive():
    data = request.json
    concept = data.get("concept")
    model = data.get("model", "llama3.1:8b")
    grounded = data.get("grounded", False)

    if not concept:
        return jsonify({"error": "Missing concept"}), 400

    search_context = ""
    if grounded:
        search_context = perform_web_search(f"Advanced documentation for technical concept: {concept}")
        if search_context:
            search_context = f"\n\n--- LATEST DOCUMENTATION DATA ---\n{search_context}\n--- END DATA ---\n"

    prompt = f"""You are a senior software architect. Provide a deep-dive explanation for the following technical concept: "{concept}".{search_context}
Your explanation should cover:
1. What it is and why it's important.
2. How it works under the hood.
3. Common pitfalls or interviewer "gotchas" related to it.
4. How it applies in the context of high-scale systems.
Keep it dense, accurate, and professional.
"""

    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False
    }

    try:
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=120)
        response.raise_for_status()
        result = response.json()
        return jsonify({"explanation": result.get("response")})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5001)
