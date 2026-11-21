import os

def process(directory):
    for root, dirs, files in os.walk(directory):
        if '[' in root:
            for file in files:
                if file in ['page.js', 'page.tsx', 'page.jsx']:
                    filepath = os.path.join(root, file)
                    with open(filepath, 'r') as f:
                        content = f.read()
                    
                    if 'ClientPage' in content:
                        continue
                    
                    parts = root.split('/')
                    params = []
                    for p in parts:
                        if p.startswith('[') and p.endswith(']'):
                            clean_p = p[1:-1]
                            if clean_p.startswith('...'):
                                clean_p = clean_p[3:]
                            params.append(clean_p)
                    
                    if not params:
                        continue
                    
                    has_client = False
                    if "'use client'" in content:
                        content = content.replace("'use client';", "").replace("'use client'", "")
                        has_client = True
                    elif '"use client"' in content:
                        content = content.replace('"use client";', "").replace('"use client"', "")
                        has_client = True
                    
                    if has_client:
                        ext = file.split('.')[-1]
                        client_path = os.path.join(root, f'ClientPage.{ext}')
                        with open(client_path, 'w') as cf:
                            cf.write("'use client';\n" + content)
                        
                        param_str = ', '.join([f'{p}: "default"' for p in params])
                        with open(filepath, 'w') as pf:
                            pf.write(f"import ClientPage from './ClientPage';\n\nexport async function generateStaticParams() {{\n  return [{{ {param_str} }}];\n}}\n\nexport default function Page() {{\n  return <ClientPage />;\n}}\n")
                        print(f"✅ Fixed: {filepath}")

process('app')
