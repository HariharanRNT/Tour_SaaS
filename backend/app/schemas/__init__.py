"""Schema package - re-exports from parent schemas.py and adds new template schemas"""

# Import everything from the parent-level schemas.py file
import sys
import os

# Get the parent directory (app/) to import schemas.py
parent_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
schemas_file = os.path.join(parent_path, 'schemas.py')

# Import from parent schemas.py using exec to avoid circular imports
with open(schemas_file, 'r', encoding='utf-8') as f:
    exec(f.read(), globals())

# Now import from local modules
try:
    from .templates import *
except ImportError:
    pass

try:
    from .enums import *
except ImportError:
    pass

try:
    from .itinerary_schemas import *
except ImportError:
    pass
