"""Verify the ADTC scoring formulas match the brief."""

from __future__ import annotations

from biashara.bench.scoring import (
    RAM_BUDGET_BYTES,
    TPS_TARGET,
    pthermal,
    score_model,
    seff,
    sperf,
)


def test_sperf_at_target_is_100() -> None:
    assert sperf(TPS_TARGET) == 100.0


def test_sperf_above_target_caps_at_100() -> None:
    assert sperf(TPS_TARGET * 5) == 100.0


def test_sperf_below_target_is_linear() -> None:
    assert sperf(TPS_TARGET / 2) == 50.0
    assert sperf(0.0) == 0.0


def test_seff_at_budget_is_zero() -> None:
    assert seff(RAM_BUDGET_BYTES) == 0.0


def test_seff_at_half_budget_is_50() -> None:
    assert seff(RAM_BUDGET_BYTES // 2) == 50.0


def test_seff_over_budget_clamps_to_zero() -> None:
    assert seff(RAM_BUDGET_BYTES * 2) == 0.0


def test_pthermal_clean_run_is_zero() -> None:
    assert pthermal(peak_temp_c=70.0, throttle_events=0) == 0.0


def test_pthermal_throttle_only_penalty() -> None:
    assert pthermal(peak_temp_c=80.0, throttle_events=1) == 20.0


def test_pthermal_temp_only_penalty() -> None:
    # 89 C is 4 above the 85 C limit, scaled x2 = 8 point penalty
    assert pthermal(peak_temp_c=89.0, throttle_events=0) == 8.0


def test_pthermal_combined_penalty() -> None:
    # 20 for throttle + 8 for 4 C over
    assert pthermal(peak_temp_c=89.0, throttle_events=5) == 28.0


def test_pthermal_temp_penalty_caps() -> None:
    # 100 C is 15 above, x2 = 30, hits the cap
    assert pthermal(peak_temp_c=100.0, throttle_events=0) == 30.0
    assert pthermal(peak_temp_c=999.0, throttle_events=0) == 30.0


def test_score_model_target_hit() -> None:
    # Peak RAM 1.2 GB, TPS 20, temp 84, no throttles: strong system score.
    s = score_model(
        median_decode_tps=20.0,
        peak_rss_bytes=int(1.2 * 1024 ** 3),
        peak_temp_c=84.0,
        throttle_events=0,
    )
    assert s.sperf == 100.0  # 20/15 exceeds target
    assert s.pthermal == 0.0
    # Seff = (7 - 1.2) / 7 * 100 = 82.857...
    assert 82.0 <= s.seff <= 83.0
    # Ssystem = 0.3*100 + 0.2*82.86 - 0 = 46.57
    assert 46.0 <= s.ssystem <= 47.0


def test_stotal_estimate_composes_correctly() -> None:
    s = score_model(20.0, int(1.2 * 1024 ** 3), 84.0, 0)
    total = s.stotal_estimate(sacc=70.0)
    # 0.5 * 70 + 46.57 = 81.57
    assert total is not None
    assert 81.0 <= total <= 82.0
    assert s.stotal_estimate(None) is None
