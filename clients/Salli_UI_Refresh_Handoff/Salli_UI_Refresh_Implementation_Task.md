# Salli UI Refresh - Implementation Task

**Scope:** Buddy Mode + Pro Mode UI refresh  
**Priority:** P0/P1 product UI implementation  
**Primary references:** `references/01_pro_home_dashboard.png` through `references/06_buddy_voice_mode.png`

> The screenshots are visual direction, not pixel-perfect implementation specs. The written requirements below take precedence where an AI-generated reference contains artifacts, inconsistent status-bar details, or an element that conflicts with the product behavior described here.

## 1. Objective

Refresh Salli so the product feels calm, modern, premium, and AI-native without becoming visually busy. Buddy Mode should feel like a focused conversation with an intelligent money companion. Pro Mode should remain information-rich, but with much lower perceived complexity and a more deliberate hierarchy.

Preserve existing business logic, financial data, account models, ledger behavior, permissions, and API integrations unless a UI state cannot be represented with the current interfaces. Prefer adapters/state mapping over rewrites.

## 2. Product architecture and navigation

- **Buddy Mode** is the AI-first conversational surface. It has no persistent Pro bottom navigation.
- **Pro Mode** contains the structured finance surfaces (Home, Ledger, Freedom, etc.) and uses a fixed bottom navigation bar.
- Preserve the current concept that **swiping left from Buddy Mode enters Pro Mode**. Avoid gesture conflicts with horizontal message content.
- The **Salli AI** item in Pro Mode should enter Buddy Mode directly.
- Do not show a hamburger menu on Buddy Mode.
- Do not show suggestion chips on the Buddy landing state.
- Do not use a mascot/smiley/character illustration. Salli is represented through typography, conversation, motion, and the brand mark.

## 3. Shared visual system

### 3.1 Color tokens

| Token | Value | Usage |
|---|---|---|
| `bg/base` | `#100F0E` | Warm charcoal app background |
| `surface/1` | `#1A1715` | Cards, rows, composer |
| `surface/2` | `#211B18` | Raised/active surfaces |
| `text/primary` | `#F5F2EF` | Primary text |
| `text/secondary` | `#8E8985` | Secondary labels |
| `brand/base` | `#F15A32` | Salli red-orange accent |
| `brand/bright` | `#FF784E` | Primary action/highlight |
| `brand/deep` | `#7B2A20` | Atmospheric glow |
| `stroke/subtle` | `rgba(255,255,255,0.08)` | Hairline borders |
| `bubble/agent` | `rgba(255,255,255,0.07)` | Agent message surface |
| `bubble/user` | `rgba(241,90,50,0.16)` | User message surface |

### 3.2 Background treatment

Use a warm charcoal base with **large blurred radial color fields**, not visible circles or hard gradient shapes. The glow should feel like ambient light entering the scene.

Recommended construction:

- radial field A: deep burnt red/orange, left-center, low opacity;
- radial field B: brighter red-orange, lower-right, medium opacity;
- optional field C: warm brown/burgundy near top-right at very low opacity;
- blur/falloff must be broad enough that no radial edge is readable.

Buddy Mode can use a stronger ambient glow. Pro Mode should use the same system at lower intensity so numbers stay dominant.

### 3.3 Typography and geometry

- Use the existing native/system sans-serif family.
- Maintain a strong hierarchy; avoid all-caps except small metadata labels.
- Base spacing scale: 4 / 8 / 12 / 16 / 20 / 24 / 32.
- Typical card radius: 18-22 px; large hero/composer radius: 26-32 px.
- Use 1 px subtle strokes sparingly. Avoid heavy glassmorphism, shadows, neon glows, or decorative outlines.
- Touch targets >= 44x44 pt.
- Do not hardcode screenshot dimensions; support existing device classes and safe areas.

## 4. Pro Mode - Home Dashboard

**Reference:** `references/01_pro_home_dashboard.png`

### Intent

Reduce perceived complexity while keeping core financial information glanceable. The page should feel like one hierarchy, not a stack of unrelated cards.

### Required hierarchy

1. Compact top controls: profile, month selector, notifications, settings.
2. **Net Worth** hero is the strongest element on the page.
3. Four supporting metrics: Income, Expenses, Tax, Freedom Score.
4. A compact action row with Upload (secondary) and Ask Salli AI (primary).
5. One low-emphasis affordability shortcut: "Can I afford this?"
6. Monthly Budget summary.
7. Accounts list.

### Complexity reduction rules

- Use fewer borders and less card chrome than the legacy UI.
- Treat the four metrics as one coherent 2x2 section rather than four visually unrelated widgets.
- Keep supporting copy short; do not repeat labels unnecessarily.
- Orange is reserved for selected/active/primary states, not every icon or label.
- Avoid strong background glows directly behind small text.

