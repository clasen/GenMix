---
name: genmix
description: AI-powered image generator using Google Gemini, Fal, or OpenAI GPT Image 2.5. Use this skill when the user asks to generate an image from text, modify an existing image with a reference, apply style transfer, or create an image based on a prompt.
---

# GenMix Skill

# Instructions

### Step 1: Install GenMix
If GenMix is not already installed in the project, install it:
```bash
npm install genmix
```
Ensure `GEMINI_API_KEY` is set in the `.env` file.

### Step 2: Write the Generation Script
Write a Node.js script to use GenMix based on the user's request.

Example for generating a new image:
```javascript
import { GeminiGenerator } from 'genmix';

const generator = new GeminiGenerator();
await generator.generate('Your prompt here', { quality: '2K' });
await generator.save({ directory: './output' });
```

Example for modifying an image with a reference:
```javascript
import { GeminiGenerator } from 'genmix';

const generator = new GeminiGenerator();
await generator
  .addReference('./path/to/reference.jpg', 'Description of reference')
  .generate('Your modification prompt here', { quality: '2K' });
await generator.save({ directory: './output' });
```

### Step 3: Execute the script
Run the script using Node.js to generate the image.

## Examples

**Example 1: Generate a futuristic city**
User says: "Generate an image of a futuristic city"
Actions: Create a script using GenMix to generate the image with the prompt "A futuristic city with flying cars, cyberpunk style", run the script, and save the output.

**Example 2: Modify an image**
User says: "Make this portrait look like a watercolor painting"
Actions: Create a script using GenMix, add the portrait as a reference image, use the prompt "Transform this photo into a watercolor painting", run the script, and save the output.

## OpenAI GPT Image 2.5

Use `OpenAIGenerator` with `OPENAI_API_KEY` for GPT Image 2.5. Sunburst is the
default; `.flare()` selects Flare and `.sunburst()` switches back. Use the same
`addReference()`, `generate()`, and `save()` flow. Quality accepts `low`, `medium`,
`high`, `xhigh`, `max`, or `auto`, not Gemini resolution labels. CLI example:
`genmix "A watercolor city" --provider openai -m sunburst -q high -o city.png`.
