/**
 * Test script to verify GCP Cloud Storage connection
 * Run with: npx ts-node scripts/test-gcs-connection.ts
 */

import { Storage } from "@google-cloud/storage";

const projectId = process.env.GCP_PROJECT_ID;
const keyJsonContent = process.env.GCP_KEY_JSON;
const bucketName = process.env.GCP_BUCKET_NAME || "rfp-analyzer-storage";

console.log("🔍 GCP Cloud Storage Connection Test\n");
console.log("Configuration:");
console.log(`  Project ID: ${projectId}`);
console.log(`  Bucket Name: ${bucketName}`);
console.log(`  Key JSON: ${keyJsonContent ? "✓ Set" : "✗ Not set"}`);

if (!projectId) {
  console.error("❌ GCP_PROJECT_ID environment variable is not set");
  process.exit(1);
}

if (!keyJsonContent) {
  console.error(
    "❌ GCP_KEY_JSON environment variable is not set. Please set it with the content of your GCP service account JSON file."
  );
  process.exit(1);
}

async function testConnection() {
  try {
    // Initialize GCS client
    console.log("📝 Initializing GCS client...");
    let credentials;
    try {
      if (!keyJsonContent) {
        throw new Error("GCP_KEY_JSON is not set");
      }
      credentials = JSON.parse(keyJsonContent);
    } catch (error) {
      console.error("❌ Failed to parse GCP_KEY_JSON as valid JSON");
      console.error("Make sure GCP_KEY_JSON contains the full JSON content of your service account key file");
      process.exit(1);
    }

    const storage = new Storage({
      projectId,
      credentials,
    });

    // Get bucket
    console.log(`📂 Accessing bucket: ${bucketName}...`);
    const bucket = storage.bucket(bucketName);

    // Check if bucket exists
    const [exists] = await bucket.exists();

    if (!exists) {
      console.error(`❌ Bucket '${bucketName}' does not exist or is not accessible`);
      process.exit(1);
    }

    console.log(`✓ Bucket accessible\n`);

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
    console.error(error);
    process.exit(1);
  }
}

testConnection();
