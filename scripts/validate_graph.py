#!/usr/bin/env python3
"""
validate_graph.py — validate the project task DAG.

Checks that graph.json is a sound execution plan before any work starts:
cycles, orphans, missing owners, missing acceptance criteria, unmet dependencies,
and feature-to-task traceability against features.md.

Exit codes:
    0  clean (possibly with warnings)
    1  validation errors
    2  usage error / file not found / unreadable JSON

Stdlib only. Python 3.9+.
"""

import argparse
import json
import os
import re
import sys

RESET = "\033[0m"
BOLD = "\033[1m"
RED = "\033[31m"
YEL = "\033[33m"
GRN = "\033[32m"
CYA = "\033[36m"
DIM = "\033[2m"

VALID_STATUS = ["pending", "ready", "running", "review", "blocked", "done", "dropped"]
DONE_STATUSES = {"done", "dropped"}
ACTIVE_STATUSES = {"running", "review"}
EDGE_TYPES = {"hard", "soft"}
MAX_EFFORT_HOURS = 4

# Agent slugs the roster defines. Unknown owners are a warning, not an error,
# so a project can legitimately add a specialist without editing this script.
KNOWN_OWNERS = {
    "engagement-manager", "product-manager", "business-analyst",
    "principal-architect", "tech-lead",
    "ux-researcher", "ui-ux-designer", "brand-designer",
    "frontend-engineer", "backend-engineer", "database-engineer",
    "sync-engineer", "security-engineer",
    "qa-lead", "test-automation-engineer",
    "devops-release", "technical-writer", "code-reviewer",
}


class Report:
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.infos = []

    def error(self, code, msg):
        self.errors.append((code, msg))

    def warn(self, code, msg):
        self.warnings.append((code, msg))

    def info(self, code, msg):
        self.infos.append((code, msg))

    @property
    def ok(self):
        return not self.errors


def load_json(path):
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


# --------------------------------------------------------------------------
# features.md parsing
# --------------------------------------------------------------------------

def parse_features(path):
    """Return {feature_id: {'title':..., 'status':..., 'line':...}}.

    Handles the heading form the template produces:

        ### F-001 — Title
        - **Status:** proposed

    Falls back to any `F-###` occurrence followed by a status line nearby.
    """
    features = {}
    if not path or not os.path.isfile(path):
        return features
    with open(path, "r", encoding="utf-8") as fh:
        lines = fh.read().splitlines()

    current = None
    for i, raw in enumerate(lines):
        line = raw.rstrip()
        m = re.match(r"^#{2,4}\s*\**\s*(F-\d+)\b[\s—\-:]*\**\s*(.*)$", line)
        if m:
            fid = m.group(1)
            title = re.sub(r"\*\*|__", "", m.group(2)).strip() or "(untitled)"
            current = {"title": title, "status": None, "line": i + 1}
            features[fid] = current
            continue
        if current is not None:
            sm = re.match(r"^\s*[-*]?\s*\*\*Status:\*\*\s*`?([A-Za-z_]+)`?", line)
            if sm:
                current["status"] = sm.group(1).lower()
                current = None if current["status"] else current
    return features


# --------------------------------------------------------------------------
# graph analysis
# --------------------------------------------------------------------------

def build_adjacency(nodes, edges):
    out_edges = {n["id"]: [] for n in nodes}
    in_edges = {n["id"]: [] for n in nodes}
    for e in edges:
        src, dst = e.get("from"), e.get("to")
        if src in out_edges and dst in in_edges:
            out_edges[src].append((dst, e.get("type", "hard")))
            in_edges[dst].append((src, e.get("type", "hard")))
    return out_edges, in_edges


