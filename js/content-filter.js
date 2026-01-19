/**
 * LayerBEE Content Filter
 * Keeps the platform safe for kids by filtering inappropriate content
 *
 * Used by:
 * - Print Shop: text input fields, file names
 * - LayerBEE Chatbot: user messages before sending to AI
 */

// ============================================================
// CONFIGURATION
// ============================================================

const ContentFilterConfig = {
    // Maximum lengths for different field types
    MAX_NAME_LENGTH: 30,
    MAX_MESSAGE_LENGTH: 500,
    MAX_FILENAME_LENGTH: 100,

    // Character allowlists (regex patterns)
    PATTERNS: {
        // Names: letters, numbers, spaces, basic punctuation
        name: /^[a-zA-Z0-9\s\-'\.]+$/,
        // Messages: more permissive but still safe
        message: /^[a-zA-Z0-9\s\-'\.!?,;:()@#$%&*+=\n]+$/,
        // Filenames: alphanumeric, underscores, hyphens, dots
        filename: /^[a-zA-Z0-9_\-\.]+$/
    }
};

// ============================================================
// BLOCKED CONTENT LISTS
// ============================================================

/**
 * Profanity patterns - encoded to keep source code clean
 * Uses base64 to avoid explicit words in codebase
 * List includes common profanity and variations
 */
const PROFANITY_ENCODED = [
    // Common profanity (base64 encoded)
    'ZnVjaw==', 'c2hpdA==', 'YXNz', 'Yml0Y2g=', 'ZGFtbg==',
    'aGVsbA==', 'Y3JhcA==', 'cGlzcw==', 'd2hvcmU=', 'c2x1dA==',
    'ZmFn', 'bmlnZ2E=', 'bmlnZ2Vy', 'Y3VudA==', 'ZGljaw==',
    'Y29jaw==', 'cHVzc3k=', 'Ym9vYg==', 'dGl0', 'YmFzdGFyZA==',
    // Variations and l33t speak
    'ZnVjazFuZw==', 'c2gxdA==', 'YTU1', 'YjF0Y2g=', 'ZHVtYmFzcw==',
    'amFja2Fzcw==', 'a2lzc215YXNz', 'cGVuaXM=', 'dmFnaW5h'
];

/**
 * Weapon and dangerous item patterns
 * These are not encoded since they're educational/safety-related
 */
const WEAPON_PATTERNS = [
    // Firearms
    /\b(gun|guns|pistol|rifle|shotgun|firearm|ar[\-]?15|ak[\-]?47|glock|handgun|revolver|semi[\-]?auto)\b/i,
    // Ammunition
    /\b(ammo|ammunition|bullet|bullets|cartridge|magazine|clip)\b/i,
    // Bladed weapons
    /\b(knife|knives|sword|blade|dagger|machete|katana|switchblade|butterfly\s*knife)\b/i,
    // Explosives
    /\b(bomb|grenade|explosive|dynamite|c4|detonator|ied)\b/i,
    // Other weapons
    /\b(weapon|weapons|nunchuck|brass\s*knuckles|taser|crossbow)\b/i,
    // Weapon parts
    /\b(trigger|silencer|suppressor|barrel|receiver|stock|grip)\b/i,
    // Intent patterns
    /\b(kill|murder|attack|shoot|stab|hurt|harm)\s+(someone|people|person|him|her|them)\b/i
];

/**
 * Inappropriate request patterns for chatbot
 * Things kids shouldn't be asking an educational bot
 */
const INAPPROPRIATE_REQUESTS = [
    // Violence
    /how\s+to\s+(make|build|create)\s+(a\s+)?(bomb|weapon|gun|knife)/i,
    /how\s+to\s+(hurt|harm|kill|attack)/i,
    // Adult content
    /\b(sex|porn|nude|naked|xxx)\b/i,
    // Drugs
    /\b(drug|drugs|weed|cocaine|heroin|meth|marijuana)\b/i,
    // Hacking/harmful
    /how\s+to\s+hack/i,
    /\b(steal|stealing)\s+(money|credit\s*card)/i
];

// ============================================================
// CONTENT FILTER MODULE
// ============================================================

const ContentFilter = {
    // Decode profanity list on first use
    _profanityPatterns: null,

    /**
     * Get decoded profanity patterns (lazy initialization)
     */
    getProfanityPatterns() {
        if (!this._profanityPatterns) {
            this._profanityPatterns = PROFANITY_ENCODED.map(encoded => {
                try {
                    const decoded = atob(encoded);
                    // Create pattern that matches word and common variations
                    return new RegExp(`\\b${decoded}(s|ed|ing|er)?\\b`, 'i');
                } catch (e) {
                    return null;
                }
            }).filter(Boolean);
        }
        return this._profanityPatterns;
    },

    /**
     * Check text for profanity
     * @param {string} text - Text to check
     * @returns {boolean} - True if profanity found
     */
    hasProfanity(text) {
        if (!text) return false;
        const patterns = this.getProfanityPatterns();
        return patterns.some(pattern => pattern.test(text));
    },

    /**
     * Check text for weapon-related content
     * @param {string} text - Text to check
     * @returns {boolean} - True if weapon content found
     */
    hasWeaponContent(text) {
        if (!text) return false;
        return WEAPON_PATTERNS.some(pattern => pattern.test(text));
    },

    /**
     * Check text for inappropriate requests (for chatbot)
     * @param {string} text - Text to check
     * @returns {boolean} - True if inappropriate request found
     */
    hasInappropriateRequest(text) {
        if (!text) return false;
        return INAPPROPRIATE_REQUESTS.some(pattern => pattern.test(text));
    },

    /**
     * Validate text against character allowlist
     * @param {string} text - Text to validate
     * @param {string} type - 'name', 'message', or 'filename'
     * @returns {boolean} - True if valid characters
     */
    hasValidCharacters(text, type = 'message') {
        if (!text) return true;
        const pattern = ContentFilterConfig.PATTERNS[type] || ContentFilterConfig.PATTERNS.message;
        return pattern.test(text);
    },

    /**
     * Check text length against limits
     * @param {string} text - Text to check
     * @param {string} type - 'name', 'message', or 'filename'
     * @returns {boolean} - True if within limit
     */
    isWithinLength(text, type = 'message') {
        if (!text) return true;
        const limits = {
            name: ContentFilterConfig.MAX_NAME_LENGTH,
            message: ContentFilterConfig.MAX_MESSAGE_LENGTH,
            filename: ContentFilterConfig.MAX_FILENAME_LENGTH
        };
        return text.length <= (limits[type] || limits.message);
    },

    /**
     * Sanitize text with DOMPurify if available
     * @param {string} text - Text to sanitize
     * @returns {string} - Sanitized text
     */
    sanitizeHTML(text) {
        if (typeof DOMPurify !== 'undefined') {
            return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
        }
        // Fallback: basic HTML entity encoding
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Full validation for shop text fields (names, custom text)
     * @param {string} text - Text to validate
     * @param {string} type - 'name', 'message', or 'filename'
     * @returns {Object} - { valid: boolean, reason?: string, sanitized?: string }
     */
    validateShopInput(text, type = 'name') {
        if (!text || text.trim() === '') {
            return { valid: true, sanitized: '' };
        }

        text = text.trim();

        // Length check
        if (!this.isWithinLength(text, type)) {
            const limit = type === 'name' ? ContentFilterConfig.MAX_NAME_LENGTH :
                         type === 'filename' ? ContentFilterConfig.MAX_FILENAME_LENGTH :
                         ContentFilterConfig.MAX_MESSAGE_LENGTH;
            return {
                valid: false,
                reason: `Text is too long (max ${limit} characters)`
            };
        }

        // Character allowlist
        if (!this.hasValidCharacters(text, type)) {
            return {
                valid: false,
                reason: 'Only letters, numbers, and basic punctuation allowed'
            };
        }

        // Profanity check
        if (this.hasProfanity(text)) {
            return {
                valid: false,
                reason: 'Please use appropriate language'
            };
        }

        // Weapon content check
        if (this.hasWeaponContent(text)) {
            return {
                valid: false,
                reason: 'This type of content is not allowed'
            };
        }

        // Passed all checks
        return {
            valid: true,
            sanitized: this.sanitizeHTML(text)
        };
    },

    /**
     * Full validation for chatbot messages
     * @param {string} message - User message to validate
     * @returns {Object} - { valid: boolean, reason?: string, redirect?: string }
     */
    validateChatMessage(message) {
        if (!message || message.trim() === '') {
            return { valid: false, reason: 'Please enter a message' };
        }

        message = message.trim();

        // Length check
        if (!this.isWithinLength(message, 'message')) {
            return {
                valid: false,
                reason: `Message is too long (max ${ContentFilterConfig.MAX_MESSAGE_LENGTH} characters)`
            };
        }

        // Profanity check
        if (this.hasProfanity(message)) {
            return {
                valid: false,
                reason: 'Please use appropriate language when chatting with LayerBEE!',
                redirect: "Let's keep our conversation friendly! Is there something about 3D printing I can help you with?"
            };
        }

        // Inappropriate request check
        if (this.hasInappropriateRequest(message)) {
            return {
                valid: false,
                reason: 'This topic is not appropriate for LayerBEE',
                redirect: "I'm here to help with 3D printing! Ask me about filaments, slicer settings, troubleshooting, or starting a print shop."
            };
        }

        // Weapon content check
        if (this.hasWeaponContent(message)) {
            return {
                valid: false,
                reason: 'LayerBEE cannot help with this type of request',
                redirect: "I can only help with safe, creative 3D printing projects. What would you like to make? Phone stands, toys, desk organizers?"
            };
        }

        // Passed all checks
        return { valid: true, sanitized: message };
    },

    /**
     * Validate uploaded file name
     * @param {string} filename - File name to validate
     * @returns {Object} - { valid: boolean, reason?: string }
     */
    validateFileName(filename) {
        if (!filename) {
            return { valid: false, reason: 'No filename provided' };
        }

        // Remove extension for content check
        const baseName = filename.replace(/\.(stl|obj|3mf|gcode)$/i, '');

        // Normalize filename: replace underscores/dashes with spaces for word boundary matching
        const normalizedName = baseName.replace(/[_\-]/g, ' ');

        // Check for weapon-related file names
        if (this.hasWeaponContent(normalizedName)) {
            return {
                valid: false,
                reason: 'This file name suggests content that is not allowed'
            };
        }

        // Check for profanity in filename
        if (this.hasProfanity(normalizedName)) {
            return {
                valid: false,
                reason: 'Please rename the file with appropriate language'
            };
        }

        // Check filename characters
        if (!this.hasValidCharacters(filename, 'filename')) {
            return {
                valid: false,
                reason: 'File name can only contain letters, numbers, underscores, and hyphens'
            };
        }

        // Check filename length
        if (!this.isWithinLength(filename, 'filename')) {
            return {
                valid: false,
                reason: `File name is too long (max ${ContentFilterConfig.MAX_FILENAME_LENGTH} characters)`
            };
        }

        return { valid: true };
    },

    /**
     * Get a safe redirect message for blocked content
     * @param {string} type - Type of blocked content
     * @returns {string} - Friendly redirect message
     */
    getRedirectMessage(type = 'general') {
        const messages = {
            profanity: "Let's keep our conversation friendly! What 3D printing topic can I help you with?",
            weapon: "I can only help with safe, creative projects. How about we design something cool like a phone stand or a gift for someone?",
            inappropriate: "I'm LayerBEE, your 3D printing tutor! I can help with printing tips, troubleshooting, or starting a small business.",
            general: "Is there something about 3D printing I can help you with today?"
        };
        return messages[type] || messages.general;
    }
};

// ============================================================
// EXPORTS
// ============================================================

// Make available globally
window.ContentFilter = ContentFilter;
window.ContentFilterConfig = ContentFilterConfig;

// For ES6 module usage (future)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ContentFilter, ContentFilterConfig };
}
