#!/usr/bin/env bash
ABSOLUTE_PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec node "$ABSOLUTE_PROJECT_DIR/.output/server/index.mjs"
