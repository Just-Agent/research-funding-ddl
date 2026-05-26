#!/usr/bin/env node
import fs from "node:fs";

const TOPIC_ID = "nsfc-ddl";
const TOPIC_DIR = new URL(`../public-data/topics/${TOPIC_ID}/`, import.meta.url);
const ITEMS_PATH = new URL("items.json", TOPIC_DIR);
const METRICS_PATH = new URL("metrics.json", TOPIC_DIR);
const errors = [];

const REQUIRED_SUBTOPICS = new Map([
  ["nsfc-guide", 1],
  ["nsfc-application", 2],
  ["nsfc-project-types", 30],
  ["nsfc-review", 8],
  ["nsfc-management", 4]
]);

const REQUIRED_2026_PROJECT_ALIASES = [
  "面上项目",
  "青年科学基金项目（A类）",
  "青年科学基金项目（B类）",
  "青年科学基金项目（C类）",
  "地区科学基金",
  "重点项目",
  "创新研究群体",
  "卓越研究群体",
  "重点国际",
  "外国学者",
  "合作创新研究团队",
  "重大科研仪器",
  "联合基金",
  "重大研究计划",
  "数学天元基金"
];

const REQUIRED_2025_PROJECT_ALIASES = [
  "面上项目",
  "青年科学基金",
  "地区科学基金",
  "重点项目",
  "优秀青年科学基金",
  "国家杰出青年科学基金",
  "创新研究群体",
  "卓越研究群体",
  "重点国际",
  "外国学者",
  "合作创新研究团队",
  "重大科研仪器",
  "联合基金",
  "重大研究计划",
  "数学天元基金"
];

