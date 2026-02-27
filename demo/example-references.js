try { process.loadEnvFile(); } catch (error) { }
import { GeminiGenerator } from '../index.js';
import path from 'path';


try {
    const generator = new GeminiGenerator();

    const background = path.join(import.meta.dirname, 'background.jpg');
    const subject = path.join(import.meta.dirname, 'selfie.jpg');

    console.log('🖼️  Adding references...');
    generator
        .addReference(background, 'use as background landscape')
        .addReference(subject, 'use as the main subject');

    console.log('🎨 Generating composite image...\n');

    const result = await generator.generate(
        'Place the subject in front of the background, cinematic lighting, golden hour',
        { quality: '2K' }
    );

    if (result.text) {
        console.log('📝 Model notes:', result.text);
    }

    if (result.images && result.images.length > 0) {
        const saved = await generator.save({
            directory: import.meta.dirname,
            filename: 'composite-result'
        });
        console.log(`✅ Saved: ${saved[0]}\n`);
    } else {
        console.log('⚠️  No images generated.\n');
    }

    console.log('🎉 Example completed!\n');

} catch (error) {
    console.error('❌ Error:', error.message);

    if (error.message.includes('API Key')) {
        console.error('\n💡 Tip: Make sure you have GEMINI_API_KEY in your .env file');
    }

    if (error.message.includes('reference image')) {
        console.error('\n💡 Tip: Place background.jpg and subject.jpg in the demo/ folder');
    }
}

