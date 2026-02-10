"""
Quick test to verify imports work
"""
print("Testing imports...")

try:
    from google import genai
    print("[OK] google.genai imported")
except Exception as e:
    print(f"[FAIL] google.genai failed: {e}")

try:
    from app.core.redis import get_redis
    print("[OK] Redis get_redis imported")
except Exception as e:
    print(f"[FAIL] Redis import failed: {e}")

try:
    from app.services.gemini_service import gemini_service
    print("[OK] Gemini service imported")
except Exception as e:
    print(f"[FAIL] Gemini service failed: {e}")

try:
    from app.api.v1 import ai_assistant
    print("[OK] AI Assistant API imported")
except Exception as e:
    print(f"[FAIL] AI Assistant API failed: {e}")

print("\nAll imports successful! Backend should start now.")
