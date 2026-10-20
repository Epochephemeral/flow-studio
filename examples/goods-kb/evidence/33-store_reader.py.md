# 源码摘录：src/goods_kb/store_product_discovery/store_reader.py

原文件：`src/goods_kb/store_product_discovery/store_reader.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`a5492367d8f907641e6d005b273e939fc1346402536c7f1bd1947db502d4f22f`
摘录范围：155–214 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
155:     async def enrich_item(self, platform: str, item: dict[str, Any]) -> dict[str, Any]:
156:         """Read purchase facts for one plausible Product, using Pro only when needed."""
157:         normalized_platform = "taobao" if platform == "tmall" else platform
158:         if normalized_platform not in {"jd", "taobao"}:
159:             raise StoreProductReadError(
160:                 f"unsupported product-detail platform: {normalized_platform}"
161:             )
162:         item_id = _required(item.get("item_id"), "item_id")
163:         detail = await self._transport.call(
164:             provider="justoneapi",
165:             endpoint=f"{normalized_platform}.product_detail",
166:             params={"item_id": item_id},
167:             fallback_plan=["justoneapi", "onebound"],
168:         )
169:         enriched = _merge_detail(item, detail)
170:         if _needs_pro_detail(detail, enriched):
171:             pro = await self._transport.call(
172:                 provider="onebound",
173:                 endpoint=f"{normalized_platform}.product_detail_pro",
174:                 params={"item_id": item_id},
175:             )
176:             enriched = _merge_detail(enriched, pro)
177:         return enriched
178:
179:
180: def _result(
181:     authority_store_id: str,
182:     platform: str,
183:     shop_name: str,
184:     items: dict[str, dict[str, Any]],
185:     pages_read: int,
186:     reported_total: int | None,
187:     shop_id: str,
188:     seller_id: str | None,
189: ) -> StoreProductRead:
190:     return StoreProductRead(
191:         authority_store_id=authority_store_id,
192:         platform=platform,
193:         shop_name=shop_name,
194:         items=tuple(items.values()),
195:         pages_read=pages_read,
196:         reported_total=reported_total,
197:         shop_id=shop_id,
198:         seller_id=seller_id,
199:     )
200:
201:
202: def resolve_shop_id(platform: str, url: Any) -> str:
203:     value = str(url or "").strip()
204:     patterns = {
205:         "jd": (
206:             r"index-(\d+)\.html",
207:             r"shopLevel-(\d+)\.html",
208:             r"view_search-(\d+)-",
209:         ),
210:         "taobao": (r"https?://shop(\d+)\.taobao\.com",),
211:     }
212:     normalized = (
213:         "taobao" if platform.strip().lower() == "tmall" else platform.strip().lower()
214:     )
```
