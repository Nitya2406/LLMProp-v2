# test_groq.py
import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("GROQ_API_KEY")
print("Key found:", key[:10] if key else "NO KEY FOUND")

client = Groq(api_key=key)

response = client.chat.completions.create(
    model    = "llama3-8b-8192",
    messages = [
        {"role": "user", "content": "Say hello"}
    ],
    max_tokens = 50
)

print("Response:", response.choices[0].message.content)