#!/usr/bin/env python3
"""
Build App Store preview panels from raw screenshots.

The panels use the app's own visual language rather than a separate marketing
style: cream canvas, ink type, Archivo and JetBrains Mono, and every device
wearing the same 2px border and hard offset shadow that `components/ui/card.tsx`
puts on the app's own cards. The product and its store listing then look like
one thing, which is the cheapest kind of credibility.

Two devices connect the panels:

- The headlines run on from one another (`Then...`, `And when...`, `All on...`,
  `With...`), so scrolling the row reads as continuous prose rather than as
  seven unrelated claims. Each still stands alone, because the App Store also
  shows them one at a time.
- An accent rule sits at a constant height on every panel and runs edge to
  edge behind the device. Side by side the rule lines up across the gaps, so
  the row reads as a single strip; alone, it is still just a rule under a
  headline. It degrades to something sensible either way, which matters
  because the App Store shows these both ways.

Run:  uv run python scripts/make_store_previews.py
"""

from __future__ import annotations

import pathlib
from dataclasses import dataclass

from bloub_render import load_moods
from bloub_render import render as render_bloub
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parents[1]
SHOTS = ROOT / "salli-mobile-app-screenshots"
FONTS = (
    ROOT
    / "clients/mobile/node_modules/.pnpm/@expo-google-fonts+archivo@0.4.2"
    / "node_modules/@expo-google-fonts/archivo"
)
MONO = (
    ROOT
    / "clients/mobile/node_modules/.pnpm/@expo-google-fonts+jetbrains-mono@0.4.1"
    / "node_modules/@expo-google-fonts/jetbrains-mono"
)

# lib/theme.tsx, light palette.
CANVAS = (245, 243, 239)
INK = (0, 0, 0)
MUTED = (138, 135, 133)
ACCENT = (241, 90, 50)
MOODS = load_moods()
AI_GROUND = (203, 185, 255)  # --color-salli-ai, the AI lavender


@dataclass(frozen=True)
class Panel:
    shot: str
    headline: tuple[str, ...]
    sub: str
    #: Mono tags under the sub-line, drawn as the app's own `Chip`: a bordered
    #: badge, not a pill. They carry the specifics a headline cannot.
    chips: tuple[str, ...]
    #: Lavender is the AI colour in lib/theme.tsx, so the one panel about the
    #: AI is the one panel that gets it. Colour by meaning, not by rhythm.
    ai: bool = False
    #: Bloub's expression for this beat. He replaces a "03 / 07" counter as the
    #: throughline: you read the sequence off his face, which is both more
    #: characterful and more useful than a number.
    mood: str = "neutral"
    #: The crown goes on exactly one panel. One crown marks the protagonist;
    #: a crown on every panel is wallpaper.
    crown: bool = False
    #: What Bloub points at, as a fraction of the device box, plus what he says
    #: about it. Nobody can read a full screenshot in an App Store thumbnail,
    #: so each panel names one thing and aims at it.
    #:
    #: The vertical fraction is per device. The two screenshots frame the same
    #: screen very differently (the iPad fits the whole tax breakdown where the
    #: iPhone scrolls), so a single number lands on the right row for one and
    #: the wrong row for the other: 04-tax pointed at the 18% band on iPhone
    #: while claiming to mark the marginal one. Keyed by `DeviceSpec.folder`.
    callout: tuple[str, float, dict[str, float]] | None = None


