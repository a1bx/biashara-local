# Measurement caveats

The numbers in `bakeoff.md` and the timestamped bake-off JSON files were
captured on developer hardware constrained to approximate the ADTC target
profile, not on the target profile itself. This note documents the
approximation so the numbers can be read honestly.

## Hardware used

- Lenovo ThinkPad X1 Yoga (2nd gen), Intel i7 with more cores and more
  RAM than the ADTC target profile.

## Constraints applied for measurement

Applied per session via `native/biashara/scripts/constrain_env.sh`:

- CPU governor set to `performance` on all cores.
- Intel turbo boost disabled (`no_turbo=1`).
- All cores capped to 2.4 GHz via `scaling_max_freq`.
- Networking disabled at the OS level (`nmcli networking off`).
- `thermald` stopped for the duration of the bench so it does not revert
  the governor.

The bench harness (`native/biashara/bench/harness.py`) verifies the first
two constraints at start and refuses to run if they are not set. This is
why every JSON report contains the applied env snapshot.

## How this differs from the ADTC target profile

The ADTC target is a `~$200` refurbished laptop: i5 10th to 12th gen or
Ryzen 5, 8 GB RAM, integrated graphics, Ubuntu 22.04.

The differences that matter for scoring:

- **CPU frequency behavior.** An i5-1235U-class target machine will
  sustain around 2.8-3.2 GHz on its performance cores under load when
  thermals allow. Our 2.4 GHz cap is deliberately conservative to avoid
  overstating throughput. Real-hardware decode TPS should exceed the
  numbers reported here.
- **Memory pressure.** Total system RAM (16 GB on the dev machine, 8 GB
  on the target) does not affect the process RSS number that Seff is
  computed from. Reported peak RSS is a faithful measurement of what the
  process consumes on any host.
- **Thermal envelope.** The dev machine has a larger chassis and better
  cooling than a typical `$200` refurbished laptop. On a hot day in
  Nairobi, a real target laptop may throttle where our runs do not. This
  works against us, not for us; the reported thermal numbers are a best
  case.

## What the ADTC profiler will produce differently

The official ADTC profiler is the source of truth for scored metrics. It
runs on judge-controlled reference hardware and captures peak RAM,
sustained TPS, and thermal events under its own instrumentation. Our
harness reports psutil-derived numbers for iteration; the delta between
the two should be small on RAM (both read `/proc/self/status`) and can
differ on TPS depending on how prefill and decode are split.

## Reproducing the numbers

From a clean checkout:

```
cd native
python3 -m venv .venv
.venv/bin/pip install -e .[dev]
sudo systemctl stop thermald
sudo biashara/scripts/constrain_env.sh
.venv/bin/python -m biashara.bench.harness \
    --model qwen0.5b:Q4_K_M:../assets/models/qwen2.5-0.5b-instruct-q4_k_m.gguf \
    --reps 3 --ctx 2048 --kv q8_0
sudo systemctl start thermald
sudo nmcli networking on
```
