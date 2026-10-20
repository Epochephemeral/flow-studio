# 源码摘录：src/goods_kb/store_product_discovery/service.py

原文件：`src/goods_kb/store_product_discovery/service.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`f7255e7478a47be717ec8e57abfe16cc2bc16885823614441c2d8cf830a405d5`
摘录范围：204–263 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
204: async def _resolve_item(
205:     *,
206:     interpreter: ItemIdentityInterpreter,
207:     observed: dict[str, Any],
208:     interpretation: ItemInterpretation,
209:     products: list[dict[str, Any]],
210:     brand_id: str,
211:     category_id: str,
212: ) -> dict[str, Any]:
213:     base = {
214:         "authority_store_id": observed["authority_store_id"],
215:         "platform": observed["platform"],
216:         "item": observed["item"],
217:         "interpretation": interpretation.model_dump(),
218:         "reason": interpretation.reason,
219:     }
220:     if interpretation.disposition != "target_product":
221:         return {**base, "action": interpretation.disposition}
222:     selected = select_product_candidates(interpretation, products)
223:     if selected["exact_product_id"]:
224:         return {
225:             **base,
226:             "action": "existing",
227:             "product_id": selected["exact_product_id"],
228:             "purchase_configuration": interpretation.purchase_configuration,
229:         }
230:     candidates = selected["candidates"]
231:     if candidates:
232:         compared = await interpreter.compare(
233:             item=observed["item"],
234:             interpretation=interpretation,
235:             candidates=candidates,
236:         )
237:         return _comparison_result(
238:             base,
239:             compared,
240:             interpretation=interpretation,
241:             brand_id=brand_id,
242:             category_id=category_id,
243:         )
244:     if selected["reason"] in {"unbounded_exact_model", "neighbors_not_bounded", "no_identity_key"}:
245:         return {
246:             **base,
247:             "action": "needs_evidence",
248:             "reason": selected["reason"],
249:         }
250:     return _new_product_result(
251:         base,
252:         name=str(interpretation.product_name),
253:         model=interpretation.model,
254:         interpretation=interpretation,
255:         brand_id=brand_id,
256:         category_id=category_id,
257:     )
258:
259:
260: def _comparison_result(
261:     base: dict[str, Any],
262:     decision: ComparisonDecision,
263:     *,
```
