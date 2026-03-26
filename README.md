# 🎨 GenMix

AI-powered image generator supporting Google Gemini and Fal Nano Banana 2. Supports image generation from text prompts and image modification with reference images (Gemini).

## Features ✨

- 🖼️ **Image generation** from text descriptions
- 🎨 **Image modification** using reference images
- 🔄 **Style transfer** - Apply artistic styles to your images
- 📐 **Quality control** - Generate in 1K, 2K or 4K
- 🎯 **Multiple formats** - Supports local paths, URLs and Base64
- 💾 **Auto-save** with unique hash per prompt

## Installation

```bash
npm install genmix
```

### AI Skill
You can also add GenMix as a skill for AI agentic development:

```bash
npx skills add https://github.com/clasen/GenMix --skill genmix
```

## Setup

Create a `.env` file in your project root:

```env
GEMINI_API_KEY=your_api_key_here
FAL_API_KEY=your_fal_api_key_here
```

`GEMINI_API_KEY` is used with provider `gemini` and `FAL_API_KEY` is used with provider `fal`.

## Basic Usage

### The Power of GenMix: Multiple References & Chainable API

GenMix shines when combining multiple images with specific instructions using its intuitive chainable API:

```javascript
import { GeminiGenerator } from 'genmix';
const generator = new GeminiGenerator();

const result = await generator
  .pro() // Use the Pro model for best results
  .addReference('./person.jpg', 'Use this person as the main subject')
  .addReference('./background.jpg', 'Use this as the background setting')
  .generate('A photo of the person standing in the background setting, cinematic lighting');

await generator.save({ filename: 'composite-result' });
```

### Provider Selection (Gemini or Fal)

```javascript
import { GeminiGenerator, FalGenerator } from 'genmix';

const gemini = new GeminiGenerator({ apiKey: process.env.GEMINI_API_KEY });
const fal = new FalGenerator({ apiKey: process.env.FAL_API_KEY });

await gemini.flash().generate('A cinematic portrait with dramatic lighting');
await fal.generate('A cinematic portrait with dramatic lighting', {
  numberOfImages: 1,
  quality: '1K',
  aspectRatio: '1:1'
});
```

Fal models available in this integration:
- `flash` (or `banana2`) -> `fal-ai/nano-banana-2/edit` (image-to-image editing)
- `pro` (or `banana-pro`) -> `fal-ai/nano-banana-pro/edit` (image-to-image editing)

### Model Selection

You can easily switch between the Pro and Flash models using chainable methods:

```javascript
import { GeminiGenerator } from 'genmix';

const generator = new GeminiGenerator();

// Use the Pro model
await generator
  .pro()
  .generate('A highly detailed portrait of a cat');

// Switch to the Flash model
await generator
  .flash()
  .generate('A quick sketch of a dog');
```

### Simple Image Generation

```javascript
import { GeminiGenerator } from 'genmix';

const generator = new GeminiGenerator();

// Generate an image
const result = await generator.generate(
  'A futuristic city with flying cars, cyberpunk style',
  {
    numberOfImages: 1,
    quality: '2K',
    aspectRatio: '16:9'
  }
);

// Save images
const savedPaths = await generator.save({ directory: './output' });
console.log('Images saved:', savedPaths);
```

### Image Modification with Reference Images

```javascript
// Modify an existing image
const result = await generator.generate(
  'Transform this image to have sunset lighting with warm orange tones',
  {
    referenceImage: './my-image.png',  // Local path
    quality: '2K',
    numberOfImages: 1
  }
);

const savedPaths = await generator.save({ directory: './output' });
```

### Using URLs as Reference

```javascript
const result = await generator.generate(
  'Convert this photo into a watercolor painting',
  {
    referenceImage: 'https://example.com/image.jpg',  // URL
    quality: '1K'
  }
);

generator.save({ directory: './output' });
```

## Configuration Options

### Constructor

```javascript
new GeminiGenerator({
  apiKey: string,           // Your Google API key (required)
  modelId: string           // Model to use (optional, default: 'gemini-3-pro-image-preview')
})
```

```javascript
new FalGenerator({
  apiKey: string,           // Your Fal API key (required)
  modelId: string           // Optional: FalGenerator.MODELS.BANANA_2 or BANANA_PRO_EDIT
})
```

### Model Selection Methods

```javascript
generator.pro()    // Switches to the gemini-3-pro-image-preview model
generator.flash()  // Switches to the gemini-3.1-flash-image-preview model
```
Both methods are chainable and return the generator instance.

Fal generator model methods:

```javascript
fal.banana2()   // fal-ai/nano-banana-2/edit (image editing)
fal.bananaPro() // fal-ai/nano-banana-pro/edit (image editing)
fal.pro()       // alias of bananaPro()
fal.flash()     // alias of banana2()
```

### Reference Methods

You can also use chainable methods to add one or multiple reference images before calling `generate()`:

```javascript
generator.addReference(image, description) // Adds a reference image (path, URL, Buffer)
generator.clearReferences()                // Removes all queued reference images
```

For `fal` (`flash` and `pro`), references can be URL, data URI, local file path, or Buffer.

### generate() Method

```javascript
await generator.generate(prompt, options)
```

**Parameters:**

| Option                   | Type          | Description                                 | Default |
| ------------------------ | ------------- | ------------------------------------------- | ------- |
| `prompt`                 | string        | Description of what you want to generate    | -       |
| `options.referenceImage` | string/Buffer | Reference image (path, URL, Base64, Buffer) | -       |
| `options.numberOfImages` | number        | Number of images to generate                | 1       |
| `options.quality`        | string        | Quality: '1K', '2K', '4K'                   | -       |
| `options.aspectRatio`    | string        | Aspect ratio: '1:1', '16:9', '4:3', etc.    | -       |
| `options.width`          | number        | Final output width in pixels (requires `height`) | -   |
| `options.height`         | number        | Final output height in pixels (requires `width`) | -   |

### save() Method

```javascript
await generator.save(options)
```

**Parameters:**

| Option              | Type   | Description                                      | Default |
| ------------------- | ------ | ------------------------------------------------ | ------- |
| `options.directory` | string | Target directory path to save images             | `'.'`   |
| `options.filename`  | string | Custom filename (without extension). If not provided, uses hash-based filename | -       |
| `options.extension` | string | File format: 'jpg', 'png', 'webp', 'avif', 'tiff' | `'jpg'` |

**Examples:**

```javascript
// Save to specific directory with auto-generated filename (jpg by default)
await generator.save({ directory: './output' });

// Save as PNG
await generator.save({ directory: './output', extension: 'png' });

// Save to specific directory with custom filename
await generator.save({ directory: './output', filename: 'my-image' });

// Save as WebP with custom filename
await generator.save({ directory: './output', filename: 'my-image', extension: 'webp' });

// Save to current directory with custom filename
await generator.save({ filename: 'my-image' });

// Save to current directory with auto-generated filename (jpg)
await generator.save();
```

### Smart target size in library mode (non-CLI)

You can request high generation quality and still force an exact final output size directly in `generate()`:

```javascript
const generator = new GeminiGenerator();

await generator.generate('App icon, flat minimal style', {
  quality: '4K', // generation quality (independent)
  width: 400,
  height: 400
});

// width/height resize is automatically applied on save()
await generator.save({ filename: 'icon-400x400', extension: 'png' });
```

If you also pass `aspectRatio`, it must match the ratio derived from `width`/`height`.

**Note:** 
- When multiple images are generated and a custom filename is provided, they will be saved as `filename_0.jpg`, `filename_1.jpg`, etc.
- The method uses Sharp for image conversion, supporting high-quality format conversion

## Advanced Examples

### Style Transfer

```javascript
const result = await generator.generate(
  'Transform this photo into a Van Gogh style painting with visible brush strokes',
  {
    referenceImage: './photo.jpg',
    quality: '4K'
  }
);
```

### Lighting Modification

```javascript
const result = await generator.generate(
  'Change the lighting to dramatic studio lighting with strong shadows',
  {
    referenceImage: './portrait.png',
    quality: '2K'
  }
);
```

### Multiple Variations

```javascript
const result = await generator.generate(
  'Add dramatic clouds and enhance colors',
  {
    referenceImage: './landscape.jpg',
    numberOfImages: 3,
    quality: '1K'
  }
);

// Generates 3 variations of the same modification
```

### Using Buffers

```javascript
import fs from 'fs';
const imageBuffer = fs.readFileSync('./image.png');

const result = await generator.generate(
  'Make this image look cinematic',
  {
    referenceImage: imageBuffer
  }
);
```

## Reference Image Formats

GenMix accepts reference images in multiple formats:

1. **Local file path**: `'./image.png'`
2. **URL**: `'https://example.com/image.jpg'`
3. **Data URI**: `'data:image/png;base64,iVBORw0KG...'`
4. **Buffer**: `Buffer.from(...)`

Supported image formats: PNG, JPEG, GIF, WEBP

## Error Handling

```javascript
try {
  const result = await generator.generate(prompt, options);
  
  if (result.images && result.images.length > 0) {
    const paths = generator.save({ directory: './output' });
    console.log('Success!', paths);
  } else {
    console.log('No images generated');
  }
} catch (error) {
  console.error('Error:', error.message);
  
  // Common errors:
  // - 'API Key is required'
  // - 'Failed to read reference image file'
  // - 'Failed to download reference image from URL'
  // - 'Gemini API Error: ...'
}
```

## Project Structure

