import sys
import os
sys.path.append(os.path.abspath('backend'))
from app.schemas.packages import PackageUpdate

print("Fields in PackageUpdate:")
for field in PackageUpdate.__fields__:
    print(" -", field)

print("\nParsing a dict:")
data = {
    "title": "Test Title",
    "advance_payment_type": "fixed",
    "advance_payment_value": 600,
    "split_payment_enabled": True
}
pkg = PackageUpdate(**data)
print("Parsed advance_payment_type:", pkg.advance_payment_type)
print("Parsed advance_payment_value:", pkg.advance_payment_value)
print("Parsed split_payment_enabled:", pkg.split_payment_enabled)
