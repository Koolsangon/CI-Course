/**
 * War Game 전체 로직
 */

import { API, state } from './state.js';
import { escapeHtml, renderMarkdown } from './utils.js';
import { api } from './api.js';
import { showToast, showConfirm } from './ui.js';
import { playTone, playSubmitSound, playSurpriseSound, playTickSound, playWinSound } from './audio.js';

const ROUND_SCENARIOS = { 1: 'Loading 하락 위기', 2: '재료비 vs 수율 Trade-off', 3: '복합 위기 상황' };

// ── Client-side profit estimation (no server call) ──
function estimateProfit(loading, matChangePct, yieldChangePct, cardEffects) {
    let ld = loading / 100;
    let bomModule = 75.0 * (1 + matChangePct / 100);
    let moduleYield = 0.972 + yieldChangePct / 100;

    // Apply card effects
    if (cardEffects) {
        if (cardEffects.loading_add) ld = Math.max(0.01, Math.min(1.0, ld + cardEffects.loading_add));
        if (cardEffects.bom_mult) bomModule *= cardEffects.bom_mult;
        if (cardEffects.yield_add) moduleYield = Math.max(0.5, Math.min(1.0, moduleYield + cardEffects.yield_add));
    }

    const cumYield = 0.99 * 1.0 * 0.95 * moduleYield;
    const matCost = 6.0 / (1.0 * 0.95 * moduleYield) + 5.0 / (0.95 * moduleYield) + 1.5 / moduleYield + bomModule / 1.0;
    const baseLoading = 0.7;
    let panelLabor = 21.3 * (baseLoading / ld);
    let panelExp = 11.5 * (baseLoading / ld);
    let panelDepr = 16.2 * (baseLoading / ld);
    let modLabor = 8.7 * (baseLoading / ld);
    let modExp = 5.3 * (baseLoading / ld);
    let modDepr = 7.5 * (baseLoading / ld);

    if (cardEffects) {
        if (cardEffects.processing_mult) {
            panelLabor *= cardEffects.processing_mult; panelExp *= cardEffects.processing_mult;
            panelDepr *= cardEffects.processing_mult; modLabor *= cardEffects.processing_mult;
            modExp *= cardEffects.processing_mult; modDepr *= cardEffects.processing_mult;
        }
        if (cardEffects.labor_mult) { panelLabor *= cardEffects.labor_mult; modLabor *= cardEffects.labor_mult; }
        if (cardEffects.depreciation_add) { panelDepr += cardEffects.depreciation_add / 2; modDepr += cardEffects.depreciation_add / 2; }
        if (cardEffects.expense_add) { panelExp += cardEffects.expense_add; }
    }

    const processing = panelLabor + panelExp + panelDepr + modLabor + modExp + modDepr;
    const com = matCost + processing;
    const sga = 4.7 + 0.3 + 16.0 + 1.2 + 6.2;
    const cop = com + sga;
    const profit = 200.0 - cop;
    return {
        profit: profit,
        matCost: matCost,
        processing: processing,
        sga: sga,
    };
}

let selectedCardId = null;
let roundCards = [];

function renderDifficulty(level) {
    const max = 3;
    let stars = '';
    for (let i = 0; i < max; i++) {
        stars += `<span class="star${i < level ? '' : ' empty'}">&#9733;</span>`;
    }
    return ` <span class="scenario-difficulty">${stars}</span>`;
}

// ── Overlays ──

export async function showCountdown() {
    const overlay = document.getElementById('countdownOverlay');
    const num = document.getElementById('countdownNumber');
    if (!overlay || !num) return;
    overlay.classList.remove('hidden');
    overlay.classList.add('active');
    for (const n of ['3', '2', '1', 'GO!']) {
        num.textContent = n;
        num.style.animation = 'none';
        num.offsetHeight;
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

export function launchConfetti() {
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
            x: Math.random() * canvas.width, y: -20 - Math.random() * 200,
            w: 6 + Math.random() * 6, h: 4 + Math.random() * 8,
            vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            rot: Math.random() * 360, rotSpeed: (Math.random() - 0.5) * 10,
        });
    }
    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        particles.forEach(p => {
            p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.rot += p.rotSpeed;
            if (p.y < canvas.height + 50) alive = true;
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180);
            ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
        });
        frame++;
        if (alive && frame < 300) requestAnimationFrame(draw);
        else { canvas.classList.add('hidden'); ctx.clearRect(0, 0, canvas.width, canvas.height); }
    }
    requestAnimationFrame(draw);
}

// ── WebSocket ──

function setWsStatus(status) {
    const dot = document.getElementById('wsDot');
    const label = document.getElementById('wsLabel');
    if (!dot || !label) return;
    dot.className = 'ws-dot ' + status;
    const labels = { connected: '연결됨', reconnecting: '재연결 중...', disconnected: '연결 끊김' };
    label.textContent = labels[status] || '';
}

export function connectWebSocket(gameId) {
    if (state.ws) { state.ws.onclose = null; state.ws.close(); }
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    try {
        state.ws = new WebSocket(`${protocol}//${location.host}/ws/game/${gameId}`);
        setWsStatus('reconnecting');
        state.ws.onopen = () => { state.wsReconnectAttempts = 0; setWsStatus('connected'); startHeartbeat(); };
        state.ws.onmessage = (e) => { const msg = JSON.parse(e.data); if (msg.type !== 'pong') handleWSMessage(msg); };
        state.ws.onclose = () => { setWsStatus('disconnected'); stopHeartbeat(); scheduleReconnect(gameId); };
        state.ws.onerror = () => { setWsStatus('disconnected'); };
    } catch (e) { setWsStatus('disconnected'); }
}

function scheduleReconnect(gameId) {
    if (!state.gameId || state.wsReconnectAttempts >= 10) return;
    state.wsReconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, state.wsReconnectAttempts - 1), 30000);
    setWsStatus('reconnecting');
    state.wsReconnectTimer = setTimeout(() => {
        connectWebSocket(gameId);
        api(API + `/api/game/${gameId}`).then(({ ok, data }) => {
            if (ok && data && data.leaderboard) updateGameLeaderboard(data.leaderboard);
        });
    }, delay);
}

function startHeartbeat() {
    stopHeartbeat();
    state.wsHeartbeat = setInterval(() => {
        if (state.ws && state.ws.readyState === WebSocket.OPEN) state.ws.send(JSON.stringify({ type: 'ping' }));
    }, 30000);
}

function stopHeartbeat() {
    if (state.wsHeartbeat) { clearInterval(state.wsHeartbeat); state.wsHeartbeat = null; }
}

function handleWSMessage(msg) {
    switch (msg.type) {
        case 'team_submitted': updateGameLeaderboard(msg.data.leaderboard); break;
        case 'round_end': showRoundResult(msg.data); break;
        case 'surprise_event': showSurpriseEvent(msg.data); break;
    }
}

// ── Teams ──

export function addTeam() {
    const input = document.getElementById('teamNameInput');
    const name = input.value.trim();
    if (!name || state.teams.includes(name) || state.teams.length >= 6) return;
    state.teams.push(name);
    input.value = '';
    renderTeamList();
}

export function removeTeam(name) {
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

// ── Game lifecycle ──

export async function createGame() {
    const { ok, data } = await api(API + '/api/game/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_names: state.teams, total_rounds: 3 }),
    });
    if (!ok) return;
    state.gameId = data.game_id;
    connectWebSocket(data.game_id);
    document.getElementById('gameLobby').classList.add('hidden');
    document.getElementById('gamePlay').classList.remove('hidden');
    await showCountdown();
    startRound();
}

async function startRound() {
    const { ok, data } = await api(API + `/api/game/${state.gameId}/start-round`, { method: 'POST' });
    if (!ok) return;
    state.currentTeamIndex = 0;

    await showRoundTransition(data.current_round, data.total_rounds);
    renderRoundIndicator(data.current_round, data.total_rounds);

    document.getElementById('roundLabel').textContent = `라운드 ${data.current_round}/${data.total_rounds}`;
    const scenario = data.scenario;
    document.getElementById('scenarioTitle').innerHTML = escapeHtml(scenario.title) + renderDifficulty(scenario.difficulty || data.current_round);
    document.getElementById('scenarioDesc').innerHTML =
        (scenario.briefing ? `<div class="scenario-briefing">${escapeHtml(scenario.briefing)}</div>` : '') + escapeHtml(scenario.description);
    document.getElementById('scenarioChallenge').textContent = scenario.challenge;
    document.getElementById('hintText').textContent = scenario.hint || '';
    document.getElementById('hintText').classList.remove('show');
    document.getElementById('surpriseArea').classList.add('hidden');
    document.getElementById('roundAnalysis').classList.add('hidden');

    roundCards = data.round_cards || [];
    selectedCardId = null;
    state._teamTokens = data.team_tokens || {};

    renderTeamInput();
    document.getElementById('teamInputCard').classList.remove('hidden');
    startTimer(180);
    updateGameLeaderboard(data.leaderboard);
}

function renderRoundIndicator(current, total) {
    document.getElementById('roundIndicator').innerHTML = Array.from({ length: total }, (_, i) => {
        const cls = i + 1 < current ? 'completed' : i + 1 === current ? 'active' : '';
        return `<div class="round-dot ${cls}"></div>`;
    }).join('');
}

function renderTeamInput() {
    const team = state.teams[state.currentTeamIndex];
    const tokens = state._teamTokens ? (state._teamTokens[team] ?? 5) : 5;
    document.getElementById('currentTeamLabel').innerHTML =
        `${escapeHtml(team)} - 의사결정 <span class="token-badge" title="남은 토큰">🪙 ${tokens}</span>`;

    // Cards HTML
    const cardsHtml = roundCards.length > 0 ? `
        <div class="strategy-cards-section">
            <div class="card-section-title">전략 카드 선택 <span class="text-muted">(선택사항)</span></div>
            <div class="strategy-cards-row">
                ${roundCards.map(c => `
                    <div class="strategy-card" data-card-id="${c.id}" onclick="selectCard('${c.id}')">
                        <div class="sc-icon">${c.icon}</div>
                        <div class="sc-name">${escapeHtml(c.name)}</div>
                        <div class="sc-desc">${escapeHtml(c.description)}</div>
                        <div class="sc-edu">${escapeHtml(c.edu_point)}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    document.getElementById('gameParamSliders').innerHTML = `
        ${cardsHtml}
        <div class="param-group">
            <label><span>Loading (%)</span><span class="param-value" id="gLoadingVal">70</span></label>
            <input type="range" id="gLoading" min="20" max="100" value="70" step="5"
                   oninput="onGameSliderChange()">
        </div>
        <div class="param-group">
            <label><span>Module 재료비 변화 (%)</span><span class="param-value" id="gMatVal">0</span></label>
            <input type="range" id="gMaterial" min="-20" max="20" value="0" step="1"
                   oninput="onGameSliderChange()">
        </div>
        <div class="param-group">
            <label><span>Module 수율 변화 (%p)</span><span class="param-value" id="gYieldVal">0</span></label>
            <input type="range" id="gYield" min="-10" max="5" value="0" step="1"
                   oninput="onGameSliderChange()">
        </div>
        <div class="impact-preview" id="impactPreview">
            <div class="impact-profit" id="impactProfit">예상 영업이익: -</div>
            <div class="impact-detail" id="impactDetail"></div>
        </div>
        <div class="token-actions">
            <button class="btn btn-outline btn-sm token-btn" onclick="spendToken('peek')" title="다른 팀 결과 엿보기 (2토큰)">👀 엿보기 <span class="cost-badge">2🪙</span></button>
            <button class="btn btn-outline btn-sm token-btn" onclick="spendToken('shield')" title="서프라이즈 이벤트 방어 (1토큰)">🛡️ 방어 <span class="cost-badge">1🪙</span></button>
        </div>
        <div class="ai-assist-area">
            <div class="ai-assist-row">
                <input type="text" id="aiAskInput" class="ai-ask-input" placeholder="AI 코치에게 전략 질문..."
                       onkeypress="if(event.key==='Enter')askGameAI()">
                <button class="btn btn-outline btn-sm" onclick="askGameAI()">AI 질문 <span class="cost-badge">1🪙</span></button>
            </div>
            <div id="aiAskResponse" class="ai-ask-response hidden"></div>
        </div>
    `;

    // Trigger initial preview
    onGameSliderChange();
}

export function selectCard(cardId) {
    if (selectedCardId === cardId) {
        selectedCardId = null;
    } else {
        selectedCardId = cardId;
    }
    document.querySelectorAll('.strategy-card').forEach(el => {
        el.classList.toggle('selected', el.dataset.cardId === selectedCardId);
    });
    onGameSliderChange();
}

export function onGameSliderChange() {
    const loading = parseInt(document.getElementById('gLoading')?.value || 70);
    const matChange = parseInt(document.getElementById('gMaterial')?.value || 0);
    const yieldChange = parseInt(document.getElementById('gYield')?.value || 0);

    document.getElementById('gLoadingVal').textContent = loading;
    document.getElementById('gMatVal').textContent = (matChange > 0 ? '+' : '') + matChange;
    document.getElementById('gYieldVal').textContent = (yieldChange > 0 ? '+' : '') + yieldChange;

    // Get selected card effects
    const card = roundCards.find(c => c.id === selectedCardId);
    const effects = card ? card.effects : null;

    const est = estimateProfit(loading, matChange, yieldChange, effects);
    const profitEl = document.getElementById('impactProfit');
    const detailEl = document.getElementById('impactDetail');

    if (profitEl) {
        const cls = est.profit >= 0 ? 'positive' : 'negative';
        const arrow = est.profit >= 0 ? '▲' : '▼';
        profitEl.innerHTML = `예상 영업이익: <strong class="${cls}">$${est.profit.toFixed(1)} ${arrow}</strong>`;
    }
    if (detailEl) {
        detailEl.innerHTML = `재료비 $${est.matCost.toFixed(1)} | 가공비 $${est.processing.toFixed(1)} | SGA $${est.sga.toFixed(1)}`;
    }
}

export async function spendToken(action) {
    const team = state.teams[state.currentTeamIndex];
    const costs = { peek: 2, shield: 1 };
    const labels = { peek: '경쟁팀 엿보기', shield: '서프라이즈 방어' };

    const confirmed = await showConfirm('토큰 사용', `${labels[action]}에 ${costs[action]}🪙를 사용하시겠습니까?`);
    if (!confirmed) return;

    const { ok, data } = await api(API + `/api/game/${state.gameId}/spend-token?team_name=${encodeURIComponent(team)}&action=${action}`, { method: 'POST' });
    if (!ok) return;

    // Update local token state
    if (state._teamTokens) state._teamTokens[team] = data.tokens_remaining;
    showToast(`${labels[action]} 완료! (남은 토큰: ${data.tokens_remaining}🪙)`, 'info');

    if (action === 'peek' && data.data) {
        const lines = Object.entries(data.data).map(([t, p]) =>
            `${escapeHtml(t)}: ${typeof p === 'number' ? '$' + p.toFixed(1) : p}`
        ).join('<br>');
        const responseEl = document.getElementById('aiAskResponse');
        responseEl.classList.remove('hidden');
        responseEl.innerHTML = `<strong>👀 경쟁팀 현황</strong><br>${lines}`;
    }
    if (action === 'shield') {
        showToast('🛡️ 이번 라운드 서프라이즈 이벤트가 무효화됩니다', 'success');
    }

    // Update token display
    const badge = document.querySelector('.token-badge');
    if (badge) badge.textContent = `🪙 ${data.tokens_remaining}`;
}

export async function askGameAI() {
    const input = document.getElementById('aiAskInput');
    const responseEl = document.getElementById('aiAskResponse');
    const msg = input.value.trim();
    if (!msg || !state.gameId) return;

    input.value = '';
    responseEl.classList.remove('hidden');
    responseEl.innerHTML = '<span style="opacity:0.5">AI가 생각 중...</span>';

    const { ok, data } = await api(API + `/api/game/${state.gameId}/ask-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
    });

    if (ok) {
        const badge = data.ai_powered ? ' <span style="font-size:10px;opacity:0.5">[AI]</span>' : '';
        responseEl.innerHTML = renderMarkdown(data.response) + badge;
    } else {
        responseEl.innerHTML = '잠시 후 다시 시도해주세요.';
    }
}

export async function submitDecision() {
    const team = state.teams[state.currentTeamIndex];
    const loading = parseInt(document.getElementById('gLoading').value);
    const matChange = parseInt(document.getElementById('gMaterial').value);
    const yieldChange = parseInt(document.getElementById('gYield').value);

    const cardName = selectedCardId ? roundCards.find(c => c.id === selectedCardId)?.name : '없음';
    const confirmed = await showConfirm('의사결정 제출',
        `${team} 팀: Loading ${loading}%, 재료비 ${matChange >= 0 ? '+' : ''}${matChange}%, 수율 ${yieldChange >= 0 ? '+' : ''}${yieldChange}%p\n전략 카드: ${cardName}`);
    if (!confirmed) return;

    const ld = loading / 100, md = matChange / 100, yd = yieldChange / 100;
    const params = {
        price: 200.0, loading: ld, tft_yield: 0.99, cf_yield: 1.0, cell_yield: 0.95,
        module_yield: 0.972 + yd, bom_tft: 6.0, bom_cf: 5.0, bom_cell: 1.5, bom_module: 75.0 * (1 + md),
        panel_labor: 21.3 * (0.7 / ld), panel_expense: 11.5 * (0.7 / ld), panel_depreciation: 16.2 * (0.7 / ld),
        module_labor: 8.7 * (0.7 / ld), module_expense: 5.3 * (0.7 / ld), module_depreciation: 7.5 * (0.7 / ld),
        sga_direct_dev: 4.7, sga_transport: 0.3, sga_business_unit: 16.0, sga_operation: 1.2, sga_corporate_oh: 6.2,
    };

    const { ok, data } = await api(API + `/api/game/${state.gameId}/submit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_name: team, params, card_id: selectedCardId }),
    });
    if (!ok) return;

    playSubmitSound();
    showToast(`${team} 팀 제출 완료${selectedCardId ? ' (카드: ' + cardName + ')' : ''}`, 'success');
    selectedCardId = null;

    // Show impact ripple
    if (data.impact_breakdown) showImpactRipple(data.impact_breakdown);
    if (data.coaching) showCoaching(data.coaching);

    state.currentTeamIndex++;
    if (state.currentTeamIndex < state.teams.length) {
        renderTeamInput();
    } else {
        document.getElementById('teamInputCard').classList.add('hidden');
        if (data.round_complete) showRoundResult(data);
    }
}

function showImpactRipple(breakdown) {
    const area = document.getElementById('coachingArea');
    const labels = { loading: 'Loading', material: '재료비', yield: '수율', card: '전략카드' };
    const entries = Object.entries(breakdown).filter(([, v]) => Math.abs(v) >= 0.1);
    entries.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

    let html = '<div class="impact-ripple"><strong>의사결정 영향 분석</strong><div class="impact-bars">';
    entries.forEach(([key, value]) => {
        const cls = value >= 0 ? 'positive' : 'negative';
        const maxW = 100;
        const maxVal = Math.max(...entries.map(([, v]) => Math.abs(v)), 1);
        const w = Math.abs(value) / maxVal * maxW;
        html += `<div class="impact-bar-row">
            <span class="impact-bar-label">${labels[key] || key}</span>
            <div class="impact-bar-track"><div class="impact-bar-fill ${cls}" style="width:${w}%"></div></div>
            <span class="impact-bar-value ${cls}">${value >= 0 ? '+' : ''}$${value.toFixed(1)}</span>
        </div>`;
    });
    html += '</div></div>';

    document.getElementById('coachingText').innerHTML = html;
    area.classList.remove('hidden');
    setTimeout(() => area.classList.add('hidden'), 6000);
}

function showCoaching(text) {
    const area = document.getElementById('coachingArea');
    document.getElementById('coachingText').innerHTML = renderMarkdown(text);
    area.classList.remove('hidden');
    setTimeout(() => area.classList.add('hidden'), 5000);
}

