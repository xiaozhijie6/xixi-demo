# -*- coding: utf-8 -*-
"""Push the pending commit to GitHub via Git Data API (workaround when github.com:443 is unreachable)."""
import base64, json, subprocess, sys

REPO = "xiaozhijie6/xixi-demo"
MSG = "资源加版本号：强制移动端刷新缓存（CSS/JS）"
CHANGED = ["demo/index.html", "tools/api_push.py"]
ADDED = []
DELETED = []

def gh(args, payload=None):
    cmd = ["gh", "api"] + args
    if payload is not None:
        cmd += ["--input", "-"]
        p = subprocess.run(cmd, input=json.dumps(payload).encode(), capture_output=True)
    else:
        p = subprocess.run(cmd, capture_output=True)
    if p.returncode != 0:
        sys.exit("gh api failed: %s\n%s" % (" ".join(cmd), p.stderr.decode(errors="replace")))
    return json.loads(p.stdout.decode())

base = gh([f"repos/{REPO}/branches/master"])
base_sha = base["commit"]["sha"]
base_tree = base["commit"]["commit"]["tree"]["sha"]
print("base", base_sha[:8])

def blob(path):
    data = base64.b64encode(open(path, "rb").read()).decode()
    r = gh([f"repos/{REPO}/git/blobs", "-X", "POST"], {"content": data, "encoding": "base64"})
    print("blob", path, r["sha"][:8])
    return r["sha"]

tree = []
for f in CHANGED + ADDED:
    tree.append({"path": f, "mode": "100644", "type": "blob", "sha": blob(f)})
for f in DELETED:
    tree.append({"path": f, "mode": "100644", "type": "blob", "sha": None})

t = gh([f"repos/{REPO}/git/trees", "-X", "POST"], {"base_tree": base_tree, "tree": tree})
print("tree", t["sha"][:8])
c = gh([f"repos/{REPO}/git/commits", "-X", "POST"], {"message": MSG, "tree": t["sha"], "parents": [base_sha]})
print("commit", c["sha"][:8])
gh([f"repos/{REPO}/git/refs/heads/master", "-X", "PATCH"], {"sha": c["sha"], "force": False})
print("remote master updated ->", c["sha"][:8])
