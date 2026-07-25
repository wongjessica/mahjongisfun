import { Tile, TileSuit } from "@/lib/mahjong/tiles";

// Tutorial illustrations need real Tile objects (so they render with the same
// artwork as the game), but they never enter the engine -- they're display
// props. A module-load counter gives each one a stable, unique id.
let uid = 0;
function tt(suit: TileSuit, rank: number): Tile {
  return { id: `demo-${suit}-${rank}-${uid++}`, suit, rank };
}

/** A labelled cluster of tiles shown as an illustration (e.g. a "Pung"). */
export interface TileGroup {
  label?: string;
  tiles: Tile[];
}

/** A plain teaching card: prose plus optional tile illustrations. */
export interface InfoStep {
  kind: "info";
  title: string;
  body: string[];
  groups?: TileGroup[];
  callout?: string;
}

export interface QuizOption {
  label: string;
  /** Optional tiles rendered inside the option button. */
  tiles?: Tile[];
  correct?: boolean;
}

/** Multiple-choice check-for-understanding. */
export interface QuizStep {
  kind: "quiz";
  title: string;
  prompt: string;
  /** Optional shared illustration shown above the options. */
  groups?: TileGroup[];
  options: QuizOption[];
  explanation: string;
}

/** "Tap the right tile" -- the learner picks from a row of tiles. */
export interface PickStep {
  kind: "pick";
  title: string;
  prompt: string;
  /** Context tiles shown above the tappable row (e.g. the partial run). */
  groups?: TileGroup[];
  /** The tappable candidates. */
  choices: Tile[];
  /** Which choices are correct, matched by "suit-rank" (see tileKey). */
  correctKeys: string[];
  explanation: string;
  hint: string;
}

export type LessonStep = InfoStep | QuizStep | PickStep;

export interface Lesson {
  id: string;
  title: string;
  icon: string;
  steps: LessonStep[];
}

