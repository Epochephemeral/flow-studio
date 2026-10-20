# 源码摘录：src/goods_kb/dimension/claim_client.py

原文件：`src/goods_kb/dimension/claim_client.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`9bb45db94b1c3436a392ddbb532cebed4bc166dfb89f87cbb14961f94f75ecc7`
摘录范围：1–60 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
1: from __future__ import annotations
2:
3: import copy
4: from dataclasses import dataclass
5: import json
6: import re
7: import sys
8: from typing import Any, Protocol
9:
10: from jsonschema import Draft202012Validator
11:
12: from goods_kb.l2_selection.llm import LLMClient, RouterLLMClient
13: from goods_kb.llm_deadline import transport_timeout_s, wait_hard
14: from goods_kb.llm_json import parse_model_json
15: from goods_kb.settings import get_settings
16:
17:
18: @dataclass(frozen=True, slots=True)
19: class ClaimGenerationResult:
20:     claims: tuple[dict, ...]
21:     dropped_claims: tuple[dict, ...] = ()
22:
23:     def __iter__(self):
24:         return iter(self.claims)
25:
26:     def __len__(self) -> int:
27:         return len(self.claims)
28:
29:     def __getitem__(self, index):
30:         return self.claims[index]
31:
32:     def __eq__(self, other) -> bool:
33:         if isinstance(other, ClaimGenerationResult):
34:             return self.claims == other.claims and self.dropped_claims == other.dropped_claims
35:         if isinstance(other, (list, tuple)):
36:             return self.claims == tuple(other)
37:         return NotImplemented
38:
39:
40: class ClaimClient(Protocol):
41:     async def generate_claims(
42:         self,
43:         *,
44:         model: str,
45:         claim_prompt: str,
46:         dimension_prompt: str,
47:         source: dict,
48:         response_schema: dict[str, Any],
49:         max_tokens: int | None = None,
50:         llm_extra_body: dict[str, Any] | None = None,
51:     ) -> ClaimGenerationResult: ...
52:
53:
54: class FakeClaimClient:
55:     """Deterministic fake client for unit tests and dry local wiring."""
56:
57:     def __init__(
58:         self,
59:         *,
60:         claims_by_source_ref: dict[str, list[dict]] | None = None,
```
