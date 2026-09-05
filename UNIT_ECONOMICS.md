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

Consequences at today's numbers:

- **Free tier**: 600 conversations x $0.02 = **~$12 of inference given away per
  active free user, per month.**
- **Pro**: 10,000 conversations x $0.02 = **~$200/month to serve, sold for $29.**
  Every heavy Pro subscriber loses about $170 a month.

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

Caching alone still leaves a ~3.5x gap. The rate itself is wrong. Changing
`ACTION_AGENT_MESSAGE` from **10 credits to 100** (`domain/billing/credits.py`)
divides every allowance by ten and makes the whole ladder work:

| | Conversations | Cost (cached) | Price | Net at 15% | Margin |
|---|---|---|---|---|---|
| Free | 60/mo | $0.60 | $0 | - | acceptable acquisition cost |
| Pro | 1,000/mo | $10 | $29 | $24.65 | **59%** |
| 10k pack | 100 | $1.00 | $4.99 | $4.24 | **76%** |
| 25k pack | 250 | $2.50 | $9.99 | $8.49 | **71%** |
| 60k pack | 600 | $6.00 | $19.99 | $16.99 | **65%** |

That is a normal consumer ladder with healthy margin, and 60 free conversations
a month (two a day) is still a generous free tier.

The cost is honesty in the copy: Free becomes "around 60 conversations a month"
and Pro "around 1,000", not 600 and 10,000. Those strings live in
`domain/billing/plans.py` and on the pricing page.

### A third, free lever: stop paying for the stall

The agent currently ends its first turn on "Let me check your ledger…" without
answering (see BACKLOG.md, P1). That wasted turn is **a fully billed set of model
calls that produces no answer**, and the user has to ask again to get one. Fixing
it removes close to a whole conversation's cost from every first question. It is
a correctness bug and a cost bug at once.

---

## Recommended sequence

1. **Do not create the IAP products at a price yet.** Settle the rate first; the
   price follows from it, and changing a live IAP price is far more annoying
   than choosing it once.
2. **Instrument `response.usage`** on every agent call and log input, output,
   cache-read and cache-write tokens. Everything above rests on a `chars / 4`
   estimate and a 3-to-5-call guess. One day of real traffic replaces both with
   measurements, and the same logging proves whether caching is working.
3. **Add prompt caching** to the system prompt and tool definitions. Verify with
   `usage.cache_read_input_tokens`.
4. **Fix the first-turn stall.** It is roughly a 2x cost multiplier on first
   questions.
5. **Re-rate the credit** (10 -> 100) and update the plan copy and the pricing
   page together.
6. **Then** create the three consumables at $4.99 / $9.99 / $19.99.

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
