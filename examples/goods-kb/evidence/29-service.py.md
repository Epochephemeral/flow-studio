# 源码摘录：src/goods_kb/store_product_discovery/service.py

原文件：`src/goods_kb/store_product_discovery/service.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`f7255e7478a47be717ec8e57abfe16cc2bc16885823614441c2d8cf830a405d5`
摘录范围：24–83 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
24: async def run_scope(
25:     *,
26:     catalog,
27:     reader: StoreProductReader,
28:     interpreter: ItemIdentityInterpreter,
29:     brand_id: str,
30:     category_id: str,
31:     category_name: str | None = None,
32:     authority_store_ids: set[str] | None = None,
33:     apply: bool = False,
34:     model_concurrency: int = 8,
35: ) -> dict[str, Any]:
36:     """Read one complete authority-store scope and produce/apply one bounded change."""
37:     if model_concurrency < 1:
38:         raise ValueError("model_concurrency must be positive")
39:     scope = await catalog.read_scope(brand_id=brand_id, category_id=category_id)
40:     category = scope.get("category")
41:     if category is None:
42:         if not str(category_name or "").strip():
43:             raise ValueError("category_name is required while the Catalog category is missing")
44:         category = {"id": category_id, "name": str(category_name).strip()}
45:
46:     selected_stores = [
47:         store
48:         for store in scope["brand"]["authority_stores"]
49:         if authority_store_ids is None or store["id"] in authority_store_ids
50:     ]
51:     if not selected_stores:
52:         raise ValueError("requested authority store is outside the Catalog scope")
53:     reads = await asyncio.gather(*(reader.read(store) for store in selected_stores))
54:     split = split_known_items(scope, reads)
55:     semaphore = asyncio.Semaphore(model_concurrency)
56:
57:     async def decide(observed: dict[str, Any]) -> dict[str, Any]:
58:         async with semaphore:
59:             initial = await interpreter.interpret(
60:                 category=category,
61:                 brand=scope["brand"],
62:                 item=observed["item"],
63:             )
64:             if initial.disposition == "exclude":
65:                 return await _resolve_item(
66:                     interpreter=interpreter,
67:                     observed=observed,
68:                     interpretation=initial,
69:                     products=scope["products"],
70:                     brand_id=brand_id,
71:                     category_id=category_id,
72:                 )
73:             enriched_item = await reader.enrich_item(
74:                 observed["platform"], observed["item"]
75:             )
76:             enriched = {**observed, "item": enriched_item}
77:             interpretation = initial
78:             if enriched_item != observed["item"]:
79:                 interpretation = await interpreter.interpret(
80:                     category=category,
81:                     brand=scope["brand"],
82:                     item=enriched_item,
83:                 )
```
