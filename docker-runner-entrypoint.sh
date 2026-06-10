#!/bin/sh
# Ephemeral agent runner (Phase 3 — execution isolation).
# Runs in a locked-down Job pod with NO app secrets and NO k8s API access.
# All inputs arrive via the per-run Secret (envFrom). It clones the repo fresh
# into /work, runs the Claude agent, and lets the MCP server report results back
# to the app API. Never touches the app's database or PVC.
set -e

: "${REPO_URL:?REPO_URL required}"
: "${BRANCH:?BRANCH required}"
: "${STORY_ID:?STORY_ID required}"

echo "[runner] starting run for story ${STORY_ID} on branch ${BRANCH}"

# Git identity for the agent's commits.
git config --global user.email "${GIT_AUTHOR_EMAIL:-agent@codepylot.dev}"
git config --global user.name "${GIT_AUTHOR_NAME:-CodePylot Agent}"
git config --global --add safe.directory '*'

# Fresh clone into the ephemeral work dir (token is embedded in REPO_URL).
git clone --depth 50 "$REPO_URL" /work/repo
cd /work/repo

# Branch: reuse if it exists on the remote, else create from the default branch.
if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
  git checkout -B "$BRANCH" "origin/$BRANCH"
else
  git checkout -b "$BRANCH"
fi

# Materialize the MCP config and prompt from env.
printf '%s' "$MCP_CONFIG" > /tmp/mcp.json
printf '%s' "$PROMPT" > /tmp/prompt.txt

echo "[runner] invoking claude…"
# ANTHROPIC_API_KEY / CLAUDE_CODE_OAUTH_TOKEN come from the per-run Secret env.
claude --print --dangerously-skip-permissions --mcp-config /tmp/mcp.json -p "$(cat /tmp/prompt.txt)"
code=$?

echo "[runner] claude exited with code ${code}"
exit "$code"
