from cryptography.fernet import Fernet
from app.config import settings
import base64
import logging

logger = logging.getLogger(__name__)

# Ensure we have a valid key. In production this should be a proper secret.
# Fallback to a derived key if specific one not set (for dev convenience, though insecure for prod without proper env override)
try:
    # Attempt to use a secret from settings, or generate a deterministic one based on valid secret if possible
    # For now, we will assume settings.SECRET_KEY exists and use it to derive a Fernet key if specific ENCRYPTION_KEY is missing
    key_str = getattr(settings, "ENCRYPTION_KEY", None)
    
    if not key_str:
        # Create a 32-byte url-safe base64-encoded key from the app secret
        # This is a dev convenience. In prod, provide a dedicated random 32-byte base64 key.
        secret = settings.SECRET_KEY if hasattr(settings, "SECRET_KEY") else "super-secret-default-key-change-me"
        # Pad or truncate to 32 bytes for safety before b64 (Fernet needs 32 bytes)
        # Actually Fernet.generate_key() returns a URL-safe base64-encoded 32-byte key. 
        # To make it deterministic from secret:
        import hashlib
        m = hashlib.sha256()
        m.update(secret.encode('utf-8'))
        key_bytes = m.digest() # 32 bytes
        key_str = base64.urlsafe_b64encode(key_bytes).decode('utf-8')
        
    _cipher = Fernet(key_str)

except Exception as e:
    logger.warning(f"Encryption setup failed: {e}. Falling back to insecure dummy encryption.")
    _cipher = None

def encrypt_value(value: str) -> str:
    """Encrypts a string value."""
    if not value:
        return value
    if not _cipher:
        return f"plain:{value}" # Fallback for dev/broken config
    
    try:
        return _cipher.encrypt(value.encode('utf-8')).decode('utf-8')
    except Exception as e:
        logger.error(f"Encryption failed: {e}")
        raise ValueError("Failed to encrypt data")

def decrypt_value(value: str) -> str:
    """Decrypts a string value."""
    if not value:
        return value
    if value.startswith("plain:"):
        return value[6:]
    if not _cipher:
        return value # Should not happen if data was encrypted with cipher
        
    try:
        return _cipher.decrypt(value.encode('utf-8')).decode('utf-8')
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        raise ValueError("Failed to decrypt data")
