/**
 * Server-only mesocycle queries. Lives in a separate file so the pure
 * `mesocycle.ts` (phase generation, volume math) can be safely imported
 * from client components without dragging in `next/headers`.
 */

import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  ActiveMesocycle,
  MesocycleRow,
  MesocycleWeekRow,
} from "./mesocycle";

function todayDateStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/**
 * Returns the currently active mesocycle (most recent one whose date range
 * includes today, or whose end is open). Null if there's no active block.
 *
 * "Current week" is computed by date arithmetic so the user can log
 * sessions across days within the same week_starts_on grouping.
 */
export async function getActiveMesocycle(): Promise<ActiveMesocycle | null> {
  try {
    const supabase = await createClient();
    const today = todayDateStr();

    const { data: mesoRows } = await supabase
      .from("mesocycles")
      .select(
        "id, name, starts_on, ends_on, total_weeks, source, user_notes, created_at"
      )
      .lte("starts_on", today)
      .or(`ends_on.is.null,ends_on.gte.${today}`)
      .order("starts_on", { ascending: false })
      .limit(1);

    const mesocycle = (mesoRows ?? [])[0] as MesocycleRow | undefined;
    if (!mesocycle) return null;

    const { data: weekRows } = await supabase
      .from("mesocycle_weeks")
      .select(
        "id, mesocycle_id, week_number, week_starts_on, phase, volume_targets, intensity_target, coach_reasoning, user_overrode"
      )
      .eq("mesocycle_id", mesocycle.id)
      .order("week_number", { ascending: true });

    const weeks = (weekRows ?? []) as MesocycleWeekRow[];

    // Current week = the latest week whose week_starts_on <= today.
    const todayMs = new Date(today + "T12:00:00").getTime();
    let currentWeek: MesocycleWeekRow | null = null;
    for (const w of weeks) {
      if (new Date(w.week_starts_on + "T12:00:00").getTime() <= todayMs) {
        currentWeek = w;
      } else {
        break;
      }
    }

    return {
      mesocycle,
      weeks,
      currentWeek,
      currentWeekNumber: currentWeek?.week_number ?? null,
    };
  } catch {
    return null;
  }
}
