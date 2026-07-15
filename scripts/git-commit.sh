#!/usr/bin/env bash
#
# Backwards-compatible alias for `scripts/git.sh commit`.
# All git identity handling lives in scripts/git.sh — see that file.
#
set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "usage: scripts/git-commit.sh <git commit args>   e.g. -m \"feat: add X\"" >&2
  exit 1
fi

exec "$(dirname "$0")/git.sh" commit "$@"