def find_cycles(node_ids, edges):
    """DFS with a recursion stack. Returns a list of cycles (each a list of node ids)."""
    adj = {n: [] for n in node_ids}
    for e in edges:
        if e.get("from") in adj and e.get("to") in adj:
            adj[e["from"]].append(e["to"])

    WHITE, GREY, BLACK = 0, 1, 2
    colour = {n: WHITE for n in node_ids}
    stack = []
    cycles = []

    def dfs(u):
        colour[u] = GREY
        stack.append(u)
        for v in adj[u]:
            if colour[v] == GREY:
                # slice the stack from the first occurrence of v
                try:
                    start = stack.index(v)
                except ValueError:
                    start = 0
                cycles.append(stack[start:] + [v])
            elif colour[v] == WHITE:
                dfs(v)
        stack.pop()
        colour[u] = BLACK

    for n in node_ids:
        if colour[n] == WHITE:
            dfs(n)
    return cycles


def layer_depths(node_ids, edges):
    """Longest-path layering over hard edges. Cycle-safe (bounded iterations)."""
    hard = {n: [] for n in node_ids}
    for e in edges:
        if e.get("type", "hard") == "hard" and e.get("from") in hard and e.get("to") in hard:
            hard[e["from"]].append(e["to"])

    depth = {n: 0 for n in node_ids}
    changed = True
    guard = 0
    while changed and guard < len(node_ids) + 2:
        changed = False
        guard += 1
        for u in node_ids:
            for v in hard[u]:
                if depth[v] < depth[u] + 1:
                    depth[v] = depth[u] + 1
                    changed = True
    return depth, hard


def topo_order(node_ids, edges):
    """Kahn's algorithm over hard edges. Returns (order, remaining_nodes)."""
    indeg = {n: 0 for n in node_ids}
    adj = {n: [] for n in node_ids}
    for e in edges:
        if e.get("type", "hard") == "hard" and e.get("from") in adj and e.get("to") in indeg:
            adj[e["from"]].append(e["to"])
            indeg[e["to"]] += 1
    queue = [n for n in node_ids if indeg[n] == 0]
    order = []
    while queue:
        queue.sort()
        u = queue.pop(0)
        order.append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                queue.append(v)
    remaining = [n for n in node_ids if n not in set(order)]
    return order, remaining


def critical_path(node_ids, node_by_id, edges, order):
    """Longest path by effort_hours over hard edges, using a topological order."""
    hard = {n: [] for n in node_ids}
    for e in edges:
        if e.get("type", "hard") == "hard" and e.get("from") in hard and e.get("to") in hard:
            hard[e["from"]].append(e["to"])

    dist = {n: 0.0 for n in node_ids}
    prev = {n: None for n in node_ids}
    for u in order:
        du = dist[u]
        for v in hard[u]:
            cand = du + float(node_by_id[v].get("effort_hours") or 1)
            if cand > dist[v]:
                dist[v] = cand
                prev[v] = u
    if not dist:
        return [], 0.0
    end = max(dist, key=lambda n: dist[n])
    path = []
    cur = end
    seen = set()
    while cur is not None and cur not in seen:
        seen.add(cur)
        path.append(cur)
        cur = prev[cur]
    path.reverse()
    total = dist[end] + float(node_by_id[end].get("effort_hours") or 1)
    return path, total


def compute_ready(node_by_id, in_edges):
    ready = []
    for nid, node in node_by_id.items():
        if node.get("status") != "pending":
            continue
        deps_ok = True
        for src, etype in in_edges.get(nid, []):
            if etype == "hard" and node_by_id[src].get("status") != "done":
                deps_ok = False
                break
        if deps_ok:
            ready.append(nid)
    return sorted(ready)


# --------------------------------------------------------------------------
# main validation
# --------------------------------------------------------------------------

