import { parseSource } from "./crawl-sources.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function byKind(discoveries, kind) {
  return discoveries.find((entry) => entry.kind === kind);
}

function source(overrides = {}) {
  return {
    id: "nsfc-parser-smoke",
    url: "https://www.nsfc.gov.cn/",
    parser: "nsfc-notice-page",
    accessMode: "public",
    markers: [],
    ...overrides
  };
}

function testApplicationNoticeParser() {
  const html = `
    <html><body>
      业务资讯 关于2026年度国家自然科学基金项目申请与结题等有关事项的通告。
      日期： 2026-01-10
      2026年度集中接收申请的项目类型包括：面上项目、青年科学基金项目、地区科学基金项目、重点项目等。集中接收工作于
      2026 年 3 月 1 日开始， 3 月 20 日 16 时截止。
      将于 2026 年 4 月 30 日前 公布申请项目初审结果。
      于 2026 年 1 月 15 日前 逐项确认。
      应于 2026 年 2 月 1 日 16 时前通过信息系统对结题材料进行审核并逐项确认。
      2月10日前将经单位签字盖章后的纸质结题/成果报告。
      于 2026 年 1 月 10 日 — 1 月 20 日 16 时 期间提交电子材料。
      应于 2026 年 1 月 31 日 16 时前，将本单位制定的项目经费包干制管理规定。
    </body></html>
  `;

  const parsed = parseSource(source(), html);
  const application = byKind(parsed.discoveries, "applicationWindow");
  const preliminaryPlan = byKind(parsed.discoveries, "preliminaryReviewPlan");
  const finalOnline = byKind(parsed.discoveries, "finalReportOnlineDeadline");
  const annualReport = byKind(parsed.discoveries, "annualManagementReportWindow");

  assert(application, "application notice should produce an applicationWindow discovery");
  assert(application.start === "2026-03-01", `unexpected application start ${application.start}`);
  assert(application.end === "2026-03-20T16:00:00+08:00", `unexpected application end ${application.end}`);
  assert(application.projectTypes.includes("青年科学基金项目"), "application parser should extract project types");
  assert(preliminaryPlan?.date === "2026-04-30", "application parser should extract preliminary review plan");
  assert(finalOnline?.deadline === "2026-02-01T16:00:00+08:00", "application parser should extract final online report deadline");
  assert(annualReport?.end === "2026-01-20T16:00:00+08:00", "application parser should extract annual report window");
}

function testPreliminaryReviewParser() {
  const html = `
    <html><body>
      业务资讯 关于公布2026年度国家自然科学基金项目申请初审结果的通告。
      日期： 2026-04-29
      共接收各类型项目申请433426项。
      经初审，共受理项目申请432000项，不予受理项目申请1426项。
      应在2026年5月5日16时前向相关项目管理部门提出复审申请。
      审查结果将由相关项目管理部门在6月5日前书面通知申请人。
    </body></html>
  `;

  const parsed = parseSource(source(), html);
  const metrics = byKind(parsed.discoveries, "preliminaryReviewMetrics");
  const recheck = byKind(parsed.discoveries, "preliminaryRecheckDeadline");
  const result = byKind(parsed.discoveries, "preliminaryRecheckResultBy");

  assert(metrics?.applicationsReceived === 433426, "preliminary parser should extract received application count");
  assert(metrics?.applicationsInitialAccepted === 432000, "preliminary parser should extract accepted application count");
  assert(metrics?.applicationsInitialNotAccepted === 1426, "preliminary parser should extract not-accepted application count");
  assert(recheck?.deadline === "2026-05-05T16:00:00+08:00", "preliminary parser should extract recheck deadline");
  assert(result?.date === "2026-06-05", "preliminary parser should extract recheck result date");
}

function testReviewResultsParser() {
  const html = `
    <html><body>
      业务资讯 关于2025年国家自然科学基金集中接收申请项目评审结果的通告。
      日期： 2025-08-27
      共接收项目申请433426项，经初审和复审后共受理425000项。
      面上项目、青年科学基金项目等10类项目共53400项。
      可于8月27日以后登录科学基金网络信息系统。
      将于8月27日至29日使用report@pro.nsfc.gov.cn电子邮箱向申请人发送。
      复审申请接收工作自8月27日开始，9月10日16时截止。
    </body></html>
  `;

  const parsed = parseSource(source(), html);
  const metrics = byKind(parsed.discoveries, "reviewResultMetrics");
  const queryOpen = byKind(parsed.discoveries, "reviewResultQueryOpen");
  const emailWindow = byKind(parsed.discoveries, "reviewResultEmailWindow");
  const recheckWindow = byKind(parsed.discoveries, "fundingDecisionRecheckWindow");

  assert(metrics?.applicationsReceived === 433426, "review-result parser should extract received application count");
  assert(metrics?.applicationsAcceptedAfterReview === 425000, "review-result parser should extract accepted-after-review count");
  assert(metrics?.fundedProjectTypeCount === 10, "review-result parser should extract funded project type count");
  assert(metrics?.fundedProjectsAnnounced === 53400, "review-result parser should extract funded projects announced");
  assert(queryOpen?.date === "2025-08-27", "review-result parser should extract query-open date");
  assert(emailWindow?.start === "2025-08-27" && emailWindow?.end === "2025-08-29", "review-result parser should extract email window");
  assert(recheckWindow?.end === "2025-09-10T16:00:00+08:00", "review-result parser should extract recheck close time");
}

function testPerformanceReportParser() {
  const parsed = parseSource(
    source({
      id: "nsfc-2023-performance-report",
      parser: "nsfc-performance-report",
      eventYear: 2023,
      reviewResultDate: "2023-08-24"
    }),
    "<html><body>performance report metadata source</body></html>"
  );
  const result = byKind(parsed.discoveries, "reviewResultPublishedFromPerformanceReport");
  assert(result?.year === 2023, "performance report parser should preserve event year");
  assert(result?.date === "2023-08-24", "performance report parser should preserve review result date");
}

testApplicationNoticeParser();
testPreliminaryReviewParser();
testReviewResultsParser();
testPerformanceReportParser();

console.log("NSFC crawler parser smoke tests passed");
