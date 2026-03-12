import { buildFullPrompt } from '../lib/payload-engine';

const channel = {
    name: "Test Channel",
    primaryColor: "#000000",
    secondaryColor: "#ffffff",
    personaDescription: "The host is a charismatic male with an infectious smile, looking directly at the camera."
};

const archetype = {
    name: "Striking Warning Style",
    basePrompt: "Give the image a striking, attention-grabbing vibe with bold, intense lighting. It should feel urgent and high-energy."
};

const job = {
    videoTopic: "how to make a table in Notion",
    thumbnailText: "table"
};

const prompt = buildFullPrompt(channel, archetype, job, false, true);
console.log("=== WITH BRAND COLORS DISABLED, PERSONA ENABLED ===");
console.log(prompt);

const prompt2 = buildFullPrompt(channel, archetype, job, true, true);
console.log("\n=== WITH BRAND COLORS ENABLED, PERSONA ENABLED ===");
console.log(prompt2);
