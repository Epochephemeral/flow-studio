# 源码摘录：src/goods_kb/dimension/claim_metadata_service.py

原文件：`src/goods_kb/dimension/claim_metadata_service.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`957a1d289613638edfb0ff7edd32ca5a88aec62e32996073112bd7c7a55f9a6e`
摘录范围：68–127 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
68: async def route_claim_metadata(
69:     pool,
70:     *,
71:     task_policy_ref: str,
72:     embedder: Embedder,
73:     run_id: str | None,
74:     dry_run: bool = False,
75:     source_category_entity_id: str | None = None,
76:     claim_artifact_ids: list[str] | None = None,
77:     candidate_category_entity_ids: list[str] | None = None,
78:     limit: int | None = None,
79:     reroute: bool = False,
80:     allow_archived_policy: bool = False,
81:     dimension_llm: LLMClient | None = None,
82:     enable_category_discovery: bool = True,
83: ) -> dict:
84:     if not source_category_entity_id and not claim_artifact_ids:
85:         raise ValueError("claim.metadata.route 需要 source_category_entity_id 或 claim_artifact_ids")
86:
87:     embedding_request_count_before = _numeric_counter(
88:         embedder,
89:         "request_count",
90:     )
91:     embedding_input_text_count_before = _numeric_counter(
92:         embedder,
93:         "input_text_count",
94:     )
95:     counting_llm = _CountingLLMClient(dimension_llm)
96:     category_compatibility_metrics = {"llm_calls": 0}
97:     context = await _load_context(
98:         pool,
99:         task_policy_ref=task_policy_ref,
100:         allow_archived=allow_archived_policy,
101:     )
102:     source_limit = _limit(limit)
103:     claims = await _list_claims(
104:         pool,
105:         source_category_entity_id=source_category_entity_id,
106:         claim_artifact_ids=list(claim_artifact_ids or []),
107:         route_policy_ref=task_policy_ref,
108:         model=embedder.model,
109:         version=embedder.version,
110:         limit=source_limit,
111:         reroute=reroute,
112:         product_retrieval_policy_ref=str(
113:             context.get("product_retrieval_policy_ref") or ""
114:         ),
115:         category_compatibility_policy_ref=str(
116:             context.get("category_compatibility_policy_ref") or ""
117:         ),
118:     )
119:     category_candidates = await _list_category_candidates(
120:         pool,
121:         candidate_category_entity_ids=list(candidate_category_entity_ids or []),
122:     )
123:     category_vectors = await _ensure_entity_embeddings(
124:         pool,
125:         entities=category_candidates,
126:         subject_kind="category",
127:         embedder=embedder,
```
