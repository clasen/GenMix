process.loadEnvFile(); // Native Node.js .env loading (Node 20.12+)
const { GeminiGenerator } = require('../index');


async function exampleBasicGeneration() {
    console.log('\n=== Example 1: Basic Image Generation ===\n');

    const generator = new GeminiGenerator();

    const prompt = 'A futuristic city with flying cars, cyberpunk style';

    console.log('Generating image...');
    const result = await generator.generate(prompt, {
        numberOfImages: 2,
        quality: '1K', // Options: 1K, 2K, 4K
        aspectRatio: '1:1'
    });

    console.log('Generation complete!');

    if (result.text) {
        console.log('Text response:', result.text);
    }

    if (result.images && result.images.length > 0) {
        console.log(`Found ${result.images.length} images.`);

        const savedPaths = await generator.save({ directory: __dirname });
        savedPaths.forEach(p => console.log(`Saved image to ${p}`));
    } else {
        console.log('No images generated.');
    }
}



async function main() {
    try {
        // Example 1: Basic generation
        await exampleBasicGeneration();

        console.log('\n=== All examples completed! ===\n');
    } catch (error) {
        console.error('Error:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
    }
}

main();
