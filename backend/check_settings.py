
import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path("c:/money/backend")
sys.path.append(str(backend_dir))

from app.core.config import settings

print(f"BACKEND_CORS_ORIGINS: {settings.BACKEND_CORS_ORIGINS}")
