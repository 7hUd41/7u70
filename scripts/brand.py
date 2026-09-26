# Runfold brand assets. Run from the repository root: python3 scripts/brand.py
# (needs fonttools + brotli for the wordmark).
#
# The mark is the tripod of life: three discs of the same radius, each one
# passing through the centres of the other two. Their common core is a
# Reuleaux triangle whose corners are the three centres — turned to point
# right, it is a play button. Run sits at the heart; the three reading
# levels (Quick, Guided, Deep) are the discs around it, deeper to the right,
# where the play points. Nothing is placed by eye: every edge comes from the
# one compass opening.
import math
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

def f(x): return f"{x:.3f}".rstrip("0").rstrip(".")
def mix(a, b, t=0.5):
    ha = [int(a[i:i + 2], 16) for i in (1, 3, 5)]; hb = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{round(x * (1 - t) + y * t):02x}" for x, y in zip(ha, hb))

# Palettes: discs = (right/Deep, bottom-left/Guided, top-left/Quick), then the
# pairwise overlaps (right∩bottom, bottom∩top, top∩right), then the core.
def palette(deep, guided, quick, core, darken=0.18):
    blk = "#000000"
    return dict(disc=[deep, guided, quick,
                      mix(mix(deep, guided), blk, darken), mix(mix(guided, quick), blk, darken), mix(mix(quick, deep), blk, darken)],
                core=core)
# "Luminous sheets": the discs are stacked sheets (Quick in front, Deep at the
# back); where they overlap, the front sheet is lit from behind, so overlaps
# are lighter than the discs and the core — the play — is the brightest.
W = "#ffffff"
def luminous(deep, guided, quick, accent, core):
    return dict(disc=[deep, guided, quick, mix(guided, W, 0.16), mix(quick, W, 0.2), mix(quick, accent, 0.45)], core=core)
LIGHT = luminous("#1f1b3d", "#6d2f7e", "#c41f78", "#ff5caa", "#ffe4f1")
DARK = luminous("#7d6bd6", "#a86bd0", "#ff5caa", "#ffb3d6", "#ffffff")
MONO = dict(disc=["#1f1b3d"] * 6, core="#ffffff")

def geometry(size=100.0, pad=4.0):
    rho = 1 / math.sqrt(3)
    V = [(rho * math.cos(math.radians(a)), rho * math.sin(math.radians(a))) for a in (0, 120, 240)]
    x0 = min(x for x, _ in V) - 1; x1 = max(x for x, _ in V) + 1
    k = (size - 2 * pad) / max(x1 - x0, 3.0)
    ox = size / 2 - (x0 + x1) / 2 * k; oy = size / 2
    return [(ox + x * k, oy + y * k) for x, y in V], k

def mark(pal, uid, size=100.0, pad=4.0, css=False, air=0.0):
    V, R = geometry(size, pad)
    fill = (lambda c: f'style="fill:{c}"') if css else (lambda c: f'fill="{c}"')
    circ = lambda x, y, c: f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(R)}" {fill(c)}/>'
    defs = "".join(f'<clipPath id="{uid}{i}"><circle cx="{f(x)}" cy="{f(y)}" r="{f(R)}"/></clipPath>' for i, (x, y) in enumerate(V))
    b = "".join(circ(x, y, c) for (x, y), c in zip(V, pal["disc"][:3]))
    for (i, j), c in zip([(0, 1), (1, 2), (2, 0)], pal["disc"][3:6]):
        x, y = V[j]; b += f'<g clip-path="url(#{uid}{i})">{circ(x, y, c)}</g>'
    x, y = V[2]
    b += f'<g clip-path="url(#{uid}0)"><g clip-path="url(#{uid}1)">{circ(x, y, pal["core"])}</g></g>'
    if air:
        # thin cuts along every arc, the colour of whatever is behind: large sizes only
        defs += (f'<mask id="{uid}a" maskUnits="userSpaceOnUse" x="0" y="0" width="{f(size)}" height="{f(size)}">'
                 f'<rect width="{f(size)}" height="{f(size)}" fill="#fff"/>'
                 + "".join(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(R)}" fill="none" stroke="#000" stroke-width="{f(air)}"/>' for x, y in V)
                 + "</mask>")
        b = f'<g mask="url(#{uid}a)">{b}</g>'
    return f"<defs>{defs}</defs>{b}"

