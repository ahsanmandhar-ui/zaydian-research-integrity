#!/usr/bin/env python3
"""
state_check.py — verify that the project state files agree with each other.

The five state files are the project's memory. If they contradict each other, an agent
resuming after a model switch will act on a lie. This script is the guard against that.

Checks:
  * all required state files exist
  * progress.md has a well-formed CURRENT STATE block
  * the active task in CURRENT STATE agrees with graph.json
  * tasks referenced in the log exist in the graph
  * the plan is actually approved before anything is executed
  * plan.md carries a rendered graph block
  * features.md and graph.json traceability agree
  * decisions.md is present and non-empty
  * git HEAD agrees with the recorded last commit (when in a git repo)

Exit codes: 0 clean · 1 inconsistencies · 2 usage error

Stdlib only. Python 3.9+.
"""

import argparse
import json
import os
import re
import subprocess
import sys

REQUIRED = ["plan.md", "progress.md", "features.md", "decisions.md",
            "skill-registry.md", "graph.json"]

RESET = "\033[0m"
BOLD = "\033[1m"
RED = "\033[31m"
YEL = "\033[33m"
GRN = "\033[32m"
CYA = "\033[36m"
DIM = "\033[2m"

CURRENT_STATE_KEYS = ["Active task", "Active agent", "Last commit", "Next step"]

EXECUTED = {"running", "review", "blocked", "done"}


class Report:
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.notes = []

    def error(self, code, msg):
        self.errors.append((code, msg))

    def warn(self, code, msg):
        self.warnings.append((code, msg))

    def note(self, code, msg):
        self.notes.append((code, msg))

    @property
    def ok(self):
        return not self.errors


def read(path):
    with open(path, "r", encoding="utf-8") as fh:
        return fh.read()


def parse_current_state(text):
    """Extract the CURRENT STATE block as a dict of key -> value (first occurrence)."""
    state = {}
    for key in CURRENT_STATE_KEYS:
        m = re.search(r"^\s*[-*]?\s*\*\*%s:?\*\*\s*(.+)$" % re.escape(key),
                      text, re.M | re.I)
        if m:
            state[key] = m.group(1).strip()
    return state


def parse_features(text):
    features = {}
    current = None
    for i, line in enumerate(text.splitlines()):
        m = re.match(r"^#{2,4}\s*\**\s*(F-\d+)\b[\s—\-:]*\**\s*(.*)$", line)
        if m:
            current = {"title": re.sub(r"\*\*", "", m.group(2)).strip(), "status": None}
            features[m.group(1)] = current
            continue
        if current is not None:
            sm = re.match(r"^\s*[-*]?\s*\*\*Status:\*\*\s*`?([A-Za-z_]+)`?", line)
            if sm:
                current["status"] = sm.group(1).lower()
                current = None
    return features


def git_head(project):
    try:
        out = subprocess.run(["git", "-C", project, "rev-parse", "--short", "HEAD"],
                             capture_output=True, text=True, timeout=10)
        if out.returncode == 0:
            return out.stdout.strip()
    except (OSError, subprocess.SubprocessError):
        pass
    return None