```
genmix/
└── generators/
│   ├── BaseGenerator.js      # Base class with utilities
│   ├── GeminiGenerator.js    # Gemini API implementation
│   └── FalGenerator.js       # Fal Nano Banana 2 implementation
├── demo/
│   ├── example.js                # Basic examples
│   └── example-translation.js    # Translate image
├── index.js                      # Entry point
└── README.md
```

## Best Practices

1. **Clear Prompts**: Be specific about what you want
   ```javascript
   // ✅ Good
   'Add dramatic sunset lighting with orange and pink tones in the sky'
   
   // ❌ Vague
   'Make it better'
   ```

2. **Appropriate Quality**: 
   - `1K`: Quick tests
   - `2K`: General use
   - `4K`: High quality (slower)

3. **Image Size**: Reference images between 512x512 and 2048x2048 work best

4. **Result Caching**: Images are automatically saved with unique hash based on the prompt

## CLI Usage

### Global CLI Installation

Install GenMix globally to use it from the command line:

```bash
npm install -g genmix
```

### First run and API key persistence

If no API key is available, the CLI asks for it on first use and saves it to:

```text
~/.genmix/config.json
```

You can set or update it explicitly anytime:

```bash
genmix --config
```

API key resolution order in CLI:
1. Provider-specific environment variable (`GEMINI_API_KEY` or `FAL_API_KEY`)
2. Saved config (`~/.genmix/config.json`) using `geminiApiKey`/`apiKey` or `falApiKey`
3. Interactive prompt (then persisted)

### Basic CLI commands

```bash
# Show help
genmix --help

# Generate from prompt
genmix "A futuristic city with flying cars, cyberpunk style"

# Generate multiple images
genmix "A cozy cabin in winter" -n 2 -q 2K -r 16:9 -m flash

# Use Fal Nano Banana 2 edit (flash) with reference
genmix "Restyle this room with warm sunset mood" --provider fal -m flash --ref "./room.jpg" -n 2 -q 2K -r 16:9

# Use Fal Nano Banana Pro (edit) with reference
genmix "make this scene cinematic" --provider fal -m banana-pro --ref "https://example.com/input.png"
```

### Output file path or directory

`--output` accepts either:
- a directory path, or
- a full output file path (including filename + extension)

```bash
# Save to a directory (auto-generated hash filename)
genmix "Watercolor fox logo" --output ./output

# Save to exact file path and filename
genmix "Watercolor fox logo" --output ./output/logo-fox.png
```

### Smart target size (independent from generation quality)

You can ask the model for high generation quality (for example `4K`) and still force a final exact output size.

When you pass target dimensions, GenMix CLI:
1. Derives the generation ratio automatically (for example `400x400` -> `1:1`, `1920x1080` -> `16:9`)
2. Generates using your selected quality (`1K`, `2K`, or `4K`)
3. Resizes the final image to the exact dimensions you requested

```bash
# Ask for 4K quality, deliver exact 400x400 output
genmix "app icon, flat minimal style" -q 4K --width 400 --height 400 --output ./output/icon.png
```

If you also pass `--ratio`, it must match the derived ratio from the target size.

### References with optional text description

Use `--ref <path:text>` to add reference images with optional guidance text:

```bash
# Reference path only
genmix "Restyle this room" --ref ./room.jpg

# Reference path + description
genmix "Restyle this room" --ref "./room.jpg:keep composition and camera angle"

# Multiple references with descriptions
genmix "Create product ad scene" \
  --ref "./product.png:use as main subject" \
  --ref "./bg.jpg:use as background mood"

# References for fal models (URL, data URI, or local path)
genmix "Edit this image for a magazine look" \
  --provider fal -m flash \
  --ref "./photo.png"
```

### CLI options

```text
-n, --number <N>          Number of images (default: 1)
-q, --quality <1K|2K|4K>  Image quality (default: 1K)
-p, --provider <gemini|fal> Provider (default: gemini)
-r, --ratio <ratio>       Aspect ratio (default: 1:1 for gemini, auto for fal)
-m, --model <...>         gemini: pro|flash (default: flash)
                          fal: pro|flash (aliases: banana-pro|banana2|2, default: flash)
-o, --output <path>       Output directory or full output file path
-f, --format <format>     Output format when output is a directory (default: jpg)
--width <px>              Final output width in pixels (requires --height)
--height <px>             Final output height in pixels (requires --width)
--ref <path[:text]>       Reference image (path/URL/data URI); for URL descriptions use URL::description
--no-sharp                Save raw model bytes without Sharp conversion (disables resizing)
--config                  Set/update persisted API key
--help                    Show help
```

## Additional Resources

- [Code Examples](./demo/)
- [Google Gemini API Documentation](https://ai.google.dev/)
- [Fal Nano Banana 2 Edit Documentation](https://fal.ai/models/fal-ai/nano-banana-2/edit/api)
- [Fal Nano Banana Pro Edit Documentation](https://fal.ai/models/fal-ai/nano-banana-pro/edit/api)

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or pull request.



