#!/usr/bin/env python3
"""Backward-compatible CLI wrapper for the Nuvelle promo generator."""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from nuvelle_kit.cli import main  # noqa: E402


if __name__ == "__main__":
    raise SystemExit(main())
