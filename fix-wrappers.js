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
  if (content.includes('ClientPage')) return; // Skip if already wrapped

  // Clean up any bad injections
  content = content.replace(/export async function generateStaticParams\(\) {\s*return \[\{.*?\}\]\s*\}\s*/g, '');
  content = content.replace(/'use client';/g, '').replace(/"use client"/;g, '');

  // 1. Create Client Component
  const clientPath = p.replace(/page\.(js|jsx|ts|tsx)$/, 'ClientPage.$1');
  fs.writeFileSync(clientPath, `'use client';\n\n${content}`);
  console.log('✅ Created Client Component: ' + clientPath);

  // 2. Create Server Component Wrapper
  const dirParts = path.dirname(p).split(path.sep);
  const params = [];
  dirParts.forEach(part => {
    if (part.startsWith('[') && part.endsWith(']')) {
      params.push(part.slice(1, -1));
    }
  });
  const returnObj = params.map(p => `${p}: "default"`).join(', ');
  const wrapperContent = `\nimport ClientPage from './ClientPage';\n\nexport async function generateStaticParams() {\n  return [{ ${returnObj} }];\n}\n\nexport default function Page() {\n  return <ClientPage />;\n}\n`;
  fs.writeFileSync(p, wrapperContent);
  console.log('✅ Created Server Component wrapper: ' + p);
});
console.log('Done.');