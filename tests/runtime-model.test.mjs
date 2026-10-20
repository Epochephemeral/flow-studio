import test from 'node:test';
import assert from 'node:assert/strict';
import { occurrences, historyLabel, resolveInstance } from '../src/runtime-model.mjs';

test('runtime summary preserves both failed and successful attempts and separates absent records', () => {
  const instance = { executions: [
    { nodeId: 'asr', state: 'failed', attempt: 1 },
    { nodeId: 'asr', state: 'succeeded', attempt: 2 },
    { nodeId: 'route', state: 'unknown' },
    { nodeId: 'publish', state: 'skipped' },
  ] };
  assert.equal(historyLabel(occurrences(instance, 'asr')), '失败 · 成功');
  assert.equal(historyLabel(occurrences(instance, 'route')), '未知');
  assert.equal(historyLabel(occurrences(instance, 'publish')), '跳过');
  assert.equal(historyLabel(occurrences(instance, 'absent')), '无记录');
});
test('instance selection follows flow scope and explicitly rejects nonexistent IDs', () => {
  const instances = [{ instanceId: 'content-run', flowId: 'content' }, { instanceId: 'store-run', flowId: 'store' }];
  assert.equal(resolveInstance(instances, ['content'], '').active.instanceId, 'content-run');
  assert.equal(resolveInstance(instances, ['content', 'store'], 'store-run').active.instanceId, 'store-run');
  assert.equal(resolveInstance(instances, ['store'], 'content-run').active.instanceId, 'store-run');
  assert.equal(resolveInstance(instances, [], 'store-run').active, null);
  assert.equal(resolveInstance(instances, ['content'], 'missing-run').invalidRequest, true);
  assert.equal(resolveInstance(instances, ['content'], 'missing-run').active, null);
});
