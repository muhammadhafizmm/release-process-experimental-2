#!/usr/bin/env bash
set -e

# === Ensure working directory is clean ===
if [[ -n "$(git status --porcelain)" ]]; then
  echo "❌ Working directory is not clean. Please commit or stash your changes."
  exit 1
fi

# === Get the next hotfix version from Node script ===
echo "🔍 Generating next hotfix version..."
HOTFIX_VERSION=$(node ./scripts/versioning/generate-version.js --hotfix | grep '^VERSION=' | cut -d '=' -f2)

if [[ -z "$HOTFIX_VERSION" ]]; then
  echo "❌ Failed to get hotfix version from Node script."
  exit 1
fi

echo "✅ Next hotfix version: $HOTFIX_VERSION"

# === Checkout and pull from origin/release ===
echo "📥 Fetching origin/release..."
git fetch origin release
git checkout -B release origin/release
git pull origin release

# === Create or checkout hotfix branch ===
BRANCH_NAME="hotfix/${HOTFIX_VERSION}"
echo "🚧 Preparing branch: $BRANCH_NAME..."

# Check if local branch exists
if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
  echo "🔁 Local branch $BRANCH_NAME already exists. Checking it out..."
  git checkout "$BRANCH_NAME"

# Check if remote branch exists
elif git ls-remote --exit-code --heads origin "$BRANCH_NAME" >/dev/null 2>&1; then
  echo "🔁 Remote branch $BRANCH_NAME found. Fetching and checking it out..."
  git fetch origin "$BRANCH_NAME":"$BRANCH_NAME"
  git checkout "$BRANCH_NAME"

# Create new branch from origin/release
else
  echo "🆕 Branch $BRANCH_NAME does not exist. Creating from origin/release..."
  git fetch origin release
  git checkout -b "$BRANCH_NAME"
fi

echo "✅ Now on branch: $(git symbolic-ref --short HEAD)"