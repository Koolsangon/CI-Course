"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import Button from "@/components/ui/Button";

/**
 * First-load profile name modal — non-blocking. The user can either enter a name
 * or skip with "익명으로 시작". The default is "신임 엔지니어".
 *
 * The modal appears exactly once per profile (controlled by profile.createdAt sentinel).
 * On a shared classroom laptop, the instructor can clear localStorage or visit
 * `/?reset=1` (Phase C) to reset.
 */
export default function ProfileGate() {
  const profile = useStore((s) => s.profile);
  const setProfileName = useStore((s) => s.setProfileName);
  const [name, setName] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => setHydrated(true), []);

  if (!hydrated) return null;
  // ProfileGate is opt-in (not auto-shown). The store auto-claims a default profile
  // so the gate never blocks first-time interactions. To trigger it manually, set
  // profile.createdAt = 0 from a settings panel (Phase C).
  if (profile.createdAt > 0) return null;
  if (skipped) return null;

  function submit() {
    setProfileName(name);
  }

  function skip() {
    // Touch the profile so the gate doesn't appear again, but keep the default name
    setProfileName("");
    setSkipped(true);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur sm:items-center sm:p-6"
      >
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 26 }}
          className="w-full max-w-md overflow-hidden rounded-t-3xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] p-6 shadow-elevated sm:rounded-3xl"
          data-test="profile-gate"
        >
          <h2 className="text-lg font-bold text-[hsl(var(--fg))]">처음 오셨네요</h2>
          <p className="mt-1 text-sm text-[hsl(var(--muted))]">
            진행 상황을 저장하기 위해 이름을 알려 주세요. (선택)
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="예: 김원가"
            maxLength={20}
            data-test="profile-name-input"
            className="mt-4 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] px-4 py-3 text-sm font-medium text-[hsl(var(--fg))] outline-none transition-all focus:ring-2 focus:ring-[hsl(var(--accent))]"
          />
          <div className="mt-4 flex gap-2">
            <Button variant="accent" size="md" onClick={submit} className="flex-1" data-test="profile-submit">
              시작
            </Button>
            <Button variant="ghost" size="md" onClick={skip} data-test="profile-skip">
              익명으로
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