def check(project, report, strict):
    paths = {name: os.path.join(project, name) for name in REQUIRED}
    missing = [n for n, p in paths.items() if not os.path.isfile(p)]
    for name in missing:
        report.error("FILE_001", "%s is missing (create it from the template)" % name)
    if missing:
        return None

    plan_text = read(paths["plan.md"])
    progress_text = read(paths["progress.md"])
    features_text = read(paths["features.md"])
    decisions_text = read(paths["decisions.md"])
    registry_text = read(paths["skill-registry.md"])

    try:
        graph = json.loads(read(paths["graph.json"]))
    except json.JSONDecodeError as exc:
        report.error("JSON_001", "graph.json is not valid JSON: %s" % exc)
        return None

    nodes = {n.get("id"): n for n in graph.get("nodes", []) if n.get("id")}
    features = parse_features(features_text)

    # ---- plan.md -----------------------------------------------------------
    if "<!-- GRAPH:BEGIN -->" not in plan_text and "```mermaid" not in plan_text:
        report.warn("PLAN_001", "plan.md has no rendered task graph — run "
                                "plot_graph.py --embed-plan plan.md")
    if "Changelog" not in plan_text:
        report.warn("PLAN_002", "plan.md has no changelog section")

    approved = bool(re.search(r"\*\*Status:\*\*\s*approved", plan_text, re.I)) or \
        bool(re.search(r"approved by:?\s*(?!pending)[A-Za-z0-9]", plan_text, re.I)) or \
        bool(re.search(r"plan approval|ADR-0\d\d.*plan", decisions_text, re.I))
    pending_approval = bool(re.search(r"PENDING\s*[—-]\s*do not start", plan_text, re.I))

    executed = [nid for nid, n in nodes.items() if n.get("status") in EXECUTED]
    if pending_approval and executed:
        report.error("PLAN_003",
                     "plan.md says approval is PENDING but %d task(s) have already been worked: %s"
                     % (len(executed), ", ".join(sorted(executed)[:6])))
    if not approved and executed:
        report.error("PLAN_004",
                     "no recorded plan approval, yet tasks are in progress or done: %s"
                     % ", ".join(sorted(executed)[:6]))

    # ---- progress.md -------------------------------------------------------
    state = parse_current_state(progress_text)
    for key in CURRENT_STATE_KEYS:
        if key not in state:
            report.error("PROG_001", "progress.md CURRENT STATE is missing '%s'" % key)

    first_state = progress_text.find("CURRENT STATE")
    if first_state == -1:
        report.error("PROG_002", "progress.md has no CURRENT STATE block")
    elif first_state > 3000:
        report.warn("PROG_003", "CURRENT STATE appears late in progress.md (%d chars in) — "
                                "it must be at the top" % first_state)

    active = state.get("Active task", "").strip()
    active_ids = re.findall(r"T-\d+", active)
    if active and active_ids:
        aid = active_ids[0]
        if aid not in nodes:
            report.error("PROG_004", "CURRENT STATE active task %s does not exist in graph.json" % aid)
        else:
            st = nodes[aid].get("status")
            if st not in ("running", "review"):
                report.warn("PROG_005", "CURRENT STATE says active task is %s but its status is '%s'"
                            % (aid, st))
    elif active and active.lower() not in ("none", "-", ""):
        report.warn("PROG_006", "CURRENT STATE active task has no T-### id: '%s'" % active)

    running = sorted(nid for nid, n in nodes.items() if n.get("status") == "running")
    if len(running) > 1:
        report.warn("PROG_007", "%d tasks are 'running' at once (%s) — the wave rule says one "
                                "agent per task" % (len(running), ", ".join(running)))
    if running and not active_ids:
        report.warn("PROG_008", "%s is running but CURRENT STATE names no active task"
                    % ", ".join(running))

    next_step = state.get("Next step", "")
    if next_step and next_step.lower() in ("none", "-", "n/a", "tbd"):
        report.warn("PROG_009", "CURRENT STATE has no concrete next step — a resuming agent "
                                "will not know what to do")

    logged_ids = set(re.findall(r"\bT-\d+\b", progress_text))
    unknown = sorted(i for i in logged_ids if i not in nodes)
    if unknown:
        report.warn("PROG_010", "progress.md references tasks that are not in graph.json: %s"
                    % ", ".join(unknown[:8]))

    # entries should carry a tick or timestamp; a bare log is unresumable
    entries = re.findall(r"^##\s*\[", progress_text, re.M)
    if len(entries) == 0:
        report.warn("PROG_011", "progress.md has no timestamped '## [timestamp]' entries")

    final_commit = state.get("Last commit", "")
    head = git_head(project)
    if head:
        if head not in final_commit:
            report.warn("GIT_001", "git HEAD is %s but CURRENT STATE records '%s'"
                        % (head, final_commit[:60] or "(empty)"))
    else:
        report.note("GIT_002", "not a git repository — commit-per-task discipline cannot be verified")

    # ---- features ↔ graph --------------------------------------------------
    if not features:
        report.warn("FEAT_001", "features.md contains no F-### entries")
    mapped = {}
    for nid, n in nodes.items():
        for fid in n.get("features") or []:
            mapped.setdefault(fid, []).append(nid)

    for fid, meta in sorted(features.items()):
        status = meta.get("status")
        if status in ("approved", "in_progress", "done", "verified") and fid not in mapped:
            report.error("FEAT_002", "%s is '%s' but no task implements it" % (fid, status))
        if status == "verified" and fid in mapped:
            if any(nodes[t].get("status") != "done" for t in mapped[fid]):
                report.error("FEAT_003", "%s is verified but its tasks are not all done" % fid)

    for fid in sorted(mapped):
        if fid not in features:
            report.warn("FEAT_004", "graph references %s which is absent from features.md" % fid)

    no_feature = [nid for nid, n in nodes.items()
                  if not n.get("features") and not n.get("infrastructure")]
    if no_feature:
        report.error("FEAT_005", "%d task(s) map to no feature and are not 'infrastructure': %s"
                     % (len(no_feature), ", ".join(sorted(no_feature)[:8])))

    # ---- decisions.md ------------------------------------------------------
    if "ADR-000" not in decisions_text:
        report.warn("DEC_001", "decisions.md has no ADR-000 (the process decision)")
    adr_count = len(re.findall(r"^##\s*ADR-\d+", decisions_text, re.M))
    if adr_count <= 0:
        report.warn("DEC_002", "decisions.md contains no ADRs")

    # ---- skill-registry.md -------------------------------------------------
    if "Permission Gate log" not in registry_text:
        report.warn("REG_001", "skill-registry.md has no Permission Gate log section")

    # ---- strict (final gate) ----------------------------------------------
    if strict:
        for fid, meta in sorted(features.items()):
            if meta.get("status") != "verified":
                report.error("STRICT_001", "%s is '%s', not 'verified'" % (fid, meta.get("status")))
        for nid, n in sorted(nodes.items()):
            if n.get("status") != "done":
                report.error("STRICT_002", "%s is '%s', not 'done'" % (nid, n.get("status")))

    return {
        "nodes": nodes,
        "features": features,
        "mapped": mapped,
        "state": state,
        "graph": graph,
    }


