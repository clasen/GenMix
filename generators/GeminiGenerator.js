const BaseGenerator = require('./BaseGenerator');
const fs = require('fs');
const path = require('path');

class GeminiGenerator extends BaseGenerator {
    static MODELS = {
        PRO: 'gemini-3-pro-image-preview',
        FLASH: 'gemini-3.1-flash-image-preview',
    };

    /**
     * @param {Object} [config]
     * @param {string} [config.apiKey]
     * @param {string} [config.modelId] - Model ID or use GeminiGenerator.MODELS constants
     */
    constructor(config = {}) {
        super(config);
        this.apiKey = config.apiKey || process.env.GEMINI_API_KEY;

        if (!this.apiKey) {
            throw new Error('API Key is required. Provide it in the constructor or set GEMINI_API_KEY environment variable.');
        }
        this.modelId = config.modelId || GeminiGenerator.MODELS.FLASH;
        this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelId}:streamGenerateContent`;
        this.referenceMetadata = null;
        this.references = [];
    }

    /**
     * Add a reference image to be included in the next generate() call.
     * @param {string|Buffer} image - Path to image file, URL, base64 data URI, or Buffer
     * @param {string} [description] - How the model should use this image (e.g. 'use as background')
     * @returns {GeminiGenerator} this instance for chaining
     */
    addReference(image, description = '') {
        this.references.push({ image, description });
        return this;
    }

    /**
     * Remove all queued reference images.
     * @returns {GeminiGenerator} this instance for chaining
     */
    clearReferences() {
        this.references = [];
        return this;
    }

    /**
     * Switch to the Pro model
     * @returns {GeminiGenerator} this instance for chaining
     */
    pro() {
        this.modelId = GeminiGenerator.MODELS.PRO;
        this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelId}:streamGenerateContent`;
        return this;
    }

    /**
     * Switch to the Flash model
     * @returns {GeminiGenerator} this instance for chaining
     */
    flash() {
        this.modelId = GeminiGenerator.MODELS.FLASH;
        this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelId}:streamGenerateContent`;
        return this;
    }

    _gcd(a, b) {
        let x = Math.abs(a);
        let y = Math.abs(b);
        while (y !== 0) {
            const t = y;
            y = x % y;
            x = t;
        }
        return x || 1;
    }

    _deriveAspectRatio(width, height) {
        const divisor = this._gcd(width, height);
        return `${width / divisor}:${height / divisor}`;
    }

    _normalizeGenerateOptions(options = {}) {
        const normalizedOptions = { ...options };
        const hasWidth = normalizedOptions.width !== undefined && normalizedOptions.width !== null;
        const hasHeight = normalizedOptions.height !== undefined && normalizedOptions.height !== null;

        if (hasWidth !== hasHeight) {
            throw new Error('Both options.width and options.height are required together.');
        }

        if (hasWidth && hasHeight) {
            const width = Number(normalizedOptions.width);
            const height = Number(normalizedOptions.height);

            if (!Number.isInteger(width) || width <= 0) {
                throw new Error('options.width must be a positive integer.');
            }
            if (!Number.isInteger(height) || height <= 0) {
                throw new Error('options.height must be a positive integer.');
            }

            const derivedRatio = this._deriveAspectRatio(width, height);
            if (normalizedOptions.aspectRatio && normalizedOptions.aspectRatio !== derivedRatio) {
                throw new Error(`Aspect ratio mismatch: options.aspectRatio ${normalizedOptions.aspectRatio} does not match options.width/options.height (${derivedRatio}).`);
            }

            normalizedOptions.aspectRatio = derivedRatio;
            normalizedOptions.width = width;
            normalizedOptions.height = height;
        }

        return normalizedOptions;
    }

    /**
     * @param {string} prompt
     * @param {Object} [options]
     * @param {string|Buffer} [options.referenceImage] - Path to image file, base64 data URI, or Buffer (legacy single-image API)
     * @param {string} [options.numberOfImages] - Number of images to generate
     * @param {string} [options.quality] - Image quality: '1K', '2K', '4K'
     * @param {string} [options.aspectRatio] - Aspect ratio like '1:1', '16:9', etc.
     * @param {number} [options.width] - Final output width in pixels (requires options.height)
     * @param {number} [options.height] - Final output height in pixels (requires options.width)
     * @returns {Promise<{images: string[], text: string, raw: any}>}
     */
    async generate(prompt, options = {}) {
        const normalizedOptions = this._normalizeGenerateOptions(options);
        // If the user asks for multiple images, we might need to make parallel requests
        // if the API doesn't support candidateCount > 1 for images.
        // Based on search results, candidateCount > 1 can cause 400 errors.
        const numberOfImages = normalizedOptions.numberOfImages || 1;

        let result;
        if (numberOfImages > 1) {
            result = await this.generateMultiple(prompt, numberOfImages, normalizedOptions);
        } else {
            result = await this._generateSingleRequest(prompt, normalizedOptions);
        }

        // Store result in state for saveImages()
        this.lastGeneration = {
            prompt: prompt,
            images: result.images,
            text: result.text,
            raw: result.raw,
            formatOptions: normalizedOptions.width && normalizedOptions.height
                ? { width: normalizedOptions.width, height: normalizedOptions.height }
                : null
        };

        this.references = [];

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
                    const response = await fetch(imageInput);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status} ${response.statusText}`);
                    }

                    const binaryData = await response.arrayBuffer();
                    base64Data = Buffer.from(binaryData).toString('base64');
                    mimeType = response.headers.get('content-type') || 'image/png';
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

    /**
     * Builds the API parts array from queued references + prompt.
     * Each reference becomes [inlineData, text description (if any)], followed by the main prompt.
     * @param {string} prompt
     * @returns {Promise<Object[]>}
     * @private
     */
    async _buildReferenceParts(prompt) {
        const parts = [];

        for (const ref of this.references) {
            const imageData = await this._processReferenceImage(ref.image);
            parts.push({
                inlineData: {
                    mimeType: imageData.mimeType,
                    data: imageData.data
                }
            });
            if (ref.description) {
                parts.push({ text: `Reference: ${ref.description}` });
            }
        }

        parts.push({ text: prompt });
        return parts;
    }

    async _generateSingleRequest(prompt, options) {
        const url = `${this.apiUrl}?key=${this.apiKey}`;

        // Legacy single-image API: promote to references for unified code path
        if (options.referenceImage && this.references.length === 0) {
            this.addReference(options.referenceImage);
        }

        const parts = await this._buildReferenceParts(prompt);

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
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const responseBody = await this._parseResponseBody(response);
            if (!response.ok) {
                const apiError = responseBody && typeof responseBody === 'object' ? responseBody : null;
                const errorMessage = apiError?.error?.message
                    || (typeof responseBody === 'string' ? responseBody : null)
                    || `HTTP ${response.status} ${response.statusText}`;

                if (apiError) {
                    console.error("API Error Details:", JSON.stringify(apiError, null, 2));
                }
                throw new Error(errorMessage);
            }

            return this.processResponse(responseBody);
        } catch (error) {
            throw new Error(`Gemini API Error: ${error.message}`);
        }
    }

    async _parseResponseBody(response) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            return response.json();
        }

        const textBody = await response.text();
        if (!textBody) {
            return null;
        }

        try {
            return JSON.parse(textBody);
        } catch (error) {
            return textBody;
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
