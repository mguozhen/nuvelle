import { notFound } from "next/navigation";
import { WatchDramaPlayer } from "@/components/watch-drama-player";
import { fetchDramaDetail } from "@/lib/dramas/api";
import { getLocaleByRouteParam } from "@/lib/i18n";

type LocalizedWatchPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function LocalizedWatchPage({ params }: LocalizedWatchPageProps) {
  const { locale, id } = await params;
  const localeInfo = getLocaleByRouteParam(locale);
  const dramaId = Number(id);
  if (!localeInfo || !Number.isInteger(dramaId) || dramaId <= 0) {
    notFound();
  }

  const drama = await fetchDramaDetail(dramaId);
  if (!drama) {
    notFound();
  }

  return <WatchDramaPlayer drama={drama} locale={localeInfo.key} />;
}
