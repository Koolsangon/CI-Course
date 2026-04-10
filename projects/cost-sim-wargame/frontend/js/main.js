/**
 * 개발원가 War Game - 메인 진입점 (ES Module)
 */

import { state } from './modules/state.js';
import { switchCase, onSliderChange } from './modules/simulation.js';
import { initCopChart } from './modules/chart.js';
import { initOnboarding } from './modules/onboarding.js';
import { toggleChat, sendChat } from './modules/chat.js';
import {
    addTeam, removeTeam, createGame, submitDecision,
    nextRound, resetGame, toggleHint, dismissFinalReveal, askGameAI,
    selectCard, onGameSliderChange, spendToken,
} from './modules/wargame.js';

// ── 전역 함수 등록 (HTML onclick 핸들러용) ──
window.onSliderChange = onSliderChange;
window.addTeam = addTeam;
window.removeTeam = removeTeam;
window.createGame = createGame;
window.submitDecision = submitDecision;
window.nextRound = nextRound;
window.resetGame = resetGame;
window.toggleHint = toggleHint;
window.toggleChat = toggleChat;
window.sendChat = sendChat;
window.dismissFinalReveal = dismissFinalReveal;
window.askGameAI = askGameAI;
window.selectCard = selectCard;
window.onGameSliderChange = onGameSliderChange;
window.spendToken = spendToken;
window.toggleGameInfo = function () {
    const toggle = document.getElementById('gameInfoToggle');
    const body = document.getElementById('gameInfoBody');
    toggle.classList.toggle('open');
    body.classList.toggle('open');
};

// ── 초기화 ──
document.addEventListener('DOMContentLoaded', () => {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
            state.currentTab = btn.dataset.tab;
        });
    });

    // Case buttons
    document.querySelectorAll('.case-btn').forEach(btn => {
        btn.addEventListener('click', () => switchCase(parseInt(btn.dataset.case)));
    });

    // Initialize
    switchCase(1);
    initCopChart();

    // Fade-in observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll('.card, .feature-card').forEach(el => { el.classList.add('fade-in'); observer.observe(el); });

    // Onboarding
    initOnboarding();
});
