# 源码摘录：src/goods_kb/content/text_resolution.py

原文件：`src/goods_kb/content/text_resolution.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`12c652ffdb04dde1cb7084094b32f01c62273bd5af011359e10f56812b346fa2`
摘录范围：12–71 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
12: TEXT_REQUIREMENT_NATIVE_BODY = "native_body"
13: TEXT_REQUIREMENT_TRANSCRIPT = "transcript"
14: TEXT_REQUIREMENTS = {TEXT_REQUIREMENT_NATIVE_BODY, TEXT_REQUIREMENT_TRANSCRIPT}
15:
16: RESOLUTION_READY = "ready"
17: RESOLUTION_PENDING = "pending"
18: RESOLUTION_TERMINAL_EXCLUDED = "terminal_excluded"
19: RESOLUTION_TERMINAL_FAILED = "terminal_failed"
20:
21:
22: def text_requirement_for_media(media: dict | None) -> str:
23:     """Return the producer-owned requirement; video descriptions are not text."""
24:     media = media if isinstance(media, dict) else {}
25:     if media.get("video_url") or media.get("asr_source_url"):
26:         return TEXT_REQUIREMENT_TRANSCRIPT
27:     return TEXT_REQUIREMENT_NATIVE_BODY
28:
29:
30: def validate_text_requirement(value: str) -> str:
31:     normalized = str(value or "").strip()
32:     if normalized not in TEXT_REQUIREMENTS:
33:         raise ValueError(f"unsupported content text requirement: {value}")
34:     return normalized
35:
36:
37: async def record_fact(
38:     pool,
39:     *,
40:     observation_id: str,
41:     content_key: str,
42:     text_requirement: str,
43:     supersedes_observation_id: str | None = None,
44: ) -> None:
45:     """Write the immutable text facts for one content-addressed detail.
46:
47:     Retry is idempotent but a conflicting fact is an invariant violation, never
48:     an update to historical raw data.
49:     """
50:     requirement = validate_text_requirement(text_requirement)
51:     normalized_content_key = str(content_key or "").strip()
52:     if not normalized_content_key:
53:         raise ValueError("content text fact requires a stable content_key")
54:     supersedes = str(supersedes_observation_id or "").strip() or None
55:     async with pool.acquire() as conn:
56:         row = await conn.fetchrow(
57:             """
58:             INSERT INTO raw.content_text_fact
59:               (observation_id, content_key, text_requirement, supersedes_observation_id)
60:             VALUES ($1,$2,$3,$4)
61:             ON CONFLICT (observation_id) DO NOTHING
62:             RETURNING observation_id
63:             """,
64:             observation_id,
65:             normalized_content_key,
66:             requirement,
67:             supersedes,
68:         )
69:         if row is not None:
70:             return
71:         existing = await conn.fetchrow(
```