def validate(project, report, cycles):
    graph_path = os.path.join(project, "graph.json")
    if not os.path.isfile(graph_path):
        report.error("FILE_001", "graph.json not found at %s" % graph_path)
        return None

    try:
        graph = load_json(graph_path)
    except json.JSONDecodeError as exc:
        report.error("JSON_001", "graph.json is not valid JSON: %s" % exc)
        return None

    nodes = graph.get("nodes") or []
    edges = graph.get("edges") or []

    if not nodes:
        report.error("GRAPH_001", "graph.json contains no nodes")
        return None

    node_ids = []
    node_by_id = {}

    # ---- structural checks -------------------------------------------------
    for idx, node in enumerate(nodes):
        nid = node.get("id")
        if not nid:
            report.error("NODE_001", "node at index %d has no 'id'" % idx)
            continue
        if nid in node_by_id:
            report.error("NODE_002", "duplicate node id: %s" % nid)
            continue
        node_ids.append(nid)
        node_by_id[nid] = node

        if not node.get("title"):
            report.error("NODE_003", "%s has no title" % nid)
        if not node.get("owner"):
            report.error("NODE_004", "%s has no owner (every task needs exactly one accountable agent)" % nid)
        elif node["owner"] not in KNOWN_OWNERS:
            report.warn("NODE_005", "%s owner '%s' is not in the standard roster" % (nid, node["owner"]))

        status = node.get("status")
        if not status:
            report.error("NODE_006", "%s has no status" % nid)
        elif status not in VALID_STATUS:
            report.error("NODE_007", "%s has invalid status '%s' (allowed: %s)"
                         % (nid, status, ", ".join(VALID_STATUS)))

        acc = node.get("acceptance") or []
        if not isinstance(acc, list) or len(acc) == 0:
            report.error("NODE_008", "%s has no acceptance criteria (cannot verify completion)" % nid)

        if not node.get("outputs"):
            report.warn("NODE_009", "%s declares no outputs (parallelism safety depends on these)" % nid)
        # A root task legitimately has no inputs; only warn when something feeds into it.
        has_incoming = any(e.get("to") == nid for e in edges)
        if not node.get("inputs") and has_incoming:
            report.warn("NODE_010", "%s declares no inputs but has dependencies" % nid)

        effort = node.get("effort_hours")
        if effort is not None:
            try:
                if float(effort) > MAX_EFFORT_HOURS:
                    report.warn("NODE_011", "%s is %.1fh — split anything above %dh"
                                % (nid, float(effort), MAX_EFFORT_HOURS))
            except (TypeError, ValueError):
                report.warn("NODE_012", "%s has a non-numeric effort_hours" % nid)

        feats = node.get("features")
        if not feats and not node.get("infrastructure"):
            report.error("NODE_013", "%s maps to no feature and is not flagged 'infrastructure' "
                                     "(untraceable work)" % nid)

    # ---- edge checks -------------------------------------------------------
    seen_edges = set()
    for e in edges:
        src, dst = e.get("from"), e.get("to")
        etype = e.get("type", "hard")
        if src not in node_by_id:
            report.error("EDGE_001", "edge references unknown source node: %s" % src)
            continue
        if dst not in node_by_id:
            report.error("EDGE_002", "edge references unknown target node: %s" % dst)
            continue
        if src == dst:
            report.error("EDGE_003", "self-edge on %s" % src)
        if etype not in EDGE_TYPES:
            report.error("EDGE_004", "edge %s→%s has invalid type '%s'" % (src, dst, etype))
        key = (src, dst, etype)
        if key in seen_edges:
            report.warn("EDGE_005", "duplicate edge %s→%s (%s)" % (src, dst, etype))
        seen_edges.add(key)

    # ---- cycles ------------------------------------------------------------
    found = find_cycles(node_ids, edges)
    cycles.extend(found)
    for cyc in found:
        report.error("CYCLE_001", "dependency cycle: %s" % " → ".join(cyc))

    # ---- orphans / unreachable --------------------------------------------
    out_edges, in_edges = build_adjacency(
        [{"id": n} for n in node_ids], edges)
    if len(node_ids) > 1:
        for nid in node_ids:
            if not out_edges[nid] and not in_edges[nid]:
                report.error("ORPHAN_001", "%s is isolated — no dependencies and no dependents "
                                           "(is it part of this project?)" % nid)

    order, remaining = topo_order(node_ids, edges)
    for nid in remaining:
        report.error("ORPHAN_002", "%s is unreachable in the dependency ordering (part of a cycle)"
                     % nid)

    # ---- dependency consistency -------------------------------------------
    for nid in node_ids:
        node = node_by_id[nid]
        status = node.get("status")
        for src, etype in in_edges.get(nid, []):
            if etype != "hard":
                continue
            src_status = node_by_id[src].get("status")
            if status in ACTIVE_STATUSES and src_status != "done":
                report.error("DEP_001", "%s is '%s' but hard dependency %s is '%s'"
                             % (nid, status, src, src_status))
            if status == "done" and src_status not in DONE_STATUSES:
                report.error("DEP_002", "%s is done but hard dependency %s is '%s' "
                                        "(completed out of order)" % (nid, src, src_status))

    # ---- traceability ------------------------------------------------------
    features_path = os.path.join(project, "features.md")
    features = parse_features(features_path)
    if not features:
        report.warn("TRACE_001", "features.md not found or contains no F-### entries — "
                                 "traceability cannot be verified")
    else:
        mapped = {}
        for nid in node_ids:
            for fid in node_by_id[nid].get("features") or []:
                mapped.setdefault(fid, []).append(nid)

        for fid, meta in sorted(features.items()):
            if fid not in mapped and meta.get("status") in ("approved", "done", "verified", "in_progress"):
                report.error("TRACE_002", "%s ('%s') is '%s' but no task implements it"
                             % (fid, meta["title"][:50], meta.get("status")))

        for fid in sorted(mapped):
            if fid not in features:
                report.warn("TRACE_003", "graph references %s but it is not in features.md" % fid)

        # status coherence between features.md and the tasks that implement them
        for fid, tasks in mapped.items():
            if fid not in features:
                continue
            fstatus = features[fid].get("status")
            task_statuses = [node_by_id[t].get("status") for t in tasks]
            if fstatus == "done" and any(s != "done" for s in task_statuses):
                report.error("TRACE_004", "%s is marked done but tasks %s are not all done"
                             % (fid, ", ".join("%s(%s)" % (t, node_by_id[t].get("status")) for t in tasks)))
            if fstatus == "verified" and any(s != "done" for s in task_statuses):
                report.error("TRACE_005", "%s is marked verified but tasks %s are not all done"
                             % (fid, ", ".join("%s(%s)" % (t, node_by_id[t].get("status")) for t in tasks)))
            if fstatus in ("approved", "in_progress") and tasks and all(s == "done" for s in task_statuses):
                report.warn("TRACE_006", "%s tasks are all done but feature status is still '%s' "
                                         "— mark it done/verified" % (fid, fstatus))

    return {
        "graph": graph,
        "nodes": nodes,
        "edges": edges,
        "node_ids": node_ids,
        "node_by_id": node_by_id,
        "out_edges": out_edges,
        "in_edges": in_edges,
        "features": features,
        "order": order,
    }


