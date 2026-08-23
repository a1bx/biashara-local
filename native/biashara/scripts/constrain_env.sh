#!/usr/bin/env bash
# Approximate the ADTC target laptop profile on a beefier dev machine.
# Run with sudo. Idempotent. Prints the applied state at the end.
#
# Target profile: i5 10th-12th gen or Ryzen 5, 8 GB RAM, integrated GPU,
# Ubuntu 22.04, single power source, no thermal room to spare.
#
# What this script does not do:
#   - Modify GRUB. Memory limit via `mem=8G` requires editing
#     /etc/default/grub and rebooting; do that once, manually.
#   - Disable e-cores. Do that in BIOS or via `chcpu -d <n>` for the
#     specific cores you want offline.

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "run as root (sudo)" >&2
  exit 1
fi

FREQ_CAP_KHZ="${FREQ_CAP_KHZ:-2400000}"   # 2.4 GHz, close to i5-1235U base
GOVERNOR="${GOVERNOR:-performance}"

# 1. CPU governor
if command -v cpupower >/dev/null; then
  cpupower frequency-set -g "$GOVERNOR" >/dev/null
  cpupower frequency-set -u "${FREQ_CAP_KHZ}" >/dev/null
else
  for g in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
    echo "$GOVERNOR" > "$g"
  done
  for f in /sys/devices/system/cpu/cpu*/cpufreq/scaling_max_freq; do
    echo "$FREQ_CAP_KHZ" > "$f"
  done
fi

# 2. Disable turbo boost so peak freq is deterministic
if [[ -f /sys/devices/system/cpu/intel_pstate/no_turbo ]]; then
  echo 1 > /sys/devices/system/cpu/intel_pstate/no_turbo
elif [[ -f /sys/devices/system/cpu/cpufreq/boost ]]; then
  echo 0 > /sys/devices/system/cpu/cpufreq/boost
fi

# 3. Kill networking for the run
if command -v nmcli >/dev/null; then
  nmcli networking off || true
fi

# 4. Report applied state
echo "=== constrained env ==="
echo "governor:      $(cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor)"
echo "max freq kHz:  $(cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_max_freq)"
if [[ -f /sys/devices/system/cpu/intel_pstate/no_turbo ]]; then
  echo "turbo off:     $(cat /sys/devices/system/cpu/intel_pstate/no_turbo)"
fi
echo "networking:    $(nmcli networking 2>/dev/null || echo unknown)"
echo "memtotal kB:   $(grep MemTotal /proc/meminfo | awk '{print $2}')"
echo
echo "note: to cap RAM to 8 GB add 'mem=8G' to GRUB_CMDLINE_LINUX_DEFAULT"
echo "      in /etc/default/grub, run update-grub, and reboot."
