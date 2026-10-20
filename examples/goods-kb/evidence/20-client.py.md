# 源码摘录：src/goods_kb/insight/client.py

原文件：`src/goods_kb/insight/client.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`962b133e9777deb3b09c698cb31835986dd83d1d5445498117b6d36c0211c079`
摘录范围：1–60 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
1: from __future__ import annotations
2:
3: import asyncio
4: import copy
5: import json
6: from typing import Any, Protocol
7:
8: from jsonschema import Draft202012Validator
9:
10: from goods_kb.l2_selection.llm import LLMClient, RouterLLMClient
11: from goods_kb.settings import get_settings
12:
13:
14: class InsightClient(Protocol):
15:     async def generate_insights(
16:         self,
17:         *,
18:         model: str,
19:         prompt_text: str,
20:         source: dict,
21:         response_schema: dict[str, Any],
22:         max_tokens: int | None = None,
23:         llm_extra_body: dict[str, Any] | None = None,
24:         timeout_s: float | None = None,
25:     ) -> dict: ...
26:
27:
28: class FakeInsightClient:
29:     """Return deterministic model-result JSON for service tests."""
30:
31:     def __init__(
32:         self,
33:         *,
34:         results_by_source_ref: dict[str, dict] | None = None,
35:         default_result: dict | None = None,
36:     ) -> None:
37:         self._results_by_source_ref = results_by_source_ref or {}
38:         self._default_result = default_result or {
39:             "category_name": None,
40:             "insights": [],
41:         }
42:         self.calls: list[dict[str, Any]] = []
43:
44:     async def generate_insights(
45:         self,
46:         *,
47:         model: str,
48:         prompt_text: str,
49:         source: dict,
50:         response_schema: dict[str, Any],
51:         max_tokens: int | None = None,
52:         llm_extra_body: dict[str, Any] | None = None,
53:         timeout_s: float | None = None,
54:     ) -> dict:
55:         self.calls.append(
56:             {
57:                 "model": model,
58:                 "prompt_text": prompt_text,
59:                 "source": copy.deepcopy(source),
60:                 "response_schema": copy.deepcopy(response_schema),
```
