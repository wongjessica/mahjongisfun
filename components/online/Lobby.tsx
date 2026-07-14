"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ToggleRow, optionActive, optionBase, optionInactive } from "@/components/setup/SetupForm";
import { RoomConfig, isPlayerConnected, playersInJoinOrder } from "@/lib/multiplayer/protocol";
import { isOnlineAcrossDevices } from "@/lib/multiplayer/getTransport";
import { OnlineRoomState } from "./useOnlineRoom";

const WIND_LABELS = ["East", "South", "West", "North"];

/** Pre-game room screen: who's here, the invite code, and (for the host)
 * the match settings + start button. Seats are join order; every seat not
 * filled by a human when the host starts becomes a bot -- which is exactly
 * the 2 humans + 2 bots / 3 + 1 / 4 + 0 rule with no extra choices to make. */
export function Lobby({ online, onLeave }: { online: OnlineRoomState; onLeave: () => void }) {
  const { room, isActingHost, now, startGame, setConfig } = online;
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  if (!room) return null;
  const config = room.config;
  const ordered = playersInJoinOrder(room);
  const connectedCount = ordered.filter((p) => isPlayerConnected(p, now)).length;
  const canStart = isActingHost && connectedCount >= 2 && !starting;

  const updateConfig = (partial: Partial<RoomConfig>) => {
    if (isActingHost) void setConfig({ ...config, ...partial });
  };

  const copyInvite = async () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${room.code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; the visible code is the fallback.
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="mx-auto flex w-full max-w-md flex-col gap-5 rounded-2xl border border-white/10 bg-white p-6 shadow-2xl sm:p-8"
    >
      <div className="text-center">
        <h1 className="text-xl font-bold text-slate-900">Game Lobby</h1>
        <button
          onClick={copyInvite}
          title="Copy invite link"
          className="mt-2 inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 px-4 py-2 font-mono text-2xl font-bold tracking-[0.3em] text-emerald-700 hover:border-emerald-400"
        >
          {room.code}
          <span className="text-xs font-sans font-semibold tracking-normal text-emerald-500">
            {copied ? "copied!" : "copy link"}
          </span>
        </button>
        <p className="mt-1 text-xs text-slate-400">
          Friends join with this code{isOnlineAcrossDevices() ? "" : " (device-only mode: works between tabs on this device until Firebase is configured)"}.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        {[0, 1, 2, 3].map((i) => {
          const player = ordered[i];
          const connected = player ? isPlayerConnected(player, now) : false;
          return (
            <div
              key={i}
              className={`flex items-center justify-between rounded-xl border-2 px-4 py-2.5 ${
                player ? "border-slate-200" : "border-dashed border-slate-200"
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    player ? (connected ? "bg-emerald-500" : "bg-slate-300") : "bg-slate-200"
                  }`}
                />
                <span className={`text-sm font-semibold ${player ? "text-slate-700" : "text-slate-400"}`}>
                  {player ? player.name : "Bot (auto-fills)"}
                  {player && !connected && <span className="text-slate-400"> · reconnecting…</span>}
                  {i === 0 && player && <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-bold text-amber-700">HOST</span>}
                </span>
              </span>
              <span className="text-[10px] font-bold uppercase text-slate-400">{WIND_LABELS[i]}</span>
            </div>
          );
        })}
      </div>

      <div>
        <span className="block text-sm font-medium text-slate-700">Win minimum</span>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={!isActingHost}
            onClick={() => updateConfig({ fanMinimum: 0 })}
            className={`${optionBase} ${config.fanMinimum === 0 ? optionActive : optionInactive} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            0-fan minimum
          </button>
          <button
            type="button"
            disabled={!isActingHost}
            onClick={() => updateConfig({ fanMinimum: 3 })}
            className={`${optionBase} ${config.fanMinimum === 3 ? optionActive : optionInactive} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            3-fan minimum
          </button>
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium text-slate-700">Game speed</span>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={!isActingHost}
            onClick={() => updateConfig({ speed: "fast" })}
            className={`${optionBase} ${config.speed === "fast" ? optionActive : optionInactive} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            ⚡ Fast
          </button>
          <button
            type="button"
            disabled={!isActingHost}
            onClick={() => updateConfig({ speed: "slow" })}
            className={`${optionBase} ${config.speed === "slow" ? optionActive : optionInactive} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            🎬 Immersive
          </button>
        </div>
      </div>

      {isActingHost ? (
        <ToggleRow
          label="Show who discarded"
          hint="Off: all discards mix into one anonymous pile"
          checked={!config.anonymousDiscards}
          onChange={(checked) => updateConfig({ anonymousDiscards: !checked })}
        />
      ) : (
        <p className="text-center text-xs text-slate-400">The host picks the match settings.</p>
      )}

      {isActingHost ? (
        <motion.button
          type="button"
          whileHover={canStart ? { scale: 1.02 } : undefined}
          whileTap={canStart ? { scale: 0.98 } : undefined}
          disabled={!canStart}
          onClick={async () => {
            setStarting(true);
            try {
              await startGame(config);
            } finally {
              setStarting(false);
            }
          }}
          className="rounded-xl bg-emerald-700 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {starting
            ? "Starting…"
            : connectedCount >= 2
              ? `Start Game (${connectedCount} player${connectedCount > 1 ? "s" : ""} + ${4 - connectedCount} bot${4 - connectedCount === 1 ? "" : "s"})`
              : "Waiting for at least one more player…"}
        </motion.button>
      ) : (
        <p className="flex items-center justify-center gap-2 text-sm font-medium text-slate-500">
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-slate-400"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          Waiting for the host to start…
        </p>
      )}

      <button onClick={onLeave} className="text-xs font-medium text-slate-400 underline hover:text-slate-600">
        Leave room
      </button>
    </motion.div>
  );
}
