#!/usr/bin/env bash
# ════════════════════════════════════════════════
# PARINAMA — Unified Build Script
# Builds frontend + installs backend deps
# ════════════════════════════════════════════════
set -o errexit

echo "══════════════════════════════════════"
echo "  PARINAMA — Building unified app"
echo "══════════════════════════════════════"

# ── 1. Install backend Python dependencies ────
echo "[BUILD] Installing Python dependencies..."
pip install --upgrade pip
pip install -r backend/requirements.txt

# ── 2. Build React frontend ──────────────────
echo "[BUILD] Building React frontend..."
cd frontend
npm install
npm run build
cd ..

# ── 3. Copy frontend build to backend/static ──
echo "[BUILD] Copying frontend build to backend/static..."
rm -rf backend/static
cp -r frontend/dist backend/static

echo "══════════════════════════════════════"
echo "  BUILD COMPLETE ✓"
echo "══════════════════════════════════════"