def print_matrix(model):
    features = model["features"]
    node_by_id = model["node_by_id"]
    mapped = {}
    for nid, node in node_by_id.items():
        for fid in node.get("features") or []:
            mapped.setdefault(fid, []).append(nid)

    print()
    print(BOLD + "TRACEABILITY MATRIX" + RESET)
    print("-" * 78)
    if not features:
        print("  (no features found — create features.md from the template)")
        return 0
    uncovered = 0
    print("%-8s %-11s %-22s %-26s %s" % ("FEATURE", "STATUS", "TASKS", "TITLE", "COVERED"))
    for fid in sorted(features):
        meta = features[fid]
        tasks = sorted(mapped.get(fid, []))
        status = meta.get("status") or "?"
        covered = "yes" if tasks else "no"
        if not tasks and status in ("approved", "in_progress", "done", "verified"):
            covered = RED + "NO  <- BLOCKER" + RESET
            uncovered += 1
        title = meta.get("title", "")
        if len(title) > 24:
            title = title[:23] + "\u2026"
        print("%-8s %-11s %-22s %-26s %s"
              % (fid, status, (", ".join(tasks) or "-")[:22], title, covered))
    print("-" * 78)
    total = len(features)
    verified = sum(1 for f in features.values() if f.get("status") == "verified")
    approved = sum(1 for f in features.values()
                   if f.get("status") in ("approved", "in_progress", "done", "verified"))
    print("features: %d   approved+: %d   verified: %d   uncovered: %d"
          % (total, approved, verified, uncovered))
    return 0


