/**
 * LayerBEE - Tutor UI Controller
 * Handles: chat panel, WebLLM initialization, message sending/receiving
 *
 * Security note: innerHTML is used only with content from our own PocketFlow nodes
 * (tutor-flow.js), which sanitizes LLM output through controlled markdown-to-HTML
 * conversion. User input is always escaped via escapeHTML() before display.
 */

// Helper to get correct image path based on page location
function getImagePath(imageName) {
    const isInModules = window.location.pathname.includes('/modules/');
    return isInModules ? `../images/${imageName}` : `images/${imageName}`;
}

// Create avatar image element for bot messages
function createAvatarImage() {
    const img = document.createElement('img');
    img.src = getImagePath('LayerBEE-chatbot-logo.png');
    img.alt = '';
    img.className = 'message-avatar-img';
    return img;
}

// ============================================================
// WEBLLM ENGINE MANAGER
// ============================================================

const TutorLLM = {
    engine: null,
    isLoading: false,
    isReady: false,

    async init() {
        if (this.engine || this.isLoading) return;

        this.isLoading = true;
        this.updateStatus('loading', 'Downloading AI model...');

        try {
            // Import WebLLM from CDN
            const { CreateMLCEngine } = await import('https://esm.run/@mlc-ai/web-llm');

            // Create engine with progress callback
            this.engine = await CreateMLCEngine('Llama-3.2-1B-Instruct-q4f16_1-MLC', {
                initProgressCallback: (progress) => {
                    this.handleProgress(progress);
                }
            });

            // Make engine available globally for tutor-flow.js
            window.LayerBeeEngine = this.engine;

            this.isReady = true;
            this.isLoading = false;
            this.updateStatus('ready', 'Ready to help!');
            this.hideLoading();
            this.enableInput();

            console.log('🐝 LayerBEE AI engine ready!');

        } catch (error) {
            console.error('Failed to load WebLLM:', error);
            this.isLoading = false;
            this.updateStatus('error', 'Failed to load AI');
            this.showError(error.message);
        }
    },

    handleProgress(progress) {
        const loadingText = document.getElementById('loading-text');
        const loadingBar = document.getElementById('loading-bar');

        if (loadingText) {
            loadingText.textContent = progress.text || 'Loading...';
        }

        if (loadingBar && progress.progress !== undefined) {
            const percent = Math.round(progress.progress * 100);
            loadingBar.style.width = `${percent}%`;
        }
    },

    updateStatus(state, text) {
        const statusEl = document.getElementById('tutor-status');
        if (statusEl) {
            statusEl.className = `tutor-status ${state}`;
            statusEl.querySelector('.status-text').textContent = text;
        }
    },

    hideLoading() {
        const loading = document.getElementById('model-loading');
        if (loading) {
            loading.classList.remove('visible');
        }
    },

    showLoading() {
        const loading = document.getElementById('model-loading');
        if (loading) {
            loading.classList.add('visible');
        }
    },

    enableInput() {
        const input = document.getElementById('tutor-input');
        const submit = document.getElementById('tutor-submit');

        if (input) input.disabled = false;
        if (submit) submit.disabled = false;
    },

    showError(errorMessage) {
        const loading = document.getElementById('model-loading');
        if (loading) {
            // Clear existing content safely
            while (loading.firstChild) {
                loading.removeChild(loading.firstChild);
            }

            // Create error message elements using DOM methods
            const errorTitle = document.createElement('p');
            errorTitle.style.color = 'var(--color-error)';
            errorTitle.textContent = 'Failed to load AI engine';

            const errorDetail = document.createElement('p');
            errorDetail.style.fontSize = '0.8rem';
            errorDetail.textContent = errorMessage;

            const retryBtn = document.createElement('button');
            retryBtn.className = 'btn btn-secondary';
            retryBtn.style.marginTop = '1rem';
            retryBtn.textContent = 'Try Again';
            retryBtn.addEventListener('click', () => TutorLLM.init());

            loading.appendChild(errorTitle);
            loading.appendChild(errorDetail);
            loading.appendChild(retryBtn);
        }
    }
};

// ============================================================
// TUTOR UI CONTROLLER
// ============================================================

