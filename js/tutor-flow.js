/**
 * LayerBEE 3D Printing Tutor - PocketFlow Architecture
 *
 * This is the brain of the AI tutor. It uses:
 * - WebLLM: Runs AI 100% in your browser (no API keys!)
 * - PocketFlow: A graph of nodes that process your question
 *
 * Flow: GetContext -> BuildPrompt -> CallLLM -> FormatResponse/ErrorHandler
 */

// ============================================================
// CONFIGURATION
// ============================================================

const TutorConfig = {
    // Available modes
    MODES: {
        LEARN: 'learn',      // Explains concepts
        QUIZ: 'quiz',        // Tests knowledge
        TROUBLESHOOT: 'troubleshoot',  // Helps fix print problems
        BUSINESS: 'business' // Tips for starting a print shop
    },

    // Current settings
    currentMode: 'learn',

    // Model to use (Llama 3.2 1B - small but capable!)
    modelId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',

    // 3D Printing topics by module
    topics: {
        basics: [
            'What is FDM 3D printing',
            'Parts of a 3D printer (bed, hotend, extruder, nozzle)',
            'Filament types (PLA, PETG, TPU)',
            'First layer importance',
            'Bed leveling basics'
        ],
        workflow: [
            'Design in Tinkercad or other CAD',
            'Export as STL file',
            'Import into slicer (Cura, PrusaSlicer, Bambu Studio)',
            'Slicer settings (layer height, infill, supports)',
            'Send to printer and monitor'
        ],
        troubleshooting: [
            'Stringing and oozing',
            'Warping and adhesion problems',
            'Layer shifting',
            'Under/over extrusion',
            'Clogged nozzle',
            'Failed supports'
        ],
        advanced: [
            'Multi-color printing',
            'Different nozzle sizes',
            'Print speed optimization',
            'Temperature tuning',
            'Custom supports',
            'Post-processing (sanding, painting)'
        ],
        business: [
            'Finding what to sell',
            'Pricing your prints',
            'Taking good photos',
            'Setting up an online store',
            'Handling orders safely',
            'Customer service basics'
        ]
    }
};

// ============================================================
// POCKETFLOW CORE - The Framework (don't change this part!)
// ============================================================

/**
 * Node - A single unit of work in the flow
 * Each node has: prep() -> run() -> post()
 */
class Node {
    constructor(name) {
        this.name = name;
    }

    // 1. PREP: Read from shared store, prepare data
    prep(shared) {
        return null;
    }

    // 2. PROCESS: Do the actual work (can be async)
    async process(prepResult) {
        return null;
    }

    // 3. POST: Write results to shared store, return action name
    post(shared, prepResult, processResult) {
        return 'default';
    }

    // Run the full node cycle
    async run(shared) {
        const prepResult = this.prep(shared);
        const processResult = await this.process(prepResult);
        return this.post(shared, prepResult, processResult);
    }
}

/**
 * Flow - Connects nodes together in a graph
 * Nodes return "actions" that determine the next node
 */
class Flow {
    constructor(startNode) {
        this.startNode = startNode;
        this.nodes = new Map();
        this.edges = new Map();
    }

    addNode(node) {
        this.nodes.set(node.name, node);
        return this;
    }

    connect(fromNode, toNode, action = 'default') {
        const from = fromNode.name;
        if (!this.edges.has(from)) {
            this.edges.set(from, {});
        }
        this.edges.get(from)[action] = toNode.name;
        return this;
    }

    async run(shared) {
        let currentNode = this.startNode;

        while (currentNode) {
            const node = this.nodes.get(currentNode.name) || currentNode;
            const action = await node.run(shared);

            const nodeEdges = this.edges.get(node.name);
            if (nodeEdges && nodeEdges[action]) {
                currentNode = this.nodes.get(nodeEdges[action]);
            } else {
                currentNode = null;
            }
        }

        return shared;
    }
}

