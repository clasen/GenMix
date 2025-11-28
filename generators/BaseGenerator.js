const fs = require('fs');
const path = require('path');
const hashFactory = require('hash-factory');
const sharp = require('sharp');

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
     * Saves generated images to the specified directory using hashed filenames or custom filename.
     * @param {Object} [options={}] - Save options
     * @param {string} [options.directory='.'] - Target directory path. Defaults to current directory.
     * @param {string} [options.filename] - Optional custom filename (without extension). If not provided, uses hashed filenames.
     * @param {string} [options.extension='jpg'] - File extension: 'jpg', 'png', 'webp', 'avif', 'tiff'. Defaults to 'jpg'.
     * @returns {Promise<string[]>} Promise that resolves to array of saved file paths.
     */
    async save({directory = '.', filename = null, extension = 'jpg'} = {}) {
        const targetImages = this.lastGeneration?.images;
        const targetPrompt = this.lastGeneration?.prompt;

        if (!targetImages || !Array.isArray(targetImages) || targetImages.length === 0) {
            console.warn('No images to save.');
            return [];
        }

        if (!targetPrompt && !filename) {
            console.warn('No prompt available for hash generation.');
        }

        // Ensure directory exists
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }

        // Normalize extension
        extension = extension.toLowerCase().replace(/^\./, '');
        
        // Validate extension
        const supportedFormats = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'tiff', 'tif'];
        if (!supportedFormats.includes(extension)) {
            throw new Error(`Unsupported extension: ${extension}. Supported formats: ${supportedFormats.join(', ')}`);
        }

        // Normalize jpeg/jpg
        const sharpFormat = extension === 'jpeg' ? 'jpg' : extension;
        const fileExtension = extension === 'jpeg' ? 'jpg' : extension;

        const savedPaths = [];
        
        for (let index = 0; index < targetImages.length; index++) {
            const imgData = targetImages[index];
            const base64Data = imgData.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');

            let fileName;
            if (filename) {
                // Use custom filename, add index if multiple images
                if (targetImages.length > 1) {
                    fileName = `${filename}_${index}.${fileExtension}`;
                } else {
                    fileName = `${filename}.${fileExtension}`;
                }
            } else {
                // Use hash-based filename
                const hash = this.generateHash(targetPrompt + '_' + index);
                fileName = `${hash}.${fileExtension}`;
            }
            
            const outputPath = path.join(directory, fileName);

            // Convert image format using sharp
            try {
                await sharp(buffer)
                    .toFormat(sharpFormat)
                    .toFile(outputPath);
                
                savedPaths.push(outputPath);
            } catch (error) {
                console.error(`Error saving image ${fileName}:`, error.message);
                throw error;
            }
        }

        return savedPaths;
    }
}

module.exports = BaseGenerator;
