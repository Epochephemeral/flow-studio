# 源码摘录：src/goods_kb/store_product_discovery/identity.py

原文件：`src/goods_kb/store_product_discovery/identity.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`4160396a20dd05bc88e484a18d1d8ed67e8b019a717c682755883f40ddca8725`
摘录范围：78–137 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
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
119:         candidate_payload = [compact_product_context(product) for product in candidates]
120:         raw = await self._llm.complete(
121:             model=self._model,
122:             system=COMPARE_SYSTEM,
123:             user=json.dumps(
124:                 {
125:                     "item": compact_item_context(item),
126:                     "interpretation": interpretation.model_dump(),
127:                     "candidates": candidate_payload,
128:                 },
129:                 ensure_ascii=False,
130:             ),
131:             response_format={"type": "json_object"},
132:             temperature=0,
133:         )
134:         try:
135:             decision = ComparisonDecision.model_validate(parse_model_json(raw))
136:         except (ValueError, TypeError) as error:
137:             raise IdentityDecisionError(
```
