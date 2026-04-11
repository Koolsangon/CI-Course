# 파일럿 측정 런북 (Phase 7)

> 목표: n=10 표본으로 AC2 — paired pre/post delta **≥ +30%** 달성 여부 검증.

## 준비
1. **Instrument 검증** (Phase 0b DoD): `content/instrument/pre-post.json` 10문항을 비대상 사용자 n≥3에게 제시해 모호성 점검. 문항 수정은 이 단계에서만.
2. 참가자 10명 모집 — 원가 교육 1회 이하 이수자
3. 파일럿 환경 배포 확인 (Vercel preview URL)

## 진행 (90분)

| 시간 | 활동 | 기록 |
|---|---|---|
| 0~10분 | 환영 + 사전 진단 (10문항) | `pre_scores[participant_id]` |
| 10~15분 | 툴 소개 (홈 → Sandbox 데모) | — |
| 15~75분 | Guided 6 Cases 완주 (각 10분) | `case_completion_time` |
| 75~85분 | 사후 진단 (동일 10문항) | `post_scores[participant_id]` |
| 85~90분 | 자유 피드백 (구두) | 메모 |

## 채점
각 문항 정답 1점, 총 10점 만점. `content/instrument/pre-post.json` 의 `answer` 또는 `answer_index` 사용.

```
paired_delta[i] = (post[i] - pre[i]) / max(pre[i], 1)
mean_delta = mean(paired_delta)
```

**통과 기준**: `mean_delta ≥ 0.30` (AC2)

## 결과 기록
- `outputs/v1-pilot-results.md` — 개별 점수, delta, 평균, 유의성(t-test 간단 적용)
- 미달 케이스: `outputs/v1-implementation-report.md`의 "백로그" 섹션에 케이스별 재설계 필요 사유 기재

## 주의
- Reflect 자유 응답은 **수집 금지** (R9 / PIPA 안전망). 구두 피드백만 익명 메모.
- 참가자 식별 정보는 로컬 엑셀에만 저장, 업로드 금지.
- n=10은 통계적 유의성을 주장하기엔 작지만, paired design이 baseline 변동을 통제하므로 delta 방향성 판단에 충분.

## 실패 시 다음 단계
- `mean_delta < 0.30`: case 별로 delta 분해 → 가장 낮은 케이스의 Discover/Apply 설계 재검토
- 특정 문항에서 모두 틀림: instrument 문제 — Phase 0b로 돌아가 문항 수정
- 특정 문항에서 모두 맞음: baseline 너무 쉬움 — 난이도 상향
