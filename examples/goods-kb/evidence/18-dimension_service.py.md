# 源码摘录：src/goods_kb/catalog/dimension_service.py

原文件：`src/goods_kb/catalog/dimension_service.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`e5442364c1be27db78891ded56ba1b9cec6b8075eecb6b00b7d2b981cca3e2d6`
摘录范围：25–84 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
25:     prompt_ref = policy_body.get("prompt_ref")
26:     model = llm_model(policy_body.get("model"))
27:     if not isinstance(prompt_ref, str) or not prompt_ref:
28:         raise ValueError(f"task policy 缺少 prompt_ref: {task_policy_ref}")
29:
30:     prompt = await registry_repo.get_artifact(pool, artifact_id=prompt_ref)
31:     if prompt is None:
32:         raise ValueError(f"不存在 dimension generation prompt: {prompt_ref}")
33:     prompt_body = prompt.get("body") or {}
34:     prompt_text = prompt_body.get("text") or prompt_body.get("prompt")
35:     if not isinstance(prompt_text, str) or not prompt_text.strip():
36:         raise ValueError(f"dimension generation prompt 缺少 body.text: {prompt_ref}")
37:
38:     output_schema = policy_body.get("output_schema") or {}
39:     return {
40:         "category": category,
41:         "task_policy_ref": task_policy_ref,
42:         "prompt_ref": prompt_ref,
43:         "model": model,
44:         "prompt_text": prompt_text,
45:         "schema_key": output_schema.get("schema_key") or "category_dimension_list",
46:         "schema_version": int(output_schema.get("schema_version") or 1),
47:         "max_tokens": llm_max_tokens(policy_body.get("max_tokens")),
48:     }
49:
50:
51: async def generate_category_dimensions(
52:     pool,
53:     input_data: dict,
54:     *,
55:     actor_type: str = "cli",
56:     llm_client: LLMClient | None = None,
57: ) -> dict:
58:     context = await load_dimension_context(pool, input_data)
59:     category = context["category"]
60:     task_policy_ref = context["task_policy_ref"]
61:     prompt_ref = context["prompt_ref"]
62:     model = context["model"]
63:     max_tokens = context["max_tokens"]
64:     schema_key = context["schema_key"]
65:     schema_version = context["schema_version"]
66:
67:     run = await ops_repo.create_run(
68:         pool,
69:         actor_type=actor_type,
70:         command_name="catalog.dimension.generate",
71:         goal={"category_entity_id": category["entity_id"]},
72:         input_data={**input_data, "task_policy_ref": task_policy_ref},
73:         status="running",
74:     )
75:     run_id = run["run_id"]
76:     raw: str | None = None
77:     try:
78:         settings = get_settings()
79:         generator = llm_client or RouterLLMClient(
80:             base_url=settings.dimension_llm_base_url or None,
81:             api_key=settings.dimension_llm_api_key or None,
82:         )
83:         raw = await generator.complete(
84:             model=model,
```
