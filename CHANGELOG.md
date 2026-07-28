# Changelog & Technical Notes

Running technical log for the Hong Kong Mahjong web app. **Every change from
now on gets an entry here** (newest first, under "Change log"). The
"Architecture" section is the durable overview; the "Change log" is the
history.

Stack: **Next.js 14 (App Router, `output: "export"` static), TypeScript,
Tailwind, Framer Motion**. Pinned to Next 14 / Vitest 1.6.1 for the Node
19.8.1 environment. Deployed to **GitHub Pages** at `jessicawong.dev/mahjongisfun`
(project site → all asset URLs prefixed with `/mahjongisfun`, see
`next.config.mjs`). Deploy runs on push to `main` (`.github/workflows/deploy-pages.yml`).

---

## Architecture

### Pure rules engine — `lib/mahjong/`
- **`(state, action) → newState` reducer** (`reducer.ts`), framework-agnostic
  and independent of *who* acts (human or bot). This is the highest-value
  design decision: the same engine drives solo play, bots, and multiplayer
  (via deterministic action-log replay).
- **`getLegalActions(state, seat)`** is the single source of truth for what's
  allowed — consumed by both the UI (button rendering) and bots, so they can
  never drift. It also enforces the fan-minimum gate by omitting `DECLARE_WIN`
  when no decomposition clears the bar.
- **`decompose.ts`** enumerates *all* valid hand readings (4 sets + pair via
  backtracking; seven pairs and thirteen orphans as separate passes).
- **`wall.ts`** — no dead wall; all 144 tiles are live and playable.
- **State** (`state.ts`): 4 players (seat wind, concealed tiles, melds,
  discards, flowers, score), `turn.phase` enum, `pendingCallWindow` for
  explicit call/priority resolution, immutable `ruleset` (`fanMinimum: 0|3|5`).

### Scoring — `lib/mahjong/scoring/`
- **`fan-table.ts`** — one pure `FanPattern` function per pattern; `calculate.ts`
  runs every decomposition through the table and takes the **max** fan across
  readings. `qualifyingFan` (used for the minimum gate) counts flowers/No-Flowers.
- `ScoringContext` carries dealer/self-draw/winds/flowers/`isLastTile`/`winningTileKey`.

### Bots — `lib/mahjong/bot/`
- **`smartStrategy.ts`** — plan-committing bot (flush / triplets / sevenPairs /
  plain) scaled to the fan minimum. Measured decided-game rates: 3-fan 35%→80%,
  5-fan 5%→57% vs. the prior heuristic bot.

### Multiplayer — `components/online/`, `lib/multiplayer/`
- `RoomTransport` interface with two impls: `LocalTransport` (BroadcastChannel +
  localStorage, cross-tab, for local dev) and `FirebaseTransport` (RTDB).
- Convergence via **action-log replay** + `isActionLegal` gate. Presence
  heartbeat; acting-host = earliest-joined-connected (auto host migration);
  bot-takeover of a seat whose human is gone past the grace period.
- Firebase project `mahjongisfun-10815` (Spark/free, $0). RTDB rules: `/rooms/$code`
  world r/w (codes unguessable), `/users/$uid` auth-gated. Auth handler on
  `auth.jessicawong.dev` subdomain (iOS Safari ITP storage partitioning fix).

### i18n — `lib/i18n/`, `components/i18n/`
- `Lang = "en" | "zh-Hant" | "zh-Hans"`. `messages.ts` (dict + `translate(key,
  lang, vars)` with `{var}` interpolation), `labels.ts` (localized `tileName`,
  `fanName`, `windShort`). `LanguageProvider`/`useLang()` (persists to
  `localStorage: mahjong-lang`, default `en`), `LanguageToggle` (EN·繁體·简体).
- Tutorial lesson content is localized inline via `Loc = Record<Lang, string>`
  (built with an `L(en, hant, hans)` helper) and resolved with `pick(loc, lang)`.

### PWA / offline
- Service worker (`scripts/generate-sw.mjs`, `public/sw.js`) precaches for
  offline/subway play. Web app manifest (`app/manifest.ts`, `display: standalone`)
  + `apple-mobile-web-app-capable` meta (`app/layout.tsx`) so iOS "Add to Home
  Screen" launches fullscreen. (iOS fullscreen is Safari-only — Apple forces
  WebKit and disables the PWA/fullscreen path in Chrome/Firefox/Edge on iOS.)

### UI surfaces
- **Classic** (`app/page.tsx` → `components/board/`): portrait, mature. Auto-scroll
  to the action area on your turn; discard board (attributed or anonymous pool).
- **Beta** (`app/beta/page.tsx` → `components/beta/BetaTable.tsx`): landscape
  "authentic table" — compass, per-seat discard pond, hand rack. Solo vs bots.
- **Tutorial** (`app/learn/page.tsx` → `components/tutorial/`): scripted lessons
  → coached practice game (`TutorialCoach`, `TutorialPostmortem`).

### Sound — `lib/sound.ts`
- Web Audio synthesized cues (no binary assets); `navigator.vibrate` haptics
  (Android); mute toggle persisted.

---

## Change log

### 2026-07-28
- **Fullscreen help is browser-aware (iOS).** `FullscreenButton` detects iOS
  non-Safari browsers (`CriOS/FxiOS/EdgiOS/OPiOS`) and explains fullscreen is
  Safari-only on iPhone with Safari-specific steps, instead of Add-to-Home-Screen
  steps that don't work there. Localized.
- **iOS fullscreen via PWA.** Added `app/manifest.ts` (`display: standalone`) +
  `appleWebApp`/`mobile-web-app-capable` meta + `viewport-fit=cover` in
  `app/layout.tsx`, so Add-to-Home-Screen launches chrome-free on iOS. Note: Next
  strips basePath from the manifest `<link>` on static export (Android-install-only
  concern; iOS uses the apple meta tag).
