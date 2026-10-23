#!/usr/bin/env python3
"""
plot_graph.py — render graph.json as Mermaid and as a standalone SVG.

Produces two artefacts that both work with no network and no external tooling:

    .graph/graph.mmd   Mermaid flowchart (embeddable in plan.md / GitHub / VS Code)
    .graph/graph.svg   Self-contained SVG, laid out by this script (no Graphviz, no mmdc)

Nodes are coloured by status, laid out in dependency layers, and the critical path is
drawn with a heavier stroke so schedule risk is visible at a glance.

Optional upgrade: if the Mermaid CLI (mmdc) is on PATH, --use-mmdc delegates SVG export to it.
The script never requires it — a plotting step that fails on a fresh machine teaches the
agent to skip plotting, which is worse than not having it.

Exit codes: 0 ok · 1 render problem · 2 usage / file missing

Stdlib only. Python 3.9+.
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys

STATUS_COLORS = {
    "pending": ("#F1F3F4", "#9AA0A6", "#3C4043"),
    "ready":   ("#E8F0FE", "#4285F4", "#174EA6"),
    "running": ("#FEF7E0", "#F9AB00", "#7A4F01"),
    "review":  ("#F3E8FD", "#A142F4", "#5B1A9E"),
    "blocked": ("#FCE8E6", "#EA4335", "#A50E0E"),
    "done":    ("#E6F4EA", "#34A853", "#0D652D"),
    "dropped": ("#F8F9FA", "#BDC1C6", "#80868B"),
}

NODE_W = 208
NODE_H = 84
GAP_X = 112
GAP_Y = 34
PAD = 44
CRITICAL_COLOR = "#1A73E8"


# --------------------------------------------------------------------------
# loading + layout
# --------------------------------------------------------------------------

def load_graph(project):
    path = os.path.join(project, "graph.json")
    if not os.path.isfile(path):
        raise FileNotFoundError("graph.json not found at %s" % path)
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def layer_nodes(nodes, edges):
    """Longest-path layering over hard edges. Cycle-safe."""
    ids = [n["id"] for n in nodes]
    idx = {nid: i for i, nid in enumerate(ids)}
    depth = {nid: 0 for nid in ids}
    guard = 0
    changed = True
    while changed and guard <= len(ids) + 2:
        changed = False
        guard += 1
        for e in edges:
            if e.get("type", "hard") != "hard":
                continue
            u, v = e.get("from"), e.get("to")
            if u in depth and v in depth:
                if depth[v] < depth[u] + 1:
                    depth[v] = depth[u] + 1
                    changed = True
    layers = {}
    for nid in sorted(ids, key=lambda x: (depth[x], idx[x])):
        layers.setdefault(depth[nid], []).append(nid)
    return layers, depth


def critical_set(nodes, edges):
    """Node ids on the longest-by-effort path over hard edges."""
    by_id = {n["id"]: n for n in nodes}
    ids = list(by_id)
    hard = {i: [] for i in ids}
    indeg = {i: 0 for i in ids}
    for e in edges:
        if e.get("type", "hard") != "hard":
            continue
        u, v = e.get("from"), e.get("to")
        if u in hard and v in indeg:
            hard[u].append(v)
            indeg[v] += 1
    queue = sorted([i for i in ids if indeg[i] == 0])
    order = []
    while queue:
        u = queue.pop(0)
        order.append(u)
        for v in hard[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                queue.append(v)
    order += [i for i in ids if i not in set(order)]  # tolerate cycles

    dist = {i: 0.0 for i in ids}
    prev = {i: None for i in ids}
    for u in order:
        for v in hard[u]:
            cand = dist[u] + float(by_id[v].get("effort_hours") or 1)
            if cand > dist[v]:
                dist[v] = cand
                prev[v] = u
    if not dist:
        return set(), []
    end = max(dist, key=lambda n: dist[n])
    path, cur, seen = [], end, set()
    while cur is not None and cur not in seen:
        seen.add(cur)
        path.append(cur)
        cur = prev[cur]
    path.reverse()
    return set(path), path


# --------------------------------------------------------------------------
# mermaid
# --------------------------------------------------------------------------

def mermaid_id(nid):
    safe = re.sub(r"[^A-Za-z0-9_]", "_", nid)
    if safe and safe[0].isdigit():
        safe = "n_" + safe
    return safe


def esc_mmd(text):
    return (str(text).replace('"', "&quot;").replace("<", "&lt;")
            .replace(">", "&gt;").replace("|", "&#124;"))


def render_mermaid(graph):
    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])
    crit, _ = critical_set(nodes, edges)

    out = []
    out.append("%% rendered by plot_graph.py — do not hand-edit")
    out.append("flowchart LR")
    for status, (fill, stroke, text) in STATUS_COLORS.items():
        out.append('    classDef %s fill:%s,stroke:%s,color:%s,stroke-width:1.5px'
                   % (status, fill, stroke, text))
    out.append('    classDef critical stroke:%s,stroke-width:3px' % CRITICAL_COLOR)
    out.append("")

    for n in nodes:
        nid = mermaid_id(n["id"])
        title = esc_mmd(n.get("title", ""))
        owner = esc_mmd(n.get("owner", "?"))
        label = '%s<br/><span style="font-size:11px">%s</span>' % (title, owner)
        status = n.get("status", "pending")
        classes = status + (",critical" if n["id"] in crit else "")
        out.append('    %s["<b>%s</b><br/>%s"]:::%s' % (nid, esc_mmd(n["id"]), label, classes))

    out.append("")
    crit_links = []
    for i, e in enumerate(edges):
        u, v = mermaid_id(e.get("from")), mermaid_id(e.get("to"))
        etype = e.get("type", "hard")
        arrow = "==>" if etype == "hard" else "-.->"
        out.append("    %s %s %s" % (u, arrow, v))
        if e.get("from") in crit and e.get("to") in crit:
            crit_links.append(i)

    if crit_links:
        out.append("")
        for i in crit_links:
            out.append("    linkStyle %d stroke:%s,stroke-width:3px" % (i, CRITICAL_COLOR))

    return "\n".join(out) + "\n"


# --------------------------------------------------------------------------
# svg
# --------------------------------------------------------------------------

def esc_svg(text):
    return (str(text).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def wrap(text, width):
    words, lines, cur = str(text).split(), [], ""
    for w in words:
        if not cur:
            cur = w
        elif len(cur) + 1 + len(w) <= width:
            cur += " " + w
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def render_svg(graph):
    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])
    if not nodes:
        return '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="80">' \
               '<text x="16" y="40" font-family="sans-serif">empty graph</text></svg>\n'

    by_id = {n["id"]: n for n in nodes}
    layers, depth = layer_nodes(nodes, edges)
    crit, crit_path = critical_set(nodes, edges)

    pos = {}
    max_rows = 0
    for d, members in layers.items():
        max_rows = max(max_rows, len(members))
        for i, nid in enumerate(members):
            pos[nid] = (PAD + d * (NODE_W + GAP_X), PAD + i * (NODE_H + GAP_Y))

    n_layers = max(layers) + 1 if layers else 1
    width = PAD * 2 + n_layers * NODE_W + max(0, n_layers - 1) * GAP_X
    height = PAD * 2 + max_rows * NODE_H + max(0, max_rows - 1) * GAP_Y

    parts = []
    parts.append('<?xml version="1.0" encoding="UTF-8"?>')
    parts.append('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" '
                 'viewBox="0 0 %d %d" font-family="ui-sans-serif, system-ui, -apple-system, '
                 'Segoe UI, Roboto, sans-serif">' % (width, height, width, height))
    parts.append('<defs>')
    for marker, color in (("arrow", "#5F6368"), ("arrowc", CRITICAL_COLOR)):
        parts.append(
            '<marker id="%s" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" '
            'markerHeight="6" orient="auto-start-reverse">'
            '<path d="M 0 0 L 10 5 L 0 10 z" fill="%s"/></marker>' % (marker, color))
    parts.append('</defs>')
    parts.append('<rect width="100%%" height="100%%" fill="#FFFFFF"/>')

    # edges first so nodes paint over them
    for e in edges:
        u, v = e.get("from"), e.get("to")
        if u not in pos or v not in pos:
            continue
        x1, y1 = pos[u]
        x2, y2 = pos[v]
        on_crit = u in crit and v in crit
        stroke = CRITICAL_COLOR if on_crit else "#5F6368"
        sw = "2.6" if on_crit else "1.4"
        dash = "" if e.get("type", "hard") == "hard" else ' stroke-dasharray="5 4"'
        marker = "arrowc" if on_crit else "arrow"

        if depth.get(v, 0) > depth.get(u, 0):
            sx, sy = x1 + NODE_W, y1 + NODE_H / 2
            tx, ty = x2, y2 + NODE_H / 2
            midx = (sx + tx) / 2
            d = "M %d %d C %d %d, %d %d, %d %d" % (sx, sy, midx, sy, midx, ty, tx, ty)
        else:
            sx, sy = x1 + NODE_W / 2, y1 + NODE_H
            tx, ty = x2 + NODE_W / 2, y2
            if ty <= sy:
                sy, ty = y1, y2 + NODE_H
                d = "M %d %d C %d %d, %d %d, %d %d" % (
                    sx, sy, sx + 60, sy - 40, tx + 60, ty + 40, tx, ty)
            else:
                d = "M %d %d C %d %d, %d %d, %d %d" % (
                    sx, sy, sx + 60, sy + 46, tx + 60, ty - 46, tx, ty)
        parts.append('<path d="%s" fill="none" stroke="%s" stroke-width="%s"%s '
                     'marker-end="url(#%s)"/>' % (d, stroke, sw, dash, marker))

    # nodes
    for n in nodes:
        nid = n["id"]
        if nid not in pos:
            continue
        x, y = pos[nid]
        status = n.get("status", "pending")
        fill, stroke, text_color = STATUS_COLORS.get(status, STATUS_COLORS["pending"])
        on_crit = nid in crit
        sw = "3" if on_crit else "1.5"
        opacity = ' opacity="0.55"' if status == "dropped" else ""

        parts.append('<g%s>' % opacity)
        parts.append('<rect x="%d" y="%d" rx="10" ry="10" width="%d" height="%d" '
                     'fill="%s" stroke="%s" stroke-width="%s"/>'
                     % (x, y, NODE_W, NODE_H, fill, (CRITICAL_COLOR if on_crit else stroke), sw))

        # id badge
        parts.append('<text x="%d" y="%d" font-size="10" font-weight="700" fill="%s" '
                     'font-family="ui-monospace, SFMono-Regular, Menlo, monospace">%s</text>'
                     % (x + 10, y + 16, stroke, esc_svg(nid)))

        # status pill
        parts.append('<rect x="%d" y="%d" rx="6" ry="6" width="%d" height="14" fill="%s"/>'
                     % (x + NODE_W - 8 - (len(status) * 5.6 + 12), y + 6,
                        int(len(status) * 5.6 + 12), stroke))
        parts.append('<text x="%d" y="%d" font-size="9" font-weight="700" fill="#FFFFFF" '
                     'text-anchor="end">%s</text>'
                     % (x + NODE_W - 14, y + 16, esc_svg(status.upper())))

        # title — up to three lines, with an explicit ellipsis when truncated so a
        # clipped title never silently loses meaning
        all_lines = wrap(n.get("title", ""), 26)
        title_lines = all_lines[:3]
        if len(all_lines) > 3:
            title_lines[2] = title_lines[2][:24].rstrip() + "\u2026"
        for i, line in enumerate(title_lines):
            parts.append('<text x="%d" y="%d" font-size="12" font-weight="600" fill="%s">%s</text>'
                         % (x + 10, y + 34 + i * 14, text_color, esc_svg(line)))

        # owner
        parts.append('<text x="%d" y="%d" font-size="10" fill="%s" opacity="0.85">%s</text>'
                     % (x + 10, y + NODE_H - 9, text_color, esc_svg(n.get("owner", "?"))))

        if status == "dropped":
            parts.append('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="1.5"/>'
                         % (x + 8, y + NODE_H / 2, x + NODE_W - 8, y + NODE_H / 2, stroke))
        parts.append('</g>')

    # title
    project = graph.get("project", "project")
    parts.append('<text x="%d" y="24" font-size="13" font-weight="700" fill="#202124">%s</text>'
                 % (PAD, esc_svg(project)))
    legend = " · ".join("%s %s" % (s, sum(1 for n in nodes if n.get("status") == s))
                        for s in STATUS_COLORS
                        if sum(1 for n in nodes if n.get("status") == s))
    parts.append('<text x="%d" y="%d" font-size="10" fill="#5F6368">%s · critical path: %d nodes</text>'
                 % (width - PAD, 24, esc_svg(legend), len(crit_path)))

    parts.append('</svg>')
    return "\n".join(parts) + "\n"


# --------------------------------------------------------------------------
# plan.md embedding
# --------------------------------------------------------------------------

BEGIN = "<!-- GRAPH:BEGIN -->"
END = "<!-- GRAPH:END -->"


def embed_in_plan(plan_path, mermaid_text, graph):
    if not os.path.isfile(plan_path):
        return False, "plan.md not found at %s" % plan_path

    with open(plan_path, "r", encoding="utf-8") as fh:
        content = fh.read()

    nodes = graph.get("nodes", [])
    counts = {}
    for n in nodes:
        counts[n.get("status", "pending")] = counts.get(n.get("status", "pending"), 0) + 1
    summary = " · ".join("%s: %d" % (k, v) for k, v in sorted(counts.items()))

    block = (
        "%s\n"
        "<!-- generated by plot_graph.py on render — do not hand-edit this block -->\n"
        "**%d tasks** — %s\n\n"
        "```mermaid\n%s```\n"
        "%s"
    ) % (BEGIN, len(nodes), summary, mermaid_text, END)

    if BEGIN in content and END in content:
        pattern = re.compile(re.escape(BEGIN) + r".*?" + re.escape(END), re.S)
        new_content = pattern.sub(lambda _m: block, content)
        mode = "replaced existing block"
    else:
        new_content = content.rstrip() + "\n\n## Live task graph\n\n" + block + "\n"
        mode = "appended new block"

    with open(plan_path, "w", encoding="utf-8") as fh:
        fh.write(new_content)
    return True, mode


# --------------------------------------------------------------------------
# main
# --------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="Render graph.json to Mermaid and SVG.")
    ap.add_argument("--project", default=".", help="project root containing graph.json")
    ap.add_argument("--out-dir", default=".graph", help="output directory (default: .graph)")
    ap.add_argument("--embed-plan", metavar="PLAN_MD", default=None,
                    help="embed the Mermaid graph into this markdown file between GRAPH markers")
    ap.add_argument("--format", choices=["mmd", "svg", "both"], default="both")
    ap.add_argument("--use-mmdc", action="store_true",
                    help="delegate SVG rendering to the Mermaid CLI if it is installed")
    ap.add_argument("--quiet", action="store_true")
    # accepted for consistency with the other two scripts so a single pipeline flag works
    ap.add_argument("--no-color", action="store_true", help="accepted for parity; no effect")
    args = ap.parse_args()

    try:
        graph = load_graph(args.project)
    except FileNotFoundError as exc:
        print("error: %s" % exc, file=sys.stderr)
        return 2
    except json.JSONDecodeError as exc:
        print("error: graph.json is not valid JSON: %s" % exc, file=sys.stderr)
        return 2

    out_dir = args.out_dir
    if not os.path.isabs(out_dir):
        out_dir = os.path.join(args.project, out_dir)
    os.makedirs(out_dir, exist_ok=True)

    written = []
    mermaid_text = render_mermaid(graph)

    if args.format in ("mmd", "both"):
        mmd_path = os.path.join(out_dir, "graph.mmd")
        with open(mmd_path, "w", encoding="utf-8") as fh:
            fh.write(mermaid_text)
        written.append(mmd_path)

    if args.format in ("svg", "both"):
        svg_path = os.path.join(out_dir, "graph.svg")
        used_mmdc = False
        if args.use_mmdc and shutil.which("mmdc"):
            tmp = os.path.join(out_dir, "graph.mmd")
            with open(tmp, "w", encoding="utf-8") as fh:
                fh.write(mermaid_text)
            try:
                subprocess.run(["mmdc", "-i", tmp, "-o", svg_path, "-b", "transparent"],
                               check=True, capture_output=True, timeout=120)
                used_mmdc = True
            except (subprocess.SubprocessError, OSError):
                used_mmdc = False
        if not used_mmdc:
            with open(svg_path, "w", encoding="utf-8") as fh:
                fh.write(render_svg(graph))
        written.append(svg_path + ("" if used_mmdc else " (built-in layout)"))

    if args.embed_plan:
        ok, msg = embed_in_plan(args.embed_plan, mermaid_text, graph)
        if not ok:
            print("warning: %s" % msg, file=sys.stderr)
        elif not args.quiet:
            print("plan:    %s (%s)" % (args.embed_plan, msg))

    if not args.quiet:
        for w in written:
            print("written: %s" % w)
        nodes = graph.get("nodes", [])
        counts = {}
        for n in nodes:
            counts[n.get("status", "pending")] = counts.get(n.get("status", "pending"), 0) + 1
        print("nodes:   %d  (%s)" % (
            len(nodes), ", ".join("%s=%d" % (k, v) for k, v in sorted(counts.items()))))
    return 0


if __name__ == "__main__":
    sys.exit(main())
