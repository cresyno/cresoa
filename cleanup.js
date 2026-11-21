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

const files = walk('app');
let fixedCount = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const regex = /export async function generateStaticParams() {\s*return [\{ slug: "default", id: "default" \}];\s*\}\s*/g;
  if (regex.test(content)) {
    content = content.replace(regex, '');
    fs.writeFileSync(file, content);
    fixedCount++;
  }
});
console.log('Cleaned up ' + fixedCount + ' files.');
