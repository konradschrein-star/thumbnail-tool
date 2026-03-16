const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dir = path.join(process.cwd(), 'public', 'research', 'video_analysis');

if (!fs.existsSync(dir)) {
  console.error('Directory not found:', dir);
  process.exit(1);
}

const files = fs.readdirSync(dir);

console.log(`Auditing ${files.length} files in ${dir}...`);

files.forEach(f => {
  const isDirty = (f.includes(' ') || f !== f.toLowerCase() || /[^\w.-]/.test(f));
  
  if (isDirty) {
    console.log(`Removing unsanitized file: "${f}"`);
    const fullPath = path.join(dir, f);
    
    // Remove from git index
    try {
      execSync(`git rm --cached "${f}"`, { cwd: dir, stdio: 'ignore' });
      console.log(`  - Removed from Git index`);
    } catch (e) {
      // Might not be tracked
    }
    
    // Remove from filesystem
    try {
      fs.unlinkSync(fullPath);
      console.log(`  - Deleted from disk`);
    } catch (e) {
      console.error(`  - Failed to delete: ${e.message}`);
    }
  }
});

console.log('Cleanup complete.');
