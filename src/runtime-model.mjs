export const stateLabels = {
  unknown: "未知",
  running: "进行中",
  partial: "部分证据",
  succeeded: "成功",
  failed: "失败",
  skipped: "跳过",
  reused: "复用",
};
export const occurrences = (instance, nodeId) =>
  instance?.executions.filter((e) => e.nodeId === nodeId) || [];
export function historyLabel(executions) {
  if (!executions.length) return "无记录";
  const counts = new Map();
  for (const execution of executions)
    counts.set(execution.state, (counts.get(execution.state) || 0) + 1);
  return [...counts]
    .map(
      ([state, count]) =>
        `${stateLabels[state]}${count > 1 ? ` ×${count}` : ""}`,
    )
    .join(" · ");
}

export function resolveInstance(instances, flowIds, requestedId) {
  const available = instances.filter((instance) =>
    flowIds.includes(instance.flowId),
  );
  const invalidRequest =
    !!requestedId &&
    requestedId !== "none" &&
    !instances.some((instance) => instance.instanceId === requestedId);
  const active = invalidRequest
    ? null
    : available.find((instance) => instance.instanceId === requestedId) ||
      available[0] ||
      null;
  return { available, active, invalidRequest };
}
