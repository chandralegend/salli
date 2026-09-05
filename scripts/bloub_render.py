#!/usr/bin/env python3
"""
Render Bloub, the app's face, as a PIL image.

The geometry is the app's own: `components/agent/bloub-geometry.ts` is parsed
at build time rather than the shape being redrawn by hand, so the marketing
face and the shipped face cannot drift apart.

Two shapes per mood:

- The body is a single closed path of cubic beziers, flattened to a polygon.
- Each eye is a capsule described with elliptical arcs. Arcs are not worth a
  parser here: every eye is a rounded rectangle whose corner radius is half its
  width, so the path's own coordinates give the box and the radius directly.
  The eye then takes the rotation out of its 2x2 matrix, which for every mood
  in the catalogue is a few degrees, and sits at the midpoint of its drift.
"""

from __future__ import annotations

import json
import math
import pathlib
import re

from PIL import Image, ImageDraw

GEOMETRY = (
    pathlib.Path(__file__).resolve().parents[1]
    / "clients/mobile/components/agent/bloub-geometry.ts"
)

#: The viewBox every mood shares, from BLOUB_VIEWBOX.
VIEW = (-125.0, -125.0, 250.0, 250.0)

NUM = re.compile(r"-?\d*\.?\d+(?:e-?\d+)?")


def load_moods() -> dict:
    """Pull the BLOUB record out of the TypeScript source.

    The object is JSON-shaped (the file is generated), so the body of the
    record parses directly once the TypeScript wrapper is stripped.
    """
    src = GEOMETRY.read_text()
    start = src.index("export const BLOUB", 0)
    start = src.index("{", start)
    depth, i = 0, start
    while i < len(src):
        if src[i] == "{":
            depth += 1
        elif src[i] == "}":
            depth -= 1
            if depth == 0:
                break
        i += 1
    return json.loads(src[start : i + 1])


def _cubic(p0, p1, p2, p3, steps: int):
    for s in range(1, steps + 1):
        t = s / steps
        u = 1 - t
        yield (
            u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
            u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
        )


def flatten(d: str, steps: int = 18) -> list[tuple[float, float]]:
    """Flatten an M/C/Z path into a polygon."""
    pts: list[tuple[float, float]] = []
    cur = (0.0, 0.0)
    for cmd, body in re.findall(r"([MCZmcz])([^MCZmcz]*)", d):
        vals = [float(v) for v in NUM.findall(body)]
        if cmd in "Mm":
            cur = (vals[0], vals[1])
            pts.append(cur)
        elif cmd in "Cc":
            for k in range(0, len(vals), 6):
                p1 = (vals[k], vals[k + 1])
                p2 = (vals[k + 2], vals[k + 3])
                p3 = (vals[k + 4], vals[k + 5])
                pts.extend(_cubic(cur, p1, p2, p3, steps))
                cur = p3
    return pts


def render(mood: str, size: int, body_fill: tuple[int, int, int],
           eye_fill: tuple[int, int, int], moods: dict | None = None) -> Image.Image:
    """Bloub at `size` pixels square, on a transparent ground, supersampled 4x."""
    moods = moods or load_moods()
    g = moods[mood]
    SS = 4
    px = size * SS
    scale = px / VIEW[2]

    def to_px(x: float, y: float) -> tuple[float, float]:
        return ((x - VIEW[0]) * scale, (y - VIEW[1]) * scale)

    img = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    ImageDraw.Draw(img).polygon([to_px(x, y) for x, y in flatten(g["body"])], fill=body_fill)

    for eye in g["eyes"]:
        nums = [float(v) for v in NUM.findall(eye["d"])]
        xs, ys = nums[0::2], nums[1::2]
        w, h = max(xs) - min(xs), max(ys) - min(ys)
        # `linear` is [a, b, c, d]; the rotation is the angle of its first column.
        a, b = eye["linear"][0], eye["linear"][1]
        deg = math.degrees(math.atan2(b, a))
        # Midpoint of the animation, not an endpoint. `from` is one extreme of
        # the blink/drift cycle, which on `surprised` parks both eyes in a
        # corner and reads as a glitch rather than as an expression.
        tx = (eye["from"][0] + eye["to"][0]) / 2
        ty = (eye["from"][1] + eye["to"][1]) / 2

        ew, eh = max(2, round(w * scale)), max(2, round(h * scale))
        pad = max(ew, eh)
        tile = Image.new("RGBA", (ew + pad, eh + pad), (0, 0, 0, 0))
        ImageDraw.Draw(tile).rounded_rectangle(
            [pad // 2, pad // 2, pad // 2 + ew, pad // 2 + eh], radius=ew / 2, fill=eye_fill
        )
        tile = tile.rotate(-deg, resample=Image.BICUBIC)
        cx, cy = to_px(tx, ty)
        img.alpha_composite(tile, (round(cx - tile.width / 2), round(cy - tile.height / 2)))

    return img.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    moods = load_moods()
    names = list(moods)
    S = 220
    sheet = Image.new("RGB", (S * len(names), S + 40), (245, 243, 239))
    for i, m in enumerate(names):
        sheet.paste(render(m, S, (241, 90, 50), (245, 243, 239), moods), (i * S, 0),
                    render(m, S, (241, 90, 50), (245, 243, 239), moods))
    sheet.save("/tmp/bloub-moods.png")
    print("moods:", ", ".join(names))
