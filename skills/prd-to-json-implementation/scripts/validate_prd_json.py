#!/usr/bin/env python3
"""
Validate PRD.json structure according to the schema.
Ensures all required fields are present and correctly formatted.
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Any


def validate_prd_json(filepath: Path) -> bool:
    """Validate PRD.json structure"""

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: File not found: {filepath}")
        return False
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON: {e}")
        return False

    # Validate root-level fields
    required_root_fields = ["feature", "title", "description", "user_stories"]
    for field in required_root_fields:
        if field not in data:
            print(f"❌ Missing required root field: {field}")
            return False

    # Validate optional reference_document if present
    if "reference_document" in data and isinstance(data["reference_document"], dict):
        ref_doc = data["reference_document"]
        valid_ref_fields = [
            "specs",
            "architecture",
            "tests",
            "interface",
            "api",
            "database",
            "notes",
        ]
        for field in ref_doc:
            if field not in valid_ref_fields:
                print(f"⚠️  Warning: Unknown reference_document field: {field}")
            elif field != "notes" and not isinstance(ref_doc[field], list):
                print(f"⚠️  Warning: reference_document.{field} should be an array")

    # Validate user_stories
    if not isinstance(data["user_stories"], list):
        print("❌ 'user_stories' must be an array")
        return False

    if not data["user_stories"]:
        print("⚠️  Warning: No user stories found")
        return True

    for idx, us in enumerate(data["user_stories"], 1):
        print(f"\nValidating US-{idx}...")

        # Required US fields
        required_us_fields = [
            "id",
            "title",
            "priority",
            "completed",
            "description",
            "tasks",
        ]
        for field in required_us_fields:
            if field not in us:
                print(f"  ❌ US-{idx} missing field: {field}")
                return False

        # Validate priority
        if us["priority"] not in ["P1", "P2", "P3"]:
            print(
                f"  ⚠️  US-{idx} invalid priority: {us['priority']} (should be P1, P2, or P3)"
            )

        # Validate tasks
        if not isinstance(us["tasks"], list):
            print(f"  ❌ US-{idx} 'tasks' must be an array")
            return False

        if not us["tasks"]:
            print(f"  ⚠️  US-{idx} has no tasks")

        for task_idx, task in enumerate(us["tasks"], 1):
            # Required task fields
            required_task_fields = ["id", "description", "prompt", "completed"]
            for field in required_task_fields:
                if field not in task:
                    print(f"  ❌ US-{idx} Task {task_idx} missing field: {field}")
                    return False

            # Validate optional fields if present
            if "objective" in task and not isinstance(task["objective"], str):
                print(f"  ⚠️  US-{idx} Task {task_idx} 'objective' should be string")

            if "comments" in task and not isinstance(task["comments"], str):
                print(f"  ⚠️  US-{idx} Task {task_idx} 'comments' should be string")

    print("\n✅ PRD.json structure is valid!")
    return True


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python validate_prd_json.py <path-to-prd.json>")
        sys.exit(1)

    filepath = Path(sys.argv[1])
    success = validate_prd_json(filepath)
    sys.exit(0 if success else 1)
