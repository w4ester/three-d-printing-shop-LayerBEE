/**
 * LayerBEE Print Shop - UI Controller
 * Handles product rendering, cart panel, and order submission
 */

const ShopUI = {
    currentCategory: 'all',
    expandedProductId: null,
    selectedOptions: {}, // { productId: { color: colorObj, quantity: number } }
    showingOrderForm: false,

    // HTML escape function to prevent XSS
    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    init() {
        this.renderCategories();
        this.renderProducts();
        this.setupCartPanel();
        this.setupEventListeners();

        // Update cart display on load
        if (window.CartManager) {
            CartManager.updateDisplay();
        }

        console.log('🛒 LayerBEE Shop initialized!');
    },

    // ============================================================
    // CATEGORY FILTERING
    // ============================================================

    renderCategories() {
        const container = document.getElementById('category-filters');
        if (!container) return;

        // Clear existing content
        container.textContent = '';

        const categories = ShopData.getCategories();
        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'category-btn' + (cat.id === this.currentCategory ? ' active' : '');
            btn.dataset.category = cat.id;

            const iconSpan = document.createElement('span');
            iconSpan.className = 'category-icon';
            iconSpan.textContent = cat.icon;

            const textSpan = document.createElement('span');
            textSpan.textContent = cat.name;

            btn.appendChild(iconSpan);
            btn.appendChild(textSpan);

            btn.addEventListener('click', () => {
                this.setCategory(cat.id);
            });

            container.appendChild(btn);
        });
    },

    setCategory(categoryId) {
        this.currentCategory = categoryId;

        // Update active button
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === categoryId);
        });

        // Re-render products
        this.renderProducts();
    },

    // ============================================================
    // PRODUCT RENDERING
    // ============================================================

    renderProducts() {
        const container = document.getElementById('products-grid');
        if (!container) return;

        // Clear existing content
        container.textContent = '';

        const products = ShopData.getProductsByCategory(this.currentCategory);
        products.forEach(product => {
            container.appendChild(this.createProductCard(product));
        });
    },

    createProductCard(product) {
        const isExpanded = this.expandedProductId === product.id;
        const options = this.getProductOptions(product.id);
        const selectedColorKey = options.color.imageKey;

        const article = document.createElement('article');
        article.className = 'product-card' + (isExpanded ? ' expanded' : '');
        article.dataset.productId = product.id;

        // Main section (clickable)
        const main = document.createElement('div');
        main.className = 'product-main';
        main.addEventListener('click', () => {
            this.toggleProductExpansion(product.id);
        });

        // Header with icon/image and badges
        const header = document.createElement('div');
        header.className = 'product-header';

        // Check if product has real image for selected color
        const imagePath = ShopData.getProductImagePath(product, selectedColorKey);

        if (imagePath) {
            // Use real product image (WebP with PNG fallback)
            const img = document.createElement('img');
            img.className = 'product-image';
            img.src = imagePath;
            img.alt = product.name + ' in ' + options.color.name;
            img.loading = 'lazy';
            // Fallback to PNG if WebP fails (very old browsers)
            img.onerror = function() {
                const fallback = ShopData.getProductImageFallback(product, selectedColorKey);
                if (fallback && this.src !== fallback) {
                    this.src = fallback;
                }
            };
            header.appendChild(img);
        } else {
            // Fall back to emoji
            const icon = document.createElement('span');
            icon.className = 'product-icon';
            icon.textContent = product.emoji;
            header.appendChild(icon);
        }

        if (product.popular) {
            const badges = document.createElement('div');
            badges.className = 'product-badges';
            const badge = document.createElement('span');
            badge.className = 'product-badge popular';
            badge.textContent = 'Popular';
            badges.appendChild(badge);
            header.appendChild(badges);
        }

        main.appendChild(header);

        // Name
        const name = document.createElement('h3');
        name.className = 'product-name';
        name.textContent = product.name;
        main.appendChild(name);

        // Description
        const desc = document.createElement('p');
        desc.className = 'product-description';
        desc.textContent = product.description;
        main.appendChild(desc);

        // Meta info
        const meta = document.createElement('div');
        meta.className = 'product-meta';

        const timeMeta = document.createElement('span');
        timeMeta.className = 'meta-item';
        timeMeta.innerHTML = '<span>⏱️</span>';
        const timeText = document.createElement('span');
        timeText.textContent = product.printTime;
        timeMeta.appendChild(timeText);
        meta.appendChild(timeMeta);

        const diffMeta = document.createElement('span');
        diffMeta.className = 'meta-item';
        diffMeta.innerHTML = '<span>📊</span>';
        const diffText = document.createElement('span');
        diffText.textContent = product.difficulty;
        diffMeta.appendChild(diffText);
        meta.appendChild(diffMeta);

        main.appendChild(meta);

        // Footer with price
        const footer = document.createElement('div');
        footer.className = 'product-footer';

        const price = document.createElement('span');
        price.className = 'product-price';
        price.textContent = ShopData.formatPrice(product.price);
        footer.appendChild(price);

        const hint = document.createElement('span');
        hint.className = 'add-to-cart-hint';
        const hintArrow = document.createElement('span');
        hintArrow.textContent = isExpanded ? '▼' : '▶';
        const hintText = document.createElement('span');
        hintText.textContent = isExpanded ? 'Choose options' : 'Click to customize';
        hint.appendChild(hintArrow);
        hint.appendChild(hintText);
        footer.appendChild(hint);

        main.appendChild(footer);
        article.appendChild(main);

        // Options section (expanded)
        article.appendChild(this.createProductOptions(product, options, isExpanded));

        return article;
    },

    createProductOptions(product, options, isExpanded) {
        const colors = ShopData.getColors();
        const itemPrice = ShopData.calculateItemPrice(product, options.color);
        const total = itemPrice * options.quantity;

        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'product-options';
        if (!isExpanded) {
            optionsDiv.style.display = 'none';
        }

        // Color section
        const colorSection = document.createElement('div');
        colorSection.className = 'option-section';

        const colorLabel = document.createElement('span');
        colorLabel.className = 'option-label';
        colorLabel.textContent = 'Choose Color:';
        colorSection.appendChild(colorLabel);

        const colorOptions = document.createElement('div');
        colorOptions.className = 'color-options';

        colors.forEach(color => {
            const btn = document.createElement('button');
            btn.className = 'color-option';
            if (options.color.name === color.name) btn.classList.add('selected');
            if (color.featured) btn.classList.add('featured');
            btn.dataset.productId = product.id;
            btn.dataset.colorName = color.name;

            const swatch = document.createElement('span');
            swatch.className = 'color-swatch';
            if (color.premium) {
                swatch.classList.add('premium');
            } else {
                swatch.style.backgroundColor = color.hex;
            }
            btn.appendChild(swatch);

            const colorName = document.createElement('span');
            colorName.className = 'color-name';
            colorName.textContent = color.name;
            btn.appendChild(colorName);

            const colorPrice = document.createElement('span');
            colorPrice.className = 'color-price';
            if (color.upcharge === 0) colorPrice.classList.add('free');
            colorPrice.textContent = ShopData.getColorUpchargeText(color);
            btn.appendChild(colorPrice);

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectedOptions[product.id].color = color;
                this.renderProducts();
            });

            colorOptions.appendChild(btn);
        });

        colorSection.appendChild(colorOptions);
        optionsDiv.appendChild(colorSection);

        // Quantity section
        const qtySection = document.createElement('div');
        qtySection.className = 'option-section';

        const qtyLabel = document.createElement('span');
        qtyLabel.className = 'option-label';
        qtyLabel.textContent = 'Quantity:';
        qtySection.appendChild(qtyLabel);

        const qtySelector = document.createElement('div');
        qtySelector.className = 'quantity-selector';

        const decreaseBtn = document.createElement('button');
        decreaseBtn.className = 'qty-btn';
        decreaseBtn.textContent = '−';
        decreaseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            options.quantity = Math.max(options.quantity - 1, 1);
            this.renderProducts();
        });
        qtySelector.appendChild(decreaseBtn);

        const qtyValue = document.createElement('span');
        qtyValue.className = 'qty-value';
        qtyValue.textContent = options.quantity;
        qtySelector.appendChild(qtyValue);

        const increaseBtn = document.createElement('button');
        increaseBtn.className = 'qty-btn';
        increaseBtn.textContent = '+';
        increaseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            options.quantity = Math.min(options.quantity + 1, 10);
            this.renderProducts();
        });
        qtySelector.appendChild(increaseBtn);

        qtySection.appendChild(qtySelector);
        optionsDiv.appendChild(qtySection);

        // Add to cart section
        const addSection = document.createElement('div');
        addSection.className = 'add-to-cart-section';

        const totalDiv = document.createElement('div');
        totalDiv.className = 'item-total';
        totalDiv.textContent = 'Total: ';
        const totalPrice = document.createElement('span');
        totalPrice.className = 'item-total-price';
        totalPrice.textContent = ShopData.formatPrice(total);
        totalDiv.appendChild(totalPrice);
        addSection.appendChild(totalDiv);

        const addBtn = document.createElement('button');
        addBtn.className = 'add-to-cart-btn';
        addBtn.dataset.productId = product.id;

        const cartIcon = document.createElement('span');
        cartIcon.textContent = '🛒';
        addBtn.appendChild(cartIcon);

        const addText = document.createElement('span');
        addText.textContent = 'Add to Cart';
        addBtn.appendChild(addText);

        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.addToCart(product.id);
        });

        addSection.appendChild(addBtn);
        optionsDiv.appendChild(addSection);

        return optionsDiv;
    },

    getProductOptions(productId) {
        if (!this.selectedOptions[productId]) {
            this.selectedOptions[productId] = {
                color: ShopData.getColors()[0], // Default to first color (Gray)
                quantity: 1
            };
        }
        return this.selectedOptions[productId];
    },

    toggleProductExpansion(productId) {
        if (this.expandedProductId === productId) {
            this.expandedProductId = null;
        } else {
            this.expandedProductId = productId;
        }
        this.renderProducts();
    },

    addToCart(productId) {
        const product = ShopData.getProductById(productId);
        const options = this.getProductOptions(productId);

        CartManager.addItem(product, options.color, options.quantity);

        // Visual feedback
        const btn = document.querySelector(`.add-to-cart-btn[data-product-id="${productId}"]`);
        if (btn) {
            btn.textContent = '';
            const checkSpan = document.createElement('span');
            checkSpan.textContent = '✓';
            btn.appendChild(checkSpan);
            const addedSpan = document.createElement('span');
            addedSpan.textContent = 'Added!';
            btn.appendChild(addedSpan);
            btn.disabled = true;

            setTimeout(() => {
                btn.textContent = '';
                const cartIcon = document.createElement('span');
                cartIcon.textContent = '🛒';
                btn.appendChild(cartIcon);
                const cartText = document.createElement('span');
                cartText.textContent = 'Add to Cart';
                btn.appendChild(cartText);
                btn.disabled = false;
            }, 1500);
        }

        // Reset quantity for this product
        this.selectedOptions[productId].quantity = 1;
    },

    // ============================================================
    // CART PANEL
    // ============================================================

    setupCartPanel() {
        const cartFab = document.getElementById('cart-fab');
        const closeBtn = document.getElementById('close-cart');
        const overlay = document.getElementById('cart-overlay');

        if (cartFab) {
            cartFab.addEventListener('click', () => this.openCart());
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeCart());
        }

        if (overlay) {
            overlay.addEventListener('click', () => this.closeCart());
        }

        // Listen for cart updates
        window.addEventListener('cartUpdated', () => {
            this.renderCartItems();
        });

        // Initial render
        this.renderCartItems();
    },

    openCart() {
        const panel = document.getElementById('cart-panel');
        const overlay = document.getElementById('cart-overlay');

        if (panel) panel.setAttribute('aria-hidden', 'false');
        if (overlay) overlay.classList.add('visible');

        document.body.style.overflow = 'hidden';
    },

    closeCart() {
        const panel = document.getElementById('cart-panel');
        const overlay = document.getElementById('cart-overlay');

        if (panel) panel.setAttribute('aria-hidden', 'true');
        if (overlay) overlay.classList.remove('visible');

        document.body.style.overflow = '';

        // Reset to cart view if showing order form
        this.showingOrderForm = false;
        this.renderCartItems();
    },

    renderCartItems() {
        const container = document.getElementById('cart-items');
        const footer = document.getElementById('cart-footer');
        if (!container) return;

        const cart = CartManager.getCart();

        // Clear container
        container.textContent = '';

        if (cart.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'cart-empty';

            const emptyIcon = document.createElement('div');
            emptyIcon.className = 'cart-empty-icon';
            emptyIcon.textContent = '🛒';
            emptyDiv.appendChild(emptyIcon);

            const emptyText = document.createElement('p');
            emptyText.textContent = 'Your cart is empty';
            emptyDiv.appendChild(emptyText);

            const subText = document.createElement('p');
            subText.style.fontSize = '0.85rem';
            subText.textContent = 'Browse products and add items to get started!';
            emptyDiv.appendChild(subText);

            container.appendChild(emptyDiv);
            if (footer) footer.style.display = 'none';
            return;
        }

        if (footer) footer.style.display = 'block';

        cart.forEach((item, index) => {
            container.appendChild(this.createCartItemElement(item, index));
        });

        // Update total
        const totalEl = document.getElementById('cart-total');
        if (totalEl) {
            totalEl.textContent = ShopData.formatPrice(CartManager.getTotal());
        }

        // Setup checkout button
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            // Remove old listeners by cloning
            const newBtn = checkoutBtn.cloneNode(true);
            checkoutBtn.parentNode.replaceChild(newBtn, checkoutBtn);
            newBtn.addEventListener('click', () => {
                this.showOrderForm();
            });
        }
    },

    createCartItemElement(item, index) {
        const product = ShopData.getProductById(item.productId);
        const color = ShopData.getColors().find(c => c.name === item.color);
        const itemTotal = CartManager.getItemTotal(item);
        const colorKey = color ? color.imageKey : 'gray';

        const div = document.createElement('div');
        div.className = 'cart-item';
        div.dataset.index = index;

        // Icon or Image
        const imagePath = product ? ShopData.getProductImagePath(product, colorKey) : null;

        if (imagePath) {
            const img = document.createElement('img');
            img.className = 'cart-item-image';
            img.src = imagePath;
            img.alt = item.name + ' in ' + item.color;
            // Fallback to PNG if WebP fails
            img.onerror = function() {
                const fallback = product ? ShopData.getProductImageFallback(product, colorKey) : null;
                if (fallback && this.src !== fallback) {
                    this.src = fallback;
                }
            };
            div.appendChild(img);
        } else {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'cart-item-icon';
            iconSpan.textContent = product ? product.emoji : '📦';
            div.appendChild(iconSpan);
        }

        // Details
        const details = document.createElement('div');
        details.className = 'cart-item-details';

        const nameDiv = document.createElement('div');
        nameDiv.className = 'cart-item-name';
        nameDiv.textContent = item.name;
        details.appendChild(nameDiv);

        const colorDiv = document.createElement('div');
        colorDiv.className = 'cart-item-color';

        const colorDot = document.createElement('span');
        colorDot.className = 'cart-item-color-dot';
        if (color && !color.premium) {
            colorDot.style.backgroundColor = color.hex;
        } else if (color && color.premium) {
            colorDot.style.background = 'linear-gradient(135deg, #EF4444, #F59E0B, #22C55E, #3B82F6, #8B5CF6)';
        }
        colorDiv.appendChild(colorDot);

        const colorText = document.createElement('span');
        colorText.textContent = item.color;
        colorDiv.appendChild(colorText);

        details.appendChild(colorDiv);

        // Quantity controls
        const qtyDiv = document.createElement('div');
        qtyDiv.className = 'cart-item-quantity';

        const decreaseBtn = document.createElement('button');
        decreaseBtn.className = 'qty-btn cart-qty-btn';
        decreaseBtn.textContent = '−';
        decreaseBtn.addEventListener('click', () => {
            CartManager.updateItemQuantity(index, item.quantity - 1);
        });
        qtyDiv.appendChild(decreaseBtn);

        const qtyValue = document.createElement('span');
        qtyValue.className = 'qty-value';
        qtyValue.textContent = item.quantity;
        qtyDiv.appendChild(qtyValue);

        const increaseBtn = document.createElement('button');
        increaseBtn.className = 'qty-btn cart-qty-btn';
        increaseBtn.textContent = '+';
        increaseBtn.addEventListener('click', () => {
            CartManager.updateItemQuantity(index, Math.min(item.quantity + 1, 10));
        });
        qtyDiv.appendChild(increaseBtn);

        details.appendChild(qtyDiv);
        div.appendChild(details);

        // Price and remove
        const rightDiv = document.createElement('div');

        const priceDiv = document.createElement('div');
        priceDiv.className = 'cart-item-price';
        priceDiv.textContent = ShopData.formatPrice(itemTotal);
        rightDiv.appendChild(priceDiv);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'cart-item-remove';
        removeBtn.setAttribute('aria-label', 'Remove item');
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', () => {
            CartManager.removeItem(index);
        });
        rightDiv.appendChild(removeBtn);

        div.appendChild(rightDiv);

        return div;
    },

    // ============================================================
    // ORDER FORM
    // ============================================================

    showOrderForm() {
        const container = document.getElementById('cart-items');
        const footer = document.getElementById('cart-footer');

        if (footer) footer.style.display = 'none';

        // Clear container
        container.textContent = '';

        const formDiv = document.createElement('div');
        formDiv.className = 'order-form';

        const heading = document.createElement('h3');
        heading.textContent = 'Submit Order for Review';
        formDiv.appendChild(heading);

        const description = document.createElement('p');
        description.style.color = 'var(--color-text-muted)';
        description.style.fontSize = '0.9rem';
        description.style.marginBottom = 'var(--space-lg)';
        description.textContent = 'Your order will be saved for a parent/guardian to review before printing.';
        formDiv.appendChild(description);

        const form = document.createElement('form');
        form.id = 'order-submit-form';

        // Name field
        const nameField = document.createElement('div');
        nameField.className = 'form-field';
        const nameLabel = document.createElement('label');
        nameLabel.htmlFor = 'customer-name';
        nameLabel.textContent = 'Your Name *';
        nameField.appendChild(nameLabel);
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'customer-name';
        nameInput.name = 'name';
        nameInput.required = true;
        nameInput.placeholder = 'Enter your name';
        nameField.appendChild(nameInput);
        form.appendChild(nameField);

        // Contact field (classroom/period for in-school delivery)
        const contactField = document.createElement('div');
        contactField.className = 'form-field';
        const contactLabel = document.createElement('label');
        contactLabel.htmlFor = 'customer-contact';
        contactLabel.textContent = 'Classroom/Period *';
        contactField.appendChild(contactLabel);
        const contactInput = document.createElement('input');
        contactInput.type = 'text';
        contactInput.id = 'customer-contact';
        contactInput.name = 'contact';
        contactInput.required = true;
        contactInput.placeholder = 'e.g., Room 204, Period 3';
        contactField.appendChild(contactInput);
        form.appendChild(contactField);

        // Note field
        const noteField = document.createElement('div');
        noteField.className = 'form-field';
        const noteLabel = document.createElement('label');
        noteLabel.htmlFor = 'customer-note';
        noteLabel.textContent = 'Special Requests (optional)';
        noteField.appendChild(noteLabel);
        const noteInput = document.createElement('textarea');
        noteInput.id = 'customer-note';
        noteInput.name = 'note';
        noteInput.placeholder = 'Any special requests or notes...';
        noteField.appendChild(noteInput);
        form.appendChild(noteField);

        // Total display
        const totalDiv = document.createElement('div');
        totalDiv.className = 'cart-total';
        totalDiv.style.marginBottom = 'var(--space-md)';
        const totalLabel = document.createElement('span');
        totalLabel.textContent = 'Order Total:';
        totalDiv.appendChild(totalLabel);
        const totalPrice = document.createElement('span');
        totalPrice.className = 'cart-total-price';
        totalPrice.textContent = ShopData.formatPrice(CartManager.getTotal());
        totalDiv.appendChild(totalPrice);
        form.appendChild(totalDiv);

        // Buttons
        const actions = document.createElement('div');
        actions.className = 'form-actions';

        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'btn btn-secondary';
        backBtn.textContent = '← Back';
        backBtn.addEventListener('click', () => {
            this.renderCartItems();
            if (footer) footer.style.display = 'block';
        });
        actions.appendChild(backBtn);

        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.className = 'btn btn-primary';
        submitBtn.textContent = 'Submit Order';
        actions.appendChild(submitBtn);

        form.appendChild(actions);

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitOrder();
        });

        formDiv.appendChild(form);
        container.appendChild(formDiv);

        this.showingOrderForm = true;
    },

    submitOrder() {
        const nameInput = document.getElementById('customer-name');
        const contactInput = document.getElementById('customer-contact');
        const noteInput = document.getElementById('customer-note');

        const name = nameInput.value.trim();
        const contact = contactInput.value.trim();
        const note = noteInput.value.trim();

        if (!name) {
            alert('Please enter your name');
            nameInput.focus();
            return;
        }

        if (!contact) {
            alert('Please enter your classroom/period for delivery');
            contactInput.focus();
            return;
        }

        const order = CartManager.submitOrder({ name, contact, note });

        if (order) {
            this.showOrderSuccess(order);
        }
    },

    showOrderSuccess(order) {
        const container = document.getElementById('cart-items');
        const footer = document.getElementById('cart-footer');

        if (footer) footer.style.display = 'none';

        // Clear container
        container.textContent = '';

        const successDiv = document.createElement('div');
        successDiv.className = 'order-success';

        const icon = document.createElement('div');
        icon.className = 'success-icon';
        icon.textContent = '🎉';
        successDiv.appendChild(icon);

        const heading = document.createElement('h3');
        heading.textContent = 'Order Submitted!';
        successDiv.appendChild(heading);

        const orderId = document.createElement('p');
        orderId.className = 'order-id';
        orderId.textContent = 'Order ID: ' + order.id;
        successDiv.appendChild(orderId);

        // Order total display
        const totalDiv = document.createElement('p');
        totalDiv.className = 'order-total-display';
        totalDiv.appendChild(document.createTextNode('Total: '));
        const totalStrong = document.createElement('strong');
        totalStrong.textContent = ShopData.formatPrice(order.total);
        totalDiv.appendChild(totalStrong);
        successDiv.appendChild(totalDiv);

        // Payment instructions section
        const paymentSection = document.createElement('div');
        paymentSection.className = 'payment-instructions';

        const paymentHeading = document.createElement('h4');
        paymentHeading.textContent = 'Complete Your Payment';
        paymentSection.appendChild(paymentHeading);

        // Venmo option
        const venmoOption = document.createElement('div');
        venmoOption.className = 'payment-option';
        const venmoLabel = document.createElement('span');
        venmoLabel.className = 'payment-label';
        venmoLabel.textContent = 'Venmo:';
        const venmoHandle = document.createElement('span');
        venmoHandle.className = 'payment-handle';
        venmoHandle.textContent = PAYMENT_CONFIG.venmo;
        venmoOption.appendChild(venmoLabel);
        venmoOption.appendChild(document.createTextNode(' '));
        venmoOption.appendChild(venmoHandle);
        paymentSection.appendChild(venmoOption);

        // Zelle option
        const zelleOption = document.createElement('div');
        zelleOption.className = 'payment-option';
        const zelleLabel = document.createElement('span');
        zelleLabel.className = 'payment-label';
        zelleLabel.textContent = 'Zelle:';
        const zelleHandle = document.createElement('span');
        zelleHandle.className = 'payment-handle';
        zelleHandle.textContent = PAYMENT_CONFIG.zelle;
        zelleOption.appendChild(zelleLabel);
        zelleOption.appendChild(document.createTextNode(' '));
        zelleOption.appendChild(zelleHandle);
        paymentSection.appendChild(zelleOption);

        // Payment memo reminder
        const memoReminder = document.createElement('div');
        memoReminder.className = 'payment-memo';
        memoReminder.appendChild(document.createTextNode('Include '));
        const memoOrderId = document.createElement('strong');
        memoOrderId.textContent = order.id;
        memoReminder.appendChild(memoOrderId);
        memoReminder.appendChild(document.createTextNode(' in your payment memo'));
        paymentSection.appendChild(memoReminder);

        successDiv.appendChild(paymentSection);

        // Delivery info
        const deliveryInfo = document.createElement('p');
        deliveryInfo.className = 'delivery-info';
        deliveryInfo.textContent = 'Your order will be delivered to you once payment is confirmed.';
        successDiv.appendChild(deliveryInfo);

        const continueBtn = document.createElement('button');
        continueBtn.className = 'btn btn-primary';
        continueBtn.textContent = 'Continue Shopping';
        continueBtn.addEventListener('click', () => {
            this.closeCart();
        });
        successDiv.appendChild(continueBtn);

        container.appendChild(successDiv);

        this.showingOrderForm = false;
    },

    // ============================================================
    // EVENT LISTENERS
    // ============================================================

    setupEventListeners() {
        // Keyboard navigation for cart panel
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const panel = document.getElementById('cart-panel');
                if (panel && panel.getAttribute('aria-hidden') === 'false') {
                    this.closeCart();
                }
            }
        });
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only init on shop page
    if (document.getElementById('products-grid')) {
        ShopUI.init();
    }
});

// Export for use in other modules
window.ShopUI = ShopUI;
