import os
from dotenv import load_dotenv

load_dotenv()

# Detect Provider: 'openai' or 'groq' (defaulting to groq unless specified or only openai key present)
provider = os.getenv("LLM_PROVIDER", "").strip().lower()

if not provider:
    if os.getenv("OPENAI_API_KEY") and not os.getenv("GROQ_API_KEY"):
        provider = "openai"
    else:
        provider = "groq"

if provider == "openai":
    from langchain_openai import ChatOpenAI
    openai_api_key = os.getenv("OPENAI_API_KEY")
    model_name = os.getenv("OPENAI_MODEL", os.getenv("GROQ_MODEL", "gpt-4o-mini"))
    llm = ChatOpenAI(
        model=model_name,
        api_key=openai_api_key,
        temperature=0.7
    )
    print(f"[Config] Initialized OpenAI model: '{model_name}'")
else:
    from langchain_groq import ChatGroq
    groq_api_key = os.getenv("GROQ_API_KEY")
    model_name = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    llm = ChatGroq(
        model=model_name,
        groq_api_key=groq_api_key,
        temperature=0.7
    )
    print(f"[Config] Initialized Groq model: '{model_name}'")
