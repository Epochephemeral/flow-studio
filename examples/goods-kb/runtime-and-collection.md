# 运行实例与采集规则

采集目标是回答“哪个输入在什么配置下，经哪些实际尝试产生了什么结果”。定义图提供责任位置；run、task、attempt、事件和产物提供执行证据。先保留原生身份，再投影到图，不能反过来按连线补造执行历史。

## 1. 身份与粒度

| 对象 | 含义与采集规则 |
| --- | --- |
| Flow | 按目的组织节点的定义；不是原生调度或事务边界 |
| instanceId | 本采集包的关联标识；跨 run 的关联集合不能冒充宿主 run ID |
| nodeId | 定义中的稳定职责位置；改展示名称不改变身份 |
| runId | 宿主一次 operation/job 执行的原生 ID；不存在或未取得时为 null |
| taskId | 可重试的持久任务；与 runId 分别保留，不能互相兜底 |
| attempt | 宿主任务尝试编号；未提供时为 null，不能按日志条数猜 |
| executionId | 图中一次职责发生的唯一标识，容纳同一节点的多 item、多块、多次调用 |
| itemKey | 本次发生对应的内容、item、chunk 或聚合范围的稳定身份 |
| artifact / observation ref | 实际输入输出引用；保留原生 ID 和内容哈希 |
| event ref | 支持启动、完成、失败、复用、跳过或写入结论的原始事件引用 |

同一 nodeId 允许多次发生，不能只保存最后一个状态。每个节点至少列出已知发生或一个明确 unknown 占位；占位只表示尚无执行证据。父子调用、并发、扇出和重试保留各自身份，不把一组节点强行归到一个 task。

跨 run 关联优先使用稳定 content key、observation ID、input/output refs、提取 receipt 与 route handoff。时间接近、相同标题或相同展示名称只能帮助找候选，不能独立证明因果关系。

## 2. 状态与结果

本示例使用 `unknown / running / succeeded / failed / skipped / reused` 表达节点发生；原生状态必须在私有证据中保留。instance 使用 `unknown / running / partial / succeeded / failed`，这是阅读投影，不改写宿主状态机。

- `succeeded`：有对应职责的终态或产物证据；模型成功返回空数组也是成功。
- `failed`：有失败证据；临时失败与永久失败的分类遵循宿主策略。
- `skipped`：条件判定、取消或明确未选路径有证据。缺日志只够支持 unknown。
- `reused`：引用既有产物及复用证据；不能重新计成一次模型执行。
- `running`：有已开始证据但没有终态；采集窗口结束不能将它自动改成失败。
- `unknown`：缺失必要证据，保持缺口和定位入口。

整体成功需要独立的完成回执、预先说明的完成范围和所需分支全部满足。历史失败 attempt 可被后续成功恢复，但仍保留；它不能被当作未发生。缺少必要分支结果时不得报整体成功。结构校验不会代替这些业务裁决。

店铺发现需要额外分开三个事实：模型调用是否成功、商品身份是否解决、目录是否已写入。needs_evidence 是模型成功返回的判断，也可能使业务任务失败；确定项的写入回执仍要保留。

## 3. 定义与配置固定到采集时点

实例的 `definitionSha256` 对应本包 workspace.json 的精确字节，避免用今天的图解释昨天的执行。定义源码基线、工作区修改和来源哈希见 provenance.json；这是本地定义证据。

实际执行另行采集：精确 operation、部署代码版本、policy/prompt/schema 引用及版本、模型名和参数、工具集合、权限、预算、实际注入变量和 response schema。代码默认值不自动成为运行配置。没有读取到的值保留 unknown/null，不使用示例或当前最新版补齐。

样例中的 policyRefs 为空、时间为 null，表示没有提供相应运行事实。`synthetic`、`example:` ID 和演示收据必须保留，不能改标签后当真实记录发布。

## 4. 有界只读采集

