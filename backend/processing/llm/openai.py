import os

from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()

_api_key = os.getenv("OPENAI_API_KEY")
client = AsyncOpenAI(api_key=_api_key)
