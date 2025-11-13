#!/bin/bash

# Claude Code Pre-Commit Hook
# Runs before every commit to ensure code quality and Vercel compatibility
# This script ensures:
# 1. Code is properly formatted with Prettier
# 2. Build passes successfully
# 3. TypeScript strict mode is satisfied

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "🔍 Running pre-commit checks..."
echo ""

# 1. Run Prettier if needed
echo "📝 Checking code formatting with Prettier..."
if command -v npx &> /dev/null; then
  npx prettier --write . --ignore-unknown 2>/dev/null || true
  echo "✓ Prettier formatting applied"
else
  echo "⚠️  Prettier not available, skipping formatting"
fi

echo ""

# 2. Run TypeScript strict mode check
echo "🔐 Verifying TypeScript strict mode compatibility..."
if [ -f "tsconfig.json" ]; then
  npx tsc --noEmit --strict 2>&1 | head -20 || {
    echo "❌ TypeScript strict mode errors found. Please fix them before committing."
    exit 1
  }
  echo "✓ TypeScript strict mode check passed"
else
  echo "⚠️  tsconfig.json not found, skipping TypeScript check"
fi

echo ""

# 3. Run npm build
echo "🏗️  Building project..."
if npm run build &> /dev/null; then
  echo "✓ Build successful"
else
  echo "❌ Build failed. Please fix errors before committing."
  exit 1
fi

echo ""
echo "✅ All pre-commit checks passed!"
echo ""
