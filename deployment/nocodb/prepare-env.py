#!/usr/bin/env python3
"""Create credentials locally; do not print values or overwrite existing secrets."""
import argparse
import os
from pathlib import Path
import secrets
from urllib.parse import urlsplit

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='https://crm.spanler.com')
parser.add_argument('--port', type=int, default=8088)
args = parser.parse_args()
u = urlsplit(args.url)
if u.scheme != 'https' or not u.hostname or u.username or u.password or u.path not in ('', '/') or u.query or u.fragment or any(c.isspace() for c in args.url):
    parser.error('URL must be an HTTPS origin, without credentials, query or path')
if not 1024 <= args.port <= 65535:
    parser.error('Choose an available unprivileged local port')
path = Path(__file__).resolve().parent / '.env'
try:
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
except FileExistsError:
    print('Preserved existing .env. Edit it securely if settings must change.')
else:
    with os.fdopen(fd, 'w') as stream:
        stream.write(f'CRM_PUBLIC_URL={args.url.rstrip("/")}\nCRM_LOCAL_PORT={args.port}\nPOSTGRES_PASSWORD={secrets.token_hex(32)}\nNC_AUTH_JWT_SECRET={secrets.token_hex(48)}\n')
    print('Created .env (0600) with random secrets; no credentials were printed.')
