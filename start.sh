#!/bin/bash
# Load environment variables from .env
set -a
source .env
set +a

# Start Next.js
npm start
