#!/usr/bin/env python3
"""
JSON Validation Script for RFP Import

Validates JSON files for categories, requirements, and supplier responses
against the expected schema for the RFP Analyzer project.

Usage:
    python validate_json.py <file.json> <type>

    Types: categories, requirements, responses

Examples:
    python validate_json.py categories.json categories
    python validate_json.py requirements.json requirements
    python validate_json.py supplier_responses.json responses
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

    Required fields: id, code, title, level
    Optional fields: short_name, parent_id, order
    """
    errors = []
    codes_seen = set()
    ids_seen = set()

    if not isinstance(data, list):
        return ["Data must be a list of category objects"]

    for idx, category in enumerate(data):
        if not isinstance(category, dict):
            errors.append(f"Category at index {idx} must be an object")
            continue

        # Required fields
        required_fields = ["id", "code", "title", "level"]
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

        # Validate level is a positive integer
        if "level" in category:
            level = category["level"]
            if not isinstance(level, int) or level < 1:
                errors.append(f"Category at index {idx}: level must be a positive integer (got {level})")

        # Check parent_id references (optional, but if present should be valid)
        if "parent_id" in category and category["parent_id"] is not None:
            parent_id = category["parent_id"]
            # Note: We can't fully validate parent_id references here without a second pass
            # but we can check it's a string
            if not isinstance(parent_id, str):
                errors.append(f"Category at index {idx}: parent_id must be a string or null")

    return errors


def validate_requirements(data: List[Dict[str, Any]]) -> List[str]:
    """
    Validate requirements JSON structure.

    Required fields: code, title, description, weight, category_name
    Optional fields: tags, is_mandatory, is_optional, page_number, rf_document_id
    """
    errors = []
    codes_seen = set()

    if not isinstance(data, list):
        return ["Data must be a list of requirement objects"]

    for idx, requirement in enumerate(data):
        if not isinstance(requirement, dict):
            errors.append(f"Requirement at index {idx} must be an object")
            continue

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
    """
    errors = []

    if not isinstance(data, list):
        return ["Data must be a list of response objects"]

    valid_statuses = ["pending", "pass", "partial", "fail"]

    for idx, response in enumerate(data):
        if not isinstance(response, dict):
            errors.append(f"Response at index {idx} must be an object")
            continue

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

        # Validate status
        if "status" in response:
            status = response["status"]
            if status and status not in valid_statuses:
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


def main():
    """Main entry point for CLI usage"""
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)

    file_path = sys.argv[1]
    data_type = sys.argv[2]

    print(f"🔍 Validating {data_type} JSON: {file_path}")
    print()

    is_valid, errors = load_and_validate(file_path, data_type)

    if is_valid:
        print("✅ Validation successful! JSON is valid.")
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
