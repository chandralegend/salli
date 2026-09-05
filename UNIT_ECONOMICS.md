# Unit economics: what a conversation costs, and what the packs must sell for

Written 2026-09-05, while pricing the three iOS credit packs. The short version
is that the pack price is not the problem. **At the current credit rate no pack
price covers cost**, because a conversation is metered at roughly a tenth of
what it costs to serve.

Everything below is arithmetic over measured inputs. The one soft number is the
token count, and it is flagged where it matters.

---

## Inputs

**Model.** Pinned to Claude Haiku 4.5 (`domain/ai_models.py`), billed at
**$1.00 per million input tokens and $5.00 per million output tokens**.

**The stable prefix**, resent on every single model call:

| Piece | Size | Tokens (est.) |
|---|---|---|
| Manager system prompt | 5,481 chars | ~1,370 |
| Buddy system prompt | 5,904 chars | ~1,476 |
| Finance worker prompt | 1,028 chars | ~257 |
| Tax worker prompt | 1,202 chars | ~300 |
| Tool schemas (27 tools) | 8,915 chars of docstrings + signatures | ~2,230 |

A manager call therefore carries **~3,600 tokens before a single word of the
user's question**, their ledger, or any tool result.

> Token counts are `chars / 4`. The local `ANTHROPIC_API_KEY` is a placeholder
> and there is no `ant` CLI on this machine, so `messages.count_tokens` could
> not be called. The ratio is conventional for English prose and slightly
> *under*-counts JSON schema, so these are, if anything, optimistic.

**Calls per conversation.** This is a supervisor/worker architecture: a turn is
a manager call, delegation to a worker, tool results, and synthesis. The shipped
app reports "Checked 3 things" / "Checked 4 things" on a single question, so
3 to 5 model calls per user message is the realistic band, each one resending
the prefix plus the accumulated history and tool output.

**Hosting.** Render is on the **free** plan (`infra/Pulumi.prod.yaml:16`), which
sleeps. Supabase is on its own tier. Both are rounding errors next to inference
and are ignored below, but see the warning at the end about the free plan.

---

## What a conversation costs

| Scenario | Input tokens | Output tokens | Cost |
|---|---|---|---|
| One call, no history (floor) | 3,600 | 300 | **$0.0051** |
| 3 calls, light history | 14,400 | 900 | **$0.019** |
| 5 calls, fuller history | 28,000 | 1,750 | **$0.037** |

So **$0.02 to $0.04 per conversation**, with an absolute floor of $0.005 that a
single trivial call cannot go below.

## What the current plans imply

| Plan | Price | Credits | Conversations at 10 credits | Implied revenue per conversation |
|---|---|---|---|---|
| Free | $0 | 6,000/mo | 600 | $0 |
| Pro | $29/mo | 100,000/mo | 10,000 | **$0.0029** |

**The gap is 7x to 13x.** The business is priced as though a conversation costs
$0.0029; it costs $0.02 to $0.04. Note that even the *floor* of one trivial call
($0.0051) already exceeds the entire per-conversation budget.

Consequences at today's numbers, **at the ceiling**:

- **Free tier**: 600 conversations x $0.02 = ~$12 of inference per free user.
- **Pro**: 10,000 conversations x $0.02 = ~$200/month to serve, sold for $29.

> **An allowance is a ceiling, not a forecast.** Almost nobody consumes 100% of
> a metered plan, so these are worst-case exposures per user, not the expected
> blended cost. What actually decides whether a plan makes money is average
> consumption; what the ceiling decides is how much a single heavy user can
> cost you. Both matter, and they are different questions. The rate below is
> chosen so the *packs* are profitable outright, and so the ceiling is
> survivable rather than ruinous.

## Why no pack price fixes it

The packs inherit the same rate. To merely break even at Apple's commission
(15% under the Small Business Program, 30% otherwise, so net is 0.85x or 0.7x):

| Pack | Conversations | Cost to serve | Break-even price (15% commission) |
|---|---|---|---|
| 10,000 credits | 1,000 | ~$20 | **$23.50** |
| 25,000 credits | 2,500 | ~$50 | **$59** |
| 60,000 credits | 6,000 | ~$120 | **$141** |

Those are not consumer prices for a personal finance app, and they are
break-even, not profitable. **Do not set pack prices against the current rate.**

---

## The two levers

### 1. Prompt caching (free money, currently unused)

`grep -rn "cache_control" src/` returns **nothing**. There is no prompt caching
anywhere in the codebase.

The ~3,600-token prefix is the textbook case for it: a frozen system prompt and
a deterministic tool list, identical on every call, sitting at the front of the
request where caching requires it to be. Cache reads bill at ~0.1x input, so
that prefix drops from $0.0036 to ~$0.0004 per call. Cache writes cost 1.25x
once per five-minute window.

Rough effect: **a conversation falls from ~$0.02 to ~$0.010**, close to half.
Order matters here, and caching is the free win to take before any lever that
trades quality.

