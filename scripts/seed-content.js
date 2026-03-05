const { spawnSync } = require("child_process");
const path = require("path");

const scriptPath = path.join(__dirname, "migrate-existing-content.js");
const result = spawnSync(process.execPath, [scriptPath], {
  stdio: "inherit",
  env: process.env,
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}

console.log("Seed complete.");

