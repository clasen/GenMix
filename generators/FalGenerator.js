const axios = require('axios');
const BaseGenerator = require('./BaseGenerator');
const fs = require('fs');
const path = require('path');

class FalGenerator extends BaseGenerator {
    static MODELS = {
        BANANA_2: 'fal-ai/nano-banana-2/edit',
        BANANA_PRO_EDIT: 'fal-ai/nano-banana-pro/edit'
    };

    static SUPPORTED_ASPECT_RATIOS_BY_MODEL = {
        [FalGenerator.MODELS.BANANA_2]: new Set([
            'auto',
            '21:9',
            '16:9',
            '3:2',
            '4:3',
            '5:4',
            '1:1',
            '4:5',
            '3:4',
            '2:3',
            '9:16',
            '4:1',
            '1:4',
            '8:1',
            '1:8'
        ]),
        [FalGenerator.MODELS.BANANA_PRO_EDIT]: new Set([
            'auto',
            '21:9',
            '16:9',
            '3:2',
            '4:3',
            '5:4',
            '1:1',
            '4:5',
            '3:4',
            '2:3',
            '9:16'
        ])
    };

    static SUPPORTED_RESOLUTIONS_BY_MODEL = {
        [FalGenerator.MODELS.BANANA_2]: new Set(['0.5K', '1K', '2K', '4K']),
        [FalGenerator.MODELS.BANANA_PRO_EDIT]: new Set(['1K', '2K', '4K'])
    };

    static COMMON_ASPECT_RATIOS = new Set([
        'auto',
        '21:9',
        '16:9',
        '3:2',
        '4:3',
        '5:4',
        '1:1',
        '4:5',
        '3:4',
        '2:3',
        '9:16'
    ]);

    constructor(config = {}) {
        super(config);
        this.apiKey = config.apiKey || process.env.FAL_API_KEY;
        if (!this.apiKey) {
            throw new Error('API Key is required. Provide it in the constructor or set FAL_API_KEY environment variable.');
        }
        this.modelId = config.modelId || FalGenerator.MODELS.BANANA_2;
        this.apiUrl = `https://fal.run/${this.modelId}`;
        this.references = [];
    }

    banana2() {
        this.modelId = FalGenerator.MODELS.BANANA_2;
        this.apiUrl = `https://fal.run/${this.modelId}`;
        return this;
    }

    bananaPro() {
        this.modelId = FalGenerator.MODELS.BANANA_PRO_EDIT;
        this.apiUrl = `https://fal.run/${this.modelId}`;
        return this;
    }

    pro() {
        return this.bananaPro();
    }

    flash() {
        return this.banana2();
    }

    addReference(image, description = '') {
        this.references.push({ image, description });
        return this;
    }

    clearReferences() {
        this.references = [];
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
        const normalized = { ...options };
        const hasWidth = normalized.width !== undefined && normalized.width !== null;
        const hasHeight = normalized.height !== undefined && normalized.height !== null;

        if (hasWidth !== hasHeight) {
            throw new Error('Both options.width and options.height are required together.');
        }

        if (hasWidth && hasHeight) {
            const width = Number(normalized.width);
            const height = Number(normalized.height);

            if (!Number.isInteger(width) || width <= 0) {
                throw new Error('options.width must be a positive integer.');
            }
            if (!Number.isInteger(height) || height <= 0) {
                throw new Error('options.height must be a positive integer.');
            }

            const derivedRatio = this._deriveAspectRatio(width, height);
            if (normalized.aspectRatio && normalized.aspectRatio !== derivedRatio) {
                throw new Error(`Aspect ratio mismatch: options.aspectRatio ${normalized.aspectRatio} does not match options.width/options.height (${derivedRatio}).`);
            }

            normalized.width = width;
            normalized.height = height;
            normalized.aspectRatio = derivedRatio;
        }

        const supportedRatios = FalGenerator.SUPPORTED_ASPECT_RATIOS_BY_MODEL[this.modelId] || FalGenerator.COMMON_ASPECT_RATIOS;
        if (normalized.aspectRatio && !supportedRatios.has(normalized.aspectRatio)) {
            if (hasWidth && hasHeight) {
                normalized.aspectRatio = 'auto';
            } else {
                throw new Error(`Unsupported aspect ratio for Fal provider: ${normalized.aspectRatio}.`);
            }
        }

        return normalized;
    }

    _mapQualityToResolution(quality) {
        const mapped = String(quality || '1K').toUpperCase();
        const supportedResolutions = FalGenerator.SUPPORTED_RESOLUTIONS_BY_MODEL[this.modelId] || new Set(['1K', '2K', '4K']);
        if (!supportedResolutions.has(mapped)) {
            throw new Error(`options.quality must be one of: ${Array.from(supportedResolutions).join(', ')}.`);
        }
        return mapped;
    }

