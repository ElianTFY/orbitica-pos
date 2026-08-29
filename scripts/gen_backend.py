import os

BASE = r'apps/api'

def save(rel, content):
    p = os.path.join(BASE, rel.replace('/', os.sep))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as fp:
        fp.write(content.strip() + '\n')
    print('Created:', rel)
