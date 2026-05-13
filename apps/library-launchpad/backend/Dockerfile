FROM python:3.12-slim

WORKDIR /app

COPY apps/library-launchpad/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/library-launchpad/backend/ /app/
COPY apps/_shared/ /app/_shared/

# Make _shared importable
RUN touch /app/_shared/__init__.py

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
