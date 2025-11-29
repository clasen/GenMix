process.loadEnvFile(); // Native Node.js .env loading (Node 20.12+)
const { GeminiGenerator } = require('../index');
const path = require('path');
const fs = require('fs');

async function main() {
    try {
        const generator = new GeminiGenerator();

        // === Option 1: Use a local image ===
        const localImagePath = path.join(__dirname, 'camera_4126.jpg');

        if (fs.existsSync(localImagePath)) {
            console.log('📸 Processing local image...\n');

            const result1 = await generator.generate(
                'Translate this image to Portuguese',
                {
                    referenceImage: localImagePath,
                    quality: '1K',
                    numberOfImages: 1
                }
            );

            if (result1.images && result1.images.length > 0) {
                // Create pt directory if it doesn't exist
                const ptDir = path.join(__dirname, 'pt');
                if (!fs.existsSync(ptDir)) {
                    fs.mkdirSync(ptDir, { recursive: true });
                }
                
                // Use the same filename as the original
                const originalName = path.basename(localImagePath, path.extname(localImagePath));
                
                const saved = await generator.save({ 
                    directory: ptDir,
                    filename: originalName
                });
                console.log('✅ Modified image saved at:', saved[0], '\n');
            } else if (result1.text) {
                console.log('📝 Result:', result1.text, '\n');
            }
        }

        console.log('🎉 Example completed successfully!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);

        if (error.message.includes('API Key')) {
            console.error('\n💡 Tip: Make sure you have GEMINI_API_KEY in your .env file');
        }

        if (error.message.includes('reference image')) {
            console.error('\n💡 Tip: Verify that the image path is correct');
        }
    }
}

main();

