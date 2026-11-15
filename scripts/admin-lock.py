#!/usr/bin/env python3
"""Lock or unlock Admin/index.html (PBKDF2-SHA256 600000 + AES-GCM, same scheme as the page).
Change the password:
  python3 scripts/admin-lock.py unlock Admin/index.html admin_plain.html     (asks for the OLD password)
  python3 scripts/admin-lock.py lock admin_plain.html Admin/index.html       (asks for the NEW password)
Keep admin_plain.html out of the repo. Needs: pip install cryptography
"""
import sys, re, json, base64, os, getpass
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
N = 600000
b64 = base64.b64decode
def key(pw, salt):
    return PBKDF2HMAC(hashes.SHA256(), 32, salt, N).derive(pw.encode())
mode, src, dst = sys.argv[1:4]
pw = os.environ.get("ADMIN_PW") or getpass.getpass("Password: ")
if mode == "unlock":
    h = open(src, encoding="utf8").read()
    P = json.loads(re.search(r"var P=(\{.*?\});", h, re.S).group(1))
    open(dst, "w", encoding="utf8").write(AESGCM(key(pw, b64(P["s"]))).decrypt(b64(P["i"]), b64(P["d"]), None).decode())
else:
    plain = open(src, encoding="utf8").read()
    shell = open(dst, encoding="utf8").read()
    salt, iv = os.urandom(16), os.urandom(12)
    d = AESGCM(key(pw, salt)).encrypt(iv, plain.encode(), None)
    P = {"s": base64.b64encode(salt).decode(), "i": base64.b64encode(iv).decode(), "n": N, "d": base64.b64encode(d).decode()}
    shell = re.sub(r"var P=\{.*?\};", lambda m: "var P=" + json.dumps(P, separators=(",", ":")) + ";", shell, count=1, flags=re.S)
    open(dst, "w", encoding="utf8").write(shell)
print("done")
