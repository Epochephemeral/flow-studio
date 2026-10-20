import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const nonempty = (v) => typeof v === 'string' && v.trim().length > 0;
const check = (v, reason) => { if (!v) throw new Error(reason); };
const states = new Set(['unknown', 'running', 'succeeded', 'failed', 'skipped', 'reused']);

// This validates the example exchange format, not a host's native task schema.
export function validateInstance(instance, definition, definitionHash) {
  check(instance.schemaVersion === 1, 'instance schemaVersion must be 1');
  check(nonempty(instance.instanceId), 'instanceId is required');
  check(['synthetic', 'captured'].includes(instance.evidenceKind), 'declare synthetic or captured');
  check(instance.definitionSha256 === definitionHash, 'definition hash mismatch');
  const flow = definition.flows.find((f) => f.id === instance.flowId);
  check(flow, 'unknown flow');
  check(['unknown', 'running', 'partial', 'succeeded', 'failed'].includes(instance.state), 'invalid instance state');
  check(Array.isArray(instance.sourceRunIds) && instance.sourceRunIds.every(nonempty), 'sourceRunIds must be explicit');
  check(Array.isArray(instance.executions) && instance.executions.length > 0, 'executions must be nonempty');
  const ids = new Set();
  const attempts = new Set();
  const seenNodes = new Set();
  for (const execution of instance.executions) {
    check(nonempty(execution.executionId) && !ids.has(execution.executionId), 'duplicate or missing executionId');
    ids.add(execution.executionId);
    check(flow.nodes.includes(execution.nodeId), `node outside flow: ${execution.nodeId}`);
    seenNodes.add(execution.nodeId);
    check(states.has(execution.state), 'invalid execution state');
    check(nonempty(execution.itemKey), 'itemKey is required for fan-out identity');
    check(execution.runId === null || instance.sourceRunIds.includes(execution.runId), 'runId must reference sourceRunIds or be null');
    check(execution.taskId === null || nonempty(execution.taskId), 'taskId must be explicit or null');
    check(execution.attempt === null || (Number.isInteger(execution.attempt) && execution.attempt >= 1), 'attempt must be positive or null');
    if (execution.taskId !== null && execution.attempt !== null) {
      const identity = JSON.stringify([execution.nodeId, execution.itemKey, execution.taskId, execution.attempt]);
      check(!attempts.has(identity), 'duplicate task attempt occurrence');
      attempts.add(identity);
    }
    for (const key of ['inputRefs', 'outputRefs', 'policyRefs', 'evidenceRefs'])
      check(Array.isArray(execution[key]) && execution[key].every(nonempty), `${key} must be an array of stable refs`);
    if (['succeeded', 'failed', 'skipped', 'reused'].includes(execution.state))
      check(execution.evidenceRefs.length > 0 && nonempty(execution.reason), 'terminal state needs evidence and reason');
    for (const key of ['startedAt', 'endedAt'])
      check(execution[key] === null || (nonempty(execution[key]) && /(?:Z|[+-]\d{2}:\d{2})$/.test(execution[key]) && Number.isFinite(Date.parse(execution[key]))), `${key} must be a timestamp with timezone or null`);
    check(!(execution.startedAt && execution.endedAt) || Date.parse(execution.endedAt) >= Date.parse(execution.startedAt), 'end precedes start');
    check(!(execution.state === 'running' && execution.endedAt !== null), 'running execution cannot have an end');
    if (execution.state === 'reused') check(execution.outputRefs.length > 0, 'reused state needs referenced output');
    if (instance.evidenceKind === 'captured') check(execution.evidenceRefs.every((ref) => !ref.startsWith('example:')), 'captured evidence cannot use example refs');
  }
  check(flow.nodes.every((id) => seenNodes.has(id)), 'each flow node needs an occurrence or explicit unknown');
  if (instance.state === 'succeeded') {
    check(nonempty(instance.completionEvidenceRef), 'success needs an explicit completion receipt');
    check(!instance.executions.some((execution) => ['unknown', 'running'].includes(execution.state)), 'success cannot hide unknown or running occurrences');
  }
  return instance;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [definitionPath, instancePath] = process.argv.slice(2);
    check(definitionPath && instancePath, 'Usage: node scripts/validate-instance.mjs DEFINITION INSTANCE');
    const { createHash } = await import('node:crypto');
    const body = await readFile(definitionPath);
    const instance = JSON.parse(await readFile(instancePath, 'utf8'));
    validateInstance(instance, JSON.parse(body), createHash('sha256').update(body).digest('hex'));
    console.log(JSON.stringify({ instanceId: instance.instanceId, evidenceKind: instance.evidenceKind, executions: instance.executions.length }));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
