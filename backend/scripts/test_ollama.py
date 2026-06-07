import json
import urllib.error
import urllib.request

body = json.dumps(
    {
        "model": "qwen2.5:7b-instruct-q4_K_M",
        "prompt": 'Reply only valid JSON: {"ok": 1}',
        "stream": False,
        "options": {"temperature": 0, "num_ctx": 2048},
    }
).encode()
req = urllib.request.Request(
    "http://127.0.0.1:11434/api/generate",
    data=body,
    headers={"Content-Type": "application/json"},
    method="POST",
)
try:
    with urllib.request.urlopen(req, timeout=180) as resp:
        data = json.loads(resp.read())
        print("status OK")
        print(data.get("response", "")[:300])
except urllib.error.HTTPError as e:
    print("HTTP", e.code, e.read().decode()[:500])
except Exception as e:
    print("ERR", type(e).__name__, e)
