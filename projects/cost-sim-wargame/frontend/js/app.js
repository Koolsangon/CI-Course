/**
 * 개발원가 War Game - 프론트엔드 애플리케이션
 */

const API = '';

// ── 상태 ──
let state = {
    currentTab: 'sim',
    simType: 'loading',
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

// ── 차트 인스턴스 ──
let loadingChart = null;
let materialChart = null;
let copChart = null;

// ══════════════════════════════════════════════
//  초기화
// ══════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
    initTabs();
    initSimTypeButtons();
    initSliders();
    await loadReference();
    await runLoadingSimulation(50);
    await runMaterialSimulation(-5, -4);
    initCopChart();
});

// ── 탭 ──
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

// ── 시뮬레이션 유형 전환 ──
function initSimTypeButtons() {
    document.querySelectorAll('.sim-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sim-type-btn').forEach(b => {
                b.classList.remove('active', 'btn-primary');
                b.classList.add('btn-outline');
            });
            btn.classList.add('active', 'btn-primary');
            btn.classList.remove('btn-outline');
            state.simType = btn.dataset.type;

            document.querySelectorAll('.sim-panel').forEach(p => p.classList.add('hidden'));
            document.getElementById('sim-' + btn.dataset.type).classList.remove('hidden');
        });
    });
}

// ── 슬라이더 ──
function initSliders() {
    const loadingSlider = document.getElementById('loadingSlider');
    loadingSlider.addEventListener('input', () => {
        const val = parseInt(loadingSlider.value);
        document.getElementById('loadingValue').textContent = val + '%';
        document.getElementById('loadingCurrent').textContent = val + '%';
        runLoadingSimulation(val);
    });

    const materialSlider = document.getElementById('materialSlider');
    materialSlider.addEventListener('input', () => {
        const val = parseInt(materialSlider.value);
        document.getElementById('materialValue').textContent = (val > 0 ? '+' : '') + val + '%';
        runMaterialSimulation(val, parseInt(document.getElementById('yieldSlider').value));
    });

    const yieldSlider = document.getElementById('yieldSlider');
    yieldSlider.addEventListener('input', () => {
        const val = parseInt(yieldSlider.value);
        document.getElementById('yieldValue').textContent = (val > 0 ? '+' : '') + val + '%p';
        const newYield = (97.2 + val).toFixed(1);
        document.getElementById('yieldCurrent').textContent = newYield + '%';
        runMaterialSimulation(parseInt(materialSlider.value), val);
    });
}

// ══════════════════════════════════════════════
//  API 호출
// ══════════════════════════════════════════════

async function loadReference() {
    try {
        const res = await fetch(API + '/api/reference');
        const data = await res.json();
        state.reference = data.reference;
        if (data.ai_enabled) {
            document.getElementById('aiBadge').textContent = 'AI: Claude API';
            document.getElementById('aiBadge').style.background = 'rgba(22,163,74,0.3)';
        }
    } catch (e) {
        console.error('Failed to load reference:', e);
    }
}

async function runLoadingSimulation(loadingPct) {
    try {
        const res = await fetch(API + '/api/simulate/loading?loading=' + (loadingPct / 100), {
            method: 'POST',
        });
        const data = await res.json();
        updateLoadingUI(data);
    } catch (e) {
        console.error('Loading sim error:', e);
    }
}

async function runMaterialSimulation(materialPct, yieldPct) {
    try {
        const url = API + `/api/simulate/material-yield?material_change_pct=${materialPct/100}&module_yield_change=${yieldPct/100}`;
        const res = await fetch(url, { method: 'POST' });
        const data = await res.json();
        updateMaterialUI(data);
    } catch (e) {
        console.error('Material sim error:', e);
    }
}

// ══════════════════════════════════════════════
//  UI 업데이트
// ══════════════════════════════════════════════

function updateLoadingUI(data) {
    const ref = data.reference;
    const sim = data.simulation;
    state.reference = ref;
    state.simulation = sim;

    // 핵심 지표
    document.getElementById('refProfit').textContent = '$' + ref.operating_profit.toFixed(1);
    document.getElementById('simProfit').textContent = '$' + sim.operating_profit.toFixed(1);
    document.getElementById('refMargin').textContent = ref.operating_margin.toFixed(1) + '%';
    document.getElementById('simMargin').textContent = sim.operating_margin.toFixed(1) + '%';

    const delta = sim.operating_profit - ref.operating_profit;
    const deltaEl = document.getElementById('profitDelta');
    deltaEl.textContent = (delta >= 0 ? '+' : '') + '$' + delta.toFixed(1);
    deltaEl.className = 'delta-badge ' + (delta >= 0 ? 'delta-up' : 'delta-down');

    const simProfitEl = document.getElementById('simProfit');
    simProfitEl.className = 'comparison-value ' +
        (sim.operating_profit >= 0 ? 'after-positive' : 'after-negative');

    const simMarginEl = document.getElementById('simMargin');
    simMarginEl.className = 'comparison-value ' +
        (sim.operating_margin >= 0 ? 'after-positive' : 'after-negative');

    // 상세 테이블
    updateResultTable(ref, sim);

    // 차트
    updateLoadingChart(ref, sim);
}

function updateMaterialUI(data) {
    const ref = data.reference;
    const sim = data.simulation;

    document.getElementById('matRefProfit').textContent = '$' + ref.operating_profit.toFixed(1);
    document.getElementById('matSimProfit').textContent = '$' + sim.operating_profit.toFixed(1);
    document.getElementById('matRefMaterial').textContent = '$' + ref.material_cost.toFixed(1);
    document.getElementById('matSimMaterial').textContent = '$' + sim.material_cost.toFixed(1);

    const delta = sim.operating_profit - ref.operating_profit;
    const deltaEl = document.getElementById('matProfitDelta');
    deltaEl.textContent = (delta >= 0 ? '+' : '') + '$' + delta.toFixed(1);
    deltaEl.className = 'delta-badge ' + (delta >= 0 ? 'delta-up' : 'delta-down');

    const simProfitEl = document.getElementById('matSimProfit');
    simProfitEl.className = 'comparison-value ' +
        (sim.operating_profit >= 0 ? 'after-positive' : 'after-negative');

    if (state.simType === 'material') {
        updateResultTable(ref, sim);
    }

    updateMaterialChart(ref, sim);
}

function updateResultTable(ref, sim) {
    const rows = [
        { label: 'Price', ref: ref.price, sim: sim.price, bold: false },
        { label: '누적수율', ref: (ref.cumulative_yield * 100).toFixed(2) + '%', sim: (sim.cumulative_yield * 100).toFixed(2) + '%', bold: false, raw: true },
        { label: 'BOM 재료비', ref: ref.bom_total, sim: sim.bom_total, bold: false },
        { label: '소요재료비', ref: ref.material_cost, sim: sim.material_cost, bold: false },
        { label: '가공비', ref: ref.processing_cost, sim: sim.processing_cost, bold: false },
        { label: '  Panel 노무비', ref: ref.panel_labor, sim: sim.panel_labor, indent: true },
        { label: '  Panel 경비', ref: ref.panel_expense, sim: sim.panel_expense, indent: true },
        { label: '  Panel 상각비', ref: ref.panel_depreciation, sim: sim.panel_depreciation, indent: true },
        { label: '  Module 노무비', ref: ref.module_labor, sim: sim.module_labor, indent: true },
        { label: '  Module 경비', ref: ref.module_expense, sim: sim.module_expense, indent: true },
        { label: '  Module 상각비', ref: ref.module_depreciation, sim: sim.module_depreciation, indent: true },
        { label: 'COM (제조원가)', ref: ref.com, sim: sim.com, bold: true },
        { label: 'SG&A (판관비)', ref: ref.sga, sim: sim.sga, bold: false },
        { label: 'COP', ref: ref.cop, sim: sim.cop, bold: true, highlight: true },
        { label: '영업이익', ref: ref.operating_profit, sim: sim.operating_profit, bold: true, total: true },
        { label: '영업이익률', ref: ref.operating_margin.toFixed(1) + '%', sim: sim.operating_margin.toFixed(1) + '%', bold: true, raw: true },
        { label: 'EBITDA', ref: ref.ebitda, sim: sim.ebitda, bold: false },
        { label: '한계이익', ref: ref.marginal_profit, sim: sim.marginal_profit, bold: false },
    ];

    const tbody = document.getElementById('resultBody');
    tbody.innerHTML = rows.map(r => {
        const refVal = r.raw ? r.ref : '$' + parseFloat(r.ref).toFixed(1);
        const simVal = r.raw ? r.sim : '$' + parseFloat(r.sim).toFixed(1);
        const diff = r.raw ? 0 : parseFloat(r.sim) - parseFloat(r.ref);
        const cls = [];
        if (r.highlight) cls.push('row-highlight');
        if (r.total) cls.push('row-total');
        const colorCls = !r.raw && diff !== 0 ? (
            r.label === '영업이익' || r.label === 'EBITDA' || r.label === '한계이익'
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

function updateLoadingChart(ref, sim) {
    const ctx = document.getElementById('loadingChart').getContext('2d');
    if (loadingChart) loadingChart.destroy();

    loadingChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Panel\n노무비', 'Panel\n경비', 'Panel\n상각비', 'Module\n노무비', 'Module\n경비', 'Module\n상각비'],
            datasets: [
                {
                    label: 'Reference',
                    data: [ref.panel_labor, ref.panel_expense, ref.panel_depreciation,
                           ref.module_labor, ref.module_expense, ref.module_depreciation],
                    backgroundColor: 'rgba(148,163,184,0.6)',
                    borderColor: 'rgba(148,163,184,1)',
                    borderWidth: 1,
                },
                {
                    label: 'Simulation',
                    data: [sim.panel_labor, sim.panel_expense, sim.panel_depreciation,
                           sim.module_labor, sim.module_expense, sim.module_depreciation],
                    backgroundColor: sim.operating_profit >= 0
                        ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)',
                    borderColor: sim.operating_profit >= 0
                        ? 'rgba(34,197,94,1)' : 'rgba(239,68,68,1)',
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
                    beginAtZero: true,
                    title: { display: true, text: '$', font: { size: 12 } },
                },
            },
        },
    });
}

