import { Lang } from "@/lib/i18n/lang";
import { Tile, TileSuit } from "@/lib/mahjong/tiles";

/** A string in every supported language. */
export type Loc = Record<Lang, string>;
const L = (en: string, hant: string, hans: string): Loc => ({ en, "zh-Hant": hant, "zh-Hans": hans });
/** Resolve a Loc to the active language. */
export const pick = (loc: Loc, lang: Lang): string => loc[lang];

// Tutorial illustrations need real Tile objects (so they render with the same
// artwork as the game), but they never enter the engine -- they're display
// props. A module-load counter gives each one a stable, unique id.
let uid = 0;
function tt(suit: TileSuit, rank: number): Tile {
  return { id: `demo-${suit}-${rank}-${uid++}`, suit, rank };
}

/** A labelled cluster of tiles shown as an illustration (e.g. a "Pung"). */
export interface TileGroup {
  label?: Loc;
  tiles: Tile[];
}

/** A plain teaching card: prose plus optional tile illustrations. */
export interface InfoStep {
  kind: "info";
  title: Loc;
  body: Loc[];
  groups?: TileGroup[];
  callout?: Loc;
}

export interface QuizOption {
  label: Loc;
  /** Optional tiles rendered inside the option button. */
  tiles?: Tile[];
  correct?: boolean;
}

/** Multiple-choice check-for-understanding. */
export interface QuizStep {
  kind: "quiz";
  title: Loc;
  prompt: Loc;
  /** Optional shared illustration shown above the options. */
  groups?: TileGroup[];
  options: QuizOption[];
  explanation: Loc;
}

/** "Tap the right tile" -- the learner picks from a row of tiles. */
export interface PickStep {
  kind: "pick";
  title: Loc;
  prompt: Loc;
  /** Context tiles shown above the tappable row (e.g. the partial run). */
  groups?: TileGroup[];
  /** The tappable candidates. */
  choices: Tile[];
  /** Which choices are correct, matched by "suit-rank" (see tileKey). */
  correctKeys: string[];
  explanation: Loc;
  hint: Loc;
}

export type LessonStep = InfoStep | QuizStep | PickStep;

export interface Lesson {
  id: string;
  title: Loc;
  icon: string;
  steps: LessonStep[];
}

// Common reusable group labels.
const SET = L("Set", "組", "组");
const PAIR = L("Pair", "對子", "对子");

