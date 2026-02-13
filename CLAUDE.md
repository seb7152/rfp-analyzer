# RFP-Analyer Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-06

## Active Technologies
- TypeScript 5.x + Next.js 14, React 18, Supabase (PostgreSQL + Auth), Tanstack Query v5, Tailwind CSS (004-peer-review)
- PostgreSQL via Supabase — table `requirement_review_status` + colonne `rfps.peer_review_enabled` (004-peer-review)

- TypeScript 5.x / JavaScript ES2022+ with Next.js 14 (React 18) (001-rfp-analyzer-platform)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x / JavaScript ES2022+ with Next.js 14 (React 18): Follow standard conventions

## Recent Changes
- 004-peer-review: Added TypeScript 5.x + Next.js 14, React 18, Supabase (PostgreSQL + Auth), Tanstack Query v5, Tailwind CSS

- 001-rfp-analyzer-platform: Added TypeScript 5.x / JavaScript ES2022+ with Next.js 14 (React 18)

<!-- MANUAL ADDITIONS START -->

## Architecture Documentation

For complete understanding of the RFP Analyzer system, refer to:

- **[Architecture & Workflow Guide](specs/ARCHITECTURE_WORKFLOW_GUIDE.md)** - Complete system overview, data flows, and technical architecture
- **[Implementation Plan PDF Annotations](IMPLEMENTATION_PLAN_PDF_ANNOTATIONS.md)** - Detailed PDF annotation system implementation
- **[PDF Upload Implementation Summary](docs/IMPLEMENTATION-SUMMARY.md)** - File upload and storage architecture

## Key System Components

- **Frontend**: Next.js 14 + React 18 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes + Supabase (PostgreSQL + Auth + Realtime)
- **Storage**: Google Cloud Storage for PDFs with signed URLs
- **Processing**: N8N workflows for PDF parsing and AI analysis
- **Multi-tenant**: Organization-based isolation with Row Level Security

## Core Workflows

1. **Document Processing**: PDF upload → GCS storage → N8N parsing → Database storage
2. **AI Analysis**: Response import → N8N AI processing → Score generation → Database update
3. **Human Evaluation**: Collaborative review → Manual scoring → Annotations → Real-time sync

## Development Context

This is a B2B SaaS platform for RFP evaluation with:

- Multi-organization support (10-50 users per org)
- 50-200 requirements per RFP
- 4-10 suppliers per evaluation
- Real-time collaboration features
- Advanced PDF annotation system
<!-- MANUAL ADDITIONS END -->
