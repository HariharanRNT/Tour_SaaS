import sys

def count_stuff(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    braces = 0
    brackets = 0
    parens = 0
    
    div_open = content.count('<div')
    div_close = content.count('</div>')
    
    for char in content:
        if char == '{': braces += 1
        elif char == '}': braces -= 1
        elif char == '[': brackets += 1
        elif char == ']': brackets -= 1
        elif char == '(': parens += 1
        elif char == ')': parens -= 1
        
    print(f"Braces balance: {braces}")
    print(f"Brackets balance: {brackets}")
    print(f"Parens balance: {parens}")
    print(f"Div open: {div_open}")
    print(f"Div close: {div_close}")

if __name__ == "__main__":
    count_stuff(sys.argv[1])
