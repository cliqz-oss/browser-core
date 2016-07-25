#!/bin/bash

if ! [ -d ".git" ]; then
  echo "This script must be run from the root directory of repository!"
  exit 1
fi

HOOK_NAMES=(
  "prepare-commit-msg"
  "pre-push"
)
HOOKS_DIR=".git/hooks"

for hook in "${HOOK_NAMES[@]}"; do
  # If the hook already exists, is executable, and is not a symlink
  if [ ! -h $HOOKS_DIR/$hook -a -x $HOOKS_DIR/$hook ]; then
    mv $HOOKS_DIR/$hook $HOOKS_DIR/$hook.local
  fi
  # create the symlink, overwriting the file if it exists
  # probably the only way this would happen is if you're using an old version of git
  # -- back when the sample hooks were not executable, instead of being named ____.sample
  ln -s -f ../../git-hooks/wrapper.sh $HOOKS_DIR/$hook
done