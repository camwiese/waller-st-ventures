#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const envPath = path.join(ROOT, ".env.local");

const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GP_EMAIL",
  "RESEND_API_KEY",
  "NEXT_PUBLIC_APP_URL",
  "AUTH_SENDER_EMAIL",
];

function firstDefined(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) || "";
}

function getMuxConfig(env) {
  return {
    tokenId: firstDefined(env.MUX_TOKEN_ID, env.pst_interview_MUX_TOKEN_ID),
    tokenSecret: firstDefined(env.MUX_TOKEN_SECRET, env.pst_interview_MUX_TOKEN_SECRET),
    signingKeyId: firstDefined(env.MUX_SIGNING_KEY_ID, env.pst_interview_MUX_SIGNING_KEY_ID),
    signingKeyPrivate: firstDefined(env.MUX_SIGNING_KEY_PRIVATE, env.pst_interview_MUX_SIGNING_KEY_PRIVATE),
    playbackId: firstDefined(env.MUX_PLAYBACK_ID, env.pst_interview_MUX_PLAYBACK_ID),
  };
}

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const idx = line.indexOf("=");
    if (idx === -1) continue;

    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadDotEnvFile(envPath);

const missing = REQUIRED_VARS.filter((name) => !String(process.env[name] || "").trim());
const muxConfig = getMuxConfig(process.env);

if (!muxConfig.tokenId) missing.push("MUX_TOKEN_ID or pst_interview_MUX_TOKEN_ID");
if (!muxConfig.tokenSecret) missing.push("MUX_TOKEN_SECRET or pst_interview_MUX_TOKEN_SECRET");
if (!muxConfig.signingKeyId) missing.push("MUX_SIGNING_KEY_ID or pst_interview_MUX_SIGNING_KEY_ID");
if (!muxConfig.signingKeyPrivate) missing.push("MUX_SIGNING_KEY_PRIVATE or pst_interview_MUX_SIGNING_KEY_PRIVATE");
if (!muxConfig.playbackId) missing.push("MUX_PLAYBACK_ID or pst_interview_MUX_PLAYBACK_ID");

if (missing.length > 0) {
  console.error("Missing required environment variables:");
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  console.error("\nPopulate .env.local from .env.example, then rerun: npm run setup:check");
  process.exit(1);
}

console.log("Environment check passed. Required variables are set.");
