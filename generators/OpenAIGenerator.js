const BaseGenerator = require('./BaseGenerator');
const fs = require('fs/promises');
const sharp = require('sharp');

class OpenAIGenerator extends BaseGenerator {
    static MODELS = {
        SUNBURST: 'gpt-image-2.5-sunburst',
        FLARE: 'gpt-image-2.5-flare'
    };

    constructor(config = {}) {
        super(config);
        this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
        if (!this.apiKey) {
            throw new Error('API Key is required. Provide it in the constructor or set OPENAI_API_KEY environment variable.');
        }
        this.modelId = config.modelId || OpenAIGenerator.MODELS.SUNBURST;
        this.references = [];
    }

    sunburst() {
        this.modelId = OpenAIGenerator.MODELS.SUNBURST;
        return this;
    }

    flare() {
        this.modelId = OpenAIGenerator.MODELS.FLARE;
        return this;
    }

    addReference(image, description = '') {
        this.references.push({ image, description });
        return this;
    }

    clearReferences() {
        this.references = [];
        return this;
    }

    async _referenceBlob(image) {
        let buffer;
        if (Buffer.isBuffer(image)) {
            buffer = image;
        } else if (typeof image === 'string' && /^https?:\/\//i.test(image)) {
            const response = await fetch(image);
            if (!response.ok) throw new Error(`Failed to download reference: HTTP ${response.status}`);
            buffer = Buffer.from(await response.arrayBuffer());
        } else if (typeof image === 'string' && image.startsWith('data:')) {
            const match = image.match(/^data:image\/[\w.+-]+;base64,([A-Za-z0-9+/=\s]+)$/);
            if (!match) throw new Error('Invalid reference image data URI.');
            buffer = Buffer.from(match[1], 'base64');
        } else if (typeof image === 'string' && image.trim()) {
            buffer = await fs.readFile(image);
        } else {
            throw new Error('Reference image must be a file path, URL, data URI, or Buffer.');
        }
        const { format } = await sharp(buffer).metadata();
        if (!['png', 'jpeg', 'webp'].includes(format)) {
            throw new Error('OpenAI references must be PNG, JPEG, or WebP images.');
        }
        return new Blob([buffer], { type: `image/${format}` });
    }

    async generate(prompt, options = {}) {
        if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('Prompt is required.');
        const n = options.numberOfImages ?? 1;
        if (!Number.isInteger(n) || n < 1 || n > 10) throw new Error('options.numberOfImages must be an integer between 1 and 10.');
        const quality = options.quality ?? 'auto';
        if (!['low', 'medium', 'high', 'xhigh', 'max', 'auto'].includes(quality)) {
            throw new Error('options.quality must be low, medium, high, xhigh, max, or auto.');
        }
        const hasWidth = options.width != null;
        const hasHeight = options.height != null;
        if (hasWidth !== hasHeight) throw new Error('Both options.width and options.height are required together.');
        const width = Number(options.width);
        const height = Number(options.height);
        if (hasWidth && (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0)) {
            throw new Error('options.width and options.height must be positive integers.');
        }
        let ratio = hasWidth ? width / height : null;
        if (options.aspectRatio && options.aspectRatio !== 'auto') {
            const match = options.aspectRatio.match(/^(\d+):(\d+)$/);
            if (!match || Number(match[1]) <= 0 || Number(match[2]) <= 0) throw new Error('Invalid aspect ratio.');
            const requestedRatio = Number(match[1]) / Number(match[2]);
            if (ratio && Math.abs(ratio - requestedRatio) > 1e-10) throw new Error('Aspect ratio mismatch with options.width/options.height.');
            ratio = requestedRatio;
        }
        if (ratio && (ratio < 1 / 3 || ratio > 3)) throw new Error('OpenAI aspect ratio must be between 1:3 and 3:1.');
        const size = ratio
            ? `${Math.round(Math.sqrt(1024 * 1024 * ratio) / 16) * 16}x${Math.round(Math.sqrt(1024 * 1024 / ratio) / 16) * 16}`
            : 'auto';
        const references = [...this.references];
        if (options.referenceImage != null) references.push({ image: options.referenceImage, description: '' });
        const descriptions = references.flatMap((ref, index) => ref.description ? [`Image ${index + 1}: ${ref.description}`] : []);
        const payload = { model: this.modelId, prompt: [...descriptions, prompt].join('\n'), n, quality, size, output_format: 'png' };
        const headers = { Authorization: `Bearer ${this.apiKey}` };
        let body;
        if (references.length) {
            body = new FormData();
            for (const [key, value] of Object.entries(payload)) body.append(key, String(value));
            for (const [index, ref] of references.entries()) {
                const blob = await this._referenceBlob(ref.image);
                body.append('image[]', blob, `reference-${index}.${blob.type.split('/')[1]}`);
            }
        } else {
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(payload);
        }
        const response = await fetch(`https://api.openai.com/v1/images/${references.length ? 'edits' : 'generations'}`, { method: 'POST', headers, body });
        if (!response.ok) {
            let error;
            try { error = await response.json(); } catch {}
            throw new Error(`OpenAI API Error: ${error?.error?.message || `HTTP ${response.status}`}`);
        }
        const raw = await response.json();
        if (!Array.isArray(raw.data) || !raw.data.length || raw.data.some(entry => !entry?.b64_json)) {
            throw new Error('OpenAI API returned no valid image data.');
        }
        const result = { images: raw.data.map(entry => `data:image/png;base64,${entry.b64_json}`), text: '', raw };
        this.lastGeneration = { prompt, ...result, formatOptions: hasWidth ? { width, height } : null };
        this.clearReferences();
        return result;
    }
}

module.exports = OpenAIGenerator;