Two things must hold or the cache silently never hits: the prefix has to be byte
identical (render order is `tools` -> `system` -> `messages`, so nothing volatile
may precede it), and `usage.cache_read_input_tokens` has to be checked to prove
it. If that field stays zero across repeated calls, something in the prefix is
changing.

### 2. Re-rate the credit (the actual fix)

Caching alone still leaves a ~3.5x gap. The rate itself is wrong. **Settled at
200 credits per conversation**, up from 10.

The rate is derived, not picked. The 10,000-credit pack is priced at **$1.99**,
which nets $1.69 after Apple's 15% commission. 200 is the cheapest rate at which
that pack is comfortably profitable *without* prompt caching and *at* the worse
30% commission — 100 credits would lose money on every pack sold today:

| Rate | 10k pack buys | Margin cached / today (15%) | Verdict |
|---|---|---|---|
| 100 | 100 conversations | 46% / **-12%** | loses money today |
| 150 | 67 conversations | 64% / 25% | thin at 30% commission |
| **200** | **50 conversations** | **73% / 44%** | **profitable in every case** |

The resulting ladder, with a mild volume discount:

| | Credits | Conversations | Price | Per conversation | Margin (15%) |
|---|---|---|---|---|---|
| 10k pack | 10,000 | 50 | **$1.99** | $0.0398 | 73% cached / 44% today |
| 25k pack | 25,000 | 125 | **$4.49** | $0.0359 (10% off) | 70% / 38% |
| 60k pack | 60,000 | 300 | **$9.99** | $0.0333 (16% off) | 67% / 33% |

Allowances are scaled to keep the plans' documented commitments intact, which
`tests/unit/domain/test_content_gating.py::TestFreeTierIntent` pins:

| | Credits/mo | Conversations | Cost at the ceiling |
|---|---|---|---|
| Free | 30,000 | 150 | $1.38 cached / $2.85 today |
| Pro | 500,000 | 2,500 | $23 cached / $47.50 today, vs $29 |

Free keeps its 150 messages, because the credit migration is not allowed to take
allowance away from existing users. Pro keeps 5x the heaviest observed real
usage (one production user hit exactly 500 and was capped rather than satisfied).

Two things follow from that Pro row:

- Pro costs **$0.0116 per conversation** against the 60k pack's $0.0333, so the
  subscription is clearly better value than topping up. That ordering is the
  right incentive and should be preserved if any of these numbers move.
- **Pro at its ceiling is underwater until caching lands** (-64% today, +21%
  cached). At a realistic 20% average consumption it is 67% today and 84%
  cached. Caching is therefore not optional before Pro is marketed hard.

### A third, free lever: stop paying for the stall

The agent currently ends its first turn on "Let me check your ledger…" without
answering (see BACKLOG.md, P1). That wasted turn is **a fully billed set of model
calls that produces no answer**, and the user has to ask again to get one. Fixing
it removes close to a whole conversation's cost from every first question. It is
a correctness bug and a cost bug at once.

---

## Recommended sequence

1. **Done:** the rate is settled at 200 credits per conversation and the
   allowances are scaled to match, so the packs can now be created at
   $1.99 / $4.49 / $9.99.
2. **Instrument `response.usage`** on every agent call and log input, output,
   cache-read and cache-write tokens. Everything above rests on a `chars / 4`
   estimate and a 3-to-5-call guess. One day of real traffic replaces both with
   measurements, and the same logging proves whether caching is working.
3. **Add prompt caching** to the system prompt and tool definitions. Verify with
   `usage.cache_read_input_tokens`.
4. **Fix the first-turn stall.** It is roughly a 2x cost multiplier on first
   questions.
5. **Done:** the credit is re-rated (10 -> 200), allowances scaled, and the plan
   copy and pricing-page FAQ updated in the same commit.
6. **Create the three consumables** at $1.99 / $4.49 / $9.99, product IDs
   `lk.salli.app.credits.10k` / `.25k` / `.60k`.
7. **Set `REVENUECAT_PRODUCT_CREDITS_10K/25K/60K`** on the Render service to
   those exact ids. They are absent from the workflow, the GitHub secrets and
   the Pulumi stack config; if they are unset the webhook verifies and then
   grants zero credits, because `revenuecat.py` drops empty keys.

## Two other things found while doing this

**The pricing page is stale.** `clients/site/src/app/pricing/page.tsx` still
tells users "every AI model" and "a conversation costs from 10 credits on Haiku
up to 100 on Fable, so the model you pick decides how far your credits go". Model
choice was removed and everything is pinned to Haiku. This is live marketing copy
that contradicts the shipped app, and it also happens to describe exactly the
100-credit rate recommended above.

**Render is on the free plan**, which sleeps after inactivity. A cold start is
tens of seconds. An App Store reviewer who opens the app against a sleeping API
may well conclude it is broken. Move to `starter` before submitting.
