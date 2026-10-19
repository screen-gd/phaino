"""Build the original social images and export versioned image-generated previews.

Run from any directory with Python (fontTools) and installed project dependencies.
SVG masters contain outlined type so exports do not depend on system fonts.
"""

from functools import lru_cache
from html import escape
from pathlib import Path
import subprocess

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont


HERE = Path(__file__).resolve().parent
PROJECT = HERE.parents[2]
OUTPUT = PROJECT / "website/public/social"
FONTS = HERE / "fonts"
ORANGE = "#FF5B22"
MARK_PATHS = (
    "M0 19 Q0 9.5 9 9 Q55 3 100 1 V20 Q45 30 0 55 Z",
    "M100 30 V100 H4 Q0 100 0 96 V70 Q50 42 100 30 Z",
)


@lru_cache(None)
def font(face, weight):
    source = TTFont(FONTS / f"{face}.ttf")
    return instantiateVariableFont(source, {"wght": weight}, inplace=False)


def text(value, x, y, size, face="Inter", weight=400, color="white", center=False, spacing=0):
    source = font(face, weight)
    glyphs, cmap = source.getGlyphSet(), source.getBestCmap()
    scale = size / source["head"].unitsPerEm
    names = [cmap[ord(char)] for char in value]
    width = sum(glyphs[name].width * scale for name in names) + (len(names) - 1) * spacing
    if center:
        x -= width / 2
    paths = []
    for name in names:
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x, y)))
        paths.append(pen.getCommands())
        x += glyphs[name].width * scale + spacing
    return f'<g fill="{color}" aria-label="{escape(value)}"><path d="{" ".join(paths)}"/></g>'


def mark(x, y, size, color=ORANGE):
    paths = "".join(f'<path d="{path}"/>' for path in MARK_PATHS)
    return f'<g transform="translate({x} {y}) scale({size / 100})" fill="{color}">{paths}</g>'


def lockup(x, y, size=100, font_size=124):
    return mark(x, y, size) + text("Phaino", x + size * 1.32, y + size * .87, font_size, "Outfit", 800, spacing=-2)


DEFS = """
<radialGradient id="ember">
  <stop stop-color="#FF5B22"/><stop offset=".28" stop-color="#D94212"/>
  <stop offset=".58" stop-color="#692006" stop-opacity=".86"/>
  <stop offset="1" stop-color="#000000" stop-opacity="0"/>
</radialGradient>
<radialGradient id="soft">
  <stop stop-color="#FF5B22"/><stop offset=".35" stop-color="#C8370C"/>
  <stop offset="1" stop-color="#000000" stop-opacity="0"/>
</radialGradient>
<filter id="blur" x="-50%" y="-100%" width="200%" height="300%" color-interpolation-filters="sRGB">
  <feGaussianBlur stdDeviation="34"/>
</filter>
<filter id="wide-blur" x="-70%" y="-100%" width="240%" height="300%" color-interpolation-filters="sRGB">
  <feGaussianBlur stdDeviation="58"/>
</filter>
<filter id="grain">
  <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" seed="24" stitchTiles="stitch"/>
  <feColorMatrix type="saturate" values="0"/>
</filter>
"""


def ellipse(x, y, rx, ry, gradient="ember", opacity=1, rotate=0):
    return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="url(#{gradient})" opacity="{opacity}" transform="rotate({rotate} {x} {y})"/>'


def document(name, background, foreground):
    # A faint fixed grain prevents banding in compressed orange-to-black gradients.
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img">'
        f'<title>Phaino: {escape(name)}</title><defs>{DEFS}</defs>'
        '<rect width="1200" height="630" fill="#000000"/>'
        + background
        + '<rect width="1200" height="630" filter="url(#grain)" opacity=".022"/>'
        + foreground
        + '</svg>'
    )


DESIGNS = {
    "01-horizon": document(
        "Horizon",
        '<g filter="url(#blur)">'
        + ellipse(600, 680, 950, 355)
        + ellipse(600, 642, 560, 155, "soft", .8)
        + '</g>',
        lockup(333, 215)
        + text("AI video and image studio", 600, 373, 27, center=True, color="#BDB9B6")
        + text("phaino.us.ci", 600, 559, 18, center=True, color="#D6C2B8"),
    ),
    "02-bloom": document(
        "Bloom",
        '<g filter="url(#wide-blur)">'
        + ellipse(1170, 245, 590, 590)
        + ellipse(1090, 690, 470, 310, "soft", .85)
        + '</g>',
        mark(86, 88, 70)
        + text("Phaino", 78, 338, 148, "Outfit", 800, spacing=-3)
        + text("AI video and image studio", 86, 399, 27, color="#C5BEBA")
        + text("phaino.us.ci", 86, 549, 18, color="#A99B94"),
    ),
    "03-drift": document(
        "Drift",
        '<g filter="url(#wide-blur)">'
        + ellipse(730, 155, 780, 132, "ember", .95, -27)
        + ellipse(144, 560, 380, 210, "soft", .6, -27)
        + '</g>',
        mark(560, 155, 80)
        + text("Phaino", 600, 352, 138, "Outfit", 800, center=True, spacing=-2.5)
        + text("AI video and image studio", 600, 414, 27, center=True, color="#C0B9B5")
        + text("phaino.us.ci", 600, 555, 18, center=True, color="#9D928D"),
    ),
    "04-afterglow": document(
        "Afterglow",
        '<g filter="url(#blur)">'
        + ellipse(760, 380, 570, 400, "soft", .9, -16)
        + ellipse(1240, 660, 500, 400, "ember", .8)
        + '</g>'
        + '<ellipse cx="680" cy="260" rx="340" ry="210" fill="#000000" filter="url(#wide-blur)"/>',
        lockup(80, 77, 55, 68)
        + mark(817, 205, 205, "white")
        + text("AI video and", 84, 417, 43, weight=500, spacing=-1)
        + text("image studio", 84, 473, 43, weight=500, spacing=-1)
        + text("phaino.us.ci", 86, 551, 18, color="#C9B8AE"),
    ),
}


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, svg in DESIGNS.items():
        (HERE / f"{name}.svg").write_text(svg, encoding="utf-8")

    # Use the existing Sharp install without adding a package or changing the lockfile.
    renderer = r"""
    const fs = require('node:fs');
    const path = require('node:path');
    const [root, source, output] = process.argv.slice(1);
    const store = path.join(root, 'node_modules/.pnpm');
    const pkg = fs.readdirSync(store).find(name => name.startsWith('sharp@'));
    if (!pkg) throw new Error('Install project dependencies before rendering.');
    const sharp = require(path.join(store, pkg, 'node_modules/sharp'));
    (async () => {
      for (const file of fs.readdirSync(source).filter(name => name.endsWith('.svg'))) {
        const target = path.join(output, file.replace('.svg', '.jpg'));
        await sharp(path.join(source, file), { density: 144 })
          .resize(1200, 630).jpeg({ quality: 94, chromaSubsampling: '4:4:4' }).toFile(target);
        console.log(target);
      }
      for (const file of fs.readdirSync(source).filter(name => /-v\d+\.png$/.test(name))) {
        const target = path.join(output, file.replace('.png', '.jpg'));
        await sharp(path.join(source, file)).resize(1200, 630, { fit: 'cover' })
          .jpeg({ quality: 94, chromaSubsampling: '4:4:4' }).toFile(target);
        console.log(target);
      }
    })().catch(error => { console.error(error); process.exitCode = 1; });
    """
    subprocess.run(["node", "-e", renderer, str(PROJECT), str(HERE), str(OUTPUT)], check=True)
