import os
import httpx
from dotenv import load_dotenv
from typing import List, Dict, Union

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is missing. Please check your .env file.")

# Function to send chat messages to Groq
async def call_llm(messages: List[Dict[str, str]]) -> Union[str, Dict[str, str]]:
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "llama3-70b-8192",
        "messages": messages
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]

        except httpx.HTTPStatusError as http_err:
            return {
                "error": {
                    "type": "http_error",
                    "status_code": http_err.response.status_code,
                    "message": http_err.response.text
                }
            }
        except Exception as e:
            return {
                "error": {
                    "type": "unexpected_error",
                    "message": str(e)
                }
            }
