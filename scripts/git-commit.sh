#!/usr/bin/env bash
#
# Commit with the project's pseudonymous identity, applied ONLY at commit time.
#
# This repo intentionally stores no git identity (the local user.name/user.email
# are left empty), so a plain `git commit` fails instead of leaking whatever
# global identity happens to be configured. Commit through this script instead:
#
#   ./scripts/git-commit.sh -m "feat: ..."
#   npm run commit -- -m "feat: ..."
#
# Override the identity per-invocation with env vars if needed:
#   CLOUSIGHT_GIT_NAME="you" CLOUSIGHT_GIT_EMAIL="you@example.com" npm run commit -- -m "..."
#
set -euo pipefail

NAME="${CLOUSIGHT_GIT_NAME:-Clousight}"
EMAIL="${CLOUSIGHT_GIT_EMAIL:-clousight@users.noreply.github.com}"

if [ "$#" -eq 0 ]; then
  echo "usage: scripts/git-commit.sh <git commit args>   e.g. -m \"feat: add X\"" >&2
  exit 1
fi

# -c overrides both author and committer for this single command, without
# writing anything to .git/config.
exec git -c user.name="$NAME" -c user.email="$EMAIL" commit "$@"