采集前选定稳定 ID、对象数量、时间窗口和要回答的问题。建议覆盖正文／视频、首次执行／复用、临时失败重试、永久失败、空结果、待证和部分写入；这些用于暴露不同语义，不是要求每次都穷举或证明它们在生产中发生过。

先在有访问权限的 goods-kb 环境按已知稳定 ID 读取：

```sh
uv run gkb job show RUN_ID --include artifacts,lineage,events --json
uv run gkb task show TASK_ID --include error,run --json
uv run gkb artifact show ARTIFACT_ID --include raw,refs --json
uv run gkb registry show POLICY_OR_PROMPT_REF --include body,versions,refs --json
uv run gkb lineage trace --job RUN_ID --depth 5 --json
```

这些命令读取既有结果。不要为了采集而重新执行搜索、ASR、模型判断或 apply。`job show` 会读取指定 run 的事件和产物，可能较大；对象数量上限不等于单个 job 的数据库读取成本上限。超大对象应由宿主增加有界导出能力，不能在采集失败后偷偷省略字段。

项目提供 [采集计划](collection-plan.json) 和 `scripts/collect-cli-evidence.mjs`：默认只输出只读命令计划。

```sh
node scripts/collect-cli-evidence.mjs --plan examples/goods-kb/collection-plan.json
```

将计划里的演示 ID 换成真实 ID，保存到私有目录。明确指定仓库、输出目录与执行参数后采集；以下路径由操作者替换：

```sh
node scripts/collect-cli-evidence.mjs --plan /PRIVATE/plan.json --execute --repo /PATH/TO/goods-kb --output /PRIVATE/captures
```

执行器使用参数数组调用 CLI，不经过 shell；每批 1–50 个明确对象，逐个读取，单次 60 秒和 10 MiB 输出上限。它不会自动追踪并扩大全部血缘。需要补充证据时审阅返回的稳定 refs，生成下一份明确计划。

原始 stdout 与采集清单写入仓库之外的新批次目录，记录命令、起止时间和文件哈希；它们是分时读取，不是同一个数据库快照。对象仍变化时先结束证据窗口或标记不一致，再重新读取。失败的批次保持 failed，不能把部分采集标为完整；诊断日志和环境变量不会回显。

采集包成功只表示计划内读取完成，不表示 Flow 执行成功、全部运行证据齐全或结果质量合格。任务的完整 attempt 历史、精确模型请求和付费调用证据不保证由上述 CLI 完整暴露；拿不到时明确缺失，不能从 task 当前状态重建历史。

CACP 需要区分 eligibility、claim 和 terminal 时，使用宿主可访问的 attempt 事实。queue metrics 的聚合分位数不能替代某个 attempt；ASR mcp_duration_ms 缺失时保持 null，也不替代端到端耗时。避免直接扫描私库或跨越 repository；需要新的读取能力时在宿主提供有界导出。

## 5. 投影与公开示例

1. 保留私有原件及哈希，记录哪些原生 ID 映射到哪些 nodeId，以及映射理由。
2. 根据事件和 refs 建立 execution；只有明确触发／调用证据时才填入相应状态与时间。
3. 区分输入数据、配置引用、产物、调用错误与发布回执。模型输入只含实际传入内容，不能事后拼出一份更完整的输入。
4. 业务数据、账户、凭据、内部地址和日志逐项审查后才能公开。凭据默认从已有本机配置读取，不复制进计划或示例。
5. 公开包优先使用本目录这样的 synthetic 数据。脱敏真实记录必须保留映射方法和覆盖范围；删除关键事实造成证据不足时，同时将相关结论改为 unknown，不能继续宣称完整。
6. 使用 validate-instance 检查定义哈希、稳定引用、时间顺序、attempt 身份和终态依据。事实是否充分、结果是否值得接受，还需按业务完成规则审查。

当前样例保留了内容链路路由 unknown 和店铺链路“已写入但未完成”两种情况。它们使读者可以验证：同一张定义图允许不同运行路径，成功、完成与副作用不是同一个字段。
