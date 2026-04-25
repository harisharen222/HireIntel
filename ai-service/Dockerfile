FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    HF_HOME=/home/app/.cache/huggingface

WORKDIR /app

# System deps for pdfplumber (pdfminer wheels are pure Python, but libgomp1
# is a torch runtime requirement).
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    curl \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --create-home --shell /bin/bash app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Pre-download the model into the image to avoid cold-start egress.
# Comment out if you'd rather mount a cache volume.
RUN python -c "from sentence_transformers import SentenceTransformer; \
    SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

RUN mkdir -p /data/uploads && chown -R app:app /data /app /home/app

USER app

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD curl -fs http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
