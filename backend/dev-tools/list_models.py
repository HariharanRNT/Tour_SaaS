import os
from google import genai

GEMINI_API_KEY = "AIzaSyDe9BPbop-BYF_AQUYRUMt_Qf-2zfiUqlM"
client = genai.Client(api_key=GEMINI_API_KEY)

print("Listing models...")
for m in client.models.list():
    print(f"Model: {m.name}")
