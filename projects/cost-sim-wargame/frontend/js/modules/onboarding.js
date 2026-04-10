/**
 * 온보딩 시스템
 */

const STEPS = [
    { target: '.case-btn-strip', text: '6가지 원가 시뮬레이션 케이스를 선택할 수 있습니다. 각 케이스는 서로 다른 원가 변동 상황을 다룹니다.', step: 'Step 1 / 3' },
    { target: '#casePanel', text: '슬라이더를 드래그하면 실시간으로 원가가 변합니다. Before/After를 비교하며 원가 구조를 이해해보세요.', step: 'Step 2 / 3' },
    { target: '[data-tab="game"]', text: 'War Game 탭에서 팀 대항전을 시작할 수 있습니다. 3라운드 동안 원가 의사결정 능력을 겨뤄보세요!', step: 'Step 3 / 3' },
];

let index = 0;

export function initOnboarding() {
    if (localStorage.getItem('onboarding_complete')) return;
    setTimeout(() => startOnboarding(), 1500);
}

function startOnboarding() {
    index = 0;
    document.getElementById('onboardingBackdrop').classList.add('active');
    renderStep();
    document.getElementById('onboardingNext').addEventListener('click', nextStep);
    document.getElementById('onboardingSkip').addEventListener('click', endOnboarding);
}

function renderStep() {
    const step = STEPS[index];
    const target = document.querySelector(step.target);
    if (!target) { endOnboarding(); return; }

    const rect = target.getBoundingClientRect();
    const spotlight = document.getElementById('onboardingSpotlight');
    const tooltip = document.getElementById('onboardingTooltip');
    const pad = 8;

    spotlight.style.top = (rect.top - pad) + 'px';
    spotlight.style.left = (rect.left - pad) + 'px';
    spotlight.style.width = (rect.width + pad * 2) + 'px';
    spotlight.style.height = (rect.height + pad * 2) + 'px';

    tooltip.style.top = (rect.bottom + 16) + 'px';
    tooltip.style.left = Math.max(16, Math.min(rect.left, window.innerWidth - 320)) + 'px';
    tooltip.style.animation = 'none';
    tooltip.offsetHeight;
    tooltip.style.animation = '';

    document.getElementById('onboardingStep').textContent = step.step;
    document.getElementById('onboardingText').textContent = step.text;
    document.getElementById('onboardingNext').textContent = index === STEPS.length - 1 ? '시작하기' : '다음';

    document.getElementById('onboardingDots').innerHTML = STEPS.map((_, i) =>
        `<span class="${i === index ? 'active' : ''}"></span>`
    ).join('');
}

function nextStep() {
    index++;
    if (index >= STEPS.length) endOnboarding();
    else renderStep();
}

function endOnboarding() {
    localStorage.setItem('onboarding_complete', '1');
    document.getElementById('onboardingBackdrop').classList.remove('active');
}
