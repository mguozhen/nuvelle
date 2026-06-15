import type { DramaRecord } from "@/types/drama";

const tastePatterns = [
  { tag: "hidden identity", pattern: /\b(hidden identity|secret identity|disguise|heiress)\b/i },
  { tag: "revenge", pattern: /\b(revenge|vengeance|betray|betrayed)\b/i },
  { tag: "billionaire", pattern: /\b(billionaire|ceo|tycoon|empire)\b/i },
  { tag: "mafia", pattern: /\b(mafia|don|mob|bodyguard)\b/i },
  { tag: "werewolf", pattern: /\b(werewolf|alpha|luna|omega|pack)\b/i },
  { tag: "reborn", pattern: /\b(reborn|reincarnat|restart)\b/i },
  { tag: "second chance", pattern: /\b(second chance|again|one day before)\b/i }
];

function textFor(drama: DramaRecord): string {
  return [drama.title, drama.platform, drama.genre, drama.signal, drama.synopsis_or_hook].filter(Boolean).join(" ");
}

function parseMagnitude(rawValue: string, suffix?: string): number {
  const value = Number(rawValue.replace(/,/g, ""));
  const normalizedSuffix = suffix?.toLowerCase();

  if (normalizedSuffix === "b") {
    return value * 1_000_000_000;
  }

  if (normalizedSuffix === "m") {
    return value * 1_000_000;
  }

  if (normalizedSuffix === "k") {
    return value * 1_000;
  }

  return value;
}

function revenueFrom(signal = ""): number {
  const match = signal.match(/(?:revenue\s*)?\$\s*([\d,.]+)\s*([kmb])?/i);
  return match ? parseMagnitude(match[1], match[2]) : 0;
}

function promotersFrom(signal = ""): number {
  const match = signal.match(/([\d,.]+)\s*([kmb])?\s*promoters/i);
  return match ? parseMagnitude(match[1], match[2]) : 0;
}

function episodeCount(drama: DramaRecord): number {
  const raw = drama.episode_count;

  if (typeof raw === "number") {
    return raw;
  }

  if (typeof raw === "string") {
    const match = raw.match(/\d+/);
    return match ? Number(match[0]) : 0;
  }

  return 0;
}

export function tasteScore(drama: DramaRecord): { score: number; tags: string[] } {
  const text = textFor(drama);
  const tags = tastePatterns.filter((item) => item.pattern.test(text)).map((item) => item.tag);

  if (/\brevenue\b|\$/.test(text)) {
    tags.unshift("revenue");
  }

  return {
    score: Math.min(32, tags.length * 8),
    tags: Array.from(new Set(tags))
  };
}

export function nuvelleScore(drama: DramaRecord): number {
  const taste = tasteScore(drama);
  const revenue = revenueFrom(drama.signal);
  const promoters = promotersFrom(drama.signal);
  const revenueScore = Math.min(30, Math.log10(Math.max(revenue, 1)) * 5);
  const promoterScore = Math.min(14, promoters / 1_000);
  const videoScore = drama.video_url ? 8 : 0;
  const episodeScore = Math.min(6, episodeCount(drama) / 8);
  const score = 20 + taste.score + revenueScore + promoterScore + videoScore + episodeScore;

  return Math.max(0, Math.min(100, Math.round(score)));
}
