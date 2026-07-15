#!/usr/bin/env bash
#
# Identity-injecting git wrapper.
#
# This repo stores NO git identity: the local user.name/user.email are left
# empty on purpose, so a plain `git commit`/`git pull` (that needs to record an
# author) fails instead of leaking a personal/global identity. Run every git
# operation through this script — it stamps the project identity at run time
# only, writing nothing to .git/config.
#
#   ./scripts/git.sh commit -m "feat: ..."
#   ./scripts/git.sh push
#   ./scripts/git.sh pull --rebase
#
# npm shortcuts: `npm run commit -- -m "..."`, `npm run push`, `npm run pull`.
#
# Override the identity per-invocation with env vars:
#   CLOUSIGHT_GIT_NAME="you" CLOUSIGHT_GIT_EMAIL="you@example.com" npm run commit -- -m "..."
#
set -euo pipefail

NAME="${CLOUSIGHT_GIT_NAME:-Clousight}"
EMAIL="${CLOUSIGHT_GIT_EMAIL:-clousight@users.noreply.github.com}"

if [ "$#" -eq 0 ]; then
  echo "usage: scripts/git.sh <git args>   e.g. commit -m \"...\" | push | pull --rebase" >&2
  exit 1
fi

# -c overrides identity for this single command only; .git/config is untouched.
exec git -c user.name="$NAME" -c user.email="$EMAIL" "$@"