export const LESSONS: Lesson[] = [
  {
    id: "goal",
    title: "The Goal",
    icon: "🎯",
    steps: [
      {
        kind: "info",
        title: "Welcome to Hong Kong Mahjong!",
        body: [
          "Mahjong is a game for four players. You each hold a hand of tiles and take turns drawing and throwing away tiles, trying to be the first to build a complete hand.",
          "Don't worry about memorising anything — this tutorial teaches you everything step by step, and afterwards you'll play a real hand with a coach guiding you.",
        ],
        callout: "A round takes about 5–10 minutes. The winner of each round collects points from the others.",
      },
      {
        kind: "info",
        title: "A winning hand = 4 sets + 1 pair",
        body: [
          "Almost every winning hand is made of five pieces: four “sets” of three tiles, plus one matching “pair” of two tiles. That's 14 tiles in total.",
          "Here's a complete winning hand, split into its five pieces:",
        ],
        groups: [
          { label: "Set 1", tiles: [tt("dots", 2), tt("dots", 3), tt("dots", 4)] },
          { label: "Set 2", tiles: [tt("dots", 6), tt("dots", 7), tt("dots", 8)] },
          { label: "Set 3", tiles: [tt("bamboo", 5), tt("bamboo", 5), tt("bamboo", 5)] },
          { label: "Set 4", tiles: [tt("dragons", 1), tt("dragons", 1), tt("dragons", 1)] },
          { label: "Pair", tiles: [tt("winds", 1), tt("winds", 1)] },
        ],
        callout: "Everything you do each turn is aimed at reaching this shape before anyone else.",
      },
    ],
  },
  {
    id: "tiles",
    title: "The Tiles",
    icon: "🀄",
    steps: [
      {
        kind: "info",
        title: "The three suits",
        body: [
          "There are three number suits, each running from 1 to 9 (four copies of every tile). These are the tiles you'll form runs and triplets from.",
        ],
        groups: [
          { label: "Dots", tiles: [tt("dots", 1), tt("dots", 5), tt("dots", 9)] },
          { label: "Bamboo", tiles: [tt("bamboo", 1), tt("bamboo", 5), tt("bamboo", 9)] },
          { label: "Characters", tiles: [tt("characters", 1), tt("characters", 5), tt("characters", 9)] },
        ],
        callout: "Tip: the “Characters” suit uses the Chinese character 萬 (ten-thousand) under the number.",
      },
      {
        kind: "info",
        title: "The honor tiles",
        body: [
          "There are also honor tiles with no numbers. They can't form runs — only pairs and triplets — but several of them are worth bonus points.",
          "The Winds are East, South, West and North. The Dragons are Red, Green and White.",
        ],
        groups: [
          { label: "Winds", tiles: [tt("winds", 1), tt("winds", 2), tt("winds", 3), tt("winds", 4)] },
          { label: "Dragons", tiles: [tt("dragons", 1), tt("dragons", 2), tt("dragons", 3)] },
        ],
      },
      {
        kind: "info",
        title: "Flowers & Seasons (bonus tiles)",
        body: [
          "Finally there are eight bonus tiles — four Flowers and four Seasons. You never build sets with these.",
          "When you draw one, it sets itself aside automatically, gives you a bonus point, and you draw a replacement tile. You don't have to do anything.",
        ],
        groups: [
          { label: "Flowers", tiles: [tt("flowers", 1), tt("flowers", 2), tt("flowers", 3), tt("flowers", 4)] },
          { label: "Seasons", tiles: [tt("seasons", 1), tt("seasons", 2), tt("seasons", 3), tt("seasons", 4)] },
        ],
      },
      {
        kind: "quiz",
        title: "Quick check",
        prompt: "Which of these tiles is an honor tile (no number)?",
        options: [
          { label: "Green Dragon", tiles: [tt("dragons", 2)], correct: true },
          { label: "7 Bamboo", tiles: [tt("bamboo", 7)] },
          { label: "3 Dots", tiles: [tt("dots", 3)] },
        ],
        explanation: "The Dragons and Winds are the honor tiles — they have no number and can't form runs.",
      },
    ],
  },
  {
    id: "sets",
    title: "Building Sets",
    icon: "🧩",
    steps: [
      {
        kind: "info",
        title: "The two kinds of set",
        body: [
          "Each of your four sets is either a Triplet or a Run.",
          "A Triplet (“Pung”) is three identical tiles. A Run (“Chow”) is three consecutive numbers in the same suit. Honor tiles can only form triplets, never runs.",
        ],
        groups: [
          { label: "Triplet", tiles: [tt("characters", 8), tt("characters", 8), tt("characters", 8)] },
          { label: "Run", tiles: [tt("bamboo", 4), tt("bamboo", 5), tt("bamboo", 6)] },
        ],
      },
      {
        kind: "info",
        title: "The pair",
        body: [
          "The last two tiles of your hand are the Pair — just two identical tiles. Sometimes called the “eyes”.",
          "Any tile can be your pair: a number tile, a wind, or a dragon.",
        ],
        groups: [{ label: "Pair", tiles: [tt("winds", 3), tt("winds", 3)] }],
      },
      {
        kind: "pick",
        title: "Complete the run",
        prompt: "You have two bamboo tiles below. Tap the tile that completes them into a run.",
        groups: [{ tiles: [tt("bamboo", 3), tt("bamboo", 4)] }],
        choices: [tt("bamboo", 5), tt("dots", 4), tt("bamboo", 7), tt("dragons", 1)],
        correctKeys: ["bamboo-5"],
        explanation: "3-4-5 Bamboo is a run — three consecutive numbers in the same suit. (A 2 Bamboo would also have worked!)",
        hint: "A run is three numbers in a row, all the same suit. What comes right after 3 and 4?",
      },
      {
        kind: "quiz",
        title: "Spot the triplet",
        prompt: "Which of these groups is a valid Triplet?",
        options: [
          { label: "", tiles: [tt("dots", 5), tt("dots", 5), tt("dots", 5)], correct: true },
          { label: "", tiles: [tt("dots", 5), tt("dots", 6), tt("dots", 7)] },
          { label: "", tiles: [tt("dots", 5), tt("bamboo", 5), tt("characters", 5)] },
        ],
        explanation: "A triplet is three of the exact same tile. The middle group is a run, and the last is three different suits — neither counts as a triplet.",
      },
    ],
  },
  {
    id: "win",
    title: "Completing a Hand",
    icon: "🏆",
    steps: [
      {
        kind: "info",
        title: "Putting it together",
        body: [
          "Here's a hand that's one tile away from winning. It already has three finished sets and a pair, plus two bamboo (1 and 2) waiting to become a run.",
          "See if you can spot the tile it needs on the next screen.",
        ],
        groups: [
          { label: "Set", tiles: [tt("dots", 2), tt("dots", 3), tt("dots", 4)] },
          { label: "Set", tiles: [tt("dots", 6), tt("dots", 7), tt("dots", 8)] },
          { label: "Set", tiles: [tt("dragons", 1), tt("dragons", 1), tt("dragons", 1)] },
          { label: "Pair", tiles: [tt("winds", 1), tt("winds", 1)] },
          { label: "Waiting…", tiles: [tt("bamboo", 1), tt("bamboo", 2)] },
        ],
      },
      {
        kind: "pick",
        title: "Find the winning tile",
        prompt: "The 1 and 2 Bamboo need one more tile to finish. Tap the tile that completes the whole hand.",
        groups: [
          { label: "Set", tiles: [tt("dots", 2), tt("dots", 3), tt("dots", 4)] },
          { label: "Set", tiles: [tt("dots", 6), tt("dots", 7), tt("dots", 8)] },
          { label: "Set", tiles: [tt("dragons", 1), tt("dragons", 1), tt("dragons", 1)] },
          { label: "Pair", tiles: [tt("winds", 1), tt("winds", 1)] },
          { label: "Waiting…", tiles: [tt("bamboo", 1), tt("bamboo", 2)] },
        ],
        choices: [tt("bamboo", 3), tt("dots", 3), tt("bamboo", 2), tt("dragons", 3)],
        correctKeys: ["bamboo-3"],
        explanation: "1-2-3 Bamboo completes the fourth run, giving you 4 sets + 1 pair. That's a winning hand!",
        hint: "1 and 2 need the number that comes next to form 1-2-3, all bamboo.",
      },
      {
        kind: "info",
        title: "Two ways to win",
        body: [
          "You can complete your hand in two ways:",
          "• Self-draw — you draw your winning tile yourself from the wall.",
          "• Off a discard — someone throws away the exact tile you need, and you claim it to win.",
          "Important: only one player can win from a single discarded tile. If two players could both use it, it goes to whoever is next in turn order after the person who threw it.",
        ],
        callout: "When you can win, the app shows a “Win” button — you're never expected to spot it alone.",
      },
    ],
  },
  {
    id: "turns",
    title: "Playing a Turn",
    icon: "🔄",
    steps: [
      {
        kind: "info",
        title: "Draw one, discard one",
        body: [
          "Play goes around the table. On your turn you draw one tile from the wall, then throw away (discard) one tile you don't need. Your hand always returns to 13 tiles.",
          "Every discard is placed face-up in the middle where everyone can see it — that's how the other players (and you) get chances to claim tiles.",
        ],
        callout: "Slowly, draw by draw, you trade away useless tiles and collect the ones that build your 4 sets + 1 pair.",
      },
    ],
  },
  {
    id: "calls",
    title: "Claiming Tiles",
    icon: "✋",
    steps: [
      {
        kind: "info",
        title: "Pong, Chi & Kong",
        body: [
          "When another player discards a tile you can use, you may “call” it instead of waiting to draw it yourself:",
          "• Pong — take a discard to complete a Triplet (you must already hold a matching pair). Anyone can Pong.",
          "• Chi — take a discard to complete a Run. Only allowed from the player directly to your left.",
          "• Kong — take a discard to make four-of-a-kind. You then draw a bonus replacement tile.",
        ],
        groups: [
          { label: "Hold a pair…", tiles: [tt("bamboo", 5), tt("bamboo", 5)] },
          { label: "…Pong this discard", tiles: [tt("bamboo", 5)] },
        ],
      },
      {
        kind: "info",
        title: "Calling has a trade-off",
        body: [
          "Claiming a tile is powerful — it speeds up your hand and lets you grab a tile before your turn. But there's a cost:",
          "The set you call is placed face-up for everyone to see, so opponents learn what you're collecting. Some high-scoring hands also require staying fully concealed.",
          "You can always tap “Pass” to skip a call and keep your hand hidden.",
        ],
        callout: "Rule of thumb for beginners: call when it clearly finishes a set you need, otherwise Pass.",
      },
      {
        kind: "quiz",
        title: "Can you call it?",
        prompt: "You hold a pair of 5 Bamboo. The player across the table discards a 5 Bamboo. What can you do?",
        groups: [
          { label: "Your hand", tiles: [tt("bamboo", 5), tt("bamboo", 5)] },
          { label: "Discarded", tiles: [tt("bamboo", 5)] },
        ],
        options: [
          { label: "Pong it to make a triplet", correct: true },
          { label: "Chi it (it's not the player on your left)" },
          { label: "Nothing — you can't use it" },
        ],
        explanation:
          "A matching pair + the discard = a Pong (triplet), and Pong works from any player. Chi would only be allowed from the player on your left.",
      },
    ],
  },
  {
    id: "scoring",
    title: "Scoring & Fan",
    icon: "💰",
    steps: [
      {
        kind: "info",
        title: "Points are counted in “fan”",
        body: [
          "When you win, your hand is scored in units called fan. The more special your hand, the more fan it's worth — and the more points (and play-money) you collect from the others.",
          "A plain hand with no special pattern is worth very little. Hands built around a theme are worth much more.",
        ],
      },
      {
        kind: "info",
        title: "Some common patterns",
        body: [
          "You don't need to memorise these — the app scores everything for you. But here are a few worth aiming for:",
          "• All Sequences — every set is a run, plus a pair.",
          "• All Triplets — every set is a triplet.",
          "• Half Flush — one suit only, plus honor tiles.",
          "• Full Flush — a single suit and nothing else (very high!).",
          "• Dragon or your-Wind triplet — a triplet of a dragon or your seat wind is +1 fan each.",
        ],
        groups: [
          { label: "Half Flush", tiles: [tt("bamboo", 2), tt("bamboo", 3), tt("bamboo", 4), tt("bamboo", 5), tt("bamboo", 5), tt("dragons", 1), tt("dragons", 1)] },
        ],
        callout: "Flowers and Seasons that match your seat each add a bonus point too.",
      },
      {
        kind: "info",
        title: "The “fan minimum”",
        body: [
          "Many games set a minimum number of fan you need before you're allowed to declare a win. It stops people from winning instantly with a worthless hand.",
          "This app lets the host pick the minimum: 0 (anything wins), 3, or 5 fan. With a 3-fan minimum, a plain patternless hand can't win — you'll need at least one scoring pattern like a flush or a dragon triplet.",
        ],
        callout: "In the practice game next, the minimum is 0, so you can win with any complete hand while you learn.",
      },
      {
        kind: "quiz",
        title: "Last check",
        prompt: "Under a 3-fan minimum, can you declare a win with a complete hand that has no special pattern (0 fan)?",
        options: [
          { label: "No — you need at least 3 fan of patterns", correct: true },
          { label: "Yes — any 4 sets + a pair always wins" },
        ],
        explanation:
          "Right! A minimum means your hand must reach that many fan before the Win button appears. No pattern, no win — keep building.",
      },
    ],
  },
];

/** Total number of steps across all lessons, for the overall progress bar. */
export const TOTAL_STEPS = LESSONS.reduce((n, l) => n + l.steps.length, 0);
