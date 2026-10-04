import os
from langchain_groq import ChatGroq
from dotenv import load_dotenv

load_dotenv()

model_name = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

llm = ChatGroq(
    model=model_name, 
    temperature=0.7
)

