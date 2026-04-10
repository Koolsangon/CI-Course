/**
 * UI 컴포넌트: Toast, Modal, Loading
 */

export function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    const progress = document.createElement('div');
    progress.className = 'toast-progress';
    toast.appendChild(progress);

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 250);
    }, 3000);
}

export function showConfirm(title, message, danger = false) {
    return new Promise((resolve) => {
        const backdrop = document.getElementById('modalBackdrop');
        const titleEl = document.getElementById('modalTitle');
        const msgEl = document.getElementById('modalMessage');
        const confirmBtn = document.getElementById('modalConfirm');
        const cancelBtn = document.getElementById('modalCancel');

        titleEl.textContent = title;
        msgEl.textContent = message;
        confirmBtn.className = 'modal-confirm' + (danger ? ' danger' : '');
        backdrop.classList.add('active');

        function cleanup(result) {
            backdrop.classList.remove('active');
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
            resolve(result);
        }

        function onConfirm() { cleanup(true); }
        function onCancel() { cleanup(false); }

        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
    });
}

export function setLoading(elementId, isLoading) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const existing = el.querySelector('.skeleton-overlay');
    if (isLoading && !existing) {
        const overlay = document.createElement('div');
        overlay.className = 'skeleton-overlay';
        overlay.innerHTML = '<div class="skeleton-pulse"></div>';
        el.appendChild(overlay);
    } else if (!isLoading && existing) {
        existing.remove();
    }
}
