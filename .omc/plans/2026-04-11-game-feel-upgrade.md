# Game-Feel Upgrade Plan — Cost-Sim v1
**Date:** 2026-04-11
**Author:** Planner (senior game designer lens)
**Target app:** `CI-Course/projects/cost-sim-v1` (Next.js 14, TS, Zustand, reactflow, Framer)
**Reader profile:** One engineer + one product person. Korean learner-facing copy, English meta.

---

## 1. Game design diagnosis (1-5, honest)

Scoring is against the reviewed source, not hypothetical features. Cited files are load-bearing evidence, not decoration.

| Dimension | Score | Why |
|---|---|---|
| **Core loop clarity** | 2/5 | The sandbox (`app/(learn)/sandbox/page.tsx`) opens with a dagre tree, one slider, and a subtitle: *"슬라이더를 움직이면 트리의 영향 노드가 강조됩니다."* That is a UI hint, not a goal. A player who opens the screenshot (`sandbox-closed.png`) has no idea what *winning* means. The case route has a clearer loop (Hook → Discover → Apply → Reflect in `app/(learn)/cases/[caseId]/page.tsx`) but still no stakes — the Hook card in `components/Guided/Hook.tsx` is *just* a title, a scenario sentence, and an italic quote. |
| **Feedback intensity** | 3/5 | The best thing the app does today. `lib/store.ts` tracks `lastDelta` via `diff()` and feeds it into `CostTreeView` to pulse changed nodes, and `FormulaInspector` shows top-4 changed items with formulas. That is genuinely good micro-feedback on slider drags. But Apply's "correct" state is a small green pill with *"잘 따라오고 있어요"* — no celebration, no screen shake, no sound, no score tick. The peak reward moment of the entire loop is a 14-pixel check icon. |
| **Progression / mastery** | 1/5 | None. `store.ts` persists `guidedCompleted: Record<caseId, GuidedPhase[]>` and `reflectNotes` *only* in memory — no `persist` middleware, no localStorage, no profile. Reload the page and you are back to zero. There is no XP, no crown levels per variable, no mastery meter, no "you got Loading right 3 times in a row." The Reflect success card shows *"Case 1 완료"* and that's the extent of progression feedback. |
| **Challenge curve** | 2/5 | Six cases exist but are presented as a flat dropdown list (see `sandbox-dropdown-open.png`) — no recommended order in the UI, no difficulty stars, no gating. Content-wise there *is* a rough curve (case 1 = 1 variable, case 5 = 4 variables) but nothing in the UI signals "case 6 is harder than case 1." Tolerances on Apply answers are mostly 0.1, so every case feels the same weight-wise. |
| **Narrative stakes** | 1/5 | A scenario sentence like *"고객사 주문 급감으로 설비 Loading이 70%에서 50%로 떨어졌습니다"* is context, not stakes. There is no protagonist, no antagonist, no consequence for failing, no continuing thread between cases. Six cases = six unrelated textbook problems. The home screen (`home.png`) brands the app *"살아있는 원가 트리"* but nothing in the sandbox or cases earns that tagline. |
| **Juice & polish** | 2/5 | Framer Motion is wired (page transitions, AnimatePresence on feedback pills, the tree-node pulse in `CostTreeView`). But: no confetti, no sound, no haptics, no particles, no screen flash on correct answer, no counter-ticking animation on profit numbers, no camera-fly to the Apply node when the answer lands. The home page is three elements on a dark gradient and a `v1.0` badge (`home.png`) — it reads like a beta landing, not a product. |
| **Meta goals** | 1/5 | Zero. No streak, no daily challenge, no "come back tomorrow for a new crisis," no leaderboard (and you said no multiplayer, so I won't push). The only pull is "finish the 6 cases" and then the Reflect Trophy card sends you home. |
| **Agency / meaningful choices** | 2/5 | The slider gives mechanical agency (you can set any value), but Apply collapses back to "type the exact number the instructor already computed." That is not a choice, it is transcription. Cases 3, 4, 5 hint at trade-offs in the scenario text but never force the player to *choose* — you can always grind the hint and type the canonical number. |

**Overall: 14/40 = 35%.** The app is a well-built interactive textbook with a beautiful cost tree and a sincere 4-phase structure. What it lacks is *a reason for the player to care about the output*. Every failure-mode you called out is real. I don't disagree with a single item in your "what's missing" list except one: I'd push back that **"no difficulty curve"** is less important than you think at 6 cases. Fix stakes and feedback first — curve can piggyback on a survival meter.

---

## 2. Genre + reference framing

Three spiritual siblings worth stealing one mechanic from each. These are picked because the cost-tree is already a toy; we just need to reframe the toy as a puzzle with consequences.

**1. Mini Metro — single-resource pressure under compounding constraints.**
*One mechanic:* The week-ticker with escalating demand. Every week the map gets harder, and you spend the same limited pool of trains/lines on a growing problem. **Borrow:** A "quarter timer" that runs across all 6 cases — each case is one month, and your cumulative operating profit must stay above a survival line or the factory closes. Turns a flat case list into a bounded campaign.
*Why it fits cost-engineering:* Real cost innovation work is a budgeted trade-off under deadlines. Players learn *when* to cut, not just *what* to cut.

**2. Human Resource Machine — minimalist stars per puzzle, unlocked by constraint.**
*One mechanic:* Each puzzle can earn up to 3 stars: *solved*, *solved under speed par*, *solved under size par*. You can reach the next puzzle with 1 star, but the stars nag you to come back. **Borrow:** 3-star grading per case on *accuracy*, *fewest slider moves*, *no hint used*. Low pressure, high replay.
*Why it fits cost-engineering:* Rewards *understanding* (no hint) and *elegance* (few moves), not brute-forcing the answer box.

**3. Duolingo — streak + daily goal + crown leveling per skill.**
*One mechanic:* Per-skill crowns (Loading has a crown level that goes 0 → 5 as you re-clear variations). **Borrow:** A per-variable **mastery meter** (Loading, 인건비, 수율, 면취수, Mask, Tact) that grows when you correctly solve Apply for a case that touches that variable. Six variables × 5 levels = a lightweight replayable skill tree.
*Why it fits cost-engineering:* In real factories the *variable* is the thing you become an expert in ("the Loading guy", "the Mask guy"), not the case. Rewards the correct ontology.

**Rejected references:**
- *Factorio / Satisfactory* — too big, bundle-hostile, and the "tree as toy" is already in place.
- *Two Point Hospital* — the management-sim shell is tempting but the money-loop would eat the learning loop.
- *Kerbal Space Program* — sandbox-first, and you already have a sandbox; borrowing here would duplicate what works.

---

## 3. Prioritized mechanics (MUST / SHOULD / COULD)

Self-Determination Theory abbreviated as SDT: **A** = autonomy, **C** = competence, **R** = relatedness. Every mechanic must hit ≥1.

### MUST (ship or the upgrade fails) — 4 items

#### M1 — Quarter Campaign: 6 cases = 1 fiscal quarter
- **Why:** Turns a flat list into a bounded story. (SDT: **C** via visible progress; **R** via shared "save the factory" premise.) Cures the #1 and #5 diagnosis scores.
- **How:** New `content/campaign.json` with 6 months mapped 1:1 to cases in `CASE_ORDER`. New store slice `campaign: { month: 1..6, cumulativeProfit: number, survivalFloor: number }` added to `lib/store.ts`. The case page header (`app/(learn)/cases/[caseId]/page.tsx`) swaps "Case {idx+1}" for "**{month}월 · Q2**" and shows a thin cumulative-profit bar vs. the survival floor. Survival floor is computed once from the sum of reference profits × 0.6 (i.e. you must retain 60% of nominal to survive — tunable in the JSON).
- **Effort:** M (0.5 day content, 0.5 day store+UI)
- **Playwright:** After completing case 1, the case-2 page header shows *"2월"* and the campaign bar width > 0%. `page.locator('[data-test="campaign-bar"]').getAttribute('data-progress')` returns a number > 0.
- **Kill criteria:** If the survival floor causes >30% of playtesters to feel *stuck* (can't proceed), loosen or make it advisory-only. If players ignore the bar entirely (session recordings show zero hover/tap on the header), the metaphor isn't landing — replace with literal won/3-star count.

#### M2 — Per-case 3-star grading (accuracy · moves · hint-free)
- **Why:** Creates replay value without inflating scope. (SDT: **C** via mastery; **A** via how-you-earn-it optionality.) Cures diagnosis #7 and #8 — the player now has a *reason* to replay and genuine *choices* (burn a hint or grind it out).
- **How:**
  - Add to store: `caseScores: Record<caseId, { stars: 0-3, attempts: number, moves: number, hintUsed: boolean, bestAccuracy: number }>`.
  - In `components/Guided/Discover.tsx`, increment `moves` on every `setParams` call that crosses a threshold step (debounced 400 ms so slider-scrub ≠ 47 moves).
  - In `components/Guided/Apply.tsx`, on `feedback === "correct"` compute `accuracy = 1 - clamp(|answer - key| / tolerance, 0, 1)`, set `hintUsed = showHint`, derive stars: `star1 = correct`, `star2 = moves ≤ par` (par = `variables.length × 4`), `star3 = !hintUsed`.
  - Render 3 gold/gray star icons in the Reflect success card next to the existing Trophy.
- **Effort:** M (1 day)
- **Playwright:** Answer case 1 correctly on first try without opening hint, with ≤4 slider moves. Assert 3 stars rendered: `await expect(page.locator('[data-test="case-stars"] [data-filled="true"]')).toHaveCount(3)`.
- **Kill criteria:** If star 2 (moves par) is earned by >95% of players, the par is too loose. If <10% earn all 3, the par is too tight. Target band: 35-55% 3-star rate on second attempt.

#### M3 — Juice the correct-answer moment (confetti + count-up + SFX)
- **Why:** Makes the peak reward moment feel like a reward. (SDT: **C**.) Cures diagnosis #2 and #6.
- **How:** One file: `components/Guided/Apply.tsx`. On `setFeedback("correct")`:
  1. Trigger a `count-up` animation on the answer input using Framer's `animate()` from 0 → answer over 600 ms with `ease: [0.22, 1, 0.36, 1]`.
  2. Spawn a **CSS-only** confetti burst — 14 absolutely-positioned divs with randomized `transform` keyframes inside a new `components/ui/ConfettiBurst.tsx` (no library; ~1 KB).
  3. Play a 200 ms success chime via Web Audio API `OscillatorNode` (C5 → E5 → G5, triangle wave, 0.08 gain). Code lives in `lib/sound.ts` (new, ~40 LOC). No audio files, no bundle hit.
  4. Tiny haptic: `navigator.vibrate?.(12)` (mobile no-op on desktop).
- **Effort:** S (0.5 day)
- **Playwright:** Assert `ConfettiBurst` mounts — `await expect(page.locator('[data-test="confetti"]')).toBeVisible({ timeout: 1000 })` after clicking 확인 with the correct answer.
- **Kill criteria:** If the chime gets annoying within a 30-minute session (user reports, or we see them mute the tab), gate SFX behind a persistent toggle in the header. If confetti stutters on low-end classroom laptops (>30 ms frame time via `requestAnimationFrame` sampling), drop to 6 particles.

#### M4 — Persistence: quarter campaign + case stars survive reload
- **Why:** Without this, M1 + M2 are a lie. A player who refreshes loses everything. (SDT: **C** via *persistent* competence, **R** via "this is my factory".) Cures the other half of diagnosis #3.
- **How:** Add `zustand/middleware` `persist` to `lib/store.ts`, whitelisting: `campaign`, `caseScores`, `guidedCompleted`, `reflectNotes`, `profile` (new: `{ name?: string, createdAt: number, streak: number, lastPlayedDate: string }`). **Explicitly exclude** `params`, `result`, `lastDelta` — those are derived and will re-compute from the active case on mount. Key: `cost-sim-v1:profile:v1`. Version bump logic = discard on mismatch, not migrate (v1 is disposable).
  - **R9 risk:** `reflectNotes` is already client-only per the comment in `Reflect.tsx` line 12-13; localStorage is still client-only, so PIPA posture is unchanged. Document this explicitly in the store comment.
- **Effort:** S (0.5 day)
- **Playwright:** Complete case 1 → reload → assert case 1 still shows 3 stars and campaign bar still reflects month 1 progress.
- **Kill criteria:** If players share laptops (classroom setting) and complain about "someone else's progress," add a lightweight *이름 입력* modal on first load, keyed per-profile. If localStorage quota trips (implausible at <2 KB), fall back to sessionStorage.

### SHOULD (strong upgrades, ship if timeline allows) — 2 items

#### S1 — Variable Mastery Meter (Duolingo crowns, cost-engineering ontology)
- **Why:** Teaches the player that the *variables* are the unit of expertise, not the cases. (SDT: **C** per-skill, **A** which variable to level up.)
- **How:** New store field `variableMastery: Record<"loading"|"labor"|"yield"|"cuts"|"mask"|"tact", 0-5>`. Each case has an implied variable set (derivable from `caseDef.adapter` — e.g. `"loading"` → loading, `"cuts-mask"` → cuts+mask, `"material-yield"` → yield). On Apply-correct, the touched variables gain +1 mastery (capped at 5). Display: a 6-row bar in a new section of the home page (`app/page.tsx`) titled *"내 원가 감각"*, each row a variable and a 5-dot meter.
- **Effort:** M (0.75 day)
- **Playwright:** Complete case 1 Apply correctly → navigate to home → assert `[data-test="mastery-loading"]` has `data-level="1"`.
- **Kill criteria:** If players hit mastery 5 on everything by the end of one pass through 6 cases, the cap is too low — raise to 10 and add "crown" tier at 5. If the home page starts looking crowded (playtest: user scrolls past mastery without noticing), move to its own `/profile` route.

#### S2 — "The 60-Minute Crisis" narrative wrapper + Coach as CFO
- **Why:** Gives every Hook phase a protagonist and a stake. (SDT: **R** hard — the player is in a relationship with the CFO.)
- **How:**
  - Add `content/campaign.json` fields: `cfoBriefing: string` per month, `cfoReaction: { success: string, mid: string, fail: string }`.
  - `Hook.tsx` replaces the italic quote block with a *"CFO로부터 도착한 쪽지"* card — same layout, different chrome + a small avatar glyph.
  - `Reflect.tsx` success card pulls `cfoReaction` keyed off the star count (3→success, 2→mid, 0-1→fail).
  - One-time intro modal on first `/cases/01-loading` visit: 3-sentence premise (see §4).
- **Effort:** M (1 day — mostly writing)
- **Playwright:** On first Hook phase, assert `[data-test="cfo-note"]` visible with text matching `/CFO|본부장/`. On Reflect after 3-star, assert `[data-test="cfo-reaction"]` contains the expected success-tier string.
- **Kill criteria:** If playtesters roll their eyes at the narrative wrapper (classroom context — Korean engineers may find it cheesy), offer a "격식 모드" toggle that swaps it for a neutral "보고서" framing. Content stays, chrome changes.

### COULD (defer to v1.1 unless budget appears) — 2 items

#### C1 — Daily Challenge: randomized scenario from one fixed case
- **Why:** Meta loop for returning players. (SDT: **C** via daily streak.)
- **How:** Pick case randomly from `CASE_ORDER`, perturb `reference` params by ±10% using a seeded PRNG keyed to `YYYY-MM-DD`. New route `/daily`. Streak increments on the `profile` slice from M4.
- **Effort:** M (1 day)
- **Playwright:** Visit `/daily` on two different mocked dates, assert different scenario text.
- **Kill criteria:** If <5% of players return on day 2 per analytics, kill it — it's not worth the route.

#### C2 — Boss Scenario: Case 7 (hidden, unlocks on all 6 cases 3-starred)
- **Why:** Endgame for the top 10%. (SDT: **C** via a visible apex.)
- **How:** New `content/cases/07-crisis.json` combining Loading + Labor + Yield in one scenario. Gated in home-page case picker by `Object.values(caseScores).filter(c => c.stars === 3).length === 6`. Golden fixture needs a new entry — verify 28/28 after.
- **Effort:** L (1.5 days — content design + fixture + UI gating)
- **Playwright:** Gate visible only after seeding localStorage with 6×3-star.
- **Kill criteria:** If the fixture drifts from Python truth, pull it.

**MUST count = 4.** This is already at the ceiling you asked me to stay under (3-5). I considered making M3 (juice) a SHOULD but it's the single cheapest lift with the highest vibe-payoff per KB, so it stays in MUST.

---

## 4. Narrative frame proposal

**Premise (≤3 paragraphs, shown once on first `/cases/01-loading` visit):**

> *2분기가 시작되는 첫 달. 당신은 K-디스플레이 공장의 신임 원가 엔지니어입니다. 본사 CFO는 이번 분기 목표 영업이익을 달성하지 못하면 라인 한 개를 접겠다고 했습니다. 당신의 책상 위에는 여섯 장의 쪽지가 쌓여 있습니다 — 매달 하나씩, 공장을 흔드는 사건이 터집니다.*
>
> *슬라이더로 수치를 움직이고, 원가 트리에서 무엇이 반응하는지 읽어내세요. 각 달의 답을 맞히면 별을 얻고, 별은 분기말 누적 영업이익을 구합니다. 힌트는 쓸 수 있지만, 쓴 만큼 별 하나가 날아갑니다.*
>
> *당신이 배우는 건 '원가 공식'이 아니라, 압박 속에서 무엇을 먼저 봐야 하는가 입니다. 준비됐나요? 1월이 시작됩니다.*

**Tone:** Dry, respectful, faintly cinematic. No *"화이팅!"*, no exclamation points, no emoji. Closer to a Korean workplace novel than to Duolingo's green owl. The CFO is a voice, not a character — no face, just a note header that says *"CFO · {month}월 {day}일"*.

**Sample opening line for Hook of case 1:**
> *"1월 3일. Loading이 70%에서 50%로 떨어졌습니다. 이번 달 손익에 얼마나 박힐지, 오늘 저녁 회의 전까지 숫자 하나를 가져오세요." — CFO*

Replaces the current italic quote *"Loading이 70% → 50%로 떨어지면 원가에 어떤 일이 일어날까요?"* (`content/cases/01-loading.json` line 38) which is a quiz prompt, not a stake.

---

## 5. Scoring model (concrete formula)

**Design goals:** computable from existing store state + small additions, resistant to brute-force (you can't mash the hint button and win 3 stars), fair to careful slow players.

### Per-case score

```
accuracy    = 1 - clamp(|answer - key| / tolerance, 0, 1)   // 0..1, 1 = bullseye
move_par    = caseDef.variables.length * 4                  // 4 moves/var baseline
move_bonus  = clamp((move_par - moves) / move_par, 0, 1)    // 0..1, 1 = very efficient
hint_clean  = hintUsed ? 0 : 1                              // binary

score       = round(
                100 * accuracy       // out of 100
              +  20 * move_bonus     // +20 max efficiency bonus
              +  15 * hint_clean     // +15 max no-hint bonus
              )                      // range: 0..135, displayed as /135

// Stars (independent of raw score so they remain "crisp" badges)
star1 = accuracy >= 0.9                                      // "맞췄어요"
star2 = move_bonus >= 0.5                                    // "효율적으로"
star3 = hint_clean === 1 && accuracy >= 0.95                 // "힌트 없이"
stars = star1 + star2 + star3                                // 0..3
```

### Quarter (campaign) score

```
quarterScore      = Σ case scores over 6 cases                                   // 0..810
survivalFloor     = Σ (reference_case_profit * 0.60)                             // from content/campaign.json
cumulativeProfit  = Σ (player's computed operating_profit per case, post-slider) // from CostResult.operating_profit
survived          = cumulativeProfit >= survivalFloor
```

### Korean learner-facing labels (for UI)

| Internal | Korean label |
|---|---|
| `accuracy` | 정확도 |
| `move_bonus` | 탐색 효율 |
| `hint_clean` | 힌트 없이 |
| `score` (case) | 이번 달 점수 |
| `quarterScore` | 분기 총점 |
| `survivalFloor` | 생존선 |
| `cumulativeProfit` | 누적 영업이익 |
| `stars` | 별 (★☆☆ / ★★☆ / ★★★) |

### Brute-force resistance

- You **cannot** max out by grinding the hint — `hint_clean = 0` caps you at 120/135 and lose star 3.
- You **cannot** max out by one-shotting the answer with math — you still need `move_bonus ≥ 0.5`, which requires touching the slider enough to see the effect (star 2), rewarding *exploration*.
- You **cannot** brute-force the number box within tolerance — `tolerance` is already 0.1-0.5 in the content files; guessing is infeasible.
- **Speed is not rewarded.** There is no timer in the formula. This matches your "fair to careful learners" constraint.

---

## 6. Juice & feel upgrade list (≤8 items, bundle-safe)

Target: every item ships under **+8 KB gzip total** across the list. Current budget headroom: 250 - 224 = 26 KB. We use ~1/3 of it and bank the rest.

1. **Confetti burst on Apply-correct** — `components/ui/ConfettiBurst.tsx` (new, ~60 LOC, CSS transforms only, no library). Triggered from `components/Guided/Apply.tsx` line 22 inside the `feedback === "correct"` branch. ~1 KB.
2. **Count-up animation on the answer input when correct** — Framer Motion's `useMotionValue` + `useTransform` (already in bundle). File: `components/Guided/Apply.tsx`. 0 KB.
3. **Success chime (Web Audio)** — new `lib/sound.ts` (~40 LOC) using `OscillatorNode`, called from Apply. Also expose `fanfare()` for case-complete and `tick()` for slider-step-crosses-threshold. ~0.5 KB. Muted by default on first visit; persistent toggle in the case-page header next to the Coach icon.
4. **Slider haptic tick** — `components/ParamPanel/ParamPanel.tsx` — `navigator.vibrate?.(4)` every step-threshold crossing. Mobile only. 0 KB.
5. **COP number rubber-band** — on `setParams`, the root `COP` node in `CostTreeView` scales to `1.06` for 120 ms then springs back. Wire in `components/CostTree/CostTreeView.tsx` using existing Framer. 0 KB.
6. **Parallax glow on the cost tree** — the existing decorative blur circles in Hook/Apply follow mouse position with `useMotionValue` on the case page. Subtle, 0.3 opacity. Files: `components/Guided/Hook.tsx`, `components/Guided/Apply.tsx`. 0 KB.
7. **CFO-note entrance flourish** — new `[data-test="cfo-note"]` card in `Hook.tsx` animates in with a 2-stage Framer keyframe (y: 40 → -4 → 0, opacity: 0 → 1) + a 1-px rotate wobble. 0 KB.
8. **3-star reveal cascade on Reflect** — stars pop in one at a time (120 ms stagger) inside the existing success card in `Reflect.tsx`. Uses Framer's `variants` + `staggerChildren`. 0 KB.

**Bundle estimate:** ConfettiBurst (~1 KB) + sound.ts (~0.5 KB) + data-test attributes + grading logic in store (~1 KB) + persist middleware (already in zustand, 0 KB marginal) = **~2.5-4 KB gzipped**. Well under budget.

**Explicit nopes (for the record):**
- No `canvas-confetti` — it's 8 KB just for the library.
- No `howler.js` / `tone.js` — Web Audio is fine for 3 oscillator notes.
- No `lottie-web` — animations are Framer-native.
- No `react-rewards` — it re-implements #1 with extra deps.

---

## 7. Risks and open questions

### Risks

1. **The survival-floor metaphor (M1) may feel punishing rather than motivating.** Korean classroom culture often penalizes failure hard; a "factory closes" fail-state might shut down the learner instead of energizing them. *Mitigation:* make the floor **advisory** in v1 (you always pass to next case; the bar just colors red if you're under). Promote to hard-gate only if playtests show players disengage from "soft stakes."
2. **Adding localStorage in a classroom / shared-laptop setting is a UX landmine.** Playing and then a second student opens the same browser = "someone beat my cases." *Mitigation:* lightweight *이름 입력* on first load, profile-keyed localStorage namespace. If the instructor runs with an "empty every session" mode, expose `?reset=1` query param to clear on load.
3. **Audio auto-play policies.** `AudioContext` cannot play before user gesture. *Mitigation:* initialize `AudioContext` inside Apply's `check()` handler (first correct-answer is the first click = valid gesture). If suspended, `.resume()` inside the same handler.
4. **The golden fixture (27/27) protects the math.** Stars, campaign, mastery all derive from `CostResult` but do not modify `calculate()`. **None of the MUST items touch `lib/cost-engine/engine.ts`.** This needs to be a reviewer's top check at PR time.
5. **Overfitting the mechanic to the learning outcome.** The #1 anti-slop risk: a player with 3 stars on every case who still can't answer "why does labor cost affect SGA?" verbally. *Mitigation:* keep Reflect's freeform textarea as the one mechanic we **do not gamify**. No points, no grade — it stays a no-stakes thought exercise. The CFO reaction in S2 reads the *star* count, not the Reflect text.
6. **Bundle creep over 250 KB.** Build size regression on every PR. *Mitigation:* add a CI check on Next build output, fail PR if `.next/analyze` shows First Load JS > 250 KB for `/sandbox` or `/cases/[caseId]`.
7. **Per-variable mastery (S1) requires an adapter→variable mapping that isn't in `content/cases/*.json` today.** *Mitigation:* either add a `variables_tagged: ["loading"]` field to each JSON (invasive but clean) or derive from the `adapter` string (cheap but brittle). Pick the JSON field — it's 6 lines of content edits.

### Open questions (for user/playtest, not me to guess)

- [ ] Does the target audience (Korean CI trainees) prefer a **first-person** narrative ("당신은 원가 엔지니어") or a **formal report** framing ("다음은 K-공장 Q2 브리핑입니다")? Section 4 assumes first-person. This is the #1 item to A/B in week 1.
- [ ] Is a **60-minute classroom session** the target length? If so, M1's "quarter = 6 months" should fit in <50 minutes. Current case timings (Hook 1m + Discover 3m + Apply 4m + Reflect 2m = ~10 min each × 6) = 60 min exactly, no room for the intro modal. We may need to prune Discover to 2 minutes.
- [ ] Does the instructor want a **session-wide reset button** (classroom TA needs to wipe progress between cohorts)? If yes, `?reset=1` or a footer affordance.
- [ ] Should the CFO narrative survive into **solo / 10-minute sessions**, or auto-skip after first run? Recommend auto-skip with a "skip narrative" toggle in profile.
- [ ] Is **Korean-only** acceptable for this release, or does the workshop host need an English-toggle for expat attendees? Current repo has no i18n; adding one is 2-3 days of work and *not* in the current plan.

---

## 8. Implementation sequencing (3 phases, independently shippable)

### Phase A — "Juice + visible score" (1-2 days)

Goal: The app *feels* alive and every correct answer has a reward. No persistence yet. No narrative. No campaign.

- **A1.** `components/ui/ConfettiBurst.tsx` — new CSS-only component.
- **A2.** `lib/sound.ts` — new Web Audio helper with `ding()`, `fanfare()`, `tick()`.
- **A3.** `components/Guided/Apply.tsx` — wire confetti + chime + count-up on `setFeedback("correct")`. Add `data-test="confetti"`.
- **A4.** `components/CostTree/CostTreeView.tsx` — COP node rubber-band on change.
- **A5.** Add `caseScores` slice to `lib/store.ts` (in-memory only, no persist yet). Compute score + stars on Apply-correct using §5 formula.
- **A6.** `components/Guided/Reflect.tsx` — render star cascade in success card.
- **A7.** Playwright: extend `tests/e2e/guided-flow.spec.ts` to assert confetti, stars, and score value.

**Ship criterion:** A playtester doing case 1 correctly says *"oh that felt good"* unprompted. Zero golden-fixture regressions. First Load JS ≤ 232 KB.

### Phase B — "Narrative + persistence + campaign" (2-3 days)

Goal: Players come back after reload and find their progress. The 6 cases become a quarter.

- **B1.** `content/campaign.json` — new file with 6 months, survival floor, CFO briefings and reactions.
- **B2.** Extend `lib/store.ts` with `campaign`, `profile`, persist middleware (whitelist per M4).
- **B3.** First-load *이름 입력* modal at `app/layout.tsx` or a new `components/ProfileGate.tsx`.
- **B4.** `components/Guided/Hook.tsx` — CFO-note card replaces italic quote. Pull copy from `campaign.json`.
- **B5.** `app/(learn)/cases/[caseId]/page.tsx` — header shows "{month}월 · Q2" and a campaign bar (new `components/Campaign/QuarterBar.tsx`).
- **B6.** `components/Guided/Reflect.tsx` — CFO reaction tier from star count.
- **B7.** Intro premise modal on first `/cases/01-loading` load (one-time, stored in profile).
- **B8.** Playwright: full campaign run, reload between cases, assert persistence.

**Ship criterion:** A playtester closes the tab mid-case-3, returns 10 minutes later, finds themselves back at case 3 with stars 1-2 intact. Zero golden-fixture regressions. First Load JS ≤ 240 KB.

### Phase C — "Mastery + meta loop" (3-5 days)

Goal: Reasons to come back tomorrow. A visible apex.

- **C1.** Add `variables_tagged: string[]` field to all six `content/cases/*.json` files.
- **C2.** `variableMastery` slice in `lib/store.ts` (persisted).
- **C3.** New section on `app/page.tsx`: *"내 원가 감각"* — 6-row mastery meter.
- **C4.** New route `app/daily/page.tsx` — randomized scenario from seeded PRNG.
- **C5.** Streak counter on profile, visible in home page header.
- **C6.** **Optional boss case** `content/cases/07-crisis.json` (combines 3 adapters). Gated behind 6×3-star. **Requires new golden-fixture entry** — bump to 28/28 and verify against Python source.
- **C7.** Playwright: daily challenge yields different scenarios on different seeds; boss case is hidden until 3-star completion.

**Ship criterion:** Returning player count (day 2 / day 7) measurably above zero. First Load JS ≤ 250 KB. Golden fixtures 28/28 if C6 shipped, else 27/27.

---

## 9. Final checklist (planner self-review)

- [x] Every mechanic cites a specific file, store slice, or content field.
- [x] MUST count is 4, within the 3-5 limit.
- [x] No "XP + badges + levels + leaderboards" carpet bomb — each mechanic has a specific job.
- [x] No multiplayer.
- [x] No heavy libs (no Phaser/PIXI/Howler/canvas-confetti).
- [x] Cost engine is not touched — golden fixture 27/27 preserved.
- [x] Bundle ≤250 KB justified with per-item KB estimates.
- [x] Every new mechanic has ≥1 Playwright assertion.
- [x] Learner-facing copy is Korean.
- [x] Reflect stays non-gamified to preserve learning integrity.
- [x] PIPA / R9 posture unchanged (localStorage is still client-only).
- [x] Open questions surfaced, not guessed.
- [x] Disagreement with user's framing flagged (pushback on "difficulty curve" priority).
