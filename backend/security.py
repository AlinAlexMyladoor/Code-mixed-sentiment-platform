import re

# Regex patterns for common PII
EMAIL_PATTERN = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
PHONE_PATTERN = re.compile(r'(?:\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}')
CC_PATTERN = re.compile(r'\b(?:\d[ -]*?){13,16}\b')

def mask_pii(text: str) -> str:
    """
    Redacts emails, phone numbers, and potential credit card numbers from a string.
    """
    if not text:
        return text
        
    text = EMAIL_PATTERN.sub('[EMAIL_REDACTED]', text)
    text = PHONE_PATTERN.sub('[PHONE_REDACTED]', text)
    text = CC_PATTERN.sub('[CC_REDACTED]', text)
    
    return text
