# Claude Code Configuration

This directory contains Claude Code configuration and hooks for this project.

## 📁 Contents

- **`pre-commit.sh`** - Automated pre-commit hook script (Prettier + TypeScript + Build)
- **`settings.local.json`** - Local hook configuration (git-ignored)
- **`HOOKS_DOCUMENTATION.md`** - Complete hooks documentation
- **`SETUP_SUMMARY.md`** - Setup summary and status
- **`commands/`** - Custom slash commands for this project

## 🚀 Quick Start

### Automatic (Recommended)

The pre-commit hook runs automatically when you create a commit. Just write normally:

```
git commit -m "fix: Your message here"
```

The hook will automatically:

1. ✨ Format code with Prettier
2. 🔐 Check TypeScript strict mode
3. 🏗️ Verify the build succeeds

### Manual

Run checks manually anytime:

```bash
bash .claude/pre-commit.sh
```

## ✅ What Gets Checked

| Check          | Purpose                            | Auto-Fix                    |
| -------------- | ---------------------------------- | --------------------------- |
| **Prettier**   | Code formatting                    | ✅ Yes                      |
| **TypeScript** | Type safety & Vercel compatibility | ❌ No (manual fix required) |
| **Build**      | Compilation success                | ❌ No (manual fix required) |

## 📚 Documentation

- **`.claude/HOOKS_DOCUMENTATION.md`** - Detailed hook guide
- **`.claude/SETUP_SUMMARY.md`** - Configuration summary
- **`../CLAUDE.md`** - Project-wide guidelines

## ⚙️ Configuration

Your local hook settings are in `settings.local.json` (not tracked in git):

- Triggers on commits containing "commit"
- Timeout: 300 seconds (5 minutes)
- Runs Prettier, TypeScript check, and build

## 🔧 Customization

To modify the pre-commit hook:

1. **Change what gets checked**: Edit `pre-commit.sh`
2. **Change when it triggers**: Edit `settings.local.json` matcher
3. **Change permissions**: Add to `settings.local.json` permissions array

## ❓ Troubleshooting

**Hook not running?**

- Ensure commit message contains "commit"
- Check `settings.local.json` exists and is valid

**Build taking too long?**

- Edit `settings.local.json` and increase `timeout` value

**Want to skip the hook temporarily?**

- Use different commit message (without "commit")
- Or temporarily modify the matcher pattern

## 📖 Learn More

See `HOOKS_DOCUMENTATION.md` for complete reference.