def word(parts, size, x, baseline, weight=800, tracking=-0.015):
    fo = instantiateVariableFont(TTFont("src/fonts/Nunito-VF.woff2"), {"wght": weight})
    gs = fo.getGlyphSet(); cmap = fo.getBestCmap(); s = size / fo["head"].unitsPerEm; hm = fo["hmtx"]; out = []
    for text, fill in parts:
        cmds = []
        for ch in text:
            g = cmap[ord(ch)]; pen = SVGPathPen(gs); gs[g].draw(TransformPen(pen, (s, 0, 0, -s, x, baseline))); cmds.append(pen.getCommands())
            x += hm[g][0] * s + tracking * size
        out.append(f'<path d="{" ".join(cmds)}" fill="{fill}"/>')
    return "".join(out), x

def svg(w, h, body): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f(w)} {f(h)}" width="{f(w)}" height="{f(h)}">{body}</svg>\n'

out = "public/brand/"
open(out + "runfold-mark.svg", "w").write(svg(100, 100, mark(LIGHT, "m")))
open(out + "runfold-mark-dark.svg", "w").write(svg(100, 100, mark(DARK, "d")))
# "Air": the same with thin cuts between the facets — for 64 px and up.
open(out + "runfold-mark-air.svg", "w").write(svg(100, 100, mark(LIGHT, "ma", air=2.2)))
open(out + "runfold-mark-air-dark.svg", "w").write(svg(100, 100, mark(DARK, "da", air=2.2)))
open(out + "runfold-mark-mono.svg", "w").write(svg(100, 100, mark(MONO, "o")))
for name, bg, pal in [("runfold-app-icon", "#fff3f8", LIGHT), ("runfold-app-icon-dark", "#1a1630", DARK)]:
    open(out + name + ".svg", "w").write(svg(100, 100, f'<rect width="100" height="100" rx="22" fill="{bg}"/><g transform="translate(12 12) scale(0.76)">{mark(pal, name)}</g>'))
for name, pal, run, fold, air in [("runfold-logo", LIGHT, "#1f1b3d", "#e0378f", 0), ("runfold-logo-dark", DARK, "#f6f0f8", "#ff5caa", 0),
                                  ("runfold-logo-air", LIGHT, "#1f1b3d", "#e0378f", 2.2), ("runfold-logo-air-dark", DARK, "#f6f0f8", "#ff5caa", 2.2)]:
    wd, x = word([("run", run), ("fold", fold)], 58, 112, 50 + 20.5)
    open(out + name + ".svg", "w").write(svg(x + 6, 100, mark(pal, name, air=air) + wd))

# Header mark: the same drawing in the active skin's tokens.
def cm(a, b, t=50): return f"color-mix(in oklab, {a} {t}%, {b})"
# The disc colours come from --rf-* variables (globals.css) derived from the
# skin's tokens, with dark-theme overrides so the deep disc never fades out.
deep, guided, quick = "var(--rf-deep)", "var(--rf-guided)", "var(--rf-quick)"
CSS = dict(disc=[deep, guided, quick, cm(guided, "white", 84), cm(quick, "white", 80), cm(quick, "var(--accent)", 55)],
           core="var(--rf-core)")
inner = mark(CSS, "rf-hdr", css=True)
open("src/reader/RunfoldMark.tsx", "w").write(f'''/* Generated by scripts/brand.py — the Runfold mark in the active skin's
   colours: three discs through each other's centres (the reading levels),
   stacked like sheets lit from behind; their common core, a Reuleaux
   triangle pointing right, is the play (Run) and the brightest part. */

const MARK = `{inner}`;

export function RunfoldMark({{ className }}: {{ className?: string }}) {{
  return <svg viewBox="0 0 100 100" className={{"rf-mark " + (className ?? "")}} aria-hidden dangerouslySetInnerHTML={{{{ __html: MARK }}}} />;
}}
''')
print("brand assets written")