#: The argument, in order. Not a feature tour: each beat earns the next.
#:
#:   premise -> the mechanism -> the position -> the local moat ->
#:   the payoff -> the differentiator -> the close
#:
#: The AI comes sixth on purpose. Leading with it is what every finance app
#: does and it reads as a wrapper around a chatbot; arriving after the ledger
#: and the tax engine, it lands as "this thing can see all of that", which is
#: both truer and stronger.
PANELS: tuple[Panel, ...] = (
    Panel("01-home", ("Your money", "deserves real books."),
          "Not another expense tracker. Double-entry, like a business runs.",
          ("NET WORTH", "SPEND", "TAX"),
          mood="neutral", callout=("Your position, in a sentence.", 0.5,
                             {"iphone-6.9": 0.165, "ipad-13": 0.094})),
    Panel("02-entry", ("Every rupee", "has two sides."),
          "Money never vanishes into a category. Both ends are always recorded.",
          ("DR / CR", "IMMUTABLE", "REVERSALS"),
          mood="attentive", callout=("Debit and credit, always equal.", 0.5,
                              {"iphone-6.9": 0.560, "ipad-13": 0.724})),
    Panel("03-balance", ("So you have a", "balance sheet."),
          "Assets, liabilities, equity. The things a company knows about itself.",
          ("ASSETS", "LIABILITIES", "EQUITY"),
          mood="curious", callout=("Net worth that reconciles.", 0.5,
                            {"iphone-6.9": 0.193, "ipad-13": 0.113})),
    Panel("04-tax", ("It knows", "Sri Lankan tax."),
          "A rules engine works the IRD bands. Never a guess from AI.",
          ("IRD 2025/26", "APIT", "AIT", "FSI"),
          mood="attentive", callout=("Your marginal band, marked.", 0.5,
                              {"iphone-6.9": 0.670, "ipad-13": 0.426})),
    Panel("05-freedom", ("And when work", "becomes optional."),
          "Your Freedom number, and the four things moving it.",
          ("FIRE", "4% RULE", "SCENARIOS"),
          mood="excited", callout=("Four drivers, scored.", 0.5,
                            {"iphone-6.9": 0.440, "ipad-13": 0.286})),
    Panel("06-salli-ai", ("An AI that reads", "your actual books."),
          "Not a chatbot with your budget pasted in. It queries the ledger itself.",
          ("CHAT", "VOICE", "TOOL-BACKED"),
          # No callout here. The crowned Bloub above already says what this
          # panel is about, and the arrow landed on the in-app face, which read
          # as pointing at nothing.
          ai=True, mood="excited", crown=True),
    Panel("07-settings", ("And it stays", "yours."),
          "Export everything. Delete everything. Bring your own AI key.",
          ("EXPORT", "DELETE", "OWN KEY", "NO ADS"),
          mood="shy", callout=("Your data, on your terms.", 0.5,
                        {"iphone-6.9": 0.650, "ipad-13": 0.420})),
)


@dataclass(frozen=True)
class Spec:
    """Layout for one output size. Every value is in output pixels."""

    folder: str
    width: int
    height: int
    margin: int
    eyebrow_size: int
    head_size: int
    head_leading: int
    sub_size: int
    head_top: int
    rule_y: int
    rule_h: int
    device_w: int
    device_top: int
    border: int
    shadow: int
    radius: int
    chip_size: int
    chip_pad: int
    chip_gap: int
    sticker: int
    sticker_num: int
    ticker_size: int
    mark: int
    mark_w: int
    bloub: int
    bubble_size: int
    bubble_pad: int


IPHONE = Spec(
    folder="iphone-6.9", width=1320, height=2868, margin=110,
    eyebrow_size=32, head_size=112, head_leading=126, sub_size=42,
    head_top=330, rule_y=810, rule_h=104,
    device_w=846, device_top=955, border=10, shadow=26, radius=50,
    chip_size=28, chip_pad=20, chip_gap=16,
    sticker=170, sticker_num=92, ticker_size=30, mark=70, mark_w=8,
    bloub=190, bubble_size=34, bubble_pad=26,
)

IPAD = Spec(
    folder="ipad-13", width=2064, height=2752, margin=190,
    eyebrow_size=40, head_size=140, head_leading=158, sub_size=52,
    head_top=360, rule_y=860, rule_h=120,
    # The frame is height-constrained, not width-constrained: any wider and the
    # tab bar falls off the bottom.
    device_w=1234, device_top=1035, border=12, shadow=30, radius=56,
    chip_size=32, chip_pad=24, chip_gap=18,
    sticker=200, sticker_num=108, ticker_size=34, mark=84, mark_w=9,
    bloub=230, bubble_size=40, bubble_pad=30,
)


