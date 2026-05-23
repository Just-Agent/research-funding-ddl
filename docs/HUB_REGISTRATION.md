# Hub Registration

Register each topic separately in `Just-Agent/just-ddl`, even when multiple topics share this repository.

```ts
{
  id: "nsfc-ddl",
  name: "国家自然科学基金",
  repo: "Just-Agent/research-funding-ddl",
  site: "https://just-agent.github.io/research-funding-ddl/",
  sourceMode: "cluster",
  clusterId: "research-funding-ddl",
  dataUrl: "data/topics/nsfc-ddl/items.json",
  status: "published"
}
```

For history/metric topics, keep these conventions:

- `officialDeadline` items power Hub countdown stats.
- `historyEvent`, `metricSnapshot`, and `forecastWindow` stay available to topic details and miniprogram export.
- If detailed data is licensed or login-only, publish public metadata and explain how authorized imports are maintained.

First Hub topic id:

- `nsfc-ddl`
