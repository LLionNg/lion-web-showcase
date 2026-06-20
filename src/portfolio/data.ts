// Portfolio content, seeded from the CV. This is the single source of truth for
// the placeholder site - swap/extend freely as real project write-ups land.

export const profile = {
  name: "Suphakit Ng",
  handle: "LLionNg",
  title: "AI Engineer & Software Developer",
  tagline:
    "I build impactful AI systems, from deep-learning research to scalable, full-stack deployment.",
  location: "Chiang Mai, Thailand",
  email: "lionng@devlionng.com",
  phone: "+66 (0)87 181 9369",
  github: "https://github.com/LLionNg",
  site: "https://devlionng.com",
  education: {
    school: "Chiang Mai University",
    degree: "B.S. in Computer Science",
    gpa: "3.25 / 4.00",
    year: "2025",
  },
  // profile portrait, integrated into the hero
  avatar: "/portfolio/main.jpg",
};

export type Stat = {
  value: string;
  label: string;
  tone?: "silver" | "gold";
  link?: { href: string; label: string };
};
export const stats: Stat[] = [
  { value: "Silver Medal", label: "Super AI Engineer SS4", tone: "silver" },
  {
    value: "1st Place",
    label: "Llama 3 Hackathon @Lablab.ai",
    tone: "gold",
    link: {
      href: "https://lablab.ai/u/@tomu1572380/cm0fgsj3o004wxpstcmeod6h1",
      label: "Certificate",
    },
  },
  { value: "30+", label: "Projects" },
];

export type Project = {
  id: string;
  title: string;
  blurb: string;
  tags: string[];
  year: string;
  badge?: string; // award / highlight
  link?: { label: string; href: string };
  featured?: boolean;
};

export const projects: Project[] = [
  {
    id: "weapon-detection",
    title: "Weapon Detection",
    blurb:
      "Real-time firearm and knife detection for live CCTV and RTSP streams, pairing a YOLO11 detector with EDSR super-resolution so low-resolution surveillance footage still yields usable detections. Backed by a reproducible pipeline that unifies 12 public datasets (~16,600 images) into YOLO format, with FP16/TensorRT acceleration and per-camera alert cooldowns.",
    tags: ["YOLO11", "TensorRT", "Super-Resolution", "Computer Vision"],
    year: "2026",
    featured: true,
  },
  {
    id: "efficient-chess-ai",
    title: "FIDE & Google Efficient Chess AI",
    blurb:
      "A chess engine built from scratch for the FIDE & Google Efficient Chess AI challenge on a custom pure-Python bitboard core. Implements and benchmarks four search strategies - negamax with alpha-beta and quiescence, minimax, and Monte Carlo Tree Search - tuned to play strong moves within tight per-move compute budgets.",
    tags: ["Bitboards", "Alpha-Beta", "MCTS", "Game AI"],
    year: "2025",
    featured: true,
  },
  {
    id: "face-recognition-webapp",
    title: "Face Recognition WebApp",
    blurb:
      "A full-stack app that identifies enrolled people in real time from a webcam feed. A two-stage pipeline detects faces with MTCNN and classifies them with a fine-tuned FaceNet model, served by a FastAPI backend and a Next.js UI that overlays live bounding boxes and identities - shipped end to end with its own PyTorch training pipeline.",
    tags: ["FaceNet", "MTCNN", "PyTorch", "FastAPI", "Next.js"],
    year: "2025",
    featured: true,
  },
  {
    id: "webgl-portfolio",
    title: "Interactive 3D Portfolio (WebGL)",
    blurb:
      "Re-authored an open-source Three.js scene into a personal showcase - re-modeled in Blender, custom GLSL shaders, GSAP animation, bloom post-processing, and a Draco/KTX2/Basis asset pipeline for fast loads.",
    tags: ["Three.js", "GLSL", "GSAP", "Blender", "KTX2"],
    year: "2024",
    link: { label: "devlionng.com", href: "https://devlionng.com" },
    featured: true,
  },
  {
    id: "legal-rag",
    title: "Legal RAG System",
    blurb:
      "Retrieval-Augmented Generation for legal document analysis, implementing a HybridRAG architecture with Hypothetical Document Embeddings (HyDE). Selected for the Super AI Engineer exhibition.",
    tags: ["RAG", "HyDE", "LLM", "NLP"],
    year: "2024",
    badge: "Exhibition Selected",
    featured: true,
  },
  {
    id: "brain-motor-imagery",
    title: "Brain Motor Imagery Classification",
    blurb:
      "EEG motor-imagery classification and application - won the Super AI Engineer Season 4 hackathon for decoding brain signals into actionable intent.",
    tags: ["EEG", "Signal Processing", "Deep Learning"],
    year: "2024",
    badge: "Hackathon Winner",
    featured: true,
  },
  {
    id: "flashbsoft",
    title: "Flashboi - AI Flashcards",
    blurb:
      "An AI-driven flashcard generator using Llama 3 + RAG to extract and convert PDF content into personalized, interactive study materials with progress tracking.",
    tags: ["Llama 3", "RAG", "PDF", "EdTech"],
    year: "2024",
    badge: "1st Place - Llama 3 Hackathon",
    link: {
      label: "Certificate",
      href: "https://lablab.ai/u/@tomu1572380/cm0fgsj3o004wxpstcmeod6h1",
    },
    featured: true,
  },
  {
    id: "check-maid",
    title: "Check Maid",
    blurb:
      "A geofenced check-in/out and payroll system for housekeeping staff, operated entirely through a LINE bot that captures GPS location and timestamps and auto-splits hours into regular and overtime. Built on an async FastAPI + PostgreSQL backend with Alembic migrations and a Next.js admin dashboard.",
    tags: ["FastAPI", "PostgreSQL", "LINE Bot", "Next.js"],
    year: "2026",
  },
  {
    id: "cashier-fraud-detection",
    title: "Cashier Fraud Detection",
    blurb:
      "A computer-vision pipeline that flags potential register fraud by detecting whether a cash drawer is open or closed in surveillance video and timing how long it stays open. A YOLO detector trained on a Roboflow dataset (mAP50 ~0.98) runs frame by frame to surface suspicious drawer-open events.",
    tags: ["YOLO", "Object Detection", "Computer Vision"],
    year: "2026",
  },
  {
    id: "openclaw-telegram",
    title: "OpenClaw Telegram",
    blurb:
      "A Thai-language Telegram assistant that turns team chat into structured to-do lists and chases task status. It pulls a LINE group's history, extracts action items with Gemini 2.5 Flash, and posts a daily Thai summary back to Telegram, with a document-reading skill that parses Excel, PDF, and DOCX into JSON.",
    tags: ["Telegram", "Gemini", "LLM Agent", "Automation"],
    year: "2026",
  },
  {
    id: "twilio-voice-capture",
    title: "Twilio Voice Capture",
    blurb:
      "A FastAPI WebSocket gateway that captures live call audio per session, relays it to a real-time speech-to-text service, and persists recordings - built for Thai-language telephony voice capture with a clean session-managed relay architecture.",
    tags: ["FastAPI", "WebSockets", "Speech-to-Text", "Telephony"],
    year: "2026",
  },
  {
    id: "thai-image-captioning",
    title: "Thai Image Captioning",
    blurb:
      "Adapted the state-of-the-art mPLUG vision-language model for Thai through a custom BertTokenizer and BertDecoder implementation.",
    tags: ["Vision-Language", "mPLUG", "Thai NLP"],
    year: "2024",
  },
  {
    id: "liver-cancer-detection",
    title: "Liver Ultrasound Cancer Detection",
    blurb:
      "End-to-end pipeline for liver cancer detection, leveraging YOLOv10 for object localization and classification on ultrasound imagery.",
    tags: ["YOLOv10", "Medical AI", "Computer Vision"],
    year: "2024",
  },
  {
    id: "extractive-qa",
    title: "Extractive Question & Answering",
    blurb:
      "Fine-tuned a BERT base model for context-grounded Q&A, detecting answer spans via start-end position encoding over the context.",
    tags: ["BERT", "QA", "Fine-tuning"],
    year: "2024",
  },
  {
    id: "vira",
    title: "VIRA - Voice AI Assistant",
    blurb:
      "A voice-activated assistant integrating speech recognition with LLM APIs for natural, hands-free task execution and information retrieval.",
    tags: ["Speech", "LLM", "Assistant"],
    year: "2022",
  },
];