### Bottom navigation

Implement a **fixed, non-floating** bottom navigation bar attached to the viewport and safe area.

Items: Home / Ledger / Add / Salli AI / Freedom.

- No detached pill container.
- The central Add control may be circular and slightly taller, but remains visually anchored to the bar.
- Selected tab uses the brand red-orange. Unselected tabs use muted neutral color.
- Respect keyboard and safe-area behavior.

## 5. Pro Mode - Ledger

**Reference:** `references/02_pro_ledger.png`

Apply the same warm-dark visual system and the new fixed bottom navigation to Ledger without changing ledger semantics.

- Preserve Accounts / Journal / Income Statement structure.
- Keep search, sort, and filter chips compact.
- Prioritize entry title and amount; supporting debit/credit metadata should be quieter.
- Income/positive entries may use the brand accent, but do not use color as the only semantic cue.
- Keep rows easy to scan; reduce border noise and avoid oversized card containers.
- The add-entry action remains clearly available but should fit the same Pro navigation system.

## 6. Buddy Mode - Default / Welcome

**Reference:** `references/03_buddy_default.png`

### Required behavior

- Show one natural opening message from Salli near the bottom, directly above the composer.
- No suggestion buttons/chips.
- No hamburger menu.
- No mascot/smiley.
- Use a Messenger-like agent bubble: left aligned, max width about 72-78%, soft asymmetric corner/tail, no decorative side line.
- Composer is visually anchored at the bottom with add/attachment, microphone, and send affordances.
- Keep the body intentionally spacious.

Suggested initial copy can remain conversational, e.g. "Hey, I'm Salli. I'm here to help you feel more in control of your money. What's on your mind today?" Copy can be localized/changed by product later; do not hardwire design around a specific sentence length.

## 7. Buddy Mode - User Message + Thinking / Tool Activity

**Reference:** `references/04_buddy_tool_activity.png`

When Salli needs multiple internal checks, show progress as **human-readable activity**, not developer logs.

### Message layout

- User messages: right aligned, compact translucent brand-tinted bubble.
- Salli messages: left aligned neutral surface.
- Preserve a normal chat thread; tool activity is part of Salli's response area.

### Tool activity component

Represent each operation with:

- plain-language label (e.g. "Analyzing cash flow");
- short secondary status (e.g. "Scanning transactions");
- state indicator: queued / running / complete / failed;
- lightweight motion for running states;
- clear success state using icon + text, not color alone.

Do **not** expose raw tool names, tool-call JSON, internal IDs, chain-of-thought, or implementation details.

After all activity finishes, collapse or de-emphasize the progress rows and present Salli's final answer. The user should never be left with a permanent "thinking" panel after completion.

## 8. Buddy Mode - Approval Gate

**Reference:** `references/05_buddy_approval_gate.png`

Use an inline approval card/sheet in the conversation when Salli proposes an action that requires explicit user confirmation.

### Required content

- Clear title: "Approval needed" (or action-specific equivalent).
- One-sentence explanation of what Salli is about to do.
- Important fields from the backend payload, such as amount, source, destination, date/time.
- Secondary action for reviewing details.
- Primary explicit action such as "Approve transfer".

### Safety/behavior

- The financial action must **not execute** before explicit approval.
- Approval must be tied to the exact pending action payload and expire/invalidate if the underlying action changes.
- A user must retain a path to cancel/back out or continue the conversation without approval.
- Do not treat a generic "yes" in chat as approval unless the existing product policy explicitly supports that exact flow.
- After approve/cancel/failure, replace the pending state with a clear conversation result.

## 9. Buddy Mode - Voice Agent

**Reference:** `references/06_buddy_voice_mode.png`

Voice Mode is a dedicated interaction state with **no text input composer**.

### UI

- Keep the same warm radial background system.
- Use an abstract red-orange audio orb/waveform as the main focal point.
- Display a concise state label: Listening / Thinking / Speaking.
- Optional short live transcript/caption can appear below the orb, but the user does not type in this mode.
- Bottom controls: Mute, End, Speaker.

### State model

`idle -> listening -> thinking -> speaking -> listening`

- Listening: subtle breathing motion.
- Thinking: tighter/slower activity motion.
- Speaking: waveform responds to output amplitude where available.
- Respect Reduce Motion by substituting opacity/scale changes with minimal movement.

If a financial approval is required during voice mode, pause the action and surface the same explicit approval gate visually. Spoken conversation alone must not silently execute an approval-gated financial action.

