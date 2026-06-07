export type ScoreBand = {
  min_percent: number;
  points: number;
};

export const DEFAULT_SCORE_BANDS: ScoreBand[] = [
  { min_percent: 0, points: 0 },
  { min_percent: 60, points: 1 },
  { min_percent: 80, points: 2 },
  { min_percent: 90, points: 3 },
];

export const defaultScoreBands = (): ScoreBand[] =>
  DEFAULT_SCORE_BANDS.map((b) => ({ ...b }));

export function scoreBandsFromContent(content: Record<string, unknown> | undefined): ScoreBand[] {
  const raw = content?.score_bands;
  if (!Array.isArray(raw) || raw.length === 0) {
    return defaultScoreBands();
  }
  const bands: ScoreBand[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const min_percent = Number(o.min_percent);
    const points = Number(o.points);
    if (Number.isNaN(min_percent) || Number.isNaN(points)) continue;
    bands.push({
      min_percent: Math.max(0, Math.min(100, Math.round(min_percent))),
      points: Math.max(0, Math.round(points)),
    });
  }
  if (!bands.length) return defaultScoreBands();
  bands.sort((a, b) => a.min_percent - b.min_percent);
  if (bands[0].min_percent !== 0) {
    bands.unshift({ min_percent: 0, points: 0 });
  }
  return bands;
}

export function scoreBandsToContent(bands: ScoreBand[]): ScoreBand[] {
  return bands
    .map((b) => ({
      min_percent: Math.max(0, Math.min(100, Math.round(b.min_percent))),
      points: Math.max(0, Math.round(b.points)),
    }))
    .sort((a, b) => a.min_percent - b.min_percent);
}

export function maxPointsFromBands(bands: ScoreBand[]): number {
  if (!bands.length) return 0;
  return Math.max(...bands.map((b) => b.points));
}

export function validateScoreBands(bands: ScoreBand[]): string | null {
  if (bands.length < 2) {
    return "scoreBandsErrorMinRows";
  }
  const sorted = [...bands].sort((a, b) => a.min_percent - b.min_percent);
  if (sorted[0].min_percent !== 0) {
    return "scoreBandsErrorFirstZero";
  }
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i];
    if (b.min_percent < 0 || b.min_percent > 100) {
      return "scoreBandsErrorPercentRange";
    }
    if (b.points < 0 || !Number.isInteger(b.points)) {
      return "scoreBandsErrorPoints";
    }
    if (i > 0) {
      const prev = sorted[i - 1];
      if (b.min_percent < prev.min_percent) {
        return "scoreBandsErrorOrderPercent";
      }
      if (b.points < prev.points) {
        return "scoreBandsErrorOrderPoints";
      }
    }
  }
  return null;
}
