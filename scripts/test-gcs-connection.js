/**
 * Test script to verify GCP Cloud Storage connection
 * Run with: node scripts/test-gcs-connection.js
 */

require("dotenv").config({ path: ".env.local" });

const { Storage } = require("@google-cloud/storage");
const path = require("path");
const fs = require("fs");

const projectId = process.env.GCP_PROJECT_ID;
const keyFilePath = process.env.GCP_KEY_FILE_PATH;
const bucketName = process.env.GCP_BUCKET_NAME || "rfp-analyzer-storage";

console.log("🔍 GCP Cloud Storage Connection Test\n");
console.log("Configuration:");
console.log(`  Project ID: ${projectId}`);
console.log(`  Bucket Name: ${bucketName}`);
console.log(`  Key File: ${keyFilePath}`);

if (!projectId) {
  console.error("❌ GCP_PROJECT_ID environment variable is not set");
  process.exit(1);
}

if (!keyFilePath) {
  console.error("❌ GCP_KEY_FILE_PATH environment variable is not set");
  process.exit(1);
}

const absoluteKeyPath = path.resolve(keyFilePath);

if (!fs.existsSync(absoluteKeyPath)) {
  console.error(`❌ Key file not found at: ${absoluteKeyPath}`);
  process.exit(1);
}

console.log(`✓ Key file found at: ${absoluteKeyPath}\n`);

async function testConnection() {
  try {
    // Initialize GCS client
    console.log("📝 Initializing GCS client...");
    const storage = new Storage({
      projectId,
      keyFilename: absoluteKeyPath,
    });

    // Get bucket
    console.log(`📂 Accessing bucket: ${bucketName}...`);
    const bucket = storage.bucket(bucketName);

    // Note: bucket.exists() requires storage.buckets.get permission
    // Instead, we'll try to directly perform an operation
    console.log(`✓ Bucket reference created\n`);

    // Try to create a test file (temporary)
    console.log("📤 Testing file upload...");
    const testFileName = `test-${Date.now()}.txt`;
    const file = bucket.file(testFileName);

    const testContent = "This is a test file from GCS connection test script";

    await file.save(testContent);
    console.log(`✓ File uploaded: ${testFileName}`);

    // Try to read the file
    console.log("📥 Testing file download...");
    const [contents] = await file.download();
    const downloadedContent = contents.toString();

    if (downloadedContent === testContent) {
      console.log("✓ File downloaded and verified\n");
    } else {
      console.error("❌ Downloaded content does not match");
      process.exit(1);
    }

    // Delete test file
    console.log("🗑️  Cleaning up test file...");
    await file.delete();
    console.log("✓ Test file deleted\n");

    // Success
    console.log("✅ GCP Cloud Storage connection is working correctly!");
    console.log("\nYou can now use the document upload feature.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error during GCS connection test:");
    console.error(error.message);
    process.exit(1);
  }
}

testConnection();
