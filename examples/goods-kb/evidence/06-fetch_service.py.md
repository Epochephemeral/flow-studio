# 源码摘录：src/goods_kb/l2_selection/fetch_service.py

原文件：`src/goods_kb/l2_selection/fetch_service.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`0e001dabcf9f0306c37a9c2d26ca80e8389d37da9e6d46db3f190bb62000bfa7`
摘录范围：1–60 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
1: from __future__ import annotations
2:
3: from goods_kb.cli_runtime import (
4:     SCHEMA_VERSION,
5:     _admitted_artifact_ids_from_events,
6:     _artifact_content_id,
7:     _artifact_fetch_dedupe_keys,
8:     _content_fetch_counts,
9:     _content_fetch_preview_item,
10:     _first_nonempty,
11:     _observation_artifact,
12:     _path_get,
13:     _plain_text,
14:     _unique_text_parts,
15: )
16: from goods_kb.gateway.transport import GatewayTransport
17: from goods_kb.l2_selection import fetch_repo, fetch_worker
18: from goods_kb.ops import repo as ops_repo
19: from goods_kb.paging import collect_all_pages
20: from goods_kb.raw import repo as raw_repo
21: from goods_kb.runtime_defaults import QUERY_DEFAULT_LIMIT, clamp_query_limit
22:
23:
24: async def run(
25:     pool,
26:     *,
27:     job_id: str | None,
28:     artifact_ids: list[str],
29:     platforms: list[str] | None = None,
30:     limit: int | None = QUERY_DEFAULT_LIMIT,
31:     dry_run: bool = False,
32:     operation: str = "content.fetch",
33:     input_data: dict,
34: ) -> dict:
35:     """Run content.fetch over a set of artifacts.
36:
37:     Pure move of the orchestration that previously lived in
38:     ``cli_runtime.GoodsKbRuntime._run_content_fetch`` below the
39:     ``pool = await self._pool()`` line. Behavior is intentionally unchanged;
40:     the item-level helper ``_fetch_one_artifact`` (plus its private
41:     skip/record helpers, which serve only content.fetch) moved with it, while
42:     the shared projection helpers are imported from ``cli_runtime`` and not
43:     redefined.
44:     """
45:     if not job_id and not artifact_ids:
46:         raise ValueError("content.fetch 需要 input.job_id 或 input.artifact_ids")
47:
48:     limit = clamp_query_limit(limit)
49:     decision_event_by_artifact_id: dict[str, str] = {}
50:     if job_id and not artifact_ids:
51:         events = await collect_all_pages(
52:             lambda *, limit, offset: ops_repo.list_events(pool, run_id=job_id, limit=limit, offset=offset)
53:         )
54:         artifact_ids = _admitted_artifact_ids_from_events(
55:             events,
56:             decision_event_by_artifact_id,
57:         )
58:     platform_filter = set(platforms or [])
59:     observation_ids = artifact_ids if platform_filter else artifact_ids[:limit]
60:     observations = await raw_repo.list_observations_by_ids(pool, observation_ids=observation_ids)
```
