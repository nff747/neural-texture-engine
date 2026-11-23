#!/usr/bin/env bash
# Local verification launcher for Neural Texture Engine
set -euo pipefail

echo "=========================================================="
echo " Running Local Verification for Neural Texture Engine"
echo "=========================================================="

if [ -f "tools/verify.mjs" ]; then
  node tools/verify.mjs
elif [ -d "tests" ]; then
  node --test tests/*.test.mjs
fi

echo "All tests verified successfully!"
