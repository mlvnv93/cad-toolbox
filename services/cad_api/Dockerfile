# syntax=docker/dockerfile:1

FROM python:3.12-slim

WORKDIR /app

COPY services/cad_api/requirements.txt /app/services/cad_api/requirements.txt

RUN python -m pip install --no-cache-dir --upgrade pip && python -m pip install --no-cache-dir -r /app/services/cad_api/requirements.txt

COPY drawing-engine /app/drawing-engine
COPY services/cad_api /app/services/cad_api

ENV PYTHONUNBUFFERED=1

CMD ["sh", "-c", "python -m uvicorn services.cad_api.main:app --host 0.0.0.0 --port ${PORT:-10000}"]