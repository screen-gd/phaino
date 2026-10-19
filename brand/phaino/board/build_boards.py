"""Render the fixed Phaino identity as self-contained, font-outlined SVG boards."""
from pathlib import Path
from base64 import b64encode
from functools import lru_cache
from html import escape
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from PIL import Image

ROOT = Path(__file__).resolve().parent
ORANGE, MINT, PERI = '#FF5B22', '#6CCBA0', '#898CE1'
WHITE, BLACK, GREY = '#FFFFFF', '#000000', '#999999'
UPPER = 'M0 19 Q0 9.5 9 9 Q55 3 100 1 V20 Q45 30 0 55 Z'
LOWER = 'M100 30 V100 H4 Q0 100 0 96 V70 Q50 42 100 30 Z'

@lru_cache(None)
def font(name, weight):
    f = TTFont(ROOT / 'assets' / f'{name}.ttf')
    axes = {'wght': weight}
    if name == 'Inter':
        axes['opsz'] = 14
    return instantiateVariableFont(f, axes, inplace=False)

def text(value, x, y, size=14, face='Inter', weight=400, color=WHITE, anchor='start', spacing=0):
    f = font(face, weight)
    glyphs, cmap = f.getGlyphSet(), f.getBestCmap()
    missing = [c for c in value if ord(c) not in cmap]
    if missing:
        raise ValueError(f'{face} is missing {missing!r} in {value!r}')
    scale = size / f['head'].unitsPerEm
    names = [cmap.get(ord(c), '.notdef') for c in value]
    total = sum(glyphs[n].width * scale for n in names) + max(0, len(names)-1)*spacing
    x -= total/2 if anchor == 'middle' else total if anchor == 'end' else 0
    paths = []
    for name in names:
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x, y)))
        paths.append(pen.getCommands())
        x += glyphs[name].width*scale + spacing
    return f'<g fill="{color}" aria-label="{escape(value)}"><title>{escape(value)}</title><path d="{" ".join(paths)}"/></g>'

def rect(x,y,w,h,fill=BLACK,r=0,stroke=None,sw=1):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="{sw}"' if stroke else '')+'/>'

def line(x1,y1,x2,y2,color='#333333',sw=1,dash=''):
    return f'<path d="M{x1} {y1}L{x2} {y2}" fill="none" stroke="{color}" stroke-width="{sw}"'+(f' stroke-dasharray="{dash}"' if dash else '')+'/>'

def circle(x,y,r,fill,stroke=None):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}"'+(f' stroke="{stroke}"' if stroke else '')+'/>'

def mark(x,y,size,color=ORANGE):
    return f'<g transform="translate({x} {y}) scale({size/100})" fill="{color}"><path d="{UPPER}"/><path d="{LOWER}"/></g>'

def lockup(x,y,ms=64,fs=59,color=WHITE,mc=ORANGE):
    return mark(x,y,ms,mc)+text('Phaino',x+ms+ms*.3,y+ms*.82,fs,'Outfit',800,color,spacing=-fs*.024)

def icon(kind,x,y,size=24,color=WHITE):
    paths = {
      'camera':'M3 7h12v10H3z M15 10l6-3v10l-6-3',
      'image':'M3 3h18v18H3z M3 17l6-7 5 6 3-3 4 5 M16 7h.01',
      'fork':'M6 4v7q0 5 6 5h6 M6 11q6 0 6-6V4 M17 13l3 3-3 3',
      'move':'M4 12h16 M8 8l-4 4 4 4 M16 8l4 4-4 4',
      'arrow':'M5 12h14 M13 6l6 6-6 6',
      'grid':'M4 4h5v5H4z M15 4h5v5h-5z M4 15h5v5H4z M15 15h5v5h-5z'
    }
    return f'<g transform="translate({x} {y}) scale({size/24})" fill="none" stroke="{color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="{paths[kind]}"/></g>'

def button(label,x,y,w,h=40,primary=False,fs=14):
    return rect(x,y,w,h,ORANGE if primary else BLACK,h/2,None if primary else '#555555')+text(label,x+w/2,y+h/2+fs*.34,fs,'Inter',600,BLACK if primary else WHITE,'middle')

def photo(source,box,x,y,w,h):
    bx,by,bw,bh=box
    return f'<svg x="{x}" y="{y}" width="{w}" height="{h}" viewBox="{bx} {by} {bw} {bh}" preserveAspectRatio="xMidYMid slice" overflow="hidden"><use href="#{source}"/></svg>'

def document(panels,columns):
    defs=[]
    for key,file in [('ov','overview-b.png'),('tp','touchpoints-a.png')]:
        data=(ROOT/'variations'/file).read_bytes()
        im=Image.open(ROOT/'variations'/file)
        defs.append(f'<image id="{key}" width="{im.width}" height="{im.height}" href="data:image/png;base64,{b64encode(data).decode()}"/>')
    defs.append('<filter id="shadow" x="-30%" y="-40%" width="170%" height="190%"><feDropShadow dx="0" dy="14" stdDeviation="13" flood-opacity=".5"/></filter>')
    defs.append('<filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="3" seed="31"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".065"/></feComponentTransfer><feBlend in="SourceGraphic" mode="soft-light"/></filter>')
    out=['<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="3200" height="2000" viewBox="0 0 1600 1000" role="img">','<title>Phaino brand identity</title>','<defs>'+''.join(defs)+'</defs>',rect(0,0,1600,1000,'#1A1A1A')]
    pw=(1600-(columns+1)*12)/columns
    ph=(1000-4*12)/3
    for i,panel in enumerate(panels):
        out.append(f'<svg x="{12+(i%columns)*(pw+12)}" y="{12+(i//columns)*(ph+12)}" width="{pw}" height="{ph}" viewBox="0 0 {pw} {ph}" overflow="hidden">{panel}</svg>')
    return ''.join(out)+'</svg>'

W=(1600-48)/3
H=(1000-48)/3
p=[]
# 1. Logo cover.
p.append(rect(0,0,W,H)+lockup(44,117,83,77))
# 2. Construction. All handles correspond to the supplied quadratic paths.
s=1.73; ox=68; oy=66
c=rect(0,0,W,H,WHITE)
for i in range(11):
    c+=line(ox+i*s*10,oy,ox+i*s*10,oy+100*s,'#E8E8E8',.7)+line(ox,oy+i*s*10,ox+100*s,oy+i*s*10,'#E8E8E8',.7)
c+=rect(ox,oy,100*s,100*s,'none',0,'#AAAAAA',.8)+mark(ox,oy,100*s,BLACK)
for points in [[(0,19),(0,9.5),(9,9)],[(9,9),(55,3),(100,1)],[(100,20),(45,30),(0,55)],[(0,70),(50,42),(100,30)]]:
    (a,b,d)=points
    c+=line(ox+a[0]*s,oy+a[1]*s,ox+b[0]*s,oy+b[1]*s,ORANGE,.7,'3 3')+line(ox+b[0]*s,oy+b[1]*s,ox+d[0]*s,oy+d[1]*s,ORANGE,.7,'3 3')
    c+=circle(ox+b[0]*s,oy+b[1]*s,2.4,WHITE,ORANGE)
c+=text('100 × 100',ox,42,11,'GeistMono',400,BLACK)
c+=line(ox+100*s+14,oy+20*s,ox+100*s+14,oy+30*s,ORANGE)+text('x',ox+100*s+22,oy+29*s,11,'GeistMono',400,BLACK)
# Small usage inset distinguishes the square from its 2x exclusion zone.
c+=rect(334.4,93.4,102.2,102.2,'none',0,'#AAAAAA',1)+rect(349,108,73,73,'none',0,ORANGE,.7)+mark(349,108,73,BLACK)
c+=text('2x',334,80,11,'GeistMono',400,BLACK)+text('Square · band · curves',36,282,14,'Inter',400,BLACK)
p.append(c)
# 3. Explore header with wide media cards, tools grid and floating pills.
c=rect(0,0,W,H)+lockup(25,21,22,22)+text('Explore',W-25,38,14,'Inter',500,WHITE,'end')
c+=line(24,61,W-24,61,'#252525')+text('EXPLORE',25,91,23,'Outfit',800,ORANGE)
c+=photo('ov',(535,656,516,326),25,109,226,104)+photo('tp',(1270,433,253,198),263,109,229,104)
c+=rect(26,183,224,29,BLACK,0)+text('Dolly in',37,202,11,'Inter',500)+rect(264,183,227,29,BLACK,0)+text('Orbit',275,202,11,'Inter',500)
c+=button('View all',404,196,78,25,False,11)
c+=text('TOOLS',25,247,18,'Outfit',800,ORANGE)
for j,(kind,label) in enumerate([('camera','Video'),('image','Image'),('move','Camera'),('fork','Workflow')]):
    xx=25+j*119
    c+=rect(xx,260,108,40,BLACK,7,'#343434')+icon(kind,xx+10,271,18)+text(label,xx+37,285,11)
p.append(c)
# 4. Essence, without a slogan.
p.append(rect(0,0,W,H,ORANGE)+text('Phaino',36,156,106,'Outfit',800,BLACK,spacing=-2.5)+text('φαίνω',40,223,37,'Inter',500,BLACK)+text('FY-no · to bring to light, to show',41,273,14,'Inter',400,BLACK))
# 5. Palette and golden-ratio hue derivation. Approximate angles do not change fixed hex colors.
c=rect(0,0,W,H)+rect(31,30,287,102,ORANGE,8)+text('#FF5B22',47,115,18,'GeistMono',500,BLACK)
for xx,col,hx in [(338,MINT,'#6CCBA0'),(420,PERI,'#898CE1')]:
    c+=rect(xx,30,53,30,col,5)+text(hx,xx,81,11,'GeistMono',400)
c+=rect(338,101,53,31,WHITE,5)+rect(420,101,53,31,BLACK,5,'#555555')
c+=line(31,153,W-31,153)+text('φ = 1.618',31,191,23,'Inter',700)
c+=text('15.5° + 360/φ² ≈ 153°',31,229,14,'Inter',400)+circle(470,224,4,MINT)
c+=text('15.5° + 360/φ  ≈ 238°',31,258,14,'Inter',400)+circle(470,253,4,PERI)
c+=text('#000000  /  #FFFFFF',31,291,11,'GeistMono',400,GREY)
p.append(c)
# 6. Actual font outlines, including the complete fixed scale.
c=rect(0,0,W,H,WHITE)
c+=text('Aa',28,106,87,'Outfit',800,BLACK,spacing=-2)+text('Outfit 800',30,139,14,'Outfit',700,BLACK)
c+=line(191,32,191,151,'#D3D3D3')+text('Inter',213,61,29,'Inter',400,BLACK)+text('Open workflow',214,94,14,'Inter',400,BLACK)
c+=text('Geist Mono',213,130,18,'GeistMono',400,BLACK)
c+=line(29,170,W-29,170,'#D3D3D3')
xs=[31,83,137,191,245,307,391]
for size,xx in zip([11,14,18,23,29,37,59],xs):
    c+=text(str(size),xx,239,size,'Outfit',700,BLACK)
c+=text('14 × (√φ)ⁿ',31,284,14,'Inter',400,BLACK)
c+=text('700–800 / 400 / 400',W-30,284,11,'GeistMono',400,BLACK,'end')
p.append(c)
# 7. Physical applications, exact vector lockups on printed surfaces.
c=rect(0,0,W,H,'#171717')
c+='<g filter="url(#shadow)"><g transform="translate(23 79) rotate(-12 200 100)">'
c+=rect(0,0,363,241,'#080808',2)+rect(0,0,363,241,'#111111',2)
c+='<g filter="url(#paper)">'+rect(0,0,363,241,'#111111',2)+'</g>'
c+=lockup(54,86,49,45)+line(24,24,24,220,'#2B2B2B',1)+'</g></g>'
c+='<g transform="translate(275 171) rotate(-12 101 57)" filter="url(#shadow)">'+rect(0,0,202,113,ORANGE,1)+'<g filter="url(#paper)">'+rect(0,0,202,113,ORANGE,1)+'</g>'+lockup(23,39,34,31,BLACK,BLACK)+'</g>'
p.append(c)
# 8. Generated cinematic art as image direction, with no identity/text baked into the crop.
p.append(photo('ov',(535,655,516,326),0,0,W,H))
# 9. Components with controlled accent colors.
c=rect(0,0,W,H)+button('Generate',31,34,190,43,True,18)+icon('arrow',184,46,20,BLACK)+button('Open workflow',237,34,249,43,False,18)
c+=circle(40,115,5,MINT)+text('Ready',54,120,14)+circle(196,115,5,PERI)+text('Info',210,120,14)
c+=rect(357,99,58,27,BLACK,14,'#444444')+text('Video',386,117,11,'Inter',500,WHITE,'middle')
c+=rect(427,99,59,27,BLACK,14,'#444444')+text('Image',456,117,11,'Inter',500,WHITE,'middle')
c+=line(31,155,486,155)
for xx,kind,label in [(31,'camera','Video'),(188,'fork','Workflow'),(345,'image','Image')]:
    c+=rect(xx,181,140,105,BLACK,9,'#3B3B3B')+icon(kind,xx+54,201,32)+text(label,xx+70,266,14,'Inter',400,WHITE,'middle')
