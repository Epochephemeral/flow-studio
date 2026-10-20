# 源码摘录：src/goods_kb/l2_selection/admission_service.py

原文件：`src/goods_kb/l2_selection/admission_service.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`e02591d3d3c419db8542153327d9b0e1a62848feaaf123b6bf71a9801a442b28`
摘录范围：1–60 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
1: from __future__ import annotations
2:
3: from typing import Any
4:
5: from goods_kb import fetch_admission
6: from goods_kb.cli_runtime import (
7:     SCHEMA_VERSION,
8:     _artifact_content_id,
9:     _artifact_fetch_dedupe_keys,
10:     _event_artifact,
11:     _fetch_admission_summary,
12:     _observation_artifact,
13:     _output_refs_from_job,
14:     _programmatic_fetch_admission_decision,
15: )
16: from goods_kb.l2_selection.llm import RouterLLMClient
17: from goods_kb.l2_selection import fetch_admission_decision_repo
18: from goods_kb.ops import repo as ops_repo
19: from goods_kb.raw import repo as raw_repo
20: from goods_kb.registry import repo as registry_repo
21: from goods_kb.runtime_defaults import INTERNAL_PAGE_SIZE, clamp_query_limit
22: from goods_kb.settings import get_settings
23:
24:
25: async def _persist_decision(pool, *, run_id: str | None, item: dict) -> dict:
26:     async with pool.acquire() as conn:
27:         async with conn.transaction():
28:             event = await ops_repo.append_event_on_conn(
29:                 conn,
30:                 run_id=run_id,
31:                 event_type="decision.made",
32:                 subject_key=item["artifact_id"],
33:                 input_refs=[item["artifact_id"]],
34:                 output_refs=[],
35:                 policy_refs=[item["prompt_ref"]],
36:                 payload=item,
37:                 payload_schema_key="fetch_admission_decision",
38:                 payload_schema_version=1,
39:             )
40:             await fetch_admission_decision_repo.insert_decision_on_conn(
41:                 conn,
42:                 item=item,
43:                 run_id=run_id,
44:                 occurred_at=event["occurred_at"],
45:             )
46:     return event
47:
48:
49: async def evaluate(
50:     pool,
51:     *,
52:     job_id: str | None,
53:     artifact_ids: list[str],
54:     prompt_ref: str,
55:     model: str | None = None,
56:     content_filter: dict[str, Any] | None = None,
57:     limit: int | None = None,
58:     dry_run: bool = False,
59:     defer_event_persistence: bool = False,
60:     operation: str = "fetch-admission.evaluate",
```
