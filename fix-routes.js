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
    } else if (/^page\.(js|jsx|ts|tsx)$/.test(file) && filePath.includes('[')) {
      results.push(filePath);
    }
  });
  return results;
}

const pages = walk('app/dashboard');
pages.forEach(p => {
  let content = fs.readFileSync(p, 'utf8');
  if (content.includes('ClientPage')) return;

  content = content.replace(/export async function generateStaticParams\(\) \{\s*return \[\{.*?\}\];\s*\}\s*/g, '');
  
  let hasClient = false;
  if (content.includes("'use client'")) {
    content = content.replace("'use client';", "").replace("'use client'", "");
    hasClient = true;
  } else if (content.includes('"use client"')) {
    content = content.replace('"use client";', "").replace('"use client"', "");
    hasClient = true;
  }

  if (hasClient) {
    const ext = p.split('.').pop();
    const clientPath = path.join(path.dirname(p), `ClientPage.${ext}`);
    fs.writeFileSync(clientPath, `'use client';\n${content}`);
    
    const dirParts = path.dirname(p).split(path.sep);
    const params = [];
    dirParts.forEach(part => {
      if (part.startsWith('[') && part.endsWith(']')) {
        let clean = part.slice(1, -1);
        if (clean.startsWith('...')) clean = clean.slice(3);
        params.push(clean);
      }
    });
    const paramStr = params.map(p => `${p}: "default"`).join(', ');
    fs.writeFileSync(p, `import ClientPage from './ClientPage';\n\nexport async function generateStaticParams() {\n  return [{ ${paramStr} }];\n}\n\nexport default function Page() {\n  return <ClientPage />;\n}\n`);
    console.log(`Fixed: ${p}`);
  }
});
