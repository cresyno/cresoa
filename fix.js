const fs = require('fs');
const path = require('path');

if (fs.existsSync('lib') === false) fs.mkdirSync('lib');
fs.writeFileSync('lib/useClientSearchParams.js', 'import { useState, useEffect } from "react";\nexport function useClientSearchParams() {\n  const [params, setParams] = useState(new URLSearchParams());\n  useEffect(() => { setParams(new URLSearchParams(window.location.search)); }, []);\n  return params;\n}');

function walk(dir) {
  let results = [];
  if (fs.existsSync(dir) === false) return results;
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

const files = walk('app');
files.forEach(p => {
  let content = fs.readFileSync(p, 'utf8');
  if (content.includes('useSearchParams') && content.includes('useClientSearchParams') === false) {
    let depth = p.split(path.sep).length - 2; 
    let relPath = '';
    for (let i = 0; i < depth; i++) relPath += '../';
    if (relPath === '') relPath = './';

    let newContent = content.replace(/import\s+\{([^}]*)\/}\s+from\s+['\"^ext\/navigation['\"];?/g, (match, imports) => {
      let cleanedImports = imports.split(',').map(i => i.trim()).filter(i => i != 'useSearchParams');
      let importStatement = cleanedImports.length > 0 ? `import { ${cleanedImports.join(', ')} } from 'next/navigation';\n` : '';
      return importStatement + `import { useClientSearchParams as useSearchParams } from '${relPath}lib/useClientSearchParams';`
    });

    if (newContent === content) {
      newContent = `import { useClientSearchParams as useSearchParams } from '${relPath}lib/useClientSearchParams';\n` + content;
    }

    fs.writeFileSync(p, newContent);
    console.log('Fixed:', p);
  }
});
