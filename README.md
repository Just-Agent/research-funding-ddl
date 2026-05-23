# Research Funding DDL

科研基金申请、评审结果、年度指南与历史节奏追踪专题族。

首个专题：`nsfc-ddl`，覆盖国家自然科学基金的集中接收、初审结果、评审结果、复审节点和历年申请窗口。

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
- `metricSnapshot`：预留给资助率、项目数量等年度统计，必须注明口径。

## 当前覆盖

- `nsfc-ddl`：国家自然科学基金。
- 数据源：国家自然科学基金委员会官网、科学基金网络信息系统、官方通告/指南。
- 当前第一版先覆盖集中接收与评审节奏，后续按项目类型拆分：面上、青年、地区、重点、重大研究计划、国际合作、联合基金。

## Commands

```powershell
npm run crawl
npm run validate
npm run link-check
```

## Hub Registration

Hub 侧注册为专题族：

```ts
{
  id: "nsfc-ddl",
  repo: "Just-Agent/research-funding-ddl",
  site: "https://just-agent.github.io/research-funding-ddl/",
  sourceMode: "cluster",
  clusterId: "research-funding-ddl",
  dataUrl: "data/topics/nsfc-ddl/items.json"
}
```
