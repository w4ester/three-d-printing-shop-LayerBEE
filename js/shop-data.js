/**
 * LayerBEE Print Shop - Product Catalog Data
 * Defines products, categories, and color options
 */

// ============================================================
// CATEGORIES
// ============================================================

const SHOP_CATEGORIES = [
    { id: 'all', name: 'All Products', icon: '🛒' },
    { id: 'tech', name: 'Tech', icon: '💻' },
    { id: 'school', name: 'School', icon: '📚' },
    { id: 'accessories', name: 'Accessories', icon: '🔑' },
    { id: 'home', name: 'Home', icon: '🏠' },
    { id: 'toys', name: 'Toys', icon: '🎮' }
];

// ============================================================
// COLOR OPTIONS WITH UPCHARGES
// ============================================================

const SHOP_COLORS = [
    // Free colors
    { name: 'Gray', hex: '#6B7280', upcharge: 0 },
    { name: 'White', hex: '#F3F4F6', upcharge: 0 },
    { name: 'Black', hex: '#1F2937', upcharge: 0 },

    // +$0.50 colors
    { name: 'Red', hex: '#EF4444', upcharge: 0.50 },
    { name: 'Blue', hex: '#3B82F6', upcharge: 0.50 },
    { name: 'Green', hex: '#22C55E', upcharge: 0.50 },

    // +$1.00 colors
    { name: 'Yellow', hex: '#F5C518', upcharge: 1.00, featured: true }, // LayerBEE Yellow!
    { name: 'Purple', hex: '#8B5CF6', upcharge: 1.00 },

    // +$1.50 premium
    { name: 'Rainbow Silk', hex: 'linear-gradient(135deg, #EF4444, #F59E0B, #22C55E, #3B82F6, #8B5CF6)', upcharge: 1.50, premium: true }
];

// ============================================================
// PRODUCTS
// ============================================================

const SHOP_PRODUCTS = [
    {
        id: 'phone-stand',
        name: 'Phone Stand',
        description: 'Keep your phone propped up for videos and calls. Adjustable angle design.',
        price: 5.00,
        category: 'tech',
        printTime: '45 min',
        difficulty: 'Easy',
        image: '📱',
        popular: true
    },
    {
        id: 'pencil-holder',
        name: 'Pencil Holder',
        description: 'Hexagonal design holds pencils, pens, and markers. Perfect for your desk!',
        price: 4.00,
        category: 'school',
        printTime: '1 hr',
        difficulty: 'Easy',
        image: '✏️'
    },
    {
        id: 'cable-organizer',
        name: 'Cable Organizer',
        description: 'Stop cable chaos! Clips to your desk edge to manage charging cables.',
        price: 3.00,
        category: 'tech',
        printTime: '30 min',
        difficulty: 'Easy',
        image: '🔌'
    },
    {
        id: 'custom-keychain',
        name: 'Custom Keychain',
        description: 'Show your style with a custom keychain. Great for backpacks and keys!',
        price: 2.50,
        category: 'accessories',
        printTime: '15 min',
        difficulty: 'Easy',
        image: '🔑',
        popular: true
    },
    {
        id: 'bookmark-set',
        name: 'Bookmark Set',
        description: 'Set of 3 corner bookmarks. Never lose your page again!',
        price: 1.50,
        category: 'school',
        printTime: '20 min',
        difficulty: 'Easy',
        image: '📖'
    },
    {
        id: 'mini-planter',
        name: 'Mini Planter',
        description: 'Cute geometric planter for succulents or small plants. Includes drainage hole.',
        price: 6.00,
        category: 'home',
        printTime: '1.5 hr',
        difficulty: 'Medium',
        image: '🌱'
    },
    {
        id: 'fidget-cube',
        name: 'Fidget Cube',
        description: 'Satisfying clicking and spinning sides. Great for focus and stress relief!',
        price: 4.50,
        category: 'toys',
        printTime: '2 hr',
        difficulty: 'Medium',
        image: '🎲',
        popular: true
    },
    {
        id: 'headphone-hook',
        name: 'Headphone Hook',
        description: 'Mount under your desk to hang headphones. Clean setup vibes!',
        price: 3.50,
        category: 'tech',
        printTime: '40 min',
        difficulty: 'Easy',
        image: '🎧'
    }
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const ShopData = {
    getCategories() {
        return SHOP_CATEGORIES;
    },

    getColors() {
        return SHOP_COLORS;
    },

    getProducts() {
        return SHOP_PRODUCTS;
    },

    getProductsByCategory(categoryId) {
        if (categoryId === 'all') return SHOP_PRODUCTS;
        return SHOP_PRODUCTS.filter(p => p.category === categoryId);
    },

    getProductById(productId) {
        return SHOP_PRODUCTS.find(p => p.id === productId);
    },

    getPopularProducts() {
        return SHOP_PRODUCTS.filter(p => p.popular);
    },

    formatPrice(price) {
        return '$' + price.toFixed(2);
    },

    getColorUpchargeText(color) {
        if (color.upcharge === 0) return 'Free';
        return '+$' + color.upcharge.toFixed(2);
    },

    calculateItemPrice(product, color) {
        return product.price + color.upcharge;
    }
};

// Export for use in other scripts
window.ShopData = ShopData;
window.SHOP_CATEGORIES = SHOP_CATEGORIES;
window.SHOP_COLORS = SHOP_COLORS;
window.SHOP_PRODUCTS = SHOP_PRODUCTS;
