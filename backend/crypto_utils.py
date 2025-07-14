from cryptography.fernet import Fernet
import os
from dotenv import load_dotenv

load_dotenv()
def load_key():
    # Get the key from the environment variable named 'EMAIL_ENCRYPTION_KEY'
    key = os.environ.get("EMAIL_ENCRYPTION_KEY")
    if not key:
        raise ValueError("EMAIL_ENCRYPTION_KEY not set in environment.")
    return key.encode()

fernet = Fernet(load_key())

def encrypt_message(message: str) -> str:
    return fernet.encrypt(message.encode()).decode()

def decrypt_message(token: str) -> str:
    return fernet.decrypt(token.encode()).decode()
