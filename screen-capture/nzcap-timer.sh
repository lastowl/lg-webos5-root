#!/bin/sh
# Timer capture: waits N seconds (default 10) then takes the shot. Runs from the
# background daemon, so it works even if you close the app and switch screens.
sleep ${1:-10}
sh /tmp/nzcap-shot.sh
