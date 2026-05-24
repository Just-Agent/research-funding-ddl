import fs from "node:fs";

const root = new URL("../data/topics/", import.meta.url);
const report = {
  generatedAt: new Date().toISOString(),
  mode: "source-specific-crawler",
  topics: []
};

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isoDate(year, month, day, suffix = "") {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}${suffix}`;
}

function firstMatch(text, pattern) {
  const match = text.match(pattern);
  return match ? match.slice(1) : null;
}

function parsePageMeta(text) {
  const title = firstMatch(text, /业务资讯\s+([^。]+?通告|[^。]+?通知|[^。]+?公告|[^。]+?项目指南)/)?.[0]
    || firstMatch(text, /项目指南\s+([^。]+?通告|[^。]+?通知|[^。]+?项目指南)/)?.[0]
    || "";
  const dateParts = firstMatch(text, /日期：\s*(\d{4})-(\d{2})-(\d{2})/);
  return {
    title,
    publishedDate: dateParts ? `${dateParts[0]}-${dateParts[1]}-${dateParts[2]}` : null
  };
}

function parseProjectTypes(text, year) {
  const escapedYear = String(year).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${escapedYear}年度集中接收申请的项目类型包括：(.+?)等。集中接收工作于`);
  const match = text.match(pattern);
  if (!match) return [];
  return match[1]
    .split(/[、，]/)
    .map((entry) => entry.replace(/[。；;]$/g, "").trim())
    .filter(Boolean);
}

