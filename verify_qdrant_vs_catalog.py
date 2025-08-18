#!/usr/bin/env python3
"""
Verify consistency between catalog.json and Qdrant collection by comparing IDs.

What it checks:
- IDs in catalog but not in Qdrant (by id_tag)
- IDs in Qdrant but not in catalog
- Duplicate name+company clusters in Qdrant (possible duplicates under different ids)
- Name+company conflicts: same name+company across datasets but different ids

Usage:
    python verify_qdrant_vs_catalog.py

Environment (optional):
    QDRANT_URL=http://localhost:6333
    QDRANT_COLLECTION=active_tools
"""

from __future__ import annotations

import os
import json
from pathlib import Path
from typing import Dict, List, Set, Tuple

try:
    from qdrant_client import QdrantClient
except Exception as exc:
    raise SystemExit("qdrant-client is required. Install with: pip install qdrant-client") from exc


CATALOG_PATH = Path("public/data/catalog.json")
QDRANT_URL = os.environ.get("QDRANT_URL", "http://localhost:6333")
QDRANT_COLLECTION = os.environ.get("QDRANT_COLLECTION", "active_tools")


def load_catalog_entries(catalog_path: Path) -> Tuple[Dict[str, dict], Dict[str, str]]:
    if not catalog_path.exists():
        raise FileNotFoundError(f"Catalog file not found: {catalog_path}")

    with catalog_path.open("r", encoding="utf-8") as fp:
        data = json.load(fp)

    id_to_entry: Dict[str, dict] = {}
    name_company_to_id: Dict[str, str] = {}

    for entry in data:
        entry_id = str(entry.get("id", "")).strip().lower()
        if not entry_id:
            # Skip entries without IDs
            continue
        id_to_entry[entry_id] = entry

        name = str(entry.get("name", "")).strip().lower()
        company = str(entry.get("company", "")).strip().lower()
        if name and company:
            name_company_to_id[f"{name}|{company}"] = entry_id

    return id_to_entry, name_company_to_id


def fetch_all_qdrant_payloads(client: QdrantClient, collection_name: str) -> List[dict]:
    all_payloads: List[dict] = []
    next_offset = None
    while True:
        points, next_offset = client.scroll(
            collection_name=collection_name,
            limit=256,
            with_payload=True,
            with_vectors=False,
            offset=next_offset,
        )
        for p in points:
            all_payloads.append(p.payload or {})
        if not next_offset:
            break
    return all_payloads


def normalize_db_fields(payload: dict) -> Tuple[str, str, str]:
    tool_id = str(payload.get("id_tag", "")).strip().lower()
    name = str(payload.get("product_feature_name", "")).strip()
    company = str(payload.get("company", "")).strip()
    return tool_id, name, company


def main() -> None:
    print(f"Catalog: {CATALOG_PATH}")
    print(f"Qdrant:  {QDRANT_URL} (collection={QDRANT_COLLECTION})")

    id_to_entry, name_company_to_id = load_catalog_entries(CATALOG_PATH)
    catalog_ids: Set[str] = set(id_to_entry.keys())
    print(f"Loaded {len(catalog_ids)} catalog IDs")

    # Connect Qdrant and fetch payloads
    client = QdrantClient(url=QDRANT_URL)
    payloads = fetch_all_qdrant_payloads(client, QDRANT_COLLECTION)
    print(f"Fetched {len(payloads)} records from Qdrant")

    qdrant_ids: Set[str] = set()
    name_company_clusters: Dict[str, List[str]] = {}

    for payload in payloads:
        tool_id, name, company = normalize_db_fields(payload)
        if tool_id:
            qdrant_ids.add(tool_id)

        if name and company:
            key = f"{name.strip().lower()}|{company.strip().lower()}"
            name_company_clusters.setdefault(key, []).append(tool_id or "")

    # Basic set comparisons
    only_in_catalog = sorted(catalog_ids - qdrant_ids)
    only_in_qdrant = sorted(qdrant_ids - catalog_ids)

    print()
    print("=== ID Set Comparison ===")
    print(f"IDs only in catalog: {len(only_in_catalog)}")
    if only_in_catalog:
        print("  Examples:")
        for ex in only_in_catalog[:20]:
            entry = id_to_entry.get(ex, {})
            print(f"   - {ex} | name='{entry.get('name','')}' company='{entry.get('company','')}'")

    print(f"IDs only in Qdrant: {len(only_in_qdrant)}")
    if only_in_qdrant:
        print("  Examples:")
        for ex in only_in_qdrant[:20]:
            # Try to show name/company for context
            pl = next((p for p in payloads if str(p.get('id_tag','')).strip().lower() == ex), {})
            print(
                "   - {} | name='{}' company='{}'".format(
                    ex,
                    pl.get('product_feature_name', ''),
                    pl.get('company', ''),
                )
            )

    # Duplicate name+company clusters in Qdrant
    dup_clusters = {k: v for k, v in name_company_clusters.items() if len(set([x for x in v if x])) > 1}
    print()
    print("=== Duplicate name+company clusters in Qdrant ===")
    print(f"Clusters with >1 distinct id_tag: {len(dup_clusters)}")
    if dup_clusters:
        shown = 0
        for key, ids in dup_clusters.items():
            if shown >= 20:
                break
            name, company = key.split("|", 1)
            distinct_ids = sorted(set([i for i in ids if i]))
            print(f" - name='{name}' company='{company}' ids={distinct_ids}")
            shown += 1

    # Cross-dataset name+company conflicts: same name+company appears, but catalog id != any qdrant id
    print()
    print("=== Name+company conflicts between catalog and Qdrant ===")
    conflicts = []
    for key, catalog_id in name_company_to_id.items():
        q_ids = set([i for i in name_company_clusters.get(key, []) if i])
        if q_ids and (catalog_id not in q_ids):
            conflicts.append((key, catalog_id, sorted(q_ids)))

    print(f"Conflicts found: {len(conflicts)}")
    for key, catalog_id, q_ids in conflicts[:20]:
        name, company = key.split("|", 1)
        print(f" - name='{name}' company='{company}' catalog_id='{catalog_id}' qdrant_ids={q_ids}")

    print()
    print("Done.")


if __name__ == "__main__":
    main()

