# 源码摘录：src/goods_kb/store_product_discovery/classification.py

原文件：`src/goods_kb/store_product_discovery/classification.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`f4bad50a4f09b34367adc2257e5b2a84637475b2a6295c1e60030d3b162bb524`
摘录范围：1–51 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
1: """Program-owned reuse of prior platform-item assignments."""
2:
3: from __future__ import annotations
4:
5: from collections.abc import Iterable
6: from typing import Any
7:
8: from goods_kb.store_product_discovery.store_reader import StoreProductRead
9:
10:
11: def split_known_items(
12:     scope: dict[str, Any],
13:     reads: Iterable[StoreProductRead],
14: ) -> dict[str, list[dict[str, Any]]]:
15:     owners: dict[tuple[str, str], tuple[str, dict[str, Any]]] = {}
16:     for product in scope["products"]:
17:         for link in product.get("purchase_links") or []:
18:             key = _key(link.get("platform"), link.get("item_id"))
19:             if key is not None:
20:                 owners[key] = (product["id"], link)
21:
22:     known: list[dict[str, Any]] = []
23:     unresolved: list[dict[str, Any]] = []
24:     observed_keys: set[tuple[str, str]] = set()
25:     for read in reads:
26:         for item in read.items:
27:             item_key = (read.platform, item["item_id"])
28:             if item_key in observed_keys:
29:                 continue
30:             observed_keys.add(item_key)
31:             observed = {
32:                 "authority_store_id": read.authority_store_id,
33:                 "platform": read.platform,
34:                 "item": item,
35:             }
36:             owner = owners.get(item_key)
37:             if owner is None:
38:                 unresolved.append(observed)
39:             else:
40:                 known.append({
41:                     **observed,
42:                     "product_id": owner[0],
43:                     "existing_link": owner[1],
44:                 })
45:     return {"known": known, "unresolved": unresolved}
46:
47:
48: def _key(platform: Any, item_id: Any) -> tuple[str, str] | None:
49:     platform_text = str(platform or "").strip().lower()
50:     item_text = str(item_id or "").strip()
51:     return (platform_text, item_text) if platform_text and item_text else None
```
