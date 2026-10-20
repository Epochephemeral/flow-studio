import React, { useState, useEffect, useMemo, useRef, memo } from "react";
import { createRoot } from "react-dom/client";
import ReactFlow, {
  ReactFlowProvider,
  Handle,
  Position,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  MarkerType,
  applyNodeChanges,
  useUpdateNodeInternals,
} from "reactflow";
import ELK from "elkjs/lib/elk-api.js";
import elkWorkerUrl from "elkjs/lib/elk-worker.min.js?url";
import {
  Boxes,
  Workflow,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Cpu,
  Code2,
  Bot,
  ArrowUpRight,
  ArrowRight,
  Scan,
  List,
  GitBranch,
  FileText,
  Copy,
  Maximize2,
  X,
  Check,
  Info,
  SlidersHorizontal,
  ExternalLink,
  ChevronRight,
  Braces,
  Layers,
  LocateFixed,
} from "lucide-react";
import snapshot from "./snapshot.json";
import { resolveInstance } from "./runtime-model.mjs";
import {
  InstanceOverview,
  ExecutionDetails,
  occurrences,
  historyLabel,
} from "./runtime.jsx";
import "reactflow/dist/style.css";
import "./style.css";

const all = new Map(snapshot.nodes.map((n) => [n.id, n]));
const labels = { program: "程序", model: "模型", harness: "Harness" };
const icons = { program: Code2, model: Cpu, harness: Bot };
const elk = new ELK({ workerUrl: elkWorkerUrl });
const members = (id) => snapshot.flows.filter((f) => f.nodes.includes(id));
const bound = (n) => n.inputs.filter((p) => p.from);
const hasPromptDetails = (n) =>
  !!n && (n.prompts.length > 0 || (n.missingPrompts?.length || 0) > 0);
const nodeHeight = (n) =>
  128 +
  Math.max(n.inputs.length, n.outputs.length, 1) * 22 +
  (hasPromptDetails(n) ? 31 : 0);
const initial = new URLSearchParams(location.search);
const allRelations = snapshot.nodes.flatMap((n) =>
  bound(n).map((p) => ({ source: p.from.node, target: n.id })),
);
const adjacentIds = (id) =>
  new Set(
    allRelations
      .filter((e) => e.source === id || e.target === id)
      .flatMap((e) => [e.source, e.target])
      .filter((v) => v !== id),
  );

const NodeCard = memo(({ id, data, selected }) => {
  const n = data.node,
    Icon = icons[n.type];
  const vertical = data.direction === "DOWN";
  const updateInternals = useUpdateNodeInternals();
  useEffect(() => {
    updateInternals(id);
  }, [id, data.direction, updateInternals]);
  return (
    <div
      className={`node-card ${n.type} ${selected ? "selected" : ""} ${data.boundary ? "boundary" : ""} ${data.dim ? "dim" : ""}`}
      style={{ height: nodeHeight(n) }}
    >
      <div className="node-kicker">
        <span className={`type-icon ${n.type}`}>
          <Icon size={14} />
        </span>
        <span>{labels[n.type]}</span>
        {data.boundary && <span className="boundary-label">关联节点</span>}
        {data.hiddenCount > 0 && (
          <button
            className="continuation-button nodrag"
            aria-label={`展开 ${n.name} 的 ${data.hiddenCount} 个相邻节点`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              data.expand(n.id);
            }}
          >
            +{data.hiddenCount} 路径
          </button>
        )}
        <span
          className={`node-index ${data.executionLabel ? "node-execution-label" : ""}`}
          title={data.executionLabel || undefined}
        >
          {data.executionLabel || String(data.index + 1).padStart(2, "0")}
        </span>
      </div>
      <strong>{n.name}</strong>
      <p className="node-purpose">{n.purpose}</p>
      <div className="ports">
        {Array.from(
          { length: Math.max(n.inputs.length, n.outputs.length, 1) },
          (_, i) => (
            <div className="port-row" key={i}>
              <span>
                {n.inputs[i] && (
                  <>
                    <span className="port-dot input-dot" />
                    {n.inputs[i].name}
                  </>
                )}
              </span>
              <span>
                {n.outputs[i] && (
                  <>
                    {n.outputs[i].name}
                    <span className="port-dot output-dot" />
                  </>
                )}
              </span>
            </div>
          ),
        )}
      </div>
      {n.inputs.map((p, i) => (
        <Handle
          key={`in-${p.name}`}
          type="target"
          position={vertical ? Position.Top : Position.Left}
          id={`in-${p.name}`}
          style={
            vertical
              ? { left: (244 * (i + 1)) / (n.inputs.length + 1), top: 0 }
              : { top: 132 + i * 22 }
          }
        />
      ))}
      {n.outputs.map((p, i) => (
        <Handle
          key={`out-${p.name}`}
          type="source"
          position={vertical ? Position.Bottom : Position.Right}
          id={`out-${p.name}`}
          style={
            vertical
              ? { left: (244 * (i + 1)) / (n.outputs.length + 1), bottom: 0 }
              : { top: 132 + i * 22 }
          }
        />
      ))}
      {hasPromptDetails(n) && (
        <div className="prompt-foot">
          <FileText size={11} /> Prompt · {n.prompts.length} 段全文
          {!!n.missingPrompts?.length &&
            ` · ${n.missingPrompts.length} 段待读取`}
          <ChevronRight size={12} />
        </div>
      )}
    </div>
  );
});
const nodeTypes = { contract: NodeCard };

