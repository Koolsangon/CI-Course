/**
 * 차트 관리 (Chart.js)
 */

import { API, charts } from './state.js';
import { api } from './api.js';

export function initCopChart() {
    Chart.defaults.color = 'rgba(255,255,255,0.48)';
    Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(40,40,42,0.95)';
    Chart.defaults.plugins.tooltip.titleColor = '#ffffff';
    Chart.defaults.plugins.tooltip.bodyColor = 'rgba(255,255,255,0.7)';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.08)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.padding = 10;

    api(API + '/api/reference/1').then(({ ok, data }) => {
        if (!ok || !data) return;
        const ref = data.reference;
        if (!ref) return;
        const ctx = document.getElementById('copStructureChart');
        if (!ctx) return;

        charts.cop = new Chart(ctx.getContext('2d'), {
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
    });
}

export function updateMainChart(ref, sim, caseNum) {
    const ctx = document.getElementById('mainChart').getContext('2d');

    let labels, refData, simData;

    if (caseNum === 1 || caseNum === 2) {
        labels = ['Panel\n노무비', 'Panel\n경비', 'Panel\n상각비', 'Module\n노무비', 'Module\n경비', 'Module\n상각비'];
        refData = [ref.panel_labor, ref.panel_expense, ref.panel_depreciation, ref.module_labor, ref.module_expense, ref.module_depreciation];
        simData = [sim.panel_labor, sim.panel_expense, sim.panel_depreciation, sim.module_labor, sim.module_expense, sim.module_depreciation];
    } else if (caseNum === 5) {
        labels = ['소요재료비', 'Panel\n가공비', 'Module\n가공비', 'SG&A', '영업이익'];
        refData = [ref.material_cost, ref.panel_labor+ref.panel_expense+ref.panel_depreciation, ref.module_labor+ref.module_expense+ref.module_depreciation, ref.sga, ref.operating_profit];
        simData = [sim.material_cost, sim.panel_labor+sim.panel_expense+sim.panel_depreciation, sim.module_labor+sim.module_expense+sim.module_depreciation, sim.sga, sim.operating_profit];
    } else if (caseNum === 6) {
        labels = ['Module\n노무비', 'Module\n경비', 'Module\n상각비', 'Panel\n가공비', '영업이익'];
        refData = [ref.module_labor, ref.module_expense, ref.module_depreciation, ref.panel_labor+ref.panel_expense+ref.panel_depreciation, ref.operating_profit];
        simData = [sim.module_labor, sim.module_expense, sim.module_depreciation, sim.panel_labor+sim.panel_expense+sim.panel_depreciation, sim.operating_profit];
    } else {
        labels = ['소요재료비', '가공비', 'SG&A', 'COP', '영업이익'];
        refData = [ref.material_cost, ref.processing_cost, ref.sga, ref.cop, ref.operating_profit];
        simData = [sim.material_cost, sim.processing_cost, sim.sga, sim.cop, sim.operating_profit];
    }

    const simColor = sim.operating_profit >= 0 ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)';
    const simBorder = sim.operating_profit >= 0 ? 'rgba(34,197,94,1)' : 'rgba(239,68,68,1)';

    if (charts.main && charts.main._caseNum === caseNum) {
        charts.main.data.datasets[0].data = refData;
        charts.main.data.datasets[1].data = simData;
        charts.main.data.datasets[1].backgroundColor = simColor;
        charts.main.data.datasets[1].borderColor = simBorder;
        charts.main.update('none');
        return;
    }

    if (charts.main) charts.main.destroy();

    charts.main = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Reference', data: refData, backgroundColor: 'rgba(148,163,184,0.6)', borderColor: 'rgba(148,163,184,1)', borderWidth: 1 },
                { label: 'Simulation', data: simData, backgroundColor: simColor, borderColor: simBorder, borderWidth: 1 },
            ],
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: { duration: 300 },
            plugins: { legend: { position: 'top', labels: { font: { size: 12 } } } },
            scales: { y: { title: { display: true, text: '$', font: { size: 12 } } } },
        },
    });
    charts.main._caseNum = caseNum;
}

export function updateCase3Chart(data) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    if (charts.main) charts.main.destroy();

    const ref = data.reference;
    charts.main = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['소요재료비', '변동비', '한계이익', '한계이익률(%)'],
            datasets: [
                { label: '현재', data: [ref.material_cost, ref.material_cost + 0.3, ref.marginal_profit, data.current_marginal_rate], backgroundColor: 'rgba(148,163,184,0.6)', borderColor: 'rgba(148,163,184,1)', borderWidth: 1 },
                { label: '목표', data: [data.required_material_cost, data.target_variable_cost, data.target_marginal_profit, data.target_rate * 100], backgroundColor: 'rgba(59,130,246,0.6)', borderColor: 'rgba(59,130,246,1)', borderWidth: 1 },
            ],
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: { duration: 300 },
            plugins: { legend: { position: 'top', labels: { font: { size: 12 } } } },
            scales: { y: { title: { display: true, text: '$ / %', font: { size: 12 } } } },
        },
    });
    charts.main._caseNum = 3;
}
