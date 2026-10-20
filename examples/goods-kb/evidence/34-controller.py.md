# 源码摘录：src/goods_kb/store_product_discovery/controller.py

原文件：`src/goods_kb/store_product_discovery/controller.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`88a65d203207fd9adae0bd6d472fcc60eb488e79b8d77678aa6306dc5dddf2ae`
摘录范围：144–203 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
144: async def enqueue_due(pool, *, plan: dict[str, Any]) -> list[dict[str, Any]]:
145:     queued = []
146:     for item in plan["due"]:
147:         run = await ops_repo.create_run(
148:             pool,
149:             actor_type="controller",
150:             command_name=COMMAND_NAME,
151:             goal={"complete": "authority store items have Product identities"},
152:             input_data={
153:                 "brand_id": item["brand_id"],
154:                 "category_id": item["category_id"],
155:                 "category_name": item.get("category_name"),
156:                 "authority_store_id": item["authority_store"]["id"],
157:                 "input_hash": item.get("input_hash") or input_hash(item),
158:             },
159:             status="running",
160:         )
161:         task = await task_repo.create_task(
162:             pool,
163:             kind=TASK_KIND,
164:             subject_key=item["subject_key"],
165:             idempotency_key=item["subject_key"],
166:             input=run["input"],
167:             run_id=run["run_id"],
168:             max_attempts=5,
169:             claim_timeout_s=1800,
170:             no_progress_timeout_s=600,
171:         )
172:         if task["run_id"] != run["run_id"]:
173:             await ops_repo.finish_run(pool, run_id=run["run_id"], status="unchanged")
174:         queued.append(task)
175:     return queued
176:
177:
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
```
