import os
import base64

ROOT = r"C:\Users\elian\.gemini\antigravity\scratch\orbitica-pos"

def write_b64(rel_path, b64_content):
    full_path = os.path.join(ROOT, rel_path.replace("/", os.sep))
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    decoded = base64.b64decode(b64_content).decode("utf-8")
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(decoded.strip() + "\n")
    print(f"Generated: {rel_path}")

if __name__ == "__main__":
    print("Generator initialized.")