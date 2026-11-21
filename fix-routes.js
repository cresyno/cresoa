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
    } else if (/^page\.(js|jsx|ts|tsx)$/.test(file)) {
      results.push(filePath);
    }
  });
  return results;
}

const pages = walk('app');
pages.forEach(p => {
  let content = fs.readFileSync(p, 'utf8');
  
  if (content.includes('useSearchParams') && !content.includes('Suspense')) {
    if (content.includes('ClientPage')) return;
    
    const ext = p.split('.').pop();
    const clientPath = path.join(path.dirname(p), `ClientPage.${ext}`);
    
    // 1. Move original content to ClientPage
    fs.writeFileSync(clientPath, content);
    
    // 2. Create Server Component wrapper with Suspense and generateStaticParams
    const dirParts = path.dirname(p).split(path.sep);
    const params = [];
    dirParts.forEach(part => {
      if (part.startsWith('[') && part.endsWith(']')) {
        let clean = part.slice(1, -1);
        if (clean.startsWith('...')) clean = clean.slice(3);
        params.push(clean);
      }
    });
    
    let wrapper = `import { Suspense } from 'react';\nimport ClientPage from './ClientPage';\n\n`;
    if (params.length > 0) {
       const paramStr = params.map(p => `${p}: "default"`).join(', ');
       wrapper += `export async function generateStaticParams() {\n  return [{ ${paramStr} }];\n}\n\n`;
    }
    wrapper += `export default function Page() {\n  return (\n    <Suspense fallback={<div>Loading...</div>}>\n      <ClientPage />\n    </Suspense>\n  );\n}\n`;
    
    fs.writeFileSync(p, wrapper);
    console.log(`Fixed with Suspense: ${p}`);
  }
});
