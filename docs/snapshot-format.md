# 快照格式 v1

设计概念与边界见 [Node 与 Flow](concepts.md)。Flow Studio 使用一个 JSON 文件描述工作区。可直接复制 `examples/workspace.json`，再替换节点和来源。

## 顶层

| 字段 | 含义 |
| --- | --- |
| `schemaVersion` | 固定为 `1` |
| `meta.title` | 界面中的工作区名称 |
| `meta.date` | 定义日期，显示在页头 |
| `meta.baseCommit` | 定义对应的源码版本；示例可写 `example` |
| `meta.scope` | 定义覆盖范围与事实边界 |
| `meta.promptScope` | Prompt 来源及动态配置的边界 |
| `nodes` | 非空节点数组 |
| `flows` | 非空流程数组 |

## 节点

每个节点需要 `id`、`name`、`type`、`purpose`、`implementation`、`trigger`、`sources`、`inputs`、`outputs` 和 `prompts`。ID 在整个工作区唯一，共享节点直接复用同一个 ID。

`type` 为 `program`、`model` 或 `harness`。类型按步骤控制权划分，完整定义见 [Node 与 Flow](concepts.md)。`prompts` 可以为空，embedding 等模型调用未必使用文本 Prompt；已知存在但拿不到正文时，用 `missingPrompts` 表达缺口。空数组只表示快照未声明材料。

```json
{
  "id": "summary.generate",
  "name": "带引用的摘要",
  "type": "model",
  "purpose": "从原文提取结论并保留引用。",
  "implementation": "pipeline.py",
  "trigger": "文档全文就绪",
  "sources": [{"path": "pipeline.py", "line": 27}],
  "inputs": [{
    "name": "text",
    "schema": "ResolvedText",
    "required": true,
    "from": {"node": "document.resolve", "output": "text"}
  }],
  "outputs": [{"name": "summary", "schema": "CitedSummary"}],
  "prompts": [{
    "title": "System prompt",
    "textFile": "prompts/summarize.md",
    "origin": "Prompt 文件",
    "source": {"path": "prompts/summarize.md", "line": 1}
  }]
}
```

这个片段需要与其上游节点一起定义。`schema` 是展示用类型文本，接入方负责与实际调用契约核对。

当前 v1 将外部输入与节点输出结构化，配置引用由 `implementation`、`note` 和 Prompt 来源保留。输入的来源二选一：`from: {node, output}` 或 `source: "external"`。`from` 必须指向存在的节点及输出端口。`condition` 可选，用于表达路径生效条件；`required` 描述该路径下的输入要求。端口名在同一节点的输入／输出列表内分别唯一。

节点可带 `note`，说明互斥路径、工具权限、预算或配置边界。Harness 的动态工具选择不用伪装成固定执行步骤。

## Prompt 与来源

Prompt 支持内联 `text`，或用 `textFile` 在构建时读取全文。`source` 必填；由多份来源组成时加 `additionalSources` 数组。它们都会导出来源文件。

缺失正文使用：

```json
{
  "title": "运行时 Prompt",
  "ref": "registry:summary-policy",
  "source": {"path": "pipeline.py", "line": 27}
}
```

把以上对象放入节点的 `missingPrompts` 数组，界面会显示缺失内容与定位依据。

所有 source 对象均使用 `{path, line}`，可附带预期 `sha256`。`path` 是相对配置中 workspace 根目录的规范路径；`line` 从 1 开始。构建校验文件与行号，生成 SHA-256；提供的哈希不匹配时失败。来源导出是完整文件，不仅是定位行。

## Flow

```json
{
  "id": "summaries",
  "name": "摘要与证据核查",
  "purpose": "形成经过核查的摘要。",
  "nodes": ["document.resolve", "summary.generate"],
  "results": ["summary.generate.summary"],
  "source": {"path": "pipeline.py", "line": 27}
}
```

Flow 是平级的目的视角，成员关系不表达所有权、执行顺序或启动传播。Flow ID 唯一，`nodes` 引用已定义节点，`results` 使用 `<node ID>.<output name>` 且属于本 Flow。可加 `note`。跨流关系由节点的输入绑定决定，不需要重复声明连线。

构建校验结构和引用，不证明图与真实系统一致。发布前应对照执行入口，核对节点职责、数据依赖、条件分支、优先级以及 Prompt／工具的实际生效方式。

## 运行实例

顶层可选 `instances`，值为相对 workspace 的实例 JSON 文件路径数组。构建会逐个校验实例与定义哈希后打包，缺省为空。页面提供定义／运行实例切换，实例只对所属 Flow 生效。

实例格式和采集方法见 [运行实例与采集规则](../examples/goods-kb/runtime-and-collection.md)。`inputValue`、`outputValue` 为可选的已采集 JSON 值；字段缺失明确显示未采集，不能用引用猜测正文。实例文件会进入公开网页，只引用已经审查可公开的材料；私有原始采集包保持在仓库之外。
