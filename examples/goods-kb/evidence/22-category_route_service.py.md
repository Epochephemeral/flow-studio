# 源码摘录：src/goods_kb/insight/category_route_service.py

原文件：`src/goods_kb/insight/category_route_service.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`ab18f428e756501894a7db6868dfdaca021c39a52470726fc2991e39721e325a`
摘录范围：1–60 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
1: """Route extracted purchasing Insights to the catalog category taxonomy."""
2:
3: from __future__ import annotations
4:
5: from goods_kb.derived import embedding_repo
6: from goods_kb.dimension import claim_metadata_service
7: from goods_kb.dimension.embedding_client import Embedder
8: from goods_kb.insight import category_route_repo
9:
10:
11: def build_route_text(*, category_name: str | None, insights: list[dict]) -> str:
12:     lines: list[str] = []
13:     name = str(category_name or "").strip()
14:     if name:
15:         lines.append(f"品类：{name}")
16:     for item in insights:
17:         text = str((item or {}).get("insight") or "").strip()
18:         if text:
19:             lines.append(f"Insight：{text}")
20:     return "\n".join(lines)
21:
22:
23: async def route_insight_category(
24:     pool,
25:     *,
26:     insight_artifact: dict,
27:     quality_artifact_id: str,
28:     quality_task_policy_ref: str,
29:     automatic_insight_policy_ref: str,
30:     insight_task_policy_ref: str,
31:     route_policy_ref: str,
32:     embedder: Embedder,
33:     run_id: str | None,
34:     dry_run: bool = False,
35: ) -> dict:
36:     if insight_artifact.get("artifact_type") != "content_insight_set":
37:         raise ValueError("category route 要求 content_insight_set artifact")
38:     insight_artifact_id = str(insight_artifact["artifact_id"])
39:     payload = dict(insight_artifact.get("payload") or {})
40:     if str(payload.get("task_policy_ref") or "") != insight_task_policy_ref:
41:         raise ValueError("Insight artifact 与 exact extraction policy 不一致")
42:     result = dict(payload.get("result") or {})
43:     insights = list(result.get("insights") or [])
44:     if not insights:
45:         return {
46:             "state": "not_applicable",
47:             "reason": "empty_insights",
48:             "insight_artifact_id": insight_artifact_id,
49:             "route_artifact_id": None,
50:         }
51:
52:     context = await claim_metadata_service._load_context(
53:         pool,
54:         task_policy_ref=route_policy_ref,
55:         allow_archived=True,
56:     )
57:     embedding_policy = dict(context.get("policy_body", {}).get("embedding") or {})
58:     if (
59:         str(embedding_policy.get("model") or "") != embedder.model
60:         or int(embedding_policy.get("version") or 1) != embedder.version
```
