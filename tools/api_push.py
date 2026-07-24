# -*- coding: utf-8 -*-
"""Push the pending commit to GitHub via Git Data API (workaround when github.com:443 is unreachable)."""
import base64, json, subprocess, sys

REPO = "xiaozhijie6/xixi-demo"
MSG = "仓库瘦身：删除 playground 对比稿、旧问卷版、concerns 探索页、重复脚本与无用图片"
CHANGED = ["tools/api_push.py"]
ADDED = []
DELETED = ['assets/onboard/v2-mood.png', 'assets/onboard/v2-name.png', 'assets/onboard/v2-prefer.png', 'assets/onboard/v2-relation.png', 'assets/onboard/v2-troubles.png', 'assets/onboard/v3-mood.png', 'assets/onboard/v3-name.png', 'assets/onboard/v3-prefer.png', 'assets/onboard/v3-relation.png', 'assets/onboard/v3-troubles.png', 'assets/onboard/v4-botanical.png', 'assets/onboard/v4-hero.png', 'assets/onboard/v4-shapes.png', 'demo/companion-variants.html', 'demo/concerns/index.html', 'demo/concerns/v1.html', 'demo/concerns/v2.html', 'demo/concerns/v3.html', 'demo/concerns/v4-flow.html', 'demo/concerns/v4.html', 'demo/concerns/v5.html', 'demo/concerns/v6.html', 'demo/home-3d-variants.html', 'demo/home-final-variants.html', 'demo/js/onboard-core.js', 'demo/mood-calendar.html', 'demo/mood-hero.html', 'demo/onboard-v2.html', 'demo/onboard-v3.html', 'demo/onboard.html', 'shot_demo.py', 'tools/batch_onboard.json', 'tools/gen_concerns.py', 'tools/shot_concerns.py', 'tools/shot_home3d_variants.py', 'verify_center.py']

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

# 只删除远端真实存在的路径，否则 GitHub 返回 422
base_paths = {e["path"] for e in gh([f"repos/{REPO}/git/trees/{base_tree}?recursive=1"]).get("tree", [])}
deleted_ok = [f for f in DELETED if f in base_paths]
if len(deleted_ok) != len(DELETED):
    print("skip non-remote paths:", len(DELETED) - len(deleted_ok))

tree = []
for f in CHANGED + ADDED:
    tree.append({"path": f, "mode": "100644", "type": "blob", "sha": blob(f)})
for f in deleted_ok:
    tree.append({"path": f, "mode": "100644", "type": "blob", "sha": None})

t = gh([f"repos/{REPO}/git/trees", "-X", "POST"], {"base_tree": base_tree, "tree": tree})
print("tree", t["sha"][:8])
c = gh([f"repos/{REPO}/git/commits", "-X", "POST"], {"message": MSG, "tree": t["sha"], "parents": [base_sha]})
print("commit", c["sha"][:8])
gh([f"repos/{REPO}/git/refs/heads/master", "-X", "PATCH"], {"sha": c["sha"], "force": False})
print("remote master updated ->", c["sha"][:8])
