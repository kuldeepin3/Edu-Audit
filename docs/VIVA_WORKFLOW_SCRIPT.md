# EduAudit: Complete Viva Workflow & Presentation Script

This guide is designed as a **step-by-step narrative**. Use this to walk your examiner through the project. Explaining the system as a "story" or a "journey" is the best way to build trust and show that you completely understand how the code works.

---

## 🎙️ The Introduction (The "Why")
**What to tell the examiner:** 
> *"Ma'am/Sir, EduAudit is designed to solve a major problem in infrastructure management: fake reports and slow auditing. We built a system with two main AI features: an AI Vision model to instantly verify uploaded photos, and a RAG-based AI Chatbot to help auditors query data naturally. Let me walk you through the complete workflow of a single complaint."*

---

## 🚶‍♂️ Workflow 1: The Citizen Journey (Reporting & AI Vision)

### Step 1: The Citizen Reports the Issue
*   **The Action:** A citizen notices a broken desk. They open the **Next.js** web app and upload a picture.
*   **Trust Signal to Mention:** *"We built the frontend in Next.js because it's fast and responsive for mobile users. The user can also dictate their issue using a voice note, making it highly accessible."*

### Step 2: The Backend & YOLOv11 Validation
*   **The Action:** The frontend sends the image to our **FastAPI** backend via the `/vision/analyze` endpoint. FastAPI hands the image to our **YOLOv11** object detection model.
*   **What the AI does:** YOLOv11 scans the image. If it finds a broken desk, it draws a "bounding box" around it and returns a confidence score (e.g., 85% confident).
*   **Trust Signal to Mention:** *"This is a crucial step. By running YOLOv11 in the backend, we ensure that citizens cannot submit fake or irrelevant photos. The AI acts as a filter before the database is ever touched."*

### Step 3: Saving to the Database (PostgreSQL)
*   **The Action:** Because the AI verified the image (the confidence score was above our threshold of 25%), the backend saves the complaint details (location, description, AI category) into our **PostgreSQL** relational database.

### Step 4: Preparing for the Chatbot (Vectorization)
*   **The Action:** Before finishing, the backend silently takes the text of the complaint and sends it to **Ollama (`nomic-embed-text`)**. 
*   **What the AI does:** It converts the English text into a mathematical array of numbers (Vector Embeddings) and saves them into the **Qdrant Vector Database**.
*   **Trust Signal to Mention:** *"We don't just save text; we save the semantic meaning of the text in Qdrant. This is what allows our AI chatbot to understand context later, rather than just doing a basic CTRL+F keyword search."*

---

## 👨‍💻 Workflow 2: The Auditor Journey (Review & Chatbot)

### Step 5: The Auditor Dashboard
*   **The Action:** An auditor logs into their portal. The frontend fetches all complaints from PostgreSQL. The auditor can see the citizen's photo *with* the AI's bounding box drawn right on top of it.
*   **Trust Signal to Mention:** *"The auditor doesn't have to guess what the citizen is pointing out. The AI explicitly highlights the damage."*

### Step 6: The AI Chatbot (RAG Architecture)
*   **The Action:** The auditor has hundreds of reports and wants to find something specific. They open the AI Chatbot and type: *"How many washroom issues are reported in the Science block?"*
*   **What happens in the backend:**
    1.  **Embedding:** FastAPI sends the question to Ollama to turn it into a vector.
    2.  **Searching Qdrant:** We perform a "Cosine Similarity Search" in Qdrant to find past complaints whose vectors mathematically match the question's vector.
    3.  **Retrieving Context:** We fetch the full details of those matching complaints from PostgreSQL.
    4.  **LLM Generation:** We give the original question AND the matching complaints to the **Ollama `llama3.2` LLM**. The LLM reads it and types out a conversational, highly accurate answer.
*   **Trust Signal to Mention:** *"This uses an architecture called RAG (Retrieval-Augmented Generation). Because the LLM is running locally via Ollama, our system is entirely offline, secure, and private. The AI cannot hallucinate because we strictly feed it context directly from our own database."*

---

## 💡 Summary of Tech Stack for the Examiner
If she asks you to list the technologies, group them logically:
*   **Frontend:** Next.js, React, TailwindCSS
*   **Backend:** FastAPI (Python)
*   **Traditional Database:** PostgreSQL
*   **Vector Database:** Qdrant
*   **Vision AI:** YOLOv11
*   **Language AI:** Ollama (`nomic-embed-text` for embeddings, `llama3.2` for chatbot generation)
