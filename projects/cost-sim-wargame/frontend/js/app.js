/**
 * 개발원가 War Game - 프론트엔드 애플리케이션 (v2: 6케이스 지원)
 */

const API = '';

// ── 상태 ──
let state = {
    currentTab: 'sim',
    currentCase: 1,
    reference: null,
    simulation: null,
    // War Game
    gameId: null,
    teams: [],
    currentTeamIndex: 0,
    timerInterval: null,
    timeLeft: 180,
    ws: null,
};

let mainChart = null;
let copChart = null;

// ── 케이스 정의 ──
const CASE_CONFIG = {
    1: {
        name: 'Loading 변화',
        endpoint: '/api/simulate/loading',
        metric2: { label: '영업이익률', key: 'operating_margin', suffix: '%' },
        chartTitle: '가공비 구조 비교',
        buildParams: (vals) => `loading=${vals.loading / 100}`,
        sliders: [
            { id: 'loading', label: 'Loading (%)', min: 20, max: 100, step: 5, value: 50, display: v => v + '%' },
        ],
    },
    2: {
        name: '인건비 변화',
        endpoint: '/api/simulate/labor',
        metric2: { label: 'SG&A', key: 'sga', prefix: '$' },
        chartTitle: '인건비 영향 비교',
        buildParams: (vals) => `multiplier=${vals.multiplier}`,
        sliders: [
            { id: 'multiplier', label: '인건비 배수', min: 0.5, max: 3.0, step: 0.1, value: 1.5, display: v => v + 'X' },
        ],
    },
    3: {
        name: '한계이익률 목표',
        endpoint: '/api/simulate/marginal-profit',
        metric2: { label: '한계이익률', key: 'current_marginal_rate', suffix: '%' },
        chartTitle: '한계이익률 역산',
        buildParams: (vals) => `target_rate=${vals.target_rate / 100}`,
        sliders: [
            { id: 'target_rate', label: '목표 한계이익률 (%)', min: 40, max: 80, step: 1, value: 60, display: v => v + '%' },
        ],
    },
    4: {
        name: '재료비/수율 변화',
        endpoint: '/api/simulate/material-yield',
        metric2: { label: '소요재료비', key: 'material_cost', prefix: '$' },
        chartTitle: '재료비·수율 영향 비교',
        buildParams: (vals) => `material_change_pct=${vals.material / 100}&module_yield_change=${vals.yield_change / 100}`,
        sliders: [
            { id: 'material', label: 'Module 재료비 변화 (%)', min: -20, max: 20, step: 1, value: -5, display: v => (v > 0 ? '+' : '') + v + '%' },
            { id: 'yield_change', label: 'Module 수율 변화 (%p)', min: -10, max: 5, step: 1, value: -4, display: v => (v > 0 ? '+' : '') + v + '%p' },
        ],
    },
    5: {
        name: '면취수/Mask',
        endpoint: '/api/simulate/cuts-mask',
        metric2: { label: 'Panel 가공비', computed: (d) => (d.panel_labor + d.panel_expense + d.panel_depreciation).toFixed(1), prefix: '$' },
        chartTitle: 'Panel 가공비 구조 비교',
        buildParams: (vals) => `new_cuts=${vals.cuts}&new_mask=${vals.mask}`,
        sliders: [
            { id: 'cuts', label: '면취수', min: 20, max: 35, step: 1, value: 29, display: v => v + '개' },
            { id: 'mask', label: 'Mask 수', min: 4, max: 10, step: 1, value: 7, display: v => v + '매' },
        ],
    },
    6: {
        name: 'T/T + 투자비',
        endpoint: '/api/simulate/tact-investment',
        metric2: { label: 'Module 상각비', key: 'module_depreciation', prefix: '$' },
        chartTitle: 'Module 가공비 구조 비교',
        buildParams: (vals) => `tact_multiplier=${vals.tact}&investment_delta=${vals.invest}`,
        sliders: [
            { id: 'tact', label: 'Tact 배수', min: 1.0, max: 2.0, step: 0.1, value: 1.2, display: v => v + 'X' },
            { id: 'invest', label: '투자 상각비 추가 ($)', min: 0, max: 5.0, step: 0.1, value: 1.9, display: v => '+$' + v },
        ],
    },
};

// ══════════════════════════════════════════════
//  초기화
// ══════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initCaseButtons();
    switchCase(1);
    initCopChart();

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll('.card, .feature-card').forEach(el => { el.classList.add('fade-in'); observer.observe(el); });
});

function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
            state.currentTab = btn.dataset.tab;
        });
    });
}

function initCaseButtons() {
    document.querySelectorAll('.case-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const caseNum = parseInt(btn.dataset.case);
            switchCase(caseNum);
        });
    });
}

// ══════════════════════════════════════════════
//  케이스 전환
// ══════════════════════════════════════════════

function switchCase(caseNum) {
    state.currentCase = caseNum;

    // 버튼 활성화
    document.querySelectorAll('.case-btn').forEach(b => {
        b.classList.remove('active');
    });
    const activeBtn = document.querySelector(`.case-btn[data-case="${caseNum}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // 파라미터 패널 렌더
    renderCasePanel(caseNum);

    // Case 3 역산 카드 토글
    const marginalCard = document.getElementById('marginalResultCard');
    if (marginalCard) {
        marginalCard.classList.toggle('hidden', caseNum !== 3);
    }

    // 차트 제목
    document.getElementById('chartTitle').textContent = CASE_CONFIG[caseNum].chartTitle;

    // 지표 라벨
    const cfg = CASE_CONFIG[caseNum];
    document.getElementById('metric2Label').textContent = cfg.metric2.label;
    document.getElementById('metric2Label2').textContent = cfg.metric2.label;

    // 시뮬레이션 실행
    runSimulation();
}

function renderCasePanel(caseNum) {
    const cfg = CASE_CONFIG[caseNum];
    const panel = document.getElementById('casePanel');

    panel.innerHTML = `<div class="card">
        <div class="card-title">${cfg.name} 파라미터</div>
        ${cfg.sliders.map(s => `
            <div class="param-group">
                <label>
                    <span>${s.label}</span>
                    <span class="param-value" id="val_${s.id}">${s.display(s.value)}</span>
                </label>
                <input type="range" id="slider_${s.id}"
                    min="${s.min}" max="${s.max}" step="${s.step}" value="${s.value}"
                    oninput="onSliderChange('${s.id}', this.value)">
            </div>
        `).join('')}
    </div>`;
}

function onSliderChange(sliderId, value) {
    const caseNum = state.currentCase;
    const cfg = CASE_CONFIG[caseNum];
    const sliderDef = cfg.sliders.find(s => s.id === sliderId);
    if (sliderDef) {
        const numVal = parseFloat(value);
        document.getElementById('val_' + sliderId).textContent = sliderDef.display(numVal);
    }
    runSimulation();
}

// ══════════════════════════════════════════════
//  시뮬레이션 API 호출
// ══════════════════════════════════════════════

async function runSimulation() {
    const caseNum = state.currentCase;
    const cfg = CASE_CONFIG[caseNum];

    // 슬라이더 값 수집
    const vals = {};
    cfg.sliders.forEach(s => {
        const el = document.getElementById('slider_' + s.id);
        vals[s.id] = parseFloat(el ? el.value : s.value);
    });

    const queryString = cfg.buildParams(vals);

    try {
        const res = await fetch(API + cfg.endpoint + '?' + queryString, { method: 'POST' });
        const data = await res.json();

        if (caseNum === 3) {
            updateCase3UI(data);
        } else {
            updateSimUI(data, caseNum);
        }
    } catch (e) {
        console.error('Simulation error:', e);
    }
}

// ══════════════════════════════════════════════
//  UI 업데이트 (일반 케이스)
// ══════════════════════════════════════════════

function updateSimUI(data, caseNum) {
    const ref = data.reference;
    const sim = data.simulation;
    state.reference = ref;
    state.simulation = sim;
    const cfg = CASE_CONFIG[caseNum];

    // 영업이익 비교
    document.getElementById('refProfit').textContent = '$' + ref.operating_profit.toFixed(1);
    const simProfitEl = document.getElementById('simProfit');
    simProfitEl.textContent = '$' + sim.operating_profit.toFixed(1);
    animateValue(simProfitEl, sim.operating_profit);

    const delta = sim.operating_profit - ref.operating_profit;
    const deltaEl = document.getElementById('profitDelta');
    deltaEl.textContent = (delta >= 0 ? '+' : '') + '$' + delta.toFixed(1);
    deltaEl.className = 'delta-badge ' + (delta >= 0 ? 'delta-up' : 'delta-down');

    document.getElementById('simProfit').className = 'comparison-value ' +
        (sim.operating_profit >= 0 ? 'after-positive' : 'after-negative');

    // 보조 지표
    const m2 = cfg.metric2;
    const simMetric2El = document.getElementById('simMetric2');
    if (m2.computed) {
        document.getElementById('refMetric2').textContent = (m2.prefix || '') + m2.computed(ref);
        simMetric2El.textContent = (m2.prefix || '') + m2.computed(sim);
    } else {
        const refVal = ref[m2.key];
        const simVal = sim[m2.key];
        document.getElementById('refMetric2').textContent = (m2.prefix || '') + (typeof refVal === 'number' ? refVal.toFixed(1) : refVal) + (m2.suffix || '');
        simMetric2El.textContent = (m2.prefix || '') + (typeof simVal === 'number' ? simVal.toFixed(1) : simVal) + (m2.suffix || '');
    }
    animateValue(simMetric2El, null);

    // 테이블
    updateResultTable(ref, sim);

    // 차트
    updateMainChart(ref, sim, caseNum);
}

// ══════════════════════════════════════════════
//  Case 3 특별 처리 (역산)
// ══════════════════════════════════════════════

function updateCase3UI(data) {
    const ref = data.reference;
    state.reference = ref;
    state.simulation = null;

    // 영업이익 (Reference만)
    document.getElementById('refProfit').textContent = '$' + ref.operating_profit.toFixed(1);
    document.getElementById('simProfit').textContent = '-';
    document.getElementById('profitDelta').textContent = '';
    document.getElementById('profitDelta').className = 'delta-badge';

    // 한계이익률
    document.getElementById('refMetric2').textContent = data.current_marginal_rate + '%';
    document.getElementById('simMetric2').textContent = (data.target_rate * 100).toFixed(0) + '%';

    // 역산 결과 카드
    const card = document.getElementById('marginalResultCard');
    card.classList.remove('hidden');
    document.getElementById('marginalResult').innerHTML = `
        <div style="font-size:14px;line-height:2">
            <p><strong>현재 한계이익률:</strong> ${data.current_marginal_rate}%</p>
            <p><strong>목표 한계이익률:</strong> ${(data.target_rate * 100).toFixed(0)}%</p>
            <p><strong>목표 한계이익:</strong> $${data.target_marginal_profit}</p>
            <p><strong>허용 변동비:</strong> $${data.target_variable_cost}</p>
            <p><strong>필요 소요재료비:</strong> $${data.required_material_cost}</p>
            <p style="color:var(--danger);font-weight:600">
                재료비 절감 필요: $${data.material_reduction}
            </p>
        </div>
    `;

    // 테이블 (Reference만)
    updateResultTable(ref, ref);

    // 차트 (목표 vs 현재)
    updateCase3Chart(data);
}

// ══════════════════════════════════════════════
//  결과 테이블
// ══════════════════════════════════════════════

function updateResultTable(ref, sim) {
    const rows = [
        { label: 'Price', ref: ref.price, sim: sim.price },
        { label: '누적수율', ref: (ref.cumulative_yield * 100).toFixed(2) + '%', sim: (sim.cumulative_yield * 100).toFixed(2) + '%', raw: true },
        { label: 'BOM 재료비', ref: ref.bom_total, sim: sim.bom_total },
        { label: '소요재료비', ref: ref.material_cost, sim: sim.material_cost },
        { label: '가공비', ref: ref.processing_cost, sim: sim.processing_cost },
        { label: '  Panel 노무비', ref: ref.panel_labor, sim: sim.panel_labor, indent: true },
        { label: '  Panel 경비', ref: ref.panel_expense, sim: sim.panel_expense, indent: true },
        { label: '  Panel 상각비', ref: ref.panel_depreciation, sim: sim.panel_depreciation, indent: true },
        { label: '  Module 노무비', ref: ref.module_labor, sim: sim.module_labor, indent: true },
        { label: '  Module 경비', ref: ref.module_expense, sim: sim.module_expense, indent: true },
        { label: '  Module 상각비', ref: ref.module_depreciation, sim: sim.module_depreciation, indent: true },
        { label: 'COM (제조원가)', ref: ref.com, sim: sim.com, bold: true },
        { label: 'SG&A (판관비)', ref: ref.sga, sim: sim.sga },
        { label: 'COP', ref: ref.cop, sim: sim.cop, bold: true, highlight: true },
        { label: '영업이익', ref: ref.operating_profit, sim: sim.operating_profit, bold: true, total: true },
        { label: '영업이익률', ref: ref.operating_margin.toFixed(1) + '%', sim: sim.operating_margin.toFixed(1) + '%', raw: true, bold: true },
        { label: 'EBITDA', ref: ref.ebitda, sim: sim.ebitda },
        { label: '한계이익', ref: ref.marginal_profit, sim: sim.marginal_profit },
    ];

    const tbody = document.getElementById('resultBody');
    tbody.innerHTML = rows.map(r => {
        const refVal = r.raw ? r.ref : '$' + parseFloat(r.ref).toFixed(1);
        const simVal = r.raw ? r.sim : '$' + parseFloat(r.sim).toFixed(1);
        const diff = r.raw ? 0 : parseFloat(r.sim) - parseFloat(r.ref);
        const cls = [];
        if (r.highlight) cls.push('row-highlight');
        if (r.total) cls.push('row-total');
        const profitItems = ['영업이익', 'EBITDA', '한계이익'];
        const colorCls = !r.raw && diff !== 0 ? (
            profitItems.includes(r.label)
                ? (diff > 0 ? 'positive' : 'negative')
                : (diff < 0 ? 'positive' : 'negative')
        ) : '';
        return `<tr class="${cls.join(' ')}">
            <td class="col-label" style="${r.indent ? 'padding-left:24px;color:#64748b;font-size:12px' : ''}">${r.label}</td>
            <td class="col-ref">${refVal}</td>
            <td class="col-sim ${colorCls}">${simVal}</td>
        </tr>`;
    }).join('');
}

// ══════════════════════════════════════════════
//  차트
// ══════════════════════════════════════════════

function updateMainChart(ref, sim, caseNum) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    if (mainChart) mainChart.destroy();

    let labels, refData, simData;

    if (caseNum === 1 || caseNum === 2) {
        // 가공비 상세
        labels = ['Panel\n노무비', 'Panel\n경비', 'Panel\n상각비', 'Module\n노무비', 'Module\n경비', 'Module\n상각비'];
        refData = [ref.panel_labor, ref.panel_expense, ref.panel_depreciation, ref.module_labor, ref.module_expense, ref.module_depreciation];
        simData = [sim.panel_labor, sim.panel_expense, sim.panel_depreciation, sim.module_labor, sim.module_expense, sim.module_depreciation];
    } else if (caseNum === 5) {
        // Panel 중심
        labels = ['Panel\n노무비', 'Panel\n경비', 'Panel\n상각비', 'BOM\nTFT', 'BOM\nCF', 'BOM\nCell'];
        refData = [ref.panel_labor, ref.panel_expense, ref.panel_depreciation, ref.bom_total * 6/87.5, ref.bom_total * 5/87.5, ref.bom_total * 1.5/87.5];
        simData = [sim.panel_labor, sim.panel_expense, sim.panel_depreciation, sim.bom_total * 6/87.5, sim.bom_total * 5/87.5, sim.bom_total * 1.5/87.5];
        // 간단히 전체 구조 비교로 대체
        labels = ['소요재료비', 'Panel\n가공비', 'Module\n가공비', 'SG&A', '영업이익'];
        refData = [ref.material_cost, ref.panel_labor+ref.panel_expense+ref.panel_depreciation, ref.module_labor+ref.module_expense+ref.module_depreciation, ref.sga, ref.operating_profit];
        simData = [sim.material_cost, sim.panel_labor+sim.panel_expense+sim.panel_depreciation, sim.module_labor+sim.module_expense+sim.module_depreciation, sim.sga, sim.operating_profit];
    } else if (caseNum === 6) {
        // Module 중심
        labels = ['Module\n노무비', 'Module\n경비', 'Module\n상각비', 'Panel\n가공비', '영업이익'];
        refData = [ref.module_labor, ref.module_expense, ref.module_depreciation, ref.panel_labor+ref.panel_expense+ref.panel_depreciation, ref.operating_profit];
        simData = [sim.module_labor, sim.module_expense, sim.module_depreciation, sim.panel_labor+sim.panel_expense+sim.panel_depreciation, sim.operating_profit];
    } else {
        // 원가 구조 전체
        labels = ['소요재료비', '가공비', 'SG&A', 'COP', '영업이익'];
        refData = [ref.material_cost, ref.processing_cost, ref.sga, ref.cop, ref.operating_profit];
        simData = [sim.material_cost, sim.processing_cost, sim.sga, sim.cop, sim.operating_profit];
    }

    const simColor = sim.operating_profit >= 0 ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)';
    const simBorder = sim.operating_profit >= 0 ? 'rgba(34,197,94,1)' : 'rgba(239,68,68,1)';

    mainChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Reference',
                    data: refData,
                    backgroundColor: 'rgba(148,163,184,0.6)',
                    borderColor: 'rgba(148,163,184,1)',
                    borderWidth: 1,
                },
                {
                    label: 'Simulation',
                    data: simData,
                    backgroundColor: simColor,
                    borderColor: simBorder,
                    borderWidth: 1,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { font: { size: 12 } } },
            },
            scales: {
                y: {
                    title: { display: true, text: '$', font: { size: 12 } },
                },
            },
        },
    });
}

function updateCase3Chart(data) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    if (mainChart) mainChart.destroy();

    const ref = data.reference;
    mainChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['소요재료비', '변동비', '한계이익', '한계이익률(%)'],
            datasets: [
                {
                    label: '현재',
                    data: [ref.material_cost, ref.material_cost + 0.3, ref.marginal_profit, data.current_marginal_rate],
                    backgroundColor: 'rgba(148,163,184,0.6)',
                    borderColor: 'rgba(148,163,184,1)',
                    borderWidth: 1,
                },
                {
                    label: '목표',
                    data: [data.required_material_cost, data.target_variable_cost, data.target_marginal_profit, data.target_rate * 100],
                    backgroundColor: 'rgba(59,130,246,0.6)',
                    borderColor: 'rgba(59,130,246,1)',
                    borderWidth: 1,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { font: { size: 12 } } },
            },
            scales: {
                y: { title: { display: true, text: '$ / %', font: { size: 12 } } },
            },
        },
    });
}

function scrollToContent() {
    document.querySelector('.tab-nav')?.scrollIntoView({ behavior: 'smooth' });
}

const ROUND_SCENARIOS = {
    1: 'Loading 하락 위기',
    2: '재료비 vs 수율 Trade-off',
    3: '복합 위기 상황',
};

async function showCountdown() {
    const overlay = document.getElementById('countdownOverlay');
    const num = document.getElementById('countdownNumber');
    if (!overlay || !num) return;
    overlay.classList.remove('hidden');
    overlay.classList.add('active');
    for (const n of ['3', '2', '1', 'GO!']) {
        num.textContent = n;
        num.style.animation = 'none';
        num.offsetHeight; // reflow
        num.style.animation = '';
        await new Promise(r => setTimeout(r, 900));
    }
    overlay.classList.add('hidden');
    overlay.classList.remove('active');
}

async function showRoundTransition(roundNum, totalRounds) {
    const overlay = document.getElementById('roundTransition');
    if (!overlay) return;
    const label = overlay.querySelector('.rt-label');
    const title = overlay.querySelector('.rt-title');
    if (label) label.textContent = `ROUND ${roundNum}/${totalRounds}`;
    if (title) title.textContent = ROUND_SCENARIOS[roundNum] || '새로운 도전';
    overlay.classList.remove('hidden');
    overlay.classList.add('active');
    await new Promise(r => setTimeout(r, 2000));
    overlay.classList.add('hidden');
    overlay.classList.remove('active');
}

function launchConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    canvas.classList.remove('hidden');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const particles = [];
    const colors = ['#0071e3', '#30d158', '#ff453a', '#ffd60a', '#bf5af2', '#ff9f0a'];
    for (let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: -20 - Math.random() * 200,
            w: 6 + Math.random() * 6,
            h: 4 + Math.random() * 8,
            vx: (Math.random() - 0.5) * 4,
            vy: 2 + Math.random() * 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            rot: Math.random() * 360,
            rotSpeed: (Math.random() - 0.5) * 10,
        });
    }
    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05;
            p.rot += p.rotSpeed;
            if (p.y < canvas.height + 50) alive = true;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot * Math.PI / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
            ctx.restore();
        });
        frame++;
        if (alive && frame < 300) requestAnimationFrame(draw);
        else { canvas.classList.add('hidden'); ctx.clearRect(0, 0, canvas.width, canvas.height); }
    }
    requestAnimationFrame(draw);
}

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
function getAudioCtx() { if (!audioCtx) audioCtx = new AudioCtx(); return audioCtx; }

function playTone(freq, duration, type = 'sine') {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch(e) {}
}

function playSubmitSound() { playTone(880, 0.15); setTimeout(() => playTone(1100, 0.2), 100); }
function playSurpriseSound() { playTone(200, 0.3, 'sawtooth'); setTimeout(() => playTone(150, 0.4, 'sawtooth'), 200); }
function playTickSound() { playTone(1000, 0.05, 'square'); }
function playWinSound() { [0, 150, 300, 450].forEach((d, i) => setTimeout(() => playTone([523, 659, 784, 1047][i], 0.3), d)); }

function animateValue(el, value) {
    el.classList.add('animating');
    setTimeout(() => el.classList.remove('animating'), 600);
}

function initCopChart() {
    Chart.defaults.color = 'rgba(255,255,255,0.48)';
    Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(40,40,42,0.95)';
    Chart.defaults.plugins.tooltip.titleColor = '#ffffff';
    Chart.defaults.plugins.tooltip.bodyColor = 'rgba(255,255,255,0.7)';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.08)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.padding = 10;

    // 초기 Reference 로드 후 COP 구조 차트
    fetch(API + '/api/reference/1')
        .then(r => r.json())
        .then(data => {
            const ref = data.reference;
            if (!ref) return;
            const ctx = document.getElementById('copStructureChart');
            if (!ctx) return;

            copChart = new Chart(ctx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['소요재료비', 'Panel 가공비', 'Module 가공비', 'SG&A', '영업이익'],
                    datasets: [{
                        data: [
                            ref.material_cost,
                            ref.panel_labor + ref.panel_expense + ref.panel_depreciation,
                            ref.module_labor + ref.module_expense + ref.module_depreciation,
                            ref.sga,
                            ref.operating_profit,
                        ],
                        backgroundColor: ['#3b82f6', '#8b5cf6', '#6366f1', '#f59e0b', '#22c55e'],
                        borderWidth: 2,
                        borderColor: '#fff',
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 12 } },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => `${ctx.label}: $${ctx.parsed.toFixed(1)} (${(ctx.parsed / 200 * 100).toFixed(1)}%)`
                            }
                        }
                    },
                },
            });
        })
        .catch(e => console.error('COP chart error:', e));
}

// ══════════════════════════════════════════════
//  War Game
// ══════════════════════════════════════════════

function addTeam() {
    const input = document.getElementById('teamNameInput');
    const name = input.value.trim();
    if (!name || state.teams.includes(name)) return;
    if (state.teams.length >= 6) return;

    state.teams.push(name);
    input.value = '';
    renderTeamList();
}

function removeTeam(name) {
    state.teams = state.teams.filter(t => t !== name);
    renderTeamList();
}

function renderTeamList() {
    const list = document.getElementById('teamList');
    const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];
    list.innerHTML = state.teams.map((t, i) => `
        <li>
            <span style="display:flex;align-items:center;gap:8px">
                <span style="width:12px;height:12px;border-radius:50%;background:${colors[i]}"></span>
                ${escapeHtml(t)}
            </span>
            <button class="team-remove" onclick="removeTeam('${escapeHtml(t)}')">&times;</button>
        </li>
    `).join('');

    document.getElementById('startGameBtn').disabled = state.teams.length < 2;
}

async function createGame() {
    try {
        const res = await fetch(API + '/api/game/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ team_names: state.teams, total_rounds: 3 }),
        });
        const data = await res.json();
        state.gameId = data.game_id;

        connectWebSocket(data.game_id);

        document.getElementById('gameLobby').classList.add('hidden');
        document.getElementById('gamePlay').classList.remove('hidden');

        await showCountdown();
        startRound();
    } catch (e) {
        console.error('Game creation error:', e);
    }
}

function connectWebSocket(gameId) {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${location.host}/ws/game/${gameId}`;
    try {
        state.ws = new WebSocket(wsUrl);
        state.ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            handleWSMessage(msg);
        };
    } catch (e) {
        console.log('WebSocket not available, using polling');
    }
}

function handleWSMessage(msg) {
    switch (msg.type) {
        case 'team_submitted':
            updateGameLeaderboard(msg.data.leaderboard);
            break;
        case 'round_end':
            showRoundResult(msg.data);
            break;
        case 'surprise_event':
            showSurpriseEvent(msg.data);
            break;
    }
}

async function startRound() {
    try {
        const res = await fetch(API + `/api/game/${state.gameId}/start-round`, { method: 'POST' });
        const data = await res.json();
        state.currentTeamIndex = 0;

        await showRoundTransition(data.current_round, data.total_rounds);
        renderRoundIndicator(data.current_round, data.total_rounds);

        document.getElementById('roundLabel').textContent =
            `라운드 ${data.current_round}/${data.total_rounds}`;
        document.getElementById('scenarioTitle').textContent = data.scenario.title;
        document.getElementById('scenarioDesc').textContent = data.scenario.description;
        document.getElementById('scenarioChallenge').textContent = data.scenario.challenge;
        document.getElementById('hintText').textContent = data.scenario.hint || '';
        document.getElementById('hintText').classList.remove('show');

        document.getElementById('surpriseArea').classList.add('hidden');
        document.getElementById('roundAnalysis').classList.add('hidden');

        renderTeamInput();
        document.getElementById('teamInputCard').classList.remove('hidden');

        startTimer(180);
        updateGameLeaderboard(data.leaderboard);

    } catch (e) {
        console.error('Start round error:', e);
    }
}

function renderRoundIndicator(current, total) {
    const el = document.getElementById('roundIndicator');
    el.innerHTML = Array.from({ length: total }, (_, i) => {
        const cls = i + 1 < current ? 'completed' : i + 1 === current ? 'active' : '';
        return `<div class="round-dot ${cls}"></div>`;
    }).join('');
}

function renderTeamInput() {
    const team = state.teams[state.currentTeamIndex];
    document.getElementById('currentTeamLabel').textContent = `${team} - 의사결정`;

    const container = document.getElementById('gameParamSliders');
    container.innerHTML = `
        <div class="param-group">
            <label><span>Loading (%)</span><span class="param-value" id="gLoadingVal">70</span></label>
            <input type="range" id="gLoading" min="20" max="100" value="70" step="5"
                   oninput="document.getElementById('gLoadingVal').textContent=this.value">
        </div>
        <div class="param-group">
            <label><span>Module 재료비 변화 (%)</span><span class="param-value" id="gMatVal">0</span></label>
            <input type="range" id="gMaterial" min="-20" max="20" value="0" step="1"
                   oninput="document.getElementById('gMatVal').textContent=(this.value>0?'+':'')+this.value">
        </div>
        <div class="param-group">
            <label><span>Module 수율 변화 (%p)</span><span class="param-value" id="gYieldVal">0</span></label>
            <input type="range" id="gYield" min="-10" max="5" value="0" step="1"
                   oninput="document.getElementById('gYieldVal').textContent=(this.value>0?'+':'')+this.value">
        </div>
    `;
}