    _isHttpUrl(value) {
        return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
    }

    _isDataUri(value) {
        return typeof value === 'string' && /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value.trim());
    }

    _detectMimeTypeFromPath(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.tif': 'image/tiff',
            '.tiff': 'image/tiff',
            '.avif': 'image/avif'
        };
        return mimeTypes[ext] || 'image/png';
    }

    _toDataUriFromBuffer(buffer, mimeType = 'image/png') {
        return `data:${mimeType};base64,${buffer.toString('base64')}`;
    }

    async _normalizeImageReference(value) {
        if (Buffer.isBuffer(value)) {
            return this._toDataUriFromBuffer(value, 'image/png');
        }

        if (typeof value !== 'string') {
            throw new Error('Fal references must be URL, data URI, local file path, or Buffer.');
        }

        const trimmed = value.trim();
        if (!trimmed) {
            throw new Error('Fal reference cannot be empty.');
        }

        if (this._isHttpUrl(trimmed) || this._isDataUri(trimmed)) {
            return trimmed;
        }

        if (!fs.existsSync(trimmed)) {
            throw new Error(`Fal reference file not found: ${trimmed}`);
        }

        const fileBuffer = fs.readFileSync(trimmed);
        const mimeType = this._detectMimeTypeFromPath(trimmed);
        return this._toDataUriFromBuffer(fileBuffer, mimeType);
    }

    async _collectImageUrls(options = {}) {
        const rawReferences = [];

        if (Array.isArray(options.imageUrls)) {
            for (const value of options.imageUrls) {
                if ((typeof value === 'string' && value.trim()) || Buffer.isBuffer(value)) {
                    rawReferences.push(value);
                }
            }
        }

        if ((typeof options.referenceImage === 'string' && options.referenceImage.trim()) || Buffer.isBuffer(options.referenceImage)) {
            rawReferences.push(options.referenceImage);
        }

        for (const ref of this.references) {
            if ((typeof ref.image === 'string' && ref.image.trim()) || Buffer.isBuffer(ref.image)) {
                rawReferences.push(ref.image);
            }
        }

        const normalizedUrls = [];
        for (const reference of rawReferences) {
            normalizedUrls.push(await this._normalizeImageReference(reference));
        }

        const uniqueUrls = Array.from(new Set(normalizedUrls));
        return uniqueUrls;
    }

    async generate(prompt, options = {}) {
        if (!prompt || !String(prompt).trim()) {
            throw new Error('Prompt is required.');
        }

        const normalizedOptions = this._normalizeGenerateOptions(options);
        const numberOfImages = normalizedOptions.numberOfImages || 1;

        if (!Number.isInteger(numberOfImages) || numberOfImages < 1 || numberOfImages > 4) {
            throw new Error('options.numberOfImages must be an integer between 1 and 4 for Fal Nano Banana models.');
        }

        const payload = {
            prompt: String(prompt).trim(),
            num_images: numberOfImages,
            resolution: this._mapQualityToResolution(normalizedOptions.quality),
            aspect_ratio: normalizedOptions.aspectRatio || 'auto'
        };

        const imageUrls = await this._collectImageUrls(normalizedOptions);
        if (imageUrls.length === 0) {
            throw new Error('Fal Nano Banana edit models require at least one reference image. Use addReference() or options.referenceImage.');
        }
        payload.image_urls = imageUrls;

        try {
            const response = await axios.post(this.apiUrl, payload, {
                headers: {
                    Authorization: `Key ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await this.processResponse(response.data);
            this.lastGeneration = {
                prompt: String(prompt).trim(),
                images: result.images,
                text: result.text,
                raw: result.raw,
                formatOptions: normalizedOptions.width && normalizedOptions.height
                    ? { width: normalizedOptions.width, height: normalizedOptions.height }
                    : null
            };
            this.references = [];
            return result;
        } catch (error) {
            const apiError = error.response?.data;
            const message = apiError?.detail || apiError?.error || error.message;
            throw new Error(`Fal API Error: ${message}`);
        }
    }

    async processResponse(data) {
        const imageEntries = Array.isArray(data?.images) ? data.images : [];
        const images = [];

        for (const entry of imageEntries) {
            if (!entry || !entry.url) {
                continue;
            }

            const mediaResponse = await axios.get(entry.url, { responseType: 'arraybuffer' });
            const contentType = entry.content_type || mediaResponse.headers['content-type'] || 'image/png';
            const base64 = Buffer.from(mediaResponse.data).toString('base64');
            images.push(`data:${contentType};base64,${base64}`);
        }

        return {
            images,
            text: data?.description || '',
            raw: data
        };
    }
}

module.exports = FalGenerator;