function showRoundResult(data) {
    stopTimer();
    const gameData = data.data || data;
    const analysisEl = document.getElementById('analysisText');
    let html = '';

    // Use leaderboard from response or gameData
    const lb = data.leaderboard || gameData.leaderboard;
    if (lb) {
        html += '<div class="round-summary-grid">';
        lb.forEach(entry => {
            const profit = entry.operating_profit || 0;
            html += `<div class="round-summary-team">
                <div class="team-name">${escapeHtml(entry.team)}</div>
                <div class="team-profit ${profit >= 0 ? 'positive' : 'negative'}">$${profit.toFixed(1)}</div>
                <div class="team-score-total">누적 ${entry.total_score}점</div>
            </div>`;
        });
        html += '</div>';
        updateGameLeaderboard(lb);
    }

    if (data.analysis) html += renderMarkdown(data.analysis);

    const scenario = gameData.scenario;
    if (scenario && scenario.learning_objective) {
        html += `<div class="learning-objective"><strong>학습 포인트:</strong> ${escapeHtml(scenario.learning_objective)}</div>`;
    }

    // Drama display
    const drama = data.drama || gameData.drama;
    if (drama && drama.type !== 'none') {
        const dramaIcons = { comeback: '🔄', close: '⚡', dominant: '🏆', normal: '🎯' };
        const dramaCls = drama.type === 'comeback' ? 'drama-comeback' : drama.type === 'close' ? 'drama-close' : '';
        html += `<div class="round-drama ${dramaCls}">
            <span class="drama-icon">${dramaIcons[drama.type] || '🎯'}</span>
            <span class="drama-text">${escapeHtml(drama.message)}</span>
        </div>`;

        if (drama.type === 'comeback') {
            launchConfetti();
            playWinSound();
        } else if (drama.type === 'close') {
            playTone(440, 0.3, 'triangle');
            setTimeout(() => playTone(520, 0.3, 'triangle'), 200);
        }
    }

    analysisEl.innerHTML = html;
    document.getElementById('roundAnalysis').classList.remove('hidden');

    // Detect finished: check both direct response and nested gameData
    const isFinished = data.game_status === 'finished' || gameData.status === 'finished';
    state._gameFinished = isFinished;

    if (isFinished) {
        const btn = document.getElementById('nextRoundBtn');
        btn.disabled = false;
        btn.textContent = '최종 결과 보기';
    } else {
        const btn = document.getElementById('nextRoundBtn');
        btn.disabled = true;
        btn.textContent = '전략 논의 시간 (30초)';
        let t = 30;
        const iv = setInterval(() => {
            t--;
            btn.textContent = `전략 논의 시간 (${t}초)`;
            if (t <= 0) { clearInterval(iv); btn.disabled = false; btn.textContent = '다음 라운드'; }
        }, 1000);
    }
}

export function nextRound() {
    if (state._gameFinished) { showFinalResult(); return; }
    const btn = document.getElementById('nextRoundBtn');
    if (btn.textContent === '최종 결과 보기') { showFinalResult(); return; }
    startRound();
}

async function showFinalResult() {
    stopTimer();
    const { ok, data } = await api(API + `/api/game/${state.gameId}/leaderboard`);
    if (!ok) return;

    const lb = data.leaderboard;
    const overlay = document.getElementById('finalRevealOverlay');
    const items = document.getElementById('finalRevealItems');
    const dismiss = document.getElementById('finalDismiss');

    items.innerHTML = '';
    dismiss.classList.remove('visible');
    document.getElementById('finalRevealTitle').style.animation = 'none';
    overlay.offsetHeight;
    document.getElementById('finalRevealTitle').style.animation = '';
    overlay.classList.add('active');

    const reversed = [...lb].reverse();
    reversed.forEach((entry, i) => {
        const isWinner = i === reversed.length - 1;
        const rankNum = lb.length - i;
        const rankCls = rankNum === 1 ? 'gold' : rankNum === 2 ? 'silver' : rankNum === 3 ? 'bronze' : '';
        const item = document.createElement('div');
        item.className = 'final-reveal-item' + (isWinner ? ' winner' : '');
        item.innerHTML = `
            <div class="final-rank ${rankCls}">${rankNum === 1 ? '\u{1F947}' : rankNum === 2 ? '\u{1F948}' : rankNum === 3 ? '\u{1F949}' : '#' + rankNum}</div>
            <div class="final-team-name">${escapeHtml(entry.team)}</div>
            <div class="final-score">${entry.total_score}점</div>
        `;
        items.appendChild(item);
        setTimeout(() => { item.classList.add('visible'); if (isWinner) { playWinSound(); launchConfetti(); } }, 1500 + i * 600);
    });

    setTimeout(() => dismiss.classList.add('visible'), 1500 + reversed.length * 600 + 500);
}

export function dismissFinalReveal() {
    document.getElementById('finalRevealOverlay').classList.remove('active');
    document.getElementById('gamePlay').classList.add('hidden');
    document.getElementById('gameResult').classList.remove('hidden');
    api(API + `/api/game/${state.gameId}/leaderboard`).then(({ ok, data }) => {
        if (!ok) return;
        const lb = data.leaderboard;
        document.getElementById('winnerTeam').textContent = lb[0].team + ' 팀 우승!';
        renderFinalLeaderboard(lb);
    });
}

