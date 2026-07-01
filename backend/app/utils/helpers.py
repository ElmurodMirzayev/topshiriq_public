"""Утилиты."""

def normalize_phone(phone: str) -> str:
    return "".join(filter(str.isdigit, phone))

def format_phone_display(phone: str) -> str:
    digits = normalize_phone(phone)
    if len(digits) == 12 and digits.startswith("998"):
        return f"+{digits[:3]} {digits[3:5]} {digits[5:8]} {digits[8:10]} {digits[10:12]}"
    elif len(digits) == 9:
        return f"+998 {digits[:2]} {digits[2:5]} {digits[5:7]} {digits[7:9]}"
    return f"+{digits}" if digits else phone
