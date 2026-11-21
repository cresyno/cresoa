const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
      results.push(filePath);
    }
  });
  return results;
}

// 1. Create a safe replacement hook
if (!fs.existsSync('lib')) fs.mkdirSync('lib');
fs.writeFileSync('lib/useClientSearchParams.js', `import { useState, useEffect } from 'react';\n\nexport function useClientSearchParams() {\n  const [params, setParams] = useState(new URLSearchParams());\n  useEffect(() => {\n    setParams(new URLSearchParams(window.location.search));\n  }, []);\n  return params;\n}\n`);

// 2. Find all files in app/dashboard using useSearchParams and replace the import
const files = walk('app');
files.forEach(p => {
  let content = fs.readFileSync(p, 'utf8');
  if (content.includes('useSearchParams')) {
    // Calculate relative path back to lib folder
    let depth = p.split(path.sep).length - 2; 
    let relativePath = '';
    for (let i = 0; i < depth; i++) relativePath += '../';
    if (relativePath === '') relativePath = './';
    
    // Replace the Next.js import with our safe hook
    content = content.replace(/import\s+\{\s*useSearchParams\s*\}\s+from\s+['"]next\/navigation['"];?/g, `import { useClientSearchParams as useSearchParams } from '${relativePath}lib/useClientSearchParams';`);
    
    fs.writeFileSync(p, content);
    console.log('Fixed useSearchParams in:', p);
  }
});
