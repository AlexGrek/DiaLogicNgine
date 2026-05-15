import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 4267))
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
