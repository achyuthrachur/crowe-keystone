FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies needed by some Python packages
# (psycopg2-binary, asyncpg, cryptography etc. may need build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Expose the application port
EXPOSE 8000

# Run Alembic migrations then start the server.
# --workers 1 is REQUIRED — the SSE in-memory queue in stream.py
# is not shared across worker processes. See src/main.py for notes.
CMD ["sh", "-c", "\
  echo 'Checking required environment variables...' && \
  : ${DATABASE_URL:?DATABASE_URL is required} && \
  : ${DATABASE_URL_SYNC:?DATABASE_URL_SYNC is required} && \
  : ${SECRET_KEY:?SECRET_KEY is required} && \
  echo 'Environment OK. Running migrations...' && \
  alembic upgrade head && \
  echo 'Migrations complete. Starting server...' && \
  uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --log-level info \
"]
