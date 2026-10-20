# 源码摘录：src/goods_kb/search/fire.py

原文件：`src/goods_kb/search/fire.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`a085d80e3f0764b1062e2b98a639fa33900b1d4a1142c3349ef4ce13213c675c`
摘录范围：1–60 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
1: import hashlib
2: import json
3: from typing import Any
4:
5: from goods_kb.catalog import repo as catalog_repo
6: from goods_kb.ops import repo as ops_repo
7: from goods_kb.payload_kinds import SEARCH_ITEM_PAYLOAD_KIND
8: from goods_kb.product_coverage import relevance_service
9: from goods_kb.raw import repo as raw_repo
10: from goods_kb.registry import repo as registry_repo
11: from goods_kb.runtime_defaults import SEARCH_FIRST_PAGE, SEARCH_MAX_DEPTH_PAGES, SINGLE_RECORD_LIMIT
12: from goods_kb.search import candidate_gate
13: from goods_kb.search import repo as search_repo
14:
15:
16: async def run_search_fire(pool, *, transport, input_data: dict, dry_run: bool = False) -> dict:
17:     category = await _load_category(pool, input_data)
18:     query_set_ref = str(input_data.get("query_set_ref") or "").strip()
19:     if not query_set_ref:
20:         raise ValueError("search.fire 缺少 query_set_ref")
21:     query_set = await registry_repo.get_artifact(pool, artifact_id=query_set_ref)
22:     if query_set is None:
23:         raise ValueError(f"不存在 query set: {query_set_ref}")
24:     platforms = _required_list(input_data, "platforms")
25:     defaults = _search_defaults(query_set)
26:     depth_pages = _depth_pages(input_data, defaults=defaults)
27:     gate = _candidate_gate(input_data, platforms=platforms)
28:     stop_on_short_page = _stop_on_short_page(input_data)
29:     sort = input_data.get("sort", defaults.get("sort"))
30:     filters = input_data.get("filters") or defaults.get("filters") or {}
31:     queries = _expand_queries(category, query_set, input_data)
32:     target_product = input_data.get("target_product")
33:     relevance_policy_ref = str(
34:         input_data.get("product_relevance_policy_ref") or ""
35:     ).strip()
36:     if target_product is not None:
37:         if len(platforms) != 1 or len(queries) != 1:
38:             raise ValueError(
39:                 "target_product search.fire 必须是单一平台、单一精确搜索词"
40:             )
41:         relevance_service.validate_query_target(
42:             query_text=queries[0],
43:             query_type=str(input_data.get("query_type") or "").strip(),
44:             source_refs=_string_list(input_data.get("source_refs")),
45:             target_product=target_product,
46:             allow_ugc_scopes=bool(input_data.get("product_ugc_profile_ref")),
47:         )
48:         if not relevance_policy_ref:
49:             raise ValueError(
50:                 "target_product search.fire 需要 product_relevance_policy_ref"
51:             )
52:         await relevance_service.validate_policy_ref(
53:             pool,
54:             policy_ref=relevance_policy_ref,
55:         )
56:     elif relevance_policy_ref:
57:         raise ValueError(
58:             "product_relevance_policy_ref 只能与 target_product 配套使用"
59:         )
60:     search_metadata = _search_metadata(input_data)
```
