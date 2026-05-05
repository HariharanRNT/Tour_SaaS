import re

_SQL_PATTERN = re.compile(
    r"(--|\bDROP\s+TABLE\b|\bDROP\s+DATABASE\b|\bUNION\s+SELECT\b|\bSELECT\b.*\bFROM\b|\bINSERT\s+INTO\b|\bDELETE\s+FROM\b|\bUPDATE\b.*\bSET\b|'\\ *OR\s+|xp_)",
    re.IGNORECASE | re.DOTALL
)

test_values = [
    'sdfghjkl;kjyhn',
    'Select your flight',
    'Drop Table users',
    'SELECT * FROM users',
    'normal text',
    'text with -- comments',
    "admin' OR 1=1"
]

for val in test_values:
    match = _SQL_PATTERN.search(val)
    print(f"Value: {val} -> Match: {bool(match)}")
