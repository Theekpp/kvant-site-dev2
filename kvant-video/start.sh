#!/bin/bash
set -e
cd "$(dirname "$0")"
exec ./livekit-server --config config.yaml
