"""
AI 어시스턴트 모듈 (플러그인 방식)
- API 키가 있으면 Claude API 사용
- API 키가 없으면 사전 작성된 템플릿 사용
"""

import os
import json
import random
from typing import Optional


# ── 템플릿 기반 시나리오/피드백 (API 키 없을 때 사용) ──

ROUND_SCENARIOS = {
    1: {
        "title": "Loading 하락 위기",
        "description": (
            "고객사 A의 주문량이 급감하여 공장 가동률(Loading)이 70%에서 50%로 "
            "하락할 것으로 예상됩니다. 이 상황에서 수익성을 유지하기 위한 "
            "원가 개선 방안을 수립하세요."
        ),
        "challenge": "Loading 50%에서도 흑자를 유지할 수 있는 원가 구조를 설계하라",
        "hint": "가공비는 고정비 성격이므로 Loading 하락 시 단위당 가공비가 상승합니다.",
        "metric": "operating_margin",
        "metric_label": "영업이익률",
        "params": {"loading": 0.50},
    },
    2: {
        "title": "재료비 절감 vs 수율 리스크",
        "description": (
            "구매팀에서 Module 재료비를 5% 절감할 수 있는 대체 부품을 발굴했습니다. "
            "그러나 품질팀에서는 대체 부품 적용 시 Module 수율이 4%p 하락할 "
            "가능성을 경고하고 있습니다. 재료비 절감과 수율 리스크 사이에서 "
            "최적의 의사결정을 내리세요."
        ),
        "challenge": "재료비 5% 절감과 수율 4%p 하락의 trade-off를 분석하고 최적안을 도출하라",
        "hint": "재료비 절감 효과와 수율 하락에 따른 소요재료비 증가를 비교해보세요.",
        "metric": "ebitda",
        "metric_label": "EBITDA",
        "params": {"material_change_pct": -0.05, "module_yield_change": -0.04},
    },
    3: {
        "title": "복합 위기 상황",
        "description": (
            "예상치 못한 복합 위기가 발생했습니다! "
            "① 고객사가 판가 5% 인하를 요청했습니다 (Price $200 → $190). "
            "② 동시에 원자재 가격 상승으로 Module BOM이 10% 증가했습니다. "
            "③ 그러나 공정 개선으로 Cell 수율을 97%까지 올릴 수 있는 기회도 있습니다. "
            "종합적인 비상 대응 전략을 수립하세요."
        ),
        "challenge": "판가 인하 + 원자재 상승 속에서도 흑자를 유지하는 전략을 수립하라",
        "hint": "여러 변수를 동시에 조정하여 최적의 조합을 찾아야 합니다.",
        "metric": "operating_profit",
        "metric_label": "영업이익",
        "params": {"price": 190, "module_bom_change": 0.10, "cell_yield": 0.97},
    },
}

SURPRISE_EVENTS = [
    {
        "title": "환율 급등",
        "description": "원/달러 환율이 급등하여 수입 재료비가 3% 상승했습니다.",
        "effect": {"material_change_pct": 0.03},
    },
    {
        "title": "경쟁사 가격 공세",
        "description": "주요 경쟁사가 공격적인 가격 인하를 단행했습니다. 고객사가 판가 재협상을 요청합니다.",
        "effect": {"price_change": -10},
    },
    {
        "title": "공정 혁신 성공",
        "description": "R&D팀의 공정 혁신으로 TFT 수율이 1%p 개선되었습니다!",
        "effect": {"tft_yield_change": 0.01},
    },
    {
        "title": "에너지 비용 상승",
        "description": "전기요금 인상으로 Panel 경비가 15% 증가할 전망입니다.",
        "effect": {"panel_expense_change": 0.15},
    },
    {
        "title": "신규 고객 확보",
        "description": "대형 고객사 수주에 성공! Loading이 10%p 상승합니다.",
        "effect": {"loading_change": 0.10},
    },
]

COACHING_TEMPLATES = {
    "high_profit": [
        "탁월한 의사결정입니다! 영업이익률 {margin:.1f}%를 달성했습니다.",
        "수익성 개선에 성공했습니다. 특히 {best_area} 부분의 최적화가 효과적이었습니다.",
    ],
    "marginal": [
        "흑자를 유지했지만, 영업이익률이 {margin:.1f}%로 마진이 얇습니다. "
        "추가 개선 여지를 검토해보세요.",
        "손익분기점에 근접합니다. {weak_area}에서 추가 절감이 가능한지 살펴보세요.",
    ],
    "loss": [
        "현재 설정으로는 영업이익이 {profit:.1f}달러 적자입니다. "
        "가공비 구조를 재검토해보세요.",
        "적자 상태입니다. {suggestion}을 고려해보세요.",
    ],
}


