# HireIntel (formerly TalentMatch AI) 🚀

HireIntel is an AI-powered applicant tracking and candidate matching system. It parses PDF resumes, extracts skills using NLP, generates semantic embeddings, and matches candidates to job descriptions with lightning speed and accuracy.

## 🌟 Key Features

- **Smart CV Parsing**: Automatically extracts text, years of experience, and skills from uploaded PDF resumes using `pdfplumber`.
- **Semantic Vector Matching**: Uses Hugging Face's `all-MiniLM-L6-v2` to create vector embeddings of resumes and job descriptions, performing similarity searches to find the perfect fit.
- **Microservice Architecture**: A robust three-tier architecture separating the React frontend, Node.js API Gateway, and Python AI Engine.
- **Secure & Ephemeral**: PDF files are streamed entirely in-memory using multipart uploads between the backend and AI service. No residual files are left on the servers.
- **Cloud-Ready**: Designed to be deployed seamlessly across modern free-tier cloud providers (Supabase, Hugging Face Spaces, Render, Vercel).

## 🏗️ Architecture Stack

### Frontend (Vercel)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS & Lucide Icons
- **State/Routing**: React Router DOM & Axios

### Backend BFF / API Gateway (Render)
- **Framework**: Node.js & Express.js (TypeScript)
- **Database ORM**: Prisma
- **Authentication**: JWT with secure, HTTP-only cookies
- **Security**: Helmet, Express Rate Limit, Pino logging

### AI & NLP Service (Hugging Face Spaces)
- **Framework**: Python 3.11 & FastAPI
- **Model**: `sentence-transformers/all-MiniLM-L6-v2` (PyTorch)
- **Processing**: `pdfplumber` for structured PDF extraction

### Database (Supabase)
- **Engine**: PostgreSQL 16
- **Vector Search**: `pgvector` extension for storing and querying 384-dimensional embeddings

## 🚀 Local Development (Docker)

The easiest way to run the entire stack locally is using Docker Compose. It will spin up the Postgres database (with pgvector), the Python AI service, the Node backend, and the Vite frontend.

### Prerequisites
- Docker and Docker Compose installed.

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/harisharen222/HireIntel.git
   cd HireIntel
   ```
2. Set up your environment variables:
   Copy the example file and edit it:
   ```bash
   cp .env.example .env
   ```
3. Boot the stack:
   ```bash
   docker compose up -d --build
   ```
4. Access the services:
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:4000/api`
   - AI Service API: `http://localhost:8000` (Internal only by default)

## ☁️ Cloud Deployment (The "Frankenstein" Free Stack)

Because AI models require significant RAM, standard free-tier hosting (like Render or Heroku) cannot run the AI Service. HireIntel is architected to be distributed across 4 free services securely:

1. **Supabase**: Hosts the PostgreSQL database with the `pgvector` extension.
2. **Hugging Face Spaces**: Hosts the FastAPI AI service in a 16GB Docker space (secured by `INTERNAL_API_KEY`).
3. **Render**: Hosts the Node.js backend.
4. **Vercel**: Hosts the static React frontend.

*See the internal documentation for step-by-step deployment instructions.*

## 🔒 Security

- All cross-service communication (Backend <-> AI Service) is secured using a shared `INTERNAL_API_KEY`.
- JWTs are stored in `HttpOnly` cookies to prevent XSS attacks.
- Strict CORS policies are enforced to only allow the designated frontend origin.

---
*Built from the ground up for modern AI recruitment.*
