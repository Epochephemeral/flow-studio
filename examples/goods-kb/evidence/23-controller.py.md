# 源码摘录：src/goods_kb/store_product_discovery/controller.py

原文件：`src/goods_kb/store_product_discovery/controller.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`88a65d203207fd9adae0bd6d472fcc60eb488e79b8d77678aa6306dc5dddf2ae`
摘录范围：178–237 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
178: async def execute_task(
179:     pool,
180:     *,
181:     task: dict[str, Any],
182:     catalog: CatalogDiscoveryClient,
183:     reader: StoreProductReader,
184:     interpreter: ItemIdentityInterpreter,
185:     apply: bool,
186:     consumer: str = "store-product-discovery-inline",
187: ) -> dict[str, Any]:
188:     claimed = await task_repo.claim(
189:         pool,
190:         task_id=task["task_id"],
191:         expected_attempt=int(task["attempts"]),
192:         consumer=consumer,
193:     )
194:     if claimed is None:
195:         return {"task_id": task["task_id"], "status": task["status"], "result": None}
196:     attempt = int(claimed["attempts"])
197:     run_id = claimed.get("run_id")
198:     input_data = claimed["input"]
199:     try:
200:         result = await run_scope(
201:             catalog=catalog,
202:             reader=reader,
203:             interpreter=interpreter,
204:             brand_id=input_data["brand_id"],
205:             category_id=input_data["category_id"],
206:             category_name=input_data.get("category_name"),
207:             authority_store_ids={input_data["authority_store_id"]},
208:             apply=apply,
209:         )
210:         await state_repo.record_result(pool, task=claimed, result=result)
211:         if not result["complete"]:
212:             error = {
213:                 "kind": "incomplete",
214:                 "code": "identity_needs_evidence",
215:                 "message": f"{result['unresolved_count']} items need evidence",
216:             }
217:             transitioned = await task_repo.mark_dead(
218:                 pool,
219:                 task_id=claimed["task_id"],
220:                 consumer=consumer,
221:                 expected_attempt=attempt,
222:                 error=error,
223:             )
224:             if run_id:
225:                 await ops_repo.finish_run(pool, run_id=run_id, status="failed")
226:             return {"task_id": claimed["task_id"], "status": "dead", "result": result}
227:         transitioned = await task_repo.mark_succeeded(
228:             pool,
229:             task_id=claimed["task_id"],
230:             consumer=consumer,
231:             expected_attempt=attempt,
232:         )
233:         if run_id:
234:             await ops_repo.finish_run(pool, run_id=run_id, status="succeeded")
235:         return {"task_id": claimed["task_id"], "status": transitioned["status"], "result": result}
236:     except Exception as error:  # noqa: BLE001 - task boundary classifies every failure
237:         plan = retry_policy.classify_and_plan(error, claimed)
```
