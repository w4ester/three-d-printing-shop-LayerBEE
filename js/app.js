/**
 * LayerBEE - Main Application JavaScript
 * Handles: theme toggle, navigation, progress tracking, setup form
 */

// ============================================================
// THEME MANAGEMENT
// ============================================================

const ThemeManager = {
    init() {
        const savedTheme = localStorage.getItem('layerbee_theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = savedTheme || (prefersDark ? 'dark' : 'light');

        document.documentElement.setAttribute('data-theme', theme);

        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            toggle.addEventListener('click', () => this.toggle());
        }
    },

    toggle() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('layerbee_theme', next);
    }
};

// ============================================================
// MOBILE NAVIGATION
// ============================================================

const Navigation = {
    init() {
        const hamburger = document.querySelector('.hamburger');
        const navLinks = document.querySelector('.nav-links');

        if (hamburger && navLinks) {
            hamburger.addEventListener('click', () => {
                const isOpen = navLinks.classList.toggle('open');
                hamburger.setAttribute('aria-expanded', isOpen);
            });

            // Close menu when clicking a link
            navLinks.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    navLinks.classList.remove('open');
                    hamburger.setAttribute('aria-expanded', 'false');
                });
            });
        }
    }
};

// ============================================================
// PROGRESS TRACKING
// ============================================================

const ProgressTracker = {
    STORAGE_KEY: 'layerbee_progress',

    init() {
        this.loadProgress();
        this.updateDisplay();
    },

    getProgress() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        return saved ? JSON.parse(saved) : {
            completed: [],
            printsLogged: 0,
            problemsSolved: 0,
            printerType: '',
            slicer: ''
        };
    },

    saveProgress(progress) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(progress));
        this.updateDisplay();
    },

    loadProgress() {
        const progress = this.getProgress();

        // Mark completed modules
        progress.completed.forEach(moduleId => {
            const status = document.getElementById(`status-${moduleId}`);
            if (status) {
                status.textContent = '✓';
                status.setAttribute('aria-label', 'Completed');
            }
        });

        return progress;
    },

    updateDisplay() {
        const progress = this.getProgress();

        // Update stats
        const modulesCompleted = document.getElementById('modules-completed');
        const printsLogged = document.getElementById('prints-logged');
        const problemsSolved = document.getElementById('problems-solved');

        if (modulesCompleted) modulesCompleted.textContent = progress.completed.length;
        if (printsLogged) printsLogged.textContent = progress.printsLogged || 0;
        if (problemsSolved) problemsSolved.textContent = progress.problemsSolved || 0;

        // Update progress bar (5 modules total)
        const totalModules = 5;
        const percent = Math.round((progress.completed.length / totalModules) * 100);

        const progressFill = document.querySelector('.progress-fill');
        const progressText = document.getElementById('progress-text');
        const progressBar = document.getElementById('overall-progress');

        if (progressFill) progressFill.style.width = `${percent}%`;
        if (progressText) progressText.textContent = `${percent}% Complete`;
        if (progressBar) progressBar.setAttribute('aria-valuenow', percent);
    },

    markModuleComplete(moduleId) {
        const progress = this.getProgress();
        if (!progress.completed.includes(moduleId)) {
            progress.completed.push(moduleId);
            this.saveProgress(progress);

            const status = document.getElementById(`status-${moduleId}`);
            if (status) {
                status.textContent = '✓';
                status.setAttribute('aria-label', 'Completed');
            }
        }
    },

    logPrint() {
        const progress = this.getProgress();
        progress.printsLogged = (progress.printsLogged || 0) + 1;
        this.saveProgress(progress);
    },

    logProblemSolved() {
        const progress = this.getProgress();
        progress.problemsSolved = (progress.problemsSolved || 0) + 1;
        this.saveProgress(progress);
    }
};

// ============================================================
// SETUP FORM
// ============================================================

const SetupForm = {
    init() {
        const form = document.getElementById('setup-form');
        if (!form) return;

        // Load saved values
        const progress = ProgressTracker.getProgress();

        const printerSelect = document.getElementById('printer-type');
        const slicerSelect = document.getElementById('slicer');

        if (printerSelect && progress.printerType) {
            printerSelect.value = progress.printerType;
        }
        if (slicerSelect && progress.slicer) {
            slicerSelect.value = progress.slicer;
        }

        // Handle form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const formData = new FormData(form);
            const progress = ProgressTracker.getProgress();

            progress.printerType = formData.get('printerType') || '';
            progress.slicer = formData.get('slicer') || '';

            ProgressTracker.saveProgress(progress);

            // Show confirmation
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.textContent = '✓ Saved!';
            btn.disabled = true;

            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
            }, 2000);
        });
    }
};

