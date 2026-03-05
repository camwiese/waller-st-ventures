/* eslint-disable no-console */
const fs = require("node:fs");
const { setTimeout: delay } = require("node:timers/promises");

function parseArgs(argv) {
  const args = { endpoints: null, once: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--once") args.once = true;
    else if (arg === "--base") args.base = argv[++i];
    else if (arg === "--interval") args.interval = Number(argv[++i]);
    else if (arg === "--endpoints") args.endpoints = argv[++i];
    else if (arg === "--cookie") args.cookie = argv[++i];
    else if (arg === "--out") args.out = argv[++i];
  }
  return args;
}

const defaults = [
  "/",
  "/admin",
  "/admin/content",
  "/admin/changelog",
  "/api/admin/analytics?range=7d",
  "/api/admin/content/sections?dealSlug=pst",
];

const args = parseArgs(process.argv);
const base = args.base || process.env.MONITOR_BASE || "http://localhost:3000";
const intervalMs = Number.isFinite(args.interval) ? args.interval : Number(process.env.MONITOR_INTERVAL || 10000);
const endpoints = (args.endpoints || process.env.MONITOR_ENDPOINTS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const list = endpoints.length ? endpoints : defaults;
const cookie = args.cookie || process.env.MONITOR_COOKIE || "";
const outFile = args.out || process.env.MONITOR_OUT || "/tmp/pst-endpoint-monitor.log";

function logLine(line) {
  fs.appendFileSync(outFile, `${line}\n`);
  console.log(line);
}

async function ping(url) {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      headers: cookie ? { cookie } : undefined,
    });
    const duration = Date.now() - start;
    logLine(`${new Date().toISOString()} ${res.status} ${duration}ms ${url}`);
  } catch (err) {
    const duration = Date.now() - start;
    logLine(`${new Date().toISOString()} ERROR ${duration}ms ${url} ${err?.message || err}`);
  }
}

async function runOnce() {
  for (const endpoint of list) {
    const url = endpoint.startsWith("http") ? endpoint : `${base}${endpoint}`;
    await ping(url);
  }
}

async function runLoop() {
  while (true) {
    await runOnce();
    await delay(intervalMs);
  }
}

logLine(`${new Date().toISOString()} monitor start base=${base} interval=${intervalMs}ms endpoints=${list.length}`);

if (args.once || process.env.MONITOR_ONCE === "true") {
  runOnce().then(() => process.exit(0));
} else {
  runLoop();
}
