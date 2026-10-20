# 源码摘录：src/goods_kb/dimension/automatic_claim_service.py

原文件：`src/goods_kb/dimension/automatic_claim_service.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`057c58c5b56fa694379bc327058861ca7652a991f74e6add643f5fc125951e98`
摘录范围：82–141 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
82:     claim_task_policy_ref: str,
83:     canonical_content_key: str,
84:     execution_revision: str = "v1",
85: ) -> str:
86:     digest = hashlib.md5(canonical_content_key.encode("utf-8")).hexdigest()
87:     if execution_revision != "v1":
88:         return f"claim_extract:{claim_task_policy_ref}:{execution_revision}:{digest}"
89:     return f"claim_extract:{claim_task_policy_ref}:{digest}"
90:
91:
92: def claim_extraction_receipt_id(
93:     *,
94:     claim_task_policy_ref: str,
95:     canonical_content_key: str,
96:     execution_revision: str = "v1",
97: ) -> str:
98:     material = f"{claim_task_policy_ref}\n{canonical_content_key}"
99:     if execution_revision != "v1":
100:         material = f"{claim_task_policy_ref}\n{execution_revision}\n{canonical_content_key}"
101:     digest = hashlib.md5(
102:         material.encode("utf-8")
103:     ).hexdigest()
104:     return f"derived:artifact:claim-extraction-receipt:{digest}"
105:
106:
107: def claim_qualification_evidence_id(
108:     *,
109:     automatic_claim_policy_ref: str,
110:     quality_artifact_id: str,
111: ) -> str:
112:     digest = hashlib.sha256(
113:         f"{automatic_claim_policy_ref}\n{quality_artifact_id}".encode("utf-8")
114:     ).hexdigest()
115:     return f"derived:artifact:claim-qualification-evidence:{digest}"
116:
117:
118: def claim_extraction_source_link_id(
119:     *,
120:     receipt_artifact_id: str,
121:     qualification_evidence_artifact_id: str,
122: ) -> str:
123:     digest = hashlib.sha256(
124:         f"{receipt_artifact_id}\n{qualification_evidence_artifact_id}".encode("utf-8")
125:     ).hexdigest()
126:     return f"derived:artifact:claim-extraction-source-link:{digest}"
127:
128:
129: def claim_route_handoff_id(
130:     *,
131:     receipt_artifact_id: str,
132:     routing_policy_ref: str,
133: ) -> str:
134:     digest = hashlib.sha256(
135:         f"{receipt_artifact_id}\n{routing_policy_ref}".encode("utf-8")
136:     ).hexdigest()
137:     return f"derived:artifact:claim-route-handoff:{digest}"
138:
139:
140: def _validate_body(body: dict[str, Any], *, policy_ref: str) -> dict[str, Any]:
141:     schema_key = body.get("schema_key")
```