async function submitDecision() {
    const team = state.teams[state.currentTeamIndex];
    const loading = parseInt(document.getElementById('gLoading').value) / 100;
    const matChange = parseInt(document.getElementById('gMaterial').value) / 100;
    const yieldChange = parseInt(document.getElementById('gYield').value) / 100;

    const baseModule = 75.0;
    const baseModuleYield = 0.972;

    const params = {
        price: 200.0,
        loading: loading,
        tft_yield: 0.99,
        cf_yield: 1.0,
        cell_yield: 0.95,
        module_yield: baseModuleYield + yieldChange,
        bom_tft: 6.0,
        bom_cf: 5.0,
        bom_cell: 1.5,
        bom_module: baseModule * (1 + matChange),
        panel_labor: 21.3 * (0.7 / loading),
        panel_expense: 11.5 * (0.7 / loading),
        panel_depreciation: 16.2 * (0.7 / loading),
        module_labor: 8.7 * (0.7 / loading),
        module_expense: 5.3 * (0.7 / loading),
        module_depreciation: 7.5 * (0.7 / loading),
        sga_direct_dev: 4.7,
        sga_transport: 0.3,
        sga_business_unit: 16.0,
        sga_operation: 1.2,
        sga_corporate_oh: 6.2,
    };

    try {
        const res = await fetch(API + `/api/game/${state.gameId}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ team_name: team, params }),
        });
        const data = await res.json();

        playSubmitSound();

        if (data.coaching) {
            showCoaching(data.coaching);
        }

        state.currentTeamIndex++;
        if (state.currentTeamIndex < state.teams.length) {
            renderTeamInput();
        } else {
            document.getElementById('teamInputCard').classList.add('hidden');
            if (data.round_complete) {
                showRoundResult(data);
            }
        }
    } catch (e) {
        console.error('Submit error:', e);
    }
}

function showCoaching(text) {
    const area = document.getElementById('coachingArea');
    document.getElementById('coachingText').textContent = text;
    area.classList.remove('hidden');
    setTimeout(() => area.classList.add('hidden'), 5000);
}

function showRoundResult(data) {
    stopTimer();
    if (data.analysis) {
        document.getElementById('analysisText').textContent = data.analysis;
    }
    document.getElementById('roundAnalysis').classList.remove('hidden');

    const gameData = data.data || data;
    if (gameData.leaderboard) {
        updateGameLeaderboard(gameData.leaderboard);
    }

    if (gameData.status === 'finished') {
        document.getElementById('nextRoundBtn').textContent = '최종 결과 보기';
    }
}

function nextRound() {
    const btn = document.getElementById('nextRoundBtn');
    if (btn.textContent === '최종 결과 보기') {
        showFinalResult();
        return;
    }
    startRound();
}

function showFinalResult() {
    document.getElementById('gamePlay').classList.add('hidden');
    document.getElementById('gameResult').classList.remove('hidden');
    stopTimer();

    fetch(API + `/api/game/${state.gameId}/leaderboard`)
        .then(r => r.json())
        .then(data => {
            const lb = data.leaderboard;
            document.getElementById('winnerTeam').textContent =
                lb[0].team + ' 팀 우승!';
            renderFinalLeaderboard(lb);
            launchConfetti();
            playWinSound();
        });
}

function renderFinalLeaderboard(lb) {
    const el = document.getElementById('finalLeaderboard');
    el.innerHTML = lb.map((entry, i) => `
        <li class="leaderboard-item">
            <div class="leaderboard-rank rank-${i + 1}">${i + 1}</div>
            <div class="leaderboard-info">
                <div class="leaderboard-team">${escapeHtml(entry.team)}</div>
                <div class="leaderboard-score">총점: ${entry.total_score}점</div>
            </div>
            <div class="leaderboard-profit">${entry.total_score}점</div>
        </li>
    `).join('');
}

function updateGameLeaderboard(lb) {
    const el = document.getElementById('gameLeaderboard');
    if (!el || !lb) return;
    el.innerHTML = lb.map((entry, i) => {
        const profit = entry.operating_profit || 0;
        const profitClass = profit >= 0 ? 'positive' : 'negative';
        return `
            <li class="leaderboard-item">
                <div class="leaderboard-rank rank-${i + 1}">${i + 1}</div>
                <div class="leaderboard-info">
                    <div class="leaderboard-team">${escapeHtml(entry.team)}</div>
                    <div class="leaderboard-score">
                        영업이익 $${profit.toFixed(1)} | 총점 ${entry.total_score}
                    </div>
                </div>
                <div class="leaderboard-profit ${profitClass}">
                    ${entry.submitted ? '$' + profit.toFixed(1) : '대기중'}
                </div>
            </li>
        `;
    }).join('');
}

function showSurpriseEvent(event) {
    document.getElementById('surpriseTitle').textContent = event.title;
    document.getElementById('surpriseDesc').textContent = event.description;
    document.getElementById('surpriseArea').classList.remove('hidden');
    playSurpriseSound();
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
    document.querySelector('.surprise-card')?.classList.add('shake');
    setTimeout(() => document.querySelector('.surprise-card')?.classList.remove('shake'), 600);
}

function resetGame() {
    state.gameId = null;
    state.teams = [];
    state.currentTeamIndex = 0;
    if (state.ws) state.ws.close();

    document.getElementById('gameResult').classList.add('hidden');
    document.getElementById('gamePlay').classList.add('hidden');
    document.getElementById('gameLobby').classList.remove('hidden');
    document.getElementById('teamList').innerHTML = '';
    document.getElementById('startGameBtn').disabled = true;
}

// ── 타이머 ──
function startTimer(seconds) {
    state.timeLeft = seconds;
    stopTimer();
    updateTimerDisplay();
    state.timerInterval = setInterval(() => {
        state.timeLeft--;
        updateTimerDisplay();
        if (state.timeLeft <= 0) {
            stopTimer();
        }
    }, 1000);
}

function stopTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

function updateTimerDisplay() {
    const el = document.getElementById('gameTimer');
    const min = Math.floor(state.timeLeft / 60);
    const sec = state.timeLeft % 60;
    el.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    el.className = 'timer' + (state.timeLeft <= 30 ? ' urgent' : '');
    if (state.timeLeft <= 10 && state.timeLeft > 0) playTickSound();
}

// ── 힌트 ──
function toggleHint() {
    document.getElementById('hintText').classList.toggle('show');
}

// ══════════════════════════════════════════════
//  AI 채팅
// ══════════════════════════════════════════════

function toggleChat() {
    document.getElementById('chatPanel').classList.toggle('open');
}

async function sendChat() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;

    const messages = document.getElementById('chatMessages');
    messages.innerHTML += `<div class="chat-msg user">${escapeHtml(msg)}</div>`;
    input.value = '';
    messages.scrollTop = messages.scrollHeight;

    try {
        const res = await fetch(API + '/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg }),
        });
        const data = await res.json();
        const badge = data.ai_powered ? ' <span style="font-size:10px;opacity:0.7">[AI]</span>' : '';
        messages.innerHTML += `<div class="chat-msg assistant">${escapeHtml(data.response)}${badge}</div>`;
    } catch (e) {
        messages.innerHTML += `<div class="chat-msg assistant">죄송합니다. 잠시 후 다시 시도해주세요.</div>`;
    }
    messages.scrollTop = messages.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