export const LESSONS: Lesson[] = [
  {
    id: "goal",
    title: L("The Goal", "目標", "目标"),
    icon: "🎯",
    steps: [
      {
        kind: "info",
        title: L("Welcome to Hong Kong Mahjong!", "歡迎來到香港麻雀！", "欢迎来到香港麻将！"),
        body: [
          L(
            "Mahjong is a game for four players. You each hold a hand of tiles and take turns drawing and throwing away tiles, trying to be the first to build a complete hand.",
            "麻雀是四人遊戲。每人手持一副牌，輪流摸牌、打牌，爭取第一個砌成完整的牌。",
            "麻将是四人游戏。每人手持一副牌，轮流摸牌、打牌，争取第一个凑成完整的牌。"
          ),
          L(
            "Don't worry about memorising anything — this tutorial teaches you everything step by step, and afterwards you'll play a real hand with a coach guiding you.",
            "不用死記硬背 — 本教學會逐步教你，之後更有教練陪你實戰一局。",
            "不用死记硬背 — 本教学会逐步教你，之后更有教练陪你实战一局。"
          ),
        ],
        callout: L(
          "A round takes about 5–10 minutes. The winner of each round collects points from the others.",
          "一局約 5 至 10 分鐘。每局贏家會向其他人收番（分數）。",
          "一局约 5 至 10 分钟。每局赢家会向其他人收番（分数）。"
        ),
      },
      {
        kind: "info",
        title: L("A winning hand = 4 sets + 1 pair", "食糊牌型 = 四組牌 + 一對", "胡牌牌型 = 四组牌 + 一对"),
        body: [
          L(
            "Almost every winning hand is made of five pieces: four “sets” of three tiles, plus one matching “pair” of two tiles. That's 14 tiles in total.",
            "幾乎每副食糊的牌都由五部分組成：四組各三張的「組」，加上一對相同的兩張牌。合共 14 張。",
            "几乎每副胡的牌都由五部分组成：四组各三张的「组」，加上一对相同的两张牌。合共 14 张。"
          ),
          L(
            "Here's a complete winning hand, split into its five pieces:",
            "以下是一副完整食糊牌，拆成五部分：",
            "以下是一副完整胡牌，拆成五部分："
          ),
        ],
        groups: [
          { label: L("Set 1", "第一組", "第一组"), tiles: [tt("dots", 2), tt("dots", 3), tt("dots", 4)] },
          { label: L("Set 2", "第二組", "第二组"), tiles: [tt("dots", 6), tt("dots", 7), tt("dots", 8)] },
          { label: L("Set 3", "第三組", "第三组"), tiles: [tt("bamboo", 5), tt("bamboo", 5), tt("bamboo", 5)] },
          { label: L("Set 4", "第四組", "第四组"), tiles: [tt("dragons", 1), tt("dragons", 1), tt("dragons", 1)] },
          { label: PAIR, tiles: [tt("winds", 1), tt("winds", 1)] },
        ],
        callout: L(
          "Everything you do each turn is aimed at reaching this shape before anyone else.",
          "你每一輪的行動，都是為了比別人更快砌成這個牌型。",
          "你每一轮的行动，都是为了比别人更快凑成这个牌型。"
        ),
      },
    ],
  },
  {
    id: "tiles",
    title: L("The Tiles", "牌張", "牌张"),
    icon: "🀄",
    steps: [
      {
        kind: "info",
        title: L("The three suits", "三種花色", "三种花色"),
        body: [
          L(
            "There are three number suits, each running from 1 to 9 (four copies of every tile). These are the tiles you'll form runs and triplets from.",
            "有三種數字花色，每種由 1 至 9（每款四張）。順子和刻子都由這些牌組成。",
            "有三种数字花色，每种由 1 至 9（每款四张）。顺子和刻子都由这些牌组成。"
          ),
        ],
        groups: [
          { label: L("Dots", "筒", "筒"), tiles: [tt("dots", 1), tt("dots", 5), tt("dots", 9)] },
          { label: L("Bamboo", "索", "索"), tiles: [tt("bamboo", 1), tt("bamboo", 5), tt("bamboo", 9)] },
          { label: L("Characters", "萬", "万"), tiles: [tt("characters", 1), tt("characters", 5), tt("characters", 9)] },
        ],
        callout: L(
          "Tip: the “Characters” suit uses the Chinese character 萬 (ten-thousand) under the number.",
          "小提示：「萬」子花色的數字下方有「萬」字。",
          "小提示：「万」子花色的数字下方有「万」字。"
        ),
      },
      {
        kind: "info",
        title: L("The honor tiles", "字牌", "字牌"),
        body: [
          L(
            "There are also honor tiles with no numbers. They can't form runs — only pairs and triplets — but several of them are worth bonus points.",
            "還有沒有數字的字牌。它們不能組順子，只能組對子或刻子，但當中有些能加番。",
            "还有没有数字的字牌。它们不能组顺子，只能组对子或刻子，但当中有些能加番。"
          ),
          L(
            "The Winds are East, South, West and North. The Dragons are Red, Green and White.",
            "風牌有東、南、西、北。三元牌有紅中、青發、白板。",
            "风牌有东、南、西、北。三元牌有红中、青发、白板。"
          ),
        ],
        groups: [
          { label: L("Winds", "風牌", "风牌"), tiles: [tt("winds", 1), tt("winds", 2), tt("winds", 3), tt("winds", 4)] },
          { label: L("Dragons", "三元牌", "三元牌"), tiles: [tt("dragons", 1), tt("dragons", 2), tt("dragons", 3)] },
        ],
      },
      {
        kind: "info",
        title: L("Flowers & Seasons (bonus tiles)", "花牌與季節牌（獎勵牌）", "花牌与季节牌（奖励牌）"),
        body: [
          L(
            "Finally there are eight bonus tiles — four Flowers and four Seasons. You never build sets with these.",
            "最後有八張獎勵牌 — 四張花、四張季節。它們不會用來組牌。",
            "最后有八张奖励牌 — 四张花、四张季节。它们不会用来组牌。"
          ),
          L(
            "When you draw one, it sets itself aside automatically, gives you a bonus point, and you draw a replacement tile. You don't have to do anything.",
            "摸到花牌時，它會自動放到一旁、額外加一番，並自動補摸一張。你不用做任何事。",
            "摸到花牌时，它会自动放到一旁、额外加一番，并自动补摸一张。你不用做任何事。"
          ),
        ],
        groups: [
          { label: L("Flowers", "花", "花"), tiles: [tt("flowers", 1), tt("flowers", 2), tt("flowers", 3), tt("flowers", 4)] },
          { label: L("Seasons", "季節", "季节"), tiles: [tt("seasons", 1), tt("seasons", 2), tt("seasons", 3), tt("seasons", 4)] },
        ],
      },
      {
        kind: "quiz",
        title: L("Quick check", "小測驗", "小测验"),
        prompt: L(
          "Which of these tiles is an honor tile (no number)?",
          "以下哪一張是字牌（沒有數字）？",
          "以下哪一张是字牌（没有数字）？"
        ),
        options: [
          { label: L("Green Dragon", "青發", "青发"), tiles: [tt("dragons", 2)], correct: true },
          { label: L("7 Bamboo", "七索", "七索"), tiles: [tt("bamboo", 7)] },
          { label: L("3 Dots", "三筒", "三筒"), tiles: [tt("dots", 3)] },
        ],
        explanation: L(
          "The Dragons and Winds are the honor tiles — they have no number and can't form runs.",
          "三元牌和風牌都是字牌 — 沒有數字，不能組順子。",
          "三元牌和风牌都是字牌 — 没有数字，不能组顺子。"
        ),
      },
    ],
  },
  {
    id: "sets",
    title: L("Building Sets", "砌牌組", "凑牌组"),
    icon: "🧩",
    steps: [
      {
        kind: "info",
        title: L("The two kinds of set", "兩種牌組", "两种牌组"),
        body: [
          L("Each of your four sets is either a Triplet or a Run.", "你的四組牌，每組不是刻子就是順子。", "你的四组牌，每组不是刻子就是顺子。"),
          L(
            "A Triplet (“Pung”) is three identical tiles. A Run (“Chow”) is three consecutive numbers in the same suit. Honor tiles can only form triplets, never runs.",
            "刻子（碰）是三張相同的牌。順子（上）是同花色連續三個數字。字牌只能組刻子，不能組順子。",
            "刻子（碰）是三张相同的牌。顺子（吃）是同花色连续三个数字。字牌只能组刻子，不能组顺子。"
          ),
        ],
        groups: [
          { label: L("Triplet", "刻子", "刻子"), tiles: [tt("characters", 8), tt("characters", 8), tt("characters", 8)] },
          { label: L("Run", "順子", "顺子"), tiles: [tt("bamboo", 4), tt("bamboo", 5), tt("bamboo", 6)] },
        ],
      },
      {
        kind: "info",
        title: L("The pair", "對子（眼）", "对子（眼）"),
        body: [
          L(
            "The last two tiles of your hand are the Pair — just two identical tiles. Sometimes called the “eyes”.",
            "手牌最後兩張是對子 — 兩張相同的牌，俗稱「眼」。",
            "手牌最后两张是对子 — 两张相同的牌，俗称「眼」。"
          ),
          L(
            "Any tile can be your pair: a number tile, a wind, or a dragon.",
            "任何牌都可以做對子：數字牌、風牌或三元牌皆可。",
            "任何牌都可以做对子：数字牌、风牌或三元牌皆可。"
          ),
        ],
        groups: [{ label: PAIR, tiles: [tt("winds", 3), tt("winds", 3)] }],
      },
      {
        kind: "pick",
        title: L("Complete the run", "完成順子", "完成顺子"),
        prompt: L(
          "You have two bamboo tiles below. Tap the tile that completes them into a run.",
          "下方有兩張索子。點一張能與它們組成順子的牌。",
          "下方有两张索子。点一张能与它们组成顺子的牌。"
        ),
        groups: [{ tiles: [tt("bamboo", 3), tt("bamboo", 4)] }],
        choices: [tt("bamboo", 5), tt("dots", 4), tt("bamboo", 7), tt("dragons", 1)],
        correctKeys: ["bamboo-5"],
        explanation: L(
          "3-4-5 Bamboo is a run — three consecutive numbers in the same suit. (A 2 Bamboo would also have worked!)",
          "三索、四索、五索是順子 — 同花色連續三個數字。（二索其實也可以！）",
          "三索、四索、五索是顺子 — 同花色连续三个数字。（二索其实也可以！）"
        ),
        hint: L(
          "A run is three numbers in a row, all the same suit. What comes right after 3 and 4?",
          "順子是同花色連續三個數字。三和四之後是甚麼？",
          "顺子是同花色连续三个数字。三和四之后是什么？"
        ),
      },
      {
        kind: "quiz",
        title: L("Spot the triplet", "找出刻子", "找出刻子"),
        prompt: L("Which of these groups is a valid Triplet?", "以下哪一組是有效的刻子？", "以下哪一组是有效的刻子？"),
        options: [
          { label: L("", "", ""), tiles: [tt("dots", 5), tt("dots", 5), tt("dots", 5)], correct: true },
          { label: L("", "", ""), tiles: [tt("dots", 5), tt("dots", 6), tt("dots", 7)] },
          { label: L("", "", ""), tiles: [tt("dots", 5), tt("bamboo", 5), tt("characters", 5)] },
        ],
        explanation: L(
          "A triplet is three of the exact same tile. The middle group is a run, and the last is three different suits — neither counts as a triplet.",
          "刻子是三張完全相同的牌。中間那組是順子，最後一組是三種不同花色 — 都不算刻子。",
          "刻子是三张完全相同的牌。中间那组是顺子，最后一组是三种不同花色 — 都不算刻子。"
        ),
      },
    ],
  },
  {
    id: "win",
    title: L("Completing a Hand", "砌成食糊", "凑成胡牌"),
    icon: "🏆",
    steps: [
      {
        kind: "info",
        title: L("Putting it together", "組合起來", "组合起来"),
        body: [
          L(
            "Here's a hand that's one tile away from winning. It already has three finished sets and a pair, plus two bamboo (1 and 2) waiting to become a run.",
            "以下這副牌只差一張就食糊。它已有三組完成的牌和一對，再加一索、二索等一張變成順子。",
            "以下这副牌只差一张就胡。它已有三组完成的牌和一对，再加一索、二索等一张变成顺子。"
          ),
          L(
            "See if you can spot the tile it needs on the next screen.",
            "看看你能否在下一頁找出它需要的牌。",
            "看看你能否在下一页找出它需要的牌。"
          ),
        ],
        groups: [
          { label: SET, tiles: [tt("dots", 2), tt("dots", 3), tt("dots", 4)] },
          { label: SET, tiles: [tt("dots", 6), tt("dots", 7), tt("dots", 8)] },
          { label: SET, tiles: [tt("dragons", 1), tt("dragons", 1), tt("dragons", 1)] },
          { label: PAIR, tiles: [tt("winds", 1), tt("winds", 1)] },
          { label: L("Waiting…", "等牌…", "等牌…"), tiles: [tt("bamboo", 1), tt("bamboo", 2)] },
        ],
      },
      {
        kind: "pick",
        title: L("Find the winning tile", "找出食糊牌", "找出胡牌"),
        prompt: L(
          "The 1 and 2 Bamboo need one more tile to finish. Tap the tile that completes the whole hand.",
          "一索和二索還差一張。點一張能令整副牌食糊的牌。",
          "一索和二索还差一张。点一张能令整副牌胡的牌。"
        ),
        groups: [
          { label: SET, tiles: [tt("dots", 2), tt("dots", 3), tt("dots", 4)] },
          { label: SET, tiles: [tt("dots", 6), tt("dots", 7), tt("dots", 8)] },
          { label: SET, tiles: [tt("dragons", 1), tt("dragons", 1), tt("dragons", 1)] },
          { label: PAIR, tiles: [tt("winds", 1), tt("winds", 1)] },
          { label: L("Waiting…", "等牌…", "等牌…"), tiles: [tt("bamboo", 1), tt("bamboo", 2)] },
        ],
        choices: [tt("bamboo", 3), tt("dots", 3), tt("bamboo", 2), tt("dragons", 3)],
        correctKeys: ["bamboo-3"],
        explanation: L(
          "1-2-3 Bamboo completes the fourth run, giving you 4 sets + 1 pair. That's a winning hand!",
          "一索、二索、三索組成第四組順子，湊成四組加一對，就食糊了！",
          "一索、二索、三索组成第四组顺子，凑成四组加一对，就胡了！"
        ),
        hint: L(
          "1 and 2 need the number that comes next to form 1-2-3, all bamboo.",
          "一和二需要接著的數字組成一二三，全部索子。",
          "一和二需要接着的数字组成一二三，全部索子。"
        ),
      },
      {
        kind: "info",
        title: L("Two ways to win", "兩種食糊方式", "两种胡牌方式"),
        body: [
          L("You can complete your hand in two ways:", "食糊有兩種方式：", "胡牌有两种方式："),
          L(
            "• Self-draw — you draw your winning tile yourself from the wall.",
            "• 自摸 — 你自己從牌牆摸到食糊的牌。",
            "• 自摸 — 你自己从牌墙摸到胡的牌。"
          ),
          L(
            "• Off a discard — someone throws away the exact tile you need, and you claim it to win.",
            "• 食出銃 — 有人打出你需要的牌，你叫牌食糊。",
            "• 食出铳 — 有人打出你需要的牌，你叫牌胡。"
          ),
          L(
            "Important: only one player can win from a single discarded tile. If two players could both use it, it goes to whoever is next in turn order after the person who threw it.",
            "重要：一張打出的牌只能由一人食。若兩人都能食，會由打牌者之後、順序最近的一位食。",
            "重要：一张打出的牌只能由一人食。若两人都能食，会由打牌者之后、顺序最近的一位食。"
          ),
        ],
        callout: L(
          "When you can win, the app shows a “Win” button — you're never expected to spot it alone.",
          "當你能食糊時，程式會顯示「食糊」按鈕 — 不用你自己留意。",
          "当你能胡时，程序会显示「胡牌」按钮 — 不用你自己留意。"
        ),
      },
    ],
  },
  {
    id: "turns",
    title: L("Playing a Turn", "如何行牌", "如何行牌"),
    icon: "🔄",
    steps: [
      {
        kind: "info",
        title: L("Draw one, discard one", "摸一張，打一張", "摸一张，打一张"),
        body: [
          L(
            "Play goes around the table. On your turn you draw one tile from the wall, then throw away (discard) one tile you don't need. Your hand always returns to 13 tiles.",
            "牌局按順序進行。輪到你時，先從牌牆摸一張，再打出一張不需要的牌。你的手牌永遠回到 13 張。",
            "牌局按顺序进行。轮到你时，先从牌墙摸一张，再打出一张不需要的牌。你的手牌永远回到 13 张。"
          ),
          L(
            "Every discard is placed face-up in the middle where everyone can see it — that's how the other players (and you) get chances to claim tiles.",
            "每張打出的牌都正面放在中間，人人可見 — 其他人（和你）就靠這樣得到叫牌的機會。",
            "每张打出的牌都正面放在中间，人人可见 — 其他人（和你）就靠这样得到叫牌的机会。"
          ),
        ],
        callout: L(
          "Slowly, draw by draw, you trade away useless tiles and collect the ones that build your 4 sets + 1 pair.",
          "一摸一打之間，慢慢換走無用的牌，收集能砌成四組加一對的牌。",
          "一摸一打之间，慢慢换走无用的牌，收集能凑成四组加一对的牌。"
        ),
      },
    ],
  },
  {
    id: "calls",
    title: L("Claiming Tiles", "叫牌", "叫牌"),
    icon: "✋",
    steps: [
      {
        kind: "info",
        title: L("Pong, Chi & Kong", "碰、上、槓", "碰、吃、杠"),
        body: [
          L(
            "When another player discards a tile you can use, you may “call” it instead of waiting to draw it yourself:",
            "當別人打出你用得著的牌時，你可以「叫牌」取用，不用等自己摸：",
            "当别人打出你用得着的牌时，你可以「叫牌」取用，不用等自己摸："
          ),
          L(
            "• Pong — take a discard to complete a Triplet (you must already hold a matching pair). Anyone can Pong.",
            "• 碰 — 取一張打出的牌組成刻子（你手上要先有一對）。任何人都可以碰。",
            "• 碰 — 取一张打出的牌组成刻子（你手上要先有一对）。任何人都可以碰。"
          ),
          L(
            "• Chi — take a discard to complete a Run. Only allowed from the player directly to your left.",
            "• 上 — 取一張打出的牌組成順子。只能吃你上家（左邊）打的牌。",
            "• 吃 — 取一张打出的牌组成顺子。只能吃你上家（左边）打的牌。"
          ),
          L(
            "• Kong — take a discard to make four-of-a-kind. You then draw a bonus replacement tile.",
            "• 槓 — 取一張打出的牌湊成四張相同，然後補摸一張。",
            "• 杠 — 取一张打出的牌凑成四张相同，然后补摸一张。"
          ),
        ],
        groups: [
          { label: L("Hold a pair…", "手上有一對…", "手上有一对…"), tiles: [tt("bamboo", 5), tt("bamboo", 5)] },
          { label: L("…Pong this discard", "…碰這張打出的牌", "…碰这张打出的牌"), tiles: [tt("bamboo", 5)] },
        ],
      },
      {
        kind: "info",
        title: L("Calling has a trade-off", "叫牌有代價", "叫牌有代价"),
        body: [
          L(
            "Claiming a tile is powerful — it speeds up your hand and lets you grab a tile before your turn. But there's a cost:",
            "叫牌很強 — 能加快砌牌，還能在未輪到你時搶牌。但也有代價：",
            "叫牌很强 — 能加快凑牌，还能在未轮到你时抢牌。但也有代价："
          ),
          L(
            "The set you call is placed face-up for everyone to see, so opponents learn what you're collecting. Some high-scoring hands also require staying fully concealed.",
            "叫出來的一組牌要正面示人，對手會知道你在收甚麼。有些高番牌型更要求全副門前清（不叫牌）。",
            "叫出来的一组牌要正面示人，对手会知道你在收什么。有些高番牌型更要求全副门前清（不叫牌）。"
          ),
          L(
            "You can always tap “Pass” to skip a call and keep your hand hidden.",
            "你隨時可以按「過」跳過叫牌，保持手牌隱藏。",
            "你随时可以点「过」跳过叫牌，保持手牌隐藏。"
          ),
        ],
        callout: L(
          "Rule of thumb for beginners: call when it clearly finishes a set you need, otherwise Pass.",
          "新手法則：能明確完成你需要的一組牌就叫，否則就過。",
          "新手法则：能明确完成你需要的一组牌就叫，否则就过。"
        ),
      },
      {
        kind: "quiz",
        title: L("Can you call it?", "你可以叫嗎？", "你可以叫吗？"),
        prompt: L(
          "You hold a pair of 5 Bamboo. The player across the table discards a 5 Bamboo. What can you do?",
          "你手上有一對五索。對家打出一張五索。你可以怎樣做？",
          "你手上有一对五索。对家打出一张五索。你可以怎样做？"
        ),
        groups: [
          { label: L("Your hand", "你的手牌", "你的手牌"), tiles: [tt("bamboo", 5), tt("bamboo", 5)] },
          { label: L("Discarded", "打出的牌", "打出的牌"), tiles: [tt("bamboo", 5)] },
        ],
        options: [
          { label: L("Pong it to make a triplet", "碰，湊成刻子", "碰，凑成刻子"), correct: true },
          { label: L("Chi it (it's not the player on your left)", "上（但他不是你的上家）", "吃（但他不是你的上家）") },
          { label: L("Nothing — you can't use it", "甚麼都做不到 — 用不上", "什么都做不到 — 用不上") },
        ],
        explanation: L(
          "A matching pair + the discard = a Pong (triplet), and Pong works from any player. Chi would only be allowed from the player on your left.",
          "一對加上打出的牌 = 碰（刻子），而且碰任何人都可以。上就只能吃上家打的牌。",
          "一对加上打出的牌 = 碰（刻子），而且碰任何人都可以。吃就只能吃上家打的牌。"
        ),
      },
    ],
  },
  {
    id: "scoring",
    title: L("Scoring & Fan", "計番", "计番"),
    icon: "💰",
    steps: [
      {
        kind: "info",
        title: L("Points are counted in “fan”", "分數以「番」計算", "分数以「番」计算"),
        body: [
          L(
            "When you win, your hand is scored in units called fan. The more special your hand, the more fan it's worth — and the more points (and play-money) you collect from the others.",
            "食糊時，牌型會以「番」為單位計分。牌型越特別，番數越高，向其他人收的分數（和遊戲金錢）也越多。",
            "胡牌时，牌型会以「番」为单位计分。牌型越特别，番数越高，向其他人收的分数（和游戏金钱）也越多。"
          ),
          L(
            "A plain hand with no special pattern is worth very little. Hands built around a theme are worth much more.",
            "沒有任何特別牌型的雞糊值很少。圍繞某個主題砌的牌型則值錢得多。",
            "没有任何特别牌型的鸡胡值很少。围绕某个主题凑的牌型则值钱得多。"
          ),
        ],
      },
      {
        kind: "info",
        title: L("Some common patterns", "一些常見牌型", "一些常见牌型"),
        body: [
          L(
            "You don't need to memorise these — the app scores everything for you. But here are a few worth aiming for:",
            "你不用背這些 — 程式會自動計分。但以下幾種值得爭取：",
            "你不用背这些 — 程序会自动计分。但以下几种值得争取："
          ),
          L("• All Sequences — every set is a run, plus a pair.", "• 平糊 — 每組都是順子，再加一對。", "• 平糊 — 每组都是顺子，再加一对。"),
          L("• All Triplets — every set is a triplet.", "• 對對糊 — 每組都是刻子。", "• 对对糊 — 每组都是刻子。"),
          L("• Half Flush — one suit only, plus honor tiles.", "• 混一色 — 只有一種花色，加字牌。", "• 混一色 — 只有一种花色，加字牌。"),
          L("• Full Flush — a single suit and nothing else (very high!).", "• 清一色 — 只有單一花色，沒有其他（番數很高！）。", "• 清一色 — 只有单一花色，没有其他（番数很高！）。"),
          L(
            "• Dragon or your-Wind triplet — a triplet of a dragon or your seat wind is +1 fan each.",
            "• 三元牌或你的門風刻子 — 三元牌或自己門風的刻子，每種 +1 番。",
            "• 三元牌或你的门风刻子 — 三元牌或自己门风的刻子，每种 +1 番。"
          ),
        ],
        groups: [
          {
            label: L("Half Flush", "混一色", "混一色"),
            tiles: [tt("bamboo", 2), tt("bamboo", 3), tt("bamboo", 4), tt("bamboo", 5), tt("bamboo", 5), tt("dragons", 1), tt("dragons", 1)],
          },
        ],
        callout: L(
          "Flowers and Seasons that match your seat each add a bonus point too.",
          "與你座位相符的花牌和季節牌，每張也 +1 番。",
          "与你座位相符的花牌和季节牌，每张也 +1 番。"
        ),
      },
      {
        kind: "info",
        title: L("The “fan minimum”", "「最低番數」", "「最低番数」"),
        body: [
          L(
            "Many games set a minimum number of fan you need before you're allowed to declare a win. It stops people from winning instantly with a worthless hand.",
            "很多牌局會設定食糊所需的最低番數，避免有人用毫無價值的牌即時食糊。",
            "很多牌局会设定胡牌所需的最低番数，避免有人用毫无价值的牌即时胡牌。"
          ),
          L(
            "This app lets the host pick the minimum: 0 (anything wins), 3, or 5 fan. With a 3-fan minimum, a plain patternless hand can't win — you'll need at least one scoring pattern like a flush or a dragon triplet.",
            "本程式讓房主選擇最低番數：0（任何糊）、3 番或 5 番。在 3 番最低下，沒有牌型的雞糊不能食 — 你至少要有一個計番牌型，例如混一色或三元牌刻子。",
            "本程序让房主选择最低番数：0（任何胡）、3 番或 5 番。在 3 番最低下，没有牌型的鸡胡不能胡 — 你至少要有一个计番牌型，例如混一色或三元牌刻子。"
          ),
        ],
        callout: L(
          "In the practice game next, the minimum is 0, so you can win with any complete hand while you learn.",
          "接下來的練習局最低番數是 0，讓你邊學邊玩，任何完整牌型都能食糊。",
          "接下来的练习局最低番数是 0，让你边学边玩，任何完整牌型都能胡牌。"
        ),
      },
      {
        kind: "quiz",
        title: L("Last check", "最後測驗", "最后测验"),
        prompt: L(
          "Under a 3-fan minimum, can you declare a win with a complete hand that has no special pattern (0 fan)?",
          "在 3 番最低下，用一副沒有特別牌型（0 番）的完整牌可以食糊嗎？",
          "在 3 番最低下，用一副没有特别牌型（0 番）的完整牌可以胡牌吗？"
        ),
        options: [
          { label: L("No — you need at least 3 fan of patterns", "不能 — 至少要有 3 番的牌型", "不能 — 至少要有 3 番的牌型"), correct: true },
          { label: L("Yes — any 4 sets + a pair always wins", "可以 — 任何四組加一對都能食", "可以 — 任何四组加一对都能胡") },
        ],
        explanation: L(
          "Right! A minimum means your hand must reach that many fan before the Win button appears. No pattern, no win — keep building.",
          "正確！設定最低番數，代表牌型要達到該番數，「食糊」按鈕才會出現。沒牌型就不能食 — 繼續砌牌吧。",
          "正确！设定最低番数，代表牌型要达到该番数，「胡牌」按钮才会出现。没牌型就不能胡 — 继续凑牌吧。"
        ),
      },
    ],
  },
];

/** Total number of steps across all lessons, for the overall progress bar. */
export const TOTAL_STEPS = LESSONS.reduce((n, l) => n + l.steps.length, 0);
