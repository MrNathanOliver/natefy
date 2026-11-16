#!/bin/bash
# Build Natefy and serve it in the background at http://localhost:5173,
# starting automatically at login. Re-run after changing the code to update it.
set -euo pipefail
cd "$(dirname "$0")/.."

LABEL=com.natefy.server
SITE="$HOME/Library/Application Support/Natefy/site"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
PY="$(command -v python3)"

npm run build
mkdir -p "$SITE" "$HOME/Library/LaunchAgents"
rm -rf "$SITE"/*
cp -R dist/. "$SITE/"

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$PY</string><string>-m</string><string>http.server</string><string>5173</string>
    <string>--bind</string><string>127.0.0.1</string>
    <string>--directory</string><string>$SITE</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardErrorPath</key><string>/dev/null</string>
  <key>StandardOutPath</key><string>/dev/null</string>
</dict>
</plist>
PLIST

# Stop the old copy (if any) and wait for it to go before starting the new one.
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
for _ in $(seq 1 50); do
  launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || break
  sleep 0.1
done
launchctl bootstrap "gui/$(id -u)" "$PLIST"
for _ in $(seq 1 30); do curl -s -o /dev/null http://127.0.0.1:5173/ && break; sleep 0.2; done
echo "Natefy is running at http://localhost:5173 (and will start at login)."
