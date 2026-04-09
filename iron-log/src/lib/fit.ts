/**
 * Thin wrapper around fit-file-parser exposing only the fields we care
 * about. Called from server-side upload routes.
 *
 * We intentionally flatten multiple sessions/records into a single summary
 * because:
 *  - Coros strength recordings produce 1 session
 *  - For cardio we only care about totals
 *
 * If the watch reports multiple sessions in a single FIT (multi-sport
 * workout), we fall back to sum/max/avg aggregates across them.
 */
import FitParser from "fit-file-parser";

export type FitSummary = {
  /** ISO timestamp of the session start. */
  startTime: string | null;
  /** Total elapsed seconds (wall clock, not just moving time). */
  durationSeconds: number | null;
  /** Active/moving time in seconds. */
  movingSeconds: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  /** Total kilocalories reported by the device. */
  calories: number | null;
  /** Total distance in kilometers (for cardio; null for strength). */
  distanceKm: number | null;
  /** FIT "sport" enum value (e.g. "running", "walking", "training"). */
  sport: string | null;
  /** FIT "sub_sport" enum value (e.g. "strength_training", "casual_walking"). */
  subSport: string | null;
};

export type FitParseResult =
  | { ok: true; summary: FitSummary }
  | { ok: false; error: string };

function averageOf(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function maxOf(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.max(...values);
}

function sumOf(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export async function parseFit(buffer: ArrayBuffer): Promise<FitParseResult> {
  try {
    const parser = new FitParser({
      force: true,
      speedUnit: "km/h",
      lengthUnit: "km",
      temperatureUnit: "celsius",
      elapsedRecordField: true,
      mode: "list",
    });

    const data = await parser.parseAsync(buffer);
    const sessions = data.sessions ?? [];
    if (sessions.length === 0) {
      // Some Strength FIT files don't write a session message; fall back
      // to scanning records for HR + timestamps.
      return summarizeFromRecords(data.records ?? []);
    }

    // Collect aggregates across all sessions (usually one).
    const avgHrs: number[] = [];
    const maxHrs: number[] = [];
    const durations: number[] = [];
    const moving: number[] = [];
    const distances: number[] = [];
    const calories: number[] = [];
    let startTime: string | null = null;
    let sport: string | null = null;
    let subSport: string | null = null;

    for (const s of sessions) {
      if (typeof s.avg_heart_rate === "number") avgHrs.push(s.avg_heart_rate);
      if (typeof s.max_heart_rate === "number") maxHrs.push(s.max_heart_rate);
      if (typeof s.total_elapsed_time === "number")
        durations.push(s.total_elapsed_time);
      if (typeof s.total_timer_time === "number")
        moving.push(s.total_timer_time);
      if (typeof s.total_distance === "number") distances.push(s.total_distance);
      if (typeof s.total_calories === "number") calories.push(s.total_calories);
      if (!startTime && s.start_time) startTime = s.start_time;
      if (!sport && s.sport) sport = s.sport;
      if (!subSport && s.sub_sport) subSport = s.sub_sport;
    }

    return {
      ok: true,
      summary: {
        startTime,
        durationSeconds:
          durations.length > 0 ? Math.round(sumOf(durations)) : null,
        movingSeconds: moving.length > 0 ? Math.round(sumOf(moving)) : null,
        avgHeartRate: averageOf(avgHrs),
        maxHeartRate: maxOf(maxHrs),
        calories: calories.length > 0 ? Math.round(sumOf(calories)) : null,
        distanceKm:
          distances.length > 0
            ? Math.round(sumOf(distances) * 100) / 100
            : null,
        sport,
        subSport,
      },
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Falha ao processar o arquivo FIT.";
    return { ok: false, error: message };
  }
}

/**
 * Fallback path when the FIT has no session message. Walks the record
 * stream and computes HR stats + a rough duration from timestamps.
 */
function summarizeFromRecords(
  records: Array<{
    heart_rate?: number;
    timestamp?: string;
    distance?: number;
  }>
): FitParseResult {
  if (records.length === 0) {
    return {
      ok: false,
      error: "Arquivo FIT vazio — nada pra processar.",
    };
  }

  const hrs = records
    .map((r) => r.heart_rate)
    .filter((v): v is number => typeof v === "number" && v > 0);

  let startTime: string | null = null;
  let endTime: string | null = null;
  for (const r of records) {
    if (r.timestamp) {
      if (!startTime) startTime = r.timestamp;
      endTime = r.timestamp;
    }
  }
  const durationSeconds =
    startTime && endTime
      ? Math.max(
          0,
          Math.round(
            (new Date(endTime).getTime() - new Date(startTime).getTime()) /
              1000
          )
        )
      : null;

  // Distance: if the last record has a distance value (cumulative), use it.
  const lastWithDistance = [...records]
    .reverse()
    .find((r) => typeof r.distance === "number");
  const distanceKm =
    lastWithDistance && typeof lastWithDistance.distance === "number"
      ? Math.round(lastWithDistance.distance * 100) / 100
      : null;

  return {
    ok: true,
    summary: {
      startTime,
      durationSeconds,
      movingSeconds: durationSeconds,
      avgHeartRate: averageOf(hrs),
      maxHeartRate: maxOf(hrs),
      calories: null,
      distanceKm,
      sport: null,
      subSport: null,
    },
  };
}
