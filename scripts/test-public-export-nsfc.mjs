#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { isPrivateKey, scanPublicPayload } from "./public-surface-rules.mjs";

const files = {
  rawItems: new URL("../data/topics/nsfc-ddl/items.json", import.meta.url),
  rawMetrics: new URL("../data/topics/nsfc-ddl/metrics.json", import.meta.url),
  rawSources: new URL("../data/topics/nsfc-ddl/sources.json", import.meta.url),
  publicItems: new URL("../public-data/topics/nsfc-ddl/items.json", import.meta.url),
  publicMetrics: new URL("../public-data/topics/nsfc-ddl/metrics.json", import.meta.url),
  publicSources: new URL("../public-data/topics/nsfc-ddl/sources.json", import.meta.url)
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function assertNoPrivateKeys(value, label) {
  const errors = scanPublicPayload(value, label);
  assert.deepEqual(errors, []);

  function visit(node, path) {
    if (Array.isArray(node)) {
      node.forEach((entry, index) => visit(entry, `${path}[${index}]`));
      return;
    }
    if (!node || typeof node !== "object") return;
    for (const [key, nested] of Object.entries(node)) {
      assert.equal(isPrivateKey(key), false, `${path}.${key} should not be public`);
      visit(nested, `${path}.${key}`);
    }
  }

  visit(value, label);
}

const rawItems = readJson(files.rawItems);
const rawMetrics = readJson(files.rawMetrics);
const rawSources = readJson(files.rawSources);
const publicItems = readJson(files.publicItems);
const publicMetrics = readJson(files.publicMetrics);
const publicSources = readJson(files.publicSources);

assert.equal(publicItems.length, rawItems.length, "public export should preserve NSFC item count");
assert.equal(publicMetrics.length, rawMetrics.length, "public export should preserve NSFC metric count");
assert.equal(publicSources.sourceFamilies.length, rawSources.sourceFamilies.length, "public export should preserve source count");

const rawForecast = rawItems.find((item) => item.type === "forecastWindow" && item.releaseCadence && item.forecastBasis);
assert.ok(rawForecast, "expected raw NSFC forecast with internal basis fields");
const publicForecast = publicItems.find((item) => item.id === rawForecast.id);
assert.ok(publicForecast, "expected matching public forecast");
assert.equal(publicForecast.type, "forecastWindow");
assert.equal(publicForecast.confidence, rawForecast.confidence);
assert.deepEqual(publicForecast.estimatedNextWindow, rawForecast.estimatedNextWindow);
assert.deepEqual(publicForecast.basisEvents, rawForecast.basisEvents);
for (const key of ["forecastBasis", "releaseCadence", "parser", "accessMode", "scopeNote"]) {
  assert.equal(Object.hasOwn(publicForecast, key), false, `public forecast must not expose ${key}`);
}

const rawMetric = rawMetrics.find((metric) => metric.accessMode && metric.scopeNote);
assert.ok(rawMetric, "expected raw NSFC metric with scope/access metadata");
const publicMetric = publicMetrics.find((metric) => metric.id === rawMetric.id);
assert.ok(publicMetric, "expected matching public metric");
assert.equal(publicMetric.sourceLabel, "公开来源");
assert.equal(publicMetric.value, rawMetric.value);
assert.equal(publicMetric.asOfDate, rawMetric.asOfDate);
for (const key of ["accessMode", "scopeNote", "parser", "apiUrl", "licenseNote"]) {
  assert.equal(Object.hasOwn(publicMetric, key), false, `public metric must not expose ${key}`);
}

const rawSource = rawSources.sourceFamilies.find((source) => source.accessMode && source.refreshCadence);
assert.ok(rawSource, "expected raw NSFC source with maintenance metadata");
const publicSource = publicSources.sourceFamilies.find((source) => source.id === rawSource.id);
assert.ok(publicSource, "expected matching public source");
assert.equal(publicSource.sourceLabel, "公开来源");
for (const key of ["accessMode", "parser", "coverageNote", "refreshCadence", "crawlerReport"]) {
  assert.equal(Object.hasOwn(publicSource, key), false, `public source must not expose ${key}`);
}

assertNoPrivateKeys(publicItems, "public NSFC items");
assertNoPrivateKeys(publicMetrics, "public NSFC metrics");
assertNoPrivateKeys(publicSources, "public NSFC sources");

console.log(`tested NSFC public export cleanup for ${publicItems.length} items and ${publicMetrics.length} metrics`);
