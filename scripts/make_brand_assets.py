"""
Generate every Salli icon from one definition.

Run: uv run python scripts/make_brand_assets.py

The icon is Bloub, Salli's face, on the app's dark canvas. It is generated
rather than exported from a design tool because there are nine outputs across
two clients at four sizes with three different alpha rules, and the last set
drifted: the shipped icon still used #16130f and #F5310F, two colours the app
retired, months after the redesign landed.

The body silhouette is read from the mascot's own geometry, so the icon cannot
drift from the face users meet inside the app. The eyes are not: every mood in
that file places them off-centre and tilted, which is right for a live face
that drifts and looks around, and wrong for a mark seen for a quarter of a
second in a grid of forty others. The icon squares them up and looks straight
out.

No SVG rasteriser is used. The silhouette is a run of cubic Beziers, so it is
flattened to a polygon here and filled with Pillow at 4x, then downsampled.
That keeps the script runnable from a plain `uv run` with no browser, no
cairo, and no node.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
GEOMETRY = ROOT / "clients/mobile/components/agent/bloub-geometry.ts"
MOBILE = ROOT / "clients/mobile/assets"
SITE = ROOT / "clients/site/src/app"
SITE_COMPONENTS = ROOT / "clients/site/src/components"

# ── Palette ──────────────────────────────────────────────────────────────────
# The shipped app's values (clients/mobile/lib/theme.tsx), not approximations.
INK = (14, 14, 14)
ORANGE = (241, 90, 50)
CREAM = (245, 243, 239)
# The hard offset shadow, pre-blended: orange at 42% over ink. Kept as a solid
# colour so the Android foreground layer, which is transparent and parallaxes
# over its own background, carries its shadow with it instead of compositing
# against whatever is behind it.
SHADOW = (109, 46, 29)

# ── Layout, in the mascot's own -125..125 viewBox units ──────────────────────
VIEWBOX = 250.0
BODY_SPAN = 192.0  # the silhouette spans roughly +/-96
EYE_W, EYE_H = 18.6, 41.2  # the capsule authored in bloub-geometry
EYE_SCALE = 1.28  # enlarged so the face still reads at 40px
EYE_X, EYE_Y = 30.0, 2.0
OUTLINE = 8.0
SHADOW_OFFSET = 9.0

SS = 4  # supersample factor


def _body_polygon() -> list[tuple[float, float]]:
    """Flatten the mascot silhouette to a polygon in viewBox units."""
    raw = GEOMETRY.read_text()
    start = raw.index("export const BLOUB:")
    blob = raw[raw.index("{", start) :]
    depth = 0
    for i, ch in enumerate(blob):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                blob = blob[: i + 1]
                break
    path = json.loads(blob)["neutral"]["bodyMask"]

    nums = re.compile(r"-?\d*\.?\d+")
    points: list[tuple[float, float]] = []
    cursor = (0.0, 0.0)
    for cmd, args in re.findall(r"([MCZ])([^MCZ]*)", path):
        vals = [float(v) for v in nums.findall(args)]
        if cmd == "M":
            cursor = (vals[0], vals[1])
            points.append(cursor)
        elif cmd == "C":
            for i in range(0, len(vals), 6):
                p1, p2, p3 = (
                    (vals[i], vals[i + 1]),
                    (vals[i + 2], vals[i + 3]),
                    (vals[i + 4], vals[i + 5]),
                )
                # 8 segments per curve. The path already carries ~90 curves, so
                # the flattened outline lands well under a pixel of error at 4x.
                for s in range(1, 9):
                    t = s / 8
                    u = 1 - t
                    points.append(
                        (
                            u**3 * cursor[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                            u**3 * cursor[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1],
                        )
                    )
                cursor = p3
    return points


BODY = _body_polygon()


def _draw(size: int, *, background: tuple[int, ...] | None, fill_ratio: float, monochrome: bool = False) -> Image.Image:
    """Render the mark at `size`, occupying `fill_ratio` of the canvas."""
    px = size * SS
    img = Image.new("RGBA", (px, px), (*background, 255) if background else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    scale = px * fill_ratio / BODY_SPAN
    cx = cy = px / 2

    def to_px(pts, dx=0.0, dy=0.0, grow=1.0):
        """Project viewBox points to pixels, optionally scaled about the centre.

        `grow` is how the outline is drawn: a filled copy of the silhouette a
        little larger than the body, rather than Pillow's polygon stroke.
        Stroking a flattened Bezier puts a mitre at every one of the ~700
        vertices, and at this width they show as hairline spikes all the way
        round the edge.
        """
        return [(cx + (x * grow + dx) * scale, cy + (y * grow + dy) * scale) for x, y in pts]

    def eye(dx: float) -> tuple[float, float, float, float]:
        w, h = EYE_W * EYE_SCALE * scale / 2, EYE_H * EYE_SCALE * scale / 2
        ex, ey = cx + dx * scale, cy + EYE_Y * scale
        return (ex - w, ey - h, ex + w, ey + h)

    grow = (BODY_SPAN + OUTLINE * 2) / BODY_SPAN

    if monochrome:
        # Android tints this layer, so it is a silhouette with the eyes punched
        # out. White is the convention for the un-tinted source.
        d.polygon(to_px(BODY, grow=grow), fill=(255, 255, 255, 255))
        for dx in (-EYE_X, EYE_X):
            d.rounded_rectangle(eye(dx), radius=EYE_W * EYE_SCALE * scale / 2, fill=(0, 0, 0, 0))
        return img.resize((size, size), Image.LANCZOS)

    d.polygon(to_px(BODY, SHADOW_OFFSET, SHADOW_OFFSET, grow), fill=(*SHADOW, 255))
    d.polygon(to_px(BODY, grow=grow), fill=(*CREAM, 255))
    d.polygon(to_px(BODY), fill=(*ORANGE, 255))
    for dx in (-EYE_X, EYE_X):
        d.rounded_rectangle(eye(dx), radius=EYE_W * EYE_SCALE * scale / 2, fill=(*INK, 255))

    return img.resize((size, size), Image.LANCZOS)


def save(img: Image.Image, path: Path, *, opaque: bool = False) -> None:
    if opaque:
        # An App Store icon with an alpha channel is rejected outright, so the
        # ink ground is flattened in rather than left as a transparent-backed
        # composite that happens to look right.
        flat = Image.new("RGB", img.size, INK)
        flat.paste(img, mask=img.split()[3])
        img = flat
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)
    print(f"  {path.relative_to(ROOT)}  {img.size[0]}x{img.size[1]}  {img.mode}")


def main() -> None:
    print("mobile:")
    # iOS and the store: full bleed, no alpha.
    save(_draw(1024, background=INK, fill_ratio=0.70), MOBILE / "icon.png", opaque=True)

    # Android adaptive. The foreground must keep its mark inside the central
    # 66/108 of the canvas, because launchers mask the rest away and some of
    # them animate the two layers apart.
    save(Image.new("RGBA", (1024, 1024), (*INK, 255)), MOBILE / "android-icon-background.png")
    save(_draw(1024, background=None, fill_ratio=0.50), MOBILE / "android-icon-foreground.png")
    save(_draw(1024, background=None, fill_ratio=0.50, monochrome=True), MOBILE / "android-icon-monochrome.png")

    # Splash. The screen's own background is #0E0E0E (app.json), so this is
    # transparent and sized to sit comfortably rather than fill.
    save(_draw(1024, background=None, fill_ratio=0.62), MOBILE / "splash-icon.png")
    save(_draw(256, background=INK, fill_ratio=0.70), MOBILE / "favicon.png")

    print("site:")
    save(_draw(512, background=INK, fill_ratio=0.70), SITE / "icon.png")
    save(_draw(180, background=INK, fill_ratio=0.70), SITE / "apple-icon.png", opaque=True)
    # A stale .ico wins over icon.png in the app router, so it is regenerated
    # rather than left behind.
    ico = _draw(64, background=INK, fill_ratio=0.70)
    ico.save(SITE / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    print(f"  {(SITE / 'favicon.ico').relative_to(ROOT)}  16/32/48")

    print("lockup:")
    _emit_mark_path()


def _emit_mark_path() -> None:
    """Write the silhouette the site's inline mark draws.

    Emitted from here rather than pasted into the component so the wordmark's
    mark, the app icon and the mascot cannot end up as three slightly different
    squircles. The eye geometry is the icon's, not the mascot's, for the reason
    in this module's docstring.
    """
    raw = GEOMETRY.read_text()
    start = raw.index("export const BLOUB:")
    blob = raw[raw.index("{", start) :]
    depth = 0
    for i, ch in enumerate(blob):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                blob = blob[: i + 1]
                break
    body = json.loads(blob)["neutral"]["bodyMask"]

    ew, eh = EYE_W * EYE_SCALE / 2, EYE_H * EYE_SCALE / 2
    out = SITE_COMPONENTS / "bloub-path.ts"
    out.write_text(
        "// GENERATED by scripts/make_brand_assets.py. Do not hand-edit.\n"
        "//\n"
        "// The mark's silhouette, taken from the mascot's own geometry so the\n"
        "// wordmark, the app icon and Salli's face in the app stay one shape.\n"
        "// Coordinates are the mascot's -125..125 viewBox.\n\n"
        'export const BLOUB_VIEWBOX = "-125 -125 250 250";\n\n'
        f'export const BLOUB_BODY =\n  "{body}";\n\n'
        "/** Frontal eyes: the icon's layout, not any of the mascot's moods. */\n"
        "export const BLOUB_EYES = [\n"
        f"  {{ cx: {-EYE_X}, cy: {EYE_Y}, rx: {ew:.2f}, ry: {eh:.2f} }},\n"
        f"  {{ cx: {EYE_X}, cy: {EYE_Y}, rx: {ew:.2f}, ry: {eh:.2f} }},\n"
        "] as const;\n"
    )
    print(f"  {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
