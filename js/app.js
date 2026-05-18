/* ===================================================
   APP.JS — Master controller
   Wires together all modules: Figma, Personas, OpenAI, Storage
   =================================================== */

(function() {
    'use strict';

    /* ----- Cache DOM Elements ----- */
    const elements = {
        // Header buttons
        apiKeyBtn:          document.getElementById('api-key-btn'),
        savedSessionsBtn:   document.getElementById('saved-sessions-btn'),

        // API Key modal
        apiKeyModal:        document.getElementById('api-key-modal'),
        closeApiModal:      document.getElementById('close-api-modal'),
        apiKeyInput:        document.getElementById('api-key-input'),
        saveApiKey:         document.getElementById('save-api-key'),
        apiKeyStatus:       document.getElementById('api-key-status'),

        // Sessions modal
        sessionsModal:      document.getElementById('sessions-modal'),
        closeSessionsModal: document.getElementById('close-sessions-modal'),
        sessionsList:       document.getElementById('sessions-list'),

        // Controls panel
        figmaUrl:           document.getElementById('figma-url'),
        loadFigmaBtn:       document.getElementById('load-figma-btn'),
        personaChecklist:   document.getElementById('persona-checklist'),
        taskDescription:    document.getElementById('task-description'),
        generateBtn:        document.getElementById('generate-btn'),
        saveSessionBtn:     document.getElementById('save-session-btn'),

        // Feedback panel
        feedbackContainer:  document.getElementById('feedback-container'),
        clearFeedbackBtn:   document.getElementById('clear-feedback-btn'),

        // Loading overlay
        loadingOverlay:     document.getElementById('loading-overlay')
    };

    /* ----- State ----- */
    let currentFeedbackResults = [];

    /* ===================================================
       INITIALIZATION
       =================================================== */
    function init() {
        console.log('[App] Figma UX Tester initializing...');

        bindEvents();
        renderPersonaChecklist();

        console.log('[App] Ready.');
    }

    /* ===================================================
       EVENT BINDING
       =================================================== */
    function bindEvents() {

        // --- API Key Modal ---
        elements.apiKeyBtn.addEventListener('click', function() {
            openModal(elements.apiKeyModal);
        });

        elements.closeApiModal.addEventListener('click', function() {
            closeModal(elements.apiKeyModal);
        });

        elements.saveApiKey.addEventListener('click', handleSaveApiKey);

        // Allow pressing Enter in the API key field
        elements.apiKeyInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') handleSaveApiKey();
        });

        // --- Sessions Modal ---
        elements.savedSessionsBtn.addEventListener('click', function() {
            openModal(elements.sessionsModal);
        });

        elements.closeSessionsModal.addEventListener('click', function() {
            closeModal(elements.sessionsModal);
        });

        // --- Close modals by clicking the dark background ---
        elements.apiKeyModal.addEventListener('click', function(e) {
            if (e.target === elements.apiKeyModal) closeModal(elements.apiKeyModal);
        });

        elements.sessionsModal.addEventListener('click', function(e) {
            if (e.target === elements.sessionsModal) closeModal(elements.sessionsModal);
        });

        // --- Figma Embed ---
        elements.loadFigmaBtn.addEventListener('click', handleLoadFigma);

        // Allow pressing Enter in the Figma URL field
        elements.figmaUrl.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') handleLoadFigma();
        });

        // --- Generate Feedback ---
        elements.generateBtn.addEventListener('click', handleGenerateFeedback);

        // --- Save Session ---
        elements.saveSessionBtn.addEventListener('click', handleSaveSession);

        // --- Clear Feedback ---
        elements.clearFeedbackBtn.addEventListener('click', handleClearFeedback);
    }

    /* ===================================================
       MODAL HELPERS
       =================================================== */
    function openModal(modalEl) {
        modalEl.classList.remove('hidden');
    }

    function closeModal(modalEl) {
        modalEl.classList.add('hidden');
    }

    /* ===================================================
       API KEY HANDLING
       =================================================== */
    function handleSaveApiKey() {
        const key = elements.apiKeyInput.value.trim();

        if (!key) {
            showStatus(elements.apiKeyStatus, 'Please enter your API key.', 'error');
            return;
        }

        if (!key.startsWith('sk-')) {
            showStatus(elements.apiKeyStatus, 'API keys typically start with "sk-". Please double-check.', 'error');
            return;
        }

        OpenAIService.setApiKey(key);
        showStatus(elements.apiKeyStatus, '✅ API key saved for this session.', 'success');

        // Update the header button to show key is set
        elements.apiKeyBtn.textContent = '🔑 Key Set';
        elements.apiKeyBtn.style.borderColor = '#10b981';
        elements.apiKeyBtn.style.color = '#10b981';

        // Close modal after a brief moment
        setTimeout(function() {
            closeModal(elements.apiKeyModal);
        }, 1000);
    }

    function showStatus(statusEl, message, type) {
        statusEl.textContent = message;
        statusEl.className = 'status-message ' + type;
        statusEl.classList.remove('hidden');
    }

    /* ===================================================
       PERSONA CHECKLIST RENDERING
       =================================================== */
    function renderPersonaChecklist() {
        // Read personas from personas.js
        const personas = getPersonas();

        // Build the HTML for the checklist
        let html = '';

        personas.forEach(function(persona, index) {
            html += `
                <label class="persona-item">
                    <input type="checkbox" value="${persona.id}" ${index === 0 ? 'checked' : ''}>
                    <div class="persona-info">
                        <strong>${persona.name}</strong>
                        <span>${persona.shortDescription}</span>
                    </div>
                </label>
            `;
        });

        elements.personaChecklist.innerHTML = html;
    }

    /* ===================================================
       FIGMA EMBED HANDLING
       =================================================== */
    function handleLoadFigma() {
        const url = elements.figmaUrl.value.trim();

        if (!url) {
            alert('Please paste a Figma prototype URL first.');
            return;
        }

        const success = FigmaEmbed.loadPrototype(url);

        if (success) {
            // Briefly flash the button green to confirm
            elements.loadFigmaBtn.textContent = '✅ Loaded';
            elements.loadFigmaBtn.style.backgroundColor = '#10b981';

            setTimeout(function() {
                elements.loadFigmaBtn.textContent = 'Load Prototype';
                elements.loadFigmaBtn.style.backgroundColor = '';
            }, 2000);
        }
    }

    /* ===================================================
       FEEDBACK GENERATION
       =================================================== */
    async function handleGenerateFeedback() {
        // 1. Check API key
        if (!OpenAIService.hasApiKey()) {
            alert('Please set your OpenAI API key first (click the 🔑 button in the header).');
            openModal(elements.apiKeyModal);
            return;
        }

        // 2. Check task description
        const task = elements.taskDescription.value.trim();
        if (!task) {
            alert('Please describe a task or scenario for the persona to evaluate.');
            return;
        }

        // 3. Get selected personas
        const checkboxes = elements.personaChecklist.querySelectorAll('input[type="checkbox"]:checked');
        if (checkboxes.length === 0) {
            alert('Please select at least one persona.');
            return;
        }

        const selectedIds = Array.from(checkboxes).map(cb => cb.value);
        const selectedPersonas = selectedIds.map(id => getPersonaById(id)).filter(Boolean);

        // 4. Get Figma URL (optional but useful for context)
        const figmaUrl = elements.figmaUrl.value.trim();

        // 5. Show loading overlay
        elements.loadingOverlay.classList.remove('hidden');

        // 6. Generate feedback for each selected persona
        currentFeedbackResults = [];

        try {
            for (const persona of selectedPersonas) {
                const result = await OpenAIService.generateFeedback(persona, task, figmaUrl);
                currentFeedbackResults.push(result);
            }

            // 7. Render feedback
            renderFeedback(currentFeedbackResults);

        } catch (error) {
            console.error('[App] Error generating feedback:', error);
            alert('Something went wrong while generating feedback. Check the console for details.');
        } finally {
            // 8. Hide loading overlay
            elements.loadingOverlay.classList.add('hidden');
        }
    }

    /* ===================================================
       FEEDBACK RENDERING
       =================================================== */
    function renderFeedback(results) {
        if (!results || results.length === 0) {
            elements.feedbackContainer.innerHTML = `
                <div class="placeholder">
                    <div class="placeholder-icon">💬</div>
                    <h3>No Feedback Yet</h3>
                    <p>Load a prototype, describe a task, and click "Generate Feedback"</p>
                </div>
            `;
            return;
        }

        let html = '';

        results.forEach(function(result) {
            html += `
                <div class="feedback-card">
                    <div class="feedback-card-header">
                        <span class="persona-badge">${result.personaName}</span>
                        <span style="font-size: 0.75rem; color: var(--color-text-muted);">
                            ${new Date(result.timestamp).toLocaleTimeString()}
                        </span>
                    </div>
                    <div class="feedback-card-body">
                        ${formatFeedbackText(result.feedback)}
                    </div>
                </div>
            `;
        });

        elements.feedbackContainer.innerHTML = html;
    }

    /**
     * Converts plain text or simple markdown-style feedback
     * into readable HTML paragraphs.
     */
    function formatFeedbackText(text) {
        if (!text) return '<p>No feedback generated.</p>';

        // Split by double newlines into paragraphs
        const paragraphs = text.split(/\n\n+/);

        let html = '';

        paragraphs.forEach(function(para) {
            const trimmed = para.trim();
            if (!trimmed) return;

            // Check if it looks like a heading (starts with ** or ##)
            if (trimmed.startsWith('## ') || trimmed.startsWith('**')) {
                const cleanHeading = trimmed.replace(/^[#*\s]+/, '').replace(/\*\*$/,'');
                html += `<h4>${cleanHeading}</h4>`;
            }
            // Check if it looks like a bullet list
            else if (trimmed.includes('\n- ') || trimmed.startsWith('- ')) {
                const items = trimmed.split('\n').filter(line => line.trim().startsWith('- '));
                html += '<ul>';
                items.forEach(function(item) {
                    html += `<li>${item.trim().substring(2)}</li>`;
                });
                html += '</ul>';
            }
            // Regular paragraph
            else {
                html += `<p>${trimmed}</p>`;
            }
        });

        return html || `<p>${text}</p>`;
    }

    /* ===================================================
       CLEAR FEEDBACK
       =================================================== */
    function handleClearFeedback() {
        currentFeedbackResults = [];
        renderFeedback([]);
        console.log('[App] Feedback cleared.');
    }

    /* ===================================================
       SAVE SESSION (placeholder behavior)
       =================================================== */
    function handleSaveSession() {
        if (currentFeedbackResults.length === 0) {
            alert('There is no feedback to save yet. Generate feedback first.');
            return;
        }

        const sessionData = {
            id: Date.now().toString(),
            figmaUrl: elements.figmaUrl.value.trim(),
            task: elements.taskDescription.value.trim(),
            results: currentFeedbackResults,
            savedAt: new Date().toISOString()
        };

        StorageService.saveSession(sessionData);
        alert('Session save will be fully implemented in Stage 5. (Placeholder for now.)');
    }

    /* ===================================================
       START THE APP
       =================================================== */
    init();

})();
