const fs = require('fs');
const path = require('path');

const files = [
    'archetype2.jpg', 'archetype3.jpeg',
    'archetype4.jpeg', 'archetype5.jpeg', 'archetype6.jpeg',
    'archetype7.jpeg'
];

let content = 'export const EMERGENCY_ASSET_MAP: Record<string, string> = {\n';

files.forEach(f => {
    try {
        const filePath = path.join(process.cwd(), 'public', 'archetypes', f);
        if (fs.existsSync(filePath)) {
            const b = fs.readFileSync(filePath);
            content += `  '${f}': '${b.toString('base64')}',\n`;
            console.log(`Encoded ${f}`);
        } else {
            console.error(`File not found: ${filePath}`);
        }
    } catch (err) {
        console.error(`Error encoding ${f}: ${err.message}`);
    }
});

content += '};\n';

fs.writeFileSync(path.join(process.cwd(), 'lib', 'emergency-assets.ts'), content);
console.log('Successfully created lib/emergency-assets.ts');
