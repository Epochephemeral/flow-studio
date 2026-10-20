# 两条复杂流程示例

这组示例从 goods-kb 的本地工作区整理，保留条件分支、逐项处理、共享输入、跨 run 血缘和部分写入的真实设计。它们是复杂结构的代表，未对整个系统做复杂度排名。

- [流程定义](workspace.json)：2 个 Flow、24 个节点，可在 Flow Studio 中直接阅读。
- [来源清单](provenance.json)：原文件路径、基线 Git、原文件哈希、摘录范围和采集时是否被 Git 跟踪。
- `evidence/`：可以脱离原项目阅读的源码摘录。基线 Git 不覆盖未提交改动，原文件哈希标识本次采集的具体内容。
- [内容运行示例](instances/content-knowledge.json)与[店铺运行示例](instances/store-discovery.json)：均为 **synthetic 演示数据**。
- [运行实例与采集规则](runtime-and-collection.md)：实际证据如何采集、关联、解释和安全分享。

## 在画布中打开

在项目根目录的 `flow-studio.config.json` 中设置：

```json
{
  "workspace": "examples/goods-kb",
  "definition": "workspace.json"
}
```

运行 `npm run dev`，或 `npm run build` 后预览。简单入门示例保存在 `examples/workspace.json`，切回时将 workspace 设为 `examples`。

## 内容发现与知识构建

14 个职责节点把多个独立执行面组合成一个阅读视角：

```text
有界搜索 → 候选准入 → durable dispatch → 详情抓取
                                    ├─ 原生正文 ──────┐
                                    └─ 视频 → ASR ────┤
                                               权威全文 → 质量评价
                                                          ├─ Claim 资格 → 抽取 → 路由／条件补齐
                                                          └─ Insight 资格 → 抽取 → 非空时品类路由
```

搜索、准入和调度不是一次原子调用。抓取、ASR、质量由各自 worker 处理；Claim 和 Insight 在后台按各自策略筛选，不能画成 Claim 成功后才启动 Insight。

视频描述不能替代 transcript。权威全文根据生产者保存的文本要求选择正文或转写，图文内容不等待 ASR。本文没有把原文清洗设成 Claim／Insight 的共同前置。

Claim 路由内部可能调用模型，但步骤由代码控制，节点类型仍为 `program`。图上的类型文本是职责契约；实际批处理、逐源／逐块调用与输出拆分在各自节点内部，不表示数组可以直接传给单项 API。

Prompt 展示静态常量或迁移种子。Claim 的组合 Prompt 来自已有种子的确定性替换与追加；active policy、运行 response schema 和实际模型参数需要另行按执行证据读取。一个动态 Prompt 的正文缺失会保留引用。

**运行示例要点：** ASR 第一次失败、第二次成功；Insight 抽取成功但结果为空，品类路由跳过；Claim 路由没有采集到结果，保持 unknown。整体是跨多个 run 的部分证据集合，不能给它造出一个“全链路成功”的原生 run。

## 权威店铺商品发现

10 个职责节点解释同一店铺×品类任务中的不同 item 路径：

```text
范围与版本 → 完整分页 → 已知归属／待判断项
                       ├─ 已知归属 ───────────────┐
                       └─ 初判 ─┬─ exclude ───────┤
                               └─ 详情补证        │
                                  ├─ 普通详情     │
                                  └─ 必要时 Pro   │
                             身份重判／复用初判   │
                                  ↓               │
                              候选收敛            │
                       ┌─ 精确复用／直接新建 ─────┤
                       ├─ 少量候选 → 模型比较 ────┤
                       └─ 无法收敛 → 待证 ────────┤
                                          汇总与按版本写入 → 结果记录／任务收尾
```

列表必须到达可证实的结束条件。重复页、达到页数上限仍未结束、错误的输入结构都不能当作完整采集。列表失败不能改用普通商品搜索顶替。

初判先排除明显非目标项。其余项补详情；普通详情缺关键规格或 SKU 选项名时再补 Pro。详情改变时重新判断，否则复用初判。已知归属缺详情时也可以补证；“归属已知”和“详情完整”是两回事。

程序处理稳定身份、去重、分页、候选边界、版本校验与重试。模型处理商品身份及少量近邻的语义比较。无法可靠缩小时保留待证，不为了满足数量上限强行截断候选。

**运行示例要点：** item-a 复用已有 Product；item-c 明确排除；item-b 比较后仍待证。确定项在 apply=true 时已经写入，但整体 complete=false，因此任务可进入 dead、run 为 failed。代码中的 `catalog.store_product_discovery.completed` 表示结果事件被记录，不能仅凭事件名称判成功，也不能由 run failed 推断没有副作用。

同一品牌×品类的 Catalog 写入使用 expected_scope_version；任务边界是店铺×品类。多个店铺属于同一品牌时，这两个边界仍需分别保留。

## 校验示例

```sh
node scripts/validate-instance.mjs examples/goods-kb/workspace.json examples/goods-kb/instances/content-knowledge.json
node scripts/validate-instance.mjs examples/goods-kb/workspace.json examples/goods-kb/instances/store-discovery.json
npm test
```

运行实例 JSON 是本项目的示例交换格式。页面上方切换到“运行实例”，可选择实例、查看节点记录，再点击节点阅读每次发生的状态、输入输出值、引用、run/task/attempt 身份和证据。定义连线仍说明静态依赖，不代表每条边在本次都执行。校验通过只证明字段、引用和所列规则成立，不能证明原系统真的执行过，也不能证明结果质量。