p.append(c)
(ROOT/'phaino-overview.svg').write_text(document(p,3),encoding='utf-8')

# The selected touchpoint direction retains the calmer black-led A presentation.
W=(1600-36)/2
H=(1000-48)/3
p=[]
# 1. Favicon at true native sizes in board coordinates.
c=rect(0,0,W,H)+rect(37,36,W-74,69,'#141414',12,'#303030')
c+=rect(61,49,241,43,BLACK,9)+mark(78,61,16)+text('Phaino',108,77,14,'Inter',500)+text('×',274,78,18,'Inter',400,GREY)
c+=line(326,64,326,80,GREY)+line(318,72,334,72,GREY)
for xx,sz in [(76,16),(195,32),(330,48)]:
    c+=mark(xx,211-sz,sz)+text(f'{sz}px',xx+sz/2,244,11,'GeistMono',400,WHITE,'middle')
c+=line(470,144,470,266,'#333333')+mark(534,151,94)
c+=text('16px minimum',581,272,11,'GeistMono',400,WHITE,'middle')
p.append(c)
# 2. App icon containers preserve the mark rather than cutting a different P from them.
c=rect(0,0,W,H)
c+=rect(163,47,174,174,ORANGE,39)+mark(198,82,104,BLACK)
c+=rect(445,47,174,174,BLACK,39,'#3A3A3A',1.5)+mark(480,82,104)
c+=text('iOS',250,270,14,'Inter',500,WHITE,'middle')+text('Desktop',532,270,14,'Inter',500,WHITE,'middle')
p.append(c)
# 3. Avatar and unclaimed profile without invented handles or verification.
c=rect(0,0,W,H)+circle(190,158,119,BLACK,'#393939')+mark(139,107,102)
c+=circle(406,133,30,BLACK,'#393939')+mark(392,119,28)+text('Phaino',454,145,37,'Outfit',800)
c+=text('AI video and image studio',379,202,18,'Inter',400,WHITE)
p.append(c)
# 4. GitHub social preview, 2:1 inside the touchpoint panel.
cw=534; ch=267; cx=(W-cw)/2; cy=(H-ch)/2
c=rect(0,0,W,H)+rect(cx,cy,cw,ch,BLACK,0,'#333333')
c+=photo('ov',(535,655,516,326),cx+cw*.60,cy,cw*.40,ch)
c+=rect(cx+19,cy+20,100,23,BLACK,12,'#444444')+text('Open source',cx+69,cy+36,11,'Inter',500,WHITE,'middle')
c+=lockup(cx+25,cy+100,43,42)+text('AI video and image studio',cx+25,cy+182,14,'Inter',400)
p.append(c)
# 5. Splash screen uses a static progress example, with no loop or glow.
c=rect(0,0,W,H)+lockup(210,93,65,59)+rect(231,224,320,3,'#262626',1.5)+rect(231,224,119,3,ORANGE,1.5)+text('Loading studio',W/2,261,11,'GeistMono',400,GREY,'middle')
p.append(c)
# 6. OG, exact 1200:630 card proportions, image is subordinate to the lockup.
cw=540; ch=cw*630/1200; cx=(W-cw)/2; cy=(H-ch)/2
c=rect(0,0,W,H)+rect(cx,cy,cw,ch,BLACK,0,'#333333')
c+=photo('ov',(535,655,516,326),cx+cw*.56,cy,cw*.44,ch)
c+=lockup(cx+27,cy+108,46,45)
p.append(c)
(ROOT/'phaino-touchpoints.svg').write_text(document(p,2),encoding='utf-8')
print('Wrote two 3200 × 2000 SVG boards with exact mark geometry and outlined fonts.')
