#!/usr/bin/env python3
"""
JSON Validation Script for RFP Import

Validates JSON files for categories, requirements, and supplier responses
against the expected schema for the RFP Analyzer project.

Features:
- STRICT validation: Rejects unknown fields (e.g., "lot", "notes", etc.)
- Category mapping: Validates category_name references when categories file provided
- Format checking: Validates required fields, types, and constraints

Usage:
    python validate_json.py <file.json> <type>
    python validate_json.py <requirements.json> requirements <categories.json>

    Types: categories, requirements, responses

Examples:
    python validate_json.py categories.json categories
    python validate_json.py requirements.json requirements
    python validate_json.py requirements.json requirements categories.json
    python validate_json.py supplier_responses.json responses

Important Notes:
- For requirements import, categories.json is REQUIRED if you're validating references
- Only allowed fields will be imported; extra fields are rejected with clear errors
- category_name must match either a category code or title from categories.json
"""

import json
import sys
from typing import Any, Dict, List, Tuple


class ValidationError(Exception):
    """Custom exception for validation errors"""
    pass


def validate_categories(data: List[Dict[str, Any]]) -> List[str]:
    """
    Validate categories JSON structure.

    Required fields: id, code, title, short_name, level
    Optional fields: parent_id, order

    STRICT MODE: Rejects any fields not in the allowed list
    Validates parent_id references actual category ids
    """
    errors = []
    codes_seen = set()
    ids_seen = set()
    categories_by_idx = {}  # Track categories for parent_id validation

    # Allowed field names (required and optional)
    allowed_fields = {
        "id", "code", "title", "level",
        "short_name", "parent_id", "order"
    }

    if not isinstance(data, list):
        return ["Data must be a list of category objects"]

    # FIRST PASS: Validate structure, collect ids
    for idx, category in enumerate(data):
        if not isinstance(category, dict):
            errors.append(f"Category at index {idx} must be an object")
            continue

        categories_by_idx[idx] = category

        # Check for extra fields (strict validation)
        extra_fields = set(category.keys()) - allowed_fields
        if extra_fields:
            errors.append(
                f"Category at index {idx}: unexpected fields {extra_fields}. "
                f"Only these fields are allowed: {', '.join(sorted(allowed_fields))}"
            )

        # Required fields (including short_name)
        required_fields = ["id", "code", "title", "level", "short_name"]
        for field in required_fields:
            if field not in category:
                errors.append(f"Category at index {idx} missing required field: {field}")

        # Check code uniqueness
        if "code" in category:
            code = category["code"]
            if code in codes_seen:
                errors.append(f"Duplicate code '{code}' at index {idx}")
            codes_seen.add(code)

        # Check id uniqueness
        if "id" in category:
            cat_id = category["id"]
            if cat_id in ids_seen:
                errors.append(f"Duplicate id '{cat_id}' at index {idx}")
            ids_seen.add(cat_id)

        # Validate short_name length
        if "short_name" in category:
            short_name = category["short_name"]
            if not isinstance(short_name, str):
                errors.append(f"Category at index {idx}: short_name must be a string")
            elif len(short_name.strip()) == 0:
                errors.append(f"Category at index {idx}: short_name cannot be empty")
            elif len(short_name) > 50:
                errors.append(f"Category at index {idx}: short_name exceeds 50 characters (got {len(short_name)})")

        # Validate level is a positive integer
        if "level" in category:
            level = category["level"]
            if not isinstance(level, int) or level < 1:
                errors.append(f"Category at index {idx}: level must be a positive integer (got {level})")

        # Check parent_id is a string or null (type check only)
        if "parent_id" in category and category["parent_id"] is not None:
            parent_id = category["parent_id"]
            if not isinstance(parent_id, str):
                errors.append(f"Category at index {idx}: parent_id must be a string or null (got {type(parent_id).__name__})")

    # SECOND PASS: Validate parent_id references (only if first pass succeeded)
    if not errors:
        for idx, category in categories_by_idx.items():
            if "parent_id" in category and category["parent_id"] is not None:
                parent_id = category["parent_id"]
                if parent_id not in ids_seen:
                    errors.append(
                        f"Category at index {idx}: parent_id '{parent_id}' does not reference an existing category id. "
                        f"Valid ids: {sorted(ids_seen)}"
                    )

    return errors


