#!/bin/bash
# Wrapper script to ensure .env is loaded before starting worker

# Load .env file
export $(cat .env | grep -v '^#' | xargs)

# Start worker
npx tsx worker.ts
