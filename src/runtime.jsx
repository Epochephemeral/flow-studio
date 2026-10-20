import React from "react";

import { stateLabels, occurrences, historyLabel } from "./runtime-model.mjs";
export { occurrences, historyLabel } from "./runtime-model.mjs";

export function InstanceOverview({ instance, nodes, onNode }) {
  return (
    <section className="instance-overview" aria-label="运行实例概览">
      <div className="instance-summary">
        <strong>
          {instance.evidenceKind === "synthetic"
            ? "演示运行实例"
            : "已采集运行实例"}
        </strong>
        <span className={`execution-state ${instance.state}`}>
          {stateLabels[instance.state]}
        </span>
        <span>
          {instance.sourceRunIds.length} 个原生 run ·{" "}
          {instance.executions.length} 条节点记录
        </span>
      </div>
      <code className="instance-id">{instance.instanceId}</code>
      {instance.evidenceKind === "synthetic" && (
        <p className="muted">
          以下是构造的运行记录，用于展示路径与证据规则；并非生产运行。
        </p>
      )}
      {instance.sideEffects && (
        <p className="instance-warning">
          已确认的写入回执：{instance.sideEffects.receiptRef}
          。整体失败不代表没有写入。
        </p>
      )}
      <div className="execution-list" aria-label="节点运行记录">
        {nodes.map((node) => {
          const events = occurrences(instance, node.id);
          return (
            <button
              key={node.id}
              onClick={() => onNode(node.id)}
              className="execution-row"
            >
              <strong>{node.name}</strong>
              <span>{historyLabel(events)}</span>
              <small>{events.length} 条记录 · 查看详情</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Refs({ label, values }) {
  return (
    <div className="execution-refs">
      <h4>{label}</h4>
      {values.length ? (
        values.map((ref) => <code key={ref}>{ref}</code>)
      ) : (
        <span className="muted">未提供</span>
      )}
    </div>
  );
}
export function ExecutionDetails({ instance, nodeId }) {
  const executions = occurrences(instance, nodeId);
  return (
    <section className="execution-details" aria-label="节点运行详情">
      <p className="muted">
        {instance.evidenceKind === "synthetic" ? "演示记录" : "采集记录"} ·
        保留每次发生，不将多次尝试合成最后一个状态。时间缺失保持未知。
      </p>
      {!executions.length && <p>当前实例未提供这个节点的运行记录。</p>}
      {executions.map((execution) => (
        <article className="execution-card" key={execution.executionId}>
          <header>
            <span className={`execution-state ${execution.state}`}>
              {stateLabels[execution.state]}
            </span>
            <strong>
              {execution.attempt === null
                ? "尝试编号未知"
                : `尝试 ${execution.attempt}`}
            </strong>
          </header>
          <p>{execution.reason || "尚未提供结果说明"}</p>
          <dl>
            {[
              ["发生 ID", execution.executionId],
              ["处理对象", execution.itemKey],
              ["Run ID", execution.runId],
              ["Task ID", execution.taskId],
              ["开始时间", execution.startedAt],
              ["结束时间", execution.endedAt],
            ].map(([key, value]) => (
              <React.Fragment key={key}>
                <dt>{key}</dt>
                <dd>{value ?? "未知"}</dd>
              </React.Fragment>
            ))}
          </dl>
          {["inputValue", "outputValue"].map((key) => (
            <div className="execution-values" key={key}>
              <h4>{key === "inputValue" ? "输入值" : "输出值"}</h4>
              {Object.hasOwn(execution, key) ? (
                <pre>{JSON.stringify(execution[key], null, 2)}</pre>
              ) : (
                <span className="muted">未采集，参见引用与结果说明</span>
              )}
            </div>
          ))}
          <Refs label="输入引用" values={execution.inputRefs} />
          <Refs label="输出引用" values={execution.outputRefs} />
          <Refs label="配置引用" values={execution.policyRefs} />
          <Refs label="证据引用" values={execution.evidenceRefs} />
        </article>
      ))}
      <details className="instance-metadata">
        <summary>实例与定义版本</summary>
        <code>{instance.instanceId}</code>
        <code>SHA-256 {instance.definitionSha256}</code>
        <Refs label="关联 Run" values={instance.sourceRunIds} />
        <p>完成回执：{instance.completionEvidenceRef ?? "未提供"}</p>
      </details>
    </section>
  );
}