function ResizeBar({ side, width, setWidth }) {
  const begin = (e) => {
    e.preventDefault();
    const start = e.clientX,
      old = width;
    const move = (event) =>
      setWidth(
        Math.max(
          side === "left" ? 210 : 320,
          Math.min(
            side === "left" ? 420 : 720,
            old + (event.clientX - start) * (side === "left" ? 1 : -1),
          ),
        ),
      );
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      document.body.classList.remove("resizing");
    };
    document.body.classList.add("resizing");
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
  };
  return (
    <div
      className="resize-bar"
      role="separator"
      tabIndex={0}
      aria-label={`${side === "left" ? "左" : "右"}面板宽度`}
      aria-orientation="vertical"
      aria-valuemin={side === "left" ? 210 : 320}
      aria-valuemax={side === "left" ? 420 : 720}
      aria-valuenow={width}
      onPointerDown={begin}
      onKeyDown={(e) => {
        if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
          e.preventDefault();
          setWidth(
            Math.max(
              side === "left" ? 210 : 320,
              Math.min(
                side === "left" ? 420 : 720,
                width +
                  (e.key === "ArrowRight" ? 16 : -16) *
                    (side === "left" ? 1 : -1),
              ),
            ),
          );
        }
      }}
    />
  );
}

function Modal({ title, children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const before = document.activeElement;
    ref.current?.querySelector("button")?.focus();
    ref.current
      ?.querySelector(".highlight-line")
      ?.scrollIntoView({ block: "center" });
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = ref.current.querySelectorAll(
          'button,a[href],input,[tabindex="0"]',
        );
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      before?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <strong>{title}</strong>
          <button
            className="icon-button"
            aria-label="关闭对话框"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function Studio() {
  const [flows, setFlows] = useState(() => {
    const ids = (initial.get("flows") || snapshot.flows[0].id)
      .split(",")
      .filter((id) => snapshot.flows.some((f) => f.id === id));
    return ids.length ? ids : [snapshot.flows[0].id];
  });
  const [showInstances, setShowInstances] = useState(!!initial.get("instance"));
  const [instanceId, setInstanceId] = useState(initial.get("instance") || "");
  const instanceSelection = resolveInstance(
    snapshot.instances || [],
    flows,
    instanceId,
  );
  const availableInstances = instanceSelection.available;
  const activeInstance = showInstances ? instanceSelection.active : null;
  const [selected, setSelected] = useState(
    all.has(initial.get("node")) ? initial.get("node") : null,
  );
  const [left, setLeft] = useState(true),
    [right, setRight] = useState(!!selected);
  const [lw, setLw] = useState(250),
    [rw, setRw] = useState(420);
  const [query, setQuery] = useState(""),
    [tab, setTab] = useState(
      initial.get("instance")
        ? "execution"
        : hasPromptDetails(all.get(initial.get("node")))
          ? "prompt"
          : "contract",
    );
  const [context, setContext] = useState(false),
    [view, setView] = useState("graph"),
    [focus, setFocus] = useState(initial.get("focus") === "1" && !!selected);
  const [direction, setDirection] = useState(
    initial.get("direction") === "DOWN" ? "DOWN" : "RIGHT",
  );
  useEffect(() => {
    if (!activeInstance && tab === "execution") setTab("contract");
  }, [activeInstance?.instanceId, tab]);
  const [expandedNodes, setExpandedNodes] = useState([]);
  const [nodes, setNodes] = useState([]),
    [edges, setEdges] = useState([]),
    [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null),
    [copied, setCopied] = useState(""),
    [error, setError] = useState("");
  const [layoutRevision, setLayoutRevision] = useState(0);
  const rf = useReactFlow();
  const inspectorOffset =
    right && window.innerWidth <= 1100
      ? Math.min(rw, window.innerWidth - 35) / 1.8
      : 0;
  const chosen = snapshot.flows.filter((f) => flows.includes(f.id));
  const primary = useMemo(
    () => new Set(chosen.flatMap((f) => f.nodes)),
    [flows.join(",")],
  );
  const scoped = useMemo(() => {
    const ids = new Set(primary);
    if (context)
      snapshot.nodes.forEach((n) =>
        bound(n).forEach((p) => {
          if (primary.has(n.id) || primary.has(p.from.node)) {
            ids.add(n.id);
            ids.add(p.from.node);
          }
        }),
      );
    return snapshot.nodes.filter((n) => ids.has(n.id));
  }, [primary, context]);
  const visible = useMemo(() => {
    if (!focus || !selected) return scoped;
    const ids = new Set([selected, ...adjacentIds(selected)]);
    expandedNodes.forEach((id) => adjacentIds(id).forEach((v) => ids.add(v)));
    return snapshot.nodes.filter((n) => ids.has(n.id));
  }, [scoped, focus, selected, expandedNodes]);
  const visibleIds = useMemo(
    () => new Set(visible.map((n) => n.id)),
    [visible],
  );
  const relations = useMemo(
    () =>
      visible.flatMap((n) =>
        bound(n)
          .filter((p) => visible.some((v) => v.id === p.from.node))
          .map((p) => ({
            id: `${p.from.node}:${p.from.output}:${n.id}:${p.name}`,
            source: p.from.node,
            target: n.id,
            sourceHandle: `out-${p.from.output}`,
            targetHandle: `in-${p.name}`,
            input: p.name,
            output: p.from.output,
            condition: p.condition,
          })),
      ),
    [visible],
  );
  const current = all.get(selected);
  const matchedFlows = snapshot.flows.filter((f) =>
    (f.name + f.purpose).toLowerCase().includes(query.toLowerCase()),
  );
  const matchedNodes = query
    ? snapshot.nodes.filter((n) =>
        (n.name + n.id + n.purpose).toLowerCase().includes(query.toLowerCase()),
      )
    : [];
  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      setError("复制失败，请选择文字复制。");
    }
  };
  const chooseNode = (id) => {
    setExpandedNodes([]);
    setSelected(id);
    setRight(true);
    setTab(
      activeInstance
        ? "execution"
        : hasPromptDetails(all.get(id))
          ? "prompt"
          : "contract",
    );
  };
  const toggleFlow = (id) => {
    setFlows((old) =>
      old.includes(id) ? old.filter((v) => v !== id) : [...old, id],
    );
    setFocus(false);
    setExpandedNodes([]);
  };
  const openNode = (id) => {
    if (!primary.has(id) && !visible.some((n) => n.id === id))
      setFlows((old) => [
        ...new Set([...old, members(id)[0]?.id].filter(Boolean)),
      ]);
    chooseNode(id);
  };
  useEffect(() => {
    const p = new URLSearchParams();
    p.set("flows", flows.join(","));
    if (selected) p.set("node", selected);
    if (direction === "DOWN") p.set("direction", direction);
    if (focus && selected) p.set("focus", "1");
    if (showInstances)
      p.set("instance", activeInstance?.instanceId || instanceId || "none");
    history.replaceState(null, "", `?${p}`);
  }, [
    flows,
    selected,
    direction,
    focus,
    showInstances,
    instanceId,
    activeInstance?.instanceId,
  ]);
  useEffect(() => {
    if (selected && !visible.some((n) => n.id === selected)) {
      setSelected(null);
      setRight(false);
    }
  }, [visible]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const graph = {
      id: "root",
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": direction,
        "elk.spacing.nodeNode": "44",
        "elk.layered.spacing.nodeNodeBetweenLayers": "95",
        "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
        "elk.edgeRouting": "ORTHOGONAL",
      },
      children: visible.map((n) => ({
        id: n.id,
        width: 244,
        height: nodeHeight(n),
        layoutOptions: { "elk.portConstraints": "FIXED_POS" },
        ports: [
          ...n.inputs.map((p, i) => ({
            id: `${n.id}:in-${p.name}`,
            x:
              direction === "DOWN"
                ? (244 * (i + 1)) / (n.inputs.length + 1)
                : 0,
            y: direction === "DOWN" ? 0 : 132 + i * 22,
            width: 1,
            height: 1,
            properties: {
              "port.side": direction === "DOWN" ? "NORTH" : "WEST",
            },
          })),
          ...n.outputs.map((p, i) => ({
            id: `${n.id}:out-${p.name}`,
            x:
              direction === "DOWN"
                ? (244 * (i + 1)) / (n.outputs.length + 1)
                : 244,
            y: direction === "DOWN" ? nodeHeight(n) : 132 + i * 22,
            width: 1,
            height: 1,
            properties: {
              "port.side": direction === "DOWN" ? "SOUTH" : "EAST",
            },
          })),
        ],
      })),
      edges: relations.map((e) => ({
        id: e.id,
        sources: [`${e.source}:${e.sourceHandle}`],
        targets: [`${e.target}:${e.targetHandle}`],
      })),
    };
    elk
      .layout(graph)
      .then((layout) => {
        if (!active) return;
        setNodes(
          layout.children.map((n, i) => ({
            id: n.id,
            type: "contract",
            position: { x: n.x, y: n.y },
            data: {
              node: all.get(n.id),
              boundary: !primary.has(n.id),
              index: i,
              direction,
              hiddenCount: focus
                ? [...adjacentIds(n.id)].filter((id) => !visibleIds.has(id))
                    .length
                : 0,
              expand: (id) =>
                setExpandedNodes((old) => [...new Set([...old, id])]),
            },
            selected: n.id === selected,
          })),
        );
        setLoading(false);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const target = layout.children.find((n) => n.id === selected);
            if (right && target)
              rf.setCenter(
                target.x + 122 + inspectorOffset,
                target.y + nodeHeight(all.get(selected)) / 2,
                { zoom: 0.9, duration: 0 },
              );
            else
              rf.fitView({
                padding: 0.14,
                maxZoom: 1,
                minZoom: 0.12,
                duration: 0,
              });
          }),
        );
      })
      .catch((e) => {
        if (active) {
          setError(`图布局失败：${e.message}`);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [visible, relations, direction, layoutRevision, rf.viewportInitialized]);
  useEffect(() => {
    setNodes((old) =>
      old.map((n) => ({
        ...n,
        selected: n.id === selected,
        data: { ...n.data, dim: false },
      })),
    );
    setEdges(
      relations.map((e) => {
        const active =
          selected && (e.source === selected || e.target === selected);
        return {
          ...e,
          type: "smoothstep",
          label: e.condition ? e.condition : e.input,
          style: {
            stroke: active ? "#6c55d8" : "#9ba8b9",
            strokeWidth: active ? 2 : 1.4,
            opacity: 1,
            strokeDasharray: e.condition ? "5 4" : undefined,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: active ? "#6c55d8" : "#9ba8b9",
          },
          labelStyle: { fill: "#586478", fontSize: 10 },
          labelBgStyle: { fill: "#f7f8fa", fillOpacity: 1 },
          labelBgPadding: [5, 3],
        };
      }),
    );
  }, [relations, selected, focus, nodes.length]);
  useEffect(() => {
    if (view === "graph") {
      const timer = setTimeout(() => {
        const n = rf.getNode(selected);
        if (right && n)
          rf.setCenter(
            n.position.x + 122 + inspectorOffset,
            n.position.y + nodeHeight(n.data.node) / 2,
            { zoom: 0.9, duration: 0 },
          );
        else
          rf.fitView({
            padding: 0.14,
            maxZoom: 1,
            minZoom: 0.12,
            duration: 0,
          });
      }, 220);
      return () => clearTimeout(timer);
    }
  }, [
    left,
    right,
    lw,
    rw,
    view,
    selected,
    nodes.length,
    rf.viewportInitialized,
  ]);
  const sourceOpen = async (s) => {
    try {
      const res = await fetch(
        `${import.meta.env.BASE_URL}sources/${s.path.split("/").map(encodeURIComponent).join("/")}`,
      );
      if (!res.ok) throw new Error("文件未导出");
      setModal({
        title: `${s.path}:${s.line}`,
        text: await res.text(),
        source: s,
      });
    } catch (e) {
      setError(`源码读取失败：${e.message}`);
    }
  };
  return (
    <div className="studio">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">
            <Workflow size={21} />
          </span>
          <strong>Flow Studio</strong>
          <span className="brand-divider" />
          <span>{snapshot.meta.title}</span>
        </div>
        <div className="header-meta">
          <span className="snapshot-badge">
            {showInstances ? "运行实例" : "定义快照"}
          </span>
          <span className="date">{snapshot.meta.date}</span>
          <button
            className="icon-button"
            aria-label="数据来源与设计参考"
            onClick={() => setModal({ title: "关于这个工作区", about: true })}
          >
            <Info size={17} />
          </button>
        </div>
      </header>
      <section className="runtime-switcher" aria-label="查看定义或运行实例">
        <div className="segmented">
          <button
            aria-pressed={!showInstances}
            onClick={() => {
              setShowInstances(false);
              if (tab === "execution") setTab("contract");
            }}
          >
            定义
          </button>
          <button
            aria-pressed={showInstances}
            onClick={() => {
              setShowInstances(true);
              setTab("execution");
            }}
          >
            运行实例 <span>{availableInstances.length}</span>
          </button>
        </div>
        {showInstances && instanceSelection.invalidRequest && (
          <p role="alert">链接中的运行实例不存在，请重新选择。</p>
        )}
        {showInstances &&
          (availableInstances.length ? (
            <label>
              选择实例{" "}
              <select
                aria-label="选择运行实例"
                value={activeInstance?.instanceId || ""}
                onChange={(event) => {
                  setInstanceId(event.target.value);
                  setTab("execution");
                }}
              >
                {!activeInstance && (
                  <option value="" disabled>
                    请选择运行实例
                  </option>
                )}
                {availableInstances.map((instance) => (
                  <option key={instance.instanceId} value={instance.instanceId}>
                    {
                      snapshot.flows.find((flow) => flow.id === instance.flowId)
                        ?.name
                    }{" "}
                    · {instance.evidenceKind === "synthetic" ? "演示" : "采集"}{" "}
                    · {instance.instanceId}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p role="status">所选 Flow 尚未提供运行实例。</p>
          ))}
      </section>
      <main className="workspace">
        {left && (
          <aside className="left-panel" style={{ width: lw }}>
            <div className="panel-label">
              <span>WORKSPACE</span>
              <button
                className="icon-button"
                aria-label="收起流目录"
                onClick={() => setLeft(false)}
              >
                <PanelLeftClose size={16} />
              </button>
            </div>
            <h2>
              流目录 <span>{snapshot.flows.length}</span>
            </h2>
            <label className="search-box">
              <Search size={15} />
              <input
                aria-label="搜索流或节点"
                placeholder="搜索流或节点…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  className="icon-button"
                  aria-label="清空搜索"
                  onClick={() => setQuery("")}
                >
                  <X size={13} />
                </button>
              )}
            </label>
            <div className="directory-scroll">
              <div className="section-label">
                按目的组织 <span>可多选</span>
              </div>
              {matchedFlows.map((f) => (
                <button
                  className={`flow-item ${flows.includes(f.id) ? "active" : ""}`}
                  key={f.id}
                  onClick={() => toggleFlow(f.id)}
                  aria-pressed={flows.includes(f.id)}
                >
                  <span className="flow-check">
                    {flows.includes(f.id) ? (
                      <Check size={12} />
                    ) : (
                      <Workflow size={13} />
                    )}
                  </span>
                  <span className="flow-copy">
                    <strong>{f.name}</strong>
                    <small>{f.purpose}</small>
                  </span>
                  <span className="flow-count">{f.nodes.length}</span>
                </button>
              ))}
              {matchedFlows.length === 0 && (
                <p className="empty-search">没有匹配的流</p>
              )}
              {query && (
                <>
                  <div className="section-label">
                    节点 <span>{matchedNodes.length}</span>
                  </div>
                  {matchedNodes.map((n) => (
                    <button
                      className="node-search-result"
                      key={n.id}
                      onClick={() => openNode(n.id)}
                    >
                      <span className={`tiny-dot ${n.type}`} />
                      <span>
                        {n.name}
                        <small>{n.id}</small>
                      </span>
                      <ArrowUpRight size={13} />
                    </button>
                  ))}
                </>
              )}
              <div className="directory-note">
                <GitBranch size={15} />
                <p>Flow 是平级视角。多选后合并连接，共享节点保留一个身份。</p>
              </div>
            </div>
            <footer className="sidebar-footer">
              <span className="tiny-dot program" />
              <span>本地源码快照</span>
              <button
                className="text-button"
                onClick={() =>
                  setModal({ title: "关于这个工作区", about: true })
                }
              >
                查看来源
              </button>
            </footer>
          </aside>
        )}
        {left && <ResizeBar side="left" width={lw} setWidth={setLw} />}
        <section className="graph-panel">
          <div className="scope-header">
            <div className="scope-title">
              <div className="eyebrow">
                FLOW TOPOLOGY{" "}
                <span>/ {chosen.length === 1 ? chosen[0].id : "composed"}</span>
              </div>
              <h1>
                {chosen.length === 1
                  ? chosen[0].name
                  : chosen.length
                    ? `${chosen.length} 个流 · 组合视图`
                    : "选择要查看的流"}
              </h1>
              <p>
                {chosen.length === 1
                  ? chosen[0].purpose
                  : "从左侧选择多个 Flow，查看节点共享与跨流数据依赖。"}
              </p>
            </div>
            <button
              className="source-chip"
              onClick={() => setModal({ title: "关于这个工作区", about: true })}
            >
              <Code2 size={14} /> 源码映射 <ArrowUpRight size={13} />
            </button>
          </div>
          {activeInstance && (
            <InstanceOverview
              instance={activeInstance}
              nodes={snapshot.nodes.filter((node) =>
                snapshot.flows
                  .find((flow) => flow.id === activeInstance.flowId)
                  .nodes.includes(node.id),
              )}
              onNode={(id) => {
                openNode(id);
                setTab("execution");
              }}
            />
          )}
          <div className="canvas-toolbar">
            <div className="toolbar-group">
              {!left && (
                <button
                  className="icon-button"
                  aria-label="展开流目录"
                  onClick={() => setLeft(true)}
                >
                  <PanelLeftOpen size={17} />
                </button>
              )}
              <div className="segmented">
                <button
                  className={view === "graph" ? "active" : ""}
                  onClick={() => setView("graph")}
                >
                  <GitBranch size={14} /> 图
                </button>
                <button
                  className={view === "table" ? "active" : ""}
                  onClick={() => setView("table")}
                >
                  <List size={14} /> 关系表
                </button>
              </div>
              <span className="toolbar-divider" />
              <div className="segmented" aria-label="自动布局方向">
                <button
                  aria-pressed={direction === "RIGHT"}
                  className={direction === "RIGHT" ? "active" : ""}
                  onClick={() => setDirection("RIGHT")}
                >
                  横向
                </button>
                <button
                  aria-pressed={direction === "DOWN"}
                  className={direction === "DOWN" ? "active" : ""}
                  onClick={() => setDirection("DOWN")}
                >
                  纵向
                </button>
              </div>
              <button
                className={`tool-button ${context ? "active" : ""}`}
                aria-pressed={context}
                onClick={() => setContext(!context)}
              >
                <Layers size={14} /> 关联边界
              </button>
              <button
                className={`tool-button ${focus ? "active" : ""}`}
                aria-pressed={focus}
                disabled={!selected}
                onClick={() => {
                  setFocus(!focus);
                  setExpandedNodes([]);
                }}
              >
                <LocateFixed size={14} /> 聚焦
              </button>
            </div>
            <div className="toolbar-group">
              <span className="graph-stats">
                {visible.length} 节点 · {relations.length} 连接
              </span>
              <button
                className="icon-button"
                aria-label="重新自动布局"
                onClick={() => setLayoutRevision((v) => v + 1)}
              >
                <Scan size={16} />
              </button>
              {!right && (
                <button
                  className="icon-button"
                  aria-label="展开详情面板"
                  onClick={() => setRight(true)}
                >
                  <PanelRightOpen size={17} />
                </button>
              )}
            </div>
          </div>
          {error && (
            <div role="alert" className="error-banner">
              {error}
              <button onClick={() => setError("")}>关闭</button>
            </div>
          )}
          <div className="canvas">
            {view === "graph" ? (
              visible.length ? (
                <ReactFlow
                  nodes={nodes.map((node) => ({
                    ...node,
                    data: {
                      ...node.data,
                      executionLabel: activeInstance
                        ? historyLabel(occurrences(activeInstance, node.id))
                        : null,
                    },
                  }))}
                  edges={edges}
                  nodeTypes={nodeTypes}
                  onNodesChange={(changes) =>
                    setNodes((old) => applyNodeChanges(changes, old))
                  }
                  onNodeClick={(_, n) => chooseNode(n.id)}
                  onEdgeClick={(_, e) => {
                    chooseNode(e.target);
                    setTab("contract");
                  }}
                  onPaneClick={() => {
                    setSelected(null);
                    setFocus(false);
                  }}
                  nodesConnectable={false}
                  deleteKeyCode={null}
                  minZoom={0.12}
                  maxZoom={1.6}
                >
                  <Background gap={22} size={1} color="#dce1e9" />
                  <Controls showInteractive={false} />
                  <MiniMap
                    nodeColor={(n) =>
                      n.data.node.type === "model"
                        ? "#c3b8ed"
                        : n.data.node.type === "harness"
                          ? "#f2c9a7"
                          : "#bac9d8"
                    }
                    maskColor="#f7f8fa99"
                    pannable
                    zoomable
                    style={{ width: 130, height: 90 }}
                  />
                </ReactFlow>
              ) : (
                <div className="empty-canvas">
                  <Workflow size={38} />
                  <h3>从一个目的开始</h3>
                  <p>在流目录中选择要理解的链路。</p>
                  <button onClick={() => setFlows([snapshot.flows[0].id])}>
                    查看 {snapshot.flows[0].name}
                  </button>
                </div>
              )
            ) : (
              <div className="relation-table">
                <table>
                  <thead>
                    <tr>
                      <th>来源节点 / 输出</th>
                      <th />
                      <th>目标节点 / 输入</th>
                      <th>条件</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relations.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <button onClick={() => openNode(e.source)}>
                            {all.get(e.source).name}
                          </button>
                          <code>{e.output}</code>
                        </td>
                        <td>
                          <ArrowRight size={14} />
                        </td>
                        <td>
                          <button onClick={() => openNode(e.target)}>
                            {all.get(e.target).name}
                          </button>
                          <code>{e.input}</code>
                        </td>
                        <td>{e.condition || "数据绑定"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!relations.length && (
                  <p className="empty-search">当前范围没有节点间数据连接。</p>
                )}
              </div>
            )}
            {loading && <div className="layout-indicator">正在整理连接…</div>}
            {view === "graph" && (
              <div className="canvas-legend">
                <span>
                  <i className="legend-line" /> 数据绑定
                </span>
                <span>
                  <i className="legend-line conditional" /> 条件路径
                </span>
                <span>
                  <i className="legend-boundary" /> 范围外节点
                </span>
              </div>
            )}
          </div>
          <footer className="canvas-footer">
            <span>
              {activeInstance
                ? "运行实例 · 连线展示定义关系，实际发生以运行记录为准"
                : "定义视图 · 拖动画布平移，滚轮缩放，点击节点阅读契约"}
            </span>
            <button
              className="text-button"
              onClick={() => {
                setFlows(snapshot.flows.map((f) => f.id));
                setSelected(null);
                setRight(false);
              }}
            >
              查看全部 {snapshot.flows.length} 个流 <ArrowUpRight size={12} />
            </button>
          </footer>
        </section>
        {right && <ResizeBar side="right" width={rw} setWidth={setRw} />}
        {right && (
          <aside className="inspector" style={{ width: rw }}>
            <div className="panel-label">
              <span>NODE INSPECTOR</span>
              <button
                className="icon-button"
                aria-label="收起节点详情"
                onClick={() => setRight(false)}
              >
                <PanelRightClose size={16} />
              </button>
            </div>
            {current ? (
              <>
                <div className="inspector-heading">
                  <span className={`type-tag ${current.type}`}>
                    {React.createElement(icons[current.type], { size: 13 })}
                    {labels[current.type]}
                  </span>
                  <h2>{current.name}</h2>
                  <code>{current.id}</code>
                  <p>{current.purpose}</p>
                </div>
                <nav className="detail-tabs" aria-label="节点详情">
                  {activeInstance && (
                    <button
                      className={tab === "execution" ? "active" : ""}
                      onClick={() => setTab("execution")}
                    >
                      运行记录{" "}
                      <span>
                        {occurrences(activeInstance, current.id).length}
                      </span>
                    </button>
                  )}
                  <button
                    className={tab === "contract" ? "active" : ""}
                    onClick={() => setTab("contract")}
                  >
                    <Braces size={14} /> 契约
                  </button>
                  <button
                    className={tab === "prompt" ? "active" : ""}
                    onClick={() => setTab("prompt")}
                  >
                    <FileText size={14} /> Prompt{" "}
                    {hasPromptDetails(current) && (
                      <span>
                        {current.prompts.length +
                          (current.missingPrompts?.length || 0)}
                      </span>
                    )}
                  </button>
                  <button
                    className={tab === "source" ? "active" : ""}
                    onClick={() => setTab("source")}
                  >
                    <Code2 size={14} /> 来源
                  </button>
                </nav>
                <div className="inspector-scroll">
                  {tab === "execution" && activeInstance && (
                    <ExecutionDetails
                      instance={activeInstance}
                      nodeId={current.id}
                    />
                  )}
                  {tab === "contract" && (
                    <>
                      <div className="detail-section">
                        <h3>
                          输入 <span>{current.inputs.length}</span>
                        </h3>
                        {current.inputs.map((p) => (
                          <div className="contract-row" key={p.name}>
                            <div>
                              <strong>{p.name}</strong>
                              <code>{p.schema}</code>
                            </div>
                            {p.from ? (
                              <button
                                className="binding-link"
                                onClick={() => openNode(p.from.node)}
                              >
                                <GitBranch size={12} />
                                {all.get(p.from.node).name}
                                <ChevronRight size={12} />
                                <code>{p.from.output}</code>
                              </button>
                            ) : (
                              <span className="external-input">外部输入</span>
                            )}
                            {p.condition && (
                              <small className="condition-text">
                                {p.condition}
                              </small>
                            )}
                          </div>
                        ))}
                        {!current.inputs.length && (
                          <p className="muted">
                            此定义未声明输入；启动方式见触发说明。
                          </p>
                        )}
                      </div>
                      <div className="detail-section">
                        <h3>输出</h3>
                        {current.outputs.map((p) => (
                          <div className="contract-row" key={p.name}>
                            <div>
                              <strong>{p.name}</strong>
                              <code>{p.schema}</code>
                            </div>
                            {snapshot.nodes
                              .filter((n) =>
                                bound(n).some(
                                  (i) =>
                                    i.from.node === current.id &&
                                    i.from.output === p.name,
                                ),
                              )
                              .map((n) => (
                                <button
                                  className="binding-link"
                                  key={n.id}
                                  onClick={() => openNode(n.id)}
                                >
                                  <ArrowRight size={12} />
                                  {n.name}
                                </button>
                              ))}
                          </div>
                        ))}
                      </div>
                      <div className="detail-section">
                        <h3>触发</h3>
                        <p>{current.trigger}</p>
                      </div>
                      {current.note && (
                        <div className="detail-note">
                          <Info size={14} />
                          <p>{current.note}</p>
                        </div>
                      )}
                      <div className="detail-section">
                        <h3>参与的 Flow</h3>
                        <div className="member-list">
                          {members(current.id).map((f) => (
                            <button
                              key={f.id}
                              onClick={() => {
                                setFlows([f.id]);
                                setFocus(false);
                              }}
                            >
                              <Workflow size={13} />
                              {f.name}
                              <ArrowUpRight size={12} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="scope-disclaimer">
                        输入输出类型是定义中的展示契约；实际调用契约由接入系统提供。
                      </p>
                    </>
                  )}
                  {tab === "prompt" && (
                    <>
                      {hasPromptDetails(current) ? (
                        <>
                          <div className="prompt-notice">
                            <FileText size={14} />
                            <p>
                              Prompt 材料 · 来源可追溯
                              <br />
                              <span>{snapshot.meta.promptScope}</span>
                            </p>
                          </div>
                          {current.missingPrompts?.map((p) => (
                            <div className="missing-prompt" key={p.ref}>
                              <strong>{p.title} · 正文待读取</strong>
                              <p>快照仅记录配置引用；正文尚未读取。</p>
                              <code>{p.ref}</code>
                              <button
                                className="prompt-source"
                                onClick={() => sourceOpen(p.source)}
                              >
                                <Code2 size={12} />
                                <span>查看读取位置</span>
                                <ArrowUpRight size={12} />
                              </button>
                            </div>
                          ))}
                          {current.prompts.map((p, i) => (
                            <section className="prompt-block" key={i}>
                              <div className="prompt-block-heading">
                                <div>
                                  <strong>{p.title}</strong>
                                  <small>
                                    {p.origin} ·{" "}
                                    {p.text.length.toLocaleString()} 字符
                                  </small>
                                </div>
                                <div>
                                  <button
                                    className="icon-button"
                                    aria-label={`复制 ${p.title}`}
                                    onClick={() =>
                                      copy(p.text, `${current.id}-${i}`)
                                    }
                                  >
                                    {copied === `${current.id}-${i}` ? (
                                      <Check size={14} />
                                    ) : (
                                      <Copy size={14} />
                                    )}
                                  </button>
                                  <button
                                    className="icon-button"
                                    aria-label={`展开 ${p.title}`}
                                    onClick={() =>
                                      setModal({
                                        title: p.title,
                                        text: p.text,
                                        prompt: p,
                                      })
                                    }
                                  >
                                    <Maximize2 size={14} />
                                  </button>
                                </div>
                              </div>
                              <pre className="prompt-text">{p.text}</pre>
                              <button
                                className="prompt-source"
                                onClick={() => sourceOpen(p.source)}
                              >
                                <Code2 size={12} />
                                <span>
                                  {p.source.path}:{p.source.line}
                                </span>
                                <ArrowUpRight size={12} />
                              </button>
                              {p.additionalSources?.map((s) => (
                                <button
                                  className="prompt-source"
                                  key={s.path}
                                  onClick={() => sourceOpen(s)}
                                >
                                  <Code2 size={12} />
                                  <span>
                                    组合来源 · {s.path}:{s.line}
                                  </span>
                                  <ArrowUpRight size={12} />
                                </button>
                              ))}
                            </section>
                          ))}
                          {current.note && (
                            <div className="detail-note">
                              <Info size={14} />
                              <p>{current.note}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="empty-detail">
                          <Code2 size={30} />
                          <h3>未声明 Prompt 材料</h3>
                          <p>
                            {current.note ||
                              "输入输出与触发条件见契约，具体处理见实现来源。"}
                          </p>
                          <button
                            className="secondary-button"
                            onClick={() => setTab("source")}
                          >
                            查看实现
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  {tab === "source" && (
                    <>
                      <div className="detail-section">
                        <h3>实现位置</h3>
                        {current.sources.map((s) => (
                          <button
                            className="source-file"
                            onClick={() => sourceOpen(s)}
                            key={s.path}
                          >
                            <Code2 size={17} />
                            <span>
                              {s.path}
                              <small>
                                SHA-256 {s.sha256.slice(0, 12)} · 点击查看全文
                              </small>
                            </span>
                            <ArrowUpRight size={14} />
                          </button>
                        ))}
                      </div>
                      <div className="detail-section">
                        <h3>定义依据</h3>
                        {members(current.id).map((f) => (
                          <div className="flow-source" key={f.id}>
                            <strong>{f.name}</strong>
                            <button
                              className="prompt-source"
                              onClick={() => sourceOpen(f.source)}
                            >
                              <span>{f.source.path}</span>
                              <ArrowUpRight size={12} />
                            </button>
                            {f.note && <p className="muted">{f.note}</p>}
                          </div>
                        ))}
                      </div>
                      <div className="detail-note">
                        <Info size={14} />
                        <p>{snapshot.meta.scope}</p>
                      </div>
                      <div className="detail-section">
                        <h3>基线 commit</h3>
                        <code className="commit-code">
                          {snapshot.meta.baseCommit}
                        </code>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-detail">
                <Boxes size={34} />
                <h3>选择一个节点</h3>
                <p>查看输入输出、触发条件，以及模型节点的完整 Prompt。</p>
                <div className="quick-nodes">
                  {visible.filter(hasPromptDetails).map((n) => (
                    <button key={n.id} onClick={() => chooseNode(n.id)}>
                      <FileText size={14} />
                      {n.name}
                      <ChevronRight size={13} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}
      </main>
      {modal && (
        <Modal title={modal.title} onClose={() => setModal(null)}>
          {modal.about ? (
            <div className="about-content">
              <span className="snapshot-badge">SOURCE-BACKED DEMO</span>
              <h2>让每条流都能被读懂。</h2>
              <p>{snapshot.meta.scope}</p>
              <p>{snapshot.meta.promptScope}</p>
              <div className="about-stats">
                <span>
                  <strong>{snapshot.flows.length}</strong>条流
                </span>
                <span>
                  <strong>{snapshot.nodes.length}</strong>个节点
                </span>
                <span>
                  <strong>
                    {snapshot.nodes.reduce((v, n) => v + n.prompts.length, 0)}
                  </strong>
                  段 Prompt
                </span>
              </div>
              <h3>开源设计参考</h3>
              <a
                href="https://reactflow.dev/examples/layout/elkjs-multiple-handles"
                target="_blank"
                rel="noreferrer"
              >
                React Flow + ELK · 多端口分层布局 <ExternalLink size={14} />
              </a>
              <a
                href="https://docs.langflow.org/concepts-overview"
                target="_blank"
                rel="noreferrer"
              >
                Langflow · 画布与节点配置 <ExternalLink size={14} />
              </a>
              <a
                href="https://github.com/n8n-io/n8n"
                target="_blank"
                rel="noreferrer"
              >
                n8n · 工作流画布交互 <ExternalLink size={14} />
              </a>
              <p className="muted">
                本地界面仅阅读定义；画布拖拽用于调整观看位置。
              </p>
            </div>
          ) : (
            <>
              <div className="modal-subheader">
                <span>
                  {modal.prompt?.origin || "仓库源码"}
                  {modal.source && ` · 定位行 ${modal.source.line}`}
                </span>
                <button
                  className="secondary-button"
                  onClick={() => copy(modal.text, "modal")}
                >
                  {copied === "modal" ? (
                    <Check size={14} />
                  ) : (
                    <Copy size={14} />
                  )}
                  复制全文
                </button>
              </div>
              <pre className="modal-code">
                {modal.source
                  ? modal.text.split("\n").map((line, i) => (
                      <span
                        key={i}
                        className={
                          i + 1 === modal.source.line ? "highlight-line" : ""
                        }
                      >
                        <span className="line-number">{i + 1}</span>
                        {line}
                        {"\n"}
                      </span>
                    ))
                  : modal.text}
              </pre>
            </>
          )}
        </Modal>
      )}
      <div className="sr-only" aria-live="polite">
        {copied ? "已复制全文" : ""}
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")).render(
  <ReactFlowProvider>
    <Studio />
  </ReactFlowProvider>,
);
