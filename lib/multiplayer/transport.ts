import { RemoteAction, RoomConfig, RoomPlayer, RoomSnapshot, RoomStatus, RoundInfo } from "./protocol";

/** The sync boundary between game logic and whatever moves bytes between
 * players. Two implementations: LocalTransport (BroadcastChannel +
 * localStorage -- tabs on one device, zero setup, used for dev/testing) and
 * FirebaseTransport (real online play). Everything above this interface is
 * transport-agnostic, so swapping backends never touches game code.
 *
 * All writes are path-scoped (one player, the config, the round, one
 * appended action) rather than whole-room, so concurrent writers on
 * different paths can't clobber each other. */
export interface RoomTransport {
  /** Millisecond clock consistent with the lastSeen stamps this transport
   * writes -- presence math must compare like with like. */
  now(): number;
  createRoom(room: RoomSnapshot): Promise<void>;
  /** Fetch a room once (join-time existence/fullness check). */
  fetchRoom(code: string): Promise<RoomSnapshot | null>;
  setPlayer(code: string, player: RoomPlayer): Promise<void>;
  removePlayer(code: string, playerId: string): Promise<void>;
  /** Refresh a player's lastSeen presence stamp. */
  touchPlayer(code: string, playerId: string): Promise<void>;
  setConfig(code: string, config: RoomConfig): Promise<void>;
  setStatus(code: string, status: RoomStatus): Promise<void>;
  setBotNames(code: string, botNames: Record<number, string>): Promise<void>;
  setRound(code: string, round: RoundInfo): Promise<void>;
  appendAction(code: string, action: RemoteAction): Promise<void>;
  /** Subscribe to live room changes. Fires immediately with the current
   * snapshot (or null if the room doesn't exist). */
  subscribe(code: string, callback: (room: RoomSnapshot | null) => void): () => void;
}
