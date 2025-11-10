#!/usr/bin/env ts-node

/**
 * Test script to send example payload to N8N webhook
 * Usage: npx ts-node scripts/test-n8n-webhook.ts
 */

const WEBHOOK_URL = "https://n8n.srv828065.hstgr.cloud/webhook-test/a7d141e3-24e6-431d-8f63-abbe83f0319f";

const examplePayload = {
  rfp_id: "550e8400-e29b-41d4-a716-446655440000",
  requirements: [
    {
      requirement_id: "R-1",
      title: "Système de gestion des utilisateurs",
      content:
        "Le système doit permettre la création, modification et suppression de comptes utilisateurs avec authentification multi-facteurs. Les données utilisateur doivent être chiffrées et conformes au RGPD.",
      context: "",
      suppliers_responses: [
        {
          supplier_code: "SUPP-001",
          supplier_name: "TechCorp Solutions",
          response_text:
            "Notre plateforme supporte l'authentification OAuth 2.0 avec support du multi-facteur SMS et email. Tous les données sont chiffrées avec AES-256 et nous sommes conformes RGPD certifiés par audit externe en 2024.",
        },
        {
          supplier_code: "SUPP-002",
          supplier_name: "CloudSystems Inc",
          response_text:
            "Nous offrons une solution complète avec authentification Kerberos et biométrique. Les données sont stockées dans des datacenters certifiés ISO 27001 avec audit de conformité RGPD annuel.",
        },
        {
          supplier_code: "SUPP-003",
          supplier_name: "SecureData Ltd",
          response_text:
            "Notre système utilise SAML 2.0 pour l'authentification fédérée avec support du MFA via TOTP. Chiffrement bout-en-bout pour toutes les communications et données au repos.",
        },
      ],
    },
    {
      requirement_id: "R-2",
      title: "Rapports d'analyse des fournisseurs",
      content:
        "Le système doit générer des rapports en temps réel montrant l'analyse comparative des réponses des fournisseurs avec scores d'évaluation et commentaires d'experts.",
      context: "",
      suppliers_responses: [
        {
          supplier_code: "SUPP-001",
          supplier_name: "TechCorp Solutions",
          response_text:
            "Génération de rapports PDF et Excel en temps réel avec dashboards interactifs. Export possible vers Power BI et Tableau. Historique complet des analyses avec versioning.",
        },
        {
          supplier_code: "SUPP-002",
          supplier_name: "CloudSystems Inc",
          response_text:
            "Rapports dynamiques avec API de visualisation. Support de tous les formats standards (PDF, XLSX, CSV) et intégration Salesforce/HubSpot pour le CRM.",
        },
      ],
    },
    {
      requirement_id: "R-3",
      title: "Interface utilisateur responsive",
      content:
        "L'application doit fonctionner sur tous les appareils (desktop, tablet, mobile) avec une expérience utilisateur optimisée pour chaque écran.",
      context: "",
      suppliers_responses: [
        {
          supplier_code: "SUPP-001",
          supplier_name: "TechCorp Solutions",
          response_text:
            "Application React native avec responsive design. Compatible iOS 12+, Android 8+ et tous les navigateurs modernes. Temps de chargement < 2s sur 4G.",
        },
        {
          supplier_code: "SUPP-002",
          supplier_name: "CloudSystems Inc",
          response_text:
            "Flutter-based cross-platform solution. Progressive Web App avec offline support. Testé sur 50+ combinaisons appareil/navigateur.",
        },
        {
          supplier_code: "SUPP-003",
          supplier_name: "SecureData Ltd",
          response_text:
            "Vue.js 3 avec Vuetify Material Design. Support complet du responsive avec media queries. Accessible WCAG 2.1 AAA level.",
        },
      ],
    },
  ],
  timestamp: new Date().toISOString(),
};

async function sendTestPayload() {
  console.log("🚀 Sending test payload to N8N webhook...");
  console.log(`📍 URL: ${WEBHOOK_URL}`);
  console.log(
    `📦 Payload: ${JSON.stringify(examplePayload, null, 2).substring(0, 100)}...`
  );
  console.log("");

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(examplePayload),
    });

    console.log(`✅ Response status: ${response.status}`);

    const responseText = await response.text();
    console.log(`📨 Response body: ${responseText.substring(0, 200)}...`);

    if (response.ok) {
      console.log("\n✨ Payload sent successfully!");
      console.log("✓ N8N webhook received the test data");
      console.log("✓ You can now see the data in your N8N workflow");
    } else {
      console.log("\n⚠️ Webhook returned non-200 status");
      console.log("Check N8N logs for more details");
    }
  } catch (error) {
    console.error("\n❌ Error sending payload:");
    console.error(error);
  }
}

sendTestPayload();
