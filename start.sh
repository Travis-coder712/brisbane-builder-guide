#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "============================================================"
echo " NEM Bid Analyser — Starting up"
echo "============================================================"
echo ""

# Check Python
if ! command -v python3 &>/dev/null; then
  echo "ERROR: python3 not found."
  echo "Install via: brew install python (Mac) or python.org/downloads"
  exit 1
fi

# Check Node
if ! command -v node &>/dev/null; then
  echo "ERROR: node not found."
  echo "Install via: brew install node (Mac) or nodejs.org"
  exit 1
fi

# Install Python deps
echo "Checking Python dependencies..."
cd backend
pip3 install -r requirements.txt --quiet

# Warn if no .env
if [ ! -f .env ]; then
  echo ""
  echo "WARNING: No .env file found in backend/ folder."
  echo "Copy backend/.env.example to backend/.env and add your ANTHROPIC_API_KEY."
  echo "The app will work without it, but AI narratives will be disabled."
  echo ""
fi

echo "Starting Python backend on http://localhost:8000 ..."
python3 main.py &
BACKEND_PID=$!
cd ..

echo "Waiting for backend to start..."
sleep 3

# Install Node deps if needed
if [ ! -d node_modules ]; then
  echo "Installing Node.js dependencies..."
  npm install
fi

echo "Starting React frontend on http://localhost:5173 ..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "============================================================"
echo " Both servers running."
echo " Open http://localhost:5173 in your browser."
echo " (Allow 10-15 seconds for the first data sync to begin)"
echo ""
echo " Press Ctrl+C to stop both servers."
echo "============================================================"
echo ""

# Stop both on Ctrl+C
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait $BACKEND_PID $FRONTEND_PID
