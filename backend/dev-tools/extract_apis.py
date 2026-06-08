import os
import re
import csv

API_DIR = r'd:\Hariharan\G-Project\RNT_Tour\backend\app\api\v1'
OUTPUT_FILE = r'api_endpoints.csv'

endpoints = []
pattern = re.compile(r'@(?:router|app)\.(get|post|put|delete|patch)\([\'"]([^\'"]+)[\'"]')
model_pattern = re.compile(r'models\.([a-zA-Z0-9_]+)')

for filename in os.listdir(API_DIR):
    if filename.endswith('.py') and not filename.startswith('__'):
        filepath = os.path.join(API_DIR, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
            # Find all endpoints by splitting on router decorators
            # This is a bit rough, but better than full AST for simple matching
            parts = re.split(r'@(?:router|app)\.(get|post|put|delete|patch)\([\'"]([^\'"]+)[\'"]', content)
            
            # parts[0] is code before first decorator
            # parts[1] is method, parts[2] is path, parts[3] is function body up to next decorator, etc.
            i = 1
            while i < len(parts) - 1:
                method = parts[i].upper()
                path = parts[i+1]
                body = parts[i+2]
                
                # Try to extract models used in this function body
                models_used = set(model_pattern.findall(body))
                table_str = ', '.join(models_used)
                
                endpoints.append({
                    'module': filename,
                    'method': method,
                    'path': path,
                    'tables': table_str
                })
                i += 3

with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=['module', 'method', 'path', 'tables'])
    writer.writeheader()
    for ep in endpoints:
        writer.writerow(ep)

print(f'Extracted {len(endpoints)} endpoints')
