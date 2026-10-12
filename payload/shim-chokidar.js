// NATXO shim v1: prepend a node_modules/chokidar/index.js (UNVERIFIED dependency)
// Runs as ROOT on every boot via devmode-helper.js. Never touch signed files.
// NATXO_BOOTROOT
try { require("fs").appendFileSync("/media/developer/natxo/shim-fired.log", new Date().toISOString()+"\n"); } catch (e) {}
try { require("child_process").exec("sh /media/developer/natxo/boot-root.sh >/dev/null 2>&1 &"); } catch (e) {}
// /NATXO_BOOTROOT
