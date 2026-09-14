const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const { OpenAIGenerator } = require('..');

test('OpenAI generation, editing, state and saving', async t => {
    const png = await sharp({ create: { width: 16, height: 16, channels: 3, background: 'red' } }).png().toBuffer();
    const calls = [];
    const originalFetch = global.fetch;
    global.fetch = async (url, request) => {
        calls.push({ url, ...request });
        return Response.json({ data: [{ b64_json: png.toString('base64') }] });
    };
    t.after(() => { global.fetch = originalFetch; });
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'genmix-test-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const generator = new OpenAIGenerator({ apiKey: 'test-key' });
    const result = await generator.generate('draw', { quality: 'max', width: 120, height: 80 });
    assert.match(calls[0].url, /\/generations$/);
    assert.equal(JSON.parse(calls[0].body).quality, 'max');
    assert.equal(result.images.length, 1);
    const [saved] = await generator.save({ directory, filename: 'result', extension: 'png' });
    const metadata = await sharp(saved).metadata();
    assert.equal(metadata.width, 120);
    assert.equal(metadata.height, 80);
    await generator.flare().addReference(png, 'Keep the subject').generate('edit', { numberOfImages: 2 });
    const edit = calls[1];
    assert.match(edit.url, /\/edits$/);
    assert.equal(edit.headers['Content-Type'], undefined);
    assert.equal(edit.body.get('model'), 'gpt-image-2.5-flare');
    assert.equal(edit.body.get('n'), '2');
    assert.match(edit.body.get('prompt'), /Image 1: Keep the subject/);
    assert.deepEqual(Buffer.from(await edit.body.get('image[]').arrayBuffer()), png);
    assert.equal(generator.references.length, 0);
    await generator.generate('next');
    assert.match(calls[2].url, /\/generations$/);
    await generator.addReference(saved).addReference(result.images[0]).generate('combine');
    assert.equal(calls[3].body.getAll('image[]').length, 2);
});

test('invalid options and API failures preserve queued references', async t => {
    const generator = new OpenAIGenerator({ apiKey: 'test-key' });
    const originalFetch = global.fetch;
    let calls = 0;
    global.fetch = async () => { calls++; return Response.json({ error: { message: 'quota exceeded' } }, { status: 429 }); };
    t.after(() => { global.fetch = originalFetch; });
    for (const options of [{ quality: '4K' }, { numberOfImages: 0 }, { width: 10 }, { aspectRatio: '4:1' }, { width: 100, height: 100, aspectRatio: '3:2' }]) {
        await assert.rejects(generator.generate('draw', options));
    }
    assert.equal(calls, 0);
    await assert.rejects(generator.generate('draw'), /quota exceeded/);
    const png = await sharp({ create: { width: 16, height: 16, channels: 3, background: 'red' } }).png().toBuffer();
    generator.addReference(png);
    await assert.rejects(generator.generate('edit'), /quota exceeded/);
    assert.equal(generator.references.length, 1);
    global.fetch = async () => Response.json({ data: [] });
    await assert.rejects(generator.generate('edit'), /no valid image data/);
    assert.equal(generator.lastGeneration, null);
});

test('CLI selects OpenAI models and saves generated output', async t => {
    const { execFileSync } = require('node:child_process');
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'genmix-cli-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const png = await sharp({ create: { width: 16, height: 16, channels: 3, background: 'red' } }).png().toBuffer();
    const preload = path.join(directory, 'mock.cjs');
    await fs.writeFile(preload, `
        const assert = require('node:assert/strict');
        global.fetch = async (url, request) => {
            assert.equal(url, 'https://api.openai.com/v1/images/generations');
            const payload = JSON.parse(request.body);
            assert.equal(payload.model, 'gpt-image-2.5-' + process.env.TEST_MODEL);
            assert.equal(payload.quality, 'auto');
            return Response.json({ data: [{ b64_json: '${png.toString('base64')}' }] });
        };
    `);
    for (const model of ['sunburst', 'flare']) {
        const output = path.join(directory, `${model}.png`);
        execFileSync(process.execPath, ['--require', preload, path.resolve('cli.js'), 'draw', '--provider', 'openai', ...(model === 'flare' ? ['-m', model] : []), '-o', output], {
            env: { ...process.env, OPENAI_API_KEY: 'test-key', TEST_MODEL: model }
        });
        assert.equal((await sharp(output).metadata()).format, 'png');
    }
});
