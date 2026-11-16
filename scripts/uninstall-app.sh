#!/bin/bash
# Stop the background Natefy server and remove it from login.
LABEL=com.natefy.server
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
rm -f "$HOME/Library/LaunchAgents/$LABEL.plist"
rm -rf "$HOME/Library/Application Support/Natefy/site"
echo "Natefy background server removed."