export type Experience = {
  role: string;
  org: string;
  period: string;
  points: string[];
};

export const experience: Experience[] = [
  {
    role: "AI Engineer",
    org: "DeepCapital Co., Ltd.",
    period: "2024 - 2025",
    points: [
      "Built & deployed domain-specific RAG systems across legal, e-commerce, and agriculture.",
      "Optimized inference with TensorRT - 5x speedup via FP16 quantization, operator fusion, dynamic batching.",
      "Full-stack delivery: frontend UI, API testing, and concurrent load testing for production readiness.",
    ],
  },
  {
    role: "Silver Medal Award",
    org: "Super AI Engineer, Season 4",
    period: "2024",
    points: [
      "Exhibition-selected Project (Legal RAG System): Developed a Retrieval-Augmented Generation system for legal document analysis, implementing HybridRAG architecture and Hypothetical Document Embeddings (HyDE).",
      "Liver Ultrasound Cancer Detection: Developed an end-to-end pipeline for liver cancer detection, leveraging the YOLOv10 model for object localization and classification.",
      "Thai Image Captioning: Adapted the state-of-the-art mPLUG vision-language model for Thai through a custom BertTokenizer and BertDecoder implementation.",
    ],
  },
  {
    role: "Freelance Full-Stack & AI Engineer",
    org: "Self-employed",
    period: "2022 - 2024",
    points: [
      "Social accountability platform at exercise.devlionng.com (Next.js, PostgreSQL, NextAuth) with cron jobs and real-time notifications.",
      "Voice assistants and a BERT-based QA system fine-tuned on context detection.",
    ],
  },
];

export const skills: { group: string; items: string[] }[] = [
  {
    group: "AI / ML",
    items: ["PyTorch", "TensorFlow", "Keras", "TensorRT", "ONNX", "CUDA", "Hugging Face", "ModelScope", "Ultralytics", "OpenCV", "vLLM", "veRL", "NumPy", "Pandas"],
  },
  {
    group: "Languages",
    items: ["Python", "C++", "Go", "C#", "Java", "JavaScript", "Bash", "SQL"],
  },
  {
    group: "Web / Full-stack",
    items: ["Next.js", "React", "Three.js", "WebGL", "Unity", "Flask", "FastAPI", "Gin", "GoFiber"],
  },
  {
    group: "Platform / Ops",
    items: ["Docker", "ArgoCD", "Jenkins", "Git", "AWS", "GCP", "PostgreSQL", "PGVector", "MongoDB", "ELK", "Grafana", "Heroku", "Gradle", "Maven"],
  },
];
