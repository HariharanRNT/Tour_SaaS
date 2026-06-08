import os
import re

API_DIR = r'd:\Hariharan\G-Project\RNT_Tour\backend\app\api\v1'
OUTPUT_FILE = r'd:\Hariharan\G-Project\RNT_Tour\API_Documentation.md'

endpoints = []
# Pattern captures: method, path
pattern = re.compile(r'@(?:router|app)\.(get|post|put|delete|patch)\([\'"]([^\'"]+)[\'"]')
func_pattern = re.compile(r'def\s+([a-zA-Z0-9_]+)\s*\(')
model_pattern = re.compile(r'models\.([a-zA-Z0-9_]+)')

for filename in os.listdir(API_DIR):
    if filename.endswith('.py') and not filename.startswith('__'):
        filepath = os.path.join(API_DIR, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
            parts = pattern.split(content)
            
            i = 1
            while i < len(parts) - 1:
                method = parts[i].upper()
                path = parts[i+1]
                body = parts[i+2]
                
                # Find function name
                func_match = func_pattern.search(body)
                func_name = func_match.group(1) if func_match else "Unknown"
                
                # Find models
                models_used = set(model_pattern.findall(body))
                table_str = ', '.join(models_used) if models_used else "None explicitly found"
                
                # Try to clean up path if it has query params in the string which shouldn't happen with fastapi path
                
                endpoints.append({
                    'module': filename,
                    'name': func_name,
                    'method': method,
                    'path': path,
                    'tables': table_str
                })
                i += 3

with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    f.write("# API Documentation\n\n")
    f.write(f"**Total number of API calls:** {len(endpoints)}\n\n")
    
    f.write("| API Name | Method | Endpoint | Database Table(s) | Module / File Path |\n")
    f.write("|----------|--------|----------|-------------------|--------------------|\n")
    
    for ep in endpoints:
        f.write(f"| {ep['name']} | {ep['method']} | {ep['path']} | {ep['tables']} | {ep['module']} |\n")

print(f"Generated {OUTPUT_FILE} with {len(endpoints)} endpoints.")
