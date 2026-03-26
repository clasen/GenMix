#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const GeminiGenerator = require('./generators/GeminiGenerator');
const FalGenerator = require('./generators/FalGenerator');

const CONFIG_DIR = path.join(os.homedir(), '.genmix');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'tiff', 'tif', 'gif']);

function color(code, message) {
    return `\x1b[${code}m${message}\x1b[0m`;
}

function info(message) {
    console.log(color('36', message));
}

function success(message) {
    console.log(color('32', message));
}

function error(message) {
    console.error(color('31', message));
}

function loadConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
        return {};
    }

    try {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
        if (!raw.trim()) {
            return {};
        }
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (err) {
        throw new Error(`Failed reading config at ${CONFIG_PATH}: ${err.message}`);
    }
}

function saveConfig(config) {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

function promptQuestion(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

async function promptApiKey() {
    const apiKey = (await promptQuestion('Enter your Gemini API key: ')).trim();
    if (!apiKey) {
        throw new Error('API key cannot be empty.');
    }
    return apiKey;
}

async function promptFalApiKey() {
    const apiKey = (await promptQuestion('Enter your Fal API key: ')).trim();
    if (!apiKey) {
        throw new Error('API key cannot be empty.');
    }
    return apiKey;
}

function printHelp() {
    console.log(`
Usage:
  genmix "prompt text" [options]
  genmix --config
  genmix --help

Options:
  -p, --provider <gemini|fal> Provider (default: gemini)
  -n, --number <N>        Number of images (default: 1)
  -q, --quality <1K|2K|4K> Image quality (default: 1K)
  -r, --ratio <ratio>     Aspect ratio (default: 1:1 for gemini, auto for fal)
  --width <px>            Final output width in pixels (requires --height)
  --height <px>           Final output height in pixels (requires --width)
  -m, --model <...>       Model by provider:
                          gemini -> pro|flash (default: flash)
                          fal -> pro|flash (aliases: banana-pro|banana2|2, default: flash)
  -o, --output <path>     Output directory OR full output file path
  -f, --format <format>   Output format when output is a directory (default: jpg)
  --no-sharp              Save raw model bytes without Sharp conversion
  --ref <path[:text]>     Reference image; optional description after ":" (repeatable)
                          For URLs, use plain URL or URL::description
  --help                  Show this help message
  --config                Set or update persisted API key

Examples:
  genmix "cyberpunk city at night"
  genmix "restyle this room" --provider fal --ref ./room.jpg
  genmix "edit this image with sunset light" --provider fal -m banana-pro --ref "https://example.com/photo.jpg"
  genmix "logo in watercolor style" -n 2 -q 2K -o ./output
  genmix "app icon" -q 4K --width 400 --height 400 --output ./renders/icon.png
  genmix "new version of this room" --ref room.jpg:"keep composition"
  genmix "portrait variation" --ref subject.png --output ./renders/portrait.png
`);
}

function parseRefValue(value) {
    const raw = value.trim();
    const explicitSeparatorIndex = raw.indexOf('::');
    if (explicitSeparatorIndex !== -1) {
        return {
            imagePath: raw.slice(0, explicitSeparatorIndex).trim(),
            description: raw.slice(explicitSeparatorIndex + 2).trim()
        };
    }

    if (/^https?:\/\//i.test(raw)) {
        return { imagePath: raw, description: '' };
    }

    const firstColonIndex = raw.indexOf(':');
    if (firstColonIndex === -1) {
        return { imagePath: raw, description: '' };
    }

    const imagePath = raw.slice(0, firstColonIndex).trim();
    const description = raw.slice(firstColonIndex + 1).trim();
    return { imagePath, description };
}

function parseArgs(argv) {
    const parsed = {
        promptParts: [],
        references: [],
        provider: 'gemini',
        numberOfImages: 1,
        quality: '1K',
        aspectRatio: null,
        aspectRatioWasProvided: false,
        model: null,
        modelWasProvided: false,
        output: '.',
        format: 'jpg',
        targetWidth: null,
        targetHeight: null,
        useSharp: true,
        showHelp: false,
        runConfig: false
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        const next = argv[i + 1];

        if (arg === '--help' || arg === '-h') {
            parsed.showHelp = true;
            continue;
        }

        if (arg === '--config') {
            parsed.runConfig = true;
            continue;
        }

        if (arg === '-n' || arg === '--number') {
            if (!next) throw new Error(`${arg} requires a value.`);
            parsed.numberOfImages = Number(next);
            i += 1;
            continue;
        }

        if (arg === '-q' || arg === '--quality') {
            if (!next) throw new Error(`${arg} requires a value.`);
            parsed.quality = next;
            i += 1;
            continue;
        }

        if (arg === '-p' || arg === '--provider') {
            if (!next) throw new Error(`${arg} requires a value.`);
            parsed.provider = String(next).toLowerCase();
            i += 1;
            continue;
        }

        if (arg === '-r' || arg === '--ratio') {
            if (!next) throw new Error(`${arg} requires a value.`);
            parsed.aspectRatio = next;
            parsed.aspectRatioWasProvided = true;
            i += 1;
            continue;
        }

        if (arg === '--width') {
            if (!next) throw new Error(`${arg} requires a value.`);
            parsed.targetWidth = Number(next);
            i += 1;
            continue;
        }

        if (arg === '--height') {
            if (!next) throw new Error(`${arg} requires a value.`);
            parsed.targetHeight = Number(next);
            i += 1;
            continue;
        }

        if (arg === '-m' || arg === '--model') {
            if (!next) throw new Error(`${arg} requires a value.`);
            parsed.model = String(next).toLowerCase();
            parsed.modelWasProvided = true;
            i += 1;
            continue;
        }

        if (arg === '-o' || arg === '--output') {
            if (!next) throw new Error(`${arg} requires a value.`);
            parsed.output = next;
            i += 1;
            continue;
        }

        if (arg === '-f' || arg === '--format') {
            if (!next) throw new Error(`${arg} requires a value.`);
            parsed.format = String(next).replace(/^\./, '').toLowerCase();
            i += 1;
            continue;
        }

        if (arg === '--ref') {
            if (!next) throw new Error(`${arg} requires a value.`);
            parsed.references.push(parseRefValue(next));
            i += 1;
            continue;
        }

        if (arg === '--no-sharp') {
            parsed.useSharp = false;
            continue;
        }

        if (arg.startsWith('-')) {
            throw new Error(`Unknown option: ${arg}`);
        }

        parsed.promptParts.push(arg);
    }

    if (!parsed.runConfig && !parsed.showHelp && parsed.promptParts.length === 0) {
        throw new Error('Missing prompt text. Use genmix "your prompt".');
    }

    if (!Number.isInteger(parsed.numberOfImages) || parsed.numberOfImages <= 0) {
        throw new Error('Number of images must be a positive integer.');
    }

    const quality = parsed.quality.toUpperCase();
    if (!['1K', '2K', '4K'].includes(quality)) {
        throw new Error('Quality must be one of: 1K, 2K, 4K.');
    }
    parsed.quality = quality;

    if (!['gemini', 'fal'].includes(parsed.provider)) {
        throw new Error('Provider must be "gemini" or "fal".');
    }

    if (parsed.provider === 'gemini' && !parsed.modelWasProvided) {
        parsed.model = 'flash';
    }

    if (parsed.provider === 'fal' && !parsed.modelWasProvided) {
        parsed.model = 'flash';
    }

    if (parsed.provider === 'gemini' && !['flash', 'pro'].includes(parsed.model)) {
        throw new Error('Model must be "flash" or "pro" when provider is "gemini".');
    }

    if (parsed.provider === 'fal' && !['flash', 'pro', 'banana2', 'banana-pro', '2'].includes(parsed.model)) {
        throw new Error('Model must be "flash" or "pro" when provider is "fal" (aliases: banana2, banana-pro, 2).');
    }

    const hasOnlyOneDimension = (parsed.targetWidth === null) !== (parsed.targetHeight === null);
    if (hasOnlyOneDimension) {
        throw new Error('Both --width and --height are required together.');
    }

    const hasTargetDimensions = parsed.targetWidth !== null && parsed.targetHeight !== null;
    if (hasTargetDimensions) {
        if (!Number.isInteger(parsed.targetWidth) || parsed.targetWidth <= 0) {
            throw new Error('Width must be a positive integer.');
        }
        if (!Number.isInteger(parsed.targetHeight) || parsed.targetHeight <= 0) {
            throw new Error('Height must be a positive integer.');
        }
    }

    if (!parsed.useSharp && hasTargetDimensions) {
        throw new Error('Resizing requires Sharp. Remove --no-sharp to use --width/--height.');
    }

    if (!parsed.aspectRatioWasProvided && !hasTargetDimensions) {
        parsed.aspectRatio = parsed.provider === 'fal' ? 'auto' : '1:1';
    }

    for (const ref of parsed.references) {
        if (!ref.imagePath) {
            throw new Error('Reference path cannot be empty.');
        }
    }

    parsed.prompt = parsed.promptParts.join(' ').trim();
    return parsed;
}

function resolveOutput(outputArg, format) {
    const extension = path.extname(outputArg).replace(/^\./, '').toLowerCase();
    const isFilePath = extension && IMAGE_EXTENSIONS.has(extension);

    if (isFilePath) {
        const absolute = path.resolve(process.cwd(), outputArg);
        return {
            directory: path.dirname(absolute),
            filename: path.basename(absolute, path.extname(absolute)),
            extension
        };
    }

    return {
        directory: path.resolve(process.cwd(), outputArg),
        filename: null,
        extension: format
    };
}

async function ensureApiKey(provider = 'gemini') {
    const config = loadConfig();

    if (provider === 'fal') {
        const envApiKey = process.env.FAL_API_KEY;
        if (envApiKey && envApiKey.trim()) {
            return envApiKey.trim();
        }
        if (config.falApiKey && config.falApiKey.trim()) {
            return config.falApiKey.trim();
        }

        info('No Fal API key found. Let us configure it now.');
        const newApiKey = await promptFalApiKey();
        saveConfig({ ...config, falApiKey: newApiKey });
        success(`Fal API key saved to ${CONFIG_PATH}`);
        return newApiKey;
    }

    const envApiKey = process.env.GEMINI_API_KEY;
    if (envApiKey && envApiKey.trim()) {
        return envApiKey.trim();
    }
    if (config.geminiApiKey && config.geminiApiKey.trim()) {
        return config.geminiApiKey.trim();
    }
    if (config.apiKey && config.apiKey.trim()) {
        return config.apiKey.trim();
    }

    info('No Gemini API key found. Let us configure it now.');
    const newApiKey = await promptApiKey();
    saveConfig({ ...config, apiKey: newApiKey, geminiApiKey: newApiKey });
    success(`Gemini API key saved to ${CONFIG_PATH}`);
    return newApiKey;
}

async function runConfigCommand(provider) {
    const existing = loadConfig();
    if (provider === 'fal') {
        if (existing.falApiKey) {
            info(`Existing Fal API key found in ${CONFIG_PATH}.`);
        } else {
            info('No saved Fal API key found.');
        }

        const newApiKey = await promptFalApiKey();
        saveConfig({ ...existing, falApiKey: newApiKey });
        success(`Fal API key saved to ${CONFIG_PATH}`);
        return;
    }

    if (existing.apiKey || existing.geminiApiKey) {
        info(`Existing Gemini API key found in ${CONFIG_PATH}.`);
    } else {
        info('No saved Gemini API key found.');
    }

    const newApiKey = await promptApiKey();
    saveConfig({ ...existing, apiKey: newApiKey, geminiApiKey: newApiKey });
    success(`Gemini API key saved to ${CONFIG_PATH}`);
}

async function runGeneration(args) {
    const apiKey = await ensureApiKey(args.provider);
    const generator = args.provider === 'fal'
        ? new FalGenerator({ apiKey })
        : new GeminiGenerator({ apiKey });

    if (args.provider === 'gemini') {
        if (args.model === 'pro') {
            generator.pro();
        } else {
            generator.flash();
        }
    } else if (args.model === 'banana-pro' || args.model === 'pro') {
        generator.pro();
    } else {
        generator.flash();
    }

    if (args.provider === 'fal' && args.references.length === 0) {
        throw new Error('Fal edit models require at least one --ref input image.');
    }

    for (const ref of args.references) {
        if (typeof generator.addReference === 'function') {
            generator.addReference(ref.imagePath, ref.description);
        }
    }

    info('Generating image(s)...');
    const generation = await generator.generate(args.prompt, {
        numberOfImages: args.numberOfImages,
        quality: args.quality,
        aspectRatio: args.aspectRatio,
        width: args.targetWidth,
        height: args.targetHeight
    });

    if (generation.text) {
        info(`Model response: ${generation.text}`);
    }

    if (!generation.images || generation.images.length === 0) {
        info('No images were returned by the model.');
        return;
    }

    const saveOptions = resolveOutput(args.output, args.format);
    saveOptions.useSharp = args.useSharp;
    if (args.targetWidth && args.targetHeight) {
        info(`Resizing final output to ${args.targetWidth}x${args.targetHeight}.`);
    }
    const savedPaths = await generator.save(saveOptions);
    savedPaths.forEach((savedPath) => {
        success(`Saved: ${savedPath}`);
    });
}

async function main() {
    try {
        const args = parseArgs(process.argv.slice(2));

        if (args.showHelp) {
            printHelp();
            return;
        }

        if (args.runConfig) {
            await runConfigCommand(args.provider);
            return;
        }

        await runGeneration(args);
    } catch (err) {
        error(err.message);
        process.exitCode = 1;
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    parseArgs,
    resolveOutput
};
