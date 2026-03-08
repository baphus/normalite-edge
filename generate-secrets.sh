#!/bin/bash
# Generate secure JWT secrets for production
# Run this script and copy the output to your deployment environment

echo "Generate secure JWT secrets for Normalite EDGE"
echo "=============================================="
echo ""

# Check if openssl is available
if command -v openssl &> /dev/null; then
    echo "Using OpenSSL (recommended):"
    echo ""
    echo "JWT_ACCESS_SECRET="$(openssl rand -hex 32)
    echo "JWT_REFRESH_SECRET="$(openssl rand -hex 32)
else
    # Fallback to Node.js
    echo "Using Node.js:"
    echo ""
    node -e "
        const crypto = require('crypto');
        console.log('JWT_ACCESS_SECRET=' + crypto.randomBytes(32).toString('hex'));
        console.log('JWT_REFRESH_SECRET=' + crypto.randomBytes(32).toString('hex'));
    "
fi

echo ""
echo "Copy these values to your Render environment variables:"
echo "- Render Dashboard > Your Service > Environment > Add/Update"