// ============================================================
// QUICK HELP CARDS
// ============================================================

const QuickHelp = {
    init() {
        const cards = document.querySelectorAll('.help-card');

        cards.forEach(card => {
            card.addEventListener('click', () => {
                const question = card.getAttribute('data-question');
                if (question && window.TutorUI) {
                    // Open tutor panel and ask the question
                    window.TutorUI.open();
                    window.TutorUI.askQuestion(question);
                }
            });
        });
    }
};

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
    Navigation.init();
    ProgressTracker.init();
    SetupForm.init();
    QuickHelp.init();

    console.log('🐝 LayerBEE app initialized!');
});

// ============================================================
// ORDER ID GENERATION
// ============================================================

/**
 * Generate a 6-character alphanumeric order ID
 * Excludes confusing characters: 0/O, 1/I/L
 * Makes it easier to reference in payment memos
 */
function generateOrderId() {
    const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// ============================================================
// CART MANAGEMENT
// ============================================================

const CartManager = {
    STORAGE_KEY: 'layerbee_cart',
    ORDERS_KEY: 'layerbee_orders',

    getCart() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    },

    saveCart(cart) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cart));
        this.updateDisplay();
    },

    addItem(product, color, quantity = 1) {
        const cart = this.getCart();

        // Check if item with same product and color exists
        const existingIndex = cart.findIndex(
            item => item.productId === product.id && item.color === color.name
        );

        if (existingIndex >= 0) {
            cart[existingIndex].quantity += quantity;
        } else {
            cart.push({
                productId: product.id,
                name: product.name,
                basePrice: product.price,
                color: color.name,
                colorUpcharge: color.upcharge,
                quantity: quantity,
                addedAt: Date.now()
            });
        }

        this.saveCart(cart);
        return cart;
    },

    removeItem(index) {
        const cart = this.getCart();
        cart.splice(index, 1);
        this.saveCart(cart);
        return cart;
    },

    updateItemQuantity(index, quantity) {
        const cart = this.getCart();
        if (quantity <= 0) {
            return this.removeItem(index);
        }
        cart[index].quantity = quantity;
        this.saveCart(cart);
        return cart;
    },

    clearCart() {
        this.saveCart([]);
    },

    getItemTotal(item) {
        return (item.basePrice + item.colorUpcharge) * item.quantity;
    },

    getTotal() {
        const cart = this.getCart();
        return cart.reduce((sum, item) => sum + this.getItemTotal(item), 0);
    },

    getItemCount() {
        const cart = this.getCart();
        return cart.reduce((sum, item) => sum + item.quantity, 0);
    },

    updateDisplay() {
        // Update cart count badges
        const countBadges = document.querySelectorAll('.cart-count');
        const count = this.getItemCount();

        countBadges.forEach(badge => {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        });

        // Dispatch event for shop page to update
        window.dispatchEvent(new CustomEvent('cartUpdated', {
            detail: { cart: this.getCart(), count, total: this.getTotal() }
        }));
    },

    submitOrder(customerInfo) {
        const cart = this.getCart();
        if (cart.length === 0) return null;

        const order = {
            id: generateOrderId(),
            items: cart,
            total: this.getTotal(),
            customerName: customerInfo.name,
            customerContact: customerInfo.contact || '',
            customerNote: customerInfo.note || '',
            status: 'pending_payment',
            createdAt: Date.now()
        };

        const orders = this.getOrders();
        orders.push(order);
        localStorage.setItem(this.ORDERS_KEY, JSON.stringify(orders));

        this.clearCart();
        return order;
    },

    getOrders() {
        const saved = localStorage.getItem(this.ORDERS_KEY);
        return saved ? JSON.parse(saved) : [];
    },

    getPendingOrders() {
        return this.getOrders().filter(o => o.status === 'pending_payment' || o.status === 'pending_review');
    }
};

// Export for use in other modules
window.ProgressTracker = ProgressTracker;
window.CartManager = CartManager;
