process.loadEnvFile();
import { GeminiGenerator } from '../index.js';
import path from 'path';
import fs from 'fs';

async function main() {
    try {
        const generator = new GeminiGenerator();

        const localImagePath = path.join(import.meta.dirname, 'camera_4126.jpg');

        if (fs.existsSync(localImagePath)) {
            console.log('🎨 Generating multiple variations...\n');

            const result = await generator.generate(
                'Add a vintage film look with grain and vignette effect',
                {
                    referenceImage: localImagePath,
                    quality: '1K',
                    numberOfImages: 3
                }
            );

            if (result.images && result.images.length > 0) {
                const saved = await generator.save({ directory: import.meta.dirname });
                console.log(`✅ ${saved.length} variations saved:`);
                saved.forEach(p => console.log(`   - ${p}`));
                console.log();
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
