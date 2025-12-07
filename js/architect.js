document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('backBtn');
    const splitView = document.getElementById('splitView');

    // Config Elements
    const agentNameInput = document.getElementById('agentNameInput');
    const agentVersionInput = document.getElementById('agentVersionInput');
    const modelSelect = document.getElementById('modelSelect');
    const systemPromptInput = document.getElementById('systemPromptInput');
    const configJsonEditor = document.getElementById('configJsonEditor'); // Changed from configJson
    const resetBtn = document.getElementById('resetBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');
    const toggleSwitches = document.querySelectorAll('.toggle-switch');

    // Detailed Modification Elements
    const logicInput = document.getElementById('logicInput');
    const tempSlider = document.getElementById('tempSlider');
    const tempValue = document.getElementById('tempValue');
    const tokensSlider = document.getElementById('tokensSlider');
    const tokensValue = document.getElementById('tokensValue');
    const knowledgeDropzone = document.getElementById('knowledgeDropzone');
    const fileList = document.getElementById('fileList');

    // Generate UUID v4
    function uuidv4() {
        return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
            (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
        );
    }

    // Backend-Ready State Structure (Initial)
    let agentState = {
        agent_id: uuidv4(),
        meta: {
            name: "New_Agent",
            version: "1.0.0",
            created_at: new Date().toISOString()
        },
        // 1. THE BRAIN
        neural_config: {
            model_provider: "openai",
            model_id: "gpt-4-turbo",
            system_prompt: "",
            parameters: {
                temperature: 0.7,
                max_tokens: 2048,
                top_p: 1.0,
                frequency_penalty: 0.0
            }
        },
        // 2. SKILL RACK
        skills: [
            {
                id: "web_search",
                enabled: true,
                config: { depth: "basic" }
            },
            {
                id: "file_access",
                enabled: false
            }
        ],
        // 3. KNOWLEDGE CRATE
        knowledge_base: {
            vector_store_id: null,
            files: []
        }
    };

    // Back Navigation
    backBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // --- Two-Way Binding Logic ---

    // 1. Update JSON Editor from State
    function updateJSONEditor() {
        const jsonString = JSON.stringify(agentState, null, 2);
        // Only update if different to avoid cursor jumping if we were typing in it (though we usually update on blur or valid parse)
        // But here we update it when UI controls change.
        if (configJsonEditor.value !== jsonString) {
            configJsonEditor.value = jsonString;
        }
        saveState();
    }

    // 2. Update UI from State
    function updateUI() {
        // Meta
        if (agentState.meta) {
            if (agentState.meta.name) agentNameInput.value = agentState.meta.name;
            if (agentState.meta.version) agentVersionInput.value = agentState.meta.version;
        }

        // Neural Config
        if (agentState.neural_config) {
            // Model (Simple mapping reverse)
            const modelId = agentState.neural_config.model_id;
            if (modelId) {
                if (modelId.includes('gpt')) modelSelect.value = 'gpt4o';
                else if (modelId.includes('claude')) modelSelect.value = 'claude35';
                else if (modelId.includes('llama')) modelSelect.value = 'llama3';
            }

            // System Prompt
            if (agentState.neural_config.system_prompt !== undefined) {
                systemPromptInput.value = agentState.neural_config.system_prompt;
                logicInput.value = agentState.neural_config.system_prompt;
            }

            // Parameters
            if (agentState.neural_config.parameters) {
                if (agentState.neural_config.parameters.temperature !== undefined) {
                    tempSlider.value = agentState.neural_config.parameters.temperature;
                    tempValue.textContent = agentState.neural_config.parameters.temperature;
                }
                if (agentState.neural_config.parameters.max_tokens !== undefined) {
                    tokensSlider.value = agentState.neural_config.parameters.max_tokens;
                    tokensValue.textContent = agentState.neural_config.parameters.max_tokens;
                }
            }
        }

        // Skills
        if (agentState.skills) {
            toggleSwitches.forEach(toggle => {
                const toolKey = toggle.dataset.tool;
                const skill = agentState.skills.find(s => s.id === toolKey);
                if (skill && skill.enabled) {
                    toggle.classList.add('active');
                } else {
                    toggle.classList.remove('active');
                }
            });
        }

        // Knowledge Base (Visual feedback only, as we can't repopulate file inputs)
        // We could list files if we had a list UI, but currently it's just a dropzone.
        updateFileList();
    }

    function updateFileList() {
        fileList.innerHTML = '';
        if (agentState.knowledge_base && agentState.knowledge_base.files) {
            agentState.knowledge_base.files.forEach((file, index) => {
                const item = document.createElement('div');
                item.className = 'file-item';
                item.innerHTML = `
                    <span>${file.name}</span>
                    <span class="file-remove" data-index="${index}">×</span>
                `;
                fileList.appendChild(item);
            });

            // Add remove listeners
            document.querySelectorAll('.file-remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = parseInt(e.target.dataset.index);
                    agentState.knowledge_base.files.splice(idx, 1);
                    updateJSONEditor();
                    updateUI();
                    saveState();
                });
            });
        }
    }

    // 3. Handle JSON Editor Input
    configJsonEditor.addEventListener('input', () => {
        try {
            const newState = JSON.parse(configJsonEditor.value);
            agentState = newState; // Update internal state
            updateUI(); // Sync UI controls to match new JSON
            saveState();
            configJsonEditor.classList.remove('error');
        } catch (e) {
            // Invalid JSON
            configJsonEditor.classList.add('error');
            // Do not update state or UI until valid
        }
    });

    // Tab Support
    configJsonEditor.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            this.value = this.value.substring(0, start) + "  " + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + 2;
        }
    });

    // Auto-format on blur
    configJsonEditor.addEventListener('blur', function () {
        try {
            const json = JSON.parse(this.value);
            this.value = JSON.stringify(json, null, 2);
            this.classList.remove('error');
        } catch (e) {
            // Keep error state
        }
    });

    // Initialize
    updateJSONEditor();
    updateUI();

    // --- UI Event Listeners (Update State -> Update JSON) ---

    // Identity
    agentNameInput.addEventListener('input', (e) => {
        if (!agentState.meta) agentState.meta = {};
        agentState.meta.name = e.target.value;
        updateJSONEditor();
    });

    agentVersionInput.addEventListener('input', (e) => {
        if (!agentState.meta) agentState.meta = {};
        agentState.meta.version = e.target.value;
        updateJSONEditor();
    });

    // Model Selection
    modelSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (!agentState.neural_config) agentState.neural_config = {};

        if (val.includes('gpt')) {
            agentState.neural_config.model_provider = 'openai';
            agentState.neural_config.model_id = 'gpt-4-turbo';
        } else if (val.includes('claude')) {
            agentState.neural_config.model_provider = 'anthropic';
            agentState.neural_config.model_id = 'claude-3-5-sonnet';
        } else if (val.includes('llama')) {
            agentState.neural_config.model_provider = 'meta';
            agentState.neural_config.model_id = 'llama-3-70b';
        }
        updateJSONEditor();
    });

    // System Prompt & Logic Sync
    function updateSystemPrompt(val) {
        if (!agentState.neural_config) agentState.neural_config = {};
        agentState.neural_config.system_prompt = val;
        // Sync the other input
        if (systemPromptInput.value !== val) systemPromptInput.value = val;
        if (logicInput.value !== val) logicInput.value = val;
        updateJSONEditor();
    }

    logicInput.addEventListener('input', (e) => updateSystemPrompt(e.target.value));
    systemPromptInput.addEventListener('input', (e) => updateSystemPrompt(e.target.value));


    // Toggle Switches (Skills)
    toggleSwitches.forEach(toggle => {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
            const toolKey = toggle.dataset.tool;
            const isEnabled = toggle.classList.contains('active');

            if (!agentState.skills) agentState.skills = [];

            const skill = agentState.skills.find(s => s.id === toolKey);
            if (skill) {
                skill.enabled = isEnabled;
            } else {
                agentState.skills.push({
                    id: toolKey,
                    enabled: isEnabled
                });
            }
            updateJSONEditor();
        });
    });

    // Temperature
    tempSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        tempValue.textContent = val;
        if (!agentState.neural_config) agentState.neural_config = { parameters: {} };
        if (!agentState.neural_config.parameters) agentState.neural_config.parameters = {};

        agentState.neural_config.parameters.temperature = val;
        updateJSONEditor();
    });

    // Max Tokens
    tokensSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        tokensValue.textContent = val;
        if (!agentState.neural_config) agentState.neural_config = { parameters: {} };
        if (!agentState.neural_config.parameters) agentState.neural_config.parameters = {};

        agentState.neural_config.parameters.max_tokens = val;
        updateJSONEditor();
    });

    // Knowledge Base
    knowledgeDropzone.addEventListener('click', () => {
        const fileName = `doc_${Math.floor(Math.random() * 1000)}.pdf`;
        if (!agentState.knowledge_base) agentState.knowledge_base = { files: [] };

        agentState.knowledge_base.files.push({
            name: fileName,
            status: "pending_index"
        });
        updateJSONEditor();

        // Visual Feedback
        const p = knowledgeDropzone.querySelector('p');
        // p.textContent = `Added: ${fileName} (+${agentState.knowledge_base.files.length - 1} others)`;
        knowledgeDropzone.style.borderColor = 'var(--lime)';
        setTimeout(() => knowledgeDropzone.style.borderColor = '', 500);
        updateUI();
        saveState();
    });

    // --- Persistence ---
    function saveState() {
        localStorage.setItem('agentFlowState', JSON.stringify(agentState));
    }

    function loadState() {
        const saved = localStorage.getItem('agentFlowState');
        if (saved) {
            try {
                agentState = JSON.parse(saved);
                updateJSONEditor();
                updateUI();
            } catch (e) {
                console.error("Failed to load state", e);
            }
        }
        // Do not auto-show split view, let user click Forge
    }

    // Reset
    resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset the agent configuration? This cannot be undone.')) {
            localStorage.removeItem('agentFlowState');
            location.reload();
        }
    });

    // Export
    exportBtn.addEventListener('click', () => {
        // Use the current value from the editor to ensure we get exactly what the user sees
        const jsonContent = configJsonEditor.value;

        let fileName = "agent.json";
        try {
            const parsed = JSON.parse(jsonContent);
            if (parsed.meta && parsed.meta.name) {
                // Sanitize filename: replace non-alphanumeric with underscore, lowercase
                fileName = `${parsed.meta.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
            }
        } catch (e) {
            // If invalid JSON, fallback to state name or default
            const safeName = (agentState.meta?.name || "agent").replace(/[^a-z0-9]/gi, '_').toLowerCase();
            fileName = `${safeName}.json`;
        }

        // Try using File constructor which supports name property
        try {
            const file = new File([jsonContent], fileName, { type: 'application/json' });
            const url = URL.createObjectURL(file);

            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.style.display = 'none';
            downloadAnchorNode.setAttribute("href", url);
            downloadAnchorNode.setAttribute("download", fileName);
            document.body.appendChild(downloadAnchorNode);

            downloadAnchorNode.click();

            setTimeout(() => {
                document.body.removeChild(downloadAnchorNode);
                URL.revokeObjectURL(url);
            }, 100);
        } catch (e) {
            // Fallback for browsers that don't support File constructor
            console.warn("File constructor failed, falling back to Blob", e);
            const blob = new Blob([jsonContent], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.style.display = 'none';
            downloadAnchorNode.setAttribute("href", url);
            downloadAnchorNode.setAttribute("download", fileName);
            document.body.appendChild(downloadAnchorNode);

            downloadAnchorNode.click();

            setTimeout(() => {
                document.body.removeChild(downloadAnchorNode);
                URL.revokeObjectURL(url);
            }, 100);
        }
    });

    // Import
    importBtn.addEventListener('click', () => {
        importFile.click();
    });

    importFile.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                // Basic validation?
                if (json.agent_id && json.meta) {
                    agentState = json;
                    updateJSONEditor();
                    updateUI();
                    saveState(); // Save imported state
                } else {
                    alert("Invalid AgentFlow JSON file.");
                }
            } catch (err) {
                alert("Error parsing JSON file.");
            }
        };
        reader.readAsText(file);
        // Reset input so same file can be selected again
        importFile.value = '';
    });

    // Process Config (Save to Backend)
    const saveConfigBtn = document.getElementById('saveConfigBtn');
    if (saveConfigBtn) {
        saveConfigBtn.addEventListener('click', async () => {
            alert("Processing started...");

            try {
                const response = await fetch('http://localhost:5000/save_config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(agentState)
                });

                if (response.ok) {
                    console.log("Config saved to backend.");
                } else {
                    console.error("Failed to save config");
                }
            } catch (e) {
                console.error("Error saving config:", e);
            }
        });
    }

    // Forge Agent Button - Show Split View & Generate
    const forgeBtn = document.getElementById('forgeBtn');
    const agentPrompt = document.getElementById('agentPrompt');

    if (forgeBtn && agentPrompt) {
        forgeBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const prompt = agentPrompt.value.trim();

            if (prompt) {
                // LLM Generation Mode
                const originalText = forgeBtn.textContent;
                forgeBtn.textContent = "Forging Intelligence...";
                forgeBtn.disabled = true;
                forgeBtn.style.cursor = "wait";

                try {
                    const response = await fetch('http://localhost:5000/generate_agent', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ prompt: prompt })
                    });

                    const data = await response.json();
                    console.log(data);
                    if (response.ok) {
                        // Merge generated data into current state
                        if (data.meta) agentState.meta = { ...agentState.meta, ...data.meta };
                        if (data.neural_config) agentState.neural_config = { ...agentState.neural_config, ...data.neural_config };
                        if (data.skills) agentState.skills = data.skills; // Replace skills logic if needed, or merge

                        // Update UI
                        updateJSONEditor();
                        updateUI();
                        saveState();

                        // Visual feedback handled by UI update, proceed to view
                    } else {
                        alert("Forge failed: " + (data.error || "Unknown error"));
                    }
                } catch (e) {
                    console.error("Generation error:", e);
                    alert("Could not connect to the Forge. Check backend.");
                } finally {
                    forgeBtn.textContent = originalText;
                    forgeBtn.disabled = false;
                    forgeBtn.style.cursor = "pointer";
                }
            }

            // Always show view eventually (or maybe only on success? prioritizing user flow)
            // If they typed nothing, just go there. If they typed something and it failed, maybe stay?
            // Let's go there on success or empty.

            if (!prompt || !forgeBtn.disabled) { // If disabled, we are waiting.
                splitView.classList.add('active');
                splitView.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // Process Agent Logic Button
    const processBtn = document.getElementById('processBtn');
    if (processBtn) {
        processBtn.addEventListener('click', async () => {
            const prompt = logicInput.value.trim();
            if (!prompt) return;

            const originalText = processBtn.textContent;
            processBtn.textContent = "PROCESSING...";
            processBtn.disabled = true;
            processBtn.style.cursor = "wait";

            try {
                const response = await fetch('http://localhost:5000/generate_agent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: prompt })
                });

                const data = await response.json();
                console.log(data);
                if (response.ok) {
                    // Update state
                    if (data.meta) agentState.meta = { ...agentState.meta, ...data.meta };
                    if (data.neural_config) agentState.neural_config = { ...agentState.neural_config, ...data.neural_config };
                    if (data.skills) agentState.skills = data.skills;

                    updateJSONEditor();
                    updateUI();
                    saveState();
                } else {
                    alert("Processing failed: " + (data.error || "Unknown error"));
                }
            } catch (e) {
                console.error("Processing error:", e);
                alert("Could not connect to AI service.");
            } finally {
                processBtn.textContent = originalText;
                processBtn.disabled = false;
                processBtn.style.cursor = "pointer";
            }
        });
    }

    // Load on init
    loadState();
});
