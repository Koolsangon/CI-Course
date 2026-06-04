import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * 게임방 기능 비활성화(GAME_MODE_ENABLED=false) 시 강사 라우트(/instructor 등)에서
 * 본래 화면 대신 표시하는 안내. 직접 URL 로 접근한 사용자를 홈으로 안내한다.
 */
export default function GameDisabledNotice() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[hsl(var(--bg))] px-6 text-center">
      <p className="text-base font-semibold text-[hsl(var(--fg))]">
        게임방(실시간 경쟁) 기능은 현재 비활성화되어 있습니다.
      </p>
      <p className="max-w-sm text-sm text-[hsl(var(--muted))]">
        자유 실험실과 원가 워크시트는 그대로 이용할 수 있습니다.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-100))] px-4 py-2 text-sm font-semibold text-[hsl(var(--fg))] transition-colors hover:border-[hsl(var(--accent)/0.4)] hover:text-[hsl(var(--accent))]"
      >
        <ArrowLeft className="h-4 w-4" /> 홈으로
      </Link>
    </main>
  );
}
