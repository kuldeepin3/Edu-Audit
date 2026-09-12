import sys
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def create_deck():
    prs = Presentation()
    # Set 16:9 widescreen dimensions
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Color Palette
    BG_DARK = RGBColor(15, 23, 42)        # Slate 900
    BG_CARD = RGBColor(30, 41, 59)        # Slate 800
    BG_CARD_LIGHT = RGBColor(51, 65, 85)  # Slate 700
    TEXT_WHITE = RGBColor(248, 250, 252) # Slate 50
    TEXT_MUTED = RGBColor(148, 163, 184) # Slate 400
    ACCENT_CYAN = RGBColor(6, 182, 212)   # Cyan 500
    ACCENT_GREEN = RGBColor(16, 185, 129) # Emerald 500
    ACCENT_BLUE = RGBColor(59, 130, 246)  # Blue 500
    ACCENT_AMBER = RGBColor(245, 158, 11) # Amber 500

    def set_slide_background(slide, color=BG_DARK):
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = color

    def add_header(slide, category_text, title_text):
        # Category Tag
        tx_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11.7), Inches(0.4))
        tf = tx_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = category_text.upper()
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = ACCENT_CYAN
        
        # Main Title
        p2 = tf.add_paragraph()
        p2.text = title_text
        p2.font.size = Pt(24)
        p2.font.bold = True
        p2.font.color.rgb = TEXT_WHITE
        p2.space_before = Pt(4)

    def add_card(slide, left, top, width, height, title, body_bullets, accent_color=ACCENT_CYAN, title_size=18, body_size=13):
        # Background shape
        shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        shape.fill.solid()
        shape.fill.fore_color.rgb = BG_CARD
        shape.line.color.rgb = BG_CARD_LIGHT
        shape.line.width = Pt(1.5)

        # Top highlight border indicator
        top_bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left + Inches(0.2), top, width - Inches(0.4), Inches(0.06))
        top_bar.fill.solid()
        top_bar.fill.fore_color.rgb = accent_color
        top_bar.line.fill.background()

        # Text inside
        tb = slide.shapes.add_textbox(left + Inches(0.3), top + Inches(0.25), width - Inches(0.6), height - Inches(0.4))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        # Card Title
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(title_size)
        p.font.bold = True
        p.font.color.rgb = TEXT_WHITE
        p.space_after = Pt(10)

        # Bullets
        for b in body_bullets:
            p_b = tf.add_paragraph()
            p_b.text = f"• {b}"
            p_b.font.size = Pt(body_size)
            p_b.font.color.rgb = TEXT_MUTED
            p_b.space_after = Pt(6)

    # -------------------------------------------------------------
    # SLIDE 1: TITLE SLIDE
    # -------------------------------------------------------------
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1, BG_DARK)

    # Badge
    badge = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.5), Inches(3.2), Inches(0.45))
    badge.fill.solid()
    badge.fill.fore_color.rgb = BG_CARD
    badge.line.color.rgb = ACCENT_CYAN
    b_tf = badge.text_frame
    bp = b_tf.paragraphs[0]
    bp.text = "AI-POWERED AUDITING PLATFORM"
    bp.alignment = PP_ALIGN.CENTER
    bp.font.size = Pt(11)
    bp.font.bold = True
    bp.font.color.rgb = ACCENT_CYAN

    # Main Title & Subtitle
    tb1 = s1.shapes.add_textbox(Inches(0.8), Inches(2.2), Inches(11.7), Inches(3.0))
    tf1 = tb1.text_frame
    tf1.word_wrap = True
    
    p = tf1.paragraphs[0]
    p.text = "EduAudit AI"
    p.font.size = Pt(48)
    p.font.bold = True
    p.font.color.rgb = TEXT_WHITE

    p2 = tf1.add_paragraph()
    p2.text = "Intelligent Campus Infrastructure Auditing & Defect Detection System"
    p2.font.size = Pt(22)
    p2.font.color.rgb = ACCENT_CYAN
    p2.space_before = Pt(8)

    p3 = tf1.add_paragraph()
    p3.text = "Automated Computer Vision Verification (YOLOv11) & Contextual Local RAG Assistant (Qdrant + LLaMA 3.2)"
    p3.font.size = Pt(14)
    p3.font.color.rgb = TEXT_MUTED
    p3.space_before = Pt(16)

    # Footer Card (Author Info)
    card_info = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(5.6), Inches(11.7), Inches(1.2))
    card_info.fill.solid()
    card_info.fill.fore_color.rgb = BG_CARD
    card_info.line.color.rgb = BG_CARD_LIGHT
    ci_tf = card_info.text_frame
    cip = ci_tf.paragraphs[0]
    cip.text = "Final Year Academic Project Presentation"
    cip.font.bold = True
    cip.font.size = Pt(14)
    cip.font.color.rgb = TEXT_WHITE

    cip2 = ci_tf.add_paragraph()
    cip2.text = "Domain: Computer Vision, Large Language Models (RAG), Full-Stack Systems & Cloud Infrastructure"
    cip2.font.size = Pt(12)
    cip2.font.color.rgb = TEXT_MUTED
    cip2.space_before = Pt(4)

    # -------------------------------------------------------------
    # SLIDE 2: PROBLEM STATEMENT
    # -------------------------------------------------------------
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2, BG_DARK)
    add_header(s2, "Motivation & Challenges", "The Infrastructure Auditing Problem")

    add_card(s2, Inches(0.8), Inches(1.8), Inches(3.6), Inches(5.0),
             "1. Slow Manual Audits",
             [
                 "Manual inspection is labor-intensive and paper-bound.",
                 "High turnaround time between problem reporting and repair dispatch.",
                 "Critical hazards (electrical, water leakage) go unnoticed for weeks.",
                 "Lack of transparency for students and faculty."
             ], accent_color=ACCENT_AMBER)

    add_card(s2, Inches(4.85), Inches(1.8), Inches(3.6), Inches(5.0),
             "2. Fake & Unverified Reports",
             [
                 "Open reporting channels suffer from spam and fake photos.",
                 "Auditors waste significant time manually vetting photos.",
                 "No automated bounding box verification of reported damage.",
                 "Duplicate complaints create confusion and backlog."
             ], accent_color=RGBColor(239, 68, 68))

    add_card(s2, Inches(8.9), Inches(1.8), Inches(3.6), Inches(5.0),
             "3. Information Silos",
             [
                 "Administrators cannot search complaint logs intelligently.",
                 "Traditional SQL keyword search misses synonyms and context.",
                 "No automated analytics on recurring maintenance hotspots.",
                 "Lack of real-time audit trail and SLA accountability."
             ], accent_color=ACCENT_CYAN)

    # -------------------------------------------------------------
    # SLIDE 3: PROPOSED SOLUTION
    # -------------------------------------------------------------
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3, BG_DARK)
    add_header(s3, "Overview", "The EduAudit Solution: End-to-End AI Automation")

    add_card(s3, Inches(0.8), Inches(1.8), Inches(3.6), Inches(5.0),
             "📸 AI Vision Verification",
             [
                 "Instant damage detection using YOLOv11-Nano.",
                 "Identifies damage classes: Washroom, Furniture, Hazards, Sanitation.",
                 "Draws bounding boxes & calculates confidence score.",
                 "Rejects spam/blurry images with <25% confidence threshold."
             ], accent_color=ACCENT_GREEN)

    add_card(s3, Inches(4.85), Inches(1.8), Inches(3.6), Inches(5.0),
             "🤖 Offline RAG Chatbot",
             [
                 "Auditors query complaints in conversational natural language.",
                 "Powered by Qdrant Vector DB & Ollama (LLaMA 3.2).",
                 "Semantic retrieval finds concepts ('smashed desk' → 'broken furniture').",
                 "100% private, self-hosted, and zero-hallucination."
             ], accent_color=ACCENT_CYAN)

    add_card(s3, Inches(8.9), Inches(1.8), Inches(3.6), Inches(5.0),
             "📊 Auditor Command Center",
             [
                 "Centralized dashboard for tracking complaint lifecycle.",
                 "Interactive status workflows: Pending → In Progress → Resolved.",
                 "Voice note dictation for citizen ease of reporting.",
                 "Containerized with Docker for seamless cross-platform deployment."
             ], accent_color=ACCENT_BLUE)

    # -------------------------------------------------------------
    # SLIDE 4: SYSTEM ARCHITECTURE
    # -------------------------------------------------------------
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4, BG_DARK)
    add_header(s4, "System Design", "Decoupled 3-Tier Architecture")

    add_card(s4, Inches(0.8), Inches(1.8), Inches(2.7), Inches(5.0),
             "Frontend Tier",
             [
                 "Next.js 14 (App Router)",
                 "React & TypeScript",
                 "TailwindCSS Styling",
                 "Voice Note Speech API",
                 "Bounding Box Canvas overlay",
                 "Optimized for mobile citizens and desktop auditors."
             ], accent_color=ACCENT_CYAN, title_size=16, body_size=12)

    add_card(s4, Inches(3.75), Inches(1.8), Inches(2.7), Inches(5.0),
             "Backend Tier",
             [
                 "FastAPI (Asynchronous Python)",
                 "High-throughput REST API",
                 "Celery Distributed Workers",
                 "Redis Message Broker & Cache",
                 "JWT Authentication & RBAC",
                 "Robust error handling and rate limiting."
             ], accent_color=ACCENT_BLUE, title_size=16, body_size=12)

    add_card(s4, Inches(6.7), Inches(1.8), Inches(2.7), Inches(5.0),
             "Data Tier",
             [
                 "PostgreSQL (pgvector + PostGIS)",
                 "ACID Relational Source of Truth",
                 "Qdrant Vector Database",
                 "High-dimensional vector storage",
                 "Docker Volume persistence",
                 "Encrypted backups & schema migrations."
             ], accent_color=ACCENT_AMBER, title_size=16, body_size=12)

    add_card(s4, Inches(9.65), Inches(1.8), Inches(2.8), Inches(5.0),
             "AI Engine Tier",
             [
                 "YOLOv11-Nano Object Detection",
                 "Custom trained weights (.pt)",
                 "Ollama local LLM engine",
                 "nomic-embed-text for embeddings",
                 "llama3.2 for answer synthesis",
                 "Completely self-hosted & offline."
             ], accent_color=ACCENT_GREEN, title_size=16, body_size=12)

    # -------------------------------------------------------------
    # SLIDE 5: COMPUTER VISION PIPELINE (YOLOv11)
    # -------------------------------------------------------------
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5, BG_DARK)
    add_header(s5, "Computer Vision", "YOLOv11-Nano Defect Detection Engine")

    add_card(s5, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Why YOLOv11 & Object Detection?",
             [
                 "Single-Stage Detection: Processes the entire image in a single pass for ultra-low latency.",
                 "Object Detection vs Classification: Instead of just labeling the image, YOLO outputs precise coordinates [x1, y1, x2, y2].",
                 "Nano Architecture (yolo11n): Extremely small parameter size (~5.4 MB weights) optimized for CPU/GPU inference.",
                 "Custom Domain Classes:",
                 "   • washroom_damage",
                 "   • broken_furniture",
                 "   • campus_hazard",
                 "   • poor_sanitation"
             ], accent_color=ACCENT_GREEN)

    add_card(s5, Inches(6.8), Inches(1.8), Inches(5.7), Inches(5.0),
             "Inference & Validation Workflow",
             [
                 "1. Image Ingestion: Frontend captures image and dispatches multipart request to POST /vision/analyze.",
                 "2. Preprocessing & Inference: FastAPI loads cv_models/yolov11_nano.pt and runs inference via Ultralytics API.",
                 "3. Confidence Thresholding: Detections below 25% (0.25) are filtered out to eliminate false positives.",
                 "4. JSON Payload Response: Coordinates & confidence scores returned to Next.js; frontend draws boxes on Canvas.",
                 "5. Audit Record Creation: Bounding box metadata stored in PostgreSQL alongside complaint record."
             ], accent_color=ACCENT_CYAN)

    # -------------------------------------------------------------
    # SLIDE 6: RAG CHATBOT ARCHITECTURE
    # -------------------------------------------------------------
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6, BG_DARK)
    add_header(s6, "Natural Language Processing", "RAG Pipeline (Qdrant + Ollama)")

    add_card(s6, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Step 1: Embedding & Ingestion",
             [
                 "Text Representation: Complaint descriptions are extracted upon submission.",
                 "Vectorization: Passed to Ollama nomic-embed-text to create dense 768-dimensional embeddings.",
                 "Vector Indexing: Stored in Qdrant collection (eduaudit_complaints).",
                 "Semantic Encoding: Captures meaning and context rather than static keywords."
             ], accent_color=ACCENT_CYAN)

    add_card(s6, Inches(6.8), Inches(1.8), Inches(5.7), Inches(5.0),
             "Step 2: Semantic Retrieval & Generation",
             [
                 "User Query: Auditor asks 'How many washroom issues in Block A?'",
                 "Query Vectorization: Ollama embeds query in real time.",
                 "Cosine Similarity Search: Qdrant matches nearest complaint vectors.",
                 "Context Injection: Top-K matching complaints retrieved from PostgreSQL.",
                 "LLM Synthesis: Ollama llama3.2 reads context + query and returns precise, evidence-grounded answer."
             ], accent_color=ACCENT_BLUE)

    # -------------------------------------------------------------
    # SLIDE 7: DUAL DATABASE STRATEGY
    # -------------------------------------------------------------
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_background(s7, BG_DARK)
    add_header(s7, "Data Management", "Dual Database Strategy: PostgreSQL + Qdrant")

    add_card(s7, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "PostgreSQL (Relational Store)",
             [
                 "Role: System Source of Truth & Transaction Engine.",
                 "Stores: User auth credentials, complaint status, timestamps, audit logs, file paths.",
                 "Key Strengths: ACID compliance, relational joins, structured queries, data integrity.",
                 "Status Management: Pending → In Progress → Resolved.",
                 "Port: 5433 (Mapped via Docker Volume pgdata)."
             ], accent_color=ACCENT_AMBER)

    add_card(s7, Inches(6.8), Inches(1.8), Inches(5.7), Inches(5.0),
             "Qdrant (Vector Database)",
             [
                 "Role: High-dimensional Semantic Search Engine.",
                 "Stores: Dense mathematical vector embeddings of complaint descriptions.",
                 "Key Strengths: Sub-millisecond ANN (Approximate Nearest Neighbor) cosine search.",
                 "Solves: Vocabulary mismatch problem ('smashed table' matches 'broken desk').",
                 "Port: 6333 (Mapped via Docker Volume qdrant_storage)."
             ], accent_color=ACCENT_CYAN)

    # -------------------------------------------------------------
    # SLIDE 8: END-TO-END DATA FLOW
    # -------------------------------------------------------------
    s8 = prs.slides.add_slide(blank_layout)
    set_slide_background(s8, BG_DARK)
    add_header(s8, "Process Lifecycle", "End-to-End Complaint Lifecycle")

    steps = [
        ("1. Report Submission", "Citizen uploads photo & voice note via Next.js web app.", ACCENT_CYAN),
        ("2. Vision AI Check", "FastAPI runs YOLOv11; calculates confidence & bounding box.", ACCENT_GREEN),
        ("3. Relational Storage", "Complaint & detection metadata stored in PostgreSQL.", ACCENT_AMBER),
        ("4. Vector Indexing", "Ollama nomic-embed-text generates vector; stored in Qdrant.", ACCENT_BLUE),
        ("5. Auditor Review", "Auditor views flagged issues & updates resolution state.", ACCENT_CYAN),
        ("6. AI Intelligence", "Auditor queries RAG chatbot for analytics and instant summaries.", ACCENT_GREEN)
    ]

    for i, (stitle, sdesc, scolor) in enumerate(steps):
        row = i // 3
        col = i % 3
        c_left = Inches(0.8 + col * 4.0)
        c_top = Inches(1.8 + row * 2.5)
        add_card(s8, c_left, c_top, Inches(3.7), Inches(2.2),
                 stitle, [sdesc], accent_color=scolor, title_size=15, body_size=12)

    # -------------------------------------------------------------
    # SLIDE 9: KEY RESULTS & HIGHLIGHTS
    # -------------------------------------------------------------
    s9 = prs.slides.add_slide(blank_layout)
    set_slide_background(s9, BG_DARK)
    add_header(s9, "Performance & Verification", "Project Highlights & Key Differentiators")

    add_card(s9, Inches(0.8), Inches(1.8), Inches(3.6), Inches(5.0),
             "High Vision Accuracy",
             [
                 "Demonstrated detection accuracy up to 91.3% on campus damage samples.",
                 "Real-time bounding box visualization for immediate user feedback.",
                 "Strict confidence filtering eliminates nuisance submissions.",
                 "Multi-defect detection capabilities in single image frames."
             ], accent_color=ACCENT_GREEN)

    add_card(s9, Inches(4.85), Inches(1.8), Inches(3.6), Inches(5.0),
             "100% Offline & Private",
             [
                 "No reliance on proprietary external APIs (e.g., OpenAI API).",
                 "Zero cloud subscription costs and zero API rate-limit bottlenecks.",
                 "All sensitive campus infrastructure images remain strictly on-premise.",
                 "Complete data sovereignty and regulatory compliance."
             ], accent_color=ACCENT_CYAN)

    add_card(s9, Inches(8.9), Inches(1.8), Inches(3.6), Inches(5.0),
             "Production Ready",
             [
                 "Fully containerized with Docker and Docker Compose.",
                 "Decoupled asynchronous architecture prevents UI blocking.",
                 "Built-in Redis caching and Celery background workers.",
                 "Clean, mobile-responsive UI designed for accessibility."
             ], accent_color=ACCENT_BLUE)

    # -------------------------------------------------------------
    # SLIDE 10: FUTURE SCOPE & CONCLUSION
    # -------------------------------------------------------------
    s10 = prs.slides.add_slide(blank_layout)
    set_slide_background(s10, BG_DARK)
    add_header(s10, "Roadmap & Conclusion", "Future Enhancements & Impact")

    add_card(s10, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Future Scope",
             [
                 "🚁 Drone-Assisted Audits: Automated aerial sweeps of roofs and high-voltage structures.",
                 "🗺️ Geospatial Heatmaps: Predictive maintenance forecasting based on GIS location trends.",
                 "💰 Automated Cost Estimator: Generating repair budget estimations based on detected damage area.",
                 "📲 Push Notifications & SMS: Real-time SMS status updates to reporting citizens via MSG91."
             ], accent_color=ACCENT_AMBER)

    add_card(s10, Inches(6.8), Inches(1.8), Inches(5.7), Inches(5.0),
             "Conclusion & Summary",
             [
                 "EduAudit transforms traditional, error-prone manual audits into an automated, AI-driven workflow.",
                 "Combines state-of-the-art Computer Vision (YOLOv11) with local Generative AI (RAG).",
                 "Provides unmatched transparency, rapid issue triage, and actionable administrative insights.",
                 "A scalable, cost-effective blueprint for modern smart campus governance."
             ], accent_color=ACCENT_GREEN)

    # -------------------------------------------------------------
    # SLIDE 11: Q&A / THANK YOU SLIDE
    # -------------------------------------------------------------
    s11 = prs.slides.add_slide(blank_layout)
    set_slide_background(s11, BG_DARK)

    badge11 = s11.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(4.65), Inches(2.2), Inches(4.0), Inches(0.5))
    badge11.fill.solid()
    badge11.fill.fore_color.rgb = BG_CARD
    badge11.line.color.rgb = ACCENT_GREEN
    b11_tf = badge11.text_frame
    b11p = b11_tf.paragraphs[0]
    b11p.text = "DEMO & EVALUATION"
    b11p.alignment = PP_ALIGN.CENTER
    b11p.font.size = Pt(12)
    b11p.font.bold = True
    b11p.font.color.rgb = ACCENT_GREEN

    tb11 = s11.shapes.add_textbox(Inches(1.0), Inches(3.0), Inches(11.3), Inches(2.5))
    tf11 = tb11.text_frame
    tf11.word_wrap = True

    p = tf11.paragraphs[0]
    p.text = "Thank You!"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(44)
    p.font.bold = True
    p.font.color.rgb = TEXT_WHITE

    p2 = tf11.add_paragraph()
    p2.text = "Questions & Demonstration"
    p2.alignment = PP_ALIGN.CENTER
    p2.font.size = Pt(22)
    p2.font.color.rgb = ACCENT_CYAN
    p2.space_before = Pt(10)

    p3 = tf11.add_paragraph()
    p3.text = "EduAudit AI — Intelligent Campus Auditing Platform"
    p3.alignment = PP_ALIGN.CENTER
    p3.font.size = Pt(14)
    p3.font.color.rgb = TEXT_MUTED
    p3.space_before = Pt(12)

    output_path = "EduAudit_Presentation.pptx"
    prs.save(output_path)
    print(f"Presentation saved successfully to {os.path.abspath(output_path)}")

if __name__ == "__main__":
    create_deck()