const REQUIRED_FUNDED_METRIC_ALIASES = [
  "面上项目",
  "青年科学基金",
  "重点项目",
  "重点国际",
  "优秀青年科学基金",
  "国家杰出青年科学基金",
  "创新研究群体",
  "地区科学基金",
  "外国学者",
  "合作创新研究团队"
];

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    errors.push(`missing public data file ${filePath.pathname}`);
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeText(value) {
  return String(value || "")
    .replace(/[（）()]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function requireFields(record, fields, label) {
  for (const field of fields) {
    if (record[field] === undefined || record[field] === null || record[field] === "") {
      errors.push(`${label}: missing ${field}`);
    }
  }
}

function requireDateOrDeadline(record, label) {
  if (!record.date && !record.deadline) {
    errors.push(`${label}: missing date or deadline`);
  }
}

function matchesAlias(record, alias) {
  const haystack = normalizeText([
    record.title,
    record.description,
    record.displayName,
    record.projectType,
    ...(record.tags || [])
  ].join(" "));
  return haystack.includes(normalizeText(alias));
}

function findMatching(records, alias) {
  return records.filter(record => matchesAlias(record, alias));
}

function validateProjectItem(item) {
  const label = item.id || "<missing-project-item-id>";
  requireFields(item, ["id", "title", "type", "url", "sourceUrl", "dateRange", "subtopic", "subtopicName"], label);
  requireDateOrDeadline(item, label);
  if (item.topicId !== TOPIC_ID) errors.push(`${label}: topicId must be ${TOPIC_ID}`);
  if (item.subtopic !== "nsfc-project-types") errors.push(`${label}: project item must use nsfc-project-types subtopic`);
  if (!["historyEvent", "officialDeadline"].includes(item.type)) {
    errors.push(`${label}: project type rail must be historyEvent or officialDeadline`);
  }
  if (!Array.isArray(item.tags) || item.tags.length < 2) errors.push(`${label}: project item must include specific tags`);
  if (!String(item.dateRange || "").includes("03-20")) errors.push(`${label}: project item dateRange should expose March application deadline`);
  if (item.source !== "国家自然科学基金委员会") errors.push(`${label}: source must remain the official NSFC source`);
}

function validateYearCoverage(items, year, aliases) {
  const yearItems = items.filter(item => item.subtopic === "nsfc-project-types" && String(item.title).includes(String(year)));
  if (yearItems.length < aliases.length) {
    errors.push(`public nsfc ${year}: expected at least ${aliases.length} project type records, got ${yearItems.length}`);
  }
  yearItems.forEach(validateProjectItem);
  for (const alias of aliases) {
    const matches = findMatching(yearItems, alias);
    if (matches.length === 0) errors.push(`public nsfc ${year}: missing project type ${alias}`);
  }
  return yearItems.length;
}

function validateSubtopicCoverage(items) {
  for (const [subtopic, minCount] of REQUIRED_SUBTOPICS.entries()) {
    const count = items.filter(item => item.subtopic === subtopic).length;
    if (count < minCount) {
      errors.push(`public ${subtopic}: expected at least ${minCount} records, got ${count}`);
    }
  }
}

function validateForecasts(items) {
  const byId = new Map(items.map(item => [item.id, item]));
  const forecasts = items.filter(item => item.type === "forecastWindow");
  const requiredForecastSubtopics = new Set(["nsfc-application", "nsfc-review"]);

  for (const subtopic of requiredForecastSubtopics) {
    const forecast = forecasts.find(item => item.subtopic === subtopic);
    if (!forecast) {
      errors.push(`public ${subtopic}: missing forecastWindow`);
      continue;
    }

    const label = forecast.id || `<missing-${subtopic}-forecast-id>`;
    requireFields(forecast, ["id", "title", "basisEvents", "lastOfficialDate", "estimatedNextWindow", "confidence", "sourceUrl", "description"], label);
    if (forecast.isDatePlaceholder !== true) {
      errors.push(`${label}: forecast must set isDatePlaceholder true`);
    }
    if (!Array.isArray(forecast.basisEvents) || forecast.basisEvents.length < 2) {
      errors.push(`${label}: forecast must have at least two basisEvents`);
    }
    if (!forecast.estimatedNextWindow?.start || !forecast.estimatedNextWindow?.end) {
      errors.push(`${label}: estimatedNextWindow must include start and end`);
    }
    for (const basisId of forecast.basisEvents || []) {
      const basis = byId.get(basisId);
      if (!basis) {
        errors.push(`${label}: missing basis event ${basisId}`);
        continue;
      }
      if (basis.type === "forecastWindow" || basis.isDatePlaceholder) {
        errors.push(`${label}: basis event ${basisId} must be official dated history/deadline, not forecast or placeholder`);
      }
      requireDateOrDeadline(basis, `${label} basis ${basisId}`);
      if (!basis.sourceUrl) errors.push(`${label} basis ${basisId}: missing sourceUrl`);
    }
  }

  return forecasts.length;
}

function validateFundedMetrics(metrics) {
  const fundedMetrics = metrics.filter(metric => metric.metric === "funded_projects_by_type");
  if (fundedMetrics.length < REQUIRED_FUNDED_METRIC_ALIASES.length) {
    errors.push(`public funded_projects_by_type: expected at least ${REQUIRED_FUNDED_METRIC_ALIASES.length} records, got ${fundedMetrics.length}`);
  }
  for (const metric of fundedMetrics) {
    const label = metric.id || "<missing-funded-metric-id>";
    requireFields(metric, ["id", "topicId", "type", "metric", "displayName", "projectType", "year", "value", "unit", "asOfDate", "url", "source", "sourceLabel"], label);
    if (metric.topicId !== TOPIC_ID) errors.push(`${label}: topicId must be ${TOPIC_ID}`);
    if (metric.type !== "metricSnapshot") errors.push(`${label}: type must be metricSnapshot`);
    if (metric.sourceLabel !== "公开来源") errors.push(`${label}: sourceLabel must be public-facing`);
    if (metric.source !== "国家自然科学基金委员会") errors.push(`${label}: source must remain the official NSFC source`);
    if (metric.unit !== "项") errors.push(`${label}: unit must be 项`);
    if (!Number.isFinite(Number(metric.value)) || Number(metric.value) < 0) {
      errors.push(`${label}: funded project metric must be non-negative number`);
    }
  }
  for (const alias of REQUIRED_FUNDED_METRIC_ALIASES) {
    const matches = findMatching(fundedMetrics, alias);
    if (matches.length === 0) errors.push(`public funded_projects_by_type: missing ${alias}`);
  }
  return fundedMetrics.length;
}

const items = readJson(ITEMS_PATH);
const metrics = readJson(METRICS_PATH);

validateSubtopicCoverage(items);
const year2026Count = validateYearCoverage(items, 2026, REQUIRED_2026_PROJECT_ALIASES);
const year2025Count = validateYearCoverage(items, 2025, REQUIRED_2025_PROJECT_ALIASES);
const forecastWindows = validateForecasts(items);
const fundedMetricCount = validateFundedMetrics(metrics);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  publicProjectTypeRecords: {
    "2026": year2026Count,
    "2025": year2025Count
  },
  publicSubtopicCounts: Object.fromEntries(
    [...REQUIRED_SUBTOPICS.keys()].map(subtopic => [subtopic, items.filter(item => item.subtopic === subtopic).length])
  ),
  publicFundedProjectTypeMetrics: fundedMetricCount,
  publicForecastWindows: forecastWindows
}, null, 2));
