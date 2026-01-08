#!/usr/bin/env node

/**
 * RFP JSON Analyzer - Validation and local analysis utility
 * Usage: node rfp-analyzer.js validate <file.json>
 *        node rfp-analyzer.js analyze <requirements.json> <responses-1.json> [responses-2.json ...]
 */

const fs = require("fs");
const path = require("path");

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(color, message) {
  console.log(colors[color] + message + colors.reset);
}

function readJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  } catch (err) {
    throw new Error(`Failed to read ${filePath}: ${err.message}`);
  }
}

// Validation functions
function validateRequirements(data) {
  const errors = [];
  const warnings = [];

  if (!data.requirements || !Array.isArray(data.requirements)) {
    errors.push('Missing or invalid "requirements" array');
    return { valid: false, errors, warnings };
  }

  if (data.requirements.length === 0) {
    warnings.push("Requirements array is empty");
  }

  data.requirements.forEach((req, idx) => {
    if (!req.code) errors.push(`Requirement ${idx}: Missing "code"`);
    if (!req.title) errors.push(`Requirement ${idx}: Missing "title"`);
    if (typeof req.weight !== "number" && typeof req.weight !== "string") {
      errors.push(`Requirement ${idx}: Invalid "weight" type`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateResponses(data) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(data)) {
    errors.push("Responses file must be a JSON array");
    return { valid: false, errors, warnings };
  }

  if (data.length === 0) {
    warnings.push("Responses array is empty");
  }

  data.forEach((resp, idx) => {
    if (!resp.requirement_id_external)
      errors.push(`Response ${idx}: Missing "requirement_id_external"`);
    if (resp.ai_score === undefined && resp.manual_score === undefined) {
      warnings.push(
        `Response ${idx}: No score provided (ai_score or manual_score)`
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateStructure(data) {
  const errors = [];
  const warnings = [];

  if (data.categories && !Array.isArray(data.categories)) {
    errors.push('Invalid "categories" type (must be array)');
    return { valid: false, errors, warnings };
  }

  if (data.categories && data.categories.length === 0) {
    warnings.push("Categories array is empty");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function parseWeight(weight) {
  if (typeof weight === "number") return weight;
  if (typeof weight === "string") {
    // Handle percentage (e.g., "15%")
    if (weight.endsWith("%")) {
      return parseFloat(weight) / 100;
    }
    return parseFloat(weight);
  }
  return 1.0; // Default weight
}

function parseScore(score) {
  if (typeof score === "number") return score;
  if (typeof score === "string") return parseFloat(score);
  return 0;
}

function calculateScores(requirements, responses) {
  const scores = {};

  // Group requirements by code
  const reqMap = {};
  requirements.forEach((req) => {
    reqMap[req.code] = req;
  });

  // Calculate weighted score
  let totalWeightedScore = 0;
  let totalWeight = 0;
  const categoryScores = {};

  responses.forEach((resp) => {
    const req = reqMap[resp.requirement_id_external];
    if (!req) return;

    const weight = parseWeight(req.weight);
    const score =
      resp.manual_score !== undefined
        ? parseScore(resp.manual_score)
        : parseScore(resp.ai_score);

    const weightedScore = score * weight;
    totalWeightedScore += weightedScore;
    totalWeight += weight;

    // Track by category
    const category = req.category_name || "Uncategorized";
    if (!categoryScores[category]) {
      categoryScores[category] = { weighted: 0, weight: 0 };
    }
    categoryScores[category].weighted += weightedScore;
    categoryScores[category].weight += weight;
  });

  scores.global =
    totalWeight > 0 ? (totalWeightedScore / totalWeight).toFixed(1) : 0;
  scores.byCategory = {};

  Object.entries(categoryScores).forEach(([cat, data]) => {
    scores.byCategory[cat] = (data.weighted / data.weight).toFixed(1);
  });

  return scores;
}

// Command handlers
function handleValidate(filePath) {
  log("cyan", `\n📋 Validating: ${filePath}\n`);

  try {
    const data = readJSON(filePath);

    // Detect type and validate
    let result;
    if (data.requirements) {
      result = validateRequirements(data);
    } else if (Array.isArray(data)) {
      result = validateResponses(data);
    } else if (data.categories) {
      result = validateStructure(data);
    } else {
      log("red", "❌ Unknown file format");
      return;
    }

    if (result.valid) {
      log("green", "✅ Valid JSON structure");
    } else {
      log("red", "❌ Validation failed:");
      result.errors.forEach((err) => log("red", `   - ${err}`));
    }

    if (result.warnings.length > 0) {
      log("yellow", "⚠️  Warnings:");
      result.warnings.forEach((warn) => log("yellow", `   - ${warn}`));
    }
  } catch (err) {
    log("red", `❌ Error: ${err.message}`);
  }
}

function handleAnalyze(files) {
  log("cyan", "\n📊 Analyzing RFP data\n");

  try {
    // Read requirements (first file)
    const requirementsFile = files[0];
    const requirements = readJSON(requirementsFile);

    if (!requirements.requirements) {
      throw new Error("First file must be requirements JSON");
    }

    log("green", `✅ Loaded ${requirements.requirements.length} requirements`);

    // Read responses for each supplier
    const results = {};
    for (let i = 1; i < files.length; i++) {
      const respFile = files[i];
      const responses = readJSON(respFile);
      const supplierName = path.basename(respFile, ".json");

      const scores = calculateScores(requirements.requirements, responses);
      results[supplierName] = scores;

      log("green", `✅ ${supplierName}: Global score ${scores.global}/10`);
    }

    // Ranking
    log("cyan", "\n🏆 Ranking:\n");
    const ranked = Object.entries(results).sort(
      (a, b) => b[1].global - a[1].global
    );

    ranked.forEach(([supplier, scores], idx) => {
      const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";
      log("cyan", `${medal} ${supplier}: ${scores.global}/10`);
    });

    log("cyan", "\n");
  } catch (err) {
    log("red", `❌ Error: ${err.message}`);
  }
}

// Main
const args = process.argv.slice(2);

if (args.length === 0) {
  log("cyan", "\nRFP JSON Analyzer");
  log("cyan", "================\n");
  log("yellow", "Usage:");
  log("yellow", "  node rfp-analyzer.js validate <file.json>");
  log(
    "yellow",
    "  node rfp-analyzer.js analyze <requirements.json> <responses-1.json> [responses-2.json ...]\n"
  );
  process.exit(0);
}

const command = args[0];

if (command === "validate" && args.length >= 2) {
  handleValidate(args[1]);
} else if (command === "analyze" && args.length >= 2) {
  handleAnalyze(args.slice(1));
} else {
  log("red", "❌ Invalid arguments\n");
  process.exit(1);
}
