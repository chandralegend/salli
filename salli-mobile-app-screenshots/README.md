# App Store screenshots

Captured from build `a276019` (the Salli-as-a-sheet redesign) on iOS 26.5
simulators, at the two sizes App Store Connect requires.

| Folder | Contents | Pixels |
|---|---|---|
| `iphone-6.9-preview/` | **Upload these.** Composed marketing panels | 1320 x 2868 |
| `ipad-13-preview/` | **Upload these.** Composed marketing panels | 2064 x 2752 |
| `iphone-6.9/` | Raw captures, the source art | 1320 x 2868 |
| `ipad-13/` | Raw captures, the source art | 2064 x 2752 |

The `-preview` folders are what goes to App Store Connect. The raw folders are
kept so the panels can be rebuilt without redoing the capture session.

## The preview panels

Built by `scripts/make_store_previews.py`. Re-run it after replacing any raw
capture and the panels regenerate.

They use the app's own visual language pushed to a marketing register:

- **A ticker band** in accent with ink edges and repeating mono text, sitting
  at a constant height on every panel. A hairline rule read as generic; this is
  the brutalist form of the same connecting idea, and it still lines up across
  panels when the row is scrolled.
- **A number sticker**, accent fill with an ink border and a hard offset
  shadow, rotated four degrees. Everything else is square to the grid, so the
  rotation reads as intent rather than as a mistake.
- **Mono chips** under each sub-line, drawn as the app's own `Chip`: the
  specifics a headline cannot carry (IRD 2025/26, DR / CR, MCP).
- **Registration marks** at the four corners, the printer's marks that were
  never meant to be seen, left visible.
- **Lavender ground on panel 02 only.** Lavender is the AI colour in
  `lib/theme.tsx`, so the one panel about the AI is the one panel that gets
  it. Colour by meaning, not by rhythm.

Two things tie the seven together:

- **The headlines run on.** "Your money, in plain sentences." / "Then ask it
  anything." / "It knows Sri Lankan tax." / "And when work becomes optional."
  / "All on a real double-entry ledger." / "With budgets that say what is
  left." / "And everything else." Each still stands alone, because the App
  Store shows them one at a time as well as in a row.
- **The ticker band** aligns across every gap.

The build fails rather than shipping a clipped headline: the number sticker
shares a row with the first headline line, so `build()` measures that line and
raises if it would run underneath. "With budgets that" was clipped that way in
an earlier pass.

Filenames are numbered in upload order. App Store Connect shows the first
three most prominently, so the sentence-led dashboard, Salli's face, and the
tax breakdown lead.

1. `01-home` Net worth and spend as sentences
2. `02-salli-ai` Salli presented as a sheet over Pro Mode
3. `03-tax` Sri Lanka tax bands with the marginal band marked
4. `04-freedom` Freedom score and what moves it
5. `05-ledger` Chart of accounts
6. `06-budget` Category limits
7. `07-more` Everything else, as a tile grid

## Capture notes

Status bar pinned via `simctl status_bar override` to 09:41, full signal,
full battery, so the chrome is identical across all 14 images.

The Ledger shot uses the **Accounts** tab, not Journal. The seeded demo data
contains duplicate journal entries (an artefact of running
`scripts/seed_dev_data.py` with `SEED_SKIP_CLEAR=1`, which appends instead of
clearing), and Journal showed every entry twice. Reminders has the same
problem and is unusable for a screenshot until the data is reseeded. This
matters beyond screenshots: the App Review demo account needs clean data.

Both sets come from the Debug simulator build. The UI is identical to Release
since it is the same JS bundle, but the provenance is worth knowing.

`_archive-pre-redesign/` holds the previous 19 screenshots. They are stale:
they show a Freedom "Mentor" tab and a Tax "Deductions" tab that no longer
exist, and More as a list rather than a grid. Kept only as a record of the
old design.
