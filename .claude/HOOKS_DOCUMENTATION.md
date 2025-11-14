# Claude Code Hooks Configuration

## Overview

This project uses Claude Code hooks to automate code quality checks before commits. The hooks ensure:

- ✨ Code is properly formatted with Prettier
- 🏗️ Project builds successfully
- 🔐 TypeScript strict mode is satisfied (Vercel compatibility)

## Pre-Commit Hook

### What It Does

The pre-commit hook (`UserPromptSubmit` event) automatically runs whenever you attempt to create a commit with Claude Code. It executes three validation steps in order:

#### 1. Prettier Formatting

```bash
npx prettier --write . --ignore-unknown
```

- Automatically formats your code with Prettier
- Fixes spacing, indentation, and formatting issues
- Applies the project's `.prettierrc` configuration

#### 2. TypeScript Strict Mode Check

```bash
npx tsc --noEmit --strict
```

- Verifies TypeScript strict mode compatibility
- Ensures Vercel deployment compatibility
- Fails if there are type errors (stops the commit)

#### 3. Build Verification

```bash
npm run build
```

- Runs the Next.js production build
- Verifies no runtime or compilation errors
- Ensures the project is deployable

### Configuration Files

- **Hook Script**: `.claude/pre-commit.sh` - Main hook execution script
- **Settings**: `.claude/settings.local.json` - Hook configuration and permissions

### Behavior

**Trigger**: The hook activates when your commit message contains the word "commit" (case-insensitive)

**Success**: If all checks pass:

```
✅ All pre-commit checks passed!
```

**Failure**: If any check fails, the commit is blocked with a clear error message:

```
❌ TypeScript strict mode errors found. Please fix them before committing.
or
❌ Build failed. Please fix errors before committing.
```

### Manual Trigger

You can manually run all pre-commit checks at any time:

```bash
bash .claude/pre-commit.sh
```

## Permissions

The following permissions have been granted for the hook to function:

```json
"Bash(npm run lint:*)",
"Bash(npx prettier:*)",
"Bash(npx tsc:*)"
```

## Project Settings

The hook is configured in `.claude/settings.local.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": ".*commit.*",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/pre-commit.sh",
            "timeout": 300
          }
        ]
      }
    ]
  }
}
```

## Troubleshooting

### "Prettier not available"

Ensure `node_modules` is installed:

```bash
npm install
```

### "TypeScript errors"

The hook will show you which files have type errors. Fix them and retry the commit.

### "Build failed"

Review the build output for specific errors. Common issues:

- Missing imports
- Type mismatches
- Component syntax errors

### "Hook timeout"

If the build takes longer than 300 seconds (5 minutes), increase the timeout in `.claude/settings.local.json`:

```json
"timeout": 600  // 10 minutes
```

## Benefits

✅ **Consistent Code Quality**: Every commit follows formatting standards
✅ **Build Assurance**: Never push code that doesn't build
✅ **Vercel Compatibility**: Strict TypeScript ensures deployment success
✅ **Automated Checks**: No manual step-through required
✅ **Team-wide Standards**: All developers use the same checks

## Team Usage

This configuration is committed to the repository in `.claude/` directory. All team members will use the same hooks automatically when using Claude Code on this project.

To update the hooks for everyone:

1. Modify `.claude/pre-commit.sh` or `.claude/settings.local.json`
2. Commit and push the changes
3. Other team members will pick up the changes on their next Claude Code session
