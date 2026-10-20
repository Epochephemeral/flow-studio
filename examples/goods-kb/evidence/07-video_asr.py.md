# 源码摘录：src/goods_kb/media/video_asr.py

原文件：`src/goods_kb/media/video_asr.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`4da3453add1b1cfae98c1793cc839a8816edddff3e9014ddc6849102b6e67b95`
摘录范围：1–60 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
1: import re
2: import time
3: from dataclasses import dataclass, field
4: from typing import Any
5:
6: import httpx
7:
8: from goods_kb.outbound_http import get_http_client
9: from goods_kb.settings import load_media_api_settings
10:
11:
12: @dataclass
13: class VideoAsrResult:
14:     text: str | None
15:     segments: list[dict[str, Any]] = field(default_factory=list)
16:     duration_s: float | None = None
17:     mcp_duration_ms: int | None = None
18:     request_duration_ms: int | None = None
19:     stage_timings_ms: dict[str, int] = field(default_factory=dict)
20:     backend: str = ""
21:     error: str | None = None
22:     error_kind: str | None = None
23:     failure_phase: str | None = None
24:     selected_source_index: int | None = None
25:     source_attempts: int = 0
26:     http_status: int | None = None
27:     error_code: str | None = None
28:     error_details: dict[str, Any] = field(default_factory=dict)
29:
30:     @property
31:     def source_candidates_exhausted(self) -> bool:
32:         return (
33:             self.failure_phase in {"source_fetch", "source_decode"}
34:             and self.error_details.get("source_candidates_exhausted") is True
35:         )
36:
37:
38: class VideoAsrClient:
39:     def __init__(
40:         self,
41:         *,
42:         base_url: str | None = None,
43:         api_key: str | None = None,
44:         timeout_s: float | None = None,
45:         default_max_duration_s: int | None = None,
46:         http: httpx.AsyncClient | None = None,
47:     ) -> None:
48:         settings = load_media_api_settings() if (
49:             base_url is None
50:             or api_key is None
51:             or timeout_s is None
52:             or default_max_duration_s is None
53:         ) else None
54:         self._base_url = (base_url if base_url is not None else settings.media_api_url).rstrip("/")
55:         self._api_key = api_key if api_key is not None else settings.media_api_key
56:         self._timeout_s = timeout_s if timeout_s is not None else settings.media_api_timeout_s
57:         self._default_max_duration_s = (
58:             default_max_duration_s
59:             if default_max_duration_s is not None
60:             else settings.media_asr_max_duration_s
```
