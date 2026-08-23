"""ADTC scoring formulas.

From the ADTC 2026 brief:
    Stotal = 0.50 * Sacc + 0.30 * Sperf + 0.20 * Seff - Pthermal
    Sperf  = 100 * (TPS_actual / 15.0)              (capped at 100)
    Seff   = 100 * ((7 GB - PeakRAM) / 7 GB)        (clamped to [0, 100])

Pthermal is not given a closed form in the brief; the requirements state
"no thermal throttle flag, no core temperature above 85 C". We model it
as a graduated penalty:
    - 20 points if any throttle event occurred
    - up to 30 points scaled by how far peak temperature exceeded 85 C

Sacc is measured out of band by the retrieval eval set. This module only
computes the system-owned portion (Sperf, Seff, Pthermal) and reports
Ssystem = 0.30 * Sperf + 0.20 * Seff - Pthermal so we can track it
independently of the retrieval score.
"""

from __future__ import annotations

from dataclasses import dataclass

TPS_TARGET = 15.0
RAM_BUDGET_BYTES = 7 * 1024 ** 3
TEMP_LIMIT_C = 85.0

W_SPERF = 0.30
W_SEFF = 0.20
W_SACC = 0.50


@dataclass(frozen=True)
class Score:
    sperf: float
    seff: float
    pthermal: float
    ssystem: float  # Part-A-owned portion of Stotal, no Sacc

    def stotal_estimate(self, sacc: float | None = None) -> float | None:
        """Full Stotal if Sacc is supplied, else None."""
        if sacc is None:
            return None
        return W_SACC * sacc + self.ssystem


def sperf(median_decode_tps: float) -> float:
    return max(0.0, min(100.0, 100.0 * median_decode_tps / TPS_TARGET))


def seff(peak_ram_bytes: int) -> float:
    frac = (RAM_BUDGET_BYTES - peak_ram_bytes) / RAM_BUDGET_BYTES
    return max(0.0, min(100.0, 100.0 * frac))


def pthermal(peak_temp_c: float, throttle_events: int) -> float:
    p = 0.0
    if throttle_events > 0:
        p += 20.0
    if peak_temp_c > TEMP_LIMIT_C:
        p += min(30.0, (peak_temp_c - TEMP_LIMIT_C) * 2.0)
    return round(p, 2)


def score_model(
    median_decode_tps: float,
    peak_rss_bytes: int,
    peak_temp_c: float,
    throttle_events: int,
) -> Score:
    sp = sperf(median_decode_tps)
    se = seff(peak_rss_bytes)
    pt = pthermal(peak_temp_c, throttle_events)
    return Score(
        sperf=round(sp, 2),
        seff=round(se, 2),
        pthermal=pt,
        ssystem=round(W_SPERF * sp + W_SEFF * se - pt, 2),
    )
