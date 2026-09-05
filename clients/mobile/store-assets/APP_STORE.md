# App Store Connect — submission pack

Everything App Store Connect asks for, written out so it can be pasted rather
than reinvented. Character limits are Apple's; the counts in brackets are the
current copy and are checked by `scripts/check_store_metadata.py`.

App: **Salli** · bundle `lk.salli.app` · ASC app ID `6802071790`

---

## Listing

**Name** (30 max)

```
Salli
```

**Subtitle** (30 max)

```
Double-entry money and tax
```

**Promotional text** (170 max, editable without a new build)

```
Not another expense tracker. Salli keeps real double-entry books, works out your Sri Lankan tax with a rules engine, and gives you an AI that can read all of it.
```

**Keywords** (100 max, comma separated, no spaces after commas)

```
tax,IRD,Sri Lanka,LKR,budget,ledger,double entry,net worth,FIRE,expenses,accounting,APIT,savings
```

**Description** (4000 max)

```
Most money apps sort your spending into categories and stop there. Salli keeps
books.

Every entry has two sides. Money leaves one account and arrives in another, and
Salli records both. That is what double-entry means, and it is why the numbers
add up: your balance sheet balances, your net worth reconciles, and nothing
quietly goes missing into a category called "other".

WHAT YOU GET

A real ledger. Accounts, journal entries, debits and credits. Posted entries are
never edited. A correction is a reversing entry, so your history stays honest.

Sri Lankan tax, computed. A rules engine applies the IRD bands for the year,
takes off personal relief, and subtracts the tax already withheld from you as
APIT and AIT. Foreign service income is handled at its own flat rate. The
figures come from the engine, never from a language model.

Your Freedom number. How much invested capital would cover your spending, what
your savings rate and debt load are doing to it, and roughly when work becomes
optional.

The everyday things too. Budgets, debt payoff plans, a portfolio, insurance
cover, recurring subscriptions, reminders for filing dates, and statement
import.

AN AI THAT HAS READ YOUR BOOKS

Salli AI can see your ledger, your tax position and your goals. Ask why your tax
bill is what it is, or what you spent most on, and it answers from your actual
entries rather than from a guess. It explains and drafts. It never computes your
tax: that is the engine's job, and the two are kept apart on purpose.

YOUR DATA

Export everything as one JSON file, whenever you like. Delete everything, and it
is gone. Bring your own AI key if you would rather pay your provider directly.
No ads, no trackers, and nothing sold to anyone.

Built in Sri Lanka, for rupees and the IRD calendar.

Salli gives planning estimates, not financial advice, and is not a substitute
for a chartered accountant.
```

**What's New** (4000 max, per release)

```
Salli AI now opens as a sheet over the rest of the app, so you can ask a
question without losing your place.

Tax accounts carry their role explicitly, which means APIT and AIT credits are
applied correctly to your bill. Renaming an account no longer clears that role.

Shorter, plainer writing throughout.
```

---

## URLs

| Field | Value |
|---|---|
| Marketing URL | `https://salli.leafmonkey.org/` |
| Support URL | `https://salli.leafmonkey.org/support/` |
| Privacy Policy URL | `https://salli.leafmonkey.org/privacy/` |

All four legal pages return 200 (`/privacy/`, `/terms/`, `/support/`, `/security/`).
Apple follows redirects, but paths are given with the trailing slash the site
canonicalises to.

---

## App Privacy (the nutrition label)

These answers match `ios.privacyManifests` in `app.json`, which is what the
binary actually declares. **Keep the two in step**: a build that declares one
thing and a label that claims another is a review question waiting to happen.

**Does the app collect data?** Yes.
**Do you use data for tracking?** No. There is no advertising SDK, no analytics
SDK, and no tracking domains.

| Data type | Collected | Linked to user | Tracking | Purpose |
|---|---|---|---|---|
| Email address | Yes | Yes | No | App Functionality |
| User ID | Yes | Yes | No | App Functionality |
| Other financial info | Yes | Yes | No | App Functionality |
| Purchase history | Yes | Yes | No | App Functionality |
| Other user content | Yes | Yes | No | App Functionality |
| Photos or videos | Yes | Yes | No | App Functionality |

Why each one:

- **Email address** — the account itself. Supabase auth.
- **User ID** — the Supabase subject, also used as RevenueCat's `app_user_id`.
- **Other financial info** — the ledger. Accounts, entries, balances, budgets,
  debts, holdings, insurance, and the tax computation. This is the product.
- **Purchase history** — credit-pack purchases, through RevenueCat.
- **Other user content** — saved documents, agent conversations, bug reports.
- **Photos or videos** — only a screenshot the user chooses to attach to a bug
  report. The app never browses the library, which is what
  `NSPhotoLibraryUsageDescription` says.

Not collected: location, contacts, health, browsing history, search history,
advertising identifiers, sensitive info.

---

## Age rating

Expected **4+**. The questionnaire answers are None/No throughout: no violence,
no sexual content, no profanity, no horror, no gambling, no contests, no drugs
or alcohol references, no medical or treatment information.

Two that need thought rather than a reflex "no":

- **Unrestricted web access** — the app opens external links (billing portal,
  the marketing site, support) via `expo-web-browser`. These are fixed
  destinations, not a general browser. Answer **No**.
- **User-generated content shared with others** — Salli has no social surface.
  Nothing a user writes is visible to another user. Answer **No**.

---

## In-app purchases

Three **consumable** credit packs, defined in `clients/mobile/lib/purchases.ts`
and sold through RevenueCat:

| Product ID | Credits | Conversations | Price (USD) |
|---|---|---|---|
| `lk.salli.app.credits.10k` | 10,000 | 50 | **$1.99** |
| `lk.salli.app.credits.25k` | 25,000 | 125 | **$4.49** |
| `lk.salli.app.credits.60k` | 60,000 | 300 | **$9.99** |

