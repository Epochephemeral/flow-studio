import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { projectRoot, buildSnapshot } from '../scripts/build-snapshot.mjs';
import { validateInstance } from '../scripts/validate-instance.mjs';
import { planCommands, collect } from '../scripts/collect-cli-evidence.mjs';
const workspace = resolve(projectRoot, 'examples/goods-kb');
const body = await readFile(resolve(workspace, 'workspace.json'));
const definition = JSON.parse(body);
const hash = createHash('sha256').update(body).digest('hex');
const instance = async (name) => JSON.parse(await readFile(resolve(workspace, 'instances', `${name}.json`), 'utf8'));

test('complex examples build independently with verified excerpts', async (t) => {
  const dir = await mkdtemp(resolve(tmpdir(), 'flow-studio-advanced-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const result = await buildSnapshot({ workspace, outputRoot: dir });
  assert.equal(result.flows, 2); assert.equal(result.nodes, 24);
  const snapshot = JSON.parse(await readFile(resolve(dir, 'src/snapshot.json'), 'utf8'));
  assert.equal(snapshot.nodes.find((n) => n.id === 'claim.route').type, 'program');
  assert.equal(snapshot.nodes.find((n) => n.id === 'content.resolve').inputs.length, 2);
  assert.equal(snapshot.instances.length, 2);
  assert.deepEqual(snapshot.instances.find((item) => item.flowId === 'content-knowledge').executions.filter((e) => e.nodeId === 'content.asr').map((e) => e.attempt), [1, 2]);
  assert.equal(snapshot.instances.find((item) => item.flowId === 'store-discovery').sideEffects.receiptRef, 'example:artifact:store.apply');
});
test('synthetic runs retain retry, skipped, unknown and partial-write evidence', async () => {
  for (const id of ['content-knowledge', 'store-discovery']) validateInstance(await instance(id), definition, hash);
  const content = await instance('content-knowledge');
  assert.deepEqual(content.executions.filter((e) => e.nodeId === 'content.asr').map((e) => e.attempt), [1, 2]);
  const falseSuccess = structuredClone(content); falseSuccess.state = 'succeeded'; falseSuccess.completionEvidenceRef = 'example:receipt';
  assert.throws(() => validateInstance(falseSuccess, definition, hash), /unknown or running/);
  const store = await instance('store-discovery');
  assert.equal(store.state, 'failed'); assert.equal(store.sideEffects.state, 'confirmed-in-example');
  assert.equal(store.executions.find((e) => e.nodeId === 'store.finish').itemKey, store.executions.find((e) => e.nodeId === 'store.apply').itemKey);
  for (const nodeId of ['store.enrich', 'store.interpret']) {
    const execution = store.executions.find((e) => e.nodeId === nodeId);
    assert.equal(execution.itemKey, 'example:item:b');
    assert.ok(execution.inputRefs.includes('example:artifact:store.triage'));
    assert.ok(!execution.inputRefs.includes('example:artifact:store.triage-item-c'));
  }
  const stale = structuredClone(store); stale.definitionSha256 = 'wrong';
  assert.throws(() => validateInstance(stale, definition, hash), /definition hash/);
  const unsupported = structuredClone(store); unsupported.executions[0].evidenceRefs = [];
  assert.throws(() => validateInstance(unsupported, definition, hash), /terminal state needs evidence/);
});
test('collection plan is bounded and contains only explicit read commands', async () => {
  const plan = { schemaVersion: 1, jobs: ['run:1'], tasks: ['task:1'], artifacts: [], registry: [] };
  assert.deepEqual(planCommands(plan)[0], ['run', 'gkb', 'job', 'show', 'run:1', '--include', 'artifacts,lineage,events', '--json']);
  assert.throws(() => planCommands({ ...plan, jobs: ['--yes'] }), /stable IDs/);
  assert.throws(() => planCommands({ ...plan, jobs: Array.from({ length: 51 }, (_, i) => `run:${i}`) }), /1–50/);
  await assert.rejects(() => collect({ plan, repo: '.', output: projectRoot }), /outside/);
});

test('collector preserves successful raw bytes and marks partial failures', async (t) => {
  const { mkdir, writeFile, chmod, readdir } = await import('node:fs/promises');
  const dir = await mkdtemp(resolve(tmpdir(), 'flow-studio-capture-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const bin = resolve(dir, 'bin'); await mkdir(bin);
  const fake = resolve(bin, 'uv');
  const raw = JSON.stringify({ schema_key: 'gkb.cli.result', data: { object_type: 'job', job_id: 'fixture:run' } }) + '\n';
  await writeFile(fake, `#!${process.execPath}\nprocess.stdout.write(${JSON.stringify(raw)});\n`);
  await chmod(fake, 0o700);
  const previous = process.env.PATH;
  process.env.PATH = bin + ':' + previous;
  t.after(() => { process.env.PATH = previous; });
  const plan = { schemaVersion: 1, jobs: ['fixture:run'], tasks: [], artifacts: [], registry: [] };
  const result = await collect({ plan, repo: dir, output: resolve(dir, 'success') });
  assert.equal(await readFile(resolve(result.batch, '000.json'), 'utf8'), raw);
  const manifest = JSON.parse(await readFile(resolve(result.batch, 'manifest.json'), 'utf8'));
  assert.equal(manifest.state, 'succeeded');
  assert.equal(manifest.records[0].sha256, createHash('sha256').update(raw).digest('hex'));
  await writeFile(fake, `#!${process.execPath}\nprocess.stderr.write('private diagnostic');process.exit(2);\n`);
  await assert.rejects(() => collect({ plan, repo: dir, output: resolve(dir, 'failure') }), /capture failed at object 0/);
  const [batch] = await readdir(resolve(dir, 'failure'));
  const failure = await readFile(resolve(dir, 'failure', batch, 'manifest.json'), 'utf8');
  assert.equal(JSON.parse(failure).state, 'failed');
  assert.equal(failure.includes('private diagnostic'), false);
});


test('stale attached instances fail before replacing a previous published snapshot', async (t) => {
  const { cp, writeFile } = await import('node:fs/promises');
  const dir = await mkdtemp(resolve(tmpdir(), 'flow-studio-instance-gate-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const input = resolve(dir, 'input'); const output = resolve(dir, 'output');
  await cp(workspace, input, { recursive: true });
  await buildSnapshot({ workspace: input, outputRoot: output });
  const before = await readFile(resolve(output, 'src/snapshot.json'), 'utf8');
  const path = resolve(input, 'instances/content-knowledge.json');
  const stale = JSON.parse(await readFile(path, 'utf8')); stale.definitionSha256 = 'stale';
  await writeFile(path, JSON.stringify(stale));
  await assert.rejects(() => buildSnapshot({ workspace: input, outputRoot: output }), /definition hash mismatch/);
  assert.equal(await readFile(resolve(output, 'src/snapshot.json'), 'utf8'), before);
});
