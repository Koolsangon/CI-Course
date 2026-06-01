"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { TreePine, ClipboardList, ArrowRight, Zap, Play, Gamepad2, LogIn } from "lucide-react";
import { IntroSequence, INTRO_SEEN_KEY } from "@/components/Intro/IntroSequence";
import { saveRoomContext } from "@/lib/player";

const cards = [
  {
    href: "/sandbox",
    icon: TreePine,
    label: "자유 실험실",
    sublabel: "Sandbox",
    description:
      "슬라이더를 움직이며 Loading율/재료비/수율/면취수/Mask 수/Tact time 변경 시 COP/COM/영업이익의 변동 여부를 확인합니다.",
    features: [
      "4개 시나리오별 원가 트리 시각화",
      "변수별 종속 관계 및 영향도 확인"
    ],
    accent: "from-[hsl(345_100%_32%/0.08)] to-[hsl(345_100%_32%/0.02)]",
    border: "border-[hsl(345_100%_32%/0.2)] hover:border-[hsl(345_100%_32%/0.5)]",
    iconColor: "text-[hsl(var(--accent))]",
    btnClass: "bg-[hsl(var(--accent))] text-white hover:bg-[hsl(var(--accent)/0.9)]"
  },
  {
    href: "/cases",
    icon: ClipboardList,
    label: "원가 계산 워크시트",
    sublabel: "Worksheet",
    description:
      "Loading율/재료비/수율/면취수/Mask 수/Tact time 변경으로 인한 결과를 직접 계산해 봅니다.",
    features: [
      "4개 시나리오별 COP Table 계산",
      "노란셀 수식 입력, 초록셀 자동계산",
      "힌트 사용 가능",
      "계산 완료 후 채점 가능"
    ],
    accent: "from-[hsl(123_46%_34%/0.08)] to-[hsl(123_46%_34%/0.02)]",
    border: "border-[hsl(123_46%_34%/0.2)] hover:border-[hsl(123_46%_34%/0.5)]",
    iconColor: "text-[hsl(var(--success))]",
    btnClass: "bg-[hsl(var(--success))] text-white hover:bg-[hsl(var(--success)/0.9)]"
  }
];

