# HireIntel (formerly TalentMatch AI)

HireIntel is an applicant tracking system that automatically matches candidates to job descriptions. It reads resumes, identifies skills, and compares them against job requirements using artificial intelligence.

## Features

- **Resume Parsing**: Reads PDF resumes and extracts text, years of experience, and skills.
- **Semantic Matching**: Uses the `all-MiniLM-L6-v2` AI model to understand the meaning behind resumes and job descriptions, making the matching process highly accurate.
- **Distributed Architecture**: The system is split into multiple parts (frontend, backend API, AI service, and database) so it can run entirely on free cloud platforms without performance issues.
- **Secure Processing**: Resumes are sent directly to the AI service's memory and are not saved on the disk.

## System Architecture

The application is built using a modern technology stack separated into four main components:

| Component | Technology | Description |
| --- | --- | --- |
| **Frontend** | React, TypeScript, Vite | The user interface for candidates and recruiters. |
| **Backend API** | Node.js, Express, Prisma | Manages users, authentication, and database connections. |
| **AI Service** | Python, FastAPI | Runs the machine learning models and parses PDF files. |
| **Database** | PostgreSQL, pgvector | Stores user data and mathematical representations (vectors) of resumes. |

## Local Development Setup

To run the application on your computer, you will need Docker installed. Docker will automatically download the required software and start the services.

1. Clone the repository:
```bash
git clone https://github.com/harisharen222/HireIntel.git
cd HireIntel
```

2. Configure environment variables:
```bash
cp .env.example .env
```

3. Start the application:
```bash
docker compose up -d --build
```

The services will be available at:
- Frontend Interface: `http://localhost:5173`
- Backend API: `http://localhost:4000/api`

## Cloud Deployment

Because the AI service requires significant memory, the application is designed to be hosted across four separate free services. 

> [!NOTE]
> Standard free-tier platforms cannot run the heavy AI model. This specific deployment strategy ensures the application remains entirely free while performing well.

### 1. Database (Supabase)
Create a free PostgreSQL database on Supabase. Run the `docker/init.sql` script in the Supabase SQL editor to create the necessary tables and enable the `pgvector` extension.

### 2. AI Service (Hugging Face Spaces)
Create a free Docker Space on Hugging Face. Upload the `ai-service` folder. Set the `INTERNAL_API_KEY`, `DATABASE_URL`, and `GROQ_API_KEY` as space secrets.

### 3. Backend API (Render)
Deploy the `backend` folder as a Web Service on Render. Set the environment variables to connect to your Supabase database and your Hugging Face AI service.

### 4. Frontend (Vercel)
Deploy the `frontend` folder on Vercel. Set the `VITE_API_URL` environment variable to point to your Render backend URL.

## Security

> [!IMPORTANT]
> The AI Service must remain internal. It is protected by the `INTERNAL_API_KEY`. Only the Node.js backend should communicate with it directly.

- Authentication is handled using secure, HTTP-only cookies.
- Cross-Origin Resource Sharing (CORS) is strictly configured to only accept requests from the designated frontend domain.
