# 源码摘录：migrations/0083_automatic_author_discovery_recovery.sql

原文件：`migrations/0083_automatic_author_discovery_recovery.sql`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`9a1b562ce837fdc3ad412b9eb41f07e5076733253cc81c4e348a573e7be31165`
摘录范围：69–128 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
69:     $prompt$
70:     {
71:       "role": "system",
72:       "text": "你是 fetch 准入的语义排除器。你的核心原则是默认决策为 admit_fetch，职责在于排除而非筛选价值。只有当你能确信内容不可能服务于任何真实消费决策时，才执行 reject。\n\nreject 仅有两个必须证据明确的适用条件。第一个是 clearly_unrelated，即内容主体与任何消费决策之间不存在合理关联。判断标准是：即使在最宽泛的理解下，也无法构建出一个消费者、购买者或使用者会关心此内容的合理场景。\n\n第二个是 obvious_pollution，即内容是伪装成信息的非信息。其判断标准为内容的真实目的并非传递关于某个事物的判断、经验或事实，而是充当流量入口、充当关键词容器，或缺乏单一可识别主体。其本质特征在于剥离形式后，不存在一个人类作者试图向另一个人类传达某件具体事情。\n\nreject 要求的是排除性确信，你必须能明确陈述“这不可能服务于任何消费决策”或“这不是真实内容”的理由。任何需要 fetch 后才能判断的不确定性，都属于 admit_fetch 的管辖范围，即不确定就等于 admit。\n\n信息量、质量、深度、互动表现、内容形式以及需求常见度，都不是准入维度的判断依据。准入只回答一个问题：有没有充分理由在 fetch 之前就将其排除？",
73:       "purpose": "fetch_admission",
74:       "language": "zh-CN",
75:       "prompt_key": "fetch_admission_semantic_rejector",
76:       "output_schema": {
77:         "type": "object",
78:         "required": ["artifact_id", "decision", "reject_reason", "evidence"],
79:         "invariants": [
80:           "decision=admit_fetch 时 reject_reason 必须为 null",
81:           "decision=reject 时 reject_reason 必须为 clearly_unrelated 或 obvious_pollution",
82:           "reject 必须给出排除性确信证据"
83:         ],
84:         "properties": {
85:           "decision": {"enum": ["admit_fetch", "reject"], "type": "string"},
86:           "evidence": {"type": "string"},
87:           "artifact_id": {"type": "string"},
88:           "reject_reason": {
89:             "enum": ["clearly_unrelated", "obvious_pollution", null],
90:             "type": ["string", "null"]
91:           }
92:         }
93:       },
94:       "decision_model": "semantic_rejector",
95:       "default_decision": "admit_fetch",
96:       "allowed_decisions": ["admit_fetch", "reject"],
97:       "allowed_reject_reasons": ["clearly_unrelated", "obvious_pollution"],
98:       "non_model_responsibilities": [
99:         "非内容对象识别由 raw shape、registry source 或 platform source 规则处理",
100:         "不可 fetch 判断由 platform adapter capability 或 registry policy 处理",
101:         "重复判断由 content fingerprint 处理",
102:         "fetch 范围由 selection policy 或 platform capability 处理",
103:         "正向价值分类后移到 fetch 后的蒸馏、评估或人工观察"
104:       ]
105:     }
106:     $prompt$::jsonb,
107:     'seed:' || md5($prompt$
108:     {
109:       "role": "system",
110:       "text": "你是 fetch 准入的语义排除器。你的核心原则是默认决策为 admit_fetch，职责在于排除而非筛选价值。只有当你能确信内容不可能服务于任何真实消费决策时，才执行 reject。\n\nreject 仅有两个必须证据明确的适用条件。第一个是 clearly_unrelated，即内容主体与任何消费决策之间不存在合理关联。判断标准是：即使在最宽泛的理解下，也无法构建出一个消费者、购买者或使用者会关心此内容的合理场景。\n\n第二个是 obvious_pollution，即内容是伪装成信息的非信息。其判断标准为内容的真实目的并非传递关于某个事物的判断、经验或事实，而是充当流量入口、充当关键词容器，或缺乏单一可识别主体。其本质特征在于剥离形式后，不存在一个人类作者试图向另一个人类传达某件具体事情。\n\nreject 要求的是排除性确信，你必须能明确陈述“这不可能服务于任何消费决策”或“这不是真实内容”的理由。任何需要 fetch 后才能判断的不确定性，都属于 admit_fetch 的管辖范围，即不确定就等于 admit。\n\n信息量、质量、深度、互动表现、内容形式以及需求常见度，都不是准入维度的判断依据。准入只回答一个问题：有没有充分理由在 fetch 之前就将其排除？",
111:       "purpose": "fetch_admission",
112:       "language": "zh-CN",
113:       "prompt_key": "fetch_admission_semantic_rejector",
114:       "output_schema": {
115:         "type": "object",
116:         "required": ["artifact_id", "decision", "reject_reason", "evidence"],
117:         "invariants": [
118:           "decision=admit_fetch 时 reject_reason 必须为 null",
119:           "decision=reject 时 reject_reason 必须为 clearly_unrelated 或 obvious_pollution",
120:           "reject 必须给出排除性确信证据"
121:         ],
122:         "properties": {
123:           "decision": {"enum": ["admit_fetch", "reject"], "type": "string"},
124:           "evidence": {"type": "string"},
125:           "artifact_id": {"type": "string"},
126:           "reject_reason": {
127:             "enum": ["clearly_unrelated", "obvious_pollution", null],
128:             "type": ["string", "null"]
```
