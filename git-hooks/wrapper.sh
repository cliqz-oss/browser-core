#!/bin/bash

if [ -x $0.local ]; then
    $0.local "$@" || exit $?
fi
hook=git-hooks/$(basename $0)
if [ -x $hook ]; then
  $hook "$@" || exit $?
fi