#!/usr/bin/env sh

# Generate a 64-byte (512-bit) random secret, base64 encoded
COOKIE_SECRET=$(openssl rand -base64 64)

echo "COOKIE_SECRET=$COOKIE_SECRET"
