from nuvelle_crawler.config import get_settings
from nuvelle_crawler.sources.base import DramaSourceAdapter
from nuvelle_crawler.sources.config import get_source_config
from nuvelle_crawler.sources.reelshort_cps.adapter import ReelShortCpsAdapter


def get_adapter(source: str) -> DramaSourceAdapter:
    source_config = get_source_config(source)
    if source_config["adapter"] == "reelshort_cps":
        return ReelShortCpsAdapter(token=get_settings().reelshort_cps_token)
    raise ValueError(f"Unsupported adapter for source: {source}")

