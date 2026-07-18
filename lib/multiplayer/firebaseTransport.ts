import {
  Database,
  child,
  get,
  getDatabase,
  onValue,
  push,
  ref,
  remove,
  serverTimestamp,
  set,
} from "firebase/database";
import { getFirebaseApp } from "@/lib/firebase/app";
import { RemoteAction, RoomConfig, RoomPlayer, RoomSnapshot, RoomStatus, RoundInfo } from "./protocol";
import { RoomTransport } from "./transport";

/** RTDB does lossy coercions on the way out (numeric-keyed objects can come
 * back as arrays with null holes; empty collections vanish entirely), so
 * every read funnels through this normalizer instead of trusting the raw
 * shape. Game state itself is immune -- it travels as a JSON string. */
function normalizeRoom(raw: unknown): RoomSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;

  const players: Record<string, RoomPlayer> = {};
  if (value.players && typeof value.players === "object") {
    for (const [id, player] of Object.entries(value.players as Record<string, RoomPlayer>)) {
      if (player) players[id] = player;
    }
  }

  const botNames: Record<number, string> = {};
  const rawBotNames = value.botNames;
  if (Array.isArray(rawBotNames)) {
    rawBotNames.forEach((name, seat) => {
      if (name) botNames[seat] = name as string;
    });
  } else if (rawBotNames && typeof rawBotNames === "object") {
    // Keys are written "s0".."s3" (see setBotNames) so RTDB can't coerce
    // the map into an array; strip the prefix on the way back.
    for (const [seat, name] of Object.entries(rawBotNames as Record<string, string>)) {
      if (name) botNames[Number(seat.replace(/^s/, ""))] = name;
    }
  }

  // Actions arrive as a push-keyed object; push keys sort chronologically,
  // which is exactly the append order every client must replay in.
  const actions: RemoteAction[] = [];
  if (value.actions && typeof value.actions === "object" && !Array.isArray(value.actions)) {
    for (const key of Object.keys(value.actions as object).sort()) {
      const action = (value.actions as Record<string, RemoteAction>)[key];
      if (action) actions.push(action);
    }
  } else if (Array.isArray(value.actions)) {
    for (const action of value.actions) if (action) actions.push(action);
  }

  return {
    code: String(value.code ?? ""),
    createdAt: Number(value.createdAt ?? 0),
    status: (value.status as RoomStatus) ?? "lobby",
    config: value.config as RoomConfig,
    players,
    botNames,
    round: (value.round as RoundInfo | undefined) ?? null,
    actions,
  };
}

export class FirebaseTransport implements RoomTransport {
  private db: Database;
  private serverTimeOffsetMs = 0;

  constructor() {
    const app = getFirebaseApp();
    if (!app) throw new Error("FirebaseTransport requires Firebase to be configured");
    this.db = getDatabase(app);
    // Presence stamps are written with serverTimestamp(), so liveness math
    // must run on the server's clock, not this device's.
    onValue(ref(this.db, ".info/serverTimeOffset"), (snapshot) => {
      this.serverTimeOffsetMs = Number(snapshot.val() ?? 0);
    });
  }

  now(): number {
    return Date.now() + this.serverTimeOffsetMs;
  }

  private roomRef(code: string) {
    return ref(this.db, `rooms/${code}`);
  }

  async createRoom(room: RoomSnapshot): Promise<void> {
    // `actions: []` would be stripped by RTDB; omit it and let the
    // normalizer restore the empty list on read.
    const rest: Partial<RoomSnapshot> = { ...room };
    delete rest.actions;
    await set(this.roomRef(room.code), rest);
  }

  async fetchRoom(code: string): Promise<RoomSnapshot | null> {
    const snapshot = await get(this.roomRef(code));
    return normalizeRoom(snapshot.val());
  }

  async setPlayer(code: string, player: RoomPlayer): Promise<void> {
    await set(child(this.roomRef(code), `players/${player.id}`), {
      ...player,
      lastSeen: serverTimestamp(),
    });
  }

  async removePlayer(code: string, playerId: string): Promise<void> {
    await remove(child(this.roomRef(code), `players/${playerId}`));
  }

  async touchPlayer(code: string, playerId: string): Promise<void> {
    await set(child(this.roomRef(code), `players/${playerId}/lastSeen`), serverTimestamp());
  }

  async setConfig(code: string, config: RoomConfig): Promise<void> {
    await set(child(this.roomRef(code), "config"), config);
  }

  async setStatus(code: string, status: RoomStatus): Promise<void> {
    await set(child(this.roomRef(code), "status"), status);
  }

  async setBotNames(code: string, botNames: Record<number, string>): Promise<void> {
    // Prefix keys so RTDB can't coerce the map into an array.
    const safe: Record<string, string> = {};
    for (const [seat, name] of Object.entries(botNames)) safe[`s${seat}`] = name;
    await set(child(this.roomRef(code), "botNames"), safe);
  }

  async setRound(code: string, round: RoundInfo): Promise<void> {
    await set(child(this.roomRef(code), "round"), round);
  }

  async appendAction(code: string, action: RemoteAction): Promise<void> {
    await push(child(this.roomRef(code), "actions"), action);
  }

  subscribe(code: string, callback: (room: RoomSnapshot | null) => void): () => void {
    return onValue(this.roomRef(code), (snapshot) => {
      callback(normalizeRoom(snapshot.val()));
    });
  }
}