- **Beta table rebuilt** (`BetaTable.tsx`). Removed opponents' face-down
  back-stacks (they were burying the pond/compass); opponents are now compact
  chips (badge + hidden-tile count + exposed melds/flowers) in fixed left/right
  side columns that can't overlap the center. Pond owns the flexible center
  (full-width top/bottom discard strips + left/right flanking a centered compass,
  `xs` tiles). Chi button shows the two tiles + "Chi" label (like the classic bar).
- **Discard board turn highlight** (`DiscardBoard.tsx`). Active seat's row tints
  amber, dot pulses (CSS `animate-pulse`), name goes bold amber — mirrors the
  hand-panel cue.
- **Inline drawn tile** (`PlayerPanel.tsx`, beta). The just-drawn tile flows at
  the end of the hand with a slim divider + highlight instead of a bulky
  labelled block that took its own half-empty row.
- **Fixed floating hand panel** (`PlayerPanel.tsx`). An infinitely-repeating
  `transition` on the panel's `motion.div` (which also has `layout`) made framer
  loop the layout animation → the hand oscillated and was untappable. Moved the
  turn glow to a separate absolutely-positioned overlay.
- **Online rejoin fix** (`useOnlineRoom.ts`). (A) `getPlayerId()` now persists in
  `localStorage` (survived a closed/discarded tab; was `sessionStorage`). (B) On
  join, a seat whose holder is disconnected past the grace period is reclaimable
  (not only removed-record seats), clearing the stale ghost record. Fixes
  accidental leavers being locked out as spectators.
- **Turn highlight + compact opponent panels** (`PlayerPanel.tsx`). Active
  player's panel pulses amber + "Your turn"/"Turn" badge. Hidden-tile count moved
  inline onto the name row; opponents' melds/flowers render at a new `xs`
  `TileFace` size — shorter panels, less scrolling.

### 2026-07-27
- **Full Chinese localization** across the app (EN / 繁體 / 简体) — see
  Architecture → i18n. Localized tiles, fan/scoring names, winds, status bar,
  action buttons (碰/上·吃/槓·杠/食糊·胡), round-end scoring & payouts, beta table,
  online (lobby/spectator/invite), profile (account/stats), tutorial coach +
  post-mortem, and the full tutorial lessons (`lessons.ts` → `Loc` fields).
  Language toggle on the setup card, classic status bar, and beta menu.
- **Pon → Pong** rename in all user-facing text (action type stays `CALL_PON`).
- **Tutorial pacing.** New slower `learn` bot pace (1400ms) so beginners can
  follow. Coach card portrait fix (framer `y` animation was overwriting the
  Tailwind `-translate-x-1/2`, shoving it off-screen) — now centered via
  insets. Coach "watch" hint uses a stable id so it doesn't flash each bot turn.

### Earlier this session (2026-07-11 → 24)
- **Two-winner bug (head-bump rule).** Only one player wins off a discard now —
  `resolveCallWindow` picks the seat closest to the discarder in turn order
  (`closestToDiscarder`), not every eligible winner.
- **Stale discard callout in fast mode.** `CenterTable` dropped
  `AnimatePresence mode="wait"` (it lagged a full exit animation behind state, so
  a pon prompt could show while the callout named the previous discard).
- **Tutorial mode** (`/learn`). Hybrid: scripted lessons (`lessons.ts`,
  `LessonView` — info/quiz/tap-the-tile steps) → coached practice game reusing the
  classic board with `TutorialCoach` (language-aware `coachHint` off
  `getLegalActions`) and `TutorialPostmortem` (`analyzePostmortem`: enumerates
  winning waits via `decomposeHand`, scores each via `bestScore`, and counts all
  four copies to tell a live wait from a dead one — framed encouragingly, never
  "impossible"). Progress persisted; always-visible "Exit to full game".
- **Declare Win button** pulses with a glow and is larger/ringed (shared
  `ActionBar`).
- **Beta table** first landscape build: central pond, per-seat discard zones,
  compass (prevailing + seat winds, dealer 莊), maroon opponent backs, hand rack,
  active-turn glow.

### Prior work (pre-changelog, summarized)
- **Scoring correctness**: All Sequences/Ping Wu +1; Terminals & Honors = 4;
  flowers count toward the fan minimum (real HK rule); No Flowers +1; Kan Kan Wo
  = 10 (concealed self-drawn all-triplets); last-tile win +1.
- **Online multiplayer** (Firebase): rooms + invite codes + QR, always-4-seats,
  bot takeover on disconnect, join-anytime → spectator → take a bot seat next
  round, in-game invite (code + QR). Guest play fixed (`uidField()` omits
  `undefined` uid, which RTDB rejects).
- **Auth / economy**: Google login (auth on `auth.jessicawong.dev` for iOS Safari
  ITP), cloud stats, friends money leaderboard; persistent play-money wallet
  (solo/online split, `$10/fan`).
- **Bots**: fan-aware `smartStrategy`; 5-fan-minimum mode.
- **Offline PWA** (service worker) for subway play; fixed blank tiles.
- **Invisible hand tiles** fix (Framer Motion `layoutId` FLIP occasionally
  stranded a tile at opacity 0 — hand tiles now opt out of the shared-element
  transition via `layoutAnimate={false}`).
- **Round-end** popup made dismissible (post-mortem inspection) + win confetti.
- **UX**: player wind shown; table wind rotates after a full dealer cycle; avatar
  icons; sound effects + haptics + mute; lobby seat selection; kong-anytime;
  red dragon (中) favicon (`app/icon.svg`).
