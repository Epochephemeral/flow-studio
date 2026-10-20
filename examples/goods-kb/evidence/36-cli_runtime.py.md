# 源码摘录：src/goods_kb/cli_runtime.py

原文件：`src/goods_kb/cli_runtime.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`4a4df9e781314f22eca4fe4e6c12f4ece2b268416a8367cef19e906ae652ccf1`
摘录范围：5041–5100 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
5041:     async def show_job(self, args) -> dict:
5042:         from goods_kb.ops import audit_event_repo, repo as ops_repo
5043:
5044:         pool = await self._pool()
5045:         run = await ops_repo.get_run(pool, run_id=args.job_id)
5046:         if run is None:
5047:             raise ValueError(f"不存在 job: {args.job_id}")
5048:         events = await collect_all_pages(
5049:             lambda *, limit, offset: audit_event_repo.list_for_run(
5050:                 pool,run_id=args.job_id,limit=limit,offset=offset,
5051:             )
5052:         )
5053:         output_refs = await _output_refs_from_job(
5054:             pool, run_id=args.job_id, include_derived=True,
5055:         )
5056:         job = _job_from_ops_run(run)
5057:         artifacts = await _artifacts_by_output_refs(pool, output_refs)
5058:         payload = {
5059:             "object_type": "job",
5060:             "schema_version": SCHEMA_VERSION,
5061:             "backend": self.backend,
5062:             **job,
5063:             "include": args.include,
5064:         }
5065:         if "artifacts" in args.include:
5066:             payload["artifacts"] = artifacts
5067:         if "lineage" in args.include:
5068:             payload["lineage"] = {
5069:                 **job["lineage"],
5070:                 "output_refs": output_refs,
5071:             }
5072:         if "events" in args.include:
5073:             payload["events"] = [_event_artifact(event) for event in events]
5074:         return _select_fields(payload, args.fields)
5075:
5076:     async def list_artifacts(self, args) -> dict:
5077:         where = args.where or {}
5078:         if "q" in where:
5079:             raise ValueError(
5080:                 "artifact list 不支持 where.q；内容全文检索请使用 "
5081:                 "gkb knowledge search，精确 raw observation 请使用 artifact show <artifact_id>"
5082:             )
5083:         cursor = getattr(args, "cursor", None)
5084:         if cursor is not None and args.kind not in DERIVED_ARTIFACT_KINDS:
5085:             raise ValueError(
5086:                 "artifact list --cursor only applies to derived artifact kinds"
5087:             )
5088:         if args.kind in DERIVED_ARTIFACT_KINDS and where.get("schema_key") is not None:
5089:             raise ValueError(
5090:                 "derived artifact list does not support schema_key filtering; "
5091:                 "select an artifact_type and inspect schema_key in the result"
5092:             )
5093:         pool = await self._pool()
5094:         if args.job_id and args.kind in (None, "", "artifact", "all"):
5095:             output_refs = await _output_refs_from_job(pool, run_id=args.job_id, include_derived=True)
5096:             selected_refs = _slice_refs(output_refs, limit=args.limit, offset=args.offset)
5097:             items = await _artifacts_by_output_refs(pool, selected_refs)
5098:             limit_v, offset_v = _ref_limit_offset(limit=args.limit, offset=args.offset)
5099:             result = {"limit": limit_v, "offset": offset_v, "total": len(output_refs)}
5100:             source_layer = "mixed"
```
