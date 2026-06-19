from __future__ import annotations

import io
import zipfile
from collections.abc import Sequence

from nuvelle_kit.storage import slugify

from app.models.promo_job import PromoJob, PromoJobStatus
from app.services.promo_asset_store import PromoAssetStore
from app.services.promo_assets import PROMO_CAPTION_FILE, PROMO_PLAN_FILE, PROMO_TEASER_FILE, read_plan_text


class PromoBatchPackager:
    def __init__(self, asset_store: PromoAssetStore) -> None:
        self.asset_store = asset_store

    def build_zip(self, *, title: str, jobs: Sequence[PromoJob]) -> tuple[str, bytes]:
        buf = io.BytesIO()
        prefix = slugify(title)
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            summary_lines = [f"{title} - TikTok promo pack\n{'=' * 50}\n"]
            for job in sorted(jobs, key=lambda value: value.episode):
                if job.status != PromoJobStatus.done.value or not job.output_dir:
                    continue
                self._write_job_assets(zf, prefix=prefix, job=job, summary_lines=summary_lines)
            zf.writestr(f"{prefix}_summary.txt", "\n".join(summary_lines))
        return f"{prefix}_promo_pack.zip", buf.getvalue()

    def _write_job_assets(
        self,
        zf: zipfile.ZipFile,
        *,
        prefix: str,
        job: PromoJob,
        summary_lines: list[str],
    ) -> None:
        if not job.output_dir:
            return

        if self.asset_store.exists(job.output_dir, PROMO_TEASER_FILE):
            teaser = self.asset_store.read_asset(job.output_dir, PROMO_TEASER_FILE)
            zf.writestr(f"{prefix}_EP{job.episode}.mp4", teaser.content)

        caption = self.asset_store.read_text(job.output_dir, PROMO_CAPTION_FILE).strip()
        plan = read_plan_text(self.asset_store.read_text(job.output_dir, PROMO_PLAN_FILE))
        hook_value = plan.get("hook", [])
        hook = " / ".join(str(part) for part in hook_value) if isinstance(hook_value, list) else ""
        logline = plan.get("logline", "")
        summary_lines.extend(
            [
                f"\nEP{job.episode}\n{'-' * 30}",
                f"Title: {hook}",
                f"Logline: {logline}",
                f"TikTok safe: {'yes' if job.tt_safe else 'review - ' + (job.tt_notes or '')}",
                f"Caption:\n{caption}\n",
            ]
        )
