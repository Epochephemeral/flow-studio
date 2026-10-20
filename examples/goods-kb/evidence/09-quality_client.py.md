# 源码摘录：src/goods_kb/content/quality_client.py

原文件：`src/goods_kb/content/quality_client.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`cf4c64a64714358444ea327772633aac1db224f1a982015d2b961be7378fbcdc`
摘录范围：1–60 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
1: from __future__ import annotations
2:
3: import copy
4: import json
5: from typing import Any, Protocol
6:
7: from goods_kb.l2_selection.llm import LLMClient, RouterLLMClient
8: from goods_kb.llm_json import parse_model_json
9: from goods_kb.settings import get_settings
10:
11:
12: class ContentQualityClient(Protocol):
13:     async def evaluate_content_quality(
14:         self,
15:         *,
16:         model: str,
17:         quality_prompt: str,
18:         source: dict,
19:         max_tokens: int | None = None,
20:         llm_extra_body: dict[str, Any] | None = None,
21:         llm_base_url: str | None = None,
22:         llm_api_key: str | None = None,
23:     ) -> dict: ...
24:
25:
26: class FakeContentQualityClient:
27:     """Deterministic fake client for unit tests and local wiring."""
28:
29:     def __init__(
30:         self,
31:         *,
32:         judgments_by_source_ref: dict[str, dict] | None = None,
33:         default_judgment: dict | None = None,
34:     ) -> None:
35:         self._judgments_by_source_ref = judgments_by_source_ref or {}
36:         self._default_judgment = default_judgment or {}
37:         self.calls: list[dict[str, Any]] = []
38:
39:     async def evaluate_content_quality(
40:         self,
41:         *,
42:         model: str,
43:         quality_prompt: str,
44:         source: dict,
45:         max_tokens: int | None = None,
46:         llm_extra_body: dict[str, Any] | None = None,
47:         llm_base_url: str | None = None,
48:         llm_api_key: str | None = None,
49:     ) -> dict:
50:         self.calls.append(
51:             {
52:                 "model": model,
53:                 "quality_prompt": quality_prompt,
54:                 "source": copy.deepcopy(source),
55:                 "max_tokens": max_tokens,
56:                 "llm_extra_body": copy.deepcopy(llm_extra_body),
57:                 "llm_base_url": llm_base_url,
58:                 "llm_api_key": llm_api_key,
59:             }
60:         )
```
