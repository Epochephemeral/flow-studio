# 源码摘录：migrations/0161_dimension_claim_semantic_field_separation.sql

原文件：`migrations/0161_dimension_claim_semantic_field_separation.sql`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`f823c031d534a1d59d6d9a070e378c61a2795fc7011e9b927f2ecbca47ce40a9`
摘录范围：123–182 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
123:     jsonb_build_object('text', $prompt$
124: 把每条 claim 归入一个购买决策维度，输出维度表达 model_dim。
125:
126: model_dim 必须包含：
127: - perspective：consumer_side 或 production_side，与 claim 顶层一致。
128: - dimension_name：维度规范名，贴近消费者决策语言。
129: - dimension_definition：一句话说明该维度调查什么购买问题。
130: - aliases：仅限与 dimension_name 指代同一问题、在相同语境中可替换规范名的产品无关名称。型号、规格、数值、场景、结论、解释、例子、query 和消歧说明都不是 alias。无则 []。
131: - rich_context：不能替换 dimension_name、但有助于理解边界或消歧的上下文短语。它与 aliases 语义互斥，无则 []。
132:
133: claim 的产品事实、型号、数值、比较结果和使用场景不得进入 aliases。若无法确定一个值是否可替换规范名，放 rich_context，不要猜成 alias。
134: $prompt$::text)
135:   )
136: )
137: INSERT INTO registry.artifact
138:   (artifact_id, artifact_type, artifact_key, version, status, body,
139:    body_hash)
140: SELECT
141:   'registry:artifact:dimension_phrasing_prompt:claim_dimension:4',
142:   'dimension_phrasing_prompt',
143:   'claim_dimension',
144:   4,
145:   'active',
146:   body,
147:   'seed:' || md5(body::text)
148: FROM prompt_body
149: ON CONFLICT (artifact_type, artifact_key, version) DO UPDATE SET
150:   artifact_id=EXCLUDED.artifact_id,
151:   status=EXCLUDED.status,
152:   body=EXCLUDED.body,
153:   body_hash=EXCLUDED.body_hash;
154:
155: DO $migration$
156: DECLARE
157:     prompt_body jsonb;
158:     prompt_text text;
159: BEGIN
160:     SELECT body INTO prompt_body
161:     FROM registry.artifact
162:     WHERE artifact_id=(
163:       'registry:artifact:claim_extraction_prompt:'
164:       'dimension_claim_metadata:6'
165:     );
166:     IF prompt_body IS NULL THEN
167:         RAISE EXCEPTION 'missing dimension_claim_metadata:6 prompt';
168:     END IF;
169:     prompt_text := replace(
170:       prompt_body->>'text',
171:       'model_dim（含 perspective、dimension_name、dimension_definition、aliases_and_rich_context）',
172:       'model_dim（含 perspective、dimension_name、dimension_definition、aliases、rich_context）'
173:     );
174:     prompt_text := prompt_text || E'\n\n' || $prompt$
175: model_dim 语义硬约束：
176: - aliases 只能是与 dimension_name 相同指代、可替换规范名的名称字符串。
177: - rich_context 只能是不能替换规范名、但有助于理解或消歧的上下文字符串。
178: - 型号、规格、数值、场景、结论、解释、例子和 query 禁止进入 aliases。
179: - 两个字段都必须输出数组；同一个值不得同时出现。
180: $prompt$;
181:     prompt_body := jsonb_set(
182:       prompt_body,
```
