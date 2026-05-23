import fs from "node:fs";

const root = new URL("../data/topics/", import.meta.url);
const report = {
  generatedAt: new Date().toISOString(),
  mode: "template-source-reachability",
  topics: []
};

for (const dirent of fs.readdirSync(root, { withFileTypes: true })) {
  if (!dirent.isDirectory()) continue;
  const topicId = dirent.name;
  const sourcesFile = new URL(`${topicId}/sources.json`, root);
  if (!fs.existsSync(sourcesFile)) continue;
  const sources = JSON.parse(fs.readFileSync(sourcesFile, "utf8"));
  const sourceReports = [];

  for (const source of sources.sourceFamilies || []) {
    const entry = {
      id: source.id,
      url: source.url,
      parser: source.parser,
      accessMode: source.accessMode,
      status: "not_checked"
    };
    if (source.accessMode === "public" && source.url) {
      try {
        const response = await fetch(source.url, { redirect: "follow" });
        entry.status = response.ok ? "reachable" : "http_error";
        entry.httpStatus = response.status;
      } catch (error) {
        entry.status = "fetch_error";
        entry.error = error.message;
      }
    } else {
      entry.status = "manual_or_authorized_source";
    }
    sourceReports.push(entry);
  }

  report.topics.push({ topicId, sources: sourceReports });
}

fs.writeFileSync(new URL("../data/crawl-report.json", import.meta.url), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`wrote crawl report for ${report.topics.length} topics`);
