from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from utils.llm_client import call_llm
import uvicorn
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# CORS (allow all for now)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Hello from Lord Ragu's AI!"}

@app.post("/chat")
async def chat(request: Request):
    try:
        body = await request.json()
        messages = body.get("messages")
        
        if not messages or not isinstance(messages, list):
            return JSONResponse(
                status_code=400,
                content={"error": "Missing or invalid 'messages' list in request body."}
            )

        response = await call_llm(messages)

        if isinstance(response, dict) and "error" in response:
            return JSONResponse(status_code=400, content=response)

        return {"response": response}

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Unexpected error in server: {str(e)}"}
        )

# For running directly
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
