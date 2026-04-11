/**
 * Standard 5-zone HR model (% of HR max):
 *  Z1  50-60%  recuperação
 *  Z2  60-70%  endurance / queima de gordura
 *  Z3  70-80%  aeróbico
 *  Z4  80-90%  limiar
 *  Z5  90-100% VO2 max / anaeróbico
 *
 * Anything below 50% is "abaixo de zona" (rest, walk to/from gym, etc).
 */

export type Zone = 0 | 1 | 2 | 3 | 4 | 5;

export type ZoneSeconds = {
  z1: number;
  z2: number;
  z3: number;
  z4: number;
  z5: number;
};

export type HrSampleLite = { t: number; hr: number };

export function zoneFor(hr: number, maxHr: number): Zone {
  if (maxHr <= 0) return 0;
  const pct = hr / maxHr;
  if (pct < 0.5) return 0;
  if (pct < 0.6) return 1;
  if (pct < 0.7) return 2;
  if (pct < 0.8) return 3;
  if (pct < 0.9) return 4;
  return 5;
}

/**
 * Walk through downsampled HR samples and accumulate seconds per zone.
 * Each sample is treated as the start of an interval whose duration is
 * the gap to the next sample. Gaps larger than 60s are dropped to avoid
 * counting watch-paused intervals.
 */
export function computeZoneSeconds(
  samples: HrSampleLite[],
  maxHr: number
): ZoneSeconds {
  const out: ZoneSeconds = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };
  if (!samples || samples.length < 2 || maxHr <= 0) return out;

  for (let i = 0; i < samples.length - 1; i++) {
    const dt = samples[i + 1].t - samples[i].t;
    if (dt <= 0 || dt > 60) continue;
    const zone = zoneFor(samples[i].hr, maxHr);
    if (zone === 0) continue;
    if (zone === 1) out.z1 += dt;
    else if (zone === 2) out.z2 += dt;
    else if (zone === 3) out.z3 += dt;
    else if (zone === 4) out.z4 += dt;
    else out.z5 += dt;
  }

  return out;
}

export function totalZoneSeconds(z: ZoneSeconds): number {
  return z.z1 + z.z2 + z.z3 + z.z4 + z.z5;
}

export function formatZoneMinutes(seconds: number): string {
  if (seconds <= 0) return "0";
  const m = Math.round(seconds / 60);
  if (m === 0) return "<1m";
  return `${m}m`;
}
