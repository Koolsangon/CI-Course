/**
 * 시뮬레이션 케이스 관리
 */

import { API, state } from './state.js';
import { escapeHtml, debounce, animateValue } from './utils.js';
import { api } from './api.js';
import { setLoading } from './ui.js';
import { updateMainChart, updateCase3Chart } from './chart.js';

export const CASE_CONFIG = {
    1: {
        name: 'Loading 변화', endpoint: '/api/simulate/loading',
        metric2: { label: '영업이익률', key: 'operating_margin', suffix: '%' },
        chartTitle: '가공비 구조 비교',
        buildParams: (vals) => `loading=${vals.loading / 100}`,
        sliders: [{ id: 'loading', label: 'Loading (%)', min: 20, max: 100, step: 5, value: 50, display: v => v + '%' }],
    },
    2: {
        name: '인건비 변화', endpoint: '/api/simulate/labor',
        metric2: { label: 'SG&A', key: 'sga', prefix: '$' },
        chartTitle: '인건비 영향 비교',
        buildParams: (vals) => `multiplier=${vals.multiplier}`,
        sliders: [{ id: 'multiplier', label: '인건비 배수', min: 0.5, max: 3.0, step: 0.1, value: 1.5, display: v => v + 'X' }],
    },
    3: {
        name: '한계이익률 목표', endpoint: '/api/simulate/marginal-profit',
        metric2: { label: '한계이익률', key: 'current_marginal_rate', suffix: '%' },
        chartTitle: '한계이익률 역산',
        buildParams: (vals) => `target_rate=${vals.target_rate / 100}`,
        sliders: [{ id: 'target_rate', label: '목표 한계이익률 (%)', min: 40, max: 80, step: 1, value: 60, display: v => v + '%' }],
    },
    4: {
        name: '재료비/수율 변화', endpoint: '/api/simulate/material-yield',
        metric2: { label: '소요재료비', key: 'material_cost', prefix: '$' },
        chartTitle: '재료비·수율 영향 비교',
        buildParams: (vals) => `material_change_pct=${vals.material / 100}&module_yield_change=${vals.yield_change / 100}`,
        sliders: [
            { id: 'material', label: 'Module 재료비 변화 (%)', min: -20, max: 20, step: 1, value: -5, display: v => (v > 0 ? '+' : '') + v + '%' },
            { id: 'yield_change', label: 'Module 수율 변화 (%p)', min: -10, max: 5, step: 1, value: -4, display: v => (v > 0 ? '+' : '') + v + '%p' },
        ],
    },
    5: {
        name: '면취수/Mask', endpoint: '/api/simulate/cuts-mask',
        metric2: { label: 'Panel 가공비', computed: (d) => (d.panel_labor + d.panel_expense + d.panel_depreciation).toFixed(1), prefix: '$' },
        chartTitle: 'Panel 가공비 구조 비교',
        buildParams: (vals) => `new_cuts=${vals.cuts}&new_mask=${vals.mask}`,
        sliders: [
            { id: 'cuts', label: '면취수', min: 20, max: 35, step: 1, value: 29, display: v => v + '개' },
            { id: 'mask', label: 'Mask 수', min: 4, max: 10, step: 1, value: 7, display: v => v + '매' },
        ],
    },
    6: {
        name: 'T/T + 투자비', endpoint: '/api/simulate/tact-investment',
        metric2: { label: 'Module 상각비', key: 'module_depreciation', prefix: '$' },
        chartTitle: 'Module 가공비 구조 비교',
        buildParams: (vals) => `tact_multiplier=${vals.tact}&investment_delta=${vals.invest}`,
        sliders: [
            { id: 'tact', label: 'Tact 배수', min: 1.0, max: 2.0, step: 0.1, value: 1.2, display: v => v + 'X' },
            { id: 'invest', label: '투자 상각비 추가 ($)', min: 0, max: 5.0, step: 0.1, value: 1.9, display: v => '+$' + v },
        ],
    },
};

