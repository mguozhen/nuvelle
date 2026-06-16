import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CRAWLER_PACKAGE_ROOT = ROOT / "nuvelle_crawler"

if str(CRAWLER_PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(CRAWLER_PACKAGE_ROOT))