def print_summary(model):
    nodes = model["nodes"]
    features = model["features"]
    state = model["state"]

    counts = {}
    for n in nodes.values():
        counts[n.get("status", "pending")] = counts.get(n.get("status", "pending"), 0) + 1
    fcounts = {}
    for f in features.values():
        fcounts[f.get("status")] = fcounts.get(f.get("status"), 0) + 1

    ready = []
    indeg = {nid: [] for nid in nodes}
    for e in model["graph"].get("edges", []):
        if e.get("type", "hard") == "hard" and e.get("to") in indeg:
            indeg[e["to"]].append(e.get("from"))
    for nid, n in nodes.items():
        if n.get("status") == "pending" and all(nodes.get(d, {}).get("status") == "done"
                                                for d in indeg[nid] if d in nodes):
            ready.append(nid)

    print()
    print(BOLD + "STATE SUMMARY" + RESET)
    print("-" * 66)
    print("1. Project   : %s  (%d tasks, %d features)"
          % (model["graph"].get("project", "?"), len(nodes), len(features)))
    print("2. Tasks     : %s" % (", ".join("%s=%d" % (k, v) for k, v in sorted(counts.items())) or "none"))
    print("3. Features  : %s" % (", ".join("%s=%d" % (k or "?", v) for k, v in sorted(fcounts.items(),
                                                                  key=lambda x: str(x[0]))) or "none"))
    print("4. Active    : %s (%s)" % (state.get("Active task", "none"), state.get("Active agent", "-")))
    print("5. Next step : %s" % state.get("Next step", "(not recorded)"))
    print("-" * 66)
    if ready:
        print("%sready now:%s %s" % (GRN, RESET, ", ".join(sorted(ready))))
    blocked = sorted(n for n, v in nodes.items() if v.get("status") == "blocked")
    if blocked:
        print("%sblocked:%s %s" % (RED, RESET, ", ".join(blocked)))


def main():
    ap = argparse.ArgumentParser(description="Check consistency of the project state files.")
    ap.add_argument("--project", default=".", help="project root (default: .)")
    ap.add_argument("--summary", action="store_true", help="print the 5-line resume summary")
    ap.add_argument("--strict", action="store_true",
                    help="final-gate mode: every feature verified and every task done")
    ap.add_argument("--quiet", action="store_true")
    ap.add_argument("--no-color", action="store_true")
    args = ap.parse_args()

    if args.no_color or not sys.stdout.isatty():
        global RESET, BOLD, RED, YEL, GRN, CYA, DIM
        RESET = BOLD = RED = YEL = GRN = CYA = DIM = ""

    if not os.path.isdir(args.project):
        print("error: project directory not found: %s" % args.project, file=sys.stderr)
        return 2

    report = Report()
    model = check(args.project, report, args.strict)

    if not args.quiet:
        print(BOLD + "=" * 66 + RESET)
        print(BOLD + "STATE CHECK — %s" % os.path.abspath(args.project) + RESET)
        print(BOLD + "=" * 66 + RESET)

    for code, msg in report.errors:
        print("%s[ERROR]%s %-9s %s" % (RED, RESET, code, msg))
    for code, msg in report.warnings:
        print("%s[WARN ]%s %-9s %s" % (YEL, RESET, code, msg))
    for code, msg in report.notes:
        print("%s[NOTE ]%s %-9s %s" % (CYA, RESET, code, msg))

    if model and args.summary:
        print_summary(model)

    if not args.quiet:
        print()
    if report.ok:
        print("%sRESULT: PASS%s  (%d warnings)" % (GRN, RESET, len(report.warnings)))
        return 0
    print("%sRESULT: FAIL%s  (%d errors, %d warnings)"
          % (RED, RESET, len(report.errors), len(report.warnings)))
    return 1


if __name__ == "__main__":
    sys.exit(main())