function updateMaterialChart(ref, sim) {
    const ctx = document.getElementById('materialChart').getContext('2d');
    if (materialChart) materialChart.destroy();

    materialChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['소요재료비', '가공비', 'SG&A', 'COP', '영업이익'],
            datasets: [
                {
                    label: 'Reference',
                    data: [ref.material_cost, ref.processing_cost, ref.sga, ref.cop, ref.operating_profit],
                    backgroundColor: 'rgba(148,163,184,0.6)',
                    borderColor: 'rgba(148,163,184,1)',
                    borderWidth: 1,
                },
                {
                    label: 'Simulation',
                    data: [sim.material_cost, sim.processing_cost, sim.sga, sim.cop, sim.operating_profit],
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
                y: {
                    title: { display: true, text: '$', font: { size: 12 } },
                },
            },
        },
    });
}

function initCopChart() {
    if (!state.reference) return;
    const ref = state.reference;
    const ctx = document.getElementById('copStructureChart').getContext('2d');

    copChart = new Chart(ctx, {
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
                backgroundColor: [
                    '#3b82f6', '#8b5cf6', '#6366f1', '#f59e0b', '#22c55e',
                ],
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
                        label: (ctx) => `${ctx.label}: $${ctx.parsed.toFixed(1)} (${(ctx.parsed/200*100).toFixed(1)}%)`
                    }
                }
            },
        },
    });
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
                ${t}
            </span>
            <button class="team-remove" onclick="removeTeam('${t}')">&times;</button>
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

        // WebSocket 연결
        connectWebSocket(data.game_id);

        document.getElementById('gameLobby').classList.add('hidden');
        document.getElementById('gamePlay').classList.remove('hidden');

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

        // 라운드 인디케이터
        renderRoundIndicator(data.current_round, data.total_rounds);

        // 시나리오
        document.getElementById('roundLabel').textContent =
            `라운드 ${data.current_round}/${data.total_rounds}`;
        document.getElementById('scenarioTitle').textContent = data.scenario.title;
        document.getElementById('scenarioDesc').textContent = data.scenario.description;
        document.getElementById('scenarioChallenge').textContent = data.scenario.challenge;
        document.getElementById('hintText').textContent = data.scenario.hint || '';
        document.getElementById('hintText').classList.remove('show');

        // 돌발 이벤트 숨기기
        document.getElementById('surpriseArea').classList.add('hidden');
        document.getElementById('roundAnalysis').classList.add('hidden');

        // 팀 입력 UI
        renderTeamInput();
        document.getElementById('teamInputCard').classList.remove('hidden');

        // 타이머 시작
        startTimer(180);

        // 리더보드 초기화
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

    // 기준값에 변화 적용하여 파라미터 구성
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

        // 코칭 표시
        if (data.coaching) {
            showCoaching(data.coaching);
        }

        // 다음 팀 또는 라운드 종료
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
        });
}

function renderFinalLeaderboard(lb) {
    const el = document.getElementById('finalLeaderboard');
    el.innerHTML = lb.map((entry, i) => `
        <li class="leaderboard-item">
            <div class="leaderboard-rank rank-${i+1}">${i+1}</div>
            <div class="leaderboard-info">
                <div class="leaderboard-team">${entry.team}</div>
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
                <div class="leaderboard-rank rank-${i+1}">${i+1}</div>
                <div class="leaderboard-info">
                    <div class="leaderboard-team">${entry.team}</div>
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
