#!/bin/bash

# Exit on first error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the project directory from Claude's environment
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"

echo -e "${YELLOW}🔍 Running pre-commit quality checks...${NC}"

# Change to project directory
cd "$PROJECT_DIR" || exit 2

# 1. Run TypeScript type checking
echo -e "${YELLOW}[1/3] Checking TypeScript errors...${NC}"
if ! npm run type-check 2>&1; then
  echo -e "${RED}❌ TypeScript compilation errors found!${NC}" >&2
  exit 2
fi
echo -e "${GREEN}✓ TypeScript check passed${NC}"

# 2. Run Prettier check (without writing changes)
echo -e "${YELLOW}[2/3] Checking code formatting with Prettier...${NC}"
if ! npm run format:check 2>&1; then
  echo -e "${RED}❌ Code formatting issues detected!${NC}" >&2
  echo -e "${YELLOW}💡 Run 'npm run format' to fix automatically${NC}" >&2
  exit 2
fi
echo -e "${GREEN}✓ Prettier check passed${NC}"

# 3. Run build
echo -e "${YELLOW}[3/3] Running build...${NC}"
if ! npm run build 2>&1; then
  echo -e "${RED}❌ Build failed!${NC}" >&2
  exit 2
fi
echo -e "${GREEN}✓ Build successful${NC}"

echo -e "${GREEN}✅ All quality checks passed!${NC}"
exit 0
