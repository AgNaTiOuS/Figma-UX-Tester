/* ===================================================
   OPENAI.JS — Handles communication with OpenAI API
   (Placeholder — full implementation in Stage 4)
   =================================================== */

const OpenAIService = {

    apiKey: null,

    /**
     * Stores the API key in memory (NOT in code, NOT on disk).
     */
    setApiKey: function(key) {
        this.apiKey = key;
        console.log('[OpenAI] API key set (stored in memory only).');
    },

    /**
     * Checks if an API key has been provided.
     */
    hasApiKey: function() {
        return this.apiKey && this.apiKey.trim().startsWith('sk-');
    },

    /**
     * Placeholder for generating feedback.
     * Will be replaced with real API call in Stage 4.
     */
    generateFeedback: async function(persona, taskDescription, figmaUrl) {
        console.log('[OpenAI] generateFeedback called (placeholder).');
        return {
            personaId: persona.id,
            personaName: persona.name,
            feedback: 'Feedback generation will be implemented in Stage 4. The AI system is not yet connected.',
            timestamp: new Date().toISOString()
        };
    }
};
