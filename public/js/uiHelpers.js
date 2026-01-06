export function showError(errorBox, message) {
    errorBox.classList.remove('d-none');
    errorBox.textContent = message;
}

export function clearError(errorBox) {
    errorBox.classList.add('d-none');
    errorBox.textContent = '';
}

// export function showSuccess(inputId, message) {
//     const parent = document.getElementById(inputId).closest('.file-group');
//     const successBox = parent.querySelector('.text-success');
//     successBox.textContent = message;
//     successBox.classList.remove('d-none');
//     successBox.classList.remove('d-none');
//     if (!uploadStatus[inputId]) {
//         uploadStatus[inputId] = true;
//         updateStatus(); // Only count once
//     }
// }

export function hideSuccess(inputId) {
    const parent = document.getElementById(inputId).closest('.file-group');
    const successBox = parent.querySelector('.text-success');
    successBox.classList.add('d-none');
}

/**
 * Show a flash popup message
 * @param {string} message - The message to display
 * @param {string} type - Type of message: 'info', 'success', 'warning', 'error' (default: 'info')
 * @param {number} duration - Duration in milliseconds (default: 4000)
 */
export function showFlashMessage(message, type = 'info', duration = 4000) {
    // Remove any existing flash messages
    const existingFlash = document.querySelector('.flash-popup');
    if (existingFlash) {
        existingFlash.remove();
    }

    // Create flash popup element
    const flashPopup = document.createElement('div');
    flashPopup.className = `flash-popup flash-${type}`;
    flashPopup.innerHTML = `
        <div class="flash-content">
            <span class="flash-icon">${getFlashIcon(type)}</span>
            <span class="flash-message">${message}</span>
            <button class="flash-close" aria-label="Close">&times;</button>
        </div>
    `;

    // Add to body
    document.body.appendChild(flashPopup);

    // Trigger animation
    setTimeout(() => {
        flashPopup.classList.add('flash-show');
    }, 10);

    // Close button handler
    const closeBtn = flashPopup.querySelector('.flash-close');
    closeBtn.addEventListener('click', () => {
        hideFlashMessage(flashPopup);
    });

    // Auto-hide after duration
    setTimeout(() => {
        hideFlashMessage(flashPopup);
    }, duration);
}

function getFlashIcon(type) {
    const icons = {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️',
        error: '❌'
    };
    return icons[type] || icons.info;
}

function hideFlashMessage(flashPopup) {
    flashPopup.classList.remove('flash-show');
    setTimeout(() => {
        flashPopup.remove();
    }, 300);
}

/**
 * Show a professional confirmation dialog
 * @param {Object} options - Configuration options
 * @param {string} options.title - Dialog title (default: 'Confirm')
 * @param {string} options.message - Dialog message (required)
 * @param {string} options.confirmText - Confirm button text (default: 'Confirm')
 * @param {string} options.cancelText - Cancel button text (default: 'Cancel')
 * @param {string} options.type - Dialog type: 'info', 'warning', 'danger' (default: 'warning')
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
 */
export function showConfirmDialog(options = {}) {
    const {
        title = 'Confirm',
        message = 'Are you sure?',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        type = 'warning'
    } = options;

    return new Promise((resolve) => {
        // Remove any existing confirm dialogs
        const existingDialog = document.querySelector('.confirm-modal');
        if (existingDialog) {
            existingDialog.remove();
        }

        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'confirm-modal';
        modal.innerHTML = `
            <div class="confirm-modal-overlay"></div>
            <div class="confirm-modal-dialog confirm-${type}">
                <div class="confirm-modal-header">
                    <div class="confirm-modal-icon">
                        ${getConfirmIcon(type)}
                    </div>
                    <h3 class="confirm-modal-title">${title}</h3>
                </div>
                <div class="confirm-modal-body">
                    <p class="confirm-modal-message">${message}</p>
                </div>
                <div class="confirm-modal-footer">
                    <button class="confirm-modal-btn confirm-btn-cancel" type="button">
                        ${cancelText}
                    </button>
                    <button class="confirm-modal-btn confirm-btn-confirm confirm-btn-${type}" type="button">
                        ${confirmText}
                    </button>
                </div>
            </div>
        `;

        // Add to body
        document.body.appendChild(modal);

        // Trigger animation
        setTimeout(() => {
            modal.classList.add('confirm-show');
        }, 10);

        // Get buttons
        const confirmBtn = modal.querySelector('.confirm-btn-confirm');
        const cancelBtn = modal.querySelector('.confirm-btn-cancel');
        const overlay = modal.querySelector('.confirm-modal-overlay');

        // Handler to close modal
        const closeModal = (confirmed) => {
            modal.classList.remove('confirm-show');
            setTimeout(() => {
                modal.remove();
                resolve(confirmed);
            }, 300);
        };

        // Event listeners
        confirmBtn.addEventListener('click', () => closeModal(true));
        cancelBtn.addEventListener('click', () => closeModal(false));
        overlay.addEventListener('click', () => closeModal(false));

        // Keyboard support
        const keyHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal(false);
                document.removeEventListener('keydown', keyHandler);
            } else if (e.key === 'Enter') {
                closeModal(true);
                document.removeEventListener('keydown', keyHandler);
            }
        };
        document.addEventListener('keydown', keyHandler);

        // Focus confirm button for accessibility
        setTimeout(() => confirmBtn.focus(), 100);
    });
}

function getConfirmIcon(type) {
    const icons = {
        info: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
        warning: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
        danger: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
    };
    return icons[type] || icons.warning;
}
