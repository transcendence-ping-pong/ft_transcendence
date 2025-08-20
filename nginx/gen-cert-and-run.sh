#!/bin/sh
set -e

CERT_DIR=/etc/nginx/certs
CRT="$CERT_DIR/selfsigned.crt"
KEY="$CERT_DIR/selfsigned.key"

# ensure openssl is available (alpine image may not include it)
if ! command -v openssl >/dev/null 2>&1; then
  echo "[nginx] installing openssl..."
  apk add --no-cache openssl > /dev/null
fi

mkdir -p "$CERT_DIR"

if [ ! -f "$CRT" ] || [ ! -f "$KEY" ]; then
  echo "[nginx] generating self-signed certificate for localhost..."
  openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
    -subj "/CN=localhost" \
    -keyout "$KEY" -out "$CRT"
fi

echo "[nginx] starting nginx with HTTPS on port 9019"
exec nginx -g 'daemon off;'


