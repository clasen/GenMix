# 🎨 GenMix

AI-powered image generator using Google Gemini API. Supports image generation from text prompts and image modification with reference images.

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
```

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

### Model Selection Methods

```javascript
generator.pro()    // Switches to the gemini-3-pro-image-preview model
generator.flash()  // Switches to the gemini-3.1-flash-image-preview model
```
Both methods are chainable and return the generator instance.

### Reference Methods

You can also use chainable methods to add one or multiple reference images before calling `generate()`:

```javascript
generator.addReference(image, description) // Adds a reference image (path, URL, Buffer)
generator.clearReferences()                // Removes all queued reference images
```

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
│   └── GeminiGenerator.js    # Gemini API implementation
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

## Additional Resources

- [Code Examples](./demo/)
- [Google Gemini API Documentation](https://ai.google.dev/)

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or pull request.



