# 源码摘录：src/goods_kb/store_product_discovery/identity.py

原文件：`src/goods_kb/store_product_discovery/identity.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`4160396a20dd05bc88e484a18d1d8ed67e8b019a717c682755883f40ddca8725`
摘录范围：59–118 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
59: INTERPRET_SYSTEM = """你判断一个权威店铺商品行表达的消费者比较对象。
60: 只使用输入事实。输出 JSON，不补查、不猜证据。
61: Product 是消费者会独立比较的商品身份：明显不同的型号、机身、形态、容量或核心能力应分开；颜色、赠品、存储卡、安装包和纯套餐通常只是购买配置。
62: 名称直观表明独立商品时直接判断，不要仅因缺少逐项参数对比而标记待证。只有输入同时指向多个身份且确实无法决定时才 needs_evidence。
63: 非目标品类整机、配件、二手、官翻或服务项为 exclude。
64: 返回 disposition、product_name、model、consumer_differences、purchase_configuration、reason。"""
65:
66:
67: COMPARE_SYSTEM = """你只比较当前店铺 item 与给出的少量 Product 候选。
68: Product 是消费者会独立比较的商品身份。型号、机身、形态、容量或核心能力的明显差异可形成新 Product；颜色、赠品、存储卡、安装包和纯套餐通常仍归入同一 Product，并记录为购买配置。
69: 名称直观表明新 Product 时可直接选择 new，不要求额外证明。只有当前材料确实无法区分时才 needs_evidence。
70: existing 只能返回输入候选中的 product_id。返回 action、product_id、product_name、model、reason。"""
71:
72:
73: class ItemIdentityInterpreter:
74:     def __init__(self, llm: LLMClient, *, model: str) -> None:
75:         self._llm = llm
76:         self._model = model
77:
78:     async def interpret(
79:         self,
80:         *,
81:         category: dict[str, Any],
82:         brand: dict[str, Any],
83:         item: dict[str, Any],
84:     ) -> ItemInterpretation:
85:         payload = {
86:             "category": {"id": category.get("id"), "name": category.get("name")},
87:             "brand": {
88:                 "id": brand.get("id"),
89:                 "name": brand.get("name"),
90:                 "aliases": brand.get("aliases") or [],
91:             },
92:             "item": compact_item_context(item),
93:         }
94:         raw = await self._llm.complete(
95:             model=self._model,
96:             system=INTERPRET_SYSTEM,
97:             user=json.dumps(payload, ensure_ascii=False),
98:             response_format={"type": "json_object"},
99:             temperature=0,
100:         )
101:         try:
102:             return ItemInterpretation.model_validate(parse_model_json(raw))
103:         except (ValueError, TypeError) as error:
104:             raise IdentityDecisionError(
105:                 f"invalid item identity interpretation: {error}"
106:             ) from error
107:
108:     async def compare(
109:         self,
110:         *,
111:         item: dict[str, Any],
112:         interpretation: ItemInterpretation,
113:         candidates: list[dict[str, Any]],
114:     ) -> ComparisonDecision:
115:         if not 1 <= len(candidates) <= 3:
116:             raise IdentityDecisionError(
117:                 "comparison requires one to three Product candidates"
118:             )
```
