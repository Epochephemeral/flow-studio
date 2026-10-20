# 源码摘录：src/goods_kb/store_product_discovery/store_reader.py

原文件：`src/goods_kb/store_product_discovery/store_reader.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`a5492367d8f907641e6d005b273e939fc1346402536c7f1bd1947db502d4f22f`
摘录范围：36–95 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
36:     async def read(self, store: dict[str, Any]) -> StoreProductRead:
37:         authority_store_id = _required(store.get("id"), "authority store id")
38:         source_platform = _required(store.get("platform"), "platform").lower()
39:         platform = "taobao" if source_platform == "tmall" else source_platform
40:         shop_id = str(store.get("shop_id") or "").strip() or resolve_shop_id(
41:             source_platform, store.get("url")
42:         )
43:         shop_id = _required(shop_id, f"{authority_store_id}.shop_id")
44:         if platform not in {"jd", "taobao"}:
45:             raise StoreProductReadError(
46:                 f"unsupported authority-store platform: {platform}"
47:             )
48:         seller_id = str(store.get("seller_id") or "").strip()
49:         if platform == "taobao" and not seller_id:
50:             raise StoreProductReadError(
51:                 f"{authority_store_id}.seller_id is required for Taobao"
52:             )
53:
54:         seen: dict[str, dict[str, Any]] = {}
55:         reported_total: int | None = None
56:         total_pages: int | None = None
57:         shop_name = str(store.get("name") or "").strip()
58:         first_page_size: int | None = None
59:         for page in range(1, self._max_pages + 1):
60:             data = await self._read_page(
61:                 platform=platform,
62:                 shop_id=shop_id,
63:                 seller_id=seller_id or None,
64:                 page=page,
65:             )
66:             raw_items = data.get("items")
67:             if not isinstance(raw_items, list):
68:                 raise StoreProductReadError(
69:                     f"{platform}.shop_products page {page} has no items array"
70:                 )
71:             page_items = [_normalize_item(platform, item) for item in raw_items]
72:             if page == 1:
73:                 first_page_size = len(page_items)
74:                 reported_total = _optional_int(data.get("total"), "total")
75:                 if platform == "jd":
76:                     total_pages = _optional_int(data.get("total_pages"), "total_pages")
77:                 elif reported_total is not None and first_page_size:
78:                     total_pages = math.ceil(reported_total / first_page_size)
79:             page_new = 0
80:             for item in page_items:
81:                 if item["item_id"] not in seen:
82:                     seen[item["item_id"]] = item
83:                     page_new += 1
84:             shop_name = str(
85:                 data.get("shop_name") or data.get("shop_title") or shop_name
86:             ).strip()
87:
88:             if not page_items:
89:                 return _result(
90:                     authority_store_id,
91:                     platform,
92:                     shop_name,
93:                     seen,
94:                     page,
95:                     reported_total,
```
