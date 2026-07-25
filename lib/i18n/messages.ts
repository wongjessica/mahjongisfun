import { Lang } from "./lang";

type Entry = Record<Lang, string>;

/** All fixed UI strings, keyed by a stable id. `{var}` placeholders are
 * filled by translate()'s `vars` argument. */
export const MESSAGES: Record<string, Entry> = {
  // --- generic ---
  "common.you": { en: "You", "zh-Hant": "你", "zh-Hans": "你" },
  "common.back": { en: "Back", "zh-Hant": "返回", "zh-Hans": "返回" },
  "common.cancel": { en: "Cancel", "zh-Hant": "取消", "zh-Hans": "取消" },
  "common.close": { en: "Close", "zh-Hant": "關閉", "zh-Hans": "关闭" },
  "common.loading": { en: "Loading…", "zh-Hant": "載入中…", "zh-Hans": "加载中…" },

  // --- home / setup ---
  "home.title": { en: "Hong Kong Mahjong", "zh-Hant": "香港麻雀", "zh-Hans": "香港麻将" },
  "home.subtitle": { en: "Play vs. bots or friends", "zh-Hant": "與電腦或朋友對戰", "zh-Hans": "与电脑或朋友对战" },
  "home.learn.title": { en: "New to mahjong? Learn to Play", "zh-Hant": "初學麻雀？學習玩法", "zh-Hans": "初学麻将？学习玩法" },
  "home.learn.subtitle": { en: "A 5-minute tutorial, then a coached game vs bots", "zh-Hant": "五分鐘教學，再由教練陪你對戰電腦", "zh-Hans": "五分钟教学，再由教练陪你对战电脑" },
  "home.beta": { en: "Try the Beta Table", "zh-Hant": "試玩 Beta 牌桌", "zh-Hans": "试玩 Beta 牌桌" },
  "home.beta.tag": { en: "(new authentic look)", "zh-Hant": "（全新真實外觀）", "zh-Hans": "（全新真实外观）" },

  "setup.title": { en: "New Game", "zh-Hant": "新對局", "zh-Hans": "新对局" },
  "setup.fanMin": { en: "Minimum fan to win", "zh-Hant": "食糊最低番數", "zh-Hans": "胡牌最低番数" },
  "setup.fanMin.hint": { en: "Higher minimums reward bigger hands.", "zh-Hant": "番數越高，越鼓勵砌大牌。", "zh-Hans": "番数越高，越鼓励砌大牌。" },
  "setup.subtitle": { en: "Solo play against 3 bots.", "zh-Hant": "單機對戰 3 位電腦。", "zh-Hans": "单机对战 3 位电脑。" },
  "setup.chipSolo": { en: "Solo", "zh-Hant": "單機", "zh-Hans": "单机" },
  "setup.chipOnline": { en: "Online", "zh-Hant": "線上", "zh-Hans": "在线" },
  "setup.speed": { en: "Game speed", "zh-Hant": "遊戲速度", "zh-Hans": "游戏速度" },
  "setup.speed.fast": { en: "Fast", "zh-Hant": "快速", "zh-Hans": "快速" },
  "setup.speed.slow": { en: "Immersive", "zh-Hant": "沉浸", "zh-Hans": "沉浸" },
  "setup.showDiscarder": { en: "Show who discarded", "zh-Hant": "顯示出牌者", "zh-Hans": "显示出牌者" },
  "setup.showDiscarder.hint": { en: "Off: all discards mix into one anonymous pile", "zh-Hant": "關閉：所有出牌混成一堆不記名", "zh-Hans": "关闭：所有出牌混成一堆不记名" },
  "setup.anon": { en: "Hide who discarded", "zh-Hant": "隱藏出牌者", "zh-Hans": "隐藏出牌者" },
  "setup.avatar": { en: "Your avatar", "zh-Hant": "你的頭像", "zh-Hans": "你的头像" },
  "setup.start": { en: "Start Game", "zh-Hant": "開始遊戲", "zh-Hans": "开始游戏" },
  "setup.online": { en: "Play with Friends", "zh-Hant": "與朋友對戰", "zh-Hans": "与朋友对战" },
  "setup.fan.any": { en: "Any win", "zh-Hant": "任何糊", "zh-Hans": "任何胡" },
  "setup.fan.n": { en: "{n} fan", "zh-Hant": "{n} 番", "zh-Hans": "{n} 番" },

  // --- game status bar ---
  "status.round": { en: "{wind} Round", "zh-Hant": "{wind}圈", "zh-Hans": "{wind}圈" },
  "status.tilesLeft": { en: "{n} left", "zh-Hant": "餘 {n}", "zh-Hans": "余 {n}" },
  "status.fanMin": { en: "{n}-fan min", "zh-Hant": "最低 {n} 番", "zh-Hans": "最低 {n} 番" },
  "status.fanMin.any": { en: "any win", "zh-Hant": "任何糊", "zh-Hans": "任何胡" },
  "status.waiting": { en: "Waiting for the first discard…", "zh-Hant": "等待第一張出牌…", "zh-Hans": "等待第一张出牌…" },
  "status.discarded": { en: "{name} discarded", "zh-Hant": "{name} 打出", "zh-Hans": "{name} 打出" },
  "status.someone": { en: "Someone", "zh-Hant": "有人", "zh-Hans": "有人" },

  // --- actions ---
  "action.draw": { en: "Draw", "zh-Hant": "摸牌", "zh-Hans": "摸牌" },
  "action.discard": { en: "Discard", "zh-Hant": "打出", "zh-Hans": "打出" },
  "action.discardTile": { en: "Discard {tile}", "zh-Hant": "打 {tile}", "zh-Hans": "打 {tile}" },
  "action.pong": { en: "Pong", "zh-Hant": "碰", "zh-Hans": "碰" },
  "action.chi": { en: "Chi", "zh-Hant": "上", "zh-Hans": "吃" },
  "action.kong": { en: "Kong", "zh-Hant": "槓", "zh-Hans": "杠" },
  "action.win": { en: "Declare Win", "zh-Hant": "食糊", "zh-Hans": "胡牌" },
  "action.winShort": { en: "Win", "zh-Hant": "食糊", "zh-Hans": "胡" },
  "action.pass": { en: "Pass", "zh-Hant": "過", "zh-Hans": "过" },
  "action.chiWith": { en: "Chi {a} {b}", "zh-Hant": "上 {a} {b}", "zh-Hans": "吃 {a} {b}" },
  "action.chiWithLabel": { en: "Chi with", "zh-Hant": "上", "zh-Hans": "吃" },
  "action.waitingOthers": { en: "Waiting for other players…", "zh-Hant": "等待其他玩家…", "zh-Hans": "等待其他玩家…" },
  "action.drawing": { en: "Drawing…", "zh-Hant": "摸牌中…", "zh-Hans": "摸牌中…" },
  "action.tapAbove": { en: "Tap a tile above to discard it", "zh-Hant": "點上方的牌即可打出", "zh-Hans": "点上方的牌即可打出" },

  // --- player panel ---
  "panel.dealer": { en: "DEALER", "zh-Hant": "莊", "zh-Hans": "庄" },
  "panel.banker": { en: "Banker", "zh-Hant": "莊", "zh-Hans": "庄" },
  "panel.drawn": { en: "Drawn", "zh-Hant": "摸到", "zh-Hans": "摸到" },
  "panel.inHand": { en: "{n} in hand", "zh-Hant": "手牌 {n}", "zh-Hans": "手牌 {n}" },
  "panel.thinking": { en: "thinking…", "zh-Hant": "思考中…", "zh-Hans": "思考中…" },
  "panel.thinkingWord": { en: "thinking", "zh-Hant": "思考中", "zh-Hans": "思考中" },
  "panel.chiFromHere": { en: "← chi from here", "zh-Hant": "← 可上此家", "zh-Hans": "← 可吃此家" },
  "panel.across": { en: "across", "zh-Hant": "對家", "zh-Hans": "对家" },
  "panel.right": { en: "right", "zh-Hant": "下家", "zh-Hans": "下家" },
  "panel.discards": { en: "Discards", "zh-Hant": "牌河", "zh-Hans": "牌河" },
  "panel.anonymous": { en: "(anonymous)", "zh-Hant": "（不記名）", "zh-Hans": "（不记名）" },
  "panel.noDiscards": { en: "No discards yet", "zh-Hant": "尚無出牌", "zh-Hans": "尚无出牌" },
  "hint.tapPick": { en: "Tap a tile to pick it, then discard", "zh-Hant": "點一張牌選取，再打出", "zh-Hans": "点一张牌选取，再打出" },
  "hint.tapAgain": { en: "Tap the tile again (or “Discard”) to throw it", "zh-Hant": "再點一次（或按「打出」）棄牌", "zh-Hans": "再点一次（或按「打出」）弃牌" },

  // --- round end ---
  "end.wonWith": { en: "{name} won with {fan} fan", "zh-Hant": "{name} 食糊 {fan} 番", "zh-Hans": "{name} 胡牌 {fan} 番" },
  "end.youWonWith": { en: "You won with {fan} fan", "zh-Hant": "你食糊 {fan} 番", "zh-Hans": "你胡牌 {fan} 番" },
  "end.draw": { en: "Draw — no winner", "zh-Hant": "流局 — 無人食糊", "zh-Hans": "流局 — 无人胡牌" },
  "end.drawDesc": { en: "The wall ran out before anyone completed a hand.", "zh-Hant": "牌牆摸完仍無人食糊。", "zh-Hans": "牌墙摸完仍无人胡牌。" },
  "end.fan": { en: "{n} fan", "zh-Hant": "{n} 番", "zh-Hans": "{n} 番" },
  "end.nextRound": { en: "Next Round", "zh-Hant": "下一局", "zh-Hans": "下一局" },
  "end.newMatch": { en: "New match / change settings", "zh-Hant": "新牌局／更改設定", "zh-Hans": "新牌局／更改设置" },
  "end.stayDealer": { en: "You stay dealer next round.", "zh-Hant": "下一局你續莊。", "zh-Hans": "下一局你续庄。" },
  "end.dealerPasses": { en: "The deal passes on next round.", "zh-Hant": "下一局轉莊。", "zh-Hans": "下一局转庄。" },
  "end.viewResults": { en: "View Results", "zh-Hant": "查看結果", "zh-Hans": "查看结果" },
  "end.waitingHost": { en: "Waiting for the host to start the next round…", "zh-Hant": "等待房主開始下一局…", "zh-Hans": "等待房主开始下一局…" },
  "end.wallExhausted": { en: "Wall exhausted — no winner this round.", "zh-Hant": "牌牆摸完 — 本局無人食糊。", "zh-Hans": "牌墙摸完 — 本局无人胡牌。" },
  "end.selfDraw": { en: "(self-draw)", "zh-Hant": "（自摸）", "zh-Hans": "（自摸）" },
  "end.solo": { en: "solo", "zh-Hant": "單機", "zh-Hans": "单机" },
  "end.online": { en: "online", "zh-Hant": "線上", "zh-Hans": "在线" },
  "end.added": { en: "{amount} added to your {kind} balance", "zh-Hant": "{amount} 已加入你的{kind}餘額", "zh-Hans": "{amount} 已加入你的{kind}余额" },
  "end.paid": { en: "{amount} paid from your {kind} balance", "zh-Hant": "{amount} 已從你的{kind}餘額扣除", "zh-Hans": "{amount} 已从你的{kind}余额扣除" },
  "end.noMoney": { en: "No money changes hands for you this round.", "zh-Hant": "本局你沒有金錢往來。", "zh-Hans": "本局你没有金钱往来。" },
  "end.youStayDealer": { en: "You stay dealer next round.", "zh-Hant": "下一局你續莊。", "zh-Hans": "下一局你续庄。" },
  "end.nameStaysDealer": { en: "{name} stays dealer next round.", "zh-Hant": "下一局 {name} 續莊。", "zh-Hans": "下一局 {name} 续庄。" },
  "end.dealerPassesTo": { en: "Dealership passes to {name}.", "zh-Hant": "轉莊給 {name}。", "zh-Hans": "转庄给 {name}。" },
  "end.windTurns": { en: "Every seat has dealt — the table wind turns to {wind}!", "zh-Hant": "各家已輪流做莊 — 圈風轉為 {wind}！", "zh-Hans": "各家已轮流做庄 — 圈风转为 {wind}！" },
  "end.leaveRoom": { en: "Leave room", "zh-Hant": "離開房間", "zh-Hans": "离开房间" },
  "end.closeView": { en: "Close and view the board", "zh-Hant": "關閉並查看牌桌", "zh-Hans": "关闭并查看牌桌" },

  // --- misc in-game ---
  "game.newMatch": { en: "New match", "zh-Hant": "新牌局", "zh-Hans": "新牌局" },
  "game.exitClassic": { en: "Exit to classic", "zh-Hant": "返回經典版", "zh-Hans": "返回经典版" },
  "game.menu": { en: "Menu", "zh-Hant": "選單", "zh-Hans": "菜单" },
  "fullscreen.tip": {
    en: "On iPhone, tap Share → Add to Home Screen, then open it from your home screen to play fullscreen.",
    "zh-Hant": "在 iPhone 上，按「分享」→「加至主畫面」，再從主畫面開啟即可全螢幕遊玩。",
    "zh-Hans": "在 iPhone 上，点「分享」→「添加到主屏幕」，再从主屏幕打开即可全屏游玩。",
  },
};

/** Look up a message in the given language, filling `{var}` placeholders.
 * Falls back to the key itself if unknown, so a missing string is visible
 * rather than silently blank. */
export function translate(key: string, lang: Lang, vars?: Record<string, string | number>): string {
  const entry = MESSAGES[key];
  let s = entry ? entry[lang] : key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