// ============================================================
// 3D PRINTING TUTOR NODES - Customized for LayerBEE
// ============================================================

/**
 * Node 1: GetContextNode
 * Gathers info about what the user is learning
 */
class GetContextNode extends Node {
    constructor() {
        super('GetContext');
    }

    prep(shared) {
        // Read user's saved progress from browser storage
        const progress = JSON.parse(localStorage.getItem('layerbee_progress') || '{}');
        const currentPage = window.location.pathname;
        return { progress, currentPage };
    }

    async process({ progress, currentPage }) {
        // Figure out what module they're on
        let currentModule = 'basics';
        if (currentPage.includes('workflow')) currentModule = 'workflow';
        if (currentPage.includes('troubleshoot')) currentModule = 'troubleshooting';
        if (currentPage.includes('advanced')) currentModule = 'advanced';
        if (currentPage.includes('business')) currentModule = 'business';

        // Get their completed topics
        const completedModules = progress.completed || [];

        // Determine skill level based on progress
        let skillLevel = 'beginner';
        if (completedModules.length >= 2) skillLevel = 'intermediate';
        if (completedModules.length >= 4) skillLevel = 'advanced';

        return {
            currentModule,
            completedModules,
            skillLevel,
            printerType: progress.printerType || 'any FDM printer',
            slicerUsed: progress.slicer || 'Cura or Bambu Studio'
        };
    }

    post(shared, prepResult, processResult) {
        shared.context = processResult;
        return 'default';
    }
}

/**
 * Node 2: BuildPromptNode
 * Creates the system prompt with 3D printing context
 */
class BuildPromptNode extends Node {
    constructor() {
        super('BuildPrompt');
    }

    prep(shared) {
        return {
            question: shared.question,
            context: shared.context,
            mode: TutorConfig.currentMode
        };
    }

    async process({ question, context, mode }) {
        // Get relevant topics for current module
        const topicList = TutorConfig.topics[context.currentModule] || TutorConfig.topics.basics;

        // Build the system prompt based on mode
        let modeInstructions = '';

        switch(mode) {
            case 'quiz':
                modeInstructions = `
MODE: QUIZ
- Ask one question at a time about 3D printing
- Give multiple choice when possible (A, B, C, D)
- Be encouraging if they get it wrong - explain why
- Celebrate correct answers!`;
                break;

            case 'troubleshoot':
                modeInstructions = `
MODE: TROUBLESHOOT
- Help diagnose print problems step by step
- Ask clarifying questions (What does it look like? What filament?)
- Give specific fixes they can try
- Always mention safety (hot surfaces, ventilation)`;
                break;

            case 'business':
                modeInstructions = `
MODE: BUSINESS HELPER
- Help them think about starting a small print business
- Emphasize safety: no personal info online, get parent help for money stuff
- Focus on school-appropriate ideas
- Encourage creativity and entrepreneurship!`;
                break;

            default: // learn mode
                modeInstructions = `
MODE: LEARN
- Explain 3D printing concepts clearly
- Use simple language (remember: young audience!)
- Include fun facts when relevant
- Give practical tips they can try`;
        }

        const systemPrompt = `You are LayerBEE, a friendly 3D printing tutor for young makers!

YOUR PERSONALITY:
- Enthusiastic about 3D printing and making
- Patient and encouraging
- Uses simple, clear language
- Adds occasional bee puns (but don't overdo it!)

CURRENT CONTEXT:
- User's skill level: ${context.skillLevel}
- Current module: ${context.currentModule}
- Completed: ${context.completedModules.join(', ') || 'Just getting started!'}
- Their printer: ${context.printerType}
- Their slicer: ${context.slicerUsed}

TOPICS YOU CAN COVER:
${topicList.map(t => '• ' + t).join('\n')}
${modeInstructions}

SAFETY RULES (ALWAYS FOLLOW):
- Remind about hot surfaces (bed, nozzle) when relevant
- Mention ventilation for certain filaments
- Never suggest anything that could be dangerous
- For business questions: remind to involve parents for money/selling

RESPONSE STYLE:
- Keep answers concise but helpful
- Use bullet points for steps
- Include one emoji per response max
- If they ask something outside 3D printing, gently redirect`;

        return { systemPrompt, userMessage: question };
    }

