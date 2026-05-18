/* ===================================================
   FIGMA.JS — Handles Figma URL parsing and embedding
   =================================================== */

/**
 * Takes a raw Figma share URL and converts it to an embed URL.
 * 
 * Figma share links look like:
 *   https://www.figma.com/proto/ABC123/FileName?node-id=...
 *   https://www.figma.com/design/ABC123/FileName?node-id=...
 *   https://www.figma.com/file/ABC123/FileName?node-id=...
 * 
 * The embed URL format is:
 *   https://www.figma.com/embed?embed_host=share&url=ENCODED_ORIGINAL_URL
 */

const FigmaEmbed = {

    /**
     * Validates that a URL is a legitimate Figma link.
     * Returns true if valid, false if not.
     */
    isValidFigmaUrl: function(url) {
        if (!url || typeof url !== 'string') return false;

        const trimmed = url.trim();

        // Must start with https://www.figma.com/ or https://figma.com/
        const figmaPattern = /^https:\/\/(www\.)?figma\.com\/(proto|design|file|slides)\/.+/i;

        return figmaPattern.test(trimmed);
    },

    /**
     * Converts a Figma share URL into an embed URL.
     * Returns the embed URL string, or null if the input is invalid.
     */
    getEmbedUrl: function(shareUrl) {
        if (!this.isValidFigmaUrl(shareUrl)) {
            return null;
        }

        const trimmed = shareUrl.trim();
        const encoded = encodeURIComponent(trimmed);

        return `https://www.figma.com/embed?embed_host=share&url=${encoded}`;
    },

    /**
     * Loads a Figma prototype into the app's right panel.
     * - Removes the placeholder message
     * - Creates an iframe with the embed URL
     * - Inserts it into the figma-container div
     * 
     * Returns true if successful, false if the URL was invalid.
     */
    loadPrototype: function(shareUrl) {
        const container = document.getElementById('figma-container');
        const placeholder = document.getElementById('figma-placeholder');

        // Validate the URL
        const embedUrl = this.getEmbedUrl(shareUrl);

        if (!embedUrl) {
            this.showError(container, 'That doesn\'t look like a valid Figma URL. Please paste a link that starts with https://www.figma.com/proto/, /design/, or /file/');
            return false;
        }

        // Remove the placeholder (or any previous iframe)
        container.innerHTML = '';

        // Create the iframe
        const iframe = document.createElement('iframe');
        iframe.src = embedUrl;
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('loading', 'lazy');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';

        // Add it to the container
        container.appendChild(iframe);

        console.log('[Figma] Prototype loaded:', shareUrl);
        return true;
    },

    /**
     * Resets the right panel back to the placeholder state.
     */
    clearPrototype: function() {
        const container = document.getElementById('figma-container');

        container.innerHTML = `
            <div id="figma-placeholder" class="placeholder">
                <div class="placeholder-icon">📐</div>
                <h3>No Prototype Loaded</h3>
                <p>Paste a Figma prototype share link on the left and click "Load Prototype"</p>
            </div>
        `;

        console.log('[Figma] Prototype cleared.');
    },

    /**
     * Shows an error message inside the Figma container.
     */
    showError: function(container, message) {
        container.innerHTML = `
            <div class="placeholder">
                <div class="placeholder-icon">⚠️</div>
                <h3>Invalid URL</h3>
                <p>${message}</p>
            </div>
        `;
    }
};
