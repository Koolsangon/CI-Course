/**
 * API 래퍼 (에러 핸들링 + 타임아웃)
 */

import { showToast } from './ui.js';

export async function api(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeout);

        if (!res.ok) {
            const errorText = await res.text().catch(() => '');
            let msg = `서버 오류 (${res.status})`;
            try { msg = JSON.parse(errorText).detail || msg; } catch {}
            showToast(msg, 'error');
            return { ok: false, data: null, error: msg };
        }

        const data = await res.json();
        return { ok: true, data, error: null };
    } catch (e) {
        clearTimeout(timeout);
        if (e.name === 'AbortError') {
            showToast('요청 시간이 초과되었습니다', 'error');
            return { ok: false, data: null, error: 'timeout' };
        }
        showToast('네트워크 연결을 확인해주세요', 'error');
        return { ok: false, data: null, error: e.message };
    }
}
