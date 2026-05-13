FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY apps/event-flyer-studio/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/event-flyer-studio/backend/ .
COPY apps/_shared/ _shared/
RUN touch _shared/__init__.py

EXPOSE 8000
CMD ["python3", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
