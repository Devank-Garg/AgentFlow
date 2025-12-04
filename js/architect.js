document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('backBtn');
    const forgeBtn = document.getElementById('forgeBtn');
    const heroContainer = document.getElementById('heroContainer');
    const splitView = document.getElementById('splitView');
    const agentPrompt = document.getElementById('agentPrompt');

    // Config Elements
    const modelSelect = document.getElementById('modelSelect');
    const systemPromptInput = document.getElementById('systemPromptInput');
    const configJson = document.getElementById('configJson');
    const toggleSwitches = document.querySelectorAll('.toggle-switch');

    // Detailed Modification Elements
    const logicInput = document.getElementById('logicInput');
    const tempSlider = document.getElementById('tempSlider');
    const tempValue = document.getElementById('tempValue');
    const tokensSlider = document.getElementById('tokensSlider');
    const tokensValue = document.getElementById('tokensValue');
    const knowledgeDropzone = document.getElementById('knowledgeDropzone');

    // State
    const agentState = {
        description: "",
        model: "gpt4o",
        systemPrompt: "",
        tools: {
            web_search: true,
            file_access: false,

        },
        detailedConfig: {
            coreInstructions: "",
            temperature: 0.7,
            maxTokens: 2048,
            knowledgeBase: []
        }
    };

    // Back Navigation
    backBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // Sync JSON
    function updateJSON() {
        configJson.textContent = JSON.stringify(agentState, null, 2);
    }

    // Initialize JSON
    updateJSON();

    // Event Listeners for Config
    modelSelect.addEventListener('change', (e) => {
        agentState.model = e.target.value;
        updateJSON();
    });

    systemPromptInput.addEventListener('input', (e) => {
        agentState.systemPrompt = e.target.value;
        updateJSON();
    });

    toggleSwitches.forEach(toggle => {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
            const toolKey = toggle.dataset.tool;
            if (toolKey) {
                agentState.tools[toolKey] = toggle.classList.contains('active');
                updateJSON();
            }
        });
    });

    // Event Listeners for Detailed Modification
    logicInput.addEventListener('input', (e) => {
        agentState.detailedConfig.coreInstructions = e.target.value;
        updateJSON();
    });

    tempSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        tempValue.textContent = val;
        agentState.detailedConfig.temperature = parseFloat(val);
        updateJSON();
    });

    tokensSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        tokensValue.textContent = val;
        agentState.detailedConfig.maxTokens = parseInt(val);
        updateJSON();
    });

    // Mock Knowledge Upload
    knowledgeDropzone.addEventListener('click', () => {
        const fileName = `doc_${Math.floor(Math.random() * 1000)}.pdf`;
        agentState.detailedConfig.knowledgeBase.push(fileName);
        updateJSON();

        // Visual Feedback
        const p = knowledgeDropzone.querySelector('p');
        p.textContent = `Added: ${fileName} (+${agentState.detailedConfig.knowledgeBase.length - 1} others)`;
        knowledgeDropzone.style.borderColor = 'var(--lime)';
        setTimeout(() => knowledgeDropzone.style.borderColor = '', 500);
    });

    // Forge Animation
    forgeBtn.addEventListener('click', () => {
        if (!agentPrompt.value.trim()) {
            agentPrompt.style.borderColor = 'red';
            setTimeout(() => agentPrompt.style.borderColor = '', 500);
            return;
        }

        // Update State
        agentState.description = agentPrompt.value;

        // Auto-generate a system prompt if empty
        if (!agentState.systemPrompt) {
            agentState.systemPrompt = `You are an AI agent described as: ${agentState.description}. Act accordingly.`;
            systemPromptInput.value = agentState.systemPrompt;
        }

        updateJSON();

        heroContainer.classList.add('warp-speed');

        setTimeout(() => {
            heroContainer.style.display = 'none';
            splitView.classList.add('active');
        }, 800);
    });
});
