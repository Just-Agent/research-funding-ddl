# Research Funding DDL

科研基金申请、评审结果、年度指南与历史节奏追踪专题族。

首个专题：`nsfc-ddl`，覆盖国家自然科学基金的集中接收、项目门类、初审结果、复审节点、结题/进展报告和历年申请窗口。

## 为什么不只做倒计时

科研基金不是一次性事件。大家真正关心的是：

- 今年申请什么时候开始、什么时候截止。
- 结果大概什么时候出来。
- 不同项目类型是否有单独节点。
- 过去几年节奏是否稳定。
- 下一年如果尚未官宣，按官方历史节奏大概在哪个窗口。

因此本仓库同时维护四类数据：

- `officialDeadline`：官方未来或已发生的明确节点。
- `historyEvent`：官方历史节点，用于时间线和节奏分析。
- `forecastWindow`：基于官方历史节点计算的预测窗口，不进入官方倒计时统计。
- `metricSnapshot`：年度申请规模、受理数、已公布资助数和公开比例等指标，必须注明口径。

## 当前覆盖

- `nsfc-ddl`：国家自然科学基金。
- 数据源：国家自然科学基金委员会官网、科学基金网络信息系统、官方通告/指南。
- 当前版本已经拆出 2026 集中接收项目门类：面上项目、青年科学基金 C/B/A 类、地区科学基金、重点项目、创新研究群体、卓越研究群体、重点国际合作、外国学者研究基金、合作创新研究团队、重大科研仪器、联合基金、重大研究计划和数学天元基金等。
- 同步基金管理节点：进展报告、结题电子版/纸质材料、年度管理报告、初审结果、不予受理复审和包干制备案。
- 评审结果预测只使用官方历史公布节点，显示为预测窗口，不进入正式倒计时。
- 指标轨迹已接入官方公开通告：2024/2025 年集中接收申请、受理、已公布资助规模和公开比例，2024 年 10 个已公布资助门类数量，以及 2026 年集中接收初审申请、受理和不予受理规模。

## Commands

```powershell
npm run crawl
npm run test:crawler
npm run validate
npm run build
npm run link-check
```

`npm run test:crawler` 使用本地样本文本固定 NSFC 官方通告抽取行为：集中接收申请窗口、项目门类、初审规模/复审、评审结果查询/邮件/复审窗口，以及官方绩效报告中的历年结果发布时间。它不访问网络，也不会改写真实数据。

## Hub Registration

Hub 侧注册为专题族：

```ts
{
  id: "nsfc-ddl",
  repo: "Just-Agent/research-funding-ddl",
  site: "https://just-agent.github.io/research-funding-ddl/",
  sourceMode: "cluster",
  clusterId: "research-funding-ddl",
  dataUrl: "public-data/topics/nsfc-ddl/items.json",
  metricsUrl: "public-data/topics/nsfc-ddl/metrics.json"
}
```

`data/` 保留维护字段供 validator 和 crawler 使用；Pages 与 Hub 只消费 `public-data/`。导出脚本会剥离开发、维护、调试、原始抓取、授权边界和预测依据类字段，只保留用户可读的数据。
