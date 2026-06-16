ARG PYTHON_IMAGE=python:3.11-slim
FROM ${PYTHON_IMAGE}

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

COPY nuvelle_crawler/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY nuvelle_crawler/nuvelle_crawler/ /app/nuvelle_crawler/

EXPOSE 8080

CMD ["uvicorn", "nuvelle_crawler.main:app", "--host", "0.0.0.0", "--port", "8080"]

