#!/bin/sh
# Ensure uploads and temp-uploads folders exist and have correct permissions
mkdir -p /usr/src/app/uploads
mkdir -p /usr/src/app/temp-uploads
mkdir -p /usr/src/app/logs
chown -R appuser:appuser /usr/src/app/uploads
chown -R appuser:appuser /usr/src/app/temp-uploads
chown -R appuser:appuser /usr/src/app/logs
chown -R appuser:appuser /usr/src/app/AboveMarketFiles


# Continue with the CMD command (Node server)
exec "$@"