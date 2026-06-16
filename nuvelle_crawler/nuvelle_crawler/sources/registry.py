from nuvelle_crawler.config import get_settings
from nuvelle_crawler.sources.base import DramaSourceAdapter
from nuvelle_crawler.sources.config import get_source_config
from nuvelle_crawler.sources.dramacps_materials.adapter import DramaCpsMaterialsAdapter
from nuvelle_crawler.sources.reelshort_cps.adapter import ReelShortCpsAdapter


def get_adapter(source: str) -> DramaSourceAdapter:
    source_config = get_source_config(source)
    settings = get_settings()
    if source_config["adapter"] == "reelshort_cps":
        return ReelShortCpsAdapter(token=settings.reelshort_cps_token)
    if source_config["adapter"] == "dramacps_materials":
        return DramaCpsMaterialsAdapter(base_url=settings.dramacps_materials_api_base_url)
    raise ValueError(f"Unsupported adapter for source: {source}")
