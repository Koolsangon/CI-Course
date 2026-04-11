/**
 * 글로벌 상태 관리
 */

export const API = '';

export const state = {
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
    timerTotal: 180,
    ws: null,
    wsReconnectAttempts: 0,
    wsReconnectTimer: null,
    wsHeartbeat: null,
};

export const charts = {
    main: null,
    cop: null,
};