export function switchCase(caseNum) {
    state.currentCase = caseNum;
    document.querySelectorAll('.case-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`.case-btn[data-case="${caseNum}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    renderCasePanel(caseNum);

    const marginalCard = document.getElementById('marginalResultCard');
    if (marginalCard) marginalCard.classList.toggle('hidden', caseNum !== 3);

    document.getElementById('chartTitle').textContent = CASE_CONFIG[caseNum].chartTitle;
    const cfg = CASE_CONFIG[caseNum];
    document.getElementById('metric2Label').textContent = cfg.metric2.label;
    document.getElementById('metric2Label2').textContent = cfg.metric2.label;

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

const debouncedSimulation = debounce(() => runSimulation(), 150);

export function onSliderChange(sliderId, value) {
    const cfg = CASE_CONFIG[state.currentCase];
    const sliderDef = cfg.sliders.find(s => s.id === sliderId);
    if (sliderDef) {
        document.getElementById('val_' + sliderId).textContent = sliderDef.display(parseFloat(value));
    }
    debouncedSimulation();
}

export async function runSimulation() {
    const caseNum = state.currentCase;
    const cfg = CASE_CONFIG[caseNum];

    const vals = {};
    cfg.sliders.forEach(s => {
        const el = document.getElementById('slider_' + s.id);
        vals[s.id] = parseFloat(el ? el.value : s.value);
    });

    setLoading('comparisonCard', true);
    const { ok, data } = await api(API + cfg.endpoint + '?' + cfg.buildParams(vals), { method: 'POST' });
    setLoading('comparisonCard', false);

    if (!ok) return;

    if (caseNum === 3) {
        updateCase3UI(data);
    } else {
        updateSimUI(data, caseNum);
    }
}

function updateSimUI(data, caseNum) {
    const ref = data.reference;
    const sim = data.simulation;
    state.reference = ref;
    state.simulation = sim;
    const cfg = CASE_CONFIG[caseNum];

    document.getElementById('refProfit').textContent = '$' + ref.operating_profit.toFixed(1);
    const simProfitEl = document.getElementById('simProfit');
    simProfitEl.textContent = '$' + sim.operating_profit.toFixed(1);
    animateValue(simProfitEl);

    const delta = sim.operating_profit - ref.operating_profit;
    const deltaEl = document.getElementById('profitDelta');
    deltaEl.textContent = (delta >= 0 ? '+' : '') + '$' + delta.toFixed(1);
    deltaEl.className = 'delta-badge ' + (delta >= 0 ? 'delta-up' : 'delta-down');
    document.getElementById('simProfit').className = 'comparison-value ' + (sim.operating_profit >= 0 ? 'after-positive' : 'after-negative');

    const m2 = cfg.metric2;
    const simMetric2El = document.getElementById('simMetric2');
    if (m2.computed) {
        document.getElementById('refMetric2').textContent = (m2.prefix || '') + m2.computed(ref);
        simMetric2El.textContent = (m2.prefix || '') + m2.computed(sim);
    } else {
        const refVal = ref[m2.key], simVal = sim[m2.key];
        document.getElementById('refMetric2').textContent = (m2.prefix || '') + (typeof refVal === 'number' ? refVal.toFixed(1) : refVal) + (m2.suffix || '');
        simMetric2El.textContent = (m2.prefix || '') + (typeof simVal === 'number' ? simVal.toFixed(1) : simVal) + (m2.suffix || '');
    }
    animateValue(simMetric2El);

    updateResultTable(ref, sim);
    updateMainChart(ref, sim, caseNum);
}

function updateCase3UI(data) {
    const ref = data.reference;
    state.reference = ref;
    state.simulation = null;

    document.getElementById('refProfit').textContent = '$' + ref.operating_profit.toFixed(1);
    document.getElementById('simProfit').textContent = '-';
    document.getElementById('profitDelta').textContent = '';
    document.getElementById('profitDelta').className = 'delta-badge';
    document.getElementById('refMetric2').textContent = data.current_marginal_rate + '%';
    document.getElementById('simMetric2').textContent = (data.target_rate * 100).toFixed(0) + '%';

    const card = document.getElementById('marginalResultCard');
    card.classList.remove('hidden');
    document.getElementById('marginalResult').innerHTML = `
        <div style="font-size:14px;line-height:2">
            <p><strong>현재 한계이익률:</strong> ${data.current_marginal_rate}%</p>
            <p><strong>목표 한계이익률:</strong> ${(data.target_rate * 100).toFixed(0)}%</p>
            <p><strong>목표 한계이익:</strong> $${data.target_marginal_profit}</p>
            <p><strong>허용 변동비:</strong> $${data.target_variable_cost}</p>
            <p><strong>필요 소요재료비:</strong> $${data.required_material_cost}</p>
            <p style="color:var(--danger);font-weight:600">재료비 절감 필요: $${data.material_reduction}</p>
        </div>
    `;

    updateResultTable(ref, ref);
    updateCase3Chart(data);
}

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
        const colorCls = !r.raw && diff !== 0 ? (profitItems.includes(r.label) ? (diff > 0 ? 'positive' : 'negative') : (diff < 0 ? 'positive' : 'negative')) : '';
        return `<tr class="${cls.join(' ')}">
            <td class="col-label" style="${r.indent ? 'padding-left:24px;color:#64748b;font-size:12px' : ''}">${r.label}</td>
            <td class="col-ref">${refVal}</td>
            <td class="col-sim ${colorCls}">${simVal}</td>
        </tr>`;
    }).join('');
}