def get_scenario(round_num: int) -> dict:
    """라운드별 시나리오 반환"""
    return ROUND_SCENARIOS.get(round_num, ROUND_SCENARIOS[1])


def get_surprise_event() -> dict:
    """랜덤 돌발 이벤트 반환"""
    return random.choice(SURPRISE_EVENTS)


def get_coaching(result: dict) -> str:
    """계산 결과에 따른 코칭 메시지 반환"""
    margin = result.get("operating_margin", 0)
    profit = result.get("operating_profit", 0)

    if margin > 10:
        templates = COACHING_TEMPLATES["high_profit"]
        msg = random.choice(templates).format(
            margin=margin, best_area="가공비 절감"
        )
    elif margin > 0:
        templates = COACHING_TEMPLATES["marginal"]
        msg = random.choice(templates).format(
            margin=margin, weak_area="가공비"
        )
    else:
        templates = COACHING_TEMPLATES["loss"]
        msg = random.choice(templates).format(
            profit=profit,
            suggestion="Loading 개선이나 재료비 절감"
        )
    return msg


def compare_teams(team_results: dict) -> str:
    """팀별 결과 비교 분석 (템플릿 기반)"""
    if not team_results:
        return "아직 제출된 결과가 없습니다."

    sorted_teams = sorted(
        team_results.items(),
        key=lambda x: x[1].get("operating_profit", 0),
        reverse=True,
    )

    lines = ["## 팀별 전략 비교 분석\n"]
    for rank, (team, result) in enumerate(sorted_teams, 1):
        profit = result.get("operating_profit", 0)
        margin = result.get("operating_margin", 0)
        emoji = "🥇" if rank == 1 else "🥈" if rank == 2 else "🥉" if rank == 3 else f"{rank}위"
        lines.append(
            f"{emoji} **{team}**: 영업이익 ${profit:.1f} "
            f"(이익률 {margin:.1f}%)"
        )

    best_team = sorted_teams[0][0]
    lines.append(f"\n**{best_team}** 팀이 가장 높은 수익성을 달성했습니다!")

    return "\n".join(lines)


# ── Claude API 연동 (선택적) ──

class AIAssistant:
    """AI 어시스턴트 - API 키 유무에 따라 모드 전환"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        self.client = None
        if self.api_key:
            try:
                import anthropic
                self.client = anthropic.Anthropic(api_key=self.api_key)
            except ImportError:
                pass

    @property
    def ai_enabled(self) -> bool:
        return self.client is not None

    def generate_scenario(self, round_num: int, context: str = "") -> dict:
        """시나리오 생성 - AI 사용 가능하면 동적 생성, 아니면 템플릿"""
        if not self.ai_enabled:
            return get_scenario(round_num)

        prompt = f"""당신은 디스플레이/반도체 제조업의 개발원가 교육 시뮬레이션 진행자입니다.
라운드 {round_num}의 시나리오를 생성해주세요.

기존 시나리오 구조 참고:
{json.dumps(get_scenario(round_num), ensure_ascii=False)}

{f"추가 맥락: {context}" if context else ""}

다음 JSON 형식으로 응답해주세요:
{{"title": "시나리오 제목", "description": "상세 설명 (2-3문장)", "challenge": "팀에게 주어지는 과제", "hint": "힌트"}}"""

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}],
            )
            text = response.content[0].text
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                result = json.loads(text[start:end])
                result["metric"] = get_scenario(round_num).get("metric", "operating_profit")
                result["metric_label"] = get_scenario(round_num).get("metric_label", "영업이익")
                return result
        except Exception:
            pass
        return get_scenario(round_num)

    def generate_coaching(self, result: dict, team_params: dict = None) -> str:
        """코칭 메시지 생성"""
        if not self.ai_enabled:
            return get_coaching(result)

        prompt = f"""당신은 디스플레이 제조업 원가 전문가입니다.
팀의 시뮬레이션 결과를 분석하고 2-3문장으로 코칭해주세요.

결과: {json.dumps(result, ensure_ascii=False)}
{f"팀 파라미터: {json.dumps(team_params, ensure_ascii=False)}" if team_params else ""}

핵심 지표 중심으로 실무적 조언을 해주세요."""

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=300,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.content[0].text
        except Exception:
            return get_coaching(result)

    def analyze_teams(self, team_results: dict) -> str:
        """팀별 비교 분석"""
        if not self.ai_enabled:
            return compare_teams(team_results)

        prompt = f"""당신은 디스플레이 제조업 원가 교육 심판입니다.
각 팀의 시뮬레이션 결과를 비교 분석하고, 각 팀의 전략적 차이점과
최적 전략을 설명해주세요.

팀별 결과: {json.dumps(team_results, ensure_ascii=False)}

마크다운으로 간결하게 분석해주세요."""

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.content[0].text
        except Exception:
            return compare_teams(team_results)
