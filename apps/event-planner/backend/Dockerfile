FROM python:3.11-slim
WORKDIR /app

COPY apps/event-planner/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/event-planner/backend/ .
COPY apps/_shared/ _shared/
RUN touch _shared/__init__.py

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
