/**
 * Plain-text workout parser. Mirror of renderTemplateText() — accepts
 * the format the user filled in their Notes app and turns it into a
 * structured proposal the import flow can review and commit.
 *
 * Format (one block per exercise, blank line between blocks):
 *
 *   Puxada Vertical
 *   Cimerian
 *   4x8x50kg
 *
 *   Remada Máquina
 *   Allfit
 *   3x10x35kg
 *
 * Machine line is optional. Set descriptors accept three layouts:
 *   - SETS x REPS x WEIGHT[kg]    e.g. "4x8x50kg"
 *   - SETS x REPS WEIGHT[kg]      e.g. "4x8 50kg"
 *   - WEIGHT[kg] SETS x REPS      e.g. "50kg 4x8"
 * Multiple set lines per block are allowed (one per line) for
 * non-uniform sessions.
 */

export type ParsedSet = {
  reps: number;
  weightKg: number;
};

export type ParsedExerciseBlock = {
  exerciseName: string;
  machine: string | null;
  sets: ParsedSet[];
  /** Lines we couldn't parse, surfaced in the preview so the user can
      fix and re-paste. Doesn't block commit. */
  warnings: string[];
};

export type ParseResult = {
  /** Optional template name extracted from the header line. */
  templateNameHint: string | null;
  exercises: ParsedExerciseBlock[];
};

export function parseTextualWorkout(text: string): ParseResult {
  // Split into blocks separated by blank lines. Trim each line.
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "") {
      if (current.length > 0) {
        blocks.push(current);
        current = [];
      }
      continue;
    }
    current.push(line);
  }
  if (current.length > 0) blocks.push(current);

  // Header detection: first block contains exactly one line AND that line
  // doesn't parse as a set descriptor → treat as template name hint.
  let templateNameHint: string | null = null;
  if (blocks.length > 0) {
    const first = blocks[0];
    if (first.length === 1 && parseSetLine(first[0]) === null) {
      // Strip trailing "— DATE" portion if present.
      const hint = first[0].replace(/\s*[—-]\s*\d{1,2}.*$/, "").trim();
      templateNameHint = hint || null;
      blocks.shift();
    }
  }

  const exercises: ParsedExerciseBlock[] = [];
  for (const block of blocks) {
    const warnings: string[] = [];
    if (block.length === 0) continue;
    const exerciseName = block[0];
    const remaining = block.slice(1);

    // Decide if line[1] is the machine or already a set. parseSetLine
    // returns non-null when it matches any of the 3 set patterns.
    let machine: string | null = null;
    let setLines: string[];
    if (remaining.length === 0) {
      setLines = [];
    } else if (parseSetLine(remaining[0]) !== null || /^[—-]+$/.test(remaining[0])) {
      // First non-name line is a set OR the placeholder dash → no machine.
      machine = /^[—-]+$/.test(remaining[0]) ? null : machine;
      setLines = /^[—-]+$/.test(remaining[0]) ? remaining.slice(1) : remaining;
    } else {
      machine = remaining[0];
      setLines = remaining.slice(1);
    }

    const sets: ParsedSet[] = [];
    for (const line of setLines) {
      const parsed = parseSetLine(line);
      if (!parsed) {
        warnings.push(`Linha ignorada: "${line}"`);
        continue;
      }
      const count = parsed.sets ?? 1;
      for (let i = 0; i < count; i++) {
        sets.push({ reps: parsed.reps, weightKg: parsed.weightKg });
      }
    }

    exercises.push({ exerciseName, machine, sets, warnings });
  }

  return { templateNameHint, exercises };
}

type ParsedSetLine = {
  sets?: number;
  reps: number;
  weightKg: number;
};

/**
 * Try the three accepted layouts. Returns null if none match. Tolerant
 * of "kg" / "Kg" / "KG" suffix, "x" / "X" / "×" between numbers,
 * commas in place of dots, and arbitrary internal whitespace.
 *
 * "__kg" (placeholder for unfilled weight) returns null on purpose so
 * the import flow surfaces those as ignored without throwing.
 */
export function parseSetLine(raw: string): ParsedSetLine | null {
  if (!raw) return null;
  // Replace × with x for regex, normalize commas, drop "kg" suffix(es).
  const cleaned = raw
    .replace(/×/g, "x")
    .replace(/[Xx]/g, "x")
    .replace(/,/g, ".")
    .replace(/\bkg\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return null;
  // Reject lines that contain non-numeric leftovers (e.g. "__")
  if (/[^\d.\sx]/.test(cleaned)) return null;

  // SETS x REPS x WEIGHT
  const tripleX = cleaned.match(/^(\d+)\s*x\s*(\d+)\s*x\s*(\d+(?:\.\d+)?)$/);
  if (tripleX) {
    return {
      sets: int(tripleX[1]),
      reps: int(tripleX[2]),
      weightKg: parseFloat(tripleX[3]),
    };
  }

  // SETS x REPS WEIGHT
  const setsRepsWeight = cleaned.match(
    /^(\d+)\s*x\s*(\d+)\s+(\d+(?:\.\d+)?)$/
  );
  if (setsRepsWeight) {
    return {
      sets: int(setsRepsWeight[1]),
      reps: int(setsRepsWeight[2]),
      weightKg: parseFloat(setsRepsWeight[3]),
    };
  }

  // WEIGHT SETS x REPS
  const weightSetsReps = cleaned.match(
    /^(\d+(?:\.\d+)?)\s+(\d+)\s*x\s*(\d+)$/
  );
  if (weightSetsReps) {
    return {
      sets: int(weightSetsReps[2]),
      reps: int(weightSetsReps[3]),
      weightKg: parseFloat(weightSetsReps[1]),
    };
  }

  return null;
}

function int(s: string): number {
  return parseInt(s, 10);
}