def validate_requirements(data: List[Dict[str, Any]]) -> List[str]:
    """
    Validate requirements JSON structure.

    Required fields: code, title, description, weight, category_name
    Optional fields: tags, is_mandatory, is_optional, page_number, rf_document_id

    STRICT MODE: Rejects any fields not in the allowed list
    """
    errors = []
    codes_seen = set()

    # Allowed field names (required and optional)
    allowed_fields = {
        "code", "title", "description", "weight", "category_name",
        "tags", "is_mandatory", "is_optional", "page_number", "rf_document_id"
    }

    if not isinstance(data, list):
        return ["Data must be a list of requirement objects"]

    for idx, requirement in enumerate(data):
        if not isinstance(requirement, dict):
            errors.append(f"Requirement at index {idx} must be an object")
            continue

        # Check for extra fields (strict validation)
        extra_fields = set(requirement.keys()) - allowed_fields
        if extra_fields:
            errors.append(
                f"Requirement at index {idx}: unexpected fields {extra_fields}. "
                f"Only these fields are allowed: {', '.join(sorted(allowed_fields))}"
            )

        # Required fields
        required_fields = ["code", "title", "description", "weight", "category_name"]
        for field in required_fields:
            if field not in requirement:
                errors.append(f"Requirement at index {idx} missing required field: {field}")

        # Check code uniqueness
        if "code" in requirement:
            code = requirement["code"]
            if code in codes_seen:
                errors.append(f"Duplicate code '{code}' at index {idx}")
            codes_seen.add(code)

        # Validate weight is between 0 and 1
        if "weight" in requirement:
            weight = requirement["weight"]
            if not isinstance(weight, (int, float)) or not (0 <= weight <= 1):
                errors.append(f"Requirement at index {idx}: weight must be a number between 0 and 1 (got {weight})")

        # Validate boolean fields
        for bool_field in ["is_mandatory", "is_optional"]:
            if bool_field in requirement:
                if not isinstance(requirement[bool_field], bool):
                    errors.append(f"Requirement at index {idx}: {bool_field} must be a boolean")

        # Validate page_number is a positive integer
        if "page_number" in requirement:
            page_num = requirement["page_number"]
            if not isinstance(page_num, int) or page_num < 1:
                errors.append(f"Requirement at index {idx}: page_number must be a positive integer (got {page_num})")

        # Validate tags
        if "tags" in requirement:
            tags = requirement["tags"]
            if not isinstance(tags, list):
                errors.append(f"Requirement at index {idx}: tags must be an array")
            else:
                for tag_idx, tag in enumerate(tags):
                    if not isinstance(tag, str):
                        errors.append(f"Requirement at index {idx}: tag at position {tag_idx} must be a string")
                    elif len(tag.strip()) == 0:
                        errors.append(f"Requirement at index {idx}: tag at position {tag_idx} cannot be empty")
                    elif len(tag) > 100:
                        errors.append(f"Requirement at index {idx}: tag at position {tag_idx} exceeds 100 characters (got {len(tag)})")

    return errors


def validate_responses(data: List[Dict[str, Any]]) -> List[str]:
    """
    Validate supplier responses JSON structure.

    Required fields: requirement_id_external
    Optional fields: response_text, ai_score, ai_comment, manual_score,
                    manual_comment, question, status, is_checked

    STRICT MODE: Rejects any fields not in the allowed list
    """
    errors = []

    if not isinstance(data, list):
        return ["Data must be a list of response objects"]

    valid_statuses = ["pending", "pass", "partial", "fail"]

    # Allowed field names (required and optional)
    allowed_fields = {
        "requirement_id_external", "response_text", "ai_score", "ai_comment",
        "manual_score", "manual_comment", "question", "status", "is_checked"
    }

    for idx, response in enumerate(data):
        if not isinstance(response, dict):
            errors.append(f"Response at index {idx} must be an object")
            continue

        # Check for extra fields (strict validation)
        extra_fields = set(response.keys()) - allowed_fields
        if extra_fields:
            errors.append(
                f"Response at index {idx}: unexpected fields {extra_fields}. "
                f"Only these fields are allowed: {', '.join(sorted(allowed_fields))}"
            )

        # Required field
        if "requirement_id_external" not in response:
            errors.append(f"Response at index {idx} missing required field: requirement_id_external")

        # Validate scores (0-5 or 0.5 increments)
        for score_field in ["ai_score", "manual_score"]:
            if score_field in response:
                score = response[score_field]
                if score is not None:
                    if not isinstance(score, (int, float)):
                        errors.append(f"Response at index {idx}: {score_field} must be a number")
                    elif not (0 <= score <= 5):
                        errors.append(f"Response at index {idx}: {score_field} must be between 0 and 5 (got {score})")
                    # Check if score is in 0.5 increments
                    elif (score * 2) % 1 != 0:
                        errors.append(f"Response at index {idx}: {score_field} must be in 0.5 increments (got {score})")

        # Validate status (if provided, must be one of the valid statuses)
        if "status" in response:
            status = response["status"]
            if status is not None:  # Only validate if status is explicitly provided
                if not isinstance(status, str):
                    errors.append(f"Response at index {idx}: status must be a string (got {type(status).__name__})")
                elif status not in valid_statuses:
                    errors.append(f"Response at index {idx}: status must be one of {valid_statuses} (got '{status}')")

        # Validate is_checked is boolean
        if "is_checked" in response:
            if not isinstance(response["is_checked"], bool):
                errors.append(f"Response at index {idx}: is_checked must be a boolean")

    return errors


