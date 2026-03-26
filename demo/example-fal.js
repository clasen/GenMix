try { process.loadEnvFile(); } catch (error) { }
import { FalGenerator } from '../index.js';

async function runFalFlashExample() {
    console.log('\n=== Fal Example 1: Nano Banana 2 (flash) ===\n');

    const referenceUrl = process.env.FAL_DEMO_IMAGE_URL;
    if (!referenceUrl) {
        console.log('ℹ️  Skipping flash edit example: set FAL_DEMO_IMAGE_URL in your .env with an image URL.');
        return;
    }

    const generator = new FalGenerator();
    generator.flash().addReference(referenceUrl, 'use as base image');

    const result = await generator.generate(
        'A futuristic city skyline at dusk, cinematic lighting, ultra detailed',
        {
            numberOfImages: 1,
            quality: '1K',
            aspectRatio: '16:9'
        }
    );

    if (result.images && result.images.length > 0) {
        const saved = await generator.save({
            directory: import.meta.dirname,
            filename: 'fal-flash-example'
        });
        console.log(`✅ Saved flash result: ${saved[0]}`);
    } else {
        console.log('⚠️  No images generated for flash example.');
    }
}

async function runFalProExample() {
    console.log('\n=== Fal Example 2: Nano Banana Pro (edit) ===\n');

    const referenceUrl = process.env.FAL_DEMO_IMAGE_URL;
    if (!referenceUrl) {
        console.log('ℹ️  Skipping pro edit example: set FAL_DEMO_IMAGE_URL in your .env with an image URL.');
        return;
    }

    const generator = new FalGenerator();
    generator
        .pro()
        .addReference(referenceUrl, 'use as base image');

    const result = await generator.generate(
        'Turn this into a cinematic editorial shot with warm golden-hour color grading',
        {
            numberOfImages: 1,
            quality: '1K'
        }
    );

    if (result.images && result.images.length > 0) {
        const saved = await generator.save({
            directory: import.meta.dirname,
            filename: 'fal-pro-edit-example'
        });
        console.log(`✅ Saved pro edit result: ${saved[0]}`);
    } else {
        console.log('⚠️  No images generated for pro edit example.');
    }
}

async function main() {
    try {
        await runFalFlashExample();
        await runFalProExample();
        console.log('\n🎉 Fal examples completed!\n');
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.message.includes('API Key')) {
            console.error('\n💡 Tip: Make sure you have FAL_API_KEY in your .env file');
        }
    }
}

main();
