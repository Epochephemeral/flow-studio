# 源码摘录：src/goods_kb/insight/automatic_service.py

原文件：`src/goods_kb/insight/automatic_service.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`db5b82e46fe8d187f891665c76f8f77b2086e31f6a8ccefe30b974882fc724bd`
摘录范围：167–226 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
167: async def sweep_once(
168:     pool,
169:     *,
170:     redis=None,
171:     policy_ref: str | None = None,
172:     dry_run: bool = False,
173:     force: bool = False,
174: ) -> dict:
175:     if dry_run:
176:         return await _sweep_impl(
177:             pool,
178:             policy=await load_policy(pool, policy_ref=policy_ref),
179:             sweep_run_id=None,
180:             dry_run=True,
181:         )
182:     async with automatic_repo.sweep_lock(pool, lock_name=SWEEP_LOCK_NAME) as locked_pool:
183:         if locked_pool is None:
184:             return _idle_result(policy_ref=policy_ref, reason="sweep_already_running")
185:         policy = await load_policy(locked_pool, policy_ref=policy_ref)
186:         if not policy["body"]["enabled"]:
187:             return _idle_result(policy_ref=str(policy["artifact_id"]), reason="disabled", enabled=False)
188:         interval_key = None
189:         if redis is not None and not force:
190:             interval_key = f"gkb:automatic-insight:sweep:{policy['artifact_id']}"
191:             if not await redis.set(
192:                 interval_key,
193:                 "1",
194:                 nx=True,
195:                 ex=int(policy["body"]["sweep_interval_s"]),
196:             ):
197:                 return _idle_result(policy_ref=str(policy["artifact_id"]), reason="interval_gate")
198:         try:
199:             run = await ops_repo.create_run(
200:                 locked_pool,
201:                 actor_type="worker",
202:                 command_name="insight.automatic-extract.sweep",
203:                 goal={"policy_ref": policy_ref or "active"},
204:                 input_data={"policy_ref": policy_ref, "force": bool(force)},
205:                 status="running",
206:             )
207:         except Exception:
208:             if interval_key and redis is not None and hasattr(redis, "delete"):
209:                 await redis.delete(interval_key)
210:             raise
211:         run_id = str(run["run_id"])
212:         try:
213:             result = await _sweep_impl(
214:                 locked_pool,
215:                 policy=policy,
216:                 sweep_run_id=run_id,
217:                 dry_run=False,
218:             )
219:             await ops_repo.append_event(
220:                 locked_pool,
221:                 run_id=run_id,
222:                 event_type="automatic_insight.sweep.completed",
223:                 subject_key=str(policy["artifact_id"]),
224:                 input_refs=[],
225:                 output_refs=[
226:                     value for value in [
```