def load_and_validate(file_path: str, data_type: str) -> Tuple[bool, List[str]]:
    """
    Load and validate a JSON file.

    Returns:
        Tuple of (is_valid, error_messages)
    """
    # Load JSON file
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        return False, [f"File not found: {file_path}"]
    except json.JSONDecodeError as e:
        return False, [f"Invalid JSON: {str(e)}"]
    except Exception as e:
        return False, [f"Error reading file: {str(e)}"]

    # Validate based on type
    if data_type == "categories":
        errors = validate_categories(data)
    elif data_type == "requirements":
        errors = validate_requirements(data)
    elif data_type == "responses":
        errors = validate_responses(data)
    else:
        return False, [f"Invalid data type: {data_type}. Must be one of: categories, requirements, responses"]

    is_valid = len(errors) == 0
    return is_valid, errors


def validate_requirements_with_categories(
    requirements_data: List[Dict[str, Any]],
    categories_data: List[Dict[str, Any]]
) -> List[str]:
    """
    Validate requirements JSON against a categories JSON.
    Checks that all category_name values exist in the categories.

    Args:
        requirements_data: List of requirement objects
        categories_data: List of category objects with 'code' and 'title' fields

    Returns:
        List of validation errors (empty if valid)
    """
    errors = []

    if not isinstance(categories_data, list):
        return ["Categories must be a list"]

    # Build set of valid category codes and titles
    valid_category_codes = set()
    valid_category_titles = set()

    for idx, cat in enumerate(categories_data):
        if not isinstance(cat, dict):
            errors.append(f"Category at index {idx} must be an object")
            continue

        code = cat.get("code")
        title = cat.get("title")

        if code:
            valid_category_codes.add(str(code).strip())
        if title:
            valid_category_titles.add(str(title).strip())

    if errors:
        return errors

    # Validate each requirement's category_name
    if not isinstance(requirements_data, list):
        return ["Requirements must be a list"]

    for idx, requirement in enumerate(requirements_data):
        if not isinstance(requirement, dict):
            continue

        category_name = requirement.get("category_name")
        if not category_name:
            continue

        category_name_str = str(category_name).strip()

        # Check if category_name matches any code or title
        if (category_name_str not in valid_category_codes and
                category_name_str not in valid_category_titles):
            errors.append(
                f"Requirement at index {idx} references non-existent category '{category_name_str}'. "
                f"Valid categories: {sorted(valid_category_codes | valid_category_titles)}"
            )

    return errors


def main():
    """Main entry point for CLI usage"""
    # Support two modes:
    # 1. validate_json.py <file.json> <type>
    # 2. validate_json.py <requirements.json> requirements <categories.json>

    if len(sys.argv) < 3:
        print(__doc__)
        print("\nUsage:")
        print("  python validate_json.py <file.json> <type>")
        print("  python validate_json.py <requirements.json> requirements <categories.json>")
        print("\nTypes: categories, requirements, responses")
        print("\nExamples:")
        print("  python validate_json.py categories.json categories")
        print("  python validate_json.py requirements.json requirements")
        print("  python validate_json.py requirements.json requirements categories.json")
        sys.exit(1)

    file_path = sys.argv[1]
    data_type = sys.argv[2]
    categories_file = sys.argv[3] if len(sys.argv) > 3 else None

    print(f"🔍 Validating {data_type} JSON: {file_path}")
    if categories_file:
        print(f"   Against categories: {categories_file}")
    print()

    is_valid, errors = load_and_validate(file_path, data_type)

    # Additional validation: category_name against categories file
    if is_valid and data_type == "requirements" and categories_file:
        print("✅ Basic structure valid. Checking category references...")
        print()

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                req_data = json.load(f)
            with open(categories_file, 'r', encoding='utf-8') as f:
                cat_data = json.load(f)

            # Normalize to list format
            req_list = req_data if isinstance(req_data, list) else req_data.get("requirements", [])
            cat_list = cat_data if isinstance(cat_data, list) else cat_data.get("categories", [])

            category_errors = validate_requirements_with_categories(req_list, cat_list)

            if category_errors:
                is_valid = False
                errors = category_errors

        except FileNotFoundError as e:
            print(f"❌ File not found: {e}")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON: {e}")
            sys.exit(1)

    if is_valid:
        print("✅ Validation successful! JSON is valid.")

        # Print summary table for requirements
        if data_type == "requirements":
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    req_data = json.load(f)

                req_list = req_data if isinstance(req_data, list) else req_data.get("requirements", [])

                if req_list:
                    print("\n📊 Summary:")
                    print(f"   Total requirements: {len(req_list)}")

                    # Count by category
                    from collections import Counter
                    category_counts = Counter(
                        req.get("category_name", "Unknown") for req in req_list
                        if isinstance(req, dict)
                    )

                    if category_counts:
                        print("\n   Requirements by category:")
                        print("   " + "-" * 50)
                        print(f"   {'Category':<35} | {'Count':>10}")
                        print("   " + "-" * 50)

                        for category, count in sorted(category_counts.items()):
                            print(f"   {category:<35} | {count:>10}")

                        print("   " + "-" * 50)

            except Exception as e:
                # Silent fail for summary - validation already passed
                pass

        sys.exit(0)
    else:
        print("❌ Validation failed with the following errors:")
        print()
        for error in errors:
            print(f"  • {error}")
        print()
        sys.exit(1)


if __name__ == "__main__":
    main()
