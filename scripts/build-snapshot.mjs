import { readFile, realpath, mkdir, writeFile, rm } from "node:fs/promises";
import { resolve, relative, isAbsolute, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { validateInstance } from "./validate-instance.mjs";

export const projectRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
const requireValue = (condition, message) => {
  if (!condition) throw new Error(message);
};
const text = (value) => typeof value === "string" && value.trim().length > 0;

export function validate(snapshot) {
  requireValue(snapshot.schemaVersion === 1, "schemaVersion must be 1");
  for (const key of ["title", "date", "baseCommit", "scope", "promptScope"])
    requireValue(text(snapshot.meta?.[key]), `meta.${key} is required`);
  requireValue(
    Array.isArray(snapshot.nodes) && snapshot.nodes.length > 0,
    "nodes must be nonempty",
  );
  requireValue(
    Array.isArray(snapshot.flows) && snapshot.flows.length > 0,
    "flows must be nonempty",
  );
  const nodes = new Map();
  for (const node of snapshot.nodes) {
    requireValue(
      text(node.id) && !nodes.has(node.id),
      `duplicate or missing node ID: ${node.id}`,
    );
    nodes.set(node.id, node);
    requireValue(
      ["program", "model", "harness"].includes(node.type),
      `invalid type: ${node.id}`,
    );
    for (const key of ["name", "purpose", "implementation", "trigger"])
      requireValue(text(node[key]), `${node.id}.${key} is required`);
    requireValue(
      Array.isArray(node.sources) && node.sources.length > 0,
      `${node.id} needs sources`,
    );
    for (const key of ["inputs", "outputs"]) {
      requireValue(
        Array.isArray(node[key]),
        `${node.id}.${key} must be an array`,
      );
      const names = new Set();
      for (const port of node[key]) {
        requireValue(
          text(port.name) && text(port.schema) && !names.has(port.name),
          `${node.id}: invalid or duplicate ${key} port`,
        );
        names.add(port.name);
        if (key === "inputs") {
          requireValue(
            typeof port.required === "boolean",
            `${node.id}: input required must be boolean`,
          );
          requireValue(
            Boolean(port.from) !== (port.source === "external"),
            `${node.id}: input needs exactly one source`,
          );
        }
      }
    }
    requireValue(
      Array.isArray(node.prompts),
      `${node.id}.prompts must be an array`,
    );
    for (const prompt of node.prompts)
      requireValue(
        text(prompt.title) &&
          text(prompt.origin) &&
          prompt.source &&
          Boolean(text(prompt.text)) !== Boolean(text(prompt.textFile)),
        `${node.id}: invalid prompt`,
      );
    requireValue(
      node.missingPrompts === undefined || Array.isArray(node.missingPrompts),
      `${node.id}.missingPrompts must be an array`,
    );
  }
  for (const node of snapshot.nodes)
    for (const port of node.inputs)
      if (port.from) {
        const source = nodes.get(port.from.node);
        requireValue(
          source?.outputs.some((p) => p.name === port.from.output),
          `broken binding: ${node.id}.${port.name}`,
        );
      }
  const flowIds = new Set();
  for (const flow of snapshot.flows) {
    requireValue(
      text(flow.id) && !flowIds.has(flow.id),
      `duplicate or missing flow ID: ${flow.id}`,
    );
    flowIds.add(flow.id);
    requireValue(
      text(flow.name) && text(flow.purpose) && flow.source,
      `invalid flow: ${flow.id}`,
    );
    requireValue(
      Array.isArray(flow.nodes) &&
        flow.nodes.length > 0 &&
        new Set(flow.nodes).size === flow.nodes.length &&
        flow.nodes.every((id) => nodes.has(id)),
      `invalid members: ${flow.id}`,
    );
    requireValue(
      Array.isArray(flow.results) &&
        flow.results.length > 0 &&
        flow.results.every((result) =>
          flow.nodes.some((id) =>
            nodes
              .get(id)
              .outputs.some((port) => `${id}.${port.name}` === result),
          ),
        ),
      `invalid results: ${flow.id}`,
    );
  }
  return snapshot;
}

export async function readSource(workspace, ref) {
  requireValue(
    ref &&
      text(ref.path) &&
      !ref.path.includes("\\") &&
      !isAbsolute(ref.path) &&
      !ref.path
        .split("/")
        .some((part) => !part || part === "." || part === ".."),
    "source path must be a normalized relative path",
  );
  requireValue(
    Number.isInteger(ref.line) && ref.line > 0,
    `invalid source line: ${ref.path}`,
  );
  const root = await realpath(workspace);
  const path = await realpath(resolve(root, ref.path));
  const rel = relative(root, path);
  requireValue(
    rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel),
    `source escapes workspace: ${ref.path}`,
  );
  const body = await readFile(path, "utf8");
  requireValue(
    ref.line <= body.split("\n").length,
    `source line out of range: ${ref.path}:${ref.line}`,
  );
  return { body, sha256: createHash("sha256").update(body).digest("hex") };
}

