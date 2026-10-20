# 源码摘录：src/goods_kb/store_product_discovery/store_reader.py

原文件：`src/goods_kb/store_product_discovery/store_reader.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`a5492367d8f907641e6d005b273e939fc1346402536c7f1bd1947db502d4f22f`
摘录范围：88–147 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
88:             if not page_items:
89:                 return _result(
90:                     authority_store_id,
91:                     platform,
92:                     shop_name,
93:                     seen,
94:                     page,
95:                     reported_total,
96:                     shop_id,
97:                     seller_id or None,
98:                 )
99:             if reported_total is not None and len(seen) >= reported_total:
100:                 return _result(
101:                     authority_store_id,
102:                     platform,
103:                     shop_name,
104:                     seen,
105:                     page,
106:                     reported_total,
107:                     shop_id,
108:                     seller_id or None,
109:                 )
110:             if total_pages is not None and page >= total_pages:
111:                 return _result(
112:                     authority_store_id,
113:                     platform,
114:                     shop_name,
115:                     seen,
116:                     page,
117:                     reported_total,
118:                     shop_id,
119:                     seller_id or None,
120:                 )
121:             if page_new == 0:
122:                 raise StoreProductReadError(
123:                     f"{platform}.shop_products repeated page {page} before the reported list ended"
124:                 )
125:         raise StoreProductReadError(
126:             f"{platform}.shop_products exceeded {self._max_pages} pages without reaching the end"
127:         )
128:
129:     async def _read_page(
130:         self,
131:         *,
132:         platform: str,
133:         shop_id: str,
134:         seller_id: str | None,
135:         page: int,
136:     ) -> dict[str, Any]:
137:         if platform == "jd":
138:             return await self._transport.call(
139:                 provider="justoneapi",
140:                 endpoint="jd.shop_products",
141:                 params={"shop_id": shop_id, "page": page},
142:             )
143:         return await self._transport.call(
144:             provider="justoneapi",
145:             endpoint="taobao.shop_products",
146:             params={
147:                 "shop_id": shop_id,
```