## 10. Shared components to implement/refactor

Prefer reusable primitives instead of screen-specific one-offs:

- `SalliBackground` / ambient radial gradient layer
- `SurfaceCard`
- `ChatBubble` (agent/user variants)
- `ChatComposer`
- `ToolActivityList` + `ToolActivityRow`
- `ApprovalGateCard`
- `VoiceOrb`
- `ProMetricCard`
- `ProBottomNav`
- `AccountRow`
- compact `FilterChip`

Names are illustrative; align with the repo's existing conventions.

## 11. Data/state integration

Before coding, inspect the existing navigation, theme system, chat orchestration, tool execution events, approval model, and voice session model.

- Bind UI to real application state; do not ship fake timed tool states.
- If the backend currently exposes only coarse states, create a small presentation adapter and deterministic development fixtures rather than coupling UI directly to transport payloads.
- Preserve existing analytics/event tracking and add new events only where necessary (mode switch, approval shown, approval confirmed/cancelled, voice start/end).
- Keep financial values and account details sourced from existing models. Never hardcode screenshot values.

## 12. Accessibility and motion

- WCAG-appropriate contrast for text and controls.
- Dynamic type/text scaling where supported.
- Screen-reader labels for icon-only controls.
- Status changes in tool activity should be announced without spamming.
- Never rely on red-orange alone to communicate success, failure, or selection.
- Minimum 44x44 pt interactive targets.
- Respect Reduce Motion.

## 13. Acceptance criteria

**AC-01** Buddy landing state opens with a Salli message near the composer, no suggestion chips, no mascot, no hamburger menu.  
**AC-02** Buddy -> Pro left-swipe works without interfering with vertical chat scrolling.  
**AC-03** Pro Mode uses the warm charcoal + restrained radial red-orange visual system.  
**AC-04** Pro Home has a clear hierarchy led by Net Worth and lower visual density than the legacy screen.  
**AC-05** Pro bottom navigation is fixed to the bottom edge/safe area and is not a floating pill.  
**AC-06** Ledger adopts the same tokens/navigation without losing existing search/filter/journal behavior.  
**AC-07** User and agent messages use distinct Messenger-like left/right bubbles and remain readable over the gradient background.  
**AC-08** Tool activity shows human-readable running/completed/failed states and never exposes internal tool payloads or reasoning.  
**AC-09** Completed tool activity resolves into a normal final Salli response and does not remain indefinitely in a thinking state.  
**AC-10** Approval-gated actions cannot execute without explicit approval of the exact pending action.  
**AC-11** Approval gate shows the key action details and supports review/cancel/continue-conversation behavior.  
**AC-12** Voice Mode contains no text composer and supports Listening/Thinking/Speaking states plus Mute/End/Speaker controls.  
**AC-13** Existing financial data/business logic remains intact; screenshot amounts are not hardcoded.  
**AC-14** Layout works across supported phone sizes, keyboard states, and safe areas.  
**AC-15** Reduced Motion, screen-reader labeling, contrast, and touch-target requirements are met.

## 14. Suggested implementation sequence

1. Audit current theme, navigation, chat state, approval, and voice architecture.
2. Add shared design tokens and `SalliBackground`.
3. Replace Pro bottom navigation with the fixed version and migrate Home + Ledger to shared tokens.
4. Simplify Pro Home hierarchy and card treatment.
5. Refactor Buddy default chat layout and composer.
6. Add message bubble variants and real tool-activity state mapping.
7. Implement/re-skin the approval gate and bind it to existing action authorization.
8. Implement Voice Mode states and controls.
9. Add accessibility, motion-reduction, keyboard, and safe-area handling.
10. Add visual/state tests and regression checks for existing finance behavior.

## 15. Definition of done

- All acceptance criteria pass.
- No regression in account, ledger, budget, Freedom, or financial-action flows.
- Screens use shared tokens/components rather than duplicate styling.
- Tool/approval UI is driven by real app state or a clearly isolated adapter.
- No raw reasoning/tool payloads are exposed to users.
- Visual comparison against the reference images is reviewed on at least one small and one large supported phone size.
- Code is linted/formatted and existing test suite passes.

## 16. Reference image map

- `references/01_pro_home_dashboard.png` - Pro Mode Home visual direction and simplified hierarchy.
- `references/02_pro_ledger.png` - Pro Mode Ledger visual direction.
- `references/03_buddy_default.png` - Buddy default/welcome state.
- `references/04_buddy_tool_activity.png` - User message + thinking/tool activity state.
- `references/05_buddy_approval_gate.png` - Approval-gated financial action state.
- `references/06_buddy_voice_mode.png` - Voice-only AI interaction state.
