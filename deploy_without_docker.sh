
#!/bin/bash
set -euo pipefail

APP_NAME="nextapp"      # PM2 process name
PORT="${PORT:-3000}"    # default port 3000 if PORT not set

# Use the current directory "." as the app directory
APP_DIR="."

cd "$APP_DIR"

echo "[deploy] Working directory: $(pwd)"

# --- sanity checks ---
if ! command -v pm2 >/dev/null 2>&1; then
  echo "[deploy] ERROR: pm2 not found. Install with: npm install -g pm2"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[deploy] ERROR: npm not found."
  exit 1
fi

# --- pull latest code ---
#echo "[deploy] Pulling latest code from git..."
#git pull

# --- install dependencies ---
echo "[deploy] Installing dependencies..."
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

# --- build app ---
echo "[deploy] Building Next.js app (production)..."
NODE_ENV=production npm run build

# --- start / restart with PM2 ---
echo "[deploy] Starting / restarting with PM2 on port $PORT..."

# Export env vars so PM2 sees them
export NODE_ENV=production
export PORT

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME"
else
  # Use `npm start` as the command
  pm2 start npm --name "$APP_NAME" -- start
fi

# Save PM2 process list so it restarts on reboot (with pm2 startup configured)
pm2 save

echo "[deploy] Current PM2 processes:"
pm2 list

echo "[deploy] Done. App should be available on http://localhost:$PORT"