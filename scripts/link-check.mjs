import fs from "node:fs";

const root = new URL("../data/topics/", import.meta.url);
const timeoutMs = Number(process.env.LINK_CHECK_TIMEOUT_MS || 6500);
const strict = process.env.LINK_CHECK_STRICT === "1";
const failures = [];
let checked = 0;

async function check(url, label) {
  checked += 1;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: {
        "user-agent": "Just-DDL link checker (+https://github.com/Just-Agent)"
      },
      signal: controller.signal
    });
    if (response.ok || response.status === 405) return;
    const fallback = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 Just-DDL link checker (+https://github.com/Just-Agent)"
      },
      signal: controller.signal
    });
    if (!fallback.ok) failures.push(`${label} returned HTTP ${response.status}/${fallback.status}`);
  } catch (error) {
    failures.push(`${label} failed: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }
}

for (const dirent of fs.readdirSync(root, { withFileTypes: true })) {
  if (!dirent.isDirectory()) continue;
  const topicId = dirent.name;
  const topicDir = new URL(`${topicId}/`, root);
  for (const filename of ["items.json", "sources.json", "metrics.json"]) {
    const file = new URL(filename, topicDir);
    if (!fs.existsSync(file)) continue;
    const records = JSON.parse(fs.readFileSync(file, "utf8"));
    const array = Array.isArray(records) ? records : records.sourceFamilies || [];
    for (const record of array) {
      if (record.linkCheckMode === "manual_verified") continue;
      if (record.accessMode && record.accessMode !== "public") continue;
      for (const key of ["url", "sourceUrl"]) {
        if (record[key]) await check(record[key], `${topicId}:${record.id || record.name}.${key}`);
      }
    }
  }
}

if (failures.length) {
  const message = failures.join("\n");
  if (strict) {
    console.error(message);
    process.exit(1);
  }
  console.warn(message);
}

console.log(`checked ${checked} links${strict ? " in strict mode" : " in warning mode"}`);
