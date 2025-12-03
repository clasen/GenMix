const axios = require('axios');
const BaseGenerator = require('./BaseGenerator');
const fs = require('fs');
const path = require('path');

class GeminiGenerator extends BaseGenerator {
    /**
     * @param {Object} [config]
     * @param {string} [config.apiKey]
     * @param {string} [config.modelId]
     */
    constructor(config = {}) {
        super(config);
        this.apiKey = config.apiKey || process.env.GEMINI_API_KEY;

        if (!this.apiKey) {
            throw new Error('API Key is required. Provide it in the constructor or set GEMINI_API_KEY environment variable.');
        }
        // Use the specific model for image generation or default to pro-vision if needed
        // However, for standard image generation via prompt, specific models like 'gemini-1.5-pro' or 'imagen-3.0-generate-001' are often used.
        // Keeping the user's modelId preference.
        this.modelId = config.modelId || 'gemini-3-pro-image-preview';
        // NOTE: For simple generation, we might not need streamGenerateContent unless we want text streaming.
        // But let's stick to what worked for text, and adjust the body.
        this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelId}:streamGenerateContent`;
        this.referenceMetadata = null;
    }

    /**
     * @param {string} prompt
     * @param {Object} [options]
     * @param {string|Buffer} [options.referenceImage] - Path to image file, base64 data URI, or Buffer
     * @param {string} [options.numberOfImages] - Number of images to generate
     * @param {string} [options.quality] - Image quality: '1K', '2K', '4K'
     * @param {string} [options.aspectRatio] - Aspect ratio like '1:1', '16:9', etc.
     * @returns {Promise<{images: string[], text: string, raw: any}>}
     */
    async generate(prompt, options = {}) {
        // If the user asks for multiple images, we might need to make parallel requests
        // if the API doesn't support candidateCount > 1 for images.
        // Based on search results, candidateCount > 1 can cause 400 errors.
        const numberOfImages = options.numberOfImages || 1;

        let result;
        if (numberOfImages > 1) {
            result = await this.generateMultiple(prompt, numberOfImages, options);
        } else {
            result = await this._generateSingleRequest(prompt, options);
        }

        // Store result in state for saveImages()
        this.lastGeneration = {
            prompt: prompt,
            images: result.images,
            text: result.text,
            raw: result.raw
        };

        return result;
    }

    /**
     * Processes a reference image and returns base64 data and mime type
     * @param {string|Buffer} imageInput - File path, base64 data URI, or Buffer
     * @returns {Promise<{data: string, mimeType: string}>}
     * @private
     */
    async _processReferenceImage(imageInput) {
        let base64Data;
        let mimeType = 'image/png'; // default

        if (Buffer.isBuffer(imageInput)) {
            // If it's already a buffer
            base64Data = imageInput.toString('base64');
        } else if (typeof imageInput === 'string') {
            if (imageInput.startsWith('data:image/')) {
                // It's a data URI
                const match = imageInput.match(/^data:(image\/[^;]+);base64,(.+)$/);
                if (match) {
                    mimeType = match[1];
                    base64Data = match[2];
                } else {
                    throw new Error('Invalid data URI format for reference image');
                }
            } else if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
                // It's a URL - download it
                try {
                    const response = await axios.get(imageInput, { responseType: 'arraybuffer' });
                    base64Data = Buffer.from(response.data).toString('base64');
                    mimeType = response.headers['content-type'] || 'image/png';
                } catch (error) {
                    throw new Error(`Failed to download reference image from URL: ${error.message}`);
                }
            } else {
                // Assume it's a file path
                try {
                    const fileBuffer = fs.readFileSync(imageInput);
                    base64Data = fileBuffer.toString('base64');

                    // Determine mime type from extension
                    const ext = path.extname(imageInput).toLowerCase();
                    const mimeTypes = {
                        '.png': 'image/png',
                        '.jpg': 'image/jpeg',
                        '.jpeg': 'image/jpeg',
                        '.gif': 'image/gif',
                        '.webp': 'image/webp'
                    };
                    mimeType = mimeTypes[ext] || 'image/png';

                    // Extract metadata from reference image using sharp
                    await this._extractReferenceMetadata(imageInput);
                } catch (error) {
                    throw new Error(`Failed to read reference image file: ${error.message}`);
                }
            }
        } else {
            throw new Error('Reference image must be a file path, URL, data URI, or Buffer');
        }

        return { data: base64Data, mimeType };
    }

    /**
     * Extract metadata from reference image
     * @param {string} imagePath - Path to the reference image
     * @private
     */
    async _extractReferenceMetadata(imagePath) {
        const sharp = require('sharp');
        try {
            const image = sharp(imagePath);
            const metadata = await image.metadata();
            const stats = fs.statSync(imagePath);

            // Build format options based on image format
            const formatOptions = {
                format: metadata.format,
                width: metadata.width,
                height: metadata.height
            };

            // Format-specific options
            if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
                // Estimate quality from file size (heuristic)
                const pixelCount = metadata.width * metadata.height;
                const bytesPerPixel = stats.size / pixelCount;

                // Quality estimation based on bytes per pixel
                if (bytesPerPixel < 0.5) formatOptions.quality = 70;
                else if (bytesPerPixel < 1) formatOptions.quality = 80;
                else if (bytesPerPixel < 1.5) formatOptions.quality = 90;
                else formatOptions.quality = 90;
            } else if (metadata.format === 'png') {
                formatOptions.compressionLevel = 9;

                // Check if it's a palette PNG using paletteBitDepth
                if (metadata.paletteBitDepth) {
                    formatOptions.palette = true;
                    formatOptions.quality = 90; // Max quality for palette PNG
                    formatOptions.effort = 9; // Maximum compression effort

                    // Count actual unique colors in the image
                    try {
                        const { data, info } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });
                        const colors = new Set();
                        const pixelSize = info.channels;

                        for (let i = 0; i < data.length; i += pixelSize) {
                            const color = [];
                            for (let j = 0; j < pixelSize; j++) {
                                color.push(data[i + j]);
                            }
                            colors.add(color.join(','));
                        }

                        formatOptions.colours = colors.size;
                    } catch (error) {
                        // Fallback to paletteBitDepth calculation if color counting fails
                        formatOptions.colours = Math.pow(2, metadata.paletteBitDepth);
                    }
                }
            } else if (metadata.format === 'webp') {
                formatOptions.quality = 80;
            }

            this.referenceMetadata = formatOptions;
        } catch (error) {
            console.warn('Could not extract reference metadata:', error.message);
        }
    }

    /**
     * Get metadata from the last processed reference image
     * @returns {Object|null} Metadata object or null if no reference processed
     */
    getReferenceMetadata() {
        return this.referenceMetadata;
    }

    async generateMultiple(prompt, count, options) {
        const promises = [];
        for (let i = 0; i < count; i++) {
            promises.push(this._generateSingleRequest(prompt, options));
        }

        try {
            const results = await Promise.all(promises);

            const merged = {
                images: [],
                text: '',
                raw: results.map(r => r.raw),
            };

            for (const res of results) {
                merged.images.push(...res.images);
                if (res.text && !merged.text.includes(res.text)) {
                    merged.text += res.text + '\n';
                }
            }
            return merged;
        } catch (error) {
            throw error;
        }
    }

    async _generateSingleRequest(prompt, options) {
        const url = `${this.apiUrl}?key=${this.apiKey}`;

        // Build the parts array
        const parts = [];

        // Add reference image if provided
        if (options.referenceImage) {
            const imageData = await this._processReferenceImage(options.referenceImage);
            parts.push({
                inlineData: {
                    mimeType: imageData.mimeType,
                    data: imageData.data
                }
            });
        }

        // Add text prompt
        parts.push({
            text: prompt,
        });

        // Simplified data structure to minimize conflicts
        const data = {
            contents: [
                {
                    role: 'user', // Role is good practice
                    parts: parts,
                },
            ],
            // Only include generationConfig if there are specific options to set
            generationConfig: {
                // 'responseModalities' is often implied or specific to the model.
                // Removing explicit 'responseModalities' might help if the model detects intent from prompt.
                // But let's keep basic structure.
                // candidateCount MUST be 1 for many image models per request.
                candidateCount: 1,
            },
        };

        // Only add imageConfig if it's actually supported/needed. 
        // Some models might reject 'imageConfig' inside 'generationConfig' if they expect text.
        // However, if we are targeting an image model, we need to be careful.
        // Let's try sending a cleaner request first.

        // If specific image options are passed, add them carefully
        if (options.imageSize || options.aspectRatio || options.quality) {
            // Note: Not all models support 'imageConfig' this way. 
            // But if the user is using a model that supports it...
            data.generationConfig.imageConfig = {};

            // User mentioned quality is 1k, 2k, 4k. Mapping quality or imageSize to this.
            const size = options.quality || options.imageSize;
            if (size) {
                data.generationConfig.imageConfig.image_size = size; // Expects '1K', '2K', '4K'
            }

            if (options.aspectRatio) {
                data.generationConfig.imageConfig.aspect_ratio = options.aspectRatio;
            }
        }

        // Remove 'tools' unless explicitly requested or needed for search grounding.
        // 'googleSearch' tool might conflict with pure image generation intent on some endpoints.
        // data.tools = ... (removed)

        try {
            const response = await axios.post(url, data, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            return this.processResponse(response.data);
        } catch (error) {
            const errorMessage = error.response?.data?.error?.message || error.message;
            // Log detailed error for debugging
            if (error.response?.data) {
                console.error("API Error Details:", JSON.stringify(error.response.data, null, 2));
            }
            throw new Error(`Gemini API Error: ${errorMessage}`);
        }
    }

    processResponse(data) {
        // Handle stream response which might be an array of chunks
        const chunks = Array.isArray(data) ? data : [data];
        const images = [];
        let fullText = '';

        for (const chunk of chunks) {
            if (chunk.candidates) {
                for (const candidate of chunk.candidates) {
                    if (candidate.content && candidate.content.parts) {
                        for (const part of candidate.content.parts) {
                            if (part.text) {
                                fullText += part.text;
                            }
                            if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
                                // Base64 image data
                                images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                            }
                            // Handle executable code or other parts if necessary
                        }
                    }
                }
            }
        }

        return {
            images,
            text: fullText,
            raw: data,
        };
    }
}

module.exports = GeminiGenerator;
