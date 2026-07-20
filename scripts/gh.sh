#!/usr/bin/env bash
#
# gh wrapper pinning this repo to the clousight-dev GitHub identity.
#
# `gh`'s auth is GLOBAL (~/.config/gh), so a plain `gh` in this repo would act as
# whatever account is active elsewhere (e.g. your default account). This wrapper points gh
# at an ISOLATED config dir, so `gh` operations here always run as clousight-dev
# while `gh` in every other project keeps using your default account, untouched.
# Nothing global is modified — same runtime-injection philosophy as git.sh.
#
# One-time setup — log the isolated config dir in as clousight-dev:
#
#   GH_CONFIG_DIR="$HOME/.config/gh-clousight" gh auth login \
#     --hostname github.com --git-protocol ssh
#
#   Choose "Paste an authentication token" and paste a clousight-dev PAT created
#   at https://github.com/settings/tokens (classic) while signed in as
#   clousight-dev, with scopes: repo, workflow, admin:org, read:org.
#   (Browser login also works, but make sure the browser is signed in as
#   clousight-dev, or GitHub will authorize the wrong account.)
#
# Then use it exactly like gh:
#
#   npm run gh -- auth status
#   npm run gh -- pr create --base main --fill
#   npm run gh -- pr merge --squash --delete-branch
#   npm run gh -- api repos/clousight/clousight-monitor-extension/...
#
# Override the config dir per-invocation with CLOUSIGHT_GH_CONFIG_DIR.
#
set -euo pipefail

export GH_CONFIG_DIR="${CLOUSIGHT_GH_CONFIG_DIR:-$HOME/.config/gh-clousight}"

if [ ! -f "$GH_CONFIG_DIR/hosts.yml" ]; then
  cat >&2 <<EOF
clousight-dev gh identity is not set up yet (no $GH_CONFIG_DIR/hosts.yml).

Run this one-time login (paste a clousight-dev PAT when prompted):

  GH_CONFIG_DIR="$GH_CONFIG_DIR" gh auth login --hostname github.com --git-protocol ssh

See the header of scripts/gh.sh for details.
EOF
  exit 1
fi

exec gh "$@"