Prices are derived, not chosen by feel: see UNIT_ECONOMICS.md. A conversation
costs 200 credits, and 200 is the cheapest rate at which the $1.99 pack stays
profitable without prompt caching and at the worse 30% commission.

**Status: all three are configured in App Store Connect** (2026-09-05). Prices
verified after reload; US proceeds confirm the 15% Small Business rate.

| Product | Apple ID | Price was | Price now | Proceeds |
|---|---|---|---|---|
| 10k | 6807270257 | $4.99 | **$1.99** | $1.69 |
| 25k | 6807270410 | $9.99 | **$4.49** | $3.82 |
| 60k | 6807270523 | $19.99 | **$9.99** | $8.49 |

App Store Localization (English U.S.) as entered. **The description field is
capped at 55 characters**, which is far shorter than it looks in the docs, so
the copy is written to fit rather than truncated:

| Product | Display name (35 max) | Description (55 max) |
|---|---|---|
| 10k | 10,000 AI Credits | About 50 conversations. Credits never expire. |
| 25k | 25,000 AI Credits | About 125 conversations. Credits never expire. |
| 60k | 60,000 AI Credits | About 300 conversations. Credits never expire. |

Review notes are filled on all three, explaining the credit rate, the path to
the purchase (Settings > Plan), and that no purchase is needed to exercise the
app.

**Still outstanding: the review Screenshot on each product.** It is the one
required field left, and it needs an image of the purchase UI, which means a
capture of Settings > Plan from the simulator. Apple rejects IAPs submitted
without it.

Two things App Store Connect says that shape the plan:

- "Your first consumable in-app purchase must be submitted with a new app
  version." The packs cannot ship on their own; they ride with the 1.0
  submission.
- The app is still at **1.0 Prepare for Submission**, so nothing has been
  submitted yet despite builds 21 to 23 being uploaded.

Before submitting, each must be:

1. Created in App Store Connect with the exact product ID above, type
   **Consumable**, with a price tier, a display name, a review screenshot and a
   description.
2. Attached to the version being submitted. A first submission reviews the app
   and its IAPs together; an IAP left in "Ready to Submit" but not attached is
   simply not reviewed.
3. Backed by an active **Paid Applications Agreement**. Until that is signed and
   the bank and tax forms are complete, products stay in "Developer Action
   Needed" and cannot be reviewed.

Credits are consumed at 200 per AI message (`CREDITS_PER_MESSAGE`). The Free plan
includes 30,000 credits a month, about 150 conversations, so the packs extend
rather than unlock: the app is fully usable without a purchase, which is the
answer to give if review asks.

---

## App Review notes

Paste into "Notes" on the version.

```
Salli is a personal finance app for Sri Lanka. It keeps a double-entry ledger
and computes income tax against the IRD 2025/26 rate bands.

DEMO ACCOUNT
The demo account is pre-loaded with a full year of entries, a budget, debts, a
portfolio, insurance policies and a computed tax return, so every screen has
real data. Sign in with the email and password supplied in the demo account
fields above. No other setup is needed.

WHERE TO LOOK
- Home: net worth and this month's budget.
- Ledger > Journal: tap any entry to see both sides of it, debit and credit.
- More > Reports > Balance sheet: assets, liabilities and equity.
- More > Tax: the IRD band breakdown and the credits applied.
- Freedom: the financial independence projection.
- Salli (tab): the AI assistant. It reads the account's own ledger and tax
  position to answer. It requires network access.

IN-APP PURCHASES
The three credit packs are consumables that top up AI usage. The account already
has credits, so no purchase is required to exercise any feature.

NOTES
Figures are planning estimates, not a filed tax return, and the app says so on
the Tax screen. The tax numbers come from a deterministic rules engine, not from
the language model. Salli does not provide financial advice and holds no funds.
```

**Demo account**: the reviewer needs a working email and password. Use an
address you are willing to have in Apple's records, not a disposable one, and
seed it with `scripts/seed_dev_data.py`. See BACKLOG.md, which notes the current
seeded account uses a throwaway address that is visible in the `07-settings`
screenshot.

**Sign-in required**: yes. Tick "Sign-in required" and fill the demo fields.

---

## Screenshots

Generated by `scripts/make_store_previews.py` from real captures.

| Device | Size | Path |
|---|---|---|
| iPhone 6.9" | 1320 x 2868 | `salli-mobile-app-screenshots/iphone-6.9-preview/` |
| iPad 13" | 2064 x 2752 | `salli-mobile-app-screenshots/ipad-13-preview/` |

Seven panels each, in narrative order: home, entry, balance sheet, tax, freedom,
Salli AI, settings. Upload in that order; the first three are what most people
see.

iPad screenshots are required because `ios.supportsTablet` is `true`. Dropping
tablet support would remove that requirement, but the app does adapt to the
larger layout, so it is worth keeping.

---

## Pre-submission checklist

- [ ] IAP products created, priced, and attached to the version
- [ ] Paid Applications Agreement active
- [ ] Demo account created with a presentable address, seeded, and verified by
      signing in on a clean device
- [ ] App Privacy answers entered to match the table above
- [ ] Age rating questionnaire completed
- [ ] Screenshots uploaded for both device sizes
- [ ] Description, keywords, subtitle, promotional text entered
- [ ] Support and privacy URLs reachable (they are, as of 2026-09-05)
- [ ] Build uploaded and processed, then selected on the version
- [ ] Export compliance: `ITSAppUsesNonExemptEncryption` is already `false` in
      `app.json`, so no annual self-classification report is needed