    post(shared, prepResult, processResult) {
        shared.prompt = processResult;
        return 'default';
    }
}

/**
 * Node 3: CallLLMNode
 * Sends the question to WebLLM
 */
class CallLLMNode extends Node {
    constructor() {
        super('CallLLM');
    }

    prep(shared) {
        return shared.prompt;
    }

    async process({ systemPrompt, userMessage }) {
        try {
            // Get the WebLLM engine (initialized in tutor-ui.js)
            const engine = window.LayerBeeEngine;

            if (!engine) {
                throw new Error('AI engine not ready yet. Please wait for it to load!');
            }

            const response = await engine.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
                temperature: 0.7,
                max_tokens: 600
            });

            return {
                success: true,
                response: response.choices[0].message.content
            };
        } catch (error) {
            console.error('LLM Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    post(shared, prepResult, processResult) {
        shared.llmResult = processResult;
        // Branch based on success or error
        return processResult.success ? 'success' : 'error';
    }
}

/**
 * Node 4: FormatResponseNode
 * Converts markdown to nice HTML
 */
class FormatResponseNode extends Node {
    constructor() {
        super('FormatResponse');
    }

    prep(shared) {
        return shared.llmResult;
    }

    async process(llmResult) {
        let html = llmResult.response
            // Code blocks (for G-code examples)
            .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Bold
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            // Bullet points
            .replace(/^[•\-]\s+(.+)$/gm, '<li>$1</li>')
            // Wrap consecutive li tags in ul
            .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
            // Paragraphs
            .replace(/\n\n/g, '</p><p>');

        return { html: `<p>${html}</p>`, isError: false };
    }

    post(shared, prepResult, processResult) {
        shared.formattedResponse = processResult;
        return 'default';
    }
}

/**
 * Node 5: ErrorHandlerNode
 * Provides helpful fallbacks when the AI fails
 */
class ErrorHandlerNode extends Node {
    constructor() {
        super('ErrorHandler');
    }

    prep(shared) {
        return {
            error: shared.llmResult?.error,
            question: shared.question
        };
    }

