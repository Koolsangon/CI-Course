/**
 * 문항 번호 배지 — 색 원 안에 숫자. 워크시트 노란 셀과 힌트 공식에 동일하게 쓰여
 * 가독성과 형식 일관성을 준다. (유니코드 ①②… 는 글리프가 작아 가독성이 떨어져 대체)
 *
 *   size="md" — 워크시트 셀용 (조금 큼)
 *   size="sm" — 힌트 텍스트 인라인용
 */
export default function NumberBadge({ n, size = "md" }: { n: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-6 w-6 text-[13px]" : "h-5 w-5 text-[11px]";
  return (
    <span
      className={`inline-flex ${cls} flex-shrink-0 items-center justify-center rounded-full bg-[hsl(var(--warn))] font-bold leading-none text-white tabular-nums align-middle`}
    >
      {n}
    </span>
  );
}
