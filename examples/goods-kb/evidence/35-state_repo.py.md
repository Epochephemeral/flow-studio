# 源码摘录：src/goods_kb/store_product_discovery/state_repo.py

原文件：`src/goods_kb/store_product_discovery/state_repo.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`dc960acc6d5efafaf2f086336a71f462d45736268ef0cc5ea5fb63bd111a9763`
摘录范围：23–79 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
23:
24: _RECORD_RESULT = QuerySpec(
25:     query_id="store_product_discovery.record_result_event.v1",
26:     workload=QueryWorkload.MUTATION,
27:     sql="""
28:         INSERT INTO ops.event_log(
29:             event_id,run_id,event_type,subject_key,input_refs,output_refs,
30:             policy_refs,payload,payload_schema_key,payload_schema_version
31:         ) VALUES ($1,$2,'catalog.store_product_discovery.completed',$3,$4,$5,'[]'::jsonb,$6,
32:                   'catalog.store_product_discovery.result',1)
33:         ON CONFLICT (event_id) DO NOTHING
34:     """,
35: )
36:
37:
38: async def latest_tasks(pool, *, subject_keys: list[str]) -> dict[str, dict[str, Any]]:
39:     keys = sorted({str(value).strip() for value in subject_keys if str(value).strip()})
40:     if not keys:
41:         return {}
42:     async with pool.acquire() as conn:
43:         rows = await fetch(conn, _LATEST_TASKS, keys, max_rows=len(keys))
44:     result = {}
45:     for row in rows:
46:         item = dict(row)
47:         if isinstance(item.get("input"), str):
48:             item["input"] = json.loads(item["input"])
49:         if isinstance(item.get("last_error"), str):
50:             item["last_error"] = json.loads(item["last_error"])
51:         result[str(item["subject_key"])] = item
52:     return result
53:
54:
55: async def record_result(
56:     pool,
57:     *,
58:     task: dict[str, Any],
59:     result: dict[str, Any],
60: ) -> None:
61:     attempt = int(task["attempts"])
62:     event_id = f"event:store-product-discovery:{task['task_id']}:{attempt}"
63:     assignments = result["apply_payload"]["assignments"]
64:     async with pool.acquire() as conn:
65:         await execute(
66:             conn,
67:             _RECORD_RESULT,
68:             event_id,
69:             task.get("run_id"),
70:             task["subject_key"],
71:             json.dumps([
72:                 f"catalog:brand:{result['brand_id']}",
73:                 f"catalog:category:{result['category_id']}",
74:             ], ensure_ascii=False),
75:             json.dumps(sorted({
76:                 f"catalog:product:{item['product_id']}" for item in assignments
77:             }), ensure_ascii=False),
78:             json.dumps(result, ensure_ascii=False),
79:         )
```
