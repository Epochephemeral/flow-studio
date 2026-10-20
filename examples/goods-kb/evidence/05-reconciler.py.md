# 源码摘录：src/goods_kb/ops/reconciler.py

原文件：`src/goods_kb/ops/reconciler.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`353be2c8cbbf949803164b042e0d53f9754b170fc7b5df2a1b163c1a08614624`
摘录范围：123–182 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
123: async def dispatch_critical_once(
124:     pool,
125:     redis,
126:     *,
127:     limit: int = RECONCILER_DISPATCH_LIMIT,
128: ) -> int:
129:     """Dispatch CACP work without querying any background-task partition."""
130:
131:     media_platforms = list(platform_registry.media_platforms())
132:     # An absent platform is an existing durable text-fetch representation; it
133:     # remains dispatchable on the non-media lane until its producer contract is
134:     # tightened. Registered platform values are an equality partition, so the
135:     # dispatcher never scans the media backlog to find text work.
136:     non_media_fetch_platforms = ["", *platform_registry.non_media_platforms()]
137:     media_pressure = await task_repo.count_media_pipeline_pressure(
138:         pool,
139:         media_platforms=media_platforms,
140:         maximum=ASR_ACTIVE_TASK_LIMIT,
141:     )
142:     media_capacity = max(0, ASR_ACTIVE_TASK_LIMIT - media_pressure)
143:     media_slots = min(limit, media_capacity, ASR_FETCH_DISPATCH_RESERVE)
144:     media_due = []
145:     if media_slots:
146:         media_due = await task_repo.list_pending_due(
147:             pool,
148:             limit=media_slots,
149:             kinds=("fetch",),
150:             media_platforms=media_platforms,
151:             include_media_fetch=True,
152:         )
153:     remaining = limit - len(media_due)
154:     non_media_due = []
155:     if remaining:
156:         non_media_due = await task_repo.list_pending_due(
157:             pool,
158:             limit=remaining,
159:             kinds=CRITICAL_KINDS,
160:             media_platforms=media_platforms,
161:             non_media_fetch_platforms=non_media_fetch_platforms,
162:             include_media_fetch=False,
163:         )
164:     due = media_due + non_media_due
165:     return await _reserve_and_publish(
166:         pool,
167:         redis,
168:         due=due,
169:         media_platforms=media_platforms,
170:         lane="critical",
171:         media_pressure=media_pressure,
172:         media_slots=len(media_due),
173:         media_reservation=media_slots,
174:     )
175:
176:
177: async def dispatch_general_once(
178:     pool,
179:     redis,
180:     *,
181:     limit: int = RECONCILER_DISPATCH_LIMIT,
182: ) -> int:
```