export default function HomePage() {
  const router = useRouter();
  // null = still checking, true = show intro, false = show landing
  const [introOpen, setIntroOpen] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [team, setTeam] = useState(1);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      setIntroOpen(false);
      return;
    }
    try {
      const seen = window.localStorage.getItem(INTRO_SEEN_KEY);
      setIntroOpen(seen ? false : true);
    } catch {
      setIntroOpen(false);
    }
  }, []);

  const replayIntro = () => setIntroOpen(true);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setJoinError(null);
    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();
    if (!trimmedCode || !trimmedName) {
      setJoinError("룸 코드와 이름을 입력해 주세요.");
      return;
    }
    setJoining(true);
    try {
      const res = await fetch(`/api/rooms/${trimmedCode}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, team })
      });
      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      saveRoomContext({
        code: trimmedCode,
        playerId: data.id,
        name: data.name,
        team: data.team
      });
      router.push("/menu");
    } catch (e2) {
      setJoinError(e2 instanceof Error ? e2.message : "네트워크 오류");
    } finally {
      setJoining(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden mesh-bg">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(345_100%_32%/0.04)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-1/4 right-1/4 h-80 w-80 translate-x-1/2 translate-y-1/2 rounded-full bg-[hsl(349_100%_45%/0.03)] blur-3xl"
      />

      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-10 px-5 py-12">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--accent)/0.12)] ring-1 ring-[hsl(var(--accent)/0.3)]"
        >
          <Zap className="h-7 w-7 text-[hsl(var(--accent))]" />
        </motion.div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-3 text-center"
        >
          <h1 className="text-4xl font-extrabold tracking-tight text-[hsl(var(--fg))] sm:text-5xl">
            살아있는 원가 트리
          </h1>
          <p className="max-w-lg text-base text-[hsl(var(--muted))] sm:text-lg">
            COP · COM · SGA 구조를 눈으로 추적하는
            <br className="hidden sm:block" />
            인터랙티브 원가 시뮬레이터
          </p>
          <span className="mt-1 rounded-full bg-[hsl(var(--surface-200))] px-3 py-1 text-xs font-medium text-[hsl(var(--muted))]">
            v2.1
          </span>
        </motion.div>

        {/* 2-card grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="grid w-full grid-cols-1 gap-8 md:grid-cols-2"
        >
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className={[
                  "group relative flex flex-col gap-5 overflow-hidden rounded-3xl border p-8",
                  "bg-gradient-to-br transition-all duration-300 min-h-[320px]",
                  "hover:-translate-y-1 hover:shadow-elevated active:scale-[0.98]",
                  card.accent,
                  card.border
                ].join(" ")}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--surface-200)/0.5)] ${card.iconColor}`}>
                  <Icon className="h-6 w-6" />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-[hsl(var(--fg))]">
                      {card.label}
                    </span>
                    <span className="text-xs text-[hsl(var(--muted))]">
                      {card.sublabel}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-[hsl(var(--muted))]">
                    {card.description}
                  </p>
                </div>

                <ul className="flex flex-col gap-1.5">
                  {card.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-[hsl(var(--muted)/0.9)]">
                      <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[hsl(var(--muted)/0.4)]" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  <span
                    className={[
                      "inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                      card.btnClass
                    ].join(" ")}
                  >
                    시작하기 <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </motion.div>

        {/* 강사 룸 입장 — 게임 모드 흐름 진입점 (plan.md S12) */}
        <motion.form
          onSubmit={handleJoin}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="flex w-full flex-col gap-3 rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] p-5 shadow-card"
        >
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-4 w-4 text-[hsl(var(--accent))]" />
            <h2 className="text-sm font-bold text-[hsl(var(--fg))]">강사가 알려준 룸 코드 입력</h2>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[120px,1fr,80px,auto]">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD"
              maxLength={4}
              aria-label="룸 코드 (4자)"
              className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] px-3 py-2 text-center font-mono text-base font-bold tracking-widest text-[hsl(var(--fg))] outline-none focus:ring-1 focus:ring-[hsl(var(--accent)/0.5)]"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름"
              maxLength={20}
              aria-label="이름"
              className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] px-3 py-2 text-sm text-[hsl(var(--fg))] outline-none focus:ring-1 focus:ring-[hsl(var(--accent)/0.5)]"
            />
            <input
              type="number"
              min={1}
              max={10}
              value={team}
              onChange={(e) => setTeam(parseInt(e.target.value, 10) || 1)}
              aria-label="팀 번호"
              className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-200)/0.5)] px-3 py-2 text-center text-sm tabular-nums text-[hsl(var(--fg))] outline-none focus:ring-1 focus:ring-[hsl(var(--accent)/0.5)]"
            />
            <button
              type="submit"
              disabled={joining || !code.trim() || !name.trim()}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[hsl(var(--accent))] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[hsl(var(--accent)/0.9)] disabled:opacity-40"
            >
              <LogIn className="h-3.5 w-3.5" />
              입장
            </button>
          </div>
          {joinError && (
            <p className="text-xs text-[hsl(var(--danger))]">{joinError}</p>
          )}
          <p className="text-[11px] text-[hsl(var(--muted)/0.7)]">
            룸 입장 후 자동으로 메뉴 화면으로 이동. 강사 신호를 기다립니다.
          </p>
        </motion.form>

        {/* Footer + intro replay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col items-center gap-2 text-xs text-[hsl(var(--muted)/0.6)]"
        >
          <button
            type="button"
            onClick={replayIntro}
            className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--muted))] transition hover:border-[hsl(var(--accent)/0.4)] hover:text-[hsl(var(--accent))]"
          >
            <Play className="h-3 w-3" /> 인트로 다시 보기
          </button>
          <p>Cost Sim v2.1 — 개발원가 시뮬레이션</p>
        </motion.div>
      </div>

      {introOpen && <IntroSequence onComplete={() => setIntroOpen(false)} />}
    </main>
  );
}
