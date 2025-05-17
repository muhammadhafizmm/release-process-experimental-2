#!/usr/bin/env bash
set -e

REMOTE_NAME="origin"
BRANCHES=("release" "rc" "main")

echo "🔄  Fetching from '$REMOTE_NAME'..."
git fetch "$REMOTE_NAME" --prune > /dev/null 2>&1

for BRANCH in "${BRANCHES[@]}"; do
  echo "➡️  Syncing branch: $BRANCH"

  # Check if branch exists on remote
  if git ls-remote --exit-code --heads "$REMOTE_NAME" "$BRANCH" > /dev/null 2>&1; then
    # Check if local branch exists
    if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
      echo "   🔁 Local branch exists. Checking out and pulling latest..."
      git checkout "$BRANCH" > /dev/null 2>&1
      git pull "$REMOTE_NAME" "$BRANCH" > /dev/null 2>&1
    else
      echo "   🆕 Local branch not found. Creating from remote..."
      git checkout -b "$BRANCH" "$REMOTE_NAME/$BRANCH" > /dev/null 2>&1
    fi
  else
    echo "   ⚠️  Remote branch '$BRANCH' not found. Skipping..."
  fi
done

git checkout main > /dev/null 2>&1
echo ""
echo "✅  Branches [${BRANCHES[*]}] synced successfully."
