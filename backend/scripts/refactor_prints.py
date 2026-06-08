import os
import re

SERVICE_DIR = r"d:\Hariharan\G-Project\RNT_Tour\backend\app\services"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip if no print statements
    if 'print(' not in content:
        return

    # Check if logging is imported
    has_logging = 'import logging' in content
    has_logger = 'logger = logging.getLogger(' in content

    lines = content.split('\n')
    new_lines = []
    
    # Track if we need to insert logger
    inserted_logger = has_logger
    
    for i, line in enumerate(lines):
        # Insert import logging at top if needed
        if not has_logging and line.startswith('import ') and not 'logging' in line:
            new_lines.append('import logging')
            has_logging = True
            
        new_lines.append(line)
        
        # Insert logger definition after imports
        if has_logging and not inserted_logger and not line.startswith('import ') and not line.startswith('from '):
            # Check if previous lines were imports
            prev_was_import = any(l.startswith('import ') or l.startswith('from ') for l in lines[max(0, i-5):i])
            if prev_was_import and line.strip() == '':
                new_lines.append('logger = logging.getLogger(__name__)')
                inserted_logger = True

    content = '\n'.join(new_lines)
    
    # If still no logger, put it at top
    if not inserted_logger:
        content = "import logging\nlogger = logging.getLogger(__name__)\n" + content

    # Replace print( with logger.info( or logger.error(
    # Basic heuristic: if the line contains 'error', 'fail', 'traceback', use logger.error
    # if it contains 'DEBUG', use logger.debug
    # else logger.info
    
    def repl(match):
        indent = match.group(1)
        args = match.group(2)
        lower_args = args.lower()
        
        if 'error' in lower_args or 'fail' in lower_args or 'traceback' in lower_args:
            func = 'logger.error'
        elif 'debug' in lower_args:
            func = 'logger.debug'
        else:
            func = 'logger.info'
            
        return f"{indent}{func}({args})"
        
    # Matches: "    print(" followed by everything until the balanced closing parenthesis.
    # Actually, regex for balanced parens is hard. A simple substitute is replacing 'print(' with 'logger.info(' and fixing up manually if needed.
    # But since print usually ends at the end of line, we can just replace print(
    
    new_content = []
    for line in content.split('\n'):
        if re.search(r'^(\s*)print\((.*)\)\s*$', line):
            m = re.match(r'^(\s*)print\((.*)\)\s*$', line)
            indent = m.group(1)
            args = m.group(2)
            lower_args = args.lower()
            if 'error' in lower_args or 'fail' in lower_args or 'traceback' in lower_args:
                func = 'logger.error'
            elif 'debug' in lower_args:
                func = 'logger.debug'
            else:
                func = 'logger.info'
            line = f"{indent}{func}({args})"
        new_content.append(line)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write('\n'.join(new_content))
    print(f"Refactored {filepath}")

for root, dirs, files in os.walk(SERVICE_DIR):
    for f in files:
        if f.endswith('.py'):
            process_file(os.path.join(root, f))
