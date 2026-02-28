const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

async function checkModelAndImage() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error('GOOGLE_API_KEY not found');
        return;
    }

    try {
        // 1. Check Model Metadata
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/nano-banana-pro-preview?key=${apiKey}`);
        const modelData = await response.json();
        console.log('Model Data:', JSON.stringify(modelData, null, 2));

        // 2. Check Image Magic Bytes
        const buffer = fs.readFileSync('assets/test/archetype.jpeg');
        console.log('Image Bytes (first 16):', buffer.slice(0, 16).toString('hex'));

        // 3. Simple Test Call with JUST one image if possible
        // (This part is harder without full setup, but we can at least see the bytes)
    } catch (e) {
        console.error(e);
    }
}

checkModelAndImage();
