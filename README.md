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

## Setup

Create a `.env` file in your project root:

```env
GEMINI_API_KEY=your_api_key_here
```

## Basic Usage

### Simple Image Generation

```javascript
const { GeminiGenerator } = require('genmix');

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
const savedPaths = generator.save('./output');
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

const savedPaths = generator.save('./output');
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

generator.save('./output');
```

## Configuration Options

### Constructor

```javascript
new GeminiGenerator({
  apiKey: string,           // Your Google API key (required)
  modelId: string           // Model to use (optional, default: 'gemini-3-pro-image-preview')
})
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
const fs = require('fs');
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
    const paths = generator.save('./output');
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