export async function buildSnapshot({
  workspace = resolve(projectRoot, "examples"),
  definition = "workspace.json",
  outputRoot = projectRoot,
} = {}) {
  const definitionFile = await readSource(workspace, {
    path: definition,
    line: 1,
  });
  const snapshot = validate(JSON.parse(definitionFile.body));
  const instancePaths = snapshot.instances || [];
  requireValue(
    Array.isArray(instancePaths) && instancePaths.every(text),
    "instances must be relative file paths",
  );
  const definitionHash = createHash("sha256")
    .update(definitionFile.body)
    .digest("hex");
  const instances = [];
  for (const path of instancePaths) {
    const file = await readSource(workspace, { path, line: 1 });
    const instance = validateInstance(
      JSON.parse(file.body),
      snapshot,
      definitionHash,
    );
    requireValue(
      !instances.some((item) => item.instanceId === instance.instanceId),
      "duplicate instanceId",
    );
    instances.push(instance);
  }
  snapshot.instances = instances;
  const files = new Map();
  const hydrate = async (ref) => {
    const file = await readSource(workspace, ref);
    if (ref.sha256)
      requireValue(
        ref.sha256 === file.sha256,
        `source hash mismatch: ${ref.path}`,
      );
    ref.sha256 = file.sha256;
    files.set(ref.path, file.body);
  };
  for (const node of snapshot.nodes) {
    for (const ref of node.sources) await hydrate(ref);
    for (const prompt of node.prompts) {
      if (prompt.textFile) {
        const file = await readSource(workspace, {
          path: prompt.textFile,
          line: 1,
        });
        prompt.text = file.body;
        delete prompt.textFile;
      }
      requireValue(text(prompt.text), `empty prompt: ${node.id}`);
      await hydrate(prompt.source);
      for (const ref of prompt.additionalSources || []) await hydrate(ref);
    }
    for (const prompt of node.missingPrompts || []) {
      requireValue(
        text(prompt.title) && text(prompt.ref),
        `invalid missing prompt: ${node.id}`,
      );
      await hydrate(prompt.source);
    }
  }
  for (const flow of snapshot.flows) await hydrate(flow.source);
  // Validate everything before replacing generated public files.
  const sourceRoot = resolve(outputRoot, "public/sources");
  await rm(sourceRoot, { recursive: true, force: true });
  for (const [path, body] of files) {
    const target = resolve(sourceRoot, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, body);
  }
  await mkdir(resolve(outputRoot, "src"), { recursive: true });
  await writeFile(
    resolve(outputRoot, "src/snapshot.json"),
    JSON.stringify(snapshot, null, 2) + "\n",
  );
  return {
    flows: snapshot.flows.length,
    nodes: snapshot.nodes.length,
    files: files.size,
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const config = JSON.parse(
      await readFile(resolve(projectRoot, "flow-studio.config.json"), "utf8"),
    );
    const options = {
      workspace: resolve(projectRoot, config.workspace),
      definition: config.definition,
    };
    for (let i = 2; i < process.argv.length; i += 2) {
      const key = { "--workspace": "workspace", "--definition": "definition" }[
        process.argv[i]
      ];
      requireValue(
        key && process.argv[i + 1] && !process.argv[i + 1].startsWith("--"),
        "Usage: node scripts/build-snapshot.mjs [--workspace DIR] [--definition FILE]",
      );
      options[key] = process.argv[i + 1];
    }
    console.log(JSON.stringify(await buildSnapshot(options)));
  } catch (error) {
    console.error(`Snapshot build failed: ${error.message}`);
    process.exitCode = 1;
  }
}
