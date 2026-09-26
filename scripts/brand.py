# Runfold brand assets. Run from the repository root: python3 scripts/brand.py (needs fonttools + brotli).
# Runfold mark: three circles in a vesica chain (each passes through the
# next one's centre) — they nest and unnest, the page unfolding. The play
# triangle is not drawn on top, it is *built* from them: its base joins the
# two points where the first circles cross, its apex is the centre of the
# third. Equilateral by construction.
import math
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

INK="#1f1b3d"; PLUM="#6d2f7e"; ACC_INK="#c41f78"; ACC="#e0378f"; PAPER="#fff3f8"
def f(x): return f"{x:.3f}".rstrip("0").rstrip(".")

def mark(ox=0, oy=0, R=16, sw=4.6, gap=3.2, colors=(INK, PLUM, ACC), tri=(ACC_INK, ACC), uid="rf"):
    cy=oy+R+sw/2+1
    cx=[ox+R+sw/2+1 + i*R for i in range(3)]
    h=R*math.sqrt(3)/2
    T1=(cx[0]+R/2, cy-h); T2=(cx[0]+R/2, cy+h); P=(cx[2], cy)
    tri_d=f"M{f(T1[0])} {f(T1[1])} L{f(P[0])} {f(P[1])} L{f(T2[0])} {f(T2[1])} Z"
    w=cx[2]+R+sw/2+1-ox; H=2*(R+sw/2+1)
    defs=f'''<defs>
    <linearGradient id="{uid}-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{tri[0]}"/><stop offset="1" stop-color="{tri[1]}"/>
    </linearGradient>
    <mask id="{uid}-m" maskUnits="userSpaceOnUse" x="{f(ox-2)}" y="{f(oy-2)}" width="{f(w+4)}" height="{f(H+4)}">
      <rect x="{f(ox-2)}" y="{f(oy-2)}" width="{f(w+4)}" height="{f(H+4)}" fill="#fff"/>
      <path d="{tri_d}" fill="#000" stroke="#000" stroke-width="{f(2*gap+2)}" stroke-linejoin="round"/>
    </mask>
  </defs>'''
    ring=lambda x,c,extra="": f'<circle cx="{f(x)}" cy="{f(cy)}" r="{R}" fill="none" stroke="{c}" stroke-width="{sw}"{extra}/>'
    # Interlock: the third ring passes over the second at the top and under
    # it at the bottom, like links of a chain. The "under" is a gap cut in the
    # third ring along the second one's path.
    def arc(c, a0, a1):
        x0=c+R*math.cos(math.radians(a0)); y0=cy+R*math.sin(math.radians(a0))
        x1=c+R*math.cos(math.radians(a1)); y1=cy+R*math.sin(math.radians(a1))
        return f"M{f(x0)} {f(y0)} A{R} {R} 0 0 1 {f(x1)} {f(y1)}"
    weave=f'''<mask id="{uid}-w" maskUnits="userSpaceOnUse" x="{f(ox-2)}" y="{f(oy-2)}" width="{f(w+4)}" height="{f(H+4)}">
      <rect x="{f(ox-2)}" y="{f(oy-2)}" width="{f(w+4)}" height="{f(H+4)}" fill="#fff"/>
      <path d="{arc(cx[1], 42, 78)}" fill="none" stroke="#000" stroke-width="{f(sw+2*gap)}"/>
    </mask>'''
    defs=defs.replace("</defs>", "  "+weave+"\n  </defs>")
    body=f'''{defs}
  <g mask="url(#{uid}-m)">
    {ring(cx[0],colors[0])}
    {ring(cx[1],colors[1])}
    <g mask="url(#{uid}-w)">{ring(cx[2],colors[2])}</g>
  </g>
  <path d="{tri_d}" fill="url(#{uid}-g)" stroke="url(#{uid}-g)" stroke-width="2.4" stroke-linejoin="round"/>'''
    return body, w, H

def word(text_parts, size, x, baseline, weight=800, tracking=-0.015):
    fo=instantiateVariableFont(TTFont("src/fonts/Nunito-VF.woff2"),{"wght":weight})
    gs=fo.getGlyphSet(); cmap=fo.getBestCmap(); upm=fo["head"].unitsPerEm; hm=fo["hmtx"]; s=size/upm
    out=[]
    for text,fill in text_parts:
        cmds=[]
        for ch in text:
            g=cmap[ord(ch)]; pen=SVGPathPen(gs); gs[g].draw(TransformPen(pen,(s,0,0,-s,x,baseline))); cmds.append(pen.getCommands())
            x+=hm[g][0]*s+tracking*size
        out.append(f'<path d="{" ".join(cmds)}" fill="{fill}"/>')
    return "\n  ".join(out), x

def svg(w,h,body,bg=None,rx=None):
    b=f'<rect width="{f(w)}" height="{f(h)}" rx="{f(rx)}" fill="{bg}"/>\n  ' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f(w)} {f(h)}" width="{f(w)}" height="{f(h)}">\n  {b}{body}\n</svg>\n'

out="public/brand/"
m,w,h=mark(); open(out+"runfold-mark.svg","w").write(svg(w,h,m))
m2,_,_=mark(colors=(INK,INK,INK),tri=(INK,INK),uid="mono"); open(out+"runfold-mark-mono.svg","w").write(svg(w,h,m2))
# app icon: white rings and triangle on the accent square
S=64; sc=(S-14)/w
mi,_,_=mark(colors=("#fff","#fff","#fff"),tri=("#fff","#fff"),uid="ic")
mi_op=mi.replace('stroke="#fff" stroke-width="4.6"/>','stroke="#fff" stroke-width="4.6"/>')
icon=f'<g transform="translate(7 {f((S-h*sc)/2)}) scale({f(sc)})">{mi}</g>'
open(out+"runfold-app-icon.svg","w").write(svg(S,S,icon,bg=ACC,rx=14))
# app icon, dark variant (ink square, coloured mark in dark-theme tones)
md,_,_=mark(colors=("#f6f0f8","#b77bd0","#ff5caa"),tri=("#ff5caa","#ff8ec6"),uid="icd")
open(out+"runfold-app-icon-dark.svg","w").write(svg(S,S,f'<g transform="translate(7 {f((S-h*sc)/2)}) scale({f(sc)})">{md}</g>',bg="#1a1630",rx=14))
# horizontal logos
for name,cols,tri,run,fold in [("runfold-logo",(INK,PLUM,ACC),(ACC_INK,ACC),INK,ACC),
                               ("runfold-logo-dark",("#f6f0f8","#b77bd0","#ff5caa"),("#ff5caa","#ff8ec6"),"#f6f0f8","#ff5caa")]:
    mk,w0,h0=mark(colors=cols,tri=tri,uid=name)
    wd,x=word([("run",run),("fold",fold)],38,w0+12,h0/2+13.5)
    open(out+name+".svg","w").write(svg(x+4,h0,mk+"\n  "+wd))
print("ok",w,h)

# The header mark: same geometry, colours from the active skin's tokens.
m,w,h=mark(colors=("__INK__","__MID__","__ACC__"),tri=("__ACCINK__","__ACC__"),uid="rf-hdr")
def css(s):
    for k,v in {"__INK__":"var(--ink)","__MID__":"color-mix(in oklab, var(--ink) 45%, var(--accent))","__ACC__":"var(--accent)","__ACCINK__":"var(--accent-ink)"}.items():
        s=s.replace(f'stroke="{k}"',f'style="stroke:{v}"').replace(f'stop-color="{k}"',f'style="stop-color:{v}"')
    return s
inner=css(m).replace("`","\\`")
open("src/reader/RunfoldMark.tsx","w").write(f'''/* Generated by scripts/brand.py — the Runfold mark in the active skin's colours:
   three circles in a vesica chain (they nest and unnest: the page unfolding)
   and the play triangle built from them. */

const MARK = `{inner}`;

export function RunfoldMark({{ className }}: {{ className?: string }}) {{
  return <svg viewBox="0 0 {f(w)} {f(h)}" className={{className}} aria-hidden dangerouslySetInnerHTML={{{{ __html: MARK }}}} />;
}}
''')
print("mark component written")
