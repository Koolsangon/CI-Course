/**
 * AI 채팅
 */

import { API } from './state.js';
import { escapeHtml, renderMarkdown } from './utils.js';
import { api } from './api.js';

export function toggleChat() {
    document.getElementById('chatPanel').classList.toggle('open');
}

export async function sendChat() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;

    const messages = document.getElementById('chatMessages');
    messages.innerHTML += `<div class="chat-msg user">${escapeHtml(msg)}</div>`;
    input.value = '';
    messages.scrollTop = messages.scrollHeight;

    const { ok, data } = await api(API + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
    });

    if (ok) {
        const badge = data.ai_powered ? ' <span style="font-size:10px;opacity:0.7">[AI]</span>' : '';
        messages.innerHTML += `<div class="chat-msg assistant">${renderMarkdown(data.response)}${badge}</div>`;
    } else {
        messages.innerHTML += `<div class="chat-msg assistant">죄송합니다. 잠시 후 다시 시도해주세요.</div>`;
    }
    messages.scrollTop = messages.scrollHeight;
}
