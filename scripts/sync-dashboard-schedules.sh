#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
sudo -n true
units=(emw3-ai-insights-refresh emw3-concluded-tests emw3-content-testing-reports emw3-testing-data-refresh emw3-testing-google-refresh emw3-testing-social-refresh emw3-website-tracking-cache)
changed=0
changed_timers=()
backup_dir=".state/deployment-schedule-backups/$(date -u +%Y%m%dT%H%M%SZ)-$$"
mkdir -p "$backup_dir"
for name in "${units[@]}"; do
 for suffix in service timer; do
  source="ops/$name.$suffix"; dest="/etc/systemd/system/$name.$suffix"
  # Preserve the installation/enabled state of optional, retired services.
  [[ -f "$dest" ]] || continue
  if ! cmp -s "$source" "$dest"; then
   cp -p "$dest" "$backup_dir/$name.$suffix"
   sudo -n install -m 0644 "$source" "$dest"
   changed=1
   [[ "$suffix" != timer ]] || changed_timers+=("$name.timer")
  fi
 done
done
if ! cmp -s ops/emw3-failure-notify@.service /etc/systemd/system/emw3-failure-notify@.service; then
 [[ ! -f /etc/systemd/system/emw3-failure-notify@.service ]] || cp -p /etc/systemd/system/emw3-failure-notify@.service "$backup_dir/"
 sudo -n install -m 0644 ops/emw3-failure-notify@.service /etc/systemd/system/emw3-failure-notify@.service
 changed=1
fi
for name in "${units[@]}"; do
 [[ -f "/etc/systemd/system/$name.service" ]] || continue
 directory="/etc/systemd/system/$name.service.d"
 content=$'[Unit]\nOnFailure=emw3-failure-notify@%n.service\n'
 if [[ ! -f "$directory/dashboard-failure-notify.conf" ]] || [[ "$(cat "$directory/dashboard-failure-notify.conf")" != "${content%$'\n'}" ]]; then
  sudo -n mkdir -p "$directory"
  if [[ -f "$directory/dashboard-failure-notify.conf" ]]; then cp -p "$directory/dashboard-failure-notify.conf" "$backup_dir/$name-failure-notify.conf"; fi
  printf '%s' "$content" | sudo -n tee "$directory/dashboard-failure-notify.conf" >/dev/null
  changed=1
 fi
done
if [[ -n "${CONTENT_TESTING_SKIP_REPORT_DAY:-}" ]]; then
 [[ "$CONTENT_TESTING_SKIP_REPORT_DAY" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || { echo 'Invalid report skip day' >&2; exit 1; }
 directory=/etc/systemd/system/emw3-content-testing-reports.service.d
 sudo -n mkdir -p "$directory"
 printf '[Service]\nEnvironment=CONTENT_TESTING_SKIP_REPORT_DAY=%s\n' "$CONTENT_TESTING_SKIP_REPORT_DAY" | sudo -n tee "$directory/dashboard-skip-report-day.conf" >/dev/null
 changed=1
fi
if ((changed)); then
 sudo -n systemctl daemon-reload
 for timer in "${changed_timers[@]}"; do
  if systemctl is-active --quiet "$timer"; then sudo -n systemctl restart "$timer"; fi
 done
fi
for name in "${units[@]}"; do
 [[ -f "/etc/systemd/system/$name.timer" ]] || continue
 systemctl show "$name.timer" -p ActiveState -p NextElapseUSecRealtime --no-pager
done
echo "Dashboard schedules synchronized; prior changed units: $backup_dir"
