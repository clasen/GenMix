const fs = require('fs');
const path = require('path');
const hashFactory = require('hash-factory');

class BaseGenerator {
    constructor(config = {}) {
        this.config = config;
        this.lastGeneration = null;
    }

    /**
     * Generates a hash from the text prompt.
     * @param {string} prompt 
     * @param {Object} options 
     * @returns {string}
     */
    generateHash(prompt, options = { alpha: true, words: true, now: true }) {
        const hasher = hashFactory(options);
        return hasher(prompt);
    }

    /**
     * Saves generated images to the specified directory using hashed filenames.
     * @param {string} directory - Target directory path.
     * @returns {string[]} Array of saved file paths.
     */
    save(directory) {
        const extension = 'png';
        const targetImages = this.lastGeneration?.images;
        const targetPrompt = this.lastGeneration?.prompt;

        if (!targetImages || !Array.isArray(targetImages) || targetImages.length === 0) {
            console.warn('No images to save.');
            return [];
        }

        if (!targetPrompt) {
            console.warn('No prompt available for hash generation.');
        }

        // Ensure directory exists
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }

        const savedPaths = [];
        targetImages.forEach((imgData, index) => {
            const base64Data = imgData.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');

            const hash = this.generateHash(targetPrompt + '_' + index);
            const fileName = `${hash}.${extension}`;
            const outputPath = path.join(directory, fileName);

            fs.writeFileSync(outputPath, buffer);
            savedPaths.push(outputPath);
        });

        return savedPaths;
    }
}

module.exports = BaseGenerator;
