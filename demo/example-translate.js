process.loadEnvFile();
import { GeminiGenerator } from '../index.js';
import path from 'path';
import fs from 'fs';

async function main() {
    try {
        const generator = new GeminiGenerator();

        const localImagePath = path.join(import.meta.dirname, 'camera_4126.jpg');

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
                const ptDir = path.join(import.meta.dirname, 'pt');
                if (!fs.existsSync(ptDir)) {
                    fs.mkdirSync(ptDir, { recursive: true });
                }

                const originalName = path.basename(localImagePath, path.extname(localImagePath));

                const refMetadata = generator.getReferenceMetadata();
                console.log('📊 Reference format:', refMetadata);

                const saved = await generator.save({
                    directory: ptDir,
                    filename: originalName,
                    formatOptions: refMetadata
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
