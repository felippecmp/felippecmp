"use client";

import { useMemo } from "react";
import { BottomSheet } from "./BottomSheet";

/**
 * Plate calculator — given a target weight on a barbell, computes the
 * per-side breakdown using standard kg plates. Visualizes the loaded bar
 * mirrored at center.
 *
 * Ported from the v2 handoff (interactions.jsx → PlateCalculator). Default
 * bar weight is 20kg (standard olympic). Pass `barKg` to use a smaller bar
 * (e.g. 15kg women's bar, 10kg trainer).
 */
const PLATE_SIZES_KG = [25, 20, 15, 10, 5, 2.5, 1.25] as const;

const PLATE_COLOR: Record<number, string> = {
  25: "#FF3D7F", // rosa — heavy headliner; matches the v2 primary
  20: "#E8443D", // red — IPF spec
  15: "#F2C130", // yellow — IPF spec
  10: "#2B6DBF", // blue
  5: "#E8E8E8", // white
  2.5: "#1A1A1A", // black
  1.25: "#5A5A5A", // grey
};

function plateHeight(kg: number): number {
  if (kg >= 20) return 64;
  if (kg >= 15) return 56;
  if (kg >= 10) return 46;
  if (kg >= 5) return 36;
  if (kg >= 2.5) return 26;
  return 20;
}

function plateWidth(kg: number): number {
  if (kg >= 20) return 11;
  if (kg >= 15) return 10;
  if (kg >= 10) return 8;
  if (kg >= 5) return 6;
  if (kg >= 2.5) return 4;
  return 3;
}

export function PlateCalculator({
  open,
  onClose,
  weightKg,
  barKg = 20,
}: {
  open: boolean;
  onClose: () => void;
  weightKg: number;
  barKg?: number;
}) {
  const breakdown = useMemo(() => {
    const perSide = (weightKg - barKg) / 2;
    if (perSide <= 0) return { perSide: 0, plates: [] as Array<{ kg: number; n: number }> };
    let remaining = perSide;
    const out: Array<{ kg: number; n: number }> = [];
    for (const p of PLATE_SIZES_KG) {
      const n = Math.floor(remaining / p);
      if (n > 0) {
        out.push({ kg: p, n });
        remaining = Math.round((remaining - n * p) * 100) / 100;
      }
    }
    return { perSide, plates: out };
  }, [weightKg, barKg]);

  const platesFlat = breakdown.plates.flatMap(({ kg, n }) => Array(n).fill(kg));

  return (
    <BottomSheet open={open} onClose={onClose} ariaLabel="Calculadora de anilhas">
      <div className="px-5 py-3">
        <p className="tlog-eyebrow text-[var(--text-muted)]">
          Calculadora de anilhas
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span
            className="tnum font-extrabold leading-none"
            style={{
              fontSize: 48,
              color: "var(--accent)",
              letterSpacing: "-0.04em",
            }}
          >
            {Number.isInteger(weightKg) ? weightKg : weightKg.toFixed(1)}
          </span>
          <span className="text-base font-bold text-[var(--text-soft)]">
            kg
          </span>
          <span className="ml-2 text-[11px] text-[var(--text-muted)] tnum">
            barra {barKg}kg + {breakdown.perSide}kg/lado
          </span>
        </div>

        {/* Loaded bar visual — plates mirrored around the bar center. */}
        <div className="mt-5 flex items-center justify-center gap-[2px] rounded-2xl border border-[var(--border)] bg-[var(--bg-hover)] py-5 px-3">
          {[...platesFlat].reverse().map((p, i) => (
            <div
              key={`l-${i}`}
              className="rounded-sm"
              style={{
                width: plateWidth(p),
                height: plateHeight(p),
                background: PLATE_COLOR[p] ?? "#5A5A5A",
              }}
              aria-hidden="true"
            />
          ))}
          <div
            className="h-1.5 max-w-[80px] flex-1 rounded-sm"
            style={{
              background: "linear-gradient(to bottom, #8A8A8A, #5A5A5A)",
            }}
            aria-hidden="true"
          />
          {platesFlat.map((p, i) => (
            <div
              key={`r-${i}`}
              className="rounded-sm"
              style={{
                width: plateWidth(p),
                height: plateHeight(p),
                background: PLATE_COLOR[p] ?? "#5A5A5A",
              }}
              aria-hidden="true"
            />
          ))}
        </div>

        <div className="mt-5">
          <p className="tlog-eyebrow text-[var(--text-muted)] mb-2">
            Por lado
          </p>
          {breakdown.plates.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {breakdown.plates.map(({ kg, n }) => (
                <span
                  key={kg}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-1.5 text-xs font-bold tnum text-[var(--text)]"
                >
                  {n} × {kg}kg
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">
              Só a barra ({barKg}kg).
            </p>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
