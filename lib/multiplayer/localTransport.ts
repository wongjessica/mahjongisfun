import { RemoteAction, RoomConfig, RoomPlayer, RoomSnapshot, RoomStatus, RoundInfo } from "./protocol";
import { RoomTransport } from "./transport";

const STORAGE_PREFIX = "mahjong-room:";
const CHANNEL_NAME = "mahjong-rooms";

/** Same-device transport: rooms live in localStorage, and a BroadcastChannel
 * pokes other tabs to re-read after every write. This is what runs when
 * Firebase isn't configured -- it makes the entire multiplayer stack
 * exercisable (and end-to-end testable) with two browser tabs, no account
 * or network needed. Writes from different tabs interleave through the
 * same read-modify-write path; the tiny race window this leaves is absorbed
 * by the replay legality gate, which drops duplicated/raced actions the
 * same way on every client.
 */
export class LocalTransport implements RoomTransport {
  private channel: BroadcastChannel | null = null;

  private getChannel(): BroadcastChannel {
    if (!this.channel) this.channel = new BroadcastChannel(CHANNEL_NAME);
    return this.channel;
  }

  now(): number {
    return Date.now();
  }

  private read(code: string): RoomSnapshot | null {
    const raw = localStorage.getItem(STORAGE_PREFIX + code);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as RoomSnapshot;
    } catch {
      return null;
    }
  }

  private write(code: string, room: RoomSnapshot): void {
    localStorage.setItem(STORAGE_PREFIX + code, JSON.stringify(room));
    this.getChannel().postMessage({ code });
  }

  private mutate(code: string, fn: (room: RoomSnapshot) => RoomSnapshot): void {
    const room = this.read(code);
    if (!room) return;
    this.write(code, fn(room));
  }

  async createRoom(room: RoomSnapshot): Promise<void> {
    this.write(room.code, room);
  }

  async fetchRoom(code: string): Promise<RoomSnapshot | null> {
    return this.read(code);
  }

  async setPlayer(code: string, player: RoomPlayer): Promise<void> {
    this.mutate(code, (room) => ({ ...room, players: { ...room.players, [player.id]: player } }));
  }

  async removePlayer(code: string, playerId: string): Promise<void> {
    this.mutate(code, (room) => {
      const players = { ...room.players };
      delete players[playerId];
      return { ...room, players };
    });
  }

  async touchPlayer(code: string, playerId: string): Promise<void> {
    this.mutate(code, (room) => {
      const existing = room.players[playerId];
      if (!existing) return room;
      return { ...room, players: { ...room.players, [playerId]: { ...existing, lastSeen: Date.now() } } };
    });
  }

  async setConfig(code: string, config: RoomConfig): Promise<void> {
    this.mutate(code, (room) => ({ ...room, config }));
  }

  async setStatus(code: string, status: RoomStatus): Promise<void> {
    this.mutate(code, (room) => ({ ...room, status }));
  }

  async setBotNames(code: string, botNames: Record<number, string>): Promise<void> {
    this.mutate(code, (room) => ({ ...room, botNames }));
  }

  async setRound(code: string, round: RoundInfo): Promise<void> {
    this.mutate(code, (room) => ({ ...room, round }));
  }

  async appendAction(code: string, action: RemoteAction): Promise<void> {
    this.mutate(code, (room) => ({ ...room, actions: [...room.actions, action] }));
  }

  subscribe(code: string, callback: (room: RoomSnapshot | null) => void): () => void {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    const emit = () => callback(this.read(code));
    channel.onmessage = (event) => {
      if (event.data?.code === code) emit();
    };
    // localStorage events cover writes from tabs whose channel messages
    // raced past this subscriber's setup.
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_PREFIX + code) emit();
    };
    window.addEventListener("storage", onStorage);
    emit();
    return () => {
      channel.close();
      window.removeEventListener("storage", onStorage);
    };
  }
}