def font(path: pathlib.Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius, fill=255)
    return mask


def wrap(draw: ImageDraw.ImageDraw, text: str, f, max_w: int) -> list[str]:
    """Greedy word wrap to `max_w` pixels.

    The sub-line used to be drawn as one unbroken run, so a long one simply
    walked off the right edge and lost its last words. The headline has a loud
    guard against running under Bloub; this is the same failure one line down.
    """
    lines: list[str] = []
    cur = ""
    for word in text.split():
        trial = f"{cur} {word}".strip()
        if not cur or draw.textlength(trial, font=f) <= max_w:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def crop_marks(draw: ImageDraw.ImageDraw, spec: Spec) -> None:
    """Printer's registration marks at the four corners.

    Brutalism borrows from print production: the marks that were never meant
    to be seen, left visible. They also frame a panel whose content is
    otherwise all top-left, without boxing it in the way a full border would.
    """
    m, L, w = spec.margin // 2, spec.mark, spec.mark_w
    W, H = spec.width, spec.height
    for x, y, dx, dy in ((m, m, 1, 1), (W - m, m, -1, 1), (m, H - m, 1, -1), (W - m, H - m, -1, -1)):
        draw.rectangle([min(x, x + dx * L), y - w // 2, max(x, x + dx * L), y + w // 2], fill=INK)
        draw.rectangle([x - w // 2, min(y, y + dy * L), x + w // 2, max(y, y + dy * L)], fill=INK)


def ticker(canvas: Image.Image, spec: Spec, f: ImageFont.FreeTypeFont) -> None:
    """The connecting band.

    A thin rule read as a hairline, which is the opposite of this design
    system. A 100px accent band with ink edges and repeating mono text is the
    brutalist form of the same idea, and it still lines up across panels.
    """
    y0, y1 = spec.rule_y, spec.rule_y + spec.rule_h
    d = ImageDraw.Draw(canvas)
    d.rectangle([0, y0, spec.width, y1], fill=ACCENT)
    d.rectangle([0, y0, spec.width, y0 + spec.mark_w], fill=INK)
    d.rectangle([0, y1 - spec.mark_w, spec.width, y1], fill=INK)

    unit = "SALLI   ///   AI-POWERED PERSONAL FINANCE   ///   BUILT FOR SRI LANKA   ///   "
    text = unit * 6
    tw = d.textlength(text, font=f)
    ty = y0 + (spec.rule_h - spec.ticker_size) // 2 - spec.ticker_size // 6
    x = -int(tw) % int(d.textlength(unit, font=f))
    while x < spec.width:
        d.text((x, ty), text, font=f, fill=(255, 255, 255))
        x += int(tw)


def crown(draw: ImageDraw.ImageDraw, cx: int, top: int, w: int, h: int) -> None:
    """A three-point crown, cut with straight lines rather than drawn smooth.

    Sits on exactly one Bloub. It is the oldest way to mark which figure in a
    picture is the one that matters, and it costs one polygon.
    """
    pts = [
        (cx - w / 2, top + h), (cx - w / 2, top),
        (cx - w / 4, top + h * 0.45), (cx, top - h * 0.12),
        (cx + w / 4, top + h * 0.45), (cx + w / 2, top),
        (cx + w / 2, top + h),
    ]
    draw.polygon(pts, fill=ACCENT, outline=INK)
    draw.line(pts + [pts[0]], fill=INK, width=max(3, h // 12), joint="curve")


def bubble(canvas: Image.Image, spec: Spec, text: str, anchor: tuple[int, int],
           target: tuple[int, int], f: ImageFont.FreeTypeFont) -> None:
    """Bloub's callout: a bordered box with a hard shadow and a ruled pointer.

    The pointer is the working part. An App Store thumbnail renders a 1320px
    screenshot at about 200px, where nothing on it is readable; naming one
    element and aiming at it is what makes a panel survive that.
    """
    d = ImageDraw.Draw(canvas)
    pad, b = spec.bubble_pad, spec.mark_w
    tw = int(d.textlength(text, font=f))
    w, h = tw + pad * 2, spec.bubble_size + pad
    x, y = anchor

    d.line([anchor, target], fill=INK, width=max(4, b // 2))
    head = max(14, b * 2)
    dx, dy = target[0] - x, target[1] - y
    n = max(1.0, (dx * dx + dy * dy) ** 0.5)
    ux, uy = dx / n, dy / n
    d.polygon([target,
               (target[0] - ux * head - uy * head * 0.5, target[1] - uy * head + ux * head * 0.5),
               (target[0] - ux * head + uy * head * 0.5, target[1] - uy * head - ux * head * 0.5)],
              fill=INK)

    bx, by = x - w // 2, y - h // 2
    d.rectangle([bx + b, by + b, bx + w + b, by + h + b], fill=INK)
    d.rectangle([bx, by, bx + w, by + h], fill=(255, 255, 255), outline=INK, width=b)
    d.text((bx + pad, by + (h - spec.bubble_size) // 2 - spec.bubble_size // 6),
           text, font=f, fill=INK)


def chips(draw: ImageDraw.ImageDraw, spec: Spec, y: int, labels: tuple[str, ...],
          f: ImageFont.FreeTypeFont) -> None:
    """The app's own Chip: a bordered mono badge, drawn at marketing scale."""
    x = spec.margin
    h = spec.chip_size + spec.chip_pad
    for label in labels:
        w = int(draw.textlength(label, font=f)) + spec.chip_pad * 2
        draw.rectangle([x, y, x + w, y + h], outline=INK, width=spec.mark_w // 2)
        draw.text((x + spec.chip_pad, y + (h - spec.chip_size) // 2 - spec.chip_size // 6),
                  label, font=f, fill=INK)
        x += w + spec.chip_gap


def build(spec: Spec, panel: Panel, index: int, total: int) -> Image.Image:
    src = SHOTS / spec.folder / f"{panel.shot}.png"
    ground = AI_GROUND if panel.ai else CANVAS
    canvas = Image.new("RGB", (spec.width, spec.height), ground)
    draw = ImageDraw.Draw(canvas)

    f_eyebrow = font(MONO / "700Bold/JetBrainsMono_700Bold.ttf", spec.eyebrow_size)
    f_chip = font(MONO / "700Bold/JetBrainsMono_700Bold.ttf", spec.chip_size)
    f_tick = font(MONO / "700Bold/JetBrainsMono_700Bold.ttf", spec.ticker_size)
    f_head = font(FONTS / "800ExtraBold/Archivo_800ExtraBold.ttf", spec.head_size)
    f_sub = font(FONTS / "400Regular/Archivo_400Regular.ttf", spec.sub_size)

    crop_marks(draw, spec)

    section = panel.shot.split("-", 1)[1].replace("-", " ").upper()
    draw.text((spec.margin, spec.head_top - int(spec.eyebrow_size * 3.1)),
              f"SALLI  ///  {section}", font=f_eyebrow, fill=MUTED)

    # Bloub occupies the top-right, on the same row as the first headline line.
    # A long first line runs under him and loses its last word, which is how
    # "With budgets that" shipped clipped in an earlier pass. Fail loudly.
    first_w = draw.textlength(panel.headline[0], font=f_head)
    bloub_left = spec.width - spec.margin - spec.bloub - spec.mark_w * 3
    if spec.margin + first_w > bloub_left:
        raise SystemExit(
            f"{panel.shot}: first headline line is {int(first_w)}px, which runs "
            f"under Bloub (he starts at {int(bloub_left - spec.margin)}px). "
            "Shorten it or move the break."
        )

    y = spec.head_top
    for line in panel.headline:
        draw.text((spec.margin, y), line, font=f_head, fill=INK)
        y += spec.head_leading

    y += int(spec.sub_size * 0.45)
    sub_lines = wrap(draw, panel.sub, f_sub, spec.width - spec.margin * 2)
    for line in sub_lines:
        draw.text((spec.margin, y), line, font=f_sub, fill=MUTED)
        y += int(spec.sub_size * 1.35)
    y += int(spec.sub_size * 0.55)

    # The chips are the last thing above the ticker band. Wrapping the sub-line
    # pushes them down, and on the iPad the gap is only a few pixels to begin
    # with, so a two-line sub there would sit on the rule.
    chips_bottom = y + spec.chip_size + spec.chip_pad
    if chips_bottom > spec.rule_y:
        raise SystemExit(
            f"{panel.shot} ({spec.folder}): the sub-line wraps to "
            f"{len(sub_lines)} lines, pushing the chips to {chips_bottom}px, "
            f"past the ticker at {spec.rule_y}px. Shorten the sub-line."
        )
    chips(draw, spec, y, panel.chips, f_chip)

    ticker(canvas, spec, f_tick)

    # Bloub, top-right, wearing this beat's expression. The eye colour tracks
    # the ground so he reads as cut from the panel rather than pasted on.
    face = render_bloub(panel.mood, spec.bloub, ACCENT, ground, moods=MOODS)
    fx = spec.width - spec.margin - spec.bloub
    fy = spec.head_top - int(spec.eyebrow_size * 3.4)
    canvas.paste(face, (fx, fy), face)
    if panel.crown:
        crown(draw, fx + spec.bloub // 2, fy - spec.bloub // 5,
              int(spec.bloub * 0.62), int(spec.bloub * 0.3))

    shot = Image.open(src).convert("RGB")
    dev_h = round(spec.device_w * shot.height / shot.width)
    shot = shot.resize((spec.device_w, dev_h), Image.LANCZOS)

    x = (spec.width - spec.device_w) // 2
    b, sh, r = spec.border, spec.shadow, spec.radius

    # Hard offset shadow in ink. Against the cream ground it reads as depth;
    # on the lavender AI panel it reads the same way, which is why the ground
    # changes but the shadow does not.
    shadow_box = Image.new("RGB", (spec.device_w + b * 2, dev_h + b * 2), INK)
    canvas.paste(shadow_box, (x - b + sh, spec.device_top - b + sh),
                 rounded_mask(shadow_box.size, r + b))

    frame = Image.new("RGB", (spec.device_w + b * 2, dev_h + b * 2), INK)
    frame.paste(shot, (b, b), rounded_mask(shot.size, r))
    canvas.paste(frame, (x - b, spec.device_top - b), rounded_mask(frame.size, r + b))

    if panel.callout:
        text, tx, ty_by_device = panel.callout
        ty = ty_by_device[spec.folder]
        target = (int(x + tx * spec.device_w), int(spec.device_top + ty * dev_h))
        # The bubble sits on the ticker band, which is dead space on every
        # panel and puts the pointer above whatever it names.
        bubble(canvas, spec, text, (spec.width // 2, spec.rule_y + spec.rule_h // 2),
               target, f_chip)

    return canvas


def main() -> None:
    for spec in (IPHONE, IPAD):
        out = SHOTS / f"{spec.folder}-preview"
        out.mkdir(exist_ok=True)
        for i, panel in enumerate(PANELS, 1):
            if not (SHOTS / spec.folder / f"{panel.shot}.png").exists():
                print(f"  skip {spec.folder}/{panel.shot}: no capture yet")
                continue
            img = build(spec, panel, i, len(PANELS))
            dest = out / f"{i:02d}-{panel.shot.split('-', 1)[1]}.png"
            img.save(dest)
            print(f"{dest.relative_to(ROOT)}  {img.width}x{img.height}")


if __name__ == "__main__":
    main()
