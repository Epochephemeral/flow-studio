# 源码摘录：migrations/0223_claim_category_candidate_choice_v3.sql

原文件：`migrations/0223_claim_category_candidate_choice_v3.sql`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`bb3ca9b20accd41ac3722be4bb139fd8eaa3cc0f8430660ffabcd1ce1adf6c3f`
摘录范围：27–86 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
27:       'text', $prompt$
28: 你负责判断内容抽取模型给出的一个品类说法，能否归入一个现有的商品推荐
29: Category。observed_category_text 是权威输入；不得从标题、正文、使用场景、
30: 功能词或比较对象改写它。
31:
32: 这是推荐服务归属，不是严格的生物分类。原则是宽进：误入一个合理的现有
33: 商品推荐品类，代价低于漏掉可服务的商品证据。语义检索、名称包含和名称
34: 近似只负责提供候选，不证明候选正确。
35:
36: 必须逐个判断 candidate_categories，而不是判断整组候选是否彼此一致：
37: - 只要至少一个候选与输入构成可接受关系，就选择其中最合适的一个；
38: - 其他候选仅相关、类型不同或不合适，不能否决已经存在的合理候选；
39: - 只有所有候选都不构成可接受关系时，才返回拒绝关系；
40: - relation 描述 observed_category_text 与 selected_category_entity_id 之间
41:   的关系，不描述 observed_category_text 与整个候选集合之间的关系。
42:
43: 只能选择一种 relation：
44: - equivalent：同义词、别称或消费者通常视为同一种商品类型；
45: - observed_is_subtype：输入是候选的更具体商品子类型；
46: - candidate_is_representative_subtype：输入是较宽的商品类型，候选是其中
47:   一个常见、主要且适合承接推荐证据的商品子类型；归入后没有改变商品种类；
48: - host_related_product：输入是候选主商品的配件、零部件或耗材，或者反之；
49: - related_only：只是功能、技术、用户群、兼容关系或使用场景相关；
50: - different_product_type：都是商品，但不是同一种或可承接的商品类型；
51: - non_product_subject：输入是服务、地点、路线、内容主题、使用场景或解决
52:   方案，候选是与其相关的商品；
53: - insufficient：现有信息不足以选择。
54:
55: equivalent、observed_is_subtype、candidate_is_representative_subtype 必须从
56: 候选中选择一个 selected_category_entity_id。其余 relation 不得选择候选。
57: 候选比输入更窄并不自动拒绝；如果它是输入品类中常见且主要的推荐承接品类，
58: 应使用 candidate_is_representative_subtype。仅仅相关则必须拒绝。不得发明
59: 输入之外的 Category ID。
60:
61: 只输出以下 JSON object：
62: {
63:   "relation": "equivalent|observed_is_subtype|candidate_is_representative_subtype|host_related_product|related_only|different_product_type|non_product_subject|insufficient",
64:   "observed_category_text": "逐字复制输入",
65:   "selected_category_entity_id": "前三种 relation 时从输入候选原样复制；否则不输出",
66:   "reason": "一句话说明输入与所选候选的商品推荐归属关系，或说明所有候选都不合适"
67: }
68: $prompt$
69:     )
70:   )
71: )
72: INSERT INTO registry.artifact
73:   (artifact_id, artifact_type, artifact_key, version, status, body, body_hash)
74: SELECT
75:   'registry:artifact:claim_category_compatibility_prompt:claim_category_candidate_choice:3',
76:   'claim_category_compatibility_prompt',
77:   'claim_category_candidate_choice',
78:   3,
79:   'active',
80:   body,
81:   'seed:' || md5(body::text)
82: FROM prompt_body
83: ON CONFLICT (artifact_type, artifact_key, version) DO UPDATE SET
84:   artifact_id=EXCLUDED.artifact_id,
85:   status=EXCLUDED.status,
86:   body=EXCLUDED.body,
```
