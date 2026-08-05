import os, re

files_to_fix = [
    'backend/app/api/v1/agent_packages.py',
    'backend/app/api/v1/bookings.py',
    'backend/app/api/v1/agent_bookings.py',
    'backend/app/api/v1/payments.py',
    'backend/app/api/v1/webhooks.py'
]

for path in files_to_fix:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'FastAPICache.clear(' in content:
        # Replace the clears
        content = re.sub(r'await FastAPICache\.clear\(namespace="(.*?)"\)', r'await invalidate_namespace("\1")', content)
        
        # Add import if missing
        if 'invalidate_namespace' not in content:
            if 'from app.core.cache import' in content:
                content = content.replace('from app.core.cache import safe_cache', 'from app.core.cache import safe_cache, invalidate_namespace')
            else:
                content = 'from app.core.cache import invalidate_namespace\n' + content
                
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {path}")
