# 源码摘录：migrations/0110_content_insight_extraction.sql

原文件：`migrations/0110_content_insight_extraction.sql`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`d95052b9713834fc14e57c635bee3ba3b28fb0e8745ad75b0b58e06f5d050c3d`
摘录范围：57–116 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
57:         jsonb_build_object('text', $prompt$
58: 你是一名消费决策分析师。
59:
60: 请用第一性原理思考：这篇文章提供了哪些对该品类消费决策真正有帮助的 Insight？
61:
62: 要求：
63: 1. Insight 应帮助消费者选择、比较、判断或避坑，不要只做文章摘要或事实罗列。
64: 2. 只依据这篇文章，不引入外部信息。
65: 3. 每个 Insight 用一到两句话表达，直接、清晰、完整。
66: 4. 合并重复内容，不强求数量。
67: 5. 没有有用的 Insight 时，返回空 insights 数组。
68: 6. category_name 输出文章所讨论的通用品类名称，不要输出内部 ID；无法判断时输出 null。
69: 7. 不要输出 quote、原文摘录、证据位置或推理过程。
70: 8. 只输出 JSON，不要输出任何额外文字。
71:
72: 输出格式：
73: {"category_name":"品类名称或 null","insights":[{"insight":"一到两句话的 Insight"}]}
74: $prompt$::text)
75:     )
76: )
77: INSERT INTO registry.artifact
78:   (artifact_id, artifact_type, artifact_key, version, status, body, body_hash)
79: SELECT
80:   'registry:artifact:insight_extraction_prompt:purchase_decision:1',
81:   'insight_extraction_prompt', 'purchase_decision', 1, 'active',
82:   body, 'seed:' || md5(body::text)
83: FROM prompt_body
84: ON CONFLICT (artifact_type, artifact_key, version) DO UPDATE SET
85:   artifact_id=EXCLUDED.artifact_id,
86:   status=EXCLUDED.status,
87:   body=EXCLUDED.body,
88:   body_hash=EXCLUDED.body_hash;
89:
90: WITH policy_body(body) AS (
91:     VALUES (
92:         $json$
93:         {
94:           "prompt_ref": "registry:artifact:insight_extraction_prompt:purchase_decision:1",
95:           "response_schema_ref": "registry:artifact:schema_contract:content_insight_extraction_result:1",
96:           "model": "deepseek-v4-pro",
97:           "max_tokens": 8192,
98:           "concurrency": 8,
99:           "model_timeout_s": 300,
100:           "llm_extra_body": {"enable_thinking": false},
101:           "output_schema": {
102:             "schema_key": "content_insight_set:1",
103:             "schema_version": 1
104:           }
105:         }
106:         $json$::jsonb
107:     )
108: )
109: INSERT INTO registry.artifact
110:   (artifact_id, artifact_type, artifact_key, version, status, body, body_hash)
111: SELECT
112:   'registry:artifact:task_policy:content_insight_extract:1',
113:   'task_policy', 'content_insight_extract', 1, 'active',
114:   body, 'seed:' || md5(body::text)
115: FROM policy_body
116: ON CONFLICT (artifact_type, artifact_key, version) DO UPDATE SET
```
