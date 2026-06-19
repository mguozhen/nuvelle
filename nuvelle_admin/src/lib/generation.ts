import type { GenerationState } from "@/types/drama";
import type { TranslationKey } from "@/i18n";

const progressByStatus: Record<string, number> = {
  queued: 5,
  downloading: 25,
  rendering: 70,
  done: 100,
  error: 100
};

const statusRank: Record<string, number> = {
  rendering: 4,
  downloading: 3,
  queued: 2,
  done: 1
};

export function generationProgress(status?: string | null, explicit?: number): number {
  if (typeof explicit === "number") {
    return Math.max(0, Math.min(100, explicit));
  }

  return progressByStatus[status || ""] || 0;
}

export function isActiveGeneration(status?: string | null): boolean {
  return status === "queued" || status === "downloading" || status === "rendering";
}

export function isDisabledGeneration(status?: string | null): boolean {
  return isActiveGeneration(status) || status === "done";
}

export function preferredGenerationStatus(current?: string | null, candidate?: string | null): string | null {
  if (!candidate || candidate === "error") {
    return current || null;
  }

  if (!current) {
    return candidate;
  }

  return (statusRank[candidate] || 0) > (statusRank[current] || 0) ? candidate : current;
}

export function generationState(status?: string | null, progress?: number): GenerationState {
  const normalizedStatus = status || null;
  return {
    disabled: isDisabledGeneration(normalizedStatus),
    status: normalizedStatus,
    progress: generationProgress(normalizedStatus, progress)
  };
}

export function generationLabel(
  t: (key: TranslationKey, values?: Record<string, string | number>) => string,
  state: GenerationState,
  fallback: string,
): string {
  if (state.status === "done") {
    return t("generation.done");
  }
  if (state.status === "downloading") {
    return t("generation.downloading", { progress: state.progress || 0 });
  }
  if (state.status === "rendering") {
    return t("generation.rendering", { progress: state.progress || 0 });
  }
  if (state.status === "queued") {
    return t("generation.queued", { progress: state.progress || 0 });
  }
  return fallback;
}