    async process({ error, question }) {
        // Keyword-based fallback answers
        const fallbacks = {
            // Troubleshooting
            'string': '<strong>Stringing?</strong> Try these fixes:<ul><li>Lower your temperature by 5-10°C</li><li>Increase retraction distance (try 6mm for Bowden, 2mm for direct drive)</li><li>Enable "Combing" or "Avoid crossing perimeters" in your slicer</li></ul>',

            'warp': '<strong>Warping?</strong> Here\'s what helps:<ul><li>Make sure your bed is level and clean</li><li>Use a brim or raft for better adhesion</li><li>Try a heated bed (60°C for PLA, 70°C for PETG)</li><li>Reduce cooling fan for the first few layers</li></ul>',

            'adhesion': '<strong>First layer not sticking?</strong> Try:<ul><li>Level your bed (paper test: slight drag)</li><li>Clean the bed with isopropyl alcohol</li><li>Slow down first layer (try 20mm/s)</li><li>Use glue stick or hairspray if needed</li></ul>',

            'clog': '<strong>Clogged nozzle?</strong> Here\'s how to fix it:<ul><li>Heat up the nozzle to printing temp</li><li>Try a cold pull: heat to 200°C, cool to 90°C, pull filament out</li><li>Use a needle to clear the nozzle (be careful, it\'s hot!)</li><li>As last resort: replace the nozzle</li></ul>',

            // Basics
            'pla': '<strong>PLA</strong> is perfect for beginners!<ul><li>Print temp: 190-220°C</li><li>Bed temp: 50-60°C (or no heat)</li><li>Easy to print, biodegradable</li><li>Great for toys, decorations, prototypes</li></ul>',

            'petg': '<strong>PETG</strong> is stronger than PLA:<ul><li>Print temp: 220-250°C</li><li>Bed temp: 70-80°C</li><li>Food-safe (after sealing)</li><li>More flexible, heat resistant</li></ul>',

            'level': '<strong>Bed leveling</strong> is super important!<ul><li>Use the paper test: adjust until paper has slight drag</li><li>Check all four corners</li><li>Re-level when you move the printer</li><li>Many printers have auto-level - use it!</li></ul>',

            // Business
            'sell': '<strong>Want to sell prints?</strong> Great idea!<ul><li>Start with friends and family</li><li>Make sure to involve a parent for money stuff</li><li>Price = filament cost + time + a little profit</li><li>Take good photos in natural light</li></ul>',

            'price': '<strong>Pricing your prints:</strong><ul><li>Filament: about $0.05 per gram (check your slicer for weight)</li><li>Add your time: maybe $5-10 per hour of design</li><li>Add a profit margin: 20-50% extra</li><li>Check what others charge for similar items!</li></ul>'
        };

        // Search for matching keywords
        const lowerQ = question.toLowerCase();
        for (const [keyword, response] of Object.entries(fallbacks)) {
            if (lowerQ.includes(keyword)) {
                return { html: response, isError: false };
            }
        }

        // Generic error message
        return {
            html: `<p>Buzz... I hit a snag! (${error})</p>
                   <p>Try refreshing the page, or ask your question a different way.</p>
                   <p><strong>Quick tips while I warm up:</strong></p>
                   <ul>
                       <li>For stringing: lower temperature, increase retraction</li>
                       <li>For adhesion: level bed, clean with alcohol</li>
                       <li>For warping: use a brim, heated bed</li>
                   </ul>`,
            isError: true
        };
    }

    post(shared, prepResult, processResult) {
        shared.formattedResponse = processResult;
        return 'default';
    }
}

// ============================================================
// FLOW CREATION - Wiring the nodes together
// ============================================================

function createTutorFlow() {
    // Create all nodes
    const getContext = new GetContextNode();
    const buildPrompt = new BuildPromptNode();
    const callLLM = new CallLLMNode();
    const formatResponse = new FormatResponseNode();
    const errorHandler = new ErrorHandlerNode();

    // Create flow starting at getContext
    const flow = new Flow(getContext);

    // Add all nodes to the flow
    flow.addNode(getContext)
        .addNode(buildPrompt)
        .addNode(callLLM)
        .addNode(formatResponse)
        .addNode(errorHandler);

    // Connect the graph
    flow.connect(getContext, buildPrompt, 'default');
    flow.connect(buildPrompt, callLLM, 'default');
    flow.connect(callLLM, formatResponse, 'success');  // Happy path
    flow.connect(callLLM, errorHandler, 'error');       // Error path

    return flow;
}

// ============================================================
// PUBLIC API - What the UI calls
// ============================================================

/**
 * Main function to ask LayerBEE a question
 * @param {string} question - The user's question
 * @returns {Object} - { html: string, isError: boolean }
 */
async function askLayerBee(question) {
    const shared = { question };
    const flow = createTutorFlow();
    await flow.run(shared);
    return shared.formattedResponse;
}

/**
 * Set the tutor mode
 * @param {string} mode - 'learn', 'quiz', 'troubleshoot', or 'business'
 */
function setTutorMode(mode) {
    if (TutorConfig.MODES[mode.toUpperCase()]) {
        TutorConfig.currentMode = mode;
        console.log(`LayerBEE mode set to: ${mode}`);
    }
}

/**
 * Get current configuration
 */
function getTutorConfig() {
    return { ...TutorConfig };
}

// Make functions available globally
window.askLayerBee = askLayerBee;
window.setTutorMode = setTutorMode;
window.getTutorConfig = getTutorConfig;
