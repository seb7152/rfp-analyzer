#!/usr/bin/env python3
"""
Update task status in PRD.json.
Usage: python update_status.py <path-to-prd.json> <task-id> [true|false] [--comment "comment text"]
"""

import json
import sys
from pathlib import Path
from typing import Optional


def update_task_status(
    filepath: Path, task_id: str, completed: bool, comment: Optional[str] = None
) -> bool:
    """Update a task's completed status and optionally add a comment"""

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: File not found: {filepath}")
        return False
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON: {e}")
        return False

    # Find and update the task
    task_found = False
    for us in data.get("user_stories", []):
        for task in us.get("tasks", []):
            if task.get("id") == task_id:
                task["completed"] = completed
                if comment is not None:
                    task["comments"] = comment
                task_found = True
                print(f"✅ Updated task {task_id}: completed={completed}")
                if comment:
                    print(f"   Comment: {comment}")
                break
        if task_found:
            break

    if not task_found:
        print(f"❌ Error: Task {task_id} not found")
        return False

    # Save the updated file
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"✅ Saved updated PRD.json to {filepath}")
        return True
    except Exception as e:
        print(f"❌ Error saving file: {e}")
        return False


def list_tasks(filepath: Path) -> bool:
    """List all tasks with their status"""

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        return False

    print(f"\n{'=' * 60}")
    print(f"Tasks in {filepath.name}")
    print(f"{'=' * 60}\n")

    for us in data.get("user_stories", []):
        print(f"📋 {us.get('id')}: {us.get('title')}")
        print(f"   Priority: {us.get('priority')} | Completed: {us.get('completed')}")
        for task in us.get("tasks", []):
            status = "✅" if task.get("completed") else "⏳"
            print(f"   {status} {task.get('id')}: {task.get('description')}")
            if task.get("comments"):
                print(f"      💬 {task.get('comments')}")
        print()

    return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  List tasks:")
        print("    python update_status.py <path-to-prd.json> --list")
        print("\n  Update task status:")
        print(
            '    python update_status.py <path-to-prd.json> <task-id> true|false [--comment "text"]'
        )
        print("\nExamples:")
        print("  python update_status.py specs/003-financial-grid/prd.json --list")
        print(
            "  python update_status.py specs/003-financial-grid/prd.json US-1-001 true"
        )
        print(
            '  python update_status.py specs/003-financial-grid/prd.json US-2-005 false --comment "Need to fix authentication"'
        )
        sys.exit(1)

    filepath = Path(sys.argv[1])

    if not filepath.exists():
        print(f"❌ Error: File not found: {filepath}")
        sys.exit(1)

    # List mode
    if sys.argv[2] == "--list":
        success = list_tasks(filepath)
        sys.exit(0 if success else 1)

    # Update mode
    if len(sys.argv) < 4:
        print("❌ Error: Missing task ID or status")
        print(
            'Usage: python update_status.py <path-to-prd.json> <task-id> true|false [--comment "text"]'
        )
        sys.exit(1)

    task_id = sys.argv[2]
    completed_str = sys.argv[3].lower()

    if completed_str not in ["true", "false"]:
        print(f"❌ Error: Status must be 'true' or 'false', got '{completed_str}'")
        sys.exit(1)

    completed = completed_str == "true"

    # Optional comment
    comment = None
    if len(sys.argv) >= 6 and sys.argv[4] == "--comment":
        comment = sys.argv[5]

    success = update_task_status(filepath, task_id, completed, comment)
    sys.exit(0 if success else 1)
