# Flow Studio

把程序、模型与 Agent Harness 的流程放在同一个可追溯的画布里阅读。每个节点展示输入输出、触发条件、Prompt 原文与源码位置。

Flow Studio 是静态流程阅读器：流程由 JSON 显式定义，源码文件由构建脚本按引用导出。画布帮助理解系统；运行、调度和业务写入由接入方负责。

## 设计

Flow 是按目的组织的平级视角，节点按稳定 ID 共享。节点类型按谁决定步骤与下一步划分为程序、模型和 Harness；输入表达使用什么，触发表达何时开始。定义、配置和运行证据分别说明。完整设计见 [Node 与 Flow](docs/concepts.md)，接入格式见 [快照格式](docs/snapshot-format.md)。

## 运行

需要 Node.js 22.12+ 和 npm。

```sh
npm ci
npm run dev
```

打开 [本地工作区](http://127.0.0.1:4317)。默认显示两条复杂示例，共 24 个节点。通用文档入门示例保存在 `examples/`，切换方法见各示例说明。

```sh
npm run check       # 数据边界测试和生产构建
npm run preview     # 预览 dist/
```

## 能做什么

- 多选 Flow，合并共享节点并查看跨流关联。
- 横向或纵向自动布局、平移缩放、拖拽节点、缩略图导航。
- 聚焦节点的一跳上下游，逐步展开更多路径。
- 图与关系表切换；按名称搜索节点或 Flow。
- 查看节点契约、条件输入、完整 Prompt 及其来源。
- 切换运行实例，查看每次尝试、输入输出、状态、引用与证据缺口。
- 查看已导出的源文件、定位行和 SHA-256。
- 收起与调整两侧面板，分享包含流、节点、方向和聚焦状态的 URL。

界面使用中文。画布位置只用于本次阅读；流程定义通过文件维护。

## 复杂示例

[内容发现与知识构建、权威店铺商品发现](examples/goods-kb/README.md) 包含 2 条流、24 个节点、可独立阅读的源码摘录，以及重试、跳过、未知和部分写入的运行示例。配套说明运行身份、完成条件和只读证据采集方法。

## 接入自己的项目

1. 参考 [`examples/workspace.json`](examples/workspace.json) 定义节点与流。
2. 修改 `flow-studio.config.json`：`workspace` 指向来源文件根目录，`definition` 是根目录内的定义文件相对路径。
3. 运行 `npm run dev` 或 `npm run build`，都会先生成并校验快照。

```json
{
  "workspace": "my-workspace",
  "definition": "workspace.json"
}
```

一次性生成也支持参数：

```sh
npm run snapshot -- --workspace ./my-workspace --definition workspace.json
```

参数只影响本次生成；后续 dev/build 会重新读取配置文件。完整格式见 [快照格式](docs/snapshot-format.md)。

快照输出到 `src/snapshot.json`，显式引用的完整源文件输出到 `public/sources/`。这两个位置是生成目录。切换工作区时，脚本在校验成功后重建来源目录，避免旧文件残留。

**导出的源文件会进入网页发布物，访问者可以读取其全文。** 引用前请检查文件内容。脚本只读取明确引用的文件，不自动发现项目目录；路径穿越和指向根目录外的符号链接会被拒绝。这是路径约束，不是秘密检测器。

## 部署

`npm run build` 生成 `dist/`，可交给静态站点服务器。相对资源路径支持部署在子目录；需要通过 HTTP(S) 访问以加载布局 Worker 与源文件。

## 开发与验证

- `src/main.jsx`：画布、目录、关系表和详情面板。
- `src/style.css`：工作区样式。
- `scripts/build-snapshot.mjs`：定义校验、来源导出和哈希生成。
- `examples/`：独立示例定义、说明性源码和 Prompt。
- `tests/`：有效快照、非法连接、重复 ID、路径越界、来源缺失和哈希不一致测试。

示例 Python 文件是节点职责说明；模型和 Harness 调用由宿主提供。Prompt 与连线表达定义，不代表模型已被调用或某次运行已成功。条件输入保留在关系数据中，连线不意味着所有分支同时执行。

技术栈：React、React Flow、ELK、Lucide 和 Vite。设计参考：[React Flow 多端口布局](https://reactflow.dev/examples/layout/elkjs-multiple-handles)、[Langflow](https://docs.langflow.org/concepts-overview)、[n8n](https://github.com/n8n-io/n8n)。