def main():
    ap = argparse.ArgumentParser(
        description="Validate the project task DAG (graph.json) before execution.")
    ap.add_argument("--project", default=".", help="project root containing graph.json (default: .)")
    ap.add_argument("--matrix", action="store_true", help="print the F-xxx → T-xxx traceability matrix")
    ap.add_argument("--strict", action="store_true",
                    help="treat warnings as errors (use at the final gate)")
    ap.add_argument("--quiet", action="store_true", help="only print the verdict")
    ap.add_argument("--no-color", action="store_true", help="disable ANSI colour")
    args = ap.parse_args()

    if args.no_color or not sys.stdout.isatty():
        global RESET, BOLD, RED, YEL, GRN, CYA, DIM
        RESET = BOLD = RED = YEL = GRN = CYA = DIM = ""

    if not os.path.isdir(args.project):
        print("error: project directory not found: %s" % args.project, file=sys.stderr)
        return 2

    report = Report()
    cycles = []
    model = validate(args.project, report, cycles)

    if model is None:
        for code, msg in report.errors:
            print("%s[ERROR]%s %-10s %s" % (RED, RESET, code, msg))
        return 1

    if not args.quiet:
        print(BOLD + "=" * 78 + RESET)
        print(BOLD + "GRAPH VALIDATION — %s" % model["graph"].get("project", args.project) + RESET)
        print(BOLD + "=" * 78 + RESET)
        print("nodes: %d   edges: %d   features: %d"
              % (len(model["node_ids"]), len(model["edges"]), len(model["features"])))
        print()

    for code, msg in report.errors:
        print("%s[ERROR]%s %-10s %s" % (RED, RESET, code, msg))
    for code, msg in report.warnings:
        print("%s[WARN ]%s %-10s %s" % (YEL, RESET, code, msg))
    for code, msg in report.infos:
        print("%s[INFO ]%s %-10s %s" % (CYA, RESET, code, msg))

    if not args.quiet:
        print()
        if cycles:
            # Scheduling output derived from a cyclic graph is fiction. Say so rather than
            # printing numbers an agent might trust.
            print("%sScheduling skipped:%s the graph contains %d cycle(s). Fix the cycles before "
                  "computing waves or the critical path." % (YEL, RESET, len(cycles)))
        else:
            ready = compute_ready(model["node_by_id"], model["in_edges"])
            if ready:
                print("%sready now:%s %s" % (GRN, RESET, ", ".join(ready)))
            else:
                print("%sready now:%s (none — every pending task is blocked on something)"
                      % (YEL, RESET))

            path, total = critical_path(model["node_ids"], model["node_by_id"],
                                        model["edges"], model["order"])
            if path:
                print("%scritical path%s (%.0fh): %s" % (CYA, RESET, total, " → ".join(path)))

            # waves from the topological order: a node's wave is 1 + max(wave of its hard deps)
            wave_of = {}
            for nid in model["order"]:
                deps = [wave_of[src] for src, etype in model["in_edges"].get(nid, [])
                        if etype == "hard" and src in wave_of]
                wave_of[nid] = (max(deps) + 1) if deps else 1
            waves = {}
            for nid, w in wave_of.items():
                if model["node_by_id"][nid].get("status") not in ("done", "dropped"):
                    waves.setdefault(w, []).append(nid)
            if waves:
                print("%sremaining waves:%s" % (CYA, RESET))
                for w in sorted(waves):
                    print("   wave %d: %s" % (w, ", ".join(sorted(waves[w]))))

    if args.matrix:
        print_matrix(model)

    print()
    if report.ok and not (args.strict and report.warnings):
        print("%sRESULT: PASS%s  (%d warnings)" % (GRN, RESET, len(report.warnings)))
        return 0
    if not report.ok:
        print("%sRESULT: FAIL%s  (%d errors, %d warnings)"
              % (RED, RESET, len(report.errors), len(report.warnings)))
        return 1
    print("%sRESULT: FAIL (strict)%s  (%d warnings promoted to errors)"
          % (RED, RESET, len(report.warnings)))
    return 1


if __name__ == "__main__":
    sys.exit(main())
