# 源码摘录：src/goods_kb/discovery/automatic_search_service.py

原文件：`src/goods_kb/discovery/automatic_search_service.py`
基线 Git：`5ee2972165b156749ef7cc777420e97929094be5`
原文件 SHA-256：`7d4a98310964254a25914aafa3544ea6a263281e3e41587e7f821a32abf02800`
摘录范围：664–723 行。记录的是采集时工作区，可能包含未提交内容；不是线上版本证明。

```text
664: async def sweep_once(
665:     pool,
666:     *,
667:     redis,
668:     now: datetime | None = None,
669:     policy_ref: str | None = None,
670: ) -> dict[str, Any]:
671:     policy = await load_policy(pool, policy_ref=policy_ref)
672:     body = policy["body"]
673:     if body["enabled"] is not True:
674:         return {
675:             "enabled": False,
676:             "policy_ref": policy["artifact_id"],
677:             "gated": False,
678:             "scheduled_categories": 0,
679:             "recovered_categories": 0,
680:             "failure_count": 0,
681:         }
682:     gate_digest = hashlib.sha256(
683:         str(policy["artifact_id"]).encode("utf-8")
684:     ).hexdigest()[:16]
685:     gate_key = f"gkb:auto-search:sweep:{gate_digest}"
686:     gated = not bool(await redis.set(
687:         gate_key,
688:         "1",
689:         nx=True,
690:         ex=body["sweep_interval_s"],
691:     ))
692:     if gated:
693:         return {
694:             "enabled": True,
695:             "policy_ref": policy["artifact_id"],
696:             "gated": True,
697:             "scheduled_categories": 0,
698:             "recovered_categories": 0,
699:             "failure_count": 0,
700:         }
701:
702:     await _validate_refs(pool, body)
703:     profile_set = await load_profile_set(
704:         pool,
705:         profile_set_ref=body["profile_set_ref"],
706:     )
707:     category_entity_ids = [
708:         profile["category_entity_id"]
709:         for profile in profile_set["body"]["profiles"]
710:     ]
711:     now_v = now or datetime.now(timezone.utc)
712:     cycle_key = _cycle_key(
713:         now_v,
714:         refresh_interval_s=body["refresh_interval_s"],
715:     )
716:     (
717:         paid_search_identities,
718:         policy_refs_by_category,
719:     ) = await _equivalent_policy_refs_by_category(
720:         pool,
721:         policy=policy,
722:         profile_set=profile_set,
723:     )
```
