import { notFound } from "next/navigation";
import { WatchDramaPlayer } from "@/components/watch-drama-player";
import { fetchDramaDetail } from "@/lib/dramas/api";

type WatchPageProps = {
  params: Promise<{ id: string }>;
};

export default async function WatchPage({ params }: WatchPageProps) {
  const { id } = await params;
  const dramaId = Number(id);
  if (!Number.isInteger(dramaId) || dramaId <= 0) {
    notFound();
  }

  const drama = await fetchDramaDetail(dramaId);
  if (!drama) {
    notFound();
  }

  return <WatchDramaPlayer drama={drama} locale="en" />;
}
