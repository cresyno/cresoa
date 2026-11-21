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

const pages = walk('app/dashboard');
let fixed = 0;
pages.forEach(p => {
  if (p.includes('[')) {
    let content = fs.readFileSync(p, 'utf8');
    if (!content.includes('generateStaticParams')) {
      const parts = p.split('/');
      const params = [];
      parts.forEach(part => {
        if (part.startsWith('[') && part.endsWith(']')) {
          const paramName = part.slice(1, -1);
          const cleanName = paramName.startsWith('...') ? paramName.slice(3) : paramName;
          params.push(cleanName);
        }
      });
      const returnObj = params.map(p => `${p}: "default"`).join(', ');
      const injection = `\nexport async function generateStaticParams() {\n  return [{ ${returnObj} }];
}\n`;
      if (content.trimStart().startsWith("'use client'") || content.trimStart().startsWith('"use client"')) {
         const lines = content.split('\n');
         let insertIndex = 0;
         for (let i = 0; i < lines.length; i++) {
           if (lines[i].includes('use client')) {
             insertIndex = i + 1;
             break;
           }
         }
         lines.splice(insertIndex, 0, injection);
         content = lines.join('\n');
      } else {
         content = injection + content;
      }
      fs.writeFileSync(p, content);
      console.log('✅ Fixed: ' + p);
      fixed++;
    }
  }
});
console.log('Done. Fixed ' + fixed + ' files.');