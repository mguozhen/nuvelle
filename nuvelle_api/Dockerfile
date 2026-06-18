ARG PYTHON_IMAGE=python:3.11-slim
FROM ${PYTHON_IMAGE}

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app:/workspace

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY nuvelle_api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY nuvelle_api/ /app/
COPY nuvelle_kit/ /workspace/nuvelle_kit/

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers ${WEB_CONCURRENCY:-1}"]
