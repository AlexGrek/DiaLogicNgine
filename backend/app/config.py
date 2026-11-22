"""Location of editable backend settings in development and on the deployment volume."""

import os
from pathlib import Path

ENV_FILE = Path(os.environ.get("DIALOGIC_ENV_FILE", Path(__file__).resolve().parents[1] / ".env"))
