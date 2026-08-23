"""Model bake-off harness.

Runs a fixed prompt set against one or more GGUF models, records TPS,
RAM, and thermal signal, and writes both JSON and markdown reports.

The ADTC profiler owns the numbers that appear in the submission; this
harness is for iteration. Use `--adtc-cmd` to wrap runs with the ADTC
profiler if it is available on the machine.
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import statistics
import subprocess
import sys
import threading
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import psutil

from biashara.bench.scoring import score_model
from biashara.inference import GenParams, LoadCfg, Session


REPORT_DIR = Path(__file__).resolve().parents[3] / "bench" / "reports"


# --------------------------------------------------------------------------- env

def _read_first(path: str) -> Optional[str]:
    try:
        with open(path) as f:
            return f.read().strip()
    except OSError:
        return None


def assert_constrained_env(strict: bool) -> dict:
    """Return env snapshot. If strict, abort when governor or turbo are wrong."""
    snapshot = {
        "governor": _read_first("/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor"),
        "max_freq_khz": _read_first("/sys/devices/system/cpu/cpu0/cpufreq/scaling_max_freq"),
        "no_turbo": _read_first("/sys/devices/system/cpu/intel_pstate/no_turbo"),
        "boost": _read_first("/sys/devices/system/cpu/cpufreq/boost"),
        "mem_total_kb": _read_first("/proc/meminfo"),
    }
    if not strict:
        return snapshot
    if snapshot["governor"] != "performance":
        raise SystemExit(f"refusing: cpu governor is {snapshot['governor']}, need 'performance'")
    if snapshot["no_turbo"] == "0" or snapshot["boost"] == "1":
        raise SystemExit("refusing: turbo boost is enabled; run constrain_env.sh")
    return snapshot


# --------------------------------------------------------------------------- monitor

@dataclass
class MonitorSample:
    ts: float
    rss_bytes: int
    temp_millideg: int
    cpu_freq_khz: int


class SystemMonitor:
    """Samples RSS, temperature and cpu freq in a background thread."""

    def __init__(self, pid: int, interval_s: float = 0.1) -> None:
        self._proc = psutil.Process(pid)
        self._interval = interval_s
        self._samples: list[MonitorSample] = []
        self._stop = threading.Event()
        self._t: Optional[threading.Thread] = None
        self._throttle_start = self._read_throttle_count()

    def _read_throttle_count(self) -> int:
        total = 0
        for p in glob.glob("/sys/devices/system/cpu/cpu*/thermal_throttle/core_throttle_count"):
            v = _read_first(p)
            if v and v.isdigit():
                total += int(v)
        return total

    def _read_temp(self) -> int:
        # Take the max across zones as the "hot core" proxy.
        hottest = 0
        for p in glob.glob("/sys/class/thermal/thermal_zone*/temp"):
            v = _read_first(p)
            if v and v.lstrip("-").isdigit():
                hottest = max(hottest, int(v))
        return hottest

    def _read_freq(self) -> int:
        v = _read_first("/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq")
        return int(v) if v and v.isdigit() else 0

    def start(self) -> None:
        self._t = threading.Thread(target=self._loop, daemon=True)
        self._t.start()

    def _loop(self) -> None:
        while not self._stop.is_set():
            try:
                rss = self._proc.memory_info().rss
            except psutil.Error:
                break
            self._samples.append(MonitorSample(
                ts=time.perf_counter(),
                rss_bytes=rss,
                temp_millideg=self._read_temp(),
                cpu_freq_khz=self._read_freq(),
            ))
            self._stop.wait(self._interval)

    def stop(self) -> dict:
        self._stop.set()
        if self._t:
            self._t.join(timeout=2)
        peak_rss = max((s.rss_bytes for s in self._samples), default=0)
        peak_temp = max((s.temp_millideg for s in self._samples), default=0)
        throttle_delta = self._read_throttle_count() - self._throttle_start
        return {
            "peak_rss_bytes": peak_rss,
            "peak_temp_millideg": peak_temp,
            "throttle_events": throttle_delta,
            "sample_count": len(self._samples),
        }


# --------------------------------------------------------------------------- run

@dataclass
class RunResult:
    prompt_id: str
    tokens_generated: int
    time_to_first_token_s: float
    total_time_s: float
    decode_tps: float
    end_to_end_tps: float
    monitor: dict
    reply_preview: str


def run_prompt(session: Session, spec: dict) -> RunResult:
    params = GenParams(max_tokens=spec.get("max_tokens", 256))
    mon = SystemMonitor(pid=os.getpid())
    mon.start()

    text_parts: list[str] = []
    t0 = time.perf_counter()
    t_first: Optional[float] = None
    for piece in session.generate(spec["prompt"], params):
        if t_first is None:
            t_first = time.perf_counter()
        text_parts.append(piece)
    t_end = time.perf_counter()
    monitor_stats = mon.stop()

    reply = "".join(text_parts)
    # Approximate token count via llama tokenizer for fidelity.
    try:
        tok_ids = session._llm.tokenize(reply.encode("utf-8"), add_bos=False)  # noqa: SLF001
        n_tokens = len(tok_ids)
    except Exception:
        n_tokens = max(1, len(reply.split()))

    ttft = (t_first or t_end) - t0
    total = t_end - t0
    decode_time = max(1e-6, total - ttft)
    return RunResult(
        prompt_id=spec["id"],
        tokens_generated=n_tokens,
        time_to_first_token_s=round(ttft, 4),
        total_time_s=round(total, 4),
        decode_tps=round(n_tokens / decode_time, 2),
        end_to_end_tps=round(n_tokens / total, 2),
        monitor=monitor_stats,
        reply_preview=reply[:180].replace("\n", " "),
    )


# --------------------------------------------------------------------------- bake-off

@dataclass
class ModelSpec:
    name: str
    path: Path
    quant: str

    @classmethod
    def parse(cls, s: str) -> "ModelSpec":
        # format: name:quant:/path/to/file.gguf
        try:
            name, quant, path = s.split(":", 2)
        except ValueError as e:
            raise argparse.ArgumentTypeError(
                "model spec must be name:quant:/path/to.gguf") from e
        return cls(name=name.strip(), quant=quant.strip(), path=Path(path.strip()))


def run_bakeoff(
    models: list[ModelSpec],
    prompts_path: Path,
    repetitions: int,
    ctx: int,
    kv_type: str,
    env_snapshot: dict,
) -> dict:
    prompts = json.loads(prompts_path.read_text())["prompts"]
    results: list[dict] = []

    for spec in models:
        if not spec.path.exists():
            print(f"skip (missing): {spec.path}", file=sys.stderr)
            continue

        load_start = time.perf_counter()
        session = Session(spec.path, LoadCfg(ctx=ctx, kv_type_k=kv_type, kv_type_v=kv_type))
        load_time = time.perf_counter() - load_start
        cold_rss = psutil.Process().memory_info().rss

        # Warm the model once so measurements are steady-state.
        _ = list(session.generate("Hello.", GenParams(max_tokens=8)))

        per_prompt: list[dict] = []
        for p in prompts:
            reps = [run_prompt(session, p) for _ in range(repetitions)]
            per_prompt.append({
                "prompt_id": p["id"],
                "category": p["category"],
                "runs": [asdict(r) for r in reps],
                "median_decode_tps": statistics.median(r.decode_tps for r in reps),
                "median_end_to_end_tps": statistics.median(r.end_to_end_tps for r in reps),
                "median_ttft_s": statistics.median(r.time_to_first_token_s for r in reps),
                "peak_rss_bytes": max(r.monitor["peak_rss_bytes"] for r in reps),
                "peak_temp_millideg": max(r.monitor["peak_temp_millideg"] for r in reps),
                "throttle_events": sum(r.monitor["throttle_events"] for r in reps),
            })

        results.append({
            "model": spec.name,
            "quant": spec.quant,
            "path": str(spec.path),
            "load_time_s": round(load_time, 3),
            "cold_rss_bytes": cold_rss,
            "n_threads": session.n_threads,
            "prompts": per_prompt,
        })
        session.close()

    return {
        "created_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "env": env_snapshot,
        "context": ctx,
        "kv_type": kv_type,
        "repetitions": repetitions,
        "models": results,
    }


# --------------------------------------------------------------------------- report

def _fmt_mb(b: int) -> str:
    return f"{b / (1024 * 1024):.1f} MB"


def write_markdown(report: dict, out_path: Path) -> None:
    lines: list[str] = []
    env = report.get("env", {})
    lines.append("# Bake-off report\n")
    lines.append(f"- created: {report['created_utc']}")
    lines.append(f"- context: {report['context']}  kv: {report['kv_type']}  reps: {report['repetitions']}")
    lines.append(
        f"- env: governor={env.get('governor')}  no_turbo={env.get('no_turbo')}  "
        f"max_freq_khz={env.get('max_freq_khz')}"
    )
    if env.get("governor") != "performance" or env.get("no_turbo") in ("0", None):
        lines.append(
            "- **warning:** environment not fully constrained; TPS and thermal "
            "numbers are for iteration only, not for submission."
        )
    lines.append("")
    lines.append("## Raw metrics\n")
    lines.append("| model | quant | load s | cold RSS | median decode TPS | peak RSS | peak temp C | throttles |")
    lines.append("|---|---|---|---|---|---|---|---|")
    scored_rows: list[tuple[str, str, float, int, float, int]] = []
    for m in report["models"]:
        med_tps = statistics.median(p["median_decode_tps"] for p in m["prompts"])
        peak_rss = max(p["peak_rss_bytes"] for p in m["prompts"])
        peak_temp_c = max(p["peak_temp_millideg"] for p in m["prompts"]) / 1000.0
        throttles = sum(p["throttle_events"] for p in m["prompts"])
        scored_rows.append((m["model"], m["quant"], med_tps, peak_rss, peak_temp_c, throttles))
        lines.append(
            f"| {m['model']} | {m['quant']} | {m['load_time_s']} | {_fmt_mb(m['cold_rss_bytes'])} "
            f"| {med_tps:.2f} | {_fmt_mb(peak_rss)} | {peak_temp_c:.1f} | {throttles} |"
        )
    lines.append("")
    lines.append("## ADTC scores\n")
    lines.append(
        "System-owned portion of Stotal (Sperf, Seff, Pthermal, Ssystem = 0.30 * Sperf "
        "+ 0.20 * Seff - Pthermal). Sacc is measured out of band by the retrieval eval "
        "set. Full Stotal is 0.50 * Sacc + Ssystem."
    )
    lines.append("")
    lines.append("| model | quant | Sperf | Seff | Pthermal | Ssystem |")
    lines.append("|---|---|---|---|---|---|")
    for name, quant, tps, rss, temp_c, throttles in scored_rows:
        s = score_model(tps, rss, temp_c, throttles)
        lines.append(
            f"| {name} | {quant} | {s.sperf:.2f} | {s.seff:.2f} | {s.pthermal:.2f} | {s.ssystem:.2f} |"
        )
    lines.append("")
    out_path.write_text("\n".join(lines))


# --------------------------------------------------------------------------- cli

def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", action="append", type=ModelSpec.parse, required=True,
                    help="repeatable: name:quant:/path/to.gguf")
    ap.add_argument("--prompts", type=Path,
                    default=Path(__file__).parent / "prompts.json")
    ap.add_argument("--reps", type=int, default=3)
    ap.add_argument("--ctx", type=int, default=2048)
    ap.add_argument("--kv", default="q8_0")
    ap.add_argument("--no-strict-env", action="store_true",
                    help="allow running without performance governor (dev only)")
    ap.add_argument("--out", type=Path, default=REPORT_DIR)
    args = ap.parse_args(argv)

    args.out.mkdir(parents=True, exist_ok=True)
    env = assert_constrained_env(strict=not args.no_strict_env)

    report = run_bakeoff(
        models=args.model,
        prompts_path=args.prompts,
        repetitions=args.reps,
        ctx=args.ctx,
        kv_type=args.kv,
        env_snapshot=env,
    )

    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    json_path = args.out / f"bakeoff_{ts}.json"
    md_path = args.out / f"bakeoff_{ts}.md"
    latest_md = args.out / "bakeoff.md"
    json_path.write_text(json.dumps(report, indent=2, default=str))
    write_markdown(report, md_path)
    write_markdown(report, latest_md)
    print(f"wrote {json_path}")
    print(f"wrote {md_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