function renderFinalLeaderboard(lb) {
    document.getElementById('finalLeaderboard').innerHTML = lb.map((entry, i) => `
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
        return `
            <li class="leaderboard-item">
                <div class="leaderboard-rank rank-${i + 1}">${i + 1}</div>
                <div class="leaderboard-info">
                    <div class="leaderboard-team">${escapeHtml(entry.team)}</div>
                    <div class="leaderboard-score">영업이익 $${profit.toFixed(1)} | 총점 ${entry.total_score}</div>
                </div>
                <div class="leaderboard-profit ${profit >= 0 ? 'positive' : 'negative'}">
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

export async function resetGame() {
    const confirmed = await showConfirm('게임 종료', '현재 게임을 종료하시겠습니까? 모든 진행 상황이 초기화됩니다.', true);
    if (!confirmed) return;
    state.gameId = null; state.teams = []; state.currentTeamIndex = 0; state.wsReconnectAttempts = 0;
    if (state.wsReconnectTimer) clearTimeout(state.wsReconnectTimer);
    stopHeartbeat();
    if (state.ws) { state.ws.onclose = null; state.ws.close(); }
    document.getElementById('gameResult').classList.add('hidden');
    document.getElementById('gamePlay').classList.add('hidden');
    document.getElementById('gameLobby').classList.remove('hidden');
    document.getElementById('teamList').innerHTML = '';
    document.getElementById('startGameBtn').disabled = true;
}

export function toggleHint() {
    document.getElementById('hintText').classList.toggle('show');
}

// ── Timer ──

function startTimer(seconds) {
    state.timeLeft = seconds; state.timerTotal = seconds;
    stopTimer(); updateTimerDisplay();
    state.timerInterval = setInterval(() => {
        state.timeLeft--;
        updateTimerDisplay();
        if (state.timeLeft <= 0) { stopTimer(); autoSubmitRemaining(); }
    }, 1000);
}

function stopTimer() {
    if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
}

function updateTimerDisplay() {
    const el = document.getElementById('gameTimer');
    const min = Math.floor(state.timeLeft / 60), sec = state.timeLeft % 60;
    el.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    el.className = 'timer' + (state.timeLeft <= 30 ? ' urgent' : '');
    if (state.timeLeft <= 10 && state.timeLeft > 0) playTickSound();

    const fill = document.getElementById('timerProgressFill');
    if (fill) {
        fill.style.width = (state.timeLeft / state.timerTotal * 100) + '%';
        fill.className = 'timer-progress-fill' + (state.timeLeft <= 30 ? ' urgent' : state.timeLeft <= 60 ? ' warning' : '');
    }
}

async function autoSubmitRemaining() {
    if (state.currentTeamIndex >= state.teams.length) return;
    showToast('시간 초과 - 현재 값으로 자동 제출합니다', 'warning');
    while (state.currentTeamIndex < state.teams.length) {
        const team = state.teams[state.currentTeamIndex];
        const ld = parseInt(document.getElementById('gLoading')?.value || 70) / 100;
        const md = parseInt(document.getElementById('gMaterial')?.value || 0) / 100;
        const yd = parseInt(document.getElementById('gYield')?.value || 0) / 100;
        const params = {
            price: 200.0, loading: ld, tft_yield: 0.99, cf_yield: 1.0, cell_yield: 0.95,
            module_yield: 0.972 + yd, bom_tft: 6.0, bom_cf: 5.0, bom_cell: 1.5, bom_module: 75.0 * (1 + md),
            panel_labor: 21.3 * (0.7 / ld), panel_expense: 11.5 * (0.7 / ld), panel_depreciation: 16.2 * (0.7 / ld),
            module_labor: 8.7 * (0.7 / ld), module_expense: 5.3 * (0.7 / ld), module_depreciation: 7.5 * (0.7 / ld),
            sga_direct_dev: 4.7, sga_transport: 0.3, sga_business_unit: 16.0, sga_operation: 1.2, sga_corporate_oh: 6.2,
        };
        await api(API + `/api/game/${state.gameId}/submit`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ team_name: team, params }),
        });
        state.currentTeamIndex++;
    }
    document.getElementById('teamInputCard').classList.add('hidden');
}