const TutorUI = {
    panel: null,
    messages: null,
    form: null,
    input: null,
    isOpen: false,
    currentMode: 'learn',

    init() {
        this.panel = document.getElementById('tutor-panel');
        this.messages = document.getElementById('tutor-messages');
        this.form = document.getElementById('tutor-form');
        this.input = document.getElementById('tutor-input');

        if (!this.panel) return;

        this.setupEventListeners();
        console.log('🐝 LayerBEE UI initialized!');
    },

    setupEventListeners() {
        // Open buttons
        const openBtn = document.getElementById('open-tutor');
        const fabBtn = document.getElementById('tutor-fab');
        const closeBtn = document.getElementById('close-tutor');

        if (openBtn) openBtn.addEventListener('click', () => this.open());
        if (fabBtn) fabBtn.addEventListener('click', () => this.open());
        if (closeBtn) closeBtn.addEventListener('click', () => this.close());

        // Form submission
        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
        }

        // Mode buttons
        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.getAttribute('data-mode');
                this.setMode(mode);

                // Update active state
                modeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    },

    open() {
        this.panel.setAttribute('aria-hidden', 'false');
        this.isOpen = true;

        // Initialize WebLLM if not already done
        if (!TutorLLM.engine && !TutorLLM.isLoading) {
            TutorLLM.showLoading();
            TutorLLM.init();
        }

        // Focus input
        if (this.input && !this.input.disabled) {
            setTimeout(() => this.input.focus(), 300);
        }
    },

    close() {
        this.panel.setAttribute('aria-hidden', 'true');
        this.isOpen = false;
    },

    setMode(mode) {
        this.currentMode = mode;
        if (window.setTutorMode) {
            window.setTutorMode(mode);
        }

        // Add mode change message
        const modeNames = {
            learn: '📚 Learning mode - I\'ll explain concepts clearly!',
            troubleshoot: '🔧 Troubleshooting mode - Let\'s fix your print problems!',
            quiz: '❓ Quiz mode - Ready to test your knowledge!',
            business: '💼 Business mode - Let\'s talk about your print shop!'
        };

        this.addBotMessage(modeNames[mode] || 'Mode changed!');
    },

    async handleSubmit() {
        const question = this.input.value.trim();
        if (!question) return;

        // Clear input
        this.input.value = '';

        // Add user message (escaped)
        this.addUserMessage(question);

        // Show typing indicator
        this.showTyping();

        try {
            // Call the PocketFlow tutor
            if (window.askLayerBee) {
                const response = await window.askLayerBee(question);
                this.hideTyping();
                // Response HTML comes from our controlled PocketFlow nodes
                this.addBotMessageHTML(response.html);

                // Track problem solved if in troubleshoot mode
                if (this.currentMode === 'troubleshoot' && window.ProgressTracker) {
                    window.ProgressTracker.logProblemSolved();
                }
            } else {
                throw new Error('Tutor flow not loaded');
            }
        } catch (error) {
            console.error('Error getting response:', error);
            this.hideTyping();
            this.addBotMessage('🐝 Oops! Something went wrong: ' + error.message + ' Try asking again!');
        }
    },

    // Public method to ask a question programmatically
    askQuestion(question) {
        if (this.input) {
            this.input.value = question;
            this.handleSubmit();
        }
    },

    // Add user message (always escaped)
    addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message';

        const avatar = document.createElement('span');
        avatar.className = 'message-avatar';
        avatar.textContent = '👤';

        const content = document.createElement('div');
        content.className = 'message-content';

        const p = document.createElement('p');
        p.textContent = text; // Safe: textContent escapes HTML

        content.appendChild(p);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);

        this.messages.appendChild(messageDiv);
        this.scrollToBottom();
    },

    // Add bot message (plain text, escaped)
    addBotMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';

        const avatar = createAvatarImage();

        const content = document.createElement('div');
        content.className = 'message-content';

        const p = document.createElement('p');
        p.textContent = text; // Safe: textContent escapes HTML

        content.appendChild(p);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);

        this.messages.appendChild(messageDiv);
        this.scrollToBottom();
    },

    // Add bot message with HTML (from our controlled PocketFlow nodes only)
    addBotMessageHTML(htmlContent) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';

        const avatar = createAvatarImage();

        const content = document.createElement('div');
        content.className = 'message-content';
        // HTML content comes from our own FormatResponseNode/ErrorHandlerNode
        // which processes LLM output through controlled markdown-to-HTML conversion
        content.innerHTML = htmlContent;

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);

        this.messages.appendChild(messageDiv);
        this.scrollToBottom();
    },

    showTyping() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message typing-message';

        const avatar = createAvatarImage();

        const content = document.createElement('div');
        content.className = 'message-content';

        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';

        for (let i = 0; i < 3; i++) {
            indicator.appendChild(document.createElement('span'));
        }

        content.appendChild(indicator);
        typingDiv.appendChild(avatar);
        typingDiv.appendChild(content);

        this.messages.appendChild(typingDiv);
        this.scrollToBottom();
    },

    hideTyping() {
        const typing = this.messages.querySelector('.typing-message');
        if (typing) typing.remove();
    },

    scrollToBottom() {
        this.messages.scrollTop = this.messages.scrollHeight;
    }
};

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    TutorUI.init();
});

// Export for use in other modules
window.TutorUI = TutorUI;
window.TutorLLM = TutorLLM;
