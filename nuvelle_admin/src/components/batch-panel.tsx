import { DEFAULT_BACKEND_URL } from "@/lib/backend";
import { useI18n } from "@/i18n";

type BatchPanelProps = {
  batchId?: string;
  done?: number;
  total?: number;
  onClose?: () => void;
};

export function BatchPanel({ batchId, done = 0, total = 0, onClose }: BatchPanelProps) {
  const { t } = useI18n();

  if (!batchId) {
    return null;
  }

  const downloadHref = `${DEFAULT_BACKEND_URL}/promo/batches/${encodeURIComponent(batchId)}/download`;

  return (
    <aside className="fixed bottom-5 right-5 z-[200] w-[360px] rounded-2xl border border-white/10 bg-[#151826] p-4 shadow-2xl">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{t("batch.title")}</h2>
        <button className="text-[#9aa2c0]" type="button" onClick={onClose}>
          {t("batch.close")}
        </button>
      </div>
      <p className="mt-2 text-sm text-[#9aa2c0]">
        {t("batch.episodesComplete", { done, total })}
      </p>
      <a className="mt-3 block rounded-xl bg-[linear-gradient(135deg,#b25cff,#ff5fbf)] px-4 py-3 text-center text-sm font-bold" href={downloadHref}>
        {t("batch.download")}
      </a>
    </aside>
  );
}