function parseApplicationNotice(text, source) {
  const year = Number(firstMatch(text, /关于(\d{4})年度国家自然科学基金项目申请/)?.[0]);
  if (!year) return null;

  const discoveries = [];
  const receive = firstMatch(text, /集中接收工作于\s*(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日开始，\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*(\d{1,2})\s*时截止/);
  const projectTypes = parseProjectTypes(text, year);
  if (receive) {
    discoveries.push({
      kind: "applicationWindow",
      year,
      start: isoDate(Number(receive[0]), Number(receive[1]), Number(receive[2])),
      end: isoDate(Number(receive[0]), Number(receive[3]), Number(receive[4]), `T${String(receive[5]).padStart(2, "0")}:00:00+08:00`),
      projectTypes,
      sourceId: source.id
    });
  }

  const reviewPlan = firstMatch(text, /将于\s*(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日前\s*公布申请项目初审结果/);
  if (reviewPlan) {
    discoveries.push({
      kind: "preliminaryReviewPlan",
      year,
      date: isoDate(Number(reviewPlan[0]), Number(reviewPlan[1]), Number(reviewPlan[2])),
      qualifier: "on_or_before",
      sourceId: source.id
    });
  }

  const progress = firstMatch(text, /于\s*(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日前\s*逐项确认/);
  if (progress) {
    discoveries.push({
      kind: "progressReportDeadline",
      year,
      deadline: isoDate(Number(progress[0]), Number(progress[1]), Number(progress[2])),
      sourceId: source.id
    });
  }

  const finalOnline = firstMatch(text, /应于\s*(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*(\d{1,2})\s*时前通过信息系统对结题材料进行审核并逐项确认/);
  if (finalOnline) {
    discoveries.push({
      kind: "finalReportOnlineDeadline",
      year,
      deadline: isoDate(Number(finalOnline[0]), Number(finalOnline[1]), Number(finalOnline[2]), `T${String(finalOnline[3]).padStart(2, "0")}:00:00+08:00`),
      sourceId: source.id
    });
  }

  const finalPaper = firstMatch(text, /(\d{1,2})月(\d{1,2})日前将经单位签字盖章后的纸质结题\/成果报告/);
  if (finalPaper) {
    discoveries.push({
      kind: "finalReportPaperDeadline",
      year,
      deadline: isoDate(year, Number(finalPaper[0]), Number(finalPaper[1])),
      sourceId: source.id
    });
  }

  const annualReport = firstMatch(text, /于\s*(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*[—–-]\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*(\d{1,2})\s*时\s*期间提交电子材料/);
  if (annualReport) {
    discoveries.push({
      kind: "annualManagementReportWindow",
      year,
      start: isoDate(Number(annualReport[0]), Number(annualReport[1]), Number(annualReport[2])),
      end: isoDate(Number(annualReport[0]), Number(annualReport[3]), Number(annualReport[4]), `T${String(annualReport[5]).padStart(2, "0")}:00:00+08:00`),
      sourceId: source.id
    });
  }

  const lumpSum = firstMatch(text, /应于\s*(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*(\d{1,2})\s*时前，将本单位制定的项目经费包干制管理规定/);
  if (lumpSum) {
    discoveries.push({
      kind: "lumpSumPolicyFilingDeadline",
      year,
      deadline: isoDate(Number(lumpSum[0]), Number(lumpSum[1]), Number(lumpSum[2]), `T${String(lumpSum[3]).padStart(2, "0")}:00:00+08:00`),
      sourceId: source.id
    });
  }

  return discoveries;
}

function parsePreliminaryReviewNotice(text, source) {
  const year = Number(firstMatch(text, /关于公布(\d{4})年度国家自然科学基金项目申请初审结果/)?.[0]);
  if (!year) return null;
  const discoveries = [];
  const received = firstMatch(text, /共接收各类型项目申请(\d+)项/);
  const accepted = firstMatch(text, /经初审，共受理项目申请(\d+)项，不予受理项目申请(\d+)项/);
  if (received || accepted) {
    discoveries.push({
      kind: "preliminaryReviewMetrics",
      year,
      applicationsReceived: received ? Number(received[0]) : null,
      applicationsInitialAccepted: accepted ? Number(accepted[0]) : null,
      applicationsInitialNotAccepted: accepted ? Number(accepted[1]) : null,
      sourceId: source.id
    });
  }
  const recheck = firstMatch(text, /(?:应在|可在)(\d{4})年(\d{1,2})月(\d{1,2})日(\d{1,2})时前向相关项目管理部门提出复审申请/);
  if (recheck) {
    discoveries.push({
      kind: "preliminaryRecheckDeadline",
      year,
      deadline: isoDate(Number(recheck[0]), Number(recheck[1]), Number(recheck[2]), `T${String(recheck[3]).padStart(2, "0")}:00:00+08:00`),
      sourceId: source.id
    });
  }
  const result = firstMatch(text, /审查结果将由相关项目管理部门在(\d{1,2})月(\d{1,2})日前书面通知申请人/);
  if (result) {
    discoveries.push({
      kind: "preliminaryRecheckResultBy",
      year,
      date: isoDate(year, Number(result[0]), Number(result[1])),
      qualifier: "on_or_before",
      sourceId: source.id
    });
  }
  return discoveries;
}

function parseReviewResultsNotice(text, source) {
  const year = Number(firstMatch(text, /关于(\d{4})年国家自然科学基金集中接收申请项目评审结果/)?.[0]);
  if (!year) return null;

  const discoveries = [];
  const summary = firstMatch(text, /共接收项目申请(\d+)项，经初审和复审后共受理(\d+)项/);
  const funded = firstMatch(text, /等(\d+)类项目共(\d+)项/);
  if (summary) {
    discoveries.push({
      kind: "reviewResultMetrics",
      year,
      applicationsReceived: Number(summary[0]),
      applicationsAcceptedAfterReview: Number(summary[1]),
      fundedProjectTypeCount: funded ? Number(funded[0]) : null,
      fundedProjectsAnnounced: funded ? Number(funded[1]) : null,
      sourceId: source.id
    });
  }

  const queryOpen = firstMatch(text, /可于(\d{1,2})月(\d{1,2})日以后登录科学基金网络信息系统/);
  if (queryOpen) {
    discoveries.push({
      kind: "reviewResultQueryOpen",
      year,
      date: isoDate(year, Number(queryOpen[0]), Number(queryOpen[1])),
      sourceId: source.id
    });
  }

  const emailWindow = firstMatch(text, /将于(\d{1,2})月(\d{1,2})日至(\d{1,2})日使用report@pro\.nsfc\.gov\.cn电子邮箱向申请人发送/);
  if (emailWindow) {
    discoveries.push({
      kind: "reviewResultEmailWindow",
      year,
      start: isoDate(year, Number(emailWindow[0]), Number(emailWindow[1])),
      end: isoDate(year, Number(emailWindow[0]), Number(emailWindow[2])),
      sourceId: source.id
    });
  }

  const recheckWindow = firstMatch(text, /复审申请接收工作自(\d{1,2})月(\d{1,2})日开始，(\d{1,2})月(\d{1,2})日(\d{1,2})时截止/);
  if (recheckWindow) {
    discoveries.push({
      kind: "fundingDecisionRecheckWindow",
      year,
      start: isoDate(year, Number(recheckWindow[0]), Number(recheckWindow[1])),
      end: isoDate(year, Number(recheckWindow[2]), Number(recheckWindow[3]), `T${String(recheckWindow[4]).padStart(2, "0")}:00:00+08:00`),
      sourceId: source.id
    });
  }

  return discoveries;
}

function parseOfficialNoticeList(html, source) {
  const discoveries = [];
  const itemPattern = /href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]{0,300}?<div>(\d{4}-\d{2}-\d{2})<\/div>/g;
  let match;
  while ((match = itemPattern.exec(html))) {
    const title = match[2].trim();
    if (!/(国家自然科学基金|科学基金|项目指南|初审结果|评审结果|结题|年度报告)/.test(title)) continue;
    discoveries.push({
      kind: "officialNoticeListItem",
      title,
      url: new URL(match[1], source.url).toString(),
      date: match[3],
      sourceId: source.id
    });
  }
  return discoveries;
}

function parseSource(source, html) {
  const text = htmlToText(html);
  const parser = source.parser || "";
  let discoveries = [];
  if (/项目申请初审结果/.test(text)) {
    discoveries = parsePreliminaryReviewNotice(text, source) || [];
  } else if (/集中接收申请项目评审结果/.test(text)) {
    discoveries = parseReviewResultsNotice(text, source) || [];
  } else if (/年度项目申请与结题|关于\d{4}年度国家自然科学基金项目申请与结题/.test(text)) {
    discoveries = parseApplicationNotice(text, source) || [];
  } else if (parser === "nsfc-notice-list") {
    discoveries = parseOfficialNoticeList(html, source);
  }
  return {
    ...parsePageMeta(text),
    markersFound: (source.markers || []).filter((marker) => text.includes(marker)),
    discoveries
  };
}

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
        if (response.ok) {
          const html = await response.text();
          const parsed = parseSource(source, html);
          entry.title = parsed.title;
          entry.publishedDate = parsed.publishedDate;
          entry.markersFound = parsed.markersFound;
          entry.markerStatus = (source.markers || []).length === parsed.markersFound.length ? "complete" : "partial";
          entry.parsedItemCount = parsed.discoveries.length;
          entry.discoveries = parsed.discoveries;
          entry.parserHealthy = parsed.discoveries.length > 0 || source.parser === "manual-guide-page";
        }
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
