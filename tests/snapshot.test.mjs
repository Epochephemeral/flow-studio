import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { buildSnapshot, validate, readSource, projectRoot } from '../scripts/build-snapshot.mjs';
const fixture = async () => JSON.parse(await readFile(resolve(projectRoot, 'examples/workspace.json'), 'utf8'));

test('portable snapshot exports exact sources and prompt text', async (t) => {
  const dir = await mkdtemp(resolve(tmpdir(), 'flow-studio-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  assert.deepEqual(await buildSnapshot({ outputRoot: dir }), { flows: 3, nodes: 8, files: 4 });
  const snapshot = JSON.parse(await readFile(resolve(dir, 'src/snapshot.json'), 'utf8'));
  const prompt = snapshot.nodes.find((n) => n.id === 'summary.generate').prompts[0];
  assert.match(prompt.text, /citations/);
  assert.match(prompt.source.sha256, /^[a-f0-9]{64}$/);
  assert.equal(await readFile(resolve(dir, 'public/sources/pipeline.py'), 'utf8'), await readFile(resolve(projectRoot, 'examples/pipeline.py'), 'utf8'));
  assert.equal(snapshot.nodes.find((n) => n.id === 'document.resolve').inputs[0].condition, '纯文本路径');
});
test('invalid topology and UI data fail before export', async () => {
  const snapshot = await fixture();
  snapshot.nodes[1].inputs[0].from.output = 'missing';
  assert.throws(() => validate(snapshot), /broken binding/);
  const duplicate = await fixture(); duplicate.nodes.push(duplicate.nodes[0]);
  assert.throws(() => validate(duplicate), /duplicate/);
  const member = await fixture(); member.flows[0].nodes.push('missing');
  assert.throws(() => validate(member), /invalid members/);
  const result = await fixture(); result.flows[0].results = ['missing.output'];
  assert.throws(() => validate(result), /invalid results/);
});
test('source files cannot escape the selected workspace', async (t) => {
  const dir = await mkdtemp(resolve(tmpdir(), 'flow-studio-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await symlink(resolve(projectRoot, 'package.json'), resolve(dir, 'outside.json'));
  for (const path of ['../package.json', '/etc/passwd', 'a/../../secret', 'outside.json'])
    await assert.rejects(() => readSource(dir, { path, line: 1 }));
});
test('missing source and hash mismatch fail without replacing previous output', async (t) => {
  const dir = await mkdtemp(resolve(tmpdir(), 'flow-studio-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await buildSnapshot({ outputRoot: dir });
  await writeFile(resolve(dir, 'public/sources/stale-private.txt'), 'stale source');
  await buildSnapshot({ outputRoot: dir });
  await assert.rejects(() => readFile(resolve(dir, 'public/sources/stale-private.txt')), /ENOENT/);
  const before = await readFile(resolve(dir, 'src/snapshot.json'), 'utf8');
  const snapshot = await fixture(); snapshot.nodes[0].sources[0].sha256 = 'wrong';
  // Use a temporary definition beside copied example files, with a deliberately incorrect hash.
  const { cp } = await import('node:fs/promises');
  await cp(resolve(projectRoot, 'examples'), resolve(dir, 'workspace'), { recursive: true });
  await writeFile(resolve(dir, 'workspace/workspace.json'), JSON.stringify(snapshot));
  await assert.rejects(() => buildSnapshot({ workspace: resolve(dir, 'workspace'), outputRoot: dir }), /hash mismatch/);
  assert.equal(await readFile(resolve(dir, 'src/snapshot.json'), 'utf8'), before);
  await assert.rejects(() => readSource(dir, { path: 'missing.py', line: 1 }), /ENOENT/);
});

test('execution type is independent of prompt availability and flow membership', async () => {
  const snapshot = await fixture();
  const model = snapshot.nodes.find((n) => n.id === 'summary.generate');
  model.prompts = []; // Fixed-contract models can operate without a text prompt.
  assert.equal(validate(snapshot).nodes.find((n) => n.id === model.id).type, 'model');
  const program = snapshot.nodes.find((n) => n.id === 'document.ingest');
  program.prompts = structuredClone(snapshot.nodes.find((n) => n.id === 'summary.review').prompts);
  assert.equal(validate(snapshot).nodes[0].type, 'program');
  snapshot.flows[2].nodes.push(model.id);
  assert.equal(validate(snapshot).nodes.filter((n) => n.id === model.id).length, 1);
  model.missingPrompts = [{ title: 'Runtime prompt', ref: 'config:summary', source: { path: 'pipeline.py', line: 27 } }];
  assert.equal(validate(snapshot).nodes.find((n) => n.id === model.id).missingPrompts[0].ref, 'config:summary');
});
