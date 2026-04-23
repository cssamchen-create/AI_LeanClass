#!/usr/bin/env bash
# Setup implementation plan for a feature (Bash)
#
# Usage: ./setup-plan.sh [--json] [-h|--help]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

JSON=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --json|-Json) JSON=true ;;
    -h|--help|-Help)
      echo "Usage: ./setup-plan.sh [--json] [-h|--help]"
      echo "  --json    Output results in JSON format"
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
  shift
done

# Load all paths
get_feature_paths_env

# Validate feature branch
if ! test_feature_branch "$CURRENT_BRANCH" "$HAS_GIT"; then
  exit 1
fi

# Ensure feature directory exists
mkdir -p "$FEATURE_DIR"

# Copy plan template only if plan doesn't already exist
if [ ! -f "$IMPL_PLAN" ]; then
  template="$(resolve_template "plan-template" "$REPO_ROOT" 2>/dev/null || true)"
  if [ -n "$template" ] && [ -f "$template" ]; then
    cp "$template" "$IMPL_PLAN"
    echo "Copied plan template to $IMPL_PLAN"
  else
    echo "Warning: Plan template not found" >&2
    touch "$IMPL_PLAN"
  fi
else
  echo "Plan already exists at $IMPL_PLAN (skipping template copy)"
fi

# Output results
if [ "$JSON" = true ]; then
  printf '{"FEATURE_SPEC":"%s","IMPL_PLAN":"%s","SPECS_DIR":"%s","BRANCH":"%s","HAS_GIT":%s}\n' \
    "$FEATURE_SPEC" "$IMPL_PLAN" "$FEATURE_DIR" "$CURRENT_BRANCH" "$HAS_GIT"
else
  echo "FEATURE_SPEC: $FEATURE_SPEC"
  echo "IMPL_PLAN: $IMPL_PLAN"
  echo "SPECS_DIR: $FEATURE_DIR"
  echo "BRANCH: $CURRENT_BRANCH"
  echo "HAS_GIT: $HAS_GIT"
fi
