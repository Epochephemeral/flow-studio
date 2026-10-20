# 源码摘录：src/goods_kb/cli.py

原文件：`src/goods_kb/cli.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`9749b2f95b28481e016386e449885f1a1c431afd43039da0ec6be509b5f76531`
摘录范围：270–329 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
270:     lineage = sub.add_parser("lineage", help="血缘追踪")
271:     lineage_sub = lineage.add_subparsers(dest="action", required=True, parser_class=CliArgumentParser)
272:     trace = lineage_sub.add_parser("trace", help="追踪血缘")
273:     trace.add_argument("--job", dest="job_id", default=None)
274:     trace.add_argument("--artifact", dest="artifact_id", default=None)
275:     trace.add_argument("--subject", dest="subject_key", default=None)
276:     trace.add_argument("--depth", type=int, default=LINEAGE_DEFAULT_DEPTH)
277:     trace.add_argument("--json", action="store_true")
278:     trace.set_defaults(handler="trace_lineage", operation_name="lineage.trace")
279:
280:     queue = sub.add_parser("queue", help="队列")
281:     queue_sub = queue.add_subparsers(dest="action", required=True, parser_class=CliArgumentParser)
282:     queue_status = queue_sub.add_parser("status", help="查看队列状态")
283:     queue_status.add_argument("--json", action="store_true")
284:     queue_status.set_defaults(handler="queue_status", operation_name="queue.status")
285:
286:     queue_metrics = queue_sub.add_parser(
287:         "metrics",
288:         help="CACP 的 durable queue wait / execution 时序指标",
289:     )
290:     queue_metrics.add_argument(
291:         "--window-minutes",
292:         type=int,
293:         default=60,
294:         help="candidate 与前一等长 baseline window 的分钟数（1-1440）",
295:     )
296:     queue_metrics.add_argument(
297:         "--end-at",
298:         default=None,
299:         help="窗口结束时间（RFC3339）；省略时使用数据库时钟",
300:     )
301:     queue_metrics.add_argument(
302:         "--baseline-end-at",
303:         default=None,
304:         help="独立 baseline 窗口结束时间（RFC3339）；省略时使用 candidate 紧邻前窗",
305:     )
306:     queue_metrics.add_argument("--json", action="store_true")
307:     queue_metrics.set_defaults(handler="queue_metrics", operation_name="queue.metrics")
308:
309:     task = sub.add_parser("task", help="item 级任务单元")
310:     task_sub = task.add_subparsers(dest="action", required=True, parser_class=CliArgumentParser)
311:     task_list = task_sub.add_parser("list", help="列出 task")
312:     task_list.add_argument("--kind", default=None)
313:     task_list.add_argument("--status", default=None)
314:     task_list.add_argument("--limit", type=int, default=QUERY_DEFAULT_LIMIT)
315:     task_list.add_argument("--offset", type=int, default=QUERY_DEFAULT_OFFSET)
316:     task_list.add_argument("--where-json", default=None)
317:     task_list.add_argument("--json", action="store_true")
318:     task_list.set_defaults(handler="list_tasks", operation_name="task.list")
319:
320:     task_show = task_sub.add_parser("show", help="查看 task")
321:     task_show.add_argument("task_id")
322:     task_show.add_argument("--include", default="error,run")
323:     task_show.add_argument("--json", action="store_true")
324:     task_show.set_defaults(handler="show_task", operation_name="task.show")
325:
326:     dlq = sub.add_parser("dlq", help="dead letter (失败的 task)")
327:     dlq_sub = dlq.add_subparsers(dest="action", required=True, parser_class=CliArgumentParser)
328:     dlq_list = dlq_sub.add_parser("list", help="列出 dead task")
329:     dlq_list.add_argument("--kind", default=None)
```
