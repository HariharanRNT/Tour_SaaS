
import os
import sys

# Ensure backend path is in sys.path
sys.path.append(os.getcwd())

from app.config import settings

def main():
    key = settings.TRIPJACK_API_KEY
    print(f"TRIPJACK_API_KEY loaded: {key[:5]}...{key[-5:] if key else ''} (Length: {len(key)})")
    
    expected_start = "11269"
    if key.startswith(expected_start):
        print("MATCHES .env file key.")
    else:
        print("DOES NOT MATCH .env file key.")

if __name__ == "__main__":
    main()
