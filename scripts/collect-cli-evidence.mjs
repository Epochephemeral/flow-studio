import { readFile, mkdir, writeFile, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { projectRoot } from './build-snapshot.mjs';
const exec = promisify(execFile);

export function planCommands(plan) {
  if (plan.schemaVersion !== 1) throw new Error('collection schemaVersion must be 1');
  const commands = [];
  for (const [key, prefix, suffix] of [
    ['jobs', ['job', 'show'], ['--include', 'artifacts,lineage,events']],
    ['tasks', ['task', 'show'], ['--include', 'error,run']],
    ['artifacts', ['artifact', 'show'], ['--include', 'raw,refs']],
    ['registry', ['registry', 'show'], ['--include', 'body,versions,refs']],
  ]) {
    if (!Array.isArray(plan[key]) || plan[key].some((id) => typeof id !== 'string' || !id.trim() || id.startsWith('-') || /\s/.test(id)))
      throw new Error(`${key} must contain stable IDs, not names or options`);
    for (const id of new Set(plan[key])) commands.push(['run', 'gkb', ...prefix, id, ...suffix, '--json']);
  }
  if (commands.length < 1 || commands.length > 50) throw new Error('select 1–50 explicit objects per collection');
  return commands;
}

export async function collect({ plan, repo, output }) {
  const commands = planCommands(plan);
  const destination = resolve(output);
  // Keep raw execution data outside the repository and its public assets.
  await mkdir(destination, { recursive: true, mode: 0o700 });
  const actual = await realpath(destination);
  const rel = relative(await realpath(projectRoot), actual);
  if (rel === '' || (!rel.startsWith('..' + sep) && rel !== '..' && !isAbsolute(rel)))
    throw new Error('raw captures must be outside the Flow Studio repository');
  // Reserve a fresh batch; never overwrite a previous capture.
  const batch = resolve(actual, `capture-${Date.now()}-${createHash('sha256').update(JSON.stringify(commands)).digest('hex').slice(0, 8)}`);
  await mkdir(batch, { mode: 0o700 });
  const manifest = { schemaVersion: 1, evidenceKind: 'captured', startedAt: new Date().toISOString(), endedAt: null, state: 'running', records: [] };
  for (const [index, args] of commands.entries()) {
    const record = { index, command: ['uv', ...args], startedAt: new Date().toISOString(), endedAt: null, state: 'failed' };
    try {
      const { stdout } = await exec('uv', args, { cwd: repo, encoding: 'utf8', timeout: 60000, maxBuffer: 10 * 1024 * 1024 });
      const result = JSON.parse(stdout);
      if (result.schema_key !== 'gkb.cli.result' || !result.data) throw new Error('unexpected CLI envelope');
      const file = `${String(index).padStart(3, '0')}.json`;
      await writeFile(resolve(batch, file), stdout, { mode: 0o600 });
      Object.assign(record, { state: 'succeeded', file, sha256: createHash('sha256').update(stdout).digest('hex') });
    } catch {
      // No stdout/stderr or environment values are printed on failure.
      record.reason = 'CLI failed, timed out, exceeded 10 MiB, or returned an invalid result';
      record.endedAt = new Date().toISOString();
      manifest.records.push(record);
      manifest.state = 'failed'; manifest.endedAt = record.endedAt;
      await writeFile(resolve(batch, 'manifest.json'), JSON.stringify(manifest, null, 2), { mode: 0o600 });
      throw new Error(`capture failed at object ${index}; partial batch: ${batch}`);
    }
    record.endedAt = new Date().toISOString();
    manifest.records.push(record);
    await writeFile(resolve(batch, 'manifest.json'), JSON.stringify(manifest, null, 2), { mode: 0o600 });
  }
  manifest.state = 'succeeded'; manifest.endedAt = new Date().toISOString();
  await writeFile(resolve(batch, 'manifest.json'), JSON.stringify(manifest, null, 2), { mode: 0o600 });
  return { batch, objects: commands.length, state: manifest.state };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = {};
    for (let i = 2; i < process.argv.length; i++) {
      if (process.argv[i] === '--execute') { options.execute = true; continue; }
      const key = { '--plan': 'plan', '--repo': 'repo', '--output': 'output' }[process.argv[i]];
      if (!key || !process.argv[i + 1] || process.argv[i + 1].startsWith('--')) throw new Error('Usage: --plan FILE [--execute --repo DIR --output PRIVATE_DIR]');
      options[key] = process.argv[++i];
    }
    if (!options.plan) throw new Error('--plan is required');
    const plan = JSON.parse(await readFile(options.plan, 'utf8'));
    if (!options.execute) console.log(JSON.stringify({ mode: 'plan', commands: planCommands(plan).map((args) => ['uv', ...args]) }, null, 2));
    else {
      if (!options.repo || !options.output) throw new Error('--repo and --output are required with --execute');
      console.log(JSON.stringify(await collect({ plan, repo: resolve(options.repo), output: options.output })));
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
