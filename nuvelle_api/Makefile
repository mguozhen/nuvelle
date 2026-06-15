PYTHON ?= python3
VENV ?= .venv
PIP := $(VENV)/bin/pip
PY := $(VENV)/bin/python

.PHONY: venv install db-up db-down dev test lint format typecheck migrate revision clean

venv:
	$(PYTHON) -m venv $(VENV)
	$(PIP) install --upgrade pip

install: venv
	$(PIP) install -r requirements-dev.txt

db-up:
	docker compose --project-directory .. up -d postgres

db-down:
	docker compose --project-directory .. down

dev:
	$(PY) -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

test:
	$(PY) -m pytest

lint:
	$(PY) -m ruff check app tests

format:
	$(PY) -m ruff format app tests

typecheck:
	$(PY) -m mypy app

migrate:
	$(PY) -m alembic upgrade head

revision:
	$(PY) -m alembic revision --autogenerate -m "$(m)"

clean:
	find app tests -type d -name __pycache__ -prune -exec rm -rf {} +
	rm -rf .pytest_cache .ruff_cache .mypy_cache
