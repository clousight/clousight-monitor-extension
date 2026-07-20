#!/usr/bin/env bash
#
# Identity- and remote-injecting git wrapper.
#
# This repo stores NO git identity AND NO remote in .git/config: the local
# user.name/user.email are left empty on purpose (so a plain `git commit`/`git
# pull` fails instead of leaking a personal/global identity), and there is no
# persisted `origin`. Run every git operation through this script — it stamps
# the project identity and the `origin` remote at run time only, writing nothing
# to .git/config.
#
#   ./scripts/git.sh commit -m "feat: ..."
#   ./scripts/git.sh push
#   ./scripts/git.sh pull --rebase
#
# npm shortcuts: `npm run commit -- -m "..."`, `npm run push`, `npm run pull`.
#
# Override per-invocation with env vars:
#   CLOUSIGHT_GIT_NAME="you" CLOUSIGHT_GIT_EMAIL="you@example.com" npm run commit -- -m "..."
#   CLOUSIGHT_GIT_REMOTE="git@github.com:me/fork.git" npm run push
#
set -euo pipefail

NAME="${CLOUSIGHT_GIT_NAME:-Clousight}"
EMAIL="${CLOUSIGHT_GIT_EMAIL:-clousight@users.noreply.github.com}"
REMOTE="${CLOUSIGHT_GIT_REMOTE:-https://github.com/clousight/clousight-monitor-extension}"

# Enforce the repo's commit-msg hook (strips AI-assistant attribution) for every
# scripted git operation. Idempotent; writes only a hooksPath, no identity/remote.
git config core.hooksPath scripts/hooks >/dev/null 2>&1 || true

if [ "$#" -eq 0 ]; then
  echo "usage: scripts/git.sh <git args>   e.g. commit -m \"...\" | push | pull --rebase" >&2
  exit 1
fi

# Branch to wire the ephemeral `origin` tracking to, so a bare `push`/`pull`
# resolves without persisted branch config. Falls back to main on a fresh repo.
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)"

# All -c overrides apply to this single command only; .git/config is untouched.
exec git \
  -c user.name="$NAME" \
  -c user.email="$EMAIL" \
  -c remote.origin.url="$REMOTE" \
  -c remote.origin.fetch="+refs/heads/*:refs/remotes/origin/*" \
  -c "branch.${BRANCH}.remote=origin" \
  -c "branch.${BRANCH}.merge=refs/heads/${BRANCH}" \
  "$@"
