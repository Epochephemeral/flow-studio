# 源码摘录：migrations/0161_dimension_claim_semantic_field_separation.sql

原文件：`migrations/0161_dimension_claim_semantic_field_separation.sql`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`f823c031d534a1d59d6d9a070e378c61a2795fc7011e9b927f2ecbca47ce40a9`
摘录范围：174–233 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
174:     prompt_text := prompt_text || E'\n\n' || $prompt$
175: model_dim 语义硬约束：
176: - aliases 只能是与 dimension_name 相同指代、可替换规范名的名称字符串。
177: - rich_context 只能是不能替换规范名、但有助于理解或消歧的上下文字符串。
178: - 型号、规格、数值、场景、结论、解释、例子和 query 禁止进入 aliases。
179: - 两个字段都必须输出数组；同一个值不得同时出现。
180: $prompt$;
181:     prompt_body := jsonb_set(
182:       prompt_body,
183:       '{text}',
184:       to_jsonb(prompt_text)
185:     );
186:
187:     INSERT INTO registry.artifact
188:       (artifact_id, artifact_type, artifact_key, version, status, body,
189:        body_hash)
190:     VALUES (
191:       'registry:artifact:claim_extraction_prompt:dimension_claim_metadata:7',
192:       'claim_extraction_prompt',
193:       'dimension_claim_metadata',
194:       7,
195:       'active',
196:       prompt_body,
197:       'seed:' || md5(prompt_body::text)
198:     )
199:     ON CONFLICT (artifact_type, artifact_key, version) DO UPDATE SET
200:       artifact_id=EXCLUDED.artifact_id,
201:       status=EXCLUDED.status,
202:       body=EXCLUDED.body,
203:       body_hash=EXCLUDED.body_hash;
204: END
205: $migration$;
206:
207: DO $migration$
208: DECLARE
209:     policy_body jsonb;
210: BEGIN
211:     SELECT body INTO policy_body
212:     FROM registry.artifact
213:     WHERE artifact_id='registry:artifact:task_policy:dimension_claim_extract:4';
214:     IF policy_body IS NULL THEN
215:         RAISE EXCEPTION 'missing task_policy:dimension_claim_extract:4';
216:     END IF;
217:     policy_body := jsonb_set(
218:       policy_body,
219:       '{prompt_refs}',
220:       jsonb_build_object(
221:         'pgc',
222:         'registry:artifact:claim_extraction_prompt:dimension_claim_metadata:7',
223:         'ugc',
224:         'registry:artifact:claim_extraction_prompt:dimension_claim_metadata:7'
225:       )
226:     );
227:     policy_body := jsonb_set(
228:       policy_body,
229:       '{dimension_prompt_ref}',
230:       to_jsonb(
231:         'registry:artifact:dimension_phrasing_prompt:claim_dimension:4'::text
232:       )
233:     );
```
