import uvicorn
import sys
import os

# Bỏ qua kiểm tra phiên bản Windows cho Node.js / Playwright (hỗ trợ Windows Server 2012 R2)
os.environ["NODE_SKIP_PLATFORM_CHECK"] = "1"

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    port = int(os.environ.get("BACKEND_PORT", os.environ.get("PORT", 8000)))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=False
    )
