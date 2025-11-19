-- ========================================================================
-- SCRIPT D'IMPORTATION DES RÉPONSES RFP
-- Généré automatiquement depuis RFP_Rating_Grid_Extract.json
-- Date: 2025-11-15T23:17:12.684Z
-- ========================================================================

-- IMPORTANT: Remplacer 'YOUR_RFP_ID_HERE' par l'UUID réel du RFP
-- Exemple: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

-- ========================================================================
-- STATISTIQUES DU FICHIER JSON
-- ========================================================================
-- Suppliers: 7
-- Requirement IDs uniques: 18
-- Total réponses: 126 (7 suppliers × 18 requirements)
--
-- Liste des suppliers:
--   - ACCENTURE
--   - ITC
--   - TCS
--   - CAPGEMINI
--   - LUCEM
--   - ATAWAY
--   - PREREQUIS

-- Liste des requirements:
--   - R - 1
--   - R - 2
--   - R - 3
--   - R - 4
--   - R - 5
--   - R - 6
--   - R - 7
--   - R - 8
--   - R - 9
--   - R - 10
--   - R - 11
--   - R - 13
--   - R - 14
--   - R - 18
--   - R - 19
--   - R - 20
--   - R - 21
--   - R - 22

-- ========================================================================
-- ANALYSE DES DONNÉES
-- ========================================================================
-- ATTENTION: Le fichier contient deux types de données dans "notation":
--   1. NOMBRES (pour ACCENTURE, TCS, CAPGEMINI, LUCEM, ATAWAY, PREREQUIS)
--      Exemple: "notation": 3.5
--   2. TEXTE (pour ITC uniquement)
--      Exemple: "notation": "Long text explanation..."
--
-- STRATÉGIE D'IMPORT:
--   - Si notation est un nombre => manual_score
--   - Si notation est un texte => manuel_comment (ajouté au comment existant)
--   - Le champ "comment" existant va toujours dans manual_comment

-- ========================================================================
-- DÉBUT DU SCRIPT SQL
-- ========================================================================

-- Définir l'ID du RFP
DO $$
DECLARE
  v_rfp_id UUID := 'YOUR_RFP_ID_HERE';  -- REMPLACER PAR L'UUID RÉEL
  v_inserted_count INTEGER := 0;
  v_error_count INTEGER := 0;
BEGIN

  -- Vérifier que le RFP existe
  IF NOT EXISTS (SELECT 1 FROM rfps WHERE id = v_rfp_id) THEN
    RAISE EXCEPTION 'RFP with ID % does not exist', v_rfp_id;
  END IF;

  RAISE NOTICE 'Starting import for RFP ID: %', v_rfp_id;

  -- ----------------------------------------------------------------
  -- ACCENTURE - R - 1
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      5,
      'Accenture explicitly confirms full L1/L1.5 scope coverage, including monitoring, administrative, and closing tasks, and commits to remediation based on monitoring outcomes. This directly addresses the requirement.
	
		
Gaps/Risks:
No detailed mapping of Accor’s listed non-ticket activities to roles/SOPs and escalation paths.
No reference to existing tools/automation (e.g., RPA) takeover for monitoring activities.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 1'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ACCENTURE'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 5,
      manual_comment = 'Accenture explicitly confirms full L1/L1.5 scope coverage, including monitoring, administrative, and closing tasks, and commits to remediation based on monitoring outcomes. This directly addresses the requirement.
	
		
Gaps/Risks:
No detailed mapping of Accor’s listed non-ticket activities to roles/SOPs and escalation paths.
No reference to existing tools/automation (e.g., RPA) takeover for monitoring activities.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ACCENTURE - R - 1: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ACCENTURE - R - 2
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'Commits to keeping support procedures up to date with regular audits (twice/year) and storing all documentation on Accor infrastructure; ongoing updates after ticket resolution are explicitly stated. Transition deliverables include a System Understanding Document (SUD) and “support procedure/knowledge base updated,” showing lifecycle ownership during and after transition.
KB/SOPs to include L1/L1.5 procedures, admin/closing/monitoring activities; transition plan includes collecting/reviewing existing Accor docs and identifying gaps.
Proposes a clear RACI and governance; “define support processes” in transition; deliverables and RACI imply escalation paths documented.
Skill matrix, binômes, continuous shadowing, and structured onboarding reinforce knowledge capture and reuse.
References AI-enabled knowledge (Quasar/Klewer, GenAI digital KM) to make knowledge searchable and actionable.
	 
	 
Gaps/Risks:	 
Ownership not stated explicitly; need a clear “all docs remain Accor property.”
Primary KB platform and workflow not specified (ServiceNow KB vs SharePoint)
No samples/templates (SOP/KB taxonomy) and no commitment to translation during the transitional phase.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 2'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ACCENTURE'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'Commits to keeping support procedures up to date with regular audits (twice/year) and storing all documentation on Accor infrastructure; ongoing updates after ticket resolution are explicitly stated. Transition deliverables include a System Understanding Document (SUD) and “support procedure/knowledge base updated,” showing lifecycle ownership during and after transition.
KB/SOPs to include L1/L1.5 procedures, admin/closing/monitoring activities; transition plan includes collecting/reviewing existing Accor docs and identifying gaps.
Proposes a clear RACI and governance; “define support processes” in transition; deliverables and RACI imply escalation paths documented.
Skill matrix, binômes, continuous shadowing, and structured onboarding reinforce knowledge capture and reuse.
References AI-enabled knowledge (Quasar/Klewer, GenAI digital KM) to make knowledge searchable and actionable.
	 
	 
Gaps/Risks:	 
Ownership not stated explicitly; need a clear “all docs remain Accor property.”
Primary KB platform and workflow not specified (ServiceNow KB vs SharePoint)
No samples/templates (SOP/KB taxonomy) and no commitment to translation during the transitional phase.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ACCENTURE - R - 2: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ACCENTURE - R - 3
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'Accenture can staff Option 1 (08:00–19:00 CET) and Option 2 (08:00–21:00 CET) from Mauritius (FR/EN), matching the RFP windows.
Commits to J+3–J+4 until 23:59 CET, but via an on-call model with intervention hours billed separately, and recommends Option 2 only during closings due to extra cost. 
Open to discuss alternative mixes of staffed window + on-call during transition.


Gaps/risks:
On-call with extra billing for closings contradicts the spirit of “mandatory” coverage and Accor’s elasticity principle (no additional cost).
Suggests extra cost for Option 2 outside closings; no hour-by-hour staffing plan (min seats, FR/EN mix) or on-call response SLAs for J+3/J+4.
Single primary site (Mauritius) raises resilience risk without an EMEA backup.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 3'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ACCENTURE'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'Accenture can staff Option 1 (08:00–19:00 CET) and Option 2 (08:00–21:00 CET) from Mauritius (FR/EN), matching the RFP windows.
Commits to J+3–J+4 until 23:59 CET, but via an on-call model with intervention hours billed separately, and recommends Option 2 only during closings due to extra cost. 
Open to discuss alternative mixes of staffed window + on-call during transition.


Gaps/risks:
On-call with extra billing for closings contradicts the spirit of “mandatory” coverage and Accor’s elasticity principle (no additional cost).
Suggests extra cost for Option 2 outside closings; no hour-by-hour staffing plan (min seats, FR/EN mix) or on-call response SLAs for J+3/J+4.
Single primary site (Mauritius) raises resilience risk without an EMEA backup.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ACCENTURE - R - 3: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ACCENTURE - R - 4
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'Confirms bilingual FR/EN delivery and shows ability to operate in both languages from Mauritius; replies will be in the ticket’s language (FR if raised in FR; EN if raised in EN). States intent to “transition from bilingual to English-only over time.”
Year 1 model includes a Paris-based SDM (supporting French proximity), then moves to a full offshore model (Mauritius) from Year 2.


Gaps/Risks:
Does not explicitly commit to the two RFP scenarios (Scenario 1: L1 in English AND L1.5 in French; Scenario 2: both in English).
No formal language proficiency framework (e.g., CEFR targets, assessment methods, QA cadence) or language-specific KPIs/SLAs.
KB/documentation language plan not stated (bilingual during Scenario 1). Assumes Oracle documentation in English, which may hinder FR user experience in the transitional phase.
The move to full offshore in Year 2 could dilute guaranteed French L1.5 coverage if not explicitly preserved.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 4'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ACCENTURE'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'Confirms bilingual FR/EN delivery and shows ability to operate in both languages from Mauritius; replies will be in the ticket’s language (FR if raised in FR; EN if raised in EN). States intent to “transition from bilingual to English-only over time.”
Year 1 model includes a Paris-based SDM (supporting French proximity), then moves to a full offshore model (Mauritius) from Year 2.


Gaps/Risks:
Does not explicitly commit to the two RFP scenarios (Scenario 1: L1 in English AND L1.5 in French; Scenario 2: both in English).
No formal language proficiency framework (e.g., CEFR targets, assessment methods, QA cadence) or language-specific KPIs/SLAs.
KB/documentation language plan not stated (bilingual during Scenario 1). Assumes Oracle documentation in English, which may hinder FR user experience in the transitional phase.
The move to full offshore in Year 2 could dilute guaranteed French L1.5 coverage if not explicitly preserved.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ACCENTURE - R - 4: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ACCENTURE - R - 5
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'Year 1 blended model with a Paris-based SDM and delivery from  Mauritius; Year 2 onward moves to full offshore in Mauritius. Mauritius capability is well justified (FR/EN talent, 230+ Oracle FTEs, certifications, time-zone proximity).
Model supports Option 1 (08:00–19:00 CET) and Option 2 (08:00–21:00 CET) from Mauritius; governance and reporting structure detailed. Closure coverage is offered but via on-call.
RACI provided; teams split across L1/L1.5, Admin/Closing/Monitoring, and Technical/Automation. ServiceNow-based operation and committee cadence align with Accor.
Describes a 10% buffer and a Capacity Work Unit (CWU) mechanism for peaks.


Gaps/Risks:
Closure coverage and costs: Proposes on-call with separately billed intervention hours and recommends Option 2 only during closings due to extra costs—this weakens the “embedded coverage” expectation.
CWU requires minimum 3-month activation and extra fees; 10% free buffer only—may not meet Accor’s “no additional costs” elasticity principle.
Single primary delivery site (Mauritius) with no explicit nearshore/backup site or DR/failover plan; potential resilience risk.
Assumptions place Level 0 filtering on Accor before assignment to Accenture; Accor’s target workflow expects provider-led triage/dispatcher within L1.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 5'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ACCENTURE'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'Year 1 blended model with a Paris-based SDM and delivery from  Mauritius; Year 2 onward moves to full offshore in Mauritius. Mauritius capability is well justified (FR/EN talent, 230+ Oracle FTEs, certifications, time-zone proximity).
Model supports Option 1 (08:00–19:00 CET) and Option 2 (08:00–21:00 CET) from Mauritius; governance and reporting structure detailed. Closure coverage is offered but via on-call.
RACI provided; teams split across L1/L1.5, Admin/Closing/Monitoring, and Technical/Automation. ServiceNow-based operation and committee cadence align with Accor.
Describes a 10% buffer and a Capacity Work Unit (CWU) mechanism for peaks.


Gaps/Risks:
Closure coverage and costs: Proposes on-call with separately billed intervention hours and recommends Option 2 only during closings due to extra costs—this weakens the “embedded coverage” expectation.
CWU requires minimum 3-month activation and extra fees; 10% free buffer only—may not meet Accor’s “no additional costs” elasticity principle.
Single primary delivery site (Mauritius) with no explicit nearshore/backup site or DR/failover plan; potential resilience risk.
Assumptions place Level 0 filtering on Accor before assignment to Accenture; Accor’s target workflow expects provider-led triage/dispatcher within L1.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ACCENTURE - R - 5: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ACCENTURE - R - 6
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      2.5,
      'Accenture offers only a limited elasticity buffer (+10% monthly volume). Beyond that, they propose paid Capacity Work Units (CWUs) with a minimum 3‑month activation and 4–8 week notice, plus “no penalties”/SLA freeze when volumes exceed thresholds. 
Closure coverage (J+3/J+4) is proposed as on‑call with intervention hours billed separately, again conflicting with the “no extra cost” elasticity principle.


Gaps/Risks:
Extra fees for peaks (CWU at €10.5k/month, 3‑month minimum) and SLA freeze/penalty waiver for >10% surges are not compliant.
On‑call closure coverage billed separately undermines mandatory peak coverage.
No quantified bench/standby pool, activation SLAs, or maximum burst capacity; notice periods (4–8 weeks) don’t meet “dynamic” scaling.
No explicit shared-resource model details (cross‑trained pool, language mix',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 6'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ACCENTURE'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 2.5,
      manual_comment = 'Accenture offers only a limited elasticity buffer (+10% monthly volume). Beyond that, they propose paid Capacity Work Units (CWUs) with a minimum 3‑month activation and 4–8 week notice, plus “no penalties”/SLA freeze when volumes exceed thresholds. 
Closure coverage (J+3/J+4) is proposed as on‑call with intervention hours billed separately, again conflicting with the “no extra cost” elasticity principle.


Gaps/Risks:
Extra fees for peaks (CWU at €10.5k/month, 3‑month minimum) and SLA freeze/penalty waiver for >10% surges are not compliant.
On‑call closure coverage billed separately undermines mandatory peak coverage.
No quantified bench/standby pool, activation SLAs, or maximum burst capacity; notice periods (4–8 weeks) don’t meet “dynamic” scaling.
No explicit shared-resource model details (cross‑trained pool, language mix',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ACCENTURE - R - 6: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ACCENTURE - R - 7
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      4.5,
      'Accenture states 175+ Oracle E‑Business Suite R12.x implementations and 4,200+ EBS professionals globally, with explicit awareness of Accor’s R12.2.12 scope and modules. Credentials include AMS for EBS (legacy) in large multinational contexts alongside Fusion programs.
Mauritius Oracle hub shows 230+ Oracle FTE, 77+ Oracle-certified profiles, ISO/CMMI/SOC certifications, and multiple ongoing Oracle projects
Planned profiles list EBS Financials certifications (AP, GL), and experience across Finance/SCM/processes; proposal acknowledges Accor’s country/module map and RI decommission timing.
RACI assigns Accenture to acknowledge/qualify/resolve L1/L1.5, escalate to L2; ITIL-based processes, ServiceNow operation, and tools for auto-categorization/assignment support accurate classification and workflow execution.
Extensive Oracle partnership credentials (80k Oracle-skilled, 18k certs; awards, leader positions), plus internal KM/skill-matrix, binôme model, continuous shadowing; named AI/KM accelerators (Quasar/Klewer, myWizard) to sustain expertise.
',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 7'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ACCENTURE'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 4.5,
      manual_comment = 'Accenture states 175+ Oracle E‑Business Suite R12.x implementations and 4,200+ EBS professionals globally, with explicit awareness of Accor’s R12.2.12 scope and modules. Credentials include AMS for EBS (legacy) in large multinational contexts alongside Fusion programs.
Mauritius Oracle hub shows 230+ Oracle FTE, 77+ Oracle-certified profiles, ISO/CMMI/SOC certifications, and multiple ongoing Oracle projects
Planned profiles list EBS Financials certifications (AP, GL), and experience across Finance/SCM/processes; proposal acknowledges Accor’s country/module map and RI decommission timing.
RACI assigns Accenture to acknowledge/qualify/resolve L1/L1.5, escalate to L2; ITIL-based processes, ServiceNow operation, and tools for auto-categorization/assignment support accurate classification and workflow execution.
Extensive Oracle partnership credentials (80k Oracle-skilled, 18k certs; awards, leader positions), plus internal KM/skill-matrix, binôme model, continuous shadowing; named AI/KM accelerators (Quasar/Klewer, myWizard) to sustain expertise.
',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ACCENTURE - R - 7: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ACCENTURE - R - 11
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'Accenture defines weekly, monthly, and quarterly reporting aligned to governance. Content includes SLA/metrics/trends, incident/SR status, aging analysis, SLA tracking, P1/P2 RCA, risks/issues, resource/attrition, system monitoring updates, CSAT (“relationship scorecard”), and innovation/productivity improvements.
Tooling/automation intent: Assumes ServiceNow data extraction to auto-calculate SLAs/KPIs; cites “Automated Service Reporting” and an “Integrated Command Center” under innovation.


Gaps/Risks:
No example dashboards included
Not all RFP KPIs are explicitly committed 
No report delivery SLAs (e.g., monthly), no KPI dictionary (formulas, business-hours clocks, pause rules)',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 11'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ACCENTURE'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'Accenture defines weekly, monthly, and quarterly reporting aligned to governance. Content includes SLA/metrics/trends, incident/SR status, aging analysis, SLA tracking, P1/P2 RCA, risks/issues, resource/attrition, system monitoring updates, CSAT (“relationship scorecard”), and innovation/productivity improvements.
Tooling/automation intent: Assumes ServiceNow data extraction to auto-calculate SLAs/KPIs; cites “Automated Service Reporting” and an “Integrated Command Center” under innovation.


Gaps/Risks:
No example dashboards included
Not all RFP KPIs are explicitly committed 
No report delivery SLAs (e.g., monthly), no KPI dictionary (formulas, business-hours clocks, pause rules)',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ACCENTURE - R - 11: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ACCENTURE - R - 8
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'Accenture describes robust knowledge preservation and people practices (transition KT plans, System Understanding Document, binôme pairing, continuous shadowing, skill matrix, twice-yearly procedure audits, structured onboarding and continuous training). 
A comprehensive retention framework is outlined (Emerging Leaders, internal mobility, recognition programs, well-being/benefits, Net Better Off, engagement forums), which should help reduce attrition.

Gaps/Risks:
No turnover rate provided for L1 resources in the proposed hubs (Mauritius/Paris), nor historical figures specific to similar AMS teams.
Staffing composition not specified (employees vs subcontractors/freelancers) and no cap on subcontractor usage.
Planned shift of SDM from Paris (Year 1) to Mauritius (Year 2) may reduce proximity to Accor’s user community unless mitigated.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 8'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ACCENTURE'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'Accenture describes robust knowledge preservation and people practices (transition KT plans, System Understanding Document, binôme pairing, continuous shadowing, skill matrix, twice-yearly procedure audits, structured onboarding and continuous training). 
A comprehensive retention framework is outlined (Emerging Leaders, internal mobility, recognition programs, well-being/benefits, Net Better Off, engagement forums), which should help reduce attrition.

Gaps/Risks:
No turnover rate provided for L1 resources in the proposed hubs (Mauritius/Paris), nor historical figures specific to similar AMS teams.
Staffing composition not specified (employees vs subcontractors/freelancers) and no cap on subcontractor usage.
Planned shift of SDM from Paris (Year 1) to Mauritius (Year 2) may reduce proximity to Accor’s user community unless mitigated.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ACCENTURE - R - 8: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ACCENTURE - R - 9
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'Clearly defined for the Accenture Account Manager, Oracle Entity Leadership (executive sponsor), Service Delivery Manager onshore (Paris, Year 1) and offshore (Mauritius), plus delivery teams. Responsibilities include governance setup, SLA/KPI monitoring, risk/issue management, continuous improvement, and AI/automation oversight.
An organizational view and RACI are provided, showing Support Analysts → SDM (offshore, with onshore SDM in Year 1) → Account Manager/Oracle Entity Leadership, and interfaces with Accor Product Owner/Manager. Attendee lists per committee clarify who represents Accenture at each level.
Comprehensive governance cadence aligned to the RFP: weekly operational reviews, monthly steering committees, quarterly business reviews, and daily closing-period meetings. Management reporting artifacts (weekly incident dashboard, monthly service status, quarterly strategic reporting) support oversight and escalation.


Gaps/Risks:
SDM proximity after Year 1: Plan to move the SDM role offshore in Year 2 may reduce the “geographical and cultural proximity” expected by Accor for the SDM.
Escalation SLAs and contact matrix: No explicit response-time targets for escalations or a named deputy/backfill plan for AM/SDM absences.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 9'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ACCENTURE'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'Clearly defined for the Accenture Account Manager, Oracle Entity Leadership (executive sponsor), Service Delivery Manager onshore (Paris, Year 1) and offshore (Mauritius), plus delivery teams. Responsibilities include governance setup, SLA/KPI monitoring, risk/issue management, continuous improvement, and AI/automation oversight.
An organizational view and RACI are provided, showing Support Analysts → SDM (offshore, with onshore SDM in Year 1) → Account Manager/Oracle Entity Leadership, and interfaces with Accor Product Owner/Manager. Attendee lists per committee clarify who represents Accenture at each level.
Comprehensive governance cadence aligned to the RFP: weekly operational reviews, monthly steering committees, quarterly business reviews, and daily closing-period meetings. Management reporting artifacts (weekly incident dashboard, monthly service status, quarterly strategic reporting) support oversight and escalation.


Gaps/Risks:
SDM proximity after Year 1: Plan to move the SDM role offshore in Year 2 may reduce the “geographical and cultural proximity” expected by Accor for the SDM.
Escalation SLAs and contact matrix: No explicit response-time targets for escalations or a named deputy/backfill plan for AM/SDM absences.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ACCENTURE - R - 9: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ACCENTURE - R - 10
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      4,
      'Accenture lays out all required committees with objectives, attendees from both sides, frequency, and format.
RACI matrices are provided for Service Management, Transition, and Run, clarifying accountability and participation across key activities.
Reporting cadence aligns to governance: weekly incident dashboards, monthly service delivery status reports (SLA/KPI, risks/issues, QA, aging), and quarterly strategic reporting (CSAT, productivity, compliance, attrition, innovation).
Escalation and communication mechanisms are described via governance principles (transparency, agile adjustments, feedback loops) and the dual onshore/offshore SDM model in Year 1 for proximity and responsiveness.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 10'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ACCENTURE'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 4,
      manual_comment = 'Accenture lays out all required committees with objectives, attendees from both sides, frequency, and format.
RACI matrices are provided for Service Management, Transition, and Run, clarifying accountability and participation across key activities.
Reporting cadence aligns to governance: weekly incident dashboards, monthly service delivery status reports (SLA/KPI, risks/issues, QA, aging), and quarterly strategic reporting (CSAT, productivity, compliance, attrition, innovation).
Escalation and communication mechanisms are described via governance principles (transparency, agile adjustments, feedback loops) and the dual onshore/offshore SDM model in Year 1 for proximity and responsiveness.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ACCENTURE - R - 10: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ACCENTURE - R - 13
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      4,
      'Accenture defines a structured CSI approach anchored in its OpErA framework (Optimize, Eradicate, Automate), with regular reviews in weekly/monthly/quarterly governance. Reporting includes problem management, P1/P2 RCAs, aging analysis, risks/issues, and “innovation & productivity improvements.” This covers analysis of KPIs, RCAs, and process inefficiencies.
Commits to problem management to eliminate root causes, preventive maintenance, standardization of resolutions, and automation of recurrent tasks (ticket auto-categorization/assignment, SR auto-resolution, semi/fully automated incident resolution).
Strategic reporting includes a “relationship scorecard” with CSAT, enabling feedback-driven improvement.


Gaps/Risks:
Dependency stated: asks Accor to implement problem management processes; ownership on Accenture’s side for L1/L1.5 needs to be explicit.
No quantified targets (e.g., recurrence rate reduction, FCR uplift, MTTR reduction) or timelines to implement corrective actions post-RCA.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 13'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ACCENTURE'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 4,
      manual_comment = 'Accenture defines a structured CSI approach anchored in its OpErA framework (Optimize, Eradicate, Automate), with regular reviews in weekly/monthly/quarterly governance. Reporting includes problem management, P1/P2 RCAs, aging analysis, risks/issues, and “innovation & productivity improvements.” This covers analysis of KPIs, RCAs, and process inefficiencies.
Commits to problem management to eliminate root causes, preventive maintenance, standardization of resolutions, and automation of recurrent tasks (ticket auto-categorization/assignment, SR auto-resolution, semi/fully automated incident resolution).
Strategic reporting includes a “relationship scorecard” with CSAT, enabling feedback-driven improvement.


Gaps/Risks:
Dependency stated: asks Accor to implement problem management processes; ownership on Accenture’s side for L1/L1.5 needs to be explicit.
No quantified targets (e.g., recurrence rate reduction, FCR uplift, MTTR reduction) or timelines to implement corrective actions post-RCA.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ACCENTURE - R - 13: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ACCENTURE - R - 14
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      4,
      'Uses OpErA (Optimize, Eradicate, Automate) to drive year‑on‑year gains; embeds innovation in QBRs.
Concrete AI/RPA enablers and use cases: GenAI knowledge and search (Quasar/Klewer), auto-categorization/assignment, SR auto-resolution, semi/fully automated incident resolution, EventOps anomaly detection, automated monitoring (URL360/OIC), automated service reporting/integrated command center. These directly target L1/L1.5 efficiencies (triage, recurrence reduction, faster MTTR).
Positions productivity improvement and cost reduction; management reporting tracks “innovation & productivity improvements.” Provides at least one quantified reference (30% incident inflow reduction) from a comparable AMS engagement.

Gaps/Risks:
Limited quantified REX specifically for Oracle EBS L1/L1.5 contexts; few before/after metrics tied to these tools.
No time‑bound AI roadmap (pilots, scale, security/guardrails).',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 14'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ACCENTURE'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 4,
      manual_comment = 'Uses OpErA (Optimize, Eradicate, Automate) to drive year‑on‑year gains; embeds innovation in QBRs.
Concrete AI/RPA enablers and use cases: GenAI knowledge and search (Quasar/Klewer), auto-categorization/assignment, SR auto-resolution, semi/fully automated incident resolution, EventOps anomaly detection, automated monitoring (URL360/OIC), automated service reporting/integrated command center. These directly target L1/L1.5 efficiencies (triage, recurrence reduction, faster MTTR).
Positions productivity improvement and cost reduction; management reporting tracks “innovation & productivity improvements.” Provides at least one quantified reference (30% incident inflow reduction) from a comparable AMS engagement.

Gaps/Risks:
Limited quantified REX specifically for Oracle EBS L1/L1.5 contexts; few before/after metrics tied to these tools.
No time‑bound AI roadmap (pilots, scale, security/guardrails).',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ACCENTURE - R - 14: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ACCENTURE - R - 18
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'Proposes a 3‑month transition (mid‑Nov to mid‑Feb). Provides a week‑by‑week Gantt from kickoff to sign‑off.
Clearly details Assessment/Mobilization & Setup, Onboarding & System Learning (Knowledge Transfer), Shadowing, Reverse Shadowing, Handover and Sign‑off.
Transition Plan with detailed KT plan, Resource Plan, Connectivity checklist, Quality Assurance Plan, System Understanding Document (SUD), risks/issues logs, list of missing docs, transition closing memo, and sign‑off.
Dedicated risks & mitigations for transition (SME availability, documentation quality, dependencies), plus a tracker and governance to monitor.
A fixed transition price (324,000 €) and billing schedule are included.


Gaps/Risks:
Transition cost is lump‑sum; not broken down per sub‑phase/workstream as the RFP requests.
Resource plan is referenced as a deliverable but not shown in the proposal (no FTE by role/site/language for the transition period).',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 18'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ACCENTURE'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'Proposes a 3‑month transition (mid‑Nov to mid‑Feb). Provides a week‑by‑week Gantt from kickoff to sign‑off.
Clearly details Assessment/Mobilization & Setup, Onboarding & System Learning (Knowledge Transfer), Shadowing, Reverse Shadowing, Handover and Sign‑off.
Transition Plan with detailed KT plan, Resource Plan, Connectivity checklist, Quality Assurance Plan, System Understanding Document (SUD), risks/issues logs, list of missing docs, transition closing memo, and sign‑off.
Dedicated risks & mitigations for transition (SME availability, documentation quality, dependencies), plus a tracker and governance to monitor.
A fixed transition price (324,000 €) and billing schedule are included.


Gaps/Risks:
Transition cost is lump‑sum; not broken down per sub‑phase/workstream as the RFP requests.
Resource plan is referenced as a deliverable but not shown in the proposal (no FTE by role/site/language for the transition period).',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ACCENTURE - R - 18: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ACCENTURE - R - 19
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'Provides a transition risk register structure in practice (identified key risks with mitigations), including SME availability during year-end, documentation quality gaps, and dependencies with parallel projects. Proposes KPIs to monitor knowledge transition and a specific governance to steer the transition.
Contingency planning: Includes concrete fallback notions such as identifying SME backups, adjusting planning, and defining specific governance to manage dependencies—indicative of contingency thinking.
Ongoing monitoring and reporting: Transition methodology embeds a transition tracker tool, risks/issues log at each phase, Quality Assurance Plan, weekly/monthly checkpoints, and clearly defined entry/exit criteria up to sign-off.


Gaps/Risks:
No sample Risk Register/heat map included (owners, impact/likelihood scoring, triggers).',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 19'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ACCENTURE'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'Provides a transition risk register structure in practice (identified key risks with mitigations), including SME availability during year-end, documentation quality gaps, and dependencies with parallel projects. Proposes KPIs to monitor knowledge transition and a specific governance to steer the transition.
Contingency planning: Includes concrete fallback notions such as identifying SME backups, adjusting planning, and defining specific governance to manage dependencies—indicative of contingency thinking.
Ongoing monitoring and reporting: Transition methodology embeds a transition tracker tool, risks/issues log at each phase, Quality Assurance Plan, weekly/monthly checkpoints, and clearly defined entry/exit criteria up to sign-off.


Gaps/Risks:
No sample Risk Register/heat map included (owners, impact/likelihood scoring, triggers).',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ACCENTURE - R - 19: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ACCENTURE - R - 20
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      2,
      'Describes a structured exit (launch, knowledge/doc transfer, service continuity, handover) with entry/exit gates and deliverables (reversibility plan, governance, access checklist, automation specs). This covers the minimum scope conceptually.
Duration commitment: Proposes 2.5–3 months and requests 3 months’ advance notice; does not commit to “up to six (6) months” as required.
SLAs during reversibility: States “SLA are frozen during the reversibility period,” 
Provides only a nonbinding budget range (€115–130k; ~270 MD) rather than itemized price.


Gaps/Risks:
No contractual commitment to support up to 6 months’ reversibility.
Freezing SLAs removes accountability during a critical phase.
Pricing is indicative; lacks detailed breakdown by workstream/activities and underlying assumptions.
No explicit  inventory-based handover checklist, or access revocation plan.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 20'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ACCENTURE'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 2,
      manual_comment = 'Describes a structured exit (launch, knowledge/doc transfer, service continuity, handover) with entry/exit gates and deliverables (reversibility plan, governance, access checklist, automation specs). This covers the minimum scope conceptually.
Duration commitment: Proposes 2.5–3 months and requests 3 months’ advance notice; does not commit to “up to six (6) months” as required.
SLAs during reversibility: States “SLA are frozen during the reversibility period,” 
Provides only a nonbinding budget range (€115–130k; ~270 MD) rather than itemized price.


Gaps/Risks:
No contractual commitment to support up to 6 months’ reversibility.
Freezing SLAs removes accountability during a critical phase.
Pricing is indicative; lacks detailed breakdown by workstream/activities and underlying assumptions.
No explicit  inventory-based handover checklist, or access revocation plan.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ACCENTURE - R - 20: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ACCENTURE - R - 21
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'Provides fixed-price options (Option 1/2) in EUR  with quarterly billing; transition priced separately; clear 3-year schedule. 
Proposes a 10% buffer and a paid Capacity Work Unit (CWU) construct to absorb higher volumes. Flexible, but surcharges apply and activation has notice/minimums.
Mentions SLA framework and baselining, but pricing is not explicitly linked to quality or productivity outcomes.
High-level figures (Transition, Run, On-call) are shown, but there is no detailed breakdown of cost components 
Year‑1 review: Executive summary cites a Year 1 review clause, and assumptions mention a 3‑month baselining and annual sizing review, but there’s no explicit contractual true‑up mechanism tied to performance/value.


Gaps/Risks:
Elasticity costs: Peaks above 10% require paid CWUs (min 3 months) and closure on‑call intervention hours are billed separately—reduces predictability and conflicts with Accor’s preference to absorb peaks.
No explicit Year‑1 contractual price true‑up linked to observed volumes, KPIs, or productivity gains.
Quarterly upfront billing and COLA escalators may weaken cost optimization if activity drops.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 21'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ACCENTURE'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'Provides fixed-price options (Option 1/2) in EUR  with quarterly billing; transition priced separately; clear 3-year schedule. 
Proposes a 10% buffer and a paid Capacity Work Unit (CWU) construct to absorb higher volumes. Flexible, but surcharges apply and activation has notice/minimums.
Mentions SLA framework and baselining, but pricing is not explicitly linked to quality or productivity outcomes.
High-level figures (Transition, Run, On-call) are shown, but there is no detailed breakdown of cost components 
Year‑1 review: Executive summary cites a Year 1 review clause, and assumptions mention a 3‑month baselining and annual sizing review, but there’s no explicit contractual true‑up mechanism tied to performance/value.


Gaps/Risks:
Elasticity costs: Peaks above 10% require paid CWUs (min 3 months) and closure on‑call intervention hours are billed separately—reduces predictability and conflicts with Accor’s preference to absorb peaks.
No explicit Year‑1 contractual price true‑up linked to observed volumes, KPIs, or productivity gains.
Quarterly upfront billing and COLA escalators may weaken cost optimization if activity drops.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ACCENTURE - R - 21: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ACCENTURE - R - 22
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'Accenture pre-commits to year‑over‑year fee reductions (“Productivity gain” shown in the billing schedules with lower quarterly amounts in Years 2 and 3), indicating that efficiency gains will translate into price decreases even without scope/SL change.
Governance to review innovations: Innovation and productivity improvements are embedded in Monthly Steering and QBRs; reporting includes RCA/problem management and “innovation & productivity improvements,” aligning with the RFP’s joint analysis and agreement on cost consequences.
Expertise and technology levers: A defined CSI/OpErA framework (optimize/eradicate/automate) with AI/RPA enablers (GenAI KM, auto‑categorization/assignment, automated monitoring/reporting) underpins expected gains.


Gaps/Risks:
Some gains are contingent on deploying Accenture tools (e.g., GenWizard); if not approved, Accenture reserves the right to reassess productivity and financial commitments.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 22'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ACCENTURE'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'Accenture pre-commits to year‑over‑year fee reductions (“Productivity gain” shown in the billing schedules with lower quarterly amounts in Years 2 and 3), indicating that efficiency gains will translate into price decreases even without scope/SL change.
Governance to review innovations: Innovation and productivity improvements are embedded in Monthly Steering and QBRs; reporting includes RCA/problem management and “innovation & productivity improvements,” aligning with the RFP’s joint analysis and agreement on cost consequences.
Expertise and technology levers: A defined CSI/OpErA framework (optimize/eradicate/automate) with AI/RPA enablers (GenAI KM, auto‑categorization/assignment, automated monitoring/reporting) underpins expected gains.


Gaps/Risks:
Some gains are contingent on deploying Accenture tools (e.g., GenWizard); if not approved, Accenture reserves the right to reassess productivity and financial commitments.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ACCENTURE - R - 22: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ITC - R - 1
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      NULL,
      'NOTATION: Explicit scope coverage: ITC states L1 and L1.5 support are in scope and includes Monitoring, Administrative, and Closing activities with centralized ticket logging and tracking/closure of issues. ITC also agrees with the ticket triage and routing role.
Monitoring with remediation: Proposes a Next‑Gen AI observability platform, SOP-based resolution, and “self-heal/automated resolution,” indicating detection plus corrective action on alerts (not just monitoring). 

Clear inclusion of all non-ticket recurring activities (monitoring, admin, closing) with tools (observability, RPA/AI) to reduce manual effort and stabilize operations.
Bilingual model and dedicated L1/L1.5 streams support effective execution during business and closing periods.
',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 1'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ITC'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = NULL,
      manual_comment = 'NOTATION: Explicit scope coverage: ITC states L1 and L1.5 support are in scope and includes Monitoring, Administrative, and Closing activities with centralized ticket logging and tracking/closure of issues. ITC also agrees with the ticket triage and routing role.
Monitoring with remediation: Proposes a Next‑Gen AI observability platform, SOP-based resolution, and “self-heal/automated resolution,” indicating detection plus corrective action on alerts (not just monitoring). 

Clear inclusion of all non-ticket recurring activities (monitoring, admin, closing) with tools (observability, RPA/AI) to reduce manual effort and stabilize operations.
Bilingual model and dedicated L1/L1.5 streams support effective execution during business and closing periods.
',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ITC - R - 1: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ITC - R - 2
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      NULL,
      'NOTATION: Evidence of a living knowledge base: ITC commits to building and maintaining SOPs for L1 and L1.5 by module, Knowledge Acquisition Documents, run-books, a master list of documents, and lesson-learned artifacts. The transition plan explicitly includes document assessment, creation of missing documents, SOP authoring/updates, and playback validations. Structured documentation lifecycle in transition (assessment → authoring/updates → validation → sign-off) with concrete artifacts (SOPs, run-books, knowledge docs). ITC will also endorse documentation translation through AI tool, documentation will be Accor IP

The roadmap references “Incremental Knowledge base updation,” KEDB/SOP-driven resolution, and an AI Knowledge Discovery platform with continuous ingestion of documentation => " K Fabric" is free of cost, ITC brings it to Accor

Gaps/Risks:  Documentation deliverables are tied to ServiceNow-enabled operations, but the proposal does not explicitly state the primary KB platform (e.g., ServiceNow KB vs SharePoint) nor confirm centralization within Accor’s environment.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 2'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ITC'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = NULL,
      manual_comment = 'NOTATION: Evidence of a living knowledge base: ITC commits to building and maintaining SOPs for L1 and L1.5 by module, Knowledge Acquisition Documents, run-books, a master list of documents, and lesson-learned artifacts. The transition plan explicitly includes document assessment, creation of missing documents, SOP authoring/updates, and playback validations. Structured documentation lifecycle in transition (assessment → authoring/updates → validation → sign-off) with concrete artifacts (SOPs, run-books, knowledge docs). ITC will also endorse documentation translation through AI tool, documentation will be Accor IP

The roadmap references “Incremental Knowledge base updation,” KEDB/SOP-driven resolution, and an AI Knowledge Discovery platform with continuous ingestion of documentation => " K Fabric" is free of cost, ITC brings it to Accor

Gaps/Risks:  Documentation deliverables are tied to ServiceNow-enabled operations, but the proposal does not explicitly state the primary KB platform (e.g., ServiceNow KB vs SharePoint) nor confirm centralization within Accor’s environment.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ITC - R - 2: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ITC - R - 3
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      NULL,
      'NOTATION: ITC recognizes both Option 1 (08:00–19:00 CET) and Option 2 (08:00–21:00 CET) , and explicitly proposes running with Option 2 for “wider coverage” with “no impact to resource model.”
Closure coverage: Commits to mandatory closure support until 23:59 CET (J+3–J+4). Also offers 24x5 on‑call for P1/P2 beyond business hours, which complements extended coverage.


Gaps/Risks: no explicit statement on adding ad‑hoc extra time slots upon request.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 3'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ITC'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = NULL,
      manual_comment = 'NOTATION: ITC recognizes both Option 1 (08:00–19:00 CET) and Option 2 (08:00–21:00 CET) , and explicitly proposes running with Option 2 for “wider coverage” with “no impact to resource model.”
Closure coverage: Commits to mandatory closure support until 23:59 CET (J+3–J+4). Also offers 24x5 on‑call for P1/P2 beyond business hours, which complements extended coverage.


Gaps/Risks: no explicit statement on adding ad‑hoc extra time slots upon request.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ITC - R - 3: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ITC - R - 4
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      NULL,
      'NOTATION: Explicit alignment to Accor’s two scenarios: States Scenario 1 “L1 Support – English, L1.5 Support – French” and Scenario 2 “L1 & L1.5 Support – English.” 
Bilingual staffing evidenced: Proposes a bilingual (EN/FR) service model; names an on‑site Service Delivery Manager and an Oracle Finance Lead both as French + English speakers. 
Proficiency sustainment mechanisms: “Accor Academy” with quarterly learning programs, refresher courses, inbuilt assessments and a minimum qualifying score; soft‑skills training (communication, customer centricity), plus certification pathways for Oracle modules.


Gaps/Risks:
No formal language proficiency framework (e.g., CEFR targets, testing methods, re‑cert cadence) 
Channels for French L1.5 (voice/chat) not explicitly confirmed; “high‑touch” is stated but not mapped to channels.
No staffing matrix showing French coverage across extended hours and J+3/J+4 closures.
',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 4'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ITC'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = NULL,
      manual_comment = 'NOTATION: Explicit alignment to Accor’s two scenarios: States Scenario 1 “L1 Support – English, L1.5 Support – French” and Scenario 2 “L1 & L1.5 Support – English.” 
Bilingual staffing evidenced: Proposes a bilingual (EN/FR) service model; names an on‑site Service Delivery Manager and an Oracle Finance Lead both as French + English speakers. 
Proficiency sustainment mechanisms: “Accor Academy” with quarterly learning programs, refresher courses, inbuilt assessments and a minimum qualifying score; soft‑skills training (communication, customer centricity), plus certification pathways for Oracle modules.


Gaps/Risks:
No formal language proficiency framework (e.g., CEFR targets, testing methods, re‑cert cadence) 
Channels for French L1.5 (voice/chat) not explicitly confirmed; “high‑touch” is stated but not mapped to channels.
No staffing matrix showing French coverage across extended hours and J+3/J+4 closures.
',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ITC - R - 4: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ITC - R - 5
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      NULL,
      'NOTATION: Hybrid footprint with onsite France for governance and offshore India for scale. Clear roles (on-site SDM FR/EN for Y1, then moves offeshire; on-site Oracle Finance Lead FR/EN), L1/L1.5 team, separate Admin/Closing/Monitoring stream, and Technical/Automation stream. SLA/KPI-driven governance, TMO, and detailed transition approach are provided.
Service continuity: Daily review during closings, SOP/runbook creation, observability platform, and structured governance support continuity. 
Y1 : 3 (L1) + 5 (L1.5) + 2  (monito.)
Y2 : 2 (L1)+ 4 (L1.5) + 1 (monito.)
Y3 : 4 (L1.5)
Monitoring resources: 1 of them will be more on the technical side, they will perform monitoring and corrective actions on failures, and give inputs to automation team for long term corrective actions, could be moved to L1.5 resources though

Gaps/Risks:
Option 1 not explicitly offered as a selectable mode: “ITC only proposes option 2 coverage model,” whereas the RFP requires ability to ensure both options.
No staffing matrix (headcount, seniority, FR/EN mix) for each window
Flexibility/scalability assertions are high-level; baseline ±10% triggers a “workload impact analysis and commercial adjustment,” which suggests limited elasticity within base model + user baseline is not a reliable baseline',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 5'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ITC'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = NULL,
      manual_comment = 'NOTATION: Hybrid footprint with onsite France for governance and offshore India for scale. Clear roles (on-site SDM FR/EN for Y1, then moves offeshire; on-site Oracle Finance Lead FR/EN), L1/L1.5 team, separate Admin/Closing/Monitoring stream, and Technical/Automation stream. SLA/KPI-driven governance, TMO, and detailed transition approach are provided.
Service continuity: Daily review during closings, SOP/runbook creation, observability platform, and structured governance support continuity. 
Y1 : 3 (L1) + 5 (L1.5) + 2  (monito.)
Y2 : 2 (L1)+ 4 (L1.5) + 1 (monito.)
Y3 : 4 (L1.5)
Monitoring resources: 1 of them will be more on the technical side, they will perform monitoring and corrective actions on failures, and give inputs to automation team for long term corrective actions, could be moved to L1.5 resources though

Gaps/Risks:
Option 1 not explicitly offered as a selectable mode: “ITC only proposes option 2 coverage model,” whereas the RFP requires ability to ensure both options.
No staffing matrix (headcount, seniority, FR/EN mix) for each window
Flexibility/scalability assertions are high-level; baseline ±10% triggers a “workload impact analysis and commercial adjustment,” which suggests limited elasticity within base model + user baseline is not a reliable baseline',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ITC - R - 5: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ITC - R - 6
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      NULL,
      'NOTATION: ITC sets a “Baseline Benchmarking” rule where any change beyond ±10% in scope (operating units/~70 users) “triggers workload impact analysis and commercial adjustment.” with is not reliable
While the proposal claims a “Flexible ramp‑up/down delivery model,” it does not specify a trained bench/standby pool size, activation lead times, or maximum burst capacity. There is no shared‑resource model description (e.g., cross‑trained pool across modules/languages).

However ITC proposes aggressive workload reduction percentage (up to 70% Y3) through CSI/automation (RRS framework, AI “observability” platform) to reduce manual effort and ticket load over time.

Gaps/Risks:
No details on bench size, language mix (FR/EN)
“Commercial adjustment” beyond ±10% based on a user baseline is not representative of reality, not reliable and may cause strong additional cost
',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 6'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ITC'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = NULL,
      manual_comment = 'NOTATION: ITC sets a “Baseline Benchmarking” rule where any change beyond ±10% in scope (operating units/~70 users) “triggers workload impact analysis and commercial adjustment.” with is not reliable
While the proposal claims a “Flexible ramp‑up/down delivery model,” it does not specify a trained bench/standby pool size, activation lead times, or maximum burst capacity. There is no shared‑resource model description (e.g., cross‑trained pool across modules/languages).

However ITC proposes aggressive workload reduction percentage (up to 70% Y3) through CSI/automation (RRS framework, AI “observability” platform) to reduce manual effort and ticket load over time.

Gaps/Risks:
No details on bench size, language mix (FR/EN)
“Commercial adjustment” beyond ±10% based on a user baseline is not representative of reality, not reliable and may cause strong additional cost
',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ITC - R - 6: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ITC - R - 7
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      NULL,
      'NOTATION: Demonstrates Oracle EBS R12 expertise via case studies  with quantified outcomes (SLA ≥95%, 25–40% ticket reduction, 30% cost savings). Proposed team CVs show 10–14+ years on EBS R12 across Finance/SCM; clear split between functional and technical streams.
Covers Accor modules and shows L1/L1.5 activities mapped in transition/playback/shadowing phases.
L1/L1.5 execution capability: SOP/KEDB-based resolution, category auto-triage, ServiceNow configuration, and RRS (runner/repeater/stranger) framework indicate ability to classify/manage tickets and distinguish functional vs technical for escalation.
Training and certifications listed (Oracle EBS R12 Payables/Receivables/GL/Inventory Essentials), Accor Academy

Gaps/Risks:
Version specificity: No explicit confirmation of Oracle EBS R12.2 (or R12.2.12) experience; references are to “R12/R12.x.”
Does not state the number of EBS consultants globally vs assigned to the India delivery center for Accor.
Evidence artifacts: No sample L1/L1.5 triage scripts, dispatcher decision trees, or SOP excerpts included.
Partnership/certification depth: Oracle partnership level and count of EBS (not Cloud) certifications are not quantified',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 7'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ITC'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = NULL,
      manual_comment = 'NOTATION: Demonstrates Oracle EBS R12 expertise via case studies  with quantified outcomes (SLA ≥95%, 25–40% ticket reduction, 30% cost savings). Proposed team CVs show 10–14+ years on EBS R12 across Finance/SCM; clear split between functional and technical streams.
Covers Accor modules and shows L1/L1.5 activities mapped in transition/playback/shadowing phases.
L1/L1.5 execution capability: SOP/KEDB-based resolution, category auto-triage, ServiceNow configuration, and RRS (runner/repeater/stranger) framework indicate ability to classify/manage tickets and distinguish functional vs technical for escalation.
Training and certifications listed (Oracle EBS R12 Payables/Receivables/GL/Inventory Essentials), Accor Academy

Gaps/Risks:
Version specificity: No explicit confirmation of Oracle EBS R12.2 (or R12.2.12) experience; references are to “R12/R12.x.”
Does not state the number of EBS consultants globally vs assigned to the India delivery center for Accor.
Evidence artifacts: No sample L1/L1.5 triage scripts, dispatcher decision trees, or SOP excerpts included.
Partnership/certification depth: Oracle partnership level and count of EBS (not Cloud) certifications are not quantified',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ITC - R - 7: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ITC - R - 11
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      NULL,
      'NOTATION: Defines monthly and quarterly reporting fully aligned to governance (weekly ops implied via “last day stats” and incident dashboards; monthly service availability, volumes, breakdowns, avg response/resolution, backlog/closure rates, CSAT, SLA/KPI compliance and breaches, risks; quarterly trends, recurring issues, actions taken/planned).
Complete KPI catalogue: Commits to all RFP KPIs and provides sample dashboard visuals (Resolution/Response SLA metrics, “L1 EU Overall Last Day Stats,” monthly/quarterly packs)
Reporting automation: States SLAs/reports/dashboards will be configured in Accor’s ServiceNow during transition; references an AI/observability platform with SLA reporting dashboards and business metrics alignment to optimize reporting.


Gaps/Risks:
NO explicit mention of SLA report coming from Accor''s Service Now only',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 11'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ITC'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = NULL,
      manual_comment = 'NOTATION: Defines monthly and quarterly reporting fully aligned to governance (weekly ops implied via “last day stats” and incident dashboards; monthly service availability, volumes, breakdowns, avg response/resolution, backlog/closure rates, CSAT, SLA/KPI compliance and breaches, risks; quarterly trends, recurring issues, actions taken/planned).
Complete KPI catalogue: Commits to all RFP KPIs and provides sample dashboard visuals (Resolution/Response SLA metrics, “L1 EU Overall Last Day Stats,” monthly/quarterly packs)
Reporting automation: States SLAs/reports/dashboards will be configured in Accor’s ServiceNow during transition; references an AI/observability platform with SLA reporting dashboards and business metrics alignment to optimize reporting.


Gaps/Risks:
NO explicit mention of SLA report coming from Accor''s Service Now only',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ITC - R - 11: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ITC - R - 8
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      NULL,
      'NOTATION: Retention approach: Mentions continuous improvement, cross-skilling, embedded SME champions, and career/learning programs to boost tenure and quality. Risk register addresses attrition with mitigation (incentives, backups, accelerated shadow/on-the-job training).
Leadership continuity: Proposes an on-site bilingual SDM for 3 years and an on-site Finance Lead for 1 year (then transitioned offshore), supporting proximity and knowledge retention early in the engagement.

Gaps/Risks:
Turnover rate: No historical or target turnover rates provided for L1/L1.5 by hub
Staffing composition: No breakdown of employees vs subcontractors/freelancers or a cap on subcontractor usage for steady state.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 8'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ITC'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = NULL,
      manual_comment = 'NOTATION: Retention approach: Mentions continuous improvement, cross-skilling, embedded SME champions, and career/learning programs to boost tenure and quality. Risk register addresses attrition with mitigation (incentives, backups, accelerated shadow/on-the-job training).
Leadership continuity: Proposes an on-site bilingual SDM for 3 years and an on-site Finance Lead for 1 year (then transitioned offshore), supporting proximity and knowledge retention early in the engagement.

Gaps/Risks:
Turnover rate: No historical or target turnover rates provided for L1/L1.5 by hub
Staffing composition: No breakdown of employees vs subcontractors/freelancers or a cap on subcontractor usage for steady state.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ITC - R - 8: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ITC - R - 9
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      NULL,
      'NOTATION: The proposal names both key roles: an on‑site Service Delivery Manager and an Account Manager. An on‑site Oracle Finance Lead (French/English, 1 year) supports functional oversight.
A structured governance model is defined with daily operational stand‑ups (incl. daily closing-period calls), weekly reviews, monthly SLA/KPI reviews, and quarterly steering committees. Escalation is indicated in the governance diagrams; a Transition Management Office (TMO) is set up with a communication and escalation matrix during transition. Monthly and quarterly reporting packs are specified (SLA/KPI, risks/issues, CSAT, trends).

Gaps/Risks:
Limited detail on scopes: The specific responsibilities of the Account Manager, SDM and Oracle Finance Lead are not enumerated 
Reporting lines and org chart: No single organizational chart with reporting lines for AM/SDM, team leads, and escalation paths in run mode.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 9'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ITC'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = NULL,
      manual_comment = 'NOTATION: The proposal names both key roles: an on‑site Service Delivery Manager and an Account Manager. An on‑site Oracle Finance Lead (French/English, 1 year) supports functional oversight.
A structured governance model is defined with daily operational stand‑ups (incl. daily closing-period calls), weekly reviews, monthly SLA/KPI reviews, and quarterly steering committees. Escalation is indicated in the governance diagrams; a Transition Management Office (TMO) is set up with a communication and escalation matrix during transition. Monthly and quarterly reporting packs are specified (SLA/KPI, risks/issues, CSAT, trends).

Gaps/Risks:
Limited detail on scopes: The specific responsibilities of the Account Manager, SDM and Oracle Finance Lead are not enumerated 
Reporting lines and org chart: No single organizational chart with reporting lines for AM/SDM, team leads, and escalation paths in run mode.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ITC - R - 9: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ITC - R - 10
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      NULL,
      'NOTATION: ITC defines all required forums with purpose, participants, and frequency
Participants identified from both sides: Accor and ITC 
Reporting deliverables defined: Monthly (service availability, volumes, breakdowns, avg response/resolution, backlog/closure, CSAT, SLA/KPI compliance, risks/issues) and Quarterly (trends, recurring issues, user satisfaction, improvement actions). Sample dashboards included.
Escalation/communication processes: Transition Management Office (TMO) with communication plan and escalation matrix; governance layers with explicit escalation paths.


Gaps/Risks:
Missing  finalized RACI matrix for the Run phase (not only transition), covering ticket triage/dispatcher, L1→L1.5/L2 escalation, reporting ownership, and committee deliverables',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 10'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ITC'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = NULL,
      manual_comment = 'NOTATION: ITC defines all required forums with purpose, participants, and frequency
Participants identified from both sides: Accor and ITC 
Reporting deliverables defined: Monthly (service availability, volumes, breakdowns, avg response/resolution, backlog/closure, CSAT, SLA/KPI compliance, risks/issues) and Quarterly (trends, recurring issues, user satisfaction, improvement actions). Sample dashboards included.
Escalation/communication processes: Transition Management Office (TMO) with communication plan and escalation matrix; governance layers with explicit escalation paths.


Gaps/Risks:
Missing  finalized RACI matrix for the Run phase (not only transition), covering ticket triage/dispatcher, L1→L1.5/L2 escalation, reporting ownership, and committee deliverables',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ITC - R - 10: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ITC - R - 13
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      NULL,
      'NOTATION: Defines a full KPI catalog and cadence covering incident recurrence rate, proactive ticket creation, FCR, automation/self-resolution rate, backlog evolution, average age of open tickets, CSAT; monthly/quarterly reports and dashboards provided. An AI “observability” platform plus ServiceNow dashboards support ongoing analysis.
Actions on recurrence: Uses the RRS (Runner/Repeater/Stranger) framework and SOP/KEDB to standardize fixes, deflect tickets, and automate repeatables; includes concrete CSI use cases (contextual help, self-heal flows) and quarterly “Accor Academy” for cross-skilling.
Process inefficiencies: Roadmap targets progressive manual-effort reduction (−30% Q1’26, −50% Q4’26, −60% Q1’27, −70% Q1’28) via automation (workflow approvals, validations, auto-triage) and operating-model refinements; governance reviews “recurring issues” and “improvement actions taken/planned.”


Gaps/Risk
Some automation appears budgeted as “Technology – Fund the Transformation” lines, implying certain gains depend on extra funding—clarify which CSI is base vs. funded.
Commiments on workload reduction need to be supported by details, ITC must provide its underlying assumptions in order to assess the realism of its engagement',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 13'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ITC'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = NULL,
      manual_comment = 'NOTATION: Defines a full KPI catalog and cadence covering incident recurrence rate, proactive ticket creation, FCR, automation/self-resolution rate, backlog evolution, average age of open tickets, CSAT; monthly/quarterly reports and dashboards provided. An AI “observability” platform plus ServiceNow dashboards support ongoing analysis.
Actions on recurrence: Uses the RRS (Runner/Repeater/Stranger) framework and SOP/KEDB to standardize fixes, deflect tickets, and automate repeatables; includes concrete CSI use cases (contextual help, self-heal flows) and quarterly “Accor Academy” for cross-skilling.
Process inefficiencies: Roadmap targets progressive manual-effort reduction (−30% Q1’26, −50% Q4’26, −60% Q1’27, −70% Q1’28) via automation (workflow approvals, validations, auto-triage) and operating-model refinements; governance reviews “recurring issues” and “improvement actions taken/planned.”


Gaps/Risk
Some automation appears budgeted as “Technology – Fund the Transformation” lines, implying certain gains depend on extra funding—clarify which CSI is base vs. funded.
Commiments on workload reduction need to be supported by details, ITC must provide its underlying assumptions in order to assess the realism of its engagement',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ITC - R - 13: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ITC - R - 14
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      NULL,
      'NOTATION: Proposes a Next‑Gen AI platform for observability, knowledge management, GenAI‑assisted resolution, and auto‑triage; embeds an Automation Factory and RRS (Runner/Repeater/Stranger) framework to target repetitive L1/L1.5 work.
Concrete roadmap and targets: Time‑phased plan (discovery → MVP rollout → incremental automations) with quantified manual‑effort reduction goals: −30% by Q1’26, −50% by Q4’26, −60% by Q1’27, −70% by Q1’28.
Use cases with measurable benefits: Lists practical automations (role/transfer access changes, invoice validation, workflow approvals, contextual help, self‑heal flows) with expected impacts (e.g., 40–50% cycle‑time reduction, 25–30% efficiency gains). Includes client REX citing 25–40% ticket reduction, 15–30% faster resolution, 30% cost savings, SLA ≥95%


Gaps/Risks:
Funding model: Commercials include “Technology – Fund the Transformation” (€75k/€50k/€25k), implying some automations need extra budget; unclear which initiatives are base vs. funded.
Tooling specifics, requirement and guardrails: limited details
Benefit pass‑through: No explicit mechanism tying realized gains to pricing reductions and RFP KPI catalogue.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 14'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ITC'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = NULL,
      manual_comment = 'NOTATION: Proposes a Next‑Gen AI platform for observability, knowledge management, GenAI‑assisted resolution, and auto‑triage; embeds an Automation Factory and RRS (Runner/Repeater/Stranger) framework to target repetitive L1/L1.5 work.
Concrete roadmap and targets: Time‑phased plan (discovery → MVP rollout → incremental automations) with quantified manual‑effort reduction goals: −30% by Q1’26, −50% by Q4’26, −60% by Q1’27, −70% by Q1’28.
Use cases with measurable benefits: Lists practical automations (role/transfer access changes, invoice validation, workflow approvals, contextual help, self‑heal flows) with expected impacts (e.g., 40–50% cycle‑time reduction, 25–30% efficiency gains). Includes client REX citing 25–40% ticket reduction, 15–30% faster resolution, 30% cost savings, SLA ≥95%


Gaps/Risks:
Funding model: Commercials include “Technology – Fund the Transformation” (€75k/€50k/€25k), implying some automations need extra budget; unclear which initiatives are base vs. funded.
Tooling specifics, requirement and guardrails: limited details
Benefit pass‑through: No explicit mechanism tying realized gains to pricing reductions and RFP KPI catalogue.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ITC - R - 14: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ITC - R - 18
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      NULL,
      'NOTATION: 
ITC defines all required steps with clear deliverables and acceptance gates for each: Assessment/Planning, Knowledge Transfer, Shadowing, Reverse Shadowing, Handover, and Sign‑off. Milestone tables include concrete artifacts.
3‑month duration respected, a stabilization phase follows but the core transition fits the RFP timeline.
Indicative timelines and resources: A month-by-month plan (M1–M3 for transition), day‑based milestones, and a detailed “time required from Accor stakeholders” grid are provided. 
A risk register with probability/impact heat map, specific risks, and mitigations. Governance includes daily stand‑ups, weekly status, and fortnightly steering during transition, with quality gates.
Transition cost is explicitly priced for 3 months (€232k), with a “50% off to Accor” note (€116k). T

',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 18'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ITC'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = NULL,
      manual_comment = 'NOTATION: 
ITC defines all required steps with clear deliverables and acceptance gates for each: Assessment/Planning, Knowledge Transfer, Shadowing, Reverse Shadowing, Handover, and Sign‑off. Milestone tables include concrete artifacts.
3‑month duration respected, a stabilization phase follows but the core transition fits the RFP timeline.
Indicative timelines and resources: A month-by-month plan (M1–M3 for transition), day‑based milestones, and a detailed “time required from Accor stakeholders” grid are provided. 
A risk register with probability/impact heat map, specific risks, and mitigations. Governance includes daily stand‑ups, weekly status, and fortnightly steering during transition, with quality gates.
Transition cost is explicitly priced for 3 months (€232k), with a “50% off to Accor” note (€116k). T

',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ITC - R - 18: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ITC - R - 19
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      NULL,
      'NOTATION: A dedicated risk register with probability/impact heat map is presented, plus concrete risks and mitigations. Mitigations include incentives/backup resources, accelerated shadowing/on‑the‑job training, creation of missing docs, early onboarding/access planning, and observability to detect anomalies early.
Practical fallbacks are described.
 Transition Management Office with daily stand‑ups, weekly status reviews, fortnightly steering; quality gates/entry‑exit criteria per phase; playback sessions with scoring; RAID log reviewed weekly and critical risks escalated to steering.


Gaps/Risks:
No named Transition Risk Manager 
Risk register template/fields not shown (owners, triggers, due dates) beyond examples.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 19'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ITC'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = NULL,
      manual_comment = 'NOTATION: A dedicated risk register with probability/impact heat map is presented, plus concrete risks and mitigations. Mitigations include incentives/backup resources, accelerated shadowing/on‑the‑job training, creation of missing docs, early onboarding/access planning, and observability to detect anomalies early.
Practical fallbacks are described.
 Transition Management Office with daily stand‑ups, weekly status reviews, fortnightly steering; quality gates/entry‑exit criteria per phase; playback sessions with scoring; RAID log reviewed weekly and critical risks escalated to steering.


Gaps/Risks:
No named Transition Risk Manager 
Risk register template/fields not shown (owners, triggers, due dates) beyond examples.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ITC - R - 19: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ITC - R - 20
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      NULL,
      'NOTATION: The proposal includes a “Reversibility Methodology” slide but provides no substantive detail on phases, activities, roles, deliverables, acceptance criteria, or governance cadence. It does not describe knowledge transfer scope, reverse shadowing, service continuity, or handover acceptance.
No explicit commitment to a reversibility period “up to six (6) months,” and no reversibility pricing is provided. 
Obligations during exit: No statement regarding SLAs/KPIs (and associated credits) applicabimity during reversibility. 

Gaps/Risks:
Missing plan detail (scope, timeline, RACI, staffing ramp-down, knowledge transfer/KT plan to incoming team).
No acceptance checklist or success criteria; no risk/contingency playbooks for exit.
No clarity on continuity during reversibility (service coverage, roles, SLAs) and cost',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 20'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ITC'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = NULL,
      manual_comment = 'NOTATION: The proposal includes a “Reversibility Methodology” slide but provides no substantive detail on phases, activities, roles, deliverables, acceptance criteria, or governance cadence. It does not describe knowledge transfer scope, reverse shadowing, service continuity, or handover acceptance.
No explicit commitment to a reversibility period “up to six (6) months,” and no reversibility pricing is provided. 
Obligations during exit: No statement regarding SLAs/KPIs (and associated credits) applicabimity during reversibility. 

Gaps/Risks:
Missing plan detail (scope, timeline, RACI, staffing ramp-down, knowledge transfer/KT plan to incoming team).
No acceptance checklist or success criteria; no risk/contingency playbooks for exit.
No clarity on continuity during reversibility (service coverage, roles, SLAs) and cost',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ITC - R - 20: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ITC - R - 21
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      NULL,
      'NOTATION: Clear fixed-price model in EUR with stepped reductions Y1→Y3, showing intent to pass productivity gains. Transition priced and discounted (50%).
High-level split by location and a separate “Technology – Fund the Transformation” line (tools/automation) but could have provided more details 
A ±10% “Baseline Benchmarking” clause triggers “workload impact analysis and commercial adjustment,” which limits elasticity and can introduce change orders for normal peaks. 
No explicit Year‑1 pricing review/true‑up tied to actual volumes, KPI outcomes, or realized productivity gains.


Gaps/Risks:
The ±10% clause implies commercial adjustments for volume swings—to be realigned on a ticket-based baseline
Year‑1 review: No formal end-of-year true‑up linked to observed activity/KPIs/productivity.
No detailed cost breakdown for HR by role/site, service management overhead, training, KB maintenance, or reporting automation.
Service credit cap set at 10% may undercut RFP’s incident penalty model (informational note; handled in SLA requirement).',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 21'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ITC'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = NULL,
      manual_comment = 'NOTATION: Clear fixed-price model in EUR with stepped reductions Y1→Y3, showing intent to pass productivity gains. Transition priced and discounted (50%).
High-level split by location and a separate “Technology – Fund the Transformation” line (tools/automation) but could have provided more details 
A ±10% “Baseline Benchmarking” clause triggers “workload impact analysis and commercial adjustment,” which limits elasticity and can introduce change orders for normal peaks. 
No explicit Year‑1 pricing review/true‑up tied to actual volumes, KPI outcomes, or realized productivity gains.


Gaps/Risks:
The ±10% clause implies commercial adjustments for volume swings—to be realigned on a ticket-based baseline
Year‑1 review: No formal end-of-year true‑up linked to observed activity/KPIs/productivity.
No detailed cost breakdown for HR by role/site, service management overhead, training, KB maintenance, or reporting automation.
Service credit cap set at 10% may undercut RFP’s incident penalty model (informational note; handled in SLA requirement).',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ITC - R - 21: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ITC - R - 22
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      NULL,
      'NOTATION:  ITC presents a clear CSI/automation program (RRS framework, Next‑Gen AI platform, SOP/KEDB, auto‑triage) with a time‑phased roadmap and quantified manual‑effort reduction targets (to be checked, may lack realism)
The 3‑year run fees step down materially (Y1 €1.203m → Y2 €0.733m → Y3 €0.571m), indicating an intent to pass some productivity gains to Accor without scope/SLA changes.
Monthly/quarterly reporting includes automation/self‑resolution rate and “Time Saved Through Continuous Improvement,” plus recurrence, FCR, backlog evolution—allowing documentation of improvements and discussion in committees.

Gaps/Risks:
No explicit, binding mechanism to periodically assess realized gains and translate them into additional price reductions (beyond the pre‑baked step‑downs)
“Technology – Fund the Transformation” budget line suggests some improvements depend on extra funding; pass‑through of benefits if Accor does not fund is unclear.
The ±10% “baseline benchmarking” based on user is unreliable
',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 22'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ITC'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = NULL,
      manual_comment = 'NOTATION:  ITC presents a clear CSI/automation program (RRS framework, Next‑Gen AI platform, SOP/KEDB, auto‑triage) with a time‑phased roadmap and quantified manual‑effort reduction targets (to be checked, may lack realism)
The 3‑year run fees step down materially (Y1 €1.203m → Y2 €0.733m → Y3 €0.571m), indicating an intent to pass some productivity gains to Accor without scope/SLA changes.
Monthly/quarterly reporting includes automation/self‑resolution rate and “Time Saved Through Continuous Improvement,” plus recurrence, FCR, backlog evolution—allowing documentation of improvements and discussion in committees.

Gaps/Risks:
No explicit, binding mechanism to periodically assess realized gains and translate them into additional price reductions (beyond the pre‑baked step‑downs)
“Technology – Fund the Transformation” budget line suggests some improvements depend on extra funding; pass‑through of benefits if Accor does not fund is unclear.
The ±10% “baseline benchmarking” based on user is unreliable
',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ITC - R - 22: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- TCS - R - 1
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      2.5,
      'TCS clearly confirmed it will deliver the full L1 and L1.5 scope but did not fully accounted for non-ticket tasks in the model (which therefore may be understaffed)
Coverage includes closings: Confirms normal hours (08:00–19:00 CET), extended hours (08:00–21:00 CET), and coverage during quarterly/monthly/yearly closures up to 23:59 CET.
Tooling and process alignment: Will operate in Accor’s ServiceNow; commits to comprehensive documentation management aligned with Accor standards and to maintain/update the knowledge base and process documentation.

Gaps/Risks:
No detail on takeover/maintenance of existing RPA/automation used for monitoring/remediation.
Did not account for non-ticket tasks in the operational model and the commercials',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 1'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'TCS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 2.5,
      manual_comment = 'TCS clearly confirmed it will deliver the full L1 and L1.5 scope but did not fully accounted for non-ticket tasks in the model (which therefore may be understaffed)
Coverage includes closings: Confirms normal hours (08:00–19:00 CET), extended hours (08:00–21:00 CET), and coverage during quarterly/monthly/yearly closures up to 23:59 CET.
Tooling and process alignment: Will operate in Accor’s ServiceNow; commits to comprehensive documentation management aligned with Accor standards and to maintain/update the knowledge base and process documentation.

Gaps/Risks:
No detail on takeover/maintenance of existing RPA/automation used for monitoring/remediation.
Did not account for non-ticket tasks in the operational model and the commercials',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing TCS - R - 1: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- TCS - R - 2
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      4,
      'TCS commits to a structured knowledge ecosystem comprising Product docs (system/architecture, user manuals) and Process docs (SOPs, checklists, issue logs, reports). SOPs/KEDB are kept current and used as the BAU single reference.
Documentation will be stored on Accor-managed repositories (SharePoint/Confluence), periodically reviewed and signed off; quick-reference guides/checklists provided; audits and archival policy defined. Escalation paths are embedded in standards/checklists and the escalation matrix.
Existing Accor documentation will be assessed during transition; missing documents will be created; updates and new learnings will be logged in SOPs
“Record & Replay” tool to capture keystroke-level procedures, generate Confluence/Word/HTML artifacts, and mask sensitive data—accelerating creation of step-by-step guides and ensuring consistent formats.


Gaps/Risks:
Ownership clause not explicit: does not clearly state that “all documentation remains the exclusive property of Accor.”
Single source of truth not crystal clear: proposes SharePoint and Confluence
Bilingual content: no explicit commitment to translation ',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 2'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'TCS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 4,
      manual_comment = 'TCS commits to a structured knowledge ecosystem comprising Product docs (system/architecture, user manuals) and Process docs (SOPs, checklists, issue logs, reports). SOPs/KEDB are kept current and used as the BAU single reference.
Documentation will be stored on Accor-managed repositories (SharePoint/Confluence), periodically reviewed and signed off; quick-reference guides/checklists provided; audits and archival policy defined. Escalation paths are embedded in standards/checklists and the escalation matrix.
Existing Accor documentation will be assessed during transition; missing documents will be created; updates and new learnings will be logged in SOPs
“Record & Replay” tool to capture keystroke-level procedures, generate Confluence/Word/HTML artifacts, and mask sensitive data—accelerating creation of step-by-step guides and ensuring consistent formats.


Gaps/Risks:
Ownership clause not explicit: does not clearly state that “all documentation remains the exclusive property of Accor.”
Single source of truth not crystal clear: proposes SharePoint and Confluence
Bilingual content: no explicit commitment to translation ',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing TCS - R - 2: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- TCS - R - 3
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      4,
      'TCS explicitly commits to support Option 1 and Option 2, stating teams will be split into 2–3 shifts to cover normal, extended, and closure periods.
Commits to J+3 and J+4 support up to 23:59 CET, aligned to Accor’s closure calendar and excluding French public holidays.
States confidence to provide services “as per ACCOR’s desired working hours preference,” indicating ability to add extra slots on request. 
Offshore team will work 9‑hour shifts to ensure close overlap with CET.


Gaps/Risks
Staffed vs on-call during closures is not explicit; wording suggests on‑premises/on‑call may carry additional costs.
no explicit statement that SLAs remain unchanged during closures/extended hours.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 3'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'TCS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 4,
      manual_comment = 'TCS explicitly commits to support Option 1 and Option 2, stating teams will be split into 2–3 shifts to cover normal, extended, and closure periods.
Commits to J+3 and J+4 support up to 23:59 CET, aligned to Accor’s closure calendar and excluding French public holidays.
States confidence to provide services “as per ACCOR’s desired working hours preference,” indicating ability to add extra slots on request. 
Offshore team will work 9‑hour shifts to ensure close overlap with CET.


Gaps/Risks
Staffed vs on-call during closures is not explicit; wording suggests on‑premises/on‑call may carry additional costs.
no explicit statement that SLAs remain unchanged during closures/extended hours.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing TCS - R - 3: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- TCS - R - 4
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'TCS states Scenario 1 with L1 in English and L1.5 in French (onboarding French-speaking associates onsite in France) and a gradual “Service and Language Transition” (estimated 12 months). Scenario 2 intent is clear: translate all documentation to English during transition and hand over to offshore team, moving to English delivery.
Commits to having French L1.5 resources onsite, handling direct interactions (voice/chat/ServiceNow). Plans bilingual document translation/review/sign-off in transition to support consistent English delivery later. Can maitain a French-speaking pool after transition to full english
Recruitment due diligence for English and French proficiency; confirms broad experience delivering L1/L1.5/L2 in FR/EN across clients; can tap global pool for additional languages if needed.


Gaps/Risks:
No formal proficiency/QA framework (e.g., CEFR targets, testing cadence, language-specific QA/CSAT).
No staffing matrix showing French L1.5 coverage across extended hours and J+3/J+4; offshore assumption notes only up to 10% of offshore L1 with primary French skill (risk if extended FR coverage is needed).',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 4'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'TCS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'TCS states Scenario 1 with L1 in English and L1.5 in French (onboarding French-speaking associates onsite in France) and a gradual “Service and Language Transition” (estimated 12 months). Scenario 2 intent is clear: translate all documentation to English during transition and hand over to offshore team, moving to English delivery.
Commits to having French L1.5 resources onsite, handling direct interactions (voice/chat/ServiceNow). Plans bilingual document translation/review/sign-off in transition to support consistent English delivery later. Can maitain a French-speaking pool after transition to full english
Recruitment due diligence for English and French proficiency; confirms broad experience delivering L1/L1.5/L2 in FR/EN across clients; can tap global pool for additional languages if needed.


Gaps/Risks:
No formal proficiency/QA framework (e.g., CEFR targets, testing cadence, language-specific QA/CSAT).
No staffing matrix showing French L1.5 coverage across extended hours and J+3/J+4; offshore assumption notes only up to 10% of offshore L1 with primary French skill (risk if extended FR coverage is needed).',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing TCS - R - 4: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- TCS - R - 5
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'TCS proposes an offshore-led model supported by a local governance layer in France. During Scenario 1, a portion of the L1.5 team will be located in France to provide French language coverage; steady state shifts to offshore. They also present the GNDM network (EU/LATAM/NA hubs) they can leverage.
Confirms ability to operate both Option 1 and Option 2, splitting teams into 2–3 shifts and overlapping CET with 9‑hour offshore shifts. Commits to J+3/J+4 support until 23:59 CET.
Explicitly addresses Scenario 1 (L1 EN, L1.5 FR onsite) and Scenario 2 (both EN, documentation translated to English during transition).
Details L1/L1.5/L2 layers, SOP/KEDB shift‑left, ServiceNow operations, COE support, automation/ARE framework, reporting and governance (weekly/monthly/quarterly + daily during closings).


Gaps/Risks:
Mentions on‑premises/on‑call support “will cost additionally,” and extra charges for support beyond coverage windows/holidays—this could undermine embedded coverage expectations.
Does not explicitly acknowledge Accor’s right to indicate location preferences or commit to adapting the delivery footprint (e.g., adding an EMEA nearshore site).
Dispatcher/triage role details  not addressed',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 5'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'TCS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'TCS proposes an offshore-led model supported by a local governance layer in France. During Scenario 1, a portion of the L1.5 team will be located in France to provide French language coverage; steady state shifts to offshore. They also present the GNDM network (EU/LATAM/NA hubs) they can leverage.
Confirms ability to operate both Option 1 and Option 2, splitting teams into 2–3 shifts and overlapping CET with 9‑hour offshore shifts. Commits to J+3/J+4 support until 23:59 CET.
Explicitly addresses Scenario 1 (L1 EN, L1.5 FR onsite) and Scenario 2 (both EN, documentation translated to English during transition).
Details L1/L1.5/L2 layers, SOP/KEDB shift‑left, ServiceNow operations, COE support, automation/ARE framework, reporting and governance (weekly/monthly/quarterly + daily during closings).


Gaps/Risks:
Mentions on‑premises/on‑call support “will cost additionally,” and extra charges for support beyond coverage windows/holidays—this could undermine embedded coverage expectations.
Does not explicitly acknowledge Accor’s right to indicate location preferences or commit to adapting the delivery footprint (e.g., adding an EMEA nearshore site).
Dispatcher/triage role details  not addressed',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing TCS - R - 5: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- TCS - R - 6
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'TCS details a Core–Extended–Flex staffing construct backed by a central Resource Management Group (RMG) and quarterly demand/capacity planning. They commit to ramp up/down via a flex pool, cross-skilling, skill-matrix reviews, succession plans, and can source additional talent through partners. They also outline peak/holiday/PTO handling and succession/backups.
Confirms staffed split shifts to cover Option 1/2 windows and closure support to 23:59 CET (J+3/J+4). In pricing assumptions, closure-period support is indicated as “TCS investment,”
The model explicitly leverages a flex team and shared pools aligned to core teams to absorb short-term surges.

Gaps/Risks:
Cost neutrality not explicit: The coverage section states on‑premises/on‑call support “will cost additionally”
Unquantified scalability: No concrete bench size (% of team), FR/EN mix, or maximum burst capacity. The core‑flex description remains qualitative, and reliance on “advance notification” and “external sourcing” introduces lead‑time risk.
The fixed‑price model with embedded productivity gains is presented, but there’s no clear tie between the elasticity mechanisms and pricing (e.g., which surges are absorbed vs. what triggers a price review).',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 6'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'TCS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'TCS details a Core–Extended–Flex staffing construct backed by a central Resource Management Group (RMG) and quarterly demand/capacity planning. They commit to ramp up/down via a flex pool, cross-skilling, skill-matrix reviews, succession plans, and can source additional talent through partners. They also outline peak/holiday/PTO handling and succession/backups.
Confirms staffed split shifts to cover Option 1/2 windows and closure support to 23:59 CET (J+3/J+4). In pricing assumptions, closure-period support is indicated as “TCS investment,”
The model explicitly leverages a flex team and shared pools aligned to core teams to absorb short-term surges.

Gaps/Risks:
Cost neutrality not explicit: The coverage section states on‑premises/on‑call support “will cost additionally”
Unquantified scalability: No concrete bench size (% of team), FR/EN mix, or maximum burst capacity. The core‑flex description remains qualitative, and reliance on “advance notification” and “external sourcing” introduces lead‑time risk.
The fixed‑price model with embedded productivity gains is presented, but there’s no clear tie between the elasticity mechanisms and pricing (e.g., which surges are absorbed vs. what triggers a price review).',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing TCS - R - 6: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- TCS - R - 7
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      4,
      'TCS explicitly states it provides L1/L1.5/L2 for Oracle EBS R12.2 and commits to Accor’s R12.2.12. They cite 1,400+ Oracle EBS engagements and a large global footprint in Oracle services.
24,500 Oracle ERP consultants overall, with 7,000+ in Oracle EBS; 3,000+ EBS certifications (plus 6,700 cloud implementation certs). 
Strong finance footprint and supporting activities align with Accor’s modules; L1/L1.5 scope is well described
Clear L1→L1.5/L2 layering, shift-left SOP/KEDB approach, ITIL processes and automation/ARE framework (auto-categorization, triage, assignment) demonstrate ability to recognize, classify, and route/resolve per scripts and workflows; explicit functional vs technical differentiation (tech issues: reports/forms/OAF/integration; functional: config/process).
Oracle Global/Continental awards (2024), Gartner/IDC leadership mentions; structured talent development (skill matrices, training) and COE advisory support.

Gaps/Risks:
Per-center staffing specifics not provided: no numbers for EBS consultants assigned to the proposed delivery centers (India/France) nor language mix within those teams.
FTEs sizing may be too light (stated 4 to 6 FTEs)',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 7'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'TCS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 4,
      manual_comment = 'TCS explicitly states it provides L1/L1.5/L2 for Oracle EBS R12.2 and commits to Accor’s R12.2.12. They cite 1,400+ Oracle EBS engagements and a large global footprint in Oracle services.
24,500 Oracle ERP consultants overall, with 7,000+ in Oracle EBS; 3,000+ EBS certifications (plus 6,700 cloud implementation certs). 
Strong finance footprint and supporting activities align with Accor’s modules; L1/L1.5 scope is well described
Clear L1→L1.5/L2 layering, shift-left SOP/KEDB approach, ITIL processes and automation/ARE framework (auto-categorization, triage, assignment) demonstrate ability to recognize, classify, and route/resolve per scripts and workflows; explicit functional vs technical differentiation (tech issues: reports/forms/OAF/integration; functional: config/process).
Oracle Global/Continental awards (2024), Gartner/IDC leadership mentions; structured talent development (skill matrices, training) and COE advisory support.

Gaps/Risks:
Per-center staffing specifics not provided: no numbers for EBS consultants assigned to the proposed delivery centers (India/France) nor language mix within those teams.
FTEs sizing may be too light (stated 4 to 6 FTEs)',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing TCS - R - 7: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- TCS - R - 11
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'TCS defines a clear reporting framework with weekly operational reviews, monthly service status, and quarterly business reviews. They also state support for ad hoc reports.
References SLA compliance, TAT, CSAT, First-Time Accuracy, forecasting/planning, capacity/scheduling, and continuous improvement tracking. Mentions use of automated performance monitoring tools, an SLA Tracker, and a Process Health Monitor Report.
Reporting is embedded in governance layers (operational/tactical/strategic), with escalation mechanisms and action plans.

Gaps/Risks:
The proposal does not include concrete dashboard screenshots. Diagrams of governance are provided, but not actual dashboard examples.
Not all RFP KPIs are explicitly committed. No KPI dictionary (formulas, business-hours clocks, pause rules).
No description of the data pipeline/automation (ServiceNow extraction → data model/BI → dashboards), data quality checks, and access controls.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 11'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'TCS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'TCS defines a clear reporting framework with weekly operational reviews, monthly service status, and quarterly business reviews. They also state support for ad hoc reports.
References SLA compliance, TAT, CSAT, First-Time Accuracy, forecasting/planning, capacity/scheduling, and continuous improvement tracking. Mentions use of automated performance monitoring tools, an SLA Tracker, and a Process Health Monitor Report.
Reporting is embedded in governance layers (operational/tactical/strategic), with escalation mechanisms and action plans.

Gaps/Risks:
The proposal does not include concrete dashboard screenshots. Diagrams of governance are provided, but not actual dashboard examples.
Not all RFP KPIs are explicitly committed. No KPI dictionary (formulas, business-hours clocks, pause rules).
No description of the data pipeline/automation (ServiceNow extraction → data model/BI → dashboards), data quality checks, and access controls.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing TCS - R - 11: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- TCS - R - 8
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      4,
      'Provides a company attrition benchmark (13.8% in 2025) and a quarterly demand/capacity management process to anticipate needs.
Describes a formal Replacement Plan and backup resources for prolonged absences.
Succession planning for key personnel and named backups; cross-skilling and skill-matrix reviews to reduce single points of failure.
Broad corporate programs (learning-to-career linkage via Elevate, contextual mastery, mentoring, compensation benchmarking, internal mobility) and structured talent acquisition and academic pipelines to reduce risk of churn.

Gaps/Risks:
No L1/L1.5 turnover rates by delivery hub (India/France) or targets; 13.8% is an enterprise metric
Staffing composition and any subcontractor cap are not specified; they do note the ability to use local staffing partners.
Onsite leadership continuity: Year 1 onsite SME doubles as SDM, then SDM shifts offshore in Years 2–3, which may reduce proximity and continuity ',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 8'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'TCS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 4,
      manual_comment = 'Provides a company attrition benchmark (13.8% in 2025) and a quarterly demand/capacity management process to anticipate needs.
Describes a formal Replacement Plan and backup resources for prolonged absences.
Succession planning for key personnel and named backups; cross-skilling and skill-matrix reviews to reduce single points of failure.
Broad corporate programs (learning-to-career linkage via Elevate, contextual mastery, mentoring, compensation benchmarking, internal mobility) and structured talent acquisition and academic pipelines to reduce risk of churn.

Gaps/Risks:
No L1/L1.5 turnover rates by delivery hub (India/France) or targets; 13.8% is an enterprise metric
Staffing composition and any subcontractor cap are not specified; they do note the ability to use local staffing partners.
Onsite leadership continuity: Year 1 onsite SME doubles as SDM, then SDM shifts offshore in Years 2–3, which may reduce proximity and continuity ',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing TCS - R - 8: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- TCS - R - 9
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'TCS defines a three‑layer structure with named roles:
Strategic: Client Partner (France) and Engagement Manager own the relationship and financial stewardship.
Tactical: Service Delivery Head/Manager runs operational governance, KPI/SLA measurement, reporting, and CSI.
Operational: Delivery leads and L1/L1.5 teams execute services per SOW/QAP/Security plans.
 
Clear separation of Strategic (AM/Client Partner), Tactical (SDM), and Operational (delivery leads) layers with upward escalation through weekly/monthly/quarterly committees.
Governance, communication, escalation: BAU framework includes Weekly Operational Meetings, Monthly Steering Committees, Quarterly Business Reviews, plus Daily reviews during closing periods; formal escalation path through governance tiers; “Red” report for SLA misses; RCA and corrective actions tracked.


Gaps/Risks:
Proximity continuity:  assumptions indicate Year 1 onsite SME acts as SDM, then SDM shifts offshore (Years 2–3), which may reduce geographical/cultural proximity unless a deputy remains in EMEA.
No named individuals, contact matrix, or escalation SLAs (e.g., executive response times).
No single org chart showing reporting lines .',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 9'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'TCS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'TCS defines a three‑layer structure with named roles:
Strategic: Client Partner (France) and Engagement Manager own the relationship and financial stewardship.
Tactical: Service Delivery Head/Manager runs operational governance, KPI/SLA measurement, reporting, and CSI.
Operational: Delivery leads and L1/L1.5 teams execute services per SOW/QAP/Security plans.
 
Clear separation of Strategic (AM/Client Partner), Tactical (SDM), and Operational (delivery leads) layers with upward escalation through weekly/monthly/quarterly committees.
Governance, communication, escalation: BAU framework includes Weekly Operational Meetings, Monthly Steering Committees, Quarterly Business Reviews, plus Daily reviews during closing periods; formal escalation path through governance tiers; “Red” report for SLA misses; RCA and corrective actions tracked.


Gaps/Risks:
Proximity continuity:  assumptions indicate Year 1 onsite SME acts as SDM, then SDM shifts offshore (Years 2–3), which may reduce geographical/cultural proximity unless a deputy remains in EMEA.
No named individuals, contact matrix, or escalation SLAs (e.g., executive response times).
No single org chart showing reporting lines .',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing TCS - R - 9: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- TCS - R - 10
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      4,
      'TCS explicitly aligns to Accor’s minimum governance with all required forums.
Each forum is described with objectives, attendees, cadence, and deliverables (SLA/KPI dashboards, RCA/CAPA, risk/issue tracking, improvement plans, CSAT).
A tiered escalation path through the governance layers is defined; “Red” reporting for SLA misses, RCA with corrective actions, and proactive stakeholder communication.
Measurement & Reporting Plan (SLA tracker, Process Health Monitor, KPI packs) is embedded in the governance rhythm; processes to update KPIs/SLAs/dashboards (with steering validation) are documented.


Gaps/Risks:
No escalation SLAs (response-time targets) and no named contact/escalation matrix with deputies.
Dashboard/report examples are referenced elsewhere but not attached to the governance section.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 10'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'TCS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 4,
      manual_comment = 'TCS explicitly aligns to Accor’s minimum governance with all required forums.
Each forum is described with objectives, attendees, cadence, and deliverables (SLA/KPI dashboards, RCA/CAPA, risk/issue tracking, improvement plans, CSAT).
A tiered escalation path through the governance layers is defined; “Red” reporting for SLA misses, RCA with corrective actions, and proactive stakeholder communication.
Measurement & Reporting Plan (SLA tracker, Process Health Monitor, KPI packs) is embedded in the governance rhythm; processes to update KPIs/SLAs/dashboards (with steering validation) are documented.


Gaps/Risks:
No escalation SLAs (response-time targets) and no named contact/escalation matrix with deputies.
Dashboard/report examples are referenced elsewhere but not attached to the governance section.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing TCS - R - 10: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- TCS - R - 13
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'TCS describes a formal Continuous Improvement (CI) framework using Lean/Six Sigma/Agile with quarterly project health checks, VOC/CSAT, trend analysis, and governance-embedded reviews. They commit to RCA (DMAIC/DMADV), “Red” reports for deviations, and CAPA tracking. 
Explicit process to classify issues, perform RCA, implement corrective/preventive actions, and update SOP/KEDB (shift‑left). Preventive maintenance, call prevention, regression testing after patches, and problem management are included.
Annual CI roadmap, benchmarking, process re‑engineering, iQMS quality controls, and service optimization/resource optimization called out. CI contributions are part of employee goals to drive participation.


Gaps/Risks:
No quantified outcome targets (e.g., % recurrence reduction, MTTR reduction, FCR uplift) or baseline/measurement method.
Some innovation levers (ARE, automation) depend on later agreement/business case.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 13'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'TCS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'TCS describes a formal Continuous Improvement (CI) framework using Lean/Six Sigma/Agile with quarterly project health checks, VOC/CSAT, trend analysis, and governance-embedded reviews. They commit to RCA (DMAIC/DMADV), “Red” reports for deviations, and CAPA tracking. 
Explicit process to classify issues, perform RCA, implement corrective/preventive actions, and update SOP/KEDB (shift‑left). Preventive maintenance, call prevention, regression testing after patches, and problem management are included.
Annual CI roadmap, benchmarking, process re‑engineering, iQMS quality controls, and service optimization/resource optimization called out. CI contributions are part of employee goals to drive participation.


Gaps/Risks:
No quantified outcome targets (e.g., % recurrence reduction, MTTR reduction, FCR uplift) or baseline/measurement method.
Some innovation levers (ARE, automation) depend on later agreement/business case.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing TCS - R - 13: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- TCS - R - 14
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'TCS describes a clear automation/AI framework (Application Reliability Engineering, “machine-first”) and a shift-left strategy (L1.5 → L1 → L0 → −1) using:
Auto-categorization/triage/assignment, Ticket Creator, Data Quality Bot
Augmented agent features and GenAI Chatbot/Voicebot
ServiceNow AI (Now Assist, subject to licenses) and RPA (e.g., UiPath Maestro mention) for orchestration
Provides a tentative sequence (strengthen KB → deploy GenAI conversational layer → adopt agentic AI and RPA for higher automation), with a focus on multilingual capabilities and 24x7 augmentation.


Gaps/Risks:
Limited concrete, quantified use cases/REX specific to Oracle EBS L1/L1.5 contexts (e.g., % deflection, MTTR/FCR gains) included in the proposal.
AI roadmap is high level; lacks time-bound pilots, milestones, and guardrails (data privacy, model governance, success KPIs).
Several dependencies/assumptions (e.g., ServiceNow Pro Plus licensing, sufficient volumes/datasets) may delay benefits.
No explicit commitment to measurable Year‑1 targets (e.g., automation/self-resolution rate, MTTR reduction) or their tie-in to pricing/productivity pass-through.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 14'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'TCS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'TCS describes a clear automation/AI framework (Application Reliability Engineering, “machine-first”) and a shift-left strategy (L1.5 → L1 → L0 → −1) using:
Auto-categorization/triage/assignment, Ticket Creator, Data Quality Bot
Augmented agent features and GenAI Chatbot/Voicebot
ServiceNow AI (Now Assist, subject to licenses) and RPA (e.g., UiPath Maestro mention) for orchestration
Provides a tentative sequence (strengthen KB → deploy GenAI conversational layer → adopt agentic AI and RPA for higher automation), with a focus on multilingual capabilities and 24x7 augmentation.


Gaps/Risks:
Limited concrete, quantified use cases/REX specific to Oracle EBS L1/L1.5 contexts (e.g., % deflection, MTTR/FCR gains) included in the proposal.
AI roadmap is high level; lacks time-bound pilots, milestones, and guardrails (data privacy, model governance, success KPIs).
Several dependencies/assumptions (e.g., ServiceNow Pro Plus licensing, sufficient volumes/datasets) may delay benefits.
No explicit commitment to measurable Year‑1 targets (e.g., automation/self-resolution rate, MTTR reduction) or their tie-in to pricing/productivity pass-through.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing TCS - R - 14: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- TCS - R - 18
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      4,
      'TCS details all required steps with clear artifacts and gates. Each phase has entry/exit criteria, deliverables, and responsibilities (TCS vs Accor).
Proposes a 12‑week transition timeline (sample plan provided), aligned to the RFP expectation.
Toll‑gate model with Red/Amber/Green criteria, weekly reviews, daily stand‑ups during DD/KT and ramp‑up, plus a defined acceptance checklist. Roles are layered (SDM, KT leads, SMEs), with a Transition Management governance.
Dedicated risk register, inherent and mitigated risks listed (SME availability, access delays, backlog clearance, change management, tool/infrastructure readiness), with mitigation/contingency actions and joint tracking. 
Covers resource onboarding, accreditation, training/bootcamps, access readiness, SOP/KEDB creation/updates, UAT/connectivity tests, volume ramp‑up plan, BCP/DR readiness, and a joint communication/escalation plan.


Gaps/Risks:
Costs: No explicit transition cost breakdown by phase/workstream (only run pricing provided elsewhere).',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 18'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'TCS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 4,
      manual_comment = 'TCS details all required steps with clear artifacts and gates. Each phase has entry/exit criteria, deliverables, and responsibilities (TCS vs Accor).
Proposes a 12‑week transition timeline (sample plan provided), aligned to the RFP expectation.
Toll‑gate model with Red/Amber/Green criteria, weekly reviews, daily stand‑ups during DD/KT and ramp‑up, plus a defined acceptance checklist. Roles are layered (SDM, KT leads, SMEs), with a Transition Management governance.
Dedicated risk register, inherent and mitigated risks listed (SME availability, access delays, backlog clearance, change management, tool/infrastructure readiness), with mitigation/contingency actions and joint tracking. 
Covers resource onboarding, accreditation, training/bootcamps, access readiness, SOP/KEDB creation/updates, UAT/connectivity tests, volume ramp‑up plan, BCP/DR readiness, and a joint communication/escalation plan.


Gaps/Risks:
Costs: No explicit transition cost breakdown by phase/workstream (only run pricing provided elsewhere).',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing TCS - R - 18: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- TCS - R - 19
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      4,
      'TCS provides a comprehensive risk register approach with explicit risk catalogs and mitigations across people, process, technology, tools, infrastructure, and HR. 
Concrete fallbacks are defined (e.g., seed/backup resources, hostile transition option if collaboration is limited, rollback procedures, temporary test environments, BCP/DR activation, compensatory off for critical days, re‑hiring strategies). UAT/connectivity testing and BCP drills are embedded in tollgates.
Robust governance with daily stand‑ups during DD/KT and ramp‑up, weekly risk reviews, fortnightly/monthly steering, RAG tollgates with acceptance criteria, “Red” reports for issues, and RCA/CAPA tracking. A central risk register is maintained and reviewed jointly, with escalation through governance tiers.


Gaps/Risks:
No named Transition Risk Manager 
Risk register template not shown (owners, triggers, due dates, residual risk scoring).',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 19'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'TCS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 4,
      manual_comment = 'TCS provides a comprehensive risk register approach with explicit risk catalogs and mitigations across people, process, technology, tools, infrastructure, and HR. 
Concrete fallbacks are defined (e.g., seed/backup resources, hostile transition option if collaboration is limited, rollback procedures, temporary test environments, BCP/DR activation, compensatory off for critical days, re‑hiring strategies). UAT/connectivity testing and BCP drills are embedded in tollgates.
Robust governance with daily stand‑ups during DD/KT and ramp‑up, weekly risk reviews, fortnightly/monthly steering, RAG tollgates with acceptance criteria, “Red” reports for issues, and RCA/CAPA tracking. A central risk register is maintained and reviewed jointly, with escalation through governance tiers.


Gaps/Risks:
No named Transition Risk Manager 
Risk register template not shown (owners, triggers, due dates, residual risk scoring).',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing TCS - R - 19: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- TCS - R - 20
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'TCS provides a comprehensive reverse transition framework with clear stages and activities: Planning & Resourcing (stage I), Knowledge Transfer to the recipient (stage II), and Service Delivery Support/hand‑holding (stage III). It includes deliverables such as transition out plan, RACI, training plan, knowledge repository, operations manuals, process maps, ramp‑up plan, and a service transfer out checklist.
Explicitly commits to a reversibility period “up to six (6) months,” with an indicative timeline (sample 90 days) and the option to adjust based on actual needs.
Details data/asset handover, knowledge transfer, co‑operation/access for the incoming provider, BCP/DR continuity, and destruction/erasure of customer data/software assets post handover (upon request). Provides a high‑level timeline and responsibilities matrix for each phase.


Gaps/Risks:
Pricing not provided: “Costs will be proposed at required times” and/or “as per SOW rates”; no firm, itemized reverse transition budget by workstream/role/FTE.
SLA applicability during reversibility is not explicitly confirmed 
Acceptance criteria/checklists are referenced but not exhaustively enumerated; success criteria for completion are high level.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 20'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'TCS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'TCS provides a comprehensive reverse transition framework with clear stages and activities: Planning & Resourcing (stage I), Knowledge Transfer to the recipient (stage II), and Service Delivery Support/hand‑holding (stage III). It includes deliverables such as transition out plan, RACI, training plan, knowledge repository, operations manuals, process maps, ramp‑up plan, and a service transfer out checklist.
Explicitly commits to a reversibility period “up to six (6) months,” with an indicative timeline (sample 90 days) and the option to adjust based on actual needs.
Details data/asset handover, knowledge transfer, co‑operation/access for the incoming provider, BCP/DR continuity, and destruction/erasure of customer data/software assets post handover (upon request). Provides a high‑level timeline and responsibilities matrix for each phase.


Gaps/Risks:
Pricing not provided: “Costs will be proposed at required times” and/or “as per SOW rates”; no firm, itemized reverse transition budget by workstream/role/FTE.
SLA applicability during reversibility is not explicitly confirmed 
Acceptance criteria/checklists are referenced but not exhaustively enumerated; success criteria for completion are high level.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing TCS - R - 20: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- TCS - R - 21
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'Provides clear fixed-price options in EUR for both coverage windows  with embedded step-downs for Year 2 (−12%) and Year 3 (−16%) to reflect planned productivity gains. Includes non‑ticketing activities (KEDB, release/patch testing, monitoring, month/year‑end support).
Conceptually supports scalability through the Core–Flex model, but pricing itself is fixed and based on assumed annual ticket volumes (e.g., L1 escalated ~2,167; L1.5/L2 ~588). A formal mechanism for absorbing peak volumes cost‑neutrally is not explicitly stated in pricing; some assumptions note additional charges for support beyond contracted windows.
Provides pricing criteria/assumptions (offshore/onshore mix, infra, management fees), but does not present a granular bill of materials separating human resources (by role/site), service management overhead, tools, training, knowledge base maintenance, or reporting automation.
States the model will be reviewed after Year 1 and adjusted based on actual volumes/resolution effort.
Pricing is not explicitly differentiated by region beyond France governance + India delivery


Gaps/Risks:
Transition not priced
Elasticity in pricing unclear: how normal peaks (month‑end/J+3–J+4) are absorbed cost‑neutrally; assumptions mention extra charges beyond windows/weekends/holidays.
No KPI-tied price-performance mechanism in Year 1 (only generic Y2–Y3 reductions).
COLA increase is mentioned elsewhere, which may offset step-downs unless bounded.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 21'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'TCS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'Provides clear fixed-price options in EUR for both coverage windows  with embedded step-downs for Year 2 (−12%) and Year 3 (−16%) to reflect planned productivity gains. Includes non‑ticketing activities (KEDB, release/patch testing, monitoring, month/year‑end support).
Conceptually supports scalability through the Core–Flex model, but pricing itself is fixed and based on assumed annual ticket volumes (e.g., L1 escalated ~2,167; L1.5/L2 ~588). A formal mechanism for absorbing peak volumes cost‑neutrally is not explicitly stated in pricing; some assumptions note additional charges for support beyond contracted windows.
Provides pricing criteria/assumptions (offshore/onshore mix, infra, management fees), but does not present a granular bill of materials separating human resources (by role/site), service management overhead, tools, training, knowledge base maintenance, or reporting automation.
States the model will be reviewed after Year 1 and adjusted based on actual volumes/resolution effort.
Pricing is not explicitly differentiated by region beyond France governance + India delivery


Gaps/Risks:
Transition not priced
Elasticity in pricing unclear: how normal peaks (month‑end/J+3–J+4) are absorbed cost‑neutrally; assumptions mention extra charges beyond windows/weekends/holidays.
No KPI-tied price-performance mechanism in Year 1 (only generic Y2–Y3 reductions).
COLA increase is mentioned elsewhere, which may offset step-downs unless bounded.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing TCS - R - 21: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- TCS - R - 22
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'TCS embeds year-over-year productivity step-downs directly in the fixed-price model (−12% Year 2, −16% Year 3) and commits to a Year‑1 review/adjustment based on actual volumes and resolution effort. 
TCS anchors continuous improvement, automation, and KPI/SLA evolution in weekly/monthly/quarterly governance with RCA/CAPA and dashboard updates, providing the forum to evaluate effects and agree cost consequences jointly.
Proposes an optional Gain Share model once the engagement stabilizes (client-identified gains 100% to Accor; TCS-identified productivity gains shared; transformational initiatives business‑cased), supporting fair/transparent cost evolution tied to realized benefits.


Gaps/Risks:
No binding KPI-to-price formula for the Year‑1 true‑up (e.g., MTTR reduction, FCR uplift, automation/self‑resolution rate, backlog evolution), nor explicit data sources/calculation rules.
COLA increases (mentioned elsewhere) could erode net step‑downs unless bounded.
Gain Share terms are presented conceptually; thresholds, baselines, auditability, and timing are not fixed.
Some automation benefits depend on licensing (e.g., ServiceNow Now Assist Pro Plus) and business-case approvals, which may delay impact.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 22'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'TCS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'TCS embeds year-over-year productivity step-downs directly in the fixed-price model (−12% Year 2, −16% Year 3) and commits to a Year‑1 review/adjustment based on actual volumes and resolution effort. 
TCS anchors continuous improvement, automation, and KPI/SLA evolution in weekly/monthly/quarterly governance with RCA/CAPA and dashboard updates, providing the forum to evaluate effects and agree cost consequences jointly.
Proposes an optional Gain Share model once the engagement stabilizes (client-identified gains 100% to Accor; TCS-identified productivity gains shared; transformational initiatives business‑cased), supporting fair/transparent cost evolution tied to realized benefits.


Gaps/Risks:
No binding KPI-to-price formula for the Year‑1 true‑up (e.g., MTTR reduction, FCR uplift, automation/self‑resolution rate, backlog evolution), nor explicit data sources/calculation rules.
COLA increases (mentioned elsewhere) could erode net step‑downs unless bounded.
Gain Share terms are presented conceptually; thresholds, baselines, auditability, and timing are not fixed.
Some automation benefits depend on licensing (e.g., ServiceNow Now Assist Pro Plus) and business-case approvals, which may delay impact.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing TCS - R - 22: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- CAPGEMINI - R - 1
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      5,
      'Explicit commitment to full L1 and L1.5 scope, including non-ticketed tasks, with remediation actions based on monitoring alerts.
L1.5 list covers functional support, module closure support, RPA monitoring, administrative tasks, minor enhancements, and documentation/governance—demonstrating understanding of Accor’s run needs.
Continuity model: Bilingual support transitioning to English-only, rightshore (India/Morocco) footprint to ensure resilience and language coverage.
Governance/CSI: Commits to joint governance against SLAs/KPIs and continuous improvement/automation.
Directly addresses the requirement to cover all run activities, including those not tracked in ITSM, closure-period support and remediation from monitoring alerts.

Gaps/Risks:
“Execution of custom developments” is mentioned under L1.5; evolutive maintenance/L2 dev is out of scope, should be clarified to avoid scope creep.
',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 1'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'CAPGEMINI'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 5,
      manual_comment = 'Explicit commitment to full L1 and L1.5 scope, including non-ticketed tasks, with remediation actions based on monitoring alerts.
L1.5 list covers functional support, module closure support, RPA monitoring, administrative tasks, minor enhancements, and documentation/governance—demonstrating understanding of Accor’s run needs.
Continuity model: Bilingual support transitioning to English-only, rightshore (India/Morocco) footprint to ensure resilience and language coverage.
Governance/CSI: Commits to joint governance against SLAs/KPIs and continuous improvement/automation.
Directly addresses the requirement to cover all run activities, including those not tracked in ITSM, closure-period support and remediation from monitoring alerts.

Gaps/Risks:
“Execution of custom developments” is mentioned under L1.5; evolutive maintenance/L2 dev is out of scope, should be clarified to avoid scope creep.
',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing CAPGEMINI - R - 1: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- CAPGEMINI - R - 2
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'Commits to build and maintain a knowledge referential during transition and run, “relying on Accor tooling” to store/share onboarding and reference documentation.  KT sessions recording for future onboarding and knowledge retention
Proposes GenAI accelerators (AOD generation, document summarization, KT assessment) to standardize and speed content creation.
Plans include Application Overview Documents (AOD), procedure-oriented SOPs for incident/SR handling, onboarding materials/training & quizzes, and a skill matrix; they also commit to gather missing material and enrich the existing base during transition.

Gaps/Risks:
Accor ownership & standards not explicit: no clear statement that documentation remains Accor’s exclusive property 
KB single source of truth not defined: “Rely on Accor tooling” is vague
Update SLAs and cadence: “Best effort” phrasing and allowance to complete updates after transition conflict with the RFP’s requirement to review/validate/update during transition; no periodic freshness audits.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 2'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'CAPGEMINI'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'Commits to build and maintain a knowledge referential during transition and run, “relying on Accor tooling” to store/share onboarding and reference documentation.  KT sessions recording for future onboarding and knowledge retention
Proposes GenAI accelerators (AOD generation, document summarization, KT assessment) to standardize and speed content creation.
Plans include Application Overview Documents (AOD), procedure-oriented SOPs for incident/SR handling, onboarding materials/training & quizzes, and a skill matrix; they also commit to gather missing material and enrich the existing base during transition.

Gaps/Risks:
Accor ownership & standards not explicit: no clear statement that documentation remains Accor’s exclusive property 
KB single source of truth not defined: “Rely on Accor tooling” is vague
Update SLAs and cadence: “Best effort” phrasing and allowance to complete updates after transition conflict with the RFP’s requirement to review/validate/update during transition; no periodic freshness audits.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing CAPGEMINI - R - 2: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- CAPGEMINI - R - 3
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'Capgemini supports both Option 1 and Option 2. They provide clear shift diagrams showing CET coverage, with India dual shifts and Morocco nearshore for French L1.5.
Flexibility: Rightshore model (India + Morocco) with scalable capacity and dual shifts aligns to CET windows; indicates willingness to align locations to Accor preference.

Gaps/Risks:
Plan shows “L1.5 mandatory closure on‑call support for P1 (English).”  to be clarified
No explicit commitment that extra slots can be added on Accor request.
Staffing transparency: No staffing matrix (min seats, FR/EN mix) for each window and for J+3/J+4',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 3'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'CAPGEMINI'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'Capgemini supports both Option 1 and Option 2. They provide clear shift diagrams showing CET coverage, with India dual shifts and Morocco nearshore for French L1.5.
Flexibility: Rightshore model (India + Morocco) with scalable capacity and dual shifts aligns to CET windows; indicates willingness to align locations to Accor preference.

Gaps/Risks:
Plan shows “L1.5 mandatory closure on‑call support for P1 (English).”  to be clarified
No explicit commitment that extra slots can be added on Accor request.
Staffing transparency: No staffing matrix (min seats, FR/EN mix) for each window and for J+3/J+4',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing CAPGEMINI - R - 3: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- CAPGEMINI - R - 4
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'Alignment to the two scenarios:
Scenario 1: States L1 in English and L1.5 in French/English, with a nearshore L1.5 team in Morocco to handle French interactions; India team supports in English.
Scenario 2: Plans a gradual move to English-first after Year 1; partial French translation support retained as needed.
Provides a language transition strategy with dedicated translators, use of DeepL Voice and Systran, and Morocco bilingual team during stabilization.
Mentions certifications (B2/C1/C2) for translators, cultural sensitization/training, and a skill matrix and onboarding/training quizzes.


Gaps/Risks:
Scenario 1 requirement is that L1.5 resources themselves have spoken/written French. The proposal relies partly on India L1.5 supported by translators/tools
Closure period plan shows “L1.5 on-call support for P1 (English),” 
No formal proficiency framework for support agents (e.g., CEFR targets for L1.5 FR C1, test methods, re-testing cadence, language-specific QA/CSAT).',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 4'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'CAPGEMINI'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'Alignment to the two scenarios:
Scenario 1: States L1 in English and L1.5 in French/English, with a nearshore L1.5 team in Morocco to handle French interactions; India team supports in English.
Scenario 2: Plans a gradual move to English-first after Year 1; partial French translation support retained as needed.
Provides a language transition strategy with dedicated translators, use of DeepL Voice and Systran, and Morocco bilingual team during stabilization.
Mentions certifications (B2/C1/C2) for translators, cultural sensitization/training, and a skill matrix and onboarding/training quizzes.


Gaps/Risks:
Scenario 1 requirement is that L1.5 resources themselves have spoken/written French. The proposal relies partly on India L1.5 supported by translators/tools
Closure period plan shows “L1.5 on-call support for P1 (English),” 
No formal proficiency framework for support agents (e.g., CEFR targets for L1.5 FR C1, test methods, re-testing cadence, language-specific QA/CSAT).',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing CAPGEMINI - R - 4: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- CAPGEMINI - R - 5
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'Rightshore footprint: India (Mumbai/Bengaluru) as the industrialized hub for L1 and English L1.5; Morocco (Rabat/Casablanca) nearshore for French L1.5
Provide detailed shift maps for both Option 1 and  2, including closure  up to 23:59 CET and dual shifts in India; Morocco supports French hours.
Scenario 1: L1 in English; L1.5 in French (Morocco) and English (India) with translators/tools (DeepL/Systran). Scenario 2: gradual shift to English-first after Year 1;
Alignment with operations: L1 industrialized (SOP-based), mutualized techno-functional L1.5 by module; governance, knowledge management, risk management, and reporting are described.
Capgemini could not provide detailed information regarding the number of FTEs; "between 10 and 14 during Y1" and mentionned a gradual team reduction the following years based on workload reduction (thanks to automation)


Gaps/Risks:
Closure-period L1.5 is shown as “on‑call P1 (English)” rather than staffed French L1.5 + few details on the number of staffed FTEs
Translator reliance for India L1.5 in Scenario 1 could conflict with “spoken and written French is mandatory” for L1.5 resources.
Scalability lead-times are long (ramp-up 8–10 weeks; ramp-down 6–8 weeks), which weakens claims of dynamic elasticity ',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 5'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'CAPGEMINI'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'Rightshore footprint: India (Mumbai/Bengaluru) as the industrialized hub for L1 and English L1.5; Morocco (Rabat/Casablanca) nearshore for French L1.5
Provide detailed shift maps for both Option 1 and  2, including closure  up to 23:59 CET and dual shifts in India; Morocco supports French hours.
Scenario 1: L1 in English; L1.5 in French (Morocco) and English (India) with translators/tools (DeepL/Systran). Scenario 2: gradual shift to English-first after Year 1;
Alignment with operations: L1 industrialized (SOP-based), mutualized techno-functional L1.5 by module; governance, knowledge management, risk management, and reporting are described.
Capgemini could not provide detailed information regarding the number of FTEs; "between 10 and 14 during Y1" and mentionned a gradual team reduction the following years based on workload reduction (thanks to automation)


Gaps/Risks:
Closure-period L1.5 is shown as “on‑call P1 (English)” rather than staffed French L1.5 + few details on the number of staffed FTEs
Translator reliance for India L1.5 in Scenario 1 could conflict with “spoken and written French is mandatory” for L1.5 resources.
Scalability lead-times are long (ramp-up 8–10 weeks; ramp-down 6–8 weeks), which weakens claims of dynamic elasticity ',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing CAPGEMINI - R - 5: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- CAPGEMINI - R - 6
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      2,
      'Elasticity model relies on long lead times:  “Core/Flex” model shows ramp-up of 8–10 weeks and ramp-down of 6–8 weeks
Commercial assumptions state “Flexible ramp-up/ramp-down of services will be managed through change management process,” suggesting additional costs or formal changes for extra capacity..
Closure coverage not fully staffed L1.5: The coverage plan shows “L1.5 mandatory closure on-call support for P1 (English)” rather than staffed L1.5 (and French during Scenario 1) through 23:59 CET. On-call only and English-only for closures are risky against SLA and Scenario‑1 language requirements.
No quantified bench: No bench or standby pool size, FR/EN mix, or maximum burst capacity are provided. The shared-resource model is described conceptually but not operationalized.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 6'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'CAPGEMINI'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 2,
      manual_comment = 'Elasticity model relies on long lead times:  “Core/Flex” model shows ramp-up of 8–10 weeks and ramp-down of 6–8 weeks
Commercial assumptions state “Flexible ramp-up/ramp-down of services will be managed through change management process,” suggesting additional costs or formal changes for extra capacity..
Closure coverage not fully staffed L1.5: The coverage plan shows “L1.5 mandatory closure on-call support for P1 (English)” rather than staffed L1.5 (and French during Scenario 1) through 23:59 CET. On-call only and English-only for closures are risky against SLA and Scenario‑1 language requirements.
No quantified bench: No bench or standby pool size, FR/EN mix, or maximum burst capacity are provided. The shared-resource model is described conceptually but not operationalized.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing CAPGEMINI - R - 6: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- CAPGEMINI - R - 7
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      4,
      'Capgemini presents a mature Oracle EBS practice (5,500+ EBS consultants globally, 350+ successful EBS upgrades) and multiple EBS AMS references. Team resumes cite R12/R12.2.x experience, supporting large-scale, multi-geo delivery.
The proposal explicitly covers Accor modules with a note that RI/INV Brazil are currently out of scope per their assumptions, and shows module-aligned techno‑functional L1.5 resources, closure support, and monitoring/admin tasks.
A clear L1/L1.5 operating model with SOP/KEDB, a defined ticket flow (triage, dispatcher, classification), and industrialized L1 procedure-based resolution. Assets like Smart Dispatcher/auto‑triage and IKON (known error DB) reinforce standard workflow execution.
Training/certifications/partnerships: 30 years of Oracle partnership, 11,400+ Oracle practitioners overall, leadership recognitions by analysts, and individual certifications in Oracle EBS/Cloud across the proposed team. Structured KT, skill matrix, and continuous training are outlined.


Gaps/Risks:
Per‑center numbers not provided: No explicit count of EBS consultants in the proposed delivery centers (India/Morocco); Morocco EBS depth not quantified.
Brazil RI/INV in-scope ambiguity:  scope slide lists RI/INV support as out of scope; Accor RFP includes RI (until decommission). Needs alignment.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 7'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'CAPGEMINI'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 4,
      manual_comment = 'Capgemini presents a mature Oracle EBS practice (5,500+ EBS consultants globally, 350+ successful EBS upgrades) and multiple EBS AMS references. Team resumes cite R12/R12.2.x experience, supporting large-scale, multi-geo delivery.
The proposal explicitly covers Accor modules with a note that RI/INV Brazil are currently out of scope per their assumptions, and shows module-aligned techno‑functional L1.5 resources, closure support, and monitoring/admin tasks.
A clear L1/L1.5 operating model with SOP/KEDB, a defined ticket flow (triage, dispatcher, classification), and industrialized L1 procedure-based resolution. Assets like Smart Dispatcher/auto‑triage and IKON (known error DB) reinforce standard workflow execution.
Training/certifications/partnerships: 30 years of Oracle partnership, 11,400+ Oracle practitioners overall, leadership recognitions by analysts, and individual certifications in Oracle EBS/Cloud across the proposed team. Structured KT, skill matrix, and continuous training are outlined.


Gaps/Risks:
Per‑center numbers not provided: No explicit count of EBS consultants in the proposed delivery centers (India/Morocco); Morocco EBS depth not quantified.
Brazil RI/INV in-scope ambiguity:  scope slide lists RI/INV support as out of scope; Accor RFP includes RI (until decommission). Needs alignment.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing CAPGEMINI - R - 7: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- CAPGEMINI - R - 11
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'Capgemini defines a clear governance-led reporting rhythm with SLA/KPI tracking as standard agenda items.
Proposes using its Virtual Visual Management (VVM) dashboarding tool to aggregate data (via APIs/extracts) and produce near real-time SLA/KPI analytics; states alignment with Accor for SLA calculation and integration with ServiceNow.
Reporting is described to cover SLA/KPI performance, risks/issues, escalation outcomes, and continuous improvement themes; they also reference incident mining/analytics in their automation stack to inform reporting.

Gaps/Risks:
No concrete dashboard screenshots or mockups included (the slide describes capabilities but does not show example views).
KPI catalog: Not all RFP KPIs are explicitly committed
Report delivery SLAs and alerting: No commitments like weekly, monthly, quarterly, nor daily SLA-breach alerting.
Data pipeline and governance: Limited detail on automated data flow (ServiceNow → data model/BI)',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 11'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'CAPGEMINI'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'Capgemini defines a clear governance-led reporting rhythm with SLA/KPI tracking as standard agenda items.
Proposes using its Virtual Visual Management (VVM) dashboarding tool to aggregate data (via APIs/extracts) and produce near real-time SLA/KPI analytics; states alignment with Accor for SLA calculation and integration with ServiceNow.
Reporting is described to cover SLA/KPI performance, risks/issues, escalation outcomes, and continuous improvement themes; they also reference incident mining/analytics in their automation stack to inform reporting.

Gaps/Risks:
No concrete dashboard screenshots or mockups included (the slide describes capabilities but does not show example views).
KPI catalog: Not all RFP KPIs are explicitly committed
Report delivery SLAs and alerting: No commitments like weekly, monthly, quarterly, nor daily SLA-breach alerting.
Data pipeline and governance: Limited detail on automated data flow (ServiceNow → data model/BI)',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing CAPGEMINI - R - 11: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- CAPGEMINI - R - 8
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'Retention strategy: CAPG (Care–Affinity–Purpose–Growth) framework with targeted initiatives (learning journeys, quarterly performance/upskilling reviews, retention incentives for key SMEs, rewards/recognition, flexible work, periodic PULSE surveys).
Engagement-level resource planning and career growth mechanisms presented.

Gaps/Risks:
Turnover rate not provided for L1/L1.5 by hub (India/Morocco) 
Staffing composition (employees vs subcontractors/freelancers) not disclosed
An assumption of 8–10 weeks lead time for onboarding/replacements is long and risks continuity.
No explicit sizing of French-capable L1.5 bench to sustain Scenario 1 beyond Morocco core; reliance on translators for India 
Succession plan is referenced but not quantified (named backups, activation timelines).',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 8'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'CAPGEMINI'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'Retention strategy: CAPG (Care–Affinity–Purpose–Growth) framework with targeted initiatives (learning journeys, quarterly performance/upskilling reviews, retention incentives for key SMEs, rewards/recognition, flexible work, periodic PULSE surveys).
Engagement-level resource planning and career growth mechanisms presented.

Gaps/Risks:
Turnover rate not provided for L1/L1.5 by hub (India/Morocco) 
Staffing composition (employees vs subcontractors/freelancers) not disclosed
An assumption of 8–10 weeks lead time for onboarding/replacements is long and risks continuity.
No explicit sizing of French-capable L1.5 bench to sustain Scenario 1 beyond Morocco core; reliance on translators for India 
Succession plan is referenced but not quantified (named backups, activation timelines).',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing CAPGEMINI - R - 8: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- CAPGEMINI - R - 9
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'Account/relationship layer: Client Executive, Delivery Executive, Engagement Manager
Operational layer: Service Delivery Manager, Transition Manager .
Three-tier governance model (Strategic/Tactical/Operational) with an explicit escalation path (resolve → escalate → resolve at each tier).
Onshore presence in France for Client/Delivery/Engagement management; SDM manages services “from offshore service locations,” 
Committees with cadence and participants, additional daily stand‑ups (DSTUM) for operations.
RACI framework provided for governance deliverables; explicit responsibilities per key role; issue escalation via governance tiers

Gaps/Risks:
SDM called out as offshore—mitigated by onshore Client/Delivery/Engagement roles but not explicit for SDM.
Escalation SLAs/contact matrix: No response‑time targets or named escalation contacts/deputies provided.
Named individuals not confirmed (only indicative CVs).',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 9'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'CAPGEMINI'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'Account/relationship layer: Client Executive, Delivery Executive, Engagement Manager
Operational layer: Service Delivery Manager, Transition Manager .
Three-tier governance model (Strategic/Tactical/Operational) with an explicit escalation path (resolve → escalate → resolve at each tier).
Onshore presence in France for Client/Delivery/Engagement management; SDM manages services “from offshore service locations,” 
Committees with cadence and participants, additional daily stand‑ups (DSTUM) for operations.
RACI framework provided for governance deliverables; explicit responsibilities per key role; issue escalation via governance tiers

Gaps/Risks:
SDM called out as offshore—mitigated by onshore Client/Delivery/Engagement roles but not explicit for SDM.
Escalation SLAs/contact matrix: No response‑time targets or named escalation contacts/deputies provided.
Named individuals not confirmed (only indicative CVs).',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing CAPGEMINI - R - 9: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- CAPGEMINI - R - 10
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      4,
      'Capgemini defines all required forums with clear objectives, participants, and frequencies
Three-tier model (Operational/Tactical/Strategic) with an explicit escalation path (resolve → escalate). 
Reporting embedded in governance: SLA/KPI reporting is a standard agenda item; VVM dashboard tooling presented to align calculations and aggregate data from ServiceNow; risk/issue management and continuous improvement are included.
Governance RACI framework is included  for key deliverables, to be refined with Accor during transition.

Gaps/Risks:
No escalation SLAs (response-time targets) or named contact/escalation matrix with deputies and CET availability.
No explicit report delivery SLAs and no sample dashboards attached to the governance section.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 10'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'CAPGEMINI'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 4,
      manual_comment = 'Capgemini defines all required forums with clear objectives, participants, and frequencies
Three-tier model (Operational/Tactical/Strategic) with an explicit escalation path (resolve → escalate). 
Reporting embedded in governance: SLA/KPI reporting is a standard agenda item; VVM dashboard tooling presented to align calculations and aggregate data from ServiceNow; risk/issue management and continuous improvement are included.
Governance RACI framework is included  for key deliverables, to be refined with Accor during transition.

Gaps/Risks:
No escalation SLAs (response-time targets) or named contact/escalation matrix with deputies and CET availability.
No explicit report delivery SLAs and no sample dashboards attached to the governance section.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing CAPGEMINI - R - 10: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- CAPGEMINI - R - 13
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      4,
      '
Embedded KPI/SLA review in weekly/monthly/quarterly governance; daily reviews during closings.
Incident Mining/Smart Analytics, ROOCA (AI‑assisted Root Cause Analysis), observability, and Known Error DB (IKON) to analyze trends and accelerate RCA.
ESOAR framework (Eliminate, Standardize, Optimize, Automate, Robotize) to structure assessments and improvements.
Action plans for recurrent incidents: shift‑left approach with SOP/KEDB updates, auto‑triage, and automation/self‑heal via UiPath/ITPA to remove repeat tickets.
Clear automation roadmap  with identified use cases and expected benefits (e.g., MTTR reduction, 30–50% auto‑resolution in references).
Process optimization via ESOAR; industrialization (ADMnext), standardization, and automation to reduce manual effort (target 24% cumulative productivity gains over 3 years).
Continuous Improvement loop integrated with governance and reporting (VVM dashboards), and problem management.


Gaps/Risks:
CSI register (owners, due dates, success criteria) not provided; user feedback (CSAT/NPS) integration is not detailed.
Some benefits depend on tool approvals (e.g., UiPath, GenAI agents), which could delay impact.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 13'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'CAPGEMINI'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 4,
      manual_comment = '
Embedded KPI/SLA review in weekly/monthly/quarterly governance; daily reviews during closings.
Incident Mining/Smart Analytics, ROOCA (AI‑assisted Root Cause Analysis), observability, and Known Error DB (IKON) to analyze trends and accelerate RCA.
ESOAR framework (Eliminate, Standardize, Optimize, Automate, Robotize) to structure assessments and improvements.
Action plans for recurrent incidents: shift‑left approach with SOP/KEDB updates, auto‑triage, and automation/self‑heal via UiPath/ITPA to remove repeat tickets.
Clear automation roadmap  with identified use cases and expected benefits (e.g., MTTR reduction, 30–50% auto‑resolution in references).
Process optimization via ESOAR; industrialization (ADMnext), standardization, and automation to reduce manual effort (target 24% cumulative productivity gains over 3 years).
Continuous Improvement loop integrated with governance and reporting (VVM dashboards), and problem management.


Gaps/Risks:
CSI register (owners, due dates, success criteria) not provided; user feedback (CSAT/NPS) integration is not detailed.
Some benefits depend on tool approvals (e.g., UiPath, GenAI agents), which could delay impact.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing CAPGEMINI - R - 13: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- CAPGEMINI - R - 14
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'Clear AI/automation strategy and tooling: proposes a structured ESOAR approach  with concrete enablers directly applicable to L1/L1.5: Smart Dispatcher (auto‑triage/routing), IKON, ROOCA, UiPath/ITPA for self‑heal and workflow automation, observability, and VVM analytics.
Time‑phased AI/automation roadmap from foundation (KB/reporting alignment) to shift‑left, enhanced monitoring, and GenAI ADM agents, including dependencies (e.g., ServiceNow, Azure OpenAI, UiPath) and infosec approvals.
Targets a cumulative 24% productivity gain over 3 years. References case studies with quantified outcomes (e.g., 30–50% auto‑resolution on incidents, 27% ticket reduction via proactive problem management, ~50% TAT reduction), demonstrating realized value in similar contexts.
 Uses Incident Mining/Smart Analytics to select high‑impact candidates (access, repetitive SRs), with a catalog of use cases mapped to tools, required data, and expected impacts (e.g., MTTR reduction, deflection, self‑service).

Gaps/Risks:
Benefit realization depends on Accor approvals and tool access (UiPath, GenAI, ServiceNow integrations); assumptions state revised commercials if automation is blocked.
Security/data‑protection guardrails for GenAI (PII handling, model governance) are not detailed.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 14'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'CAPGEMINI'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'Clear AI/automation strategy and tooling: proposes a structured ESOAR approach  with concrete enablers directly applicable to L1/L1.5: Smart Dispatcher (auto‑triage/routing), IKON, ROOCA, UiPath/ITPA for self‑heal and workflow automation, observability, and VVM analytics.
Time‑phased AI/automation roadmap from foundation (KB/reporting alignment) to shift‑left, enhanced monitoring, and GenAI ADM agents, including dependencies (e.g., ServiceNow, Azure OpenAI, UiPath) and infosec approvals.
Targets a cumulative 24% productivity gain over 3 years. References case studies with quantified outcomes (e.g., 30–50% auto‑resolution on incidents, 27% ticket reduction via proactive problem management, ~50% TAT reduction), demonstrating realized value in similar contexts.
 Uses Incident Mining/Smart Analytics to select high‑impact candidates (access, repetitive SRs), with a catalog of use cases mapped to tools, required data, and expected impacts (e.g., MTTR reduction, deflection, self‑service).

Gaps/Risks:
Benefit realization depends on Accor approvals and tool access (UiPath, GenAI, ServiceNow integrations); assumptions state revised commercials if automation is blocked.
Security/data‑protection guardrails for GenAI (PII handling, model governance) are not detailed.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing CAPGEMINI - R - 14: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- CAPGEMINI - R - 18
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      4,
      'Capgemini presents a structured, stream-based transition aligned to Accor’s ask. Acceptance metrics (KT progress, playback, ORA sign‑off) are defined.
An indicative 3‑month transition plan (Nov–Jan) is provided, followed by a 3‑month stabilization phase. Milestones and parallel streams (service initiation, processes, tech & infra, finance & contracts, staffing) are shown.
Dedicated Transition Manager, weekly/tactical and steering cadence, quality gates, RAID management, and a clear risk framework with concrete mitigations (holiday coverage, documentation gaps, access delays, tool setup).
Roles and time expectations for Accor SMEs are listed; KT recordings approved; GenAI aids accelerate documentation quality and speed.

Gaps/Risks:
Cost breakdown by phase: Transition fee is given, but not itemized per phase/workstream
Stabilization penalties: Assumes a 3‑month stabilization with no service penalties
Language during KT: KT assumed primarily in English; Scenario‑1 French needs may require explicit L1.5 French coverage in sessions beyond “minor support” from Morocco.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 18'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'CAPGEMINI'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 4,
      manual_comment = 'Capgemini presents a structured, stream-based transition aligned to Accor’s ask. Acceptance metrics (KT progress, playback, ORA sign‑off) are defined.
An indicative 3‑month transition plan (Nov–Jan) is provided, followed by a 3‑month stabilization phase. Milestones and parallel streams (service initiation, processes, tech & infra, finance & contracts, staffing) are shown.
Dedicated Transition Manager, weekly/tactical and steering cadence, quality gates, RAID management, and a clear risk framework with concrete mitigations (holiday coverage, documentation gaps, access delays, tool setup).
Roles and time expectations for Accor SMEs are listed; KT recordings approved; GenAI aids accelerate documentation quality and speed.

Gaps/Risks:
Cost breakdown by phase: Transition fee is given, but not itemized per phase/workstream
Stabilization penalties: Assumes a 3‑month stabilization with no service penalties
Language during KT: KT assumed primarily in English; Scenario‑1 French needs may require explicit L1.5 French coverage in sessions beyond “minor support” from Morocco.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing CAPGEMINI - R - 18: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- CAPGEMINI - R - 19
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'Capgemini presents a structured transition risk framework with end‑to‑end steps: identification, qualification/mitigation with contingency plans, ongoing monitoring/reporting, periodic review, and risk closure (RAID governance built into the transition methodology).
Concrete risks and mitigations: Identifies key, context‑specific risks and proposed mitigations
Transition Manager role, weekly tactical and steering reviews, quality gates, KT acceptance metrics, and status reporting; RAID tracking with escalation through Operational → Tactical → Strategic forums.

Gaps/Risks:
No named Transition Risk Manager with escalation SLAs (e.g., response times for red risks).
Risk register template not shown (owners, impact/likelihood scoring, RPN/heatmap, triggers, due dates, status).',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 19'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'CAPGEMINI'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'Capgemini presents a structured transition risk framework with end‑to‑end steps: identification, qualification/mitigation with contingency plans, ongoing monitoring/reporting, periodic review, and risk closure (RAID governance built into the transition methodology).
Concrete risks and mitigations: Identifies key, context‑specific risks and proposed mitigations
Transition Manager role, weekly tactical and steering reviews, quality gates, KT acceptance metrics, and status reporting; RAID tracking with escalation through Operational → Tactical → Strategic forums.

Gaps/Risks:
No named Transition Risk Manager with escalation SLAs (e.g., response times for red risks).
Risk register template not shown (owners, impact/likelihood scoring, RPN/heatmap, triggers, due dates, status).',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing CAPGEMINI - R - 19: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- CAPGEMINI - R - 20
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'Capgemini provides a structured reverse transition plan with phases and activities:
Planning and Exit Governance (appoint Exit Transition Manager, align/agree exit plan, staff ramp-down plan).
Knowledge Transfer to Accor/new supplier (assign SMEs, agree KT plans, conduct KT sessions, share documentation).
Technology and Infrastructure (determine data objects/formats, data transfer to new supplier, revoke user IDs/network connections, transfer assets).
Handover/Closedown and Hypercare (formal service handover, reversibility acceptance, post-handover support).
Duration feasibility: The timeline shows Month 1–3 (planning/initial activities) and Month 4–6 (execution), with “Reversibility Acceptance” by Month 6

Gaps/Risks:
Pricing not provided
SLA continuity: No explicit confirmation that SLAs (and service credits) remain applicable throughout reversibility until Accor’s acceptance.
Acceptance criteria/checklists: A consolidated, detailed acceptance checklist (documents, access revocation, data transfer verification, KT completion) is not shown.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 20'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'CAPGEMINI'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'Capgemini provides a structured reverse transition plan with phases and activities:
Planning and Exit Governance (appoint Exit Transition Manager, align/agree exit plan, staff ramp-down plan).
Knowledge Transfer to Accor/new supplier (assign SMEs, agree KT plans, conduct KT sessions, share documentation).
Technology and Infrastructure (determine data objects/formats, data transfer to new supplier, revoke user IDs/network connections, transfer assets).
Handover/Closedown and Hypercare (formal service handover, reversibility acceptance, post-handover support).
Duration feasibility: The timeline shows Month 1–3 (planning/initial activities) and Month 4–6 (execution), with “Reversibility Acceptance” by Month 6

Gaps/Risks:
Pricing not provided
SLA continuity: No explicit confirmation that SLAs (and service credits) remain applicable throughout reversibility until Accor’s acceptance.
Acceptance criteria/checklists: A consolidated, detailed acceptance checklist (documents, access revocation, data transfer verification, KT completion) is not shown.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing CAPGEMINI - R - 20: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- CAPGEMINI - R - 21
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'Provides fixed-price options in EUR  for both coverage windows with clear annual totals and visible step‑downs in Y2 and Y3, reflecting targeted productivity gains.
Breaks run costs into Resource, Tools (Connectivity and Translation), Automation, and Travel, plus a separate Service Management line (Resource + Travel). Transition is priced separately.
Quality-driven performance: Proposes a bonus–malus discussion tied to SLAs/KPIs, and includes a dedicated “Automation” budget line to drive improvements.
Year‑1 review: States an end‑of‑year‑one review to adjust team capacity, language strategy, and costs. 

Gaps/Risks:
Elasticity/cost neutrality for peaks: Assumptions say “Flexible ramp‑up/ramp‑down … managed through change management process,” and the operating model shows 8–10‑week ramp‑up. 
KPI/price linkage: No explicit Year‑1 true‑up formula tied to SLA/KPI outcomes (e.g., MTTR, FCR, automation/self‑resolution, backlog evolution). Bonus–malus is left for later negotiation, with a 3‑month stabilization period where penalties do not apply.
COLA/indices: No clarity on indexation and its interaction with planned step‑downs (risk to net reductions).',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 21'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'CAPGEMINI'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'Provides fixed-price options in EUR  for both coverage windows with clear annual totals and visible step‑downs in Y2 and Y3, reflecting targeted productivity gains.
Breaks run costs into Resource, Tools (Connectivity and Translation), Automation, and Travel, plus a separate Service Management line (Resource + Travel). Transition is priced separately.
Quality-driven performance: Proposes a bonus–malus discussion tied to SLAs/KPIs, and includes a dedicated “Automation” budget line to drive improvements.
Year‑1 review: States an end‑of‑year‑one review to adjust team capacity, language strategy, and costs. 

Gaps/Risks:
Elasticity/cost neutrality for peaks: Assumptions say “Flexible ramp‑up/ramp‑down … managed through change management process,” and the operating model shows 8–10‑week ramp‑up. 
KPI/price linkage: No explicit Year‑1 true‑up formula tied to SLA/KPI outcomes (e.g., MTTR, FCR, automation/self‑resolution, backlog evolution). Bonus–malus is left for later negotiation, with a 3‑month stabilization period where penalties do not apply.
COLA/indices: No clarity on indexation and its interaction with planned step‑downs (risk to net reductions).',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing CAPGEMINI - R - 21: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- CAPGEMINI - R - 22
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'Capgemini’s multi‑year pricing shows planned reductions in Y2–Y3 (aligned to a stated 24% 3‑year productivity ambition) and an explicit end‑of‑Year‑1 review to recalibrate capacity, language model, and costs. .
Expertise and technology levers: A structured ESOAR framework and a detailed 36‑month automation/AI roadmap (Smart Dispatcher/auto‑triage, IKON known‑error assistance, ROOCA AI‑assisted RCA, UiPath/ITPA self‑heal, observability) target backlog/MTTR reduction, ticket deflection, and standardization/industrialization.
Weekly/monthly/quarterly committees with KPI/SLA dashboards (VVM) to evidence improvements and jointly agree the financial translation of benefits.


Gaps/Risks:
No binding, KPI‑linked true‑up formula for Year‑1 (e.g., mapping MTTR/FCR/automation/self‑resolution/backlog evolution to price adjustments); bonus–malus “to be finalized.”
Assumption that if automation is blocked by Accor, commercials are revised, which risks pass‑through of gains.
COLA/indexation rules not stated; could offset step‑downs.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 22'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'CAPGEMINI'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'Capgemini’s multi‑year pricing shows planned reductions in Y2–Y3 (aligned to a stated 24% 3‑year productivity ambition) and an explicit end‑of‑Year‑1 review to recalibrate capacity, language model, and costs. .
Expertise and technology levers: A structured ESOAR framework and a detailed 36‑month automation/AI roadmap (Smart Dispatcher/auto‑triage, IKON known‑error assistance, ROOCA AI‑assisted RCA, UiPath/ITPA self‑heal, observability) target backlog/MTTR reduction, ticket deflection, and standardization/industrialization.
Weekly/monthly/quarterly committees with KPI/SLA dashboards (VVM) to evidence improvements and jointly agree the financial translation of benefits.


Gaps/Risks:
No binding, KPI‑linked true‑up formula for Year‑1 (e.g., mapping MTTR/FCR/automation/self‑resolution/backlog evolution to price adjustments); bonus–malus “to be finalized.”
Assumption that if automation is blocked by Accor, commercials are revised, which risks pass‑through of gains.
COLA/indexation rules not stated; could offset step‑downs.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing CAPGEMINI - R - 22: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- LUCEM - R - 1
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      4.5,
      'The proposal  states Lucem/4i will “take charge of Level 1 and 1.5 support” and details how L1 and L1.5 tickets are qualified, processed, and escalated 
Includes recurring administrative tasks, closing activities  aligned to Accor’s calendar, and monitoring activities . They state remediation and prevention actions (root-cause analysis, recommendations to prevent recurrence) will be performed.
Even when activities are not initially raised in ServiceNow, Lucem will create tickets “for auditability reasons,” ensuring traceability while still committing to perform the tasks (closing and monitoring sections).
Strong continuity through Lucem’s deep Grand Back knowledge, inclusion of current-context consultants, and a structured transition with shadowing/reverse shadowing; RACI, deliverables, and governance are well defined.
They list coverage of all relevant modules and ledgers/countries, and support for specific developments

Gaps:
The proposal doesn’t map one-by-one to every RFP-listed monitoring/admin/closing task with explicit acceptance; coverage is described generically.
The “all requests must be a ticket” stance slightly diverges from the RFP’s note that some activities may not be tracked in ITSM; while they compensate by creating tickets',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 1'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'LUCEM'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 4.5,
      manual_comment = 'The proposal  states Lucem/4i will “take charge of Level 1 and 1.5 support” and details how L1 and L1.5 tickets are qualified, processed, and escalated 
Includes recurring administrative tasks, closing activities  aligned to Accor’s calendar, and monitoring activities . They state remediation and prevention actions (root-cause analysis, recommendations to prevent recurrence) will be performed.
Even when activities are not initially raised in ServiceNow, Lucem will create tickets “for auditability reasons,” ensuring traceability while still committing to perform the tasks (closing and monitoring sections).
Strong continuity through Lucem’s deep Grand Back knowledge, inclusion of current-context consultants, and a structured transition with shadowing/reverse shadowing; RACI, deliverables, and governance are well defined.
They list coverage of all relevant modules and ledgers/countries, and support for specific developments

Gaps:
The proposal doesn’t map one-by-one to every RFP-listed monitoring/admin/closing task with explicit acceptance; coverage is described generically.
The “all requests must be a ticket” stance slightly diverges from the RFP’s note that some activities may not be tracked in ITSM; while they compensate by creating tickets',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing LUCEM - R - 1: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- LUCEM - R - 2
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'Commits to maintain and update all run documentation, procedures, setup books, and test evidence; proposes an FAQ/knowledge capitalization approach and uses Accor tools for traceability and access. Indicates continuous updates as part of ticket handling and continuous improvement.
Explicitly plans assessment of documentation quality, review/validation, and improvement/translation during Transition; includes deliverables and RACI for documentation upkeep.
Provides process flows (support, admin, maintenance, minor change), RACIs, and an escalation process; 
States use of Accor’s ServiceNow and Teams/SharePoint, implying common access for both Accor and provider staff.


Gaps/Risks
No explicit statement that “all documentation remains the exclusive property of Accor.”
“Centralized knowledge base” not described as a formal KB (e.g., ServiceNow Knowledge with article templates, lifecycle, approval workflow); FAQ is mentioned but governance, structure, and metadata are not specified.
No sample KB article templates or explicit SLA for KB updates following ticket closure.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 2'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'LUCEM'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'Commits to maintain and update all run documentation, procedures, setup books, and test evidence; proposes an FAQ/knowledge capitalization approach and uses Accor tools for traceability and access. Indicates continuous updates as part of ticket handling and continuous improvement.
Explicitly plans assessment of documentation quality, review/validation, and improvement/translation during Transition; includes deliverables and RACI for documentation upkeep.
Provides process flows (support, admin, maintenance, minor change), RACIs, and an escalation process; 
States use of Accor’s ServiceNow and Teams/SharePoint, implying common access for both Accor and provider staff.


Gaps/Risks
No explicit statement that “all documentation remains the exclusive property of Accor.”
“Centralized knowledge base” not described as a formal KB (e.g., ServiceNow Knowledge with article templates, lifecycle, approval workflow); FAQ is mentioned but governance, structure, and metadata are not specified.
No sample KB article templates or explicit SLA for KB updates following ticket closure.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing LUCEM - R - 2: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- LUCEM - R - 3
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      4,
      'Option 1 and Option 2 covered.
Mandatory closure coverage:  coverage up to 24:00 during closing days, and the budget assumptions state coverage 
 A trigger-based scaling model and ability to mobilize resources within 4 hours to 2 business days support additional time slots and peaks (pre-closing, closing, regression), without compromising quality.
 Coverage windows are tied to historical peak patterns (monthly/daily) and six-period scheduling, demonstrating thoughtful alignment to workload.

Gaps/Risks
“Additional time slot upon request” is implied via flexibility but not explicitly committed with an activation SLA (e.g., notice period).',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 3'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'LUCEM'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 4,
      manual_comment = 'Option 1 and Option 2 covered.
Mandatory closure coverage:  coverage up to 24:00 during closing days, and the budget assumptions state coverage 
 A trigger-based scaling model and ability to mobilize resources within 4 hours to 2 business days support additional time slots and peaks (pre-closing, closing, regression), without compromising quality.
 Coverage windows are tied to historical peak patterns (monthly/daily) and six-period scheduling, demonstrating thoughtful alignment to workload.

Gaps/Risks
“Additional time slot upon request” is implied via flexibility but not explicitly committed with an activation SLA (e.g., notice period).',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing LUCEM - R - 3: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- LUCEM - R - 4
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'The proposal aligns with the two-scenario model: Transition with L1 in English and L1.5 in French (6-month warm-up), then Target with both L1 and L1.5 in English; offers flexibility to extend French if needed.
Multiple sections confirm EN/FR delivery and phased transition, with local French-speaking experts handling L1.5 during Transition and clear governance cadence to support communication.


Gaps/Risks:
No defined process for language proficiency (recruitment criteria, testing, training, QA checks).
“Multilingual support out of scope” could be misconstrued; needs explicit confirmation that EN/FR are in scope.
No language-specific KPIs or QA measures (e.g., clarity CSAT, communication quality audits) to evidence ongoing standard.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 4'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'LUCEM'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'The proposal aligns with the two-scenario model: Transition with L1 in English and L1.5 in French (6-month warm-up), then Target with both L1 and L1.5 in English; offers flexibility to extend French if needed.
Multiple sections confirm EN/FR delivery and phased transition, with local French-speaking experts handling L1.5 during Transition and clear governance cadence to support communication.


Gaps/Risks:
No defined process for language proficiency (recruitment criteria, testing, training, QA checks).
“Multilingual support out of scope” could be misconstrued; needs explicit confirmation that EN/FR are in scope.
No language-specific KPIs or QA measures (e.g., clarity CSAT, communication quality audits) to evidence ongoing standard.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing LUCEM - R - 4: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- LUCEM - R - 5
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'LUCEM describes a clear operating model covering Transition, Warm-up, and Target phases, with detailed processes for ticket qualification, escalation, RACIs, governance (weekly/monthly/quarterly committees), documentation, monitoring, closing tasks, and environment refresh.
Delivery footprint is explicit: Paris (Lucem) + Kazhipattur, India (4i), with a local SDM and Account Manager in Paris 
Time-zone and coverage needs are operationalized via concrete rosters for Option 1 and Option 2, including closure-day coverage up to 23:59 and six-period scheduling (standard/peak/closing).
Language scenarios are embedded (Scenario 1 EN L1 + FR L1.5, Scenario 2 EN for both), and the model shows service continuity through risk management, workforce stability/turnover plan, reversibility, and bench/trigger-based scaling with rapid mobilization.


Gaps/Risks:
No explicit acknowledgement that Accor may indicate location preferences and that LUCEM can adapt the delivery footprint accordingly.
Footprint justification is mostly cost/availability; lacks discussion of alternative/backup locations or nearshore options and formal business continuity/BCP for site outages.
Limited explicit mapping of how CET handoffs are managed',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 5'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'LUCEM'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'LUCEM describes a clear operating model covering Transition, Warm-up, and Target phases, with detailed processes for ticket qualification, escalation, RACIs, governance (weekly/monthly/quarterly committees), documentation, monitoring, closing tasks, and environment refresh.
Delivery footprint is explicit: Paris (Lucem) + Kazhipattur, India (4i), with a local SDM and Account Manager in Paris 
Time-zone and coverage needs are operationalized via concrete rosters for Option 1 and Option 2, including closure-day coverage up to 23:59 and six-period scheduling (standard/peak/closing).
Language scenarios are embedded (Scenario 1 EN L1 + FR L1.5, Scenario 2 EN for both), and the model shows service continuity through risk management, workforce stability/turnover plan, reversibility, and bench/trigger-based scaling with rapid mobilization.


Gaps/Risks:
No explicit acknowledgement that Accor may indicate location preferences and that LUCEM can adapt the delivery footprint accordingly.
Footprint justification is mostly cost/availability; lacks discussion of alternative/backup locations or nearshore options and formal business continuity/BCP for site outages.
Limited explicit mapping of how CET handoffs are managed',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing LUCEM - R - 5: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- LUCEM - R - 6
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'The proposal describes a good elasticity approach (six-period scheduling, forecast- and trigger-based scaling, rapid mobilization in 4 hours to 2 business days, min/max team envelope) and explains how scalability is reflected in pricing (per-FTE “adjustment steps,” 87 tickets/FTE/month, monthly invoicing adjustments).
However, the RFP requires elasticity as a standard component “without additional costs or penalties.” LUCEM explicitly ties added capacity to incremental monthly charges and notes potential “overconsumption” adjustments, to be offset later or billed. There is no commitment that elasticity within defined peaks will be included at no extra cost.


Gaps/Risks:
Non-compliance with “no additional costs” clause: elasticity incurs incremental charges and/or “overconsumption” negotiations
No explicit inclusion of a cost-free elasticity buffer (e.g., ±X% volume within base fee); risk to cost predictability and alignment with RFP intent.
“Budget flexibility can be triggered when no penalty has been paid for the last 3 months” introduces conditionality and potential service/cost disputes 
Limited detail on formal shared-resource model structure (e.g., reserved bench size, SLAs for activation) and any cap on surge capacity included without charge.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 6'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'LUCEM'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'The proposal describes a good elasticity approach (six-period scheduling, forecast- and trigger-based scaling, rapid mobilization in 4 hours to 2 business days, min/max team envelope) and explains how scalability is reflected in pricing (per-FTE “adjustment steps,” 87 tickets/FTE/month, monthly invoicing adjustments).
However, the RFP requires elasticity as a standard component “without additional costs or penalties.” LUCEM explicitly ties added capacity to incremental monthly charges and notes potential “overconsumption” adjustments, to be offset later or billed. There is no commitment that elasticity within defined peaks will be included at no extra cost.


Gaps/Risks:
Non-compliance with “no additional costs” clause: elasticity incurs incremental charges and/or “overconsumption” negotiations
No explicit inclusion of a cost-free elasticity buffer (e.g., ±X% volume within base fee); risk to cost predictability and alignment with RFP intent.
“Budget flexibility can be triggered when no penalty has been paid for the last 3 months” introduces conditionality and potential service/cost disputes 
Limited detail on formal shared-resource model structure (e.g., reserved bench size, SLAs for activation) and any cap on surge capacity included without charge.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing LUCEM - R - 6: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- LUCEM - R - 7
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      4,
      'Strong, relevant EBS track record: Longstanding, direct experience on Accor’s Grand Back (R12.2.12) plus broader EBS portfolio; work in multinational contexts is evident.
States 50+ EBS specialists at Lucem and 300+ at 4i (global pool), demonstrating depth to staff and sustain L1/L1.5.
Explicit scope with closing/monitoring/admin tasks and SOPs, evidencing in-depth functional understanding.
Operational competence for L1/L1.5: Detailed ticket taxonomy, prioritization, workflows, RACIs, and escalation to L2/L3/Oracle show ability to recognize, classify, and manage incidents/requests.
Mentions ongoing training/cross-training and analyst-recognized partner (4i) credentials.


Gaps/Risks:
Lacks explicit certification inventory (e.g., Oracle certifications by role/center) and formal partnership levels.
No precise counts of finance EBS consultants by the specific delivery centers proposed (Paris, Kazhipattur) or named senior profiles/CVs for assigned L1/L1.5 team.
Limited evidence of structured enablement program metrics (training hours, certification roadmap, renewal cadence).
Few concrete, quantified client references/case outcomes (e.g., R12.2 KPIs, volumes handled) to substantiate scale claims.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 7'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'LUCEM'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 4,
      manual_comment = 'Strong, relevant EBS track record: Longstanding, direct experience on Accor’s Grand Back (R12.2.12) plus broader EBS portfolio; work in multinational contexts is evident.
States 50+ EBS specialists at Lucem and 300+ at 4i (global pool), demonstrating depth to staff and sustain L1/L1.5.
Explicit scope with closing/monitoring/admin tasks and SOPs, evidencing in-depth functional understanding.
Operational competence for L1/L1.5: Detailed ticket taxonomy, prioritization, workflows, RACIs, and escalation to L2/L3/Oracle show ability to recognize, classify, and manage incidents/requests.
Mentions ongoing training/cross-training and analyst-recognized partner (4i) credentials.


Gaps/Risks:
Lacks explicit certification inventory (e.g., Oracle certifications by role/center) and formal partnership levels.
No precise counts of finance EBS consultants by the specific delivery centers proposed (Paris, Kazhipattur) or named senior profiles/CVs for assigned L1/L1.5 team.
Limited evidence of structured enablement program metrics (training hours, certification roadmap, renewal cadence).
Few concrete, quantified client references/case outcomes (e.g., R12.2 KPIs, volumes handled) to substantiate scale claims.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing LUCEM - R - 7: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- LUCEM - R - 11
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      2.5,
      'Monthly performance reports and quarterly executive reports aligned to SLAs/KPIs, including ticket volumes, breakdowns, response/resolution times, backlog, CSAT, breaches/corrective actions, risks, and forecasts for capacity adjustments.
Examples of dashboards are included (sample visuals/KPIs from other AMS engagements).
Governance deliverables (WORC/Steerco/QBR) and meeting artifacts (action and risk plans) are specified, ensuring regular reporting and follow-up.
However, automation/optimization is weakly addressed: reporting depends on Accor to provide ServiceNow extractions/calculations; there’s no concrete plan to automate data collection, KPI computation, or dashboard refresh. Improvement proposals are generic.

Gaps/Risks:
Reliance on Accor to supply “extractions/calculations” from the ticketing tool; lack of ownership over end-to-end reporting automation 
No concrete automation plan (tools, architecture, data pipeline, refresh frequency, role-based access) or examples of automated reports implemented.
No defined data quality controls (reconciliation, handling neutralized tickets) beyond manual checks; could impact trust in metrics.
No explicit commitment to optimize/automate reporting processes during transition (e.g., build ServiceNow dashboards, KPI calculators, Power BI/Tableau models) with a timeline and owners.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 11'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'LUCEM'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 2.5,
      manual_comment = 'Monthly performance reports and quarterly executive reports aligned to SLAs/KPIs, including ticket volumes, breakdowns, response/resolution times, backlog, CSAT, breaches/corrective actions, risks, and forecasts for capacity adjustments.
Examples of dashboards are included (sample visuals/KPIs from other AMS engagements).
Governance deliverables (WORC/Steerco/QBR) and meeting artifacts (action and risk plans) are specified, ensuring regular reporting and follow-up.
However, automation/optimization is weakly addressed: reporting depends on Accor to provide ServiceNow extractions/calculations; there’s no concrete plan to automate data collection, KPI computation, or dashboard refresh. Improvement proposals are generic.

Gaps/Risks:
Reliance on Accor to supply “extractions/calculations” from the ticketing tool; lack of ownership over end-to-end reporting automation 
No concrete automation plan (tools, architecture, data pipeline, refresh frequency, role-based access) or examples of automated reports implemented.
No defined data quality controls (reconciliation, handling neutralized tickets) beyond manual checks; could impact trust in metrics.
No explicit commitment to optimize/automate reporting processes during transition (e.g., build ServiceNow dashboards, KPI calculators, Power BI/Tableau models) with a timeline and owners.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing LUCEM - R - 11: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- LUCEM - R - 8
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'Provides a clear approach to stability and knowledge preservation, emphasis on long-term commitments, regular follow-ups, training, cross-training, and thorough documentation.
Gives turnover figures (Lucem 14%, 4i 8.5%) and states a preference to staff with employees rather than subcontractors/freelance.
Onboarding/knowledge-transfer processes for both anticipated and unanticipated turnover, including a rule that at least three consultants are trained per activity to ensure continuity.
However, it does not provide turnover rates specifically for L1 resources within the proposed hubs (Paris and Kazhipattur), nor a precise staffing composition breakdown. Retention strategy is described at a high level without concrete KPIs or formal plans 

Gaps/Risks:
Missing hub- and role-specific turnover rates (L1/L1.5 in Paris and Kazhipattur), as requested.
No detailed staffing composition percentages by hub (employees vs subcontractors/freelance) for the proposed team.
Retention strategy lacks measurable components (e.g., retention KPIs, succession plans, backfill SLAs, time-to-proficiency targets).
No formalized knowledge-retention KPIs (e.g., documentation freshness, cross-coverage ratio adherence) or audit cadence to assure ongoing compliance.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 8'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'LUCEM'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'Provides a clear approach to stability and knowledge preservation, emphasis on long-term commitments, regular follow-ups, training, cross-training, and thorough documentation.
Gives turnover figures (Lucem 14%, 4i 8.5%) and states a preference to staff with employees rather than subcontractors/freelance.
Onboarding/knowledge-transfer processes for both anticipated and unanticipated turnover, including a rule that at least three consultants are trained per activity to ensure continuity.
However, it does not provide turnover rates specifically for L1 resources within the proposed hubs (Paris and Kazhipattur), nor a precise staffing composition breakdown. Retention strategy is described at a high level without concrete KPIs or formal plans 

Gaps/Risks:
Missing hub- and role-specific turnover rates (L1/L1.5 in Paris and Kazhipattur), as requested.
No detailed staffing composition percentages by hub (employees vs subcontractors/freelance) for the proposed team.
Retention strategy lacks measurable components (e.g., retention KPIs, succession plans, backfill SLAs, time-to-proficiency targets).
No formalized knowledge-retention KPIs (e.g., documentation freshness, cross-coverage ratio adherence) or audit cadence to assure ongoing compliance.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing LUCEM - R - 8: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- LUCEM - R - 9
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'Account Manager and Service Delivery Manager both  based in Paris and act as Accor’s main contacts for operational, contractual, and billing topics
Governance and communication mechanisms are well structured and detailed with defined agendas, participants, deliverables, RACIs, and practical arrangements (materials 48h ahead; minutes in 24h) 
An escalation process is included, and operational oversight is reinforced through reporting, action/risk plans, and SDM ownership of performance monitoring


Gaps/Risks:
Reporting lines/organizational positioning are not fully explicit (no org chart; not clear to whom the SDM reports internally or how 4i’s “Outsourced Manager” fits ongoing governance beyond transition) 
Escalation ladder lacks concrete thresholds/SLAs (e.g., P1 escalation timeline to SDM/Account Manager/executive), deputies/backups, and on-call expectations
Limited detail on cross-entity escalation between Lucem and 4i during incidents (roles and decision rights)
',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 9'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'LUCEM'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'Account Manager and Service Delivery Manager both  based in Paris and act as Accor’s main contacts for operational, contractual, and billing topics
Governance and communication mechanisms are well structured and detailed with defined agendas, participants, deliverables, RACIs, and practical arrangements (materials 48h ahead; minutes in 24h) 
An escalation process is included, and operational oversight is reinforced through reporting, action/risk plans, and SDM ownership of performance monitoring


Gaps/Risks:
Reporting lines/organizational positioning are not fully explicit (no org chart; not clear to whom the SDM reports internally or how 4i’s “Outsourced Manager” fits ongoing governance beyond transition) 
Escalation ladder lacks concrete thresholds/SLAs (e.g., P1 escalation timeline to SDM/Account Manager/executive), deputies/backups, and on-call expectations
Limited detail on cross-entity escalation between Lucem and 4i during incidents (roles and decision rights)
',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing LUCEM - R - 9: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- LUCEM - R - 10
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      '“We subscribe to Accor requested model of governance. We do not propose additional committees,” directly confirming compliance.
Committees fully specified with objectives, participants, frequency, organizer, and venue.
Details monthly performance and quarterly executive reports aligned to SLAs/KPIs, plus ad hoc needs; provides sample dashboards.
Provides a RACI for committee planning/invitations/materials/minutes and practical arrangements (materials 48h before; minutes within 24h).
Includes an escalation process section supporting issue handling and communication.

Gaps/Risks:
Escalation detail: Lacks quantitative thresholds/SLAs for escalation (e.g., timelines for P1/P2 to SDM/AM/executive)
Minor clarity: No explicit statement on governance language, though out of scope for this requirement.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 10'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'LUCEM'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = '“We subscribe to Accor requested model of governance. We do not propose additional committees,” directly confirming compliance.
Committees fully specified with objectives, participants, frequency, organizer, and venue.
Details monthly performance and quarterly executive reports aligned to SLAs/KPIs, plus ad hoc needs; provides sample dashboards.
Provides a RACI for committee planning/invitations/materials/minutes and practical arrangements (materials 48h before; minutes within 24h).
Includes an escalation process section supporting issue handling and communication.

Gaps/Risks:
Escalation detail: Lacks quantitative thresholds/SLAs for escalation (e.g., timelines for P1/P2 to SDM/AM/executive)
Minor clarity: No explicit statement on governance language, though out of scope for this requirement.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing LUCEM - R - 10: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- LUCEM - R - 13
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'Commits to analyzing recurring issues, trends, SLAs/KPIs, and CSAT in monthly/quarterly reports and committees; “Lucem’s Experience” section outlines recurrence analysis and anticipation/prevention.
States a clear objective to reduce tickets/backlog; proposes improvement plans (root-cause-based) to Steering, tracks them, and updates run docs/SOPs; embeds RCA and prevention in monitoring/admin flows.
 Describes standardization of ticket taxonomy, workflows, RACIs, documentation updates, and suggests automation/AI to remove low-value work; daily closing reviews feed post-period improvements.
Adds AI/automation use cases (categorization, routing, self-help, doc suggestions), FAQs/KB capitalization, and forecasting-driven capacity adjustments.


Gaps/Risks:
No formal CSI framework described (e.g., PDCA cycle, CSI register, owners, target benefits, review cadence).
Implementation ownership of some actions sits with L2/L3, creating dependency risk for timely corrections.
Limited specificity on RCA methodology (e.g., 5-Whys, PIR templates) and on CSI KPIs (e.g., deflection rate, time-to-permanent-fix).
User feedback loop relies mainly on CSAT (managed by Accor) with no detailed plan for qualitative feedback capture and incorporation.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 13'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'LUCEM'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'Commits to analyzing recurring issues, trends, SLAs/KPIs, and CSAT in monthly/quarterly reports and committees; “Lucem’s Experience” section outlines recurrence analysis and anticipation/prevention.
States a clear objective to reduce tickets/backlog; proposes improvement plans (root-cause-based) to Steering, tracks them, and updates run docs/SOPs; embeds RCA and prevention in monitoring/admin flows.
 Describes standardization of ticket taxonomy, workflows, RACIs, documentation updates, and suggests automation/AI to remove low-value work; daily closing reviews feed post-period improvements.
Adds AI/automation use cases (categorization, routing, self-help, doc suggestions), FAQs/KB capitalization, and forecasting-driven capacity adjustments.


Gaps/Risks:
No formal CSI framework described (e.g., PDCA cycle, CSI register, owners, target benefits, review cadence).
Implementation ownership of some actions sits with L2/L3, creating dependency risk for timely corrections.
Limited specificity on RCA methodology (e.g., 5-Whys, PIR templates) and on CSI KPIs (e.g., deflection rate, time-to-permanent-fix).
User feedback loop relies mainly on CSAT (managed by Accor) with no detailed plan for qualitative feedback capture and incorporation.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing LUCEM - R - 13: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- LUCEM - R - 14
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      2.5,
      'The proposal acknowledges AI/automation and lists several potential use cases (ticket categorization/routing and assignment, KB suggestions, L1 tasks like password resets, training-needs detection, quiz generation, user self-help suggestions) and aligns to Accor policies/tools (mentions UiPath and using Accor AI tooling) (ref. 3.2.13; 5.1.2).
The submission provides ideas but no past case studies, no measured benefits, and no roadmap (timelines, milestones, ownership).
It also lacks a measurement framework to ensure initiatives “generate measurable benefits” (e.g., target deflection rates, SLA improvements, cost savings), and no plan to enhance existing RPA already in scope.


Gaps/Risks:
No concrete AI/RPA success stories or quantified outcomes from comparable engagements; no REX included.
No AI/automation roadmap (prioritized use cases, architecture/tooling stack, guardrails, pilots, rollout plan, owners, timeline).
No benefit-realization model or KPIs (e.g., ticket auto-triage accuracy, deflection %, MTTR reduction, hours saved) tied to accountability.
Unclear governance for AI (model oversight, data privacy, prompt/response QA, change control) and how existing RPA will be enhanced.
Dependence on Accor to provide AI platforms without a plan for rapid enablement may delay value realization.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 14'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'LUCEM'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 2.5,
      manual_comment = 'The proposal acknowledges AI/automation and lists several potential use cases (ticket categorization/routing and assignment, KB suggestions, L1 tasks like password resets, training-needs detection, quiz generation, user self-help suggestions) and aligns to Accor policies/tools (mentions UiPath and using Accor AI tooling) (ref. 3.2.13; 5.1.2).
The submission provides ideas but no past case studies, no measured benefits, and no roadmap (timelines, milestones, ownership).
It also lacks a measurement framework to ensure initiatives “generate measurable benefits” (e.g., target deflection rates, SLA improvements, cost savings), and no plan to enhance existing RPA already in scope.


Gaps/Risks:
No concrete AI/RPA success stories or quantified outcomes from comparable engagements; no REX included.
No AI/automation roadmap (prioritized use cases, architecture/tooling stack, guardrails, pilots, rollout plan, owners, timeline).
No benefit-realization model or KPIs (e.g., ticket auto-triage accuracy, deflection %, MTTR reduction, hours saved) tied to accountability.
Unclear governance for AI (model oversight, data privacy, prompt/response QA, change control) and how existing RPA will be enhanced.
Dependence on Accor to provide AI platforms without a plan for rapid enablement may delay value realization.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing LUCEM - R - 14: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- LUCEM - R - 18
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      2,
      'Covers all required steps end-to-end, plus deliverables and a RACI for the phase.
Aligns to the expected 3‑month duration with an indicative timeline (early Nov → early Feb) and names required resources 
Commits to submit a detailed Transition Plan within 15 business days of award, including activities, roles, resources, risks, governance. Provides a structured risk management approach (risk matrix, actions by criticality, crisis management).
Adds practicalities that smooth handover: documentation review/correction/translation, committee governance, and defined prerequisites/deliverables.


Gaps/Risks:
No detailed cost breakdown by transition sub-phase, as requested; only an overall budget view is provided.
Acceptance criteria for Sign‑off are high level; no measurable exit criteria or hypercare window immediately post-handover.
Dependency risks not fully elaborated (e.g., access to outgoing provider, tools, data extracts, ServiceNow history) and no explicit mitigation timelines.
The intent to “minimize KT/Shadowing” for Lucem may underplay external knowledge capture; risk of assumptions or blind spots if not governed tightly by Accor.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 18'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'LUCEM'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 2,
      manual_comment = 'Covers all required steps end-to-end, plus deliverables and a RACI for the phase.
Aligns to the expected 3‑month duration with an indicative timeline (early Nov → early Feb) and names required resources 
Commits to submit a detailed Transition Plan within 15 business days of award, including activities, roles, resources, risks, governance. Provides a structured risk management approach (risk matrix, actions by criticality, crisis management).
Adds practicalities that smooth handover: documentation review/correction/translation, committee governance, and defined prerequisites/deliverables.


Gaps/Risks:
No detailed cost breakdown by transition sub-phase, as requested; only an overall budget view is provided.
Acceptance criteria for Sign‑off are high level; no measurable exit criteria or hypercare window immediately post-handover.
Dependency risks not fully elaborated (e.g., access to outgoing provider, tools, data extracts, ServiceNow history) and no explicit mitigation timelines.
The intent to “minimize KT/Shadowing” for Lucem may underplay external knowledge capture; risk of assumptions or blind spots if not governed tightly by Accor.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing LUCEM - R - 18: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- LUCEM - R - 19
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'Comprehensive framework defined in Transition: dedicated Risk Management section (within QAP) covering risk identification, analysis (impact/probability matrix), criticality, and mitigation actions; includes a crisis management process for major events.
Contingency planning: crisis process with escalation to appropriate decision-makers and predefined actions by criticality tier indicates preparedness beyond basic mitigation.
Risks are tracked and shared in governance;  committees explicitly include Risk Plans (WORC/SC/QBR) and status reporting; risk approach continues into Run and Reversibility for continuity.


Gaps/Risks:
No sample risk register or explicit owners/triggers per risk; lacks detailed contingency playbooks for likely scenarios (e.g., delayed access provisioning, incomplete documentation from outgoing provider, ServiceNow data export issues).
No quantitative early-warning indicators or risk SLAs (e.g., time-to-mitigation, escalation timelines); escalation ladder timing not specified.
Limited mapping of dependencies and concrete mitigation timelines; acceptance/hypercare criteria during cutover not tied to risk closure.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 19'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'LUCEM'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'Comprehensive framework defined in Transition: dedicated Risk Management section (within QAP) covering risk identification, analysis (impact/probability matrix), criticality, and mitigation actions; includes a crisis management process for major events.
Contingency planning: crisis process with escalation to appropriate decision-makers and predefined actions by criticality tier indicates preparedness beyond basic mitigation.
Risks are tracked and shared in governance;  committees explicitly include Risk Plans (WORC/SC/QBR) and status reporting; risk approach continues into Run and Reversibility for continuity.


Gaps/Risks:
No sample risk register or explicit owners/triggers per risk; lacks detailed contingency playbooks for likely scenarios (e.g., delayed access provisioning, incomplete documentation from outgoing provider, ServiceNow data export issues).
No quantitative early-warning indicators or risk SLAs (e.g., time-to-mitigation, escalation timelines); escalation ladder timing not specified.
Limited mapping of dependencies and concrete mitigation timelines; acceptance/hypercare criteria during cutover not tied to risk closure.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing LUCEM - R - 19: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- LUCEM - R - 20
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'The proposal provides a structured reversibility approach and associated activities: objectives, methodology , deliverables, RACI, governance, and a planning framework with milestones and validation steps. It explicitly commits to a reversibility duration “3 to 6 months,”
However, it does not include pricing for the reversibility service in the proposal. It states the “Budget for this phase will depend… exact budget will be defined at this stage,” which fails the requirement to include pricing now.

Gaps/Risks:
No pricing provided for reversibility; only a future determination.
No cost breakdown by activity, nor commercial terms (e.g., fixed vs. T&M, caps).
Limited contingency detail for reversibility risks (e.g., if incoming provider is late/not ready) and no defined hypercare window post-handover.
Dependency on future agreement of scope may lead to schedule/cost uncertainty at contract end.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 20'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'LUCEM'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'The proposal provides a structured reversibility approach and associated activities: objectives, methodology , deliverables, RACI, governance, and a planning framework with milestones and validation steps. It explicitly commits to a reversibility duration “3 to 6 months,”
However, it does not include pricing for the reversibility service in the proposal. It states the “Budget for this phase will depend… exact budget will be defined at this stage,” which fails the requirement to include pricing now.

Gaps/Risks:
No pricing provided for reversibility; only a future determination.
No cost breakdown by activity, nor commercial terms (e.g., fixed vs. T&M, caps).
Limited contingency detail for reversibility risks (e.g., if incoming provider is late/not ready) and no defined hypercare window post-handover.
Dependency on future agreement of scope may lead to schedule/cost uncertainty at contract end.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing LUCEM - R - 20: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- LUCEM - R - 21
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'The model is flexible with defined min/max team envelopes, monthly “adjustment steps” per 87 tickets/FTE, and true-up invoicing; rosters align to Option 1/2 coverage and closing peaks 
Provides a base monthly fee for TOM (104,518 € HT) with clear unit pricing for scale (+/– 6,512 € per FTE step) and stated min/max caps, enabling some predictability and cost control 
MuPricing assumptions explicitly include all listed ledgers/countries/modules, indicating the model accounts for multi‑regional operations 
Mentions yearly indexation (Syntec) and ongoing team/budget adjustments, but does not explicitly commit to the RFP’s formal end‑of‑year economic model review against observed activity/performance.


Gaps/Risks:
Limited transparency of cost components: no explicit breakdown for human resources vs. service management overhead, etc
No explicit commitment to the RFP’s formal end‑of‑year pricing model review tied to performance and value realization (only Syntec indexation is stated).
Cost predictability during peaks: elasticity is billed via incremental FTE steps and “overconsumption” handling; no defined included buffer, which may reduce predictability and conflicts with the RFP’s preference for built‑in flexibility.
Conditional “budget flexibility” rule (only if no penalties in last 3 months) could cause disputes and may not align with “quality-driven performance” incentives.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 21'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'LUCEM'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'The model is flexible with defined min/max team envelopes, monthly “adjustment steps” per 87 tickets/FTE, and true-up invoicing; rosters align to Option 1/2 coverage and closing peaks 
Provides a base monthly fee for TOM (104,518 € HT) with clear unit pricing for scale (+/– 6,512 € per FTE step) and stated min/max caps, enabling some predictability and cost control 
MuPricing assumptions explicitly include all listed ledgers/countries/modules, indicating the model accounts for multi‑regional operations 
Mentions yearly indexation (Syntec) and ongoing team/budget adjustments, but does not explicitly commit to the RFP’s formal end‑of‑year economic model review against observed activity/performance.


Gaps/Risks:
Limited transparency of cost components: no explicit breakdown for human resources vs. service management overhead, etc
No explicit commitment to the RFP’s formal end‑of‑year pricing model review tied to performance and value realization (only Syntec indexation is stated).
Cost predictability during peaks: elasticity is billed via incremental FTE steps and “overconsumption” handling; no defined included buffer, which may reduce predictability and conflicts with the RFP’s preference for built‑in flexibility.
Conditional “budget flexibility” rule (only if no penalties in last 3 months) could cause disputes and may not align with “quality-driven performance” incentives.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing LUCEM - R - 21: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- LUCEM - R - 22
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      2,
      'The proposal acknowledges continuous improvement and automation opportunities and aims to reduce tickets/backlog (e.g., AI/RPA ideas, CSI themes), and it sets governance to review performance. However, it does not commit to periodically assessing productivity gains and translating them into cost reductions when scope and SLAs remain unchanged, as required.
Pricing is built on a base monthly fee plus volume-based “adjustment steps,” with yearly Syntec indexation. There is no explicit mechanism to lower base fees or unit rates as expertise/industrialization/automation improves outcomes. “Budget flexibility” is tied to volume and penalty history, not to gain-sharing from provider-driven efficiencies.


Gaps/Risks:
No contractual commitment to reflect provider productivity gains in price reductions absent scope changes (core requirement).
Upward indexation (Syntec) could increase rates even if productivity improves; no offsetting gain-sharing clause.
No defined method to measure, evidence, and agree benefits (baselines, KPIs, cadence) and translate them into pricing evolution.
Limited articulation of joint analysis of innovation cost consequences and how those will be priced; no sample model or precedent.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 22'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'LUCEM'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 2,
      manual_comment = 'The proposal acknowledges continuous improvement and automation opportunities and aims to reduce tickets/backlog (e.g., AI/RPA ideas, CSI themes), and it sets governance to review performance. However, it does not commit to periodically assessing productivity gains and translating them into cost reductions when scope and SLAs remain unchanged, as required.
Pricing is built on a base monthly fee plus volume-based “adjustment steps,” with yearly Syntec indexation. There is no explicit mechanism to lower base fees or unit rates as expertise/industrialization/automation improves outcomes. “Budget flexibility” is tied to volume and penalty history, not to gain-sharing from provider-driven efficiencies.


Gaps/Risks:
No contractual commitment to reflect provider productivity gains in price reductions absent scope changes (core requirement).
Upward indexation (Syntec) could increase rates even if productivity improves; no offsetting gain-sharing clause.
No defined method to measure, evidence, and agree benefits (baselines, KPIs, cadence) and translate them into pricing evolution.
Limited articulation of joint analysis of innovation cost consequences and how those will be priced; no sample model or precedent.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing LUCEM - R - 22: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ATAWAY - R - 1
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      5,
      'Clear, explicit commitment to full scope coverage
Describes continuous monitoring and alert management with remediation actions to ensure stability
Demonstrates contextual understanding of Accor’s environment and acknowledges specific developments to be validated and supported, showing readiness to align with Accor specifics 
Commits to SOPs and a maintained knowledge base to standardize recurring activities, supporting continuity during closings
Pricing model explicitly includes non-ticket activities, indicating planned capacity for administrative, monitoring, and closing tasks.

Minor gaps:
No detailed mapping of Accor’s listed administrative/closing tasks to Ataway runbooks or RACI yet; samples of SOPs or a task-by-task coverage matrix were not provided.
Evidence of past, similar closing-run playbooks or KPIs tied specifically to month-end activities is referenced generally but not shown.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 1'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ATAWAY'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 5,
      manual_comment = 'Clear, explicit commitment to full scope coverage
Describes continuous monitoring and alert management with remediation actions to ensure stability
Demonstrates contextual understanding of Accor’s environment and acknowledges specific developments to be validated and supported, showing readiness to align with Accor specifics 
Commits to SOPs and a maintained knowledge base to standardize recurring activities, supporting continuity during closings
Pricing model explicitly includes non-ticket activities, indicating planned capacity for administrative, monitoring, and closing tasks.

Minor gaps:
No detailed mapping of Accor’s listed administrative/closing tasks to Ataway runbooks or RACI yet; samples of SOPs or a task-by-task coverage matrix were not provided.
Evidence of past, similar closing-run playbooks or KPIs tied specifically to month-end activities is referenced generally but not shown.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ATAWAY - R - 1: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ATAWAY - R - 2
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      ' Ataway commits to a centralized, continuously updated knowledge base covering L1/L1.5, including common issues, step-by-step procedures, technical workflows, and escalation paths, aligned to Accor standards. They also commit to review, validate, and enrich existing Accor documentation during transition, and confirm all material remains Accor’s property. 
Pledges to work within Accor tooling (ServiceNow, Teams/SharePoint), ensuring traceability and access for both Accor and Ataway staff. 
Extends documentation to monitoring, administrative, and closing tasks with SOPs and traceability. 
Proposes AI-assisted ingestion/structuring of documents and intelligent ticket hashing to surface repeat issues and accelerate reuse of validated solutions.


Gaps/Risks:
No sample SOP/KB templates or taxonomy; no documented content lifecycle (create–review–approve–expire) with update SLAs.
Platform specifics not finalized (e.g., ServiceNow KB vs SharePoint structure, approval workflow, versioning model).
No quantitative targets (e.g., KB article coverage, reuse rate, time-to-publish after RCA)
Did not mention creating missing documentation',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 2'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ATAWAY'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = ' Ataway commits to a centralized, continuously updated knowledge base covering L1/L1.5, including common issues, step-by-step procedures, technical workflows, and escalation paths, aligned to Accor standards. They also commit to review, validate, and enrich existing Accor documentation during transition, and confirm all material remains Accor’s property. 
Pledges to work within Accor tooling (ServiceNow, Teams/SharePoint), ensuring traceability and access for both Accor and Ataway staff. 
Extends documentation to monitoring, administrative, and closing tasks with SOPs and traceability. 
Proposes AI-assisted ingestion/structuring of documents and intelligent ticket hashing to surface repeat issues and accelerate reuse of validated solutions.


Gaps/Risks:
No sample SOP/KB templates or taxonomy; no documented content lifecycle (create–review–approve–expire) with update SLAs.
Platform specifics not finalized (e.g., ServiceNow KB vs SharePoint structure, approval workflow, versioning model).
No quantitative targets (e.g., KB article coverage, reuse rate, time-to-publish after RCA)
Did not mention creating missing documentation',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ATAWAY - R - 2: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ATAWAY - R - 3
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      4,
      'Ataway explicitly supports Option 1  and Option 2, mapped to Bucharest/Paris for EMEA and Mexico City for late-day coverage.
Explicit commitment to J+3–J+4 support until 23:59 CET with dedicated bilingual resources, aligned to Accor’s closure calendar.
Value-adding alternative: Proposes a justified Option 3 (recommended) combining 08:00–21:00 CET plus 09:00–18:00 Mexico to extend coverage into the Americas, with follow-the-sun diagrams and delivery center footprint, however elevance needs to be analyzed.
Flexibility for extra slots: States ability to scale beyond defined windows with standby capacity and to add time slots upon request without disrupting service quality.

Clear linkage to pricing: Option 3 claims +63.6% coverage for ~4.2% incremental cost, demonstrating cost-effectiveness.
Bilingual transition model aligns with language scenarios, supporting high-quality user interactions during extended windows.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 3'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ATAWAY'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 4,
      manual_comment = 'Ataway explicitly supports Option 1  and Option 2, mapped to Bucharest/Paris for EMEA and Mexico City for late-day coverage.
Explicit commitment to J+3–J+4 support until 23:59 CET with dedicated bilingual resources, aligned to Accor’s closure calendar.
Value-adding alternative: Proposes a justified Option 3 (recommended) combining 08:00–21:00 CET plus 09:00–18:00 Mexico to extend coverage into the Americas, with follow-the-sun diagrams and delivery center footprint, however elevance needs to be analyzed.
Flexibility for extra slots: States ability to scale beyond defined windows with standby capacity and to add time slots upon request without disrupting service quality.

Clear linkage to pricing: Option 3 claims +63.6% coverage for ~4.2% incremental cost, demonstrating cost-effectiveness.
Bilingual transition model aligns with language scenarios, supporting high-quality user interactions during extended windows.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ATAWAY - R - 3: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ATAWAY - R - 4
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'Explicitly commits to Scenario 1 (6–12 months) with L1 in English and L1.5 in French, then Scenario 2 with both L1/L1.5 in English; confirms English as governance language. Provides optional Portuguese/Spanish for LATAM. 
States bilingual resources will cover J+3/J+4 closings until 23:59 CET. 
Mentions recruitment criteria for native/fluent proficiency, ongoing training, periodic quality checks, and feedback loops; allows AI aids under human review. 
Paris/Bucharest supply FR/EN; Mexico adds capacity, supporting consistent language coverage across windows. 


Gaps/Risks:
No formalized proficiency framework (e.g., CEFR levels, test types, pass marks, re‑testing cadence).
No quantitative language KPIs (e.g., language-specific CSAT, QA pass rate) or SLAs for response quality by language/channel.
“AI tools to support understanding” could mask partial bilingual coverage unless bounded; ensure French proficiency for all L1.5 agents during Scenario 1.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 4'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ATAWAY'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'Explicitly commits to Scenario 1 (6–12 months) with L1 in English and L1.5 in French, then Scenario 2 with both L1/L1.5 in English; confirms English as governance language. Provides optional Portuguese/Spanish for LATAM. 
States bilingual resources will cover J+3/J+4 closings until 23:59 CET. 
Mentions recruitment criteria for native/fluent proficiency, ongoing training, periodic quality checks, and feedback loops; allows AI aids under human review. 
Paris/Bucharest supply FR/EN; Mexico adds capacity, supporting consistent language coverage across windows. 


Gaps/Risks:
No formalized proficiency framework (e.g., CEFR levels, test types, pass marks, re‑testing cadence).
No quantitative language KPIs (e.g., language-specific CSAT, QA pass rate) or SLAs for response quality by language/channel.
“AI tools to support understanding” could mask partial bilingual coverage unless bounded; ensure French proficiency for all L1.5 agents during Scenario 1.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ATAWAY - R - 4: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ATAWAY - R - 5
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'Clearly defined multi-regional model: Bucharest (primary nearshore EMEA), Paris (governance and proximity to Accor), Mexico City (late CET overlap and Americas), optional São Paulo (Brazil expertise), with scalable extension to APAC via Malaysia/Shanghai. 
Explicit mapping to Option 1  and Option 2, plus  Option 3 for broader coverage. Language plan matches Scenario 1 (L1 EN / L1.5 FR) and Scenario 2 (EN for both), with optional Portuguese/Spanish for LATAM.
Geographic redundancy, follow-the-sun alignment, standby/bench capacity, predefined volume bands, and a “continuous improvement buffer” to absorb peaks
Operates in Accor’s ServiceNow and collaboration tools; governance and reporting structure; bilingual support during closings; knowledge/SOP ownership processes.
Footprint justified on time zone fit, bilingual talent pools, and cost efficiency; optional Brazil resource and APAC scale-up show willingness to adapt to Accor’s location preferences; proposal states openness to refine terms.


Gaps/Risks:
Lacks staffing detail per window (seat count, skill/language mix, seniority) and a formal BCP/DR plan for site outages.
No explicit mapping to Accor’s target workflows (e.g., dispatcher/triage role vs. request flow) or a runbook-level RACI tied to those workflows.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 5'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ATAWAY'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'Clearly defined multi-regional model: Bucharest (primary nearshore EMEA), Paris (governance and proximity to Accor), Mexico City (late CET overlap and Americas), optional São Paulo (Brazil expertise), with scalable extension to APAC via Malaysia/Shanghai. 
Explicit mapping to Option 1  and Option 2, plus  Option 3 for broader coverage. Language plan matches Scenario 1 (L1 EN / L1.5 FR) and Scenario 2 (EN for both), with optional Portuguese/Spanish for LATAM.
Geographic redundancy, follow-the-sun alignment, standby/bench capacity, predefined volume bands, and a “continuous improvement buffer” to absorb peaks
Operates in Accor’s ServiceNow and collaboration tools; governance and reporting structure; bilingual support during closings; knowledge/SOP ownership processes.
Footprint justified on time zone fit, bilingual talent pools, and cost efficiency; optional Brazil resource and APAC scale-up show willingness to adapt to Accor’s location preferences; proposal states openness to refine terms.


Gaps/Risks:
Lacks staffing detail per window (seat count, skill/language mix, seniority) and a formal BCP/DR plan for site outages.
No explicit mapping to Accor’s target workflows (e.g., dispatcher/triage role vs. request flow) or a runbook-level RACI tied to those workflows.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ATAWAY - R - 5: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ATAWAY - R - 6
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'Describes a concrete elasticity model purpose-built for peaks (month-end/fiscal): predefined volume bands, a “continuous improvement buffer” to utilize low-activity time, and standby bench capacity in Bucharest and LATAM for short-term surges. Example given of scaling +30% within 72 hours using bench/shared resources. 
Explicitly commits to a trained standby pool and shared-resource activation, with quality/SLA safeguards. 
No extra cost for typical peaks: States bench activation without cost adjustments for short-term surges; adjustments only if sustained activation is required or volumes exceed agreed thresholds. This aligns with absorbing normal month-end peaks as part of the base service. 
Scalability is embedded via tiered per-ticket pricing with volume bands and a defined non-ticket workload uplift, minimizing renegotiations and aligning cost to actual usage while covering elasticity. 
 
 
Gaps/Risks:
“No additional costs” not stated unambiguously for all closure peaks; language allows cost adjustments for “sustained” activation or beyond thresholds. Define “sustained” and what constitutes normal peak vs. out-of-scope surge.
Bench size, activation SLAs, cross-training depth, and maximum burst capacity are not quantified.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 6'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ATAWAY'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'Describes a concrete elasticity model purpose-built for peaks (month-end/fiscal): predefined volume bands, a “continuous improvement buffer” to utilize low-activity time, and standby bench capacity in Bucharest and LATAM for short-term surges. Example given of scaling +30% within 72 hours using bench/shared resources. 
Explicitly commits to a trained standby pool and shared-resource activation, with quality/SLA safeguards. 
No extra cost for typical peaks: States bench activation without cost adjustments for short-term surges; adjustments only if sustained activation is required or volumes exceed agreed thresholds. This aligns with absorbing normal month-end peaks as part of the base service. 
Scalability is embedded via tiered per-ticket pricing with volume bands and a defined non-ticket workload uplift, minimizing renegotiations and aligning cost to actual usage while covering elasticity. 
 
 
Gaps/Risks:
“No additional costs” not stated unambiguously for all closure peaks; language allows cost adjustments for “sustained” activation or beyond thresholds. Define “sustained” and what constitutes normal peak vs. out-of-scope surge.
Bench size, activation SLAs, cross-training depth, and maximum burst capacity are not quantified.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ATAWAY - R - 6: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ATAWAY - R - 7
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'Proven R12.2 exposure in multinational contexts: Cites 20+ years supporting Oracle and a global EBS R12.2.5 rollout/support for Edenred across 26 countries, demonstrating scale and complexity handling.
Acknowledges Accor’s modules and Brazil-specific needs; proposes optional Brazil hub for complex tax/localization, showing awareness of functional specifics.
Describes ServiceNow-integrated triage, functional diagnostics, smart categorization, and escalation practices; emphasizes ability to distinguish functional vs technical issues and route appropriately.
Qualified workforce and enablement: States “50+ Oracle-certified resources,” Oracle Partner since 2003, access to Oracle product updates/roadmaps and escalation channels; specialized EBS hubs (Bucharest, Mexico), not a generic call center.


Gaps/Risks:
Does not quantify the number of EBS-dedicated consultants globally nor break down by delivery center (Bucharest, Paris, Mexico) as requested.
Certification detail: “50+ Oracle-certified resources” is broad; lacks specific EBS R12 certifications (e.g., Financials, SCM) and counts per domain.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 7'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ATAWAY'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'Proven R12.2 exposure in multinational contexts: Cites 20+ years supporting Oracle and a global EBS R12.2.5 rollout/support for Edenred across 26 countries, demonstrating scale and complexity handling.
Acknowledges Accor’s modules and Brazil-specific needs; proposes optional Brazil hub for complex tax/localization, showing awareness of functional specifics.
Describes ServiceNow-integrated triage, functional diagnostics, smart categorization, and escalation practices; emphasizes ability to distinguish functional vs technical issues and route appropriately.
Qualified workforce and enablement: States “50+ Oracle-certified resources,” Oracle Partner since 2003, access to Oracle product updates/roadmaps and escalation channels; specialized EBS hubs (Bucharest, Mexico), not a generic call center.


Gaps/Risks:
Does not quantify the number of EBS-dedicated consultants globally nor break down by delivery center (Bucharest, Paris, Mexico) as requested.
Certification detail: “50+ Oracle-certified resources” is broad; lacks specific EBS R12 certifications (e.g., Financials, SCM) and counts per domain.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ATAWAY - R - 7: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ATAWAY - R - 11
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'Commits to Weekly snapshots (ticket volumes, backlog, SLA compliance, corrective actions), Monthly Service Performance Reports (SLA/KPI compliance by category, trend/RCA, improvement plans), and Quarterly Executive Dashboards (aggregated trends, productivity gains, automation impact). 
Lists core KPIs (SLA per severity, average response/resolution times, FCR, escalation rate, volume trends by category/module/geo, CSAT when available) and daily alerts on SLA breaches. Backlog is explicitly tracked in the weekly snapshot and monthly reports.
Will build reporting from Accor’s ServiceNow and complement with automated Power BI dashboards (daily refresh, near real-time accuracy, secure online access). Ad hoc reports supported via ServiceNow/BI.
Provides example dashboard content (Power BI for operational KPIs, trends, SLA performance analysis) meeting the “examples must be included” ask.
  
Gaps/Risks:
Not all RFP KPIs are explicitly covered. Some are implied but not formally committed.
KPI definitions and calculation rules (e.g., business-hours clocks vs calendar, pause rules, inclusion/exclusion) are not fully specified.
Dashboard samples are described but not  detailed (no mock-ups with fields/filters/drilldowns).',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 11'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ATAWAY'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'Commits to Weekly snapshots (ticket volumes, backlog, SLA compliance, corrective actions), Monthly Service Performance Reports (SLA/KPI compliance by category, trend/RCA, improvement plans), and Quarterly Executive Dashboards (aggregated trends, productivity gains, automation impact). 
Lists core KPIs (SLA per severity, average response/resolution times, FCR, escalation rate, volume trends by category/module/geo, CSAT when available) and daily alerts on SLA breaches. Backlog is explicitly tracked in the weekly snapshot and monthly reports.
Will build reporting from Accor’s ServiceNow and complement with automated Power BI dashboards (daily refresh, near real-time accuracy, secure online access). Ad hoc reports supported via ServiceNow/BI.
Provides example dashboard content (Power BI for operational KPIs, trends, SLA performance analysis) meeting the “examples must be included” ask.
  
Gaps/Risks:
Not all RFP KPIs are explicitly covered. Some are implied but not formally committed.
KPI definitions and calculation rules (e.g., business-hours clocks vs calendar, pause rules, inclusion/exclusion) are not fully specified.
Dashboard samples are described but not  detailed (no mock-ups with fields/filters/drilldowns).',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ATAWAY - R - 11: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ATAWAY - R - 8
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'States Oracle support teams maintain an average annual turnover below 14% (company metric).
Confirms team is primarily full-time employees; subcontractors used only for temporary coverage or specific skills/languages.
Describes structured onboarding (Oracle EBS training, Accor tool induction, shadowing, access to internal KB/SOPs).
Details long-term assignments, performance reviews, continuous skill-building, comprehensive benefits (wellness, flexible vacations, language training, connectivity support), and engagement surveys aligned with Best Place to Work benchmarks.


Gaps/Risks:
Turnover metric is global/average; not specific to L1 roles nor per hub (Bucharest, Mexico, Paris).
No quantified backfill SLAs (e.g., replacement within X business days) or minimum overlap periods for leavers.
Limited quantification of subcontractor usage (% cap) and succession planning for key roles (SDM, team leads).',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 8'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ATAWAY'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'States Oracle support teams maintain an average annual turnover below 14% (company metric).
Confirms team is primarily full-time employees; subcontractors used only for temporary coverage or specific skills/languages.
Describes structured onboarding (Oracle EBS training, Accor tool induction, shadowing, access to internal KB/SOPs).
Details long-term assignments, performance reviews, continuous skill-building, comprehensive benefits (wellness, flexible vacations, language training, connectivity support), and engagement surveys aligned with Best Place to Work benchmarks.


Gaps/Risks:
Turnover metric is global/average; not specific to L1 roles nor per hub (Bucharest, Mexico, Paris).
No quantified backfill SLAs (e.g., replacement within X business days) or minimum overlap periods for leavers.
Limited quantification of subcontractor usage (% cap) and succession planning for key roles (SDM, team leads).',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ATAWAY - R - 8: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ATAWAY - R - 9
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'Ataway describes both the Account Manager (commercial owner, strategic escalation, steering participation, contract health) and the Service Delivery Manager (daily operations oversight, KPI/SLA reporting, issue/quality management, continuous improvement, planning/team management). SDM kept independent from day-to-day ticket handling for objective oversight.
Clear chain of command articulated: Support Analysts → Team Leads → SDM → Account Manager → Executive Steering Committee. Paris is positioned as a governance hub, aligning with Accor proximity needs.
Full adherence to RFP governance cadence (weekly ops, monthly service reviews, quarterly steering). Provides RACI/RASCI approach and an explicit escalation process outside scheduled meetings for urgent issues. Committees, deliverables, and escalation paths are described.


Gaps/Risks:
SDM physical location and cultural/geographical proximity are implied (Paris hub) but not explicitly committed.
No named AM/SDM, deputies, or coverage plan for absences; no time-allocation/dedication levels.
No visual org chart with contact matrix; no escalation SLAs (e.g., response within X hours).',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 9'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ATAWAY'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'Ataway describes both the Account Manager (commercial owner, strategic escalation, steering participation, contract health) and the Service Delivery Manager (daily operations oversight, KPI/SLA reporting, issue/quality management, continuous improvement, planning/team management). SDM kept independent from day-to-day ticket handling for objective oversight.
Clear chain of command articulated: Support Analysts → Team Leads → SDM → Account Manager → Executive Steering Committee. Paris is positioned as a governance hub, aligning with Accor proximity needs.
Full adherence to RFP governance cadence (weekly ops, monthly service reviews, quarterly steering). Provides RACI/RASCI approach and an explicit escalation process outside scheduled meetings for urgent issues. Committees, deliverables, and escalation paths are described.


Gaps/Risks:
SDM physical location and cultural/geographical proximity are implied (Paris hub) but not explicitly committed.
No named AM/SDM, deputies, or coverage plan for absences; no time-allocation/dedication levels.
No visual org chart with contact matrix; no escalation SLAs (e.g., response within X hours).',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ATAWAY - R - 9: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ATAWAY - R - 10
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'Explicitly confirms full adherence to Accor’s minimum governance structure and participation in required committees.
Committees defined with cadence and participants
Clear escalation path beyond calendar meetings; issues can be escalated immediately. Provides a RASCI/RACI framework to be finalized during transition.
Reporting alignment: Weekly, monthly, and quarterly reporting models align with governance rhythm and are supported by automated dashboards.


Gaps/Risks:
Daily review during closing periods is not explicitly listed as a standing committee (RFP requires daily closing-period meetings).
RACI/RASCI is outlined but not delivered as a completed, role-mapped matrix.
Participant titles differ slightly from RFP (e.g., “Accor ITSM” vs Product Owner/Manager); mapping is implied, not explicit.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 10'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ATAWAY'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'Explicitly confirms full adherence to Accor’s minimum governance structure and participation in required committees.
Committees defined with cadence and participants
Clear escalation path beyond calendar meetings; issues can be escalated immediately. Provides a RASCI/RACI framework to be finalized during transition.
Reporting alignment: Weekly, monthly, and quarterly reporting models align with governance rhythm and are supported by automated dashboards.


Gaps/Risks:
Daily review during closing periods is not explicitly listed as a standing committee (RFP requires daily closing-period meetings).
RACI/RASCI is outlined but not delivered as a completed, role-mapped matrix.
Participant titles differ slightly from RFP (e.g., “Accor ITSM” vs Product Owner/Manager); mapping is implied, not explicit.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ATAWAY - R - 10: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ATAWAY - R - 13
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'Defines a structured ITIL-aligned cycle (Measure → Analyze → Improve → Review) with monthly/quarterly reviews.
Root-cause focus and action plans: Commits to quarterly deep-dives on top 10 recurring incidents with elimination plans and to updating SOP/KB after confirmed improvements.
Positions CSI to drive automation, standardization, and knowledge enrichment; integrates RCA summaries and improvement proposals into monthly reports.
States a CSI register with owners, deadlines, and success criteria; reviews in monthly service meetings and quarterly steering.
Measurable targets: Targets +10% FCR and 5–10% faster resolution via CSI/automation.
Links CSI outcomes to pricing/productivity reviews; proposes AI/RPA (triage, clustering, KB suggestions) to reduce recurrence and handling time.
 
Gaps/Risks:
No sample artifacts (CSI register template, RCA report, problem record), nor time-bound SLAs to implement corrective actions.
No explicit baseline/targets for recurrence rate reduction, proactive ticket creation, backlog aging, or automation/self-resolution rate.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 13'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ATAWAY'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'Defines a structured ITIL-aligned cycle (Measure → Analyze → Improve → Review) with monthly/quarterly reviews.
Root-cause focus and action plans: Commits to quarterly deep-dives on top 10 recurring incidents with elimination plans and to updating SOP/KB after confirmed improvements.
Positions CSI to drive automation, standardization, and knowledge enrichment; integrates RCA summaries and improvement proposals into monthly reports.
States a CSI register with owners, deadlines, and success criteria; reviews in monthly service meetings and quarterly steering.
Measurable targets: Targets +10% FCR and 5–10% faster resolution via CSI/automation.
Links CSI outcomes to pricing/productivity reviews; proposes AI/RPA (triage, clustering, KB suggestions) to reduce recurrence and handling time.
 
Gaps/Risks:
No sample artifacts (CSI register template, RCA report, problem record), nor time-bound SLAs to implement corrective actions.
No explicit baseline/targets for recurrence rate reduction, proactive ticket creation, backlog aging, or automation/self-resolution rate.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ATAWAY - R - 13: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ATAWAY - R - 14
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'Proposes concrete AI/automation capabilities applicable to support operations: AI-powered triage, clustering, SLA forecasting; GenAI “AI‑Support Agent” with RAG knowledge ingestion; automated KB enrichment; Power BI automated reporting; and mature RPA partnerships with examples relevant to L1/L1.5
States continuous trend monitoring, jointly prioritizing initiatives via governance, and embedding CSI with automation as a lever.
Defines a “Cost Reduction Index” methodology tying hours saved to cost adjustments and a savings-sharing model; lists benchmark impacts (e.g., 20–30% faster first responses, up to 30% higher agent productivity).
Provides applicable automation candidates for Accor’s scope (interface monitoring, access requests, closing/reporting automation) and proposes to extend existing RPA used by Accor.

Gaps/Risks:
Limited REX: No named client case studies with quantified before/after results for AI/RPA in a similar Oracle EBS L1/L1.5 context.
AI roadmap is implicit  but not a formal phased roadmap with timeline, milestones, and guardrails 
Several AI/RPA initiatives “to be quoted separately,” which may dilute the expectation of proactively delivering measurable gains during run unless scoped early.
Benefits are benchmarked but not committed to specific, trackable targets (e.g., % self-resolution, deflection, SLA uplift) for year 1.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 14'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ATAWAY'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'Proposes concrete AI/automation capabilities applicable to support operations: AI-powered triage, clustering, SLA forecasting; GenAI “AI‑Support Agent” with RAG knowledge ingestion; automated KB enrichment; Power BI automated reporting; and mature RPA partnerships with examples relevant to L1/L1.5
States continuous trend monitoring, jointly prioritizing initiatives via governance, and embedding CSI with automation as a lever.
Defines a “Cost Reduction Index” methodology tying hours saved to cost adjustments and a savings-sharing model; lists benchmark impacts (e.g., 20–30% faster first responses, up to 30% higher agent productivity).
Provides applicable automation candidates for Accor’s scope (interface monitoring, access requests, closing/reporting automation) and proposes to extend existing RPA used by Accor.

Gaps/Risks:
Limited REX: No named client case studies with quantified before/after results for AI/RPA in a similar Oracle EBS L1/L1.5 context.
AI roadmap is implicit  but not a formal phased roadmap with timeline, milestones, and guardrails 
Several AI/RPA initiatives “to be quoted separately,” which may dilute the expectation of proactively delivering measurable gains during run unless scoped early.
Benefits are benchmarked but not committed to specific, trackable targets (e.g., % self-resolution, deflection, SLA uplift) for year 1.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ATAWAY - R - 14: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ATAWAY - R - 18
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      2.5,
      'Ataway outlines all required steps within a structured “Initiation → Transition → Execution → Reversibility” framework. They describe activities, governance checkpoints, and weekly monitoring during transition.
They provide indicative timelines, including a 2‑week Initiation phase to build the transition plan and a detailed Transition phase with shadowing/reverse shadowing and ownership transfer.
A dedicated risk management approach is provided (risk register, mitigation/contingency, continuous monitoring), with examples of typical risks and mitigations.
Transition costs are itemized (Initiation €31k fixed; Transition €359.8k fixed

Gaps/Risks:
Duration misalignment: Accor expects a 3‑month transition; Ataway proposes 5 months. They note it could be reduced depending on documentation/incumbent availability, but there is no firm commitment to meet 3 months.
The response does not provide a granular resource plan for transition (named roles by phase, FTEs per stream, language coverage during shadowing/reverse shadowing).',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 18'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ATAWAY'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 2.5,
      manual_comment = 'Ataway outlines all required steps within a structured “Initiation → Transition → Execution → Reversibility” framework. They describe activities, governance checkpoints, and weekly monitoring during transition.
They provide indicative timelines, including a 2‑week Initiation phase to build the transition plan and a detailed Transition phase with shadowing/reverse shadowing and ownership transfer.
A dedicated risk management approach is provided (risk register, mitigation/contingency, continuous monitoring), with examples of typical risks and mitigations.
Transition costs are itemized (Initiation €31k fixed; Transition €359.8k fixed

Gaps/Risks:
Duration misalignment: Accor expects a 3‑month transition; Ataway proposes 5 months. They note it could be reduced depending on documentation/incumbent availability, but there is no firm commitment to meet 3 months.
The response does not provide a granular resource plan for transition (named roles by phase, FTEs per stream, language coverage during shadowing/reverse shadowing).',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ATAWAY - R - 18: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ATAWAY - R - 19
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      4,
      'Ataway details a structured risk framework covering proactive identification, probability/impact assessment, mitigation planning, contingency/fallback procedures, and continuous monitoring with a jointly maintained Risk Register.
Highlights key transition risks and controls (timely knowledge transfer, SLA compliance during cutover, avoiding single points of failure in staffing/tool access).
Commits to reviewing risks in weekly operational meetings and monthly governance forums, ensuring visibility and timely decisions.


Gaps/Risks:
Contingency plans are described generically; no playbooks for top risks (e.g., missed KT, peak-period disruption, access delays).
No explicit reporting SLAs (e.g., weekly risk report by T+1, daily risk huddles during cutover), nor named Transition Risk Manager.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 19'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ATAWAY'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 4,
      manual_comment = 'Ataway details a structured risk framework covering proactive identification, probability/impact assessment, mitigation planning, contingency/fallback procedures, and continuous monitoring with a jointly maintained Risk Register.
Highlights key transition risks and controls (timely knowledge transfer, SLA compliance during cutover, avoiding single points of failure in staffing/tool access).
Commits to reviewing risks in weekly operational meetings and monthly governance forums, ensuring visibility and timely decisions.


Gaps/Risks:
Contingency plans are described generically; no playbooks for top risks (e.g., missed KT, peak-period disruption, access delays).
No explicit reporting SLAs (e.g., weekly risk report by T+1, daily risk huddles during cutover), nor named Transition Risk Manager.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ATAWAY - R - 19: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ATAWAY - R - 20
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'Ataway outlines a reversibility phase with the required activities: knowledge transfer to Accor/new provider, reverse shadowing, backlog review/reassignment, gradual capacity ramp‑down, and final handover. They state SLAs will continue to be monitored.
Commits to a 6‑month reversibility period and is open to shorter duration if aligned with the receiver, matching “up to six (6) months.”
Provides a fixed price for a 6‑month reversibility phase (€324,700)
	 
Gaps/Risks:	 
Penalties during reversibility: Proposal states penalties/bonuses stop once reversibility starts, while the RFP expects full obligations and performance levels to remain applicable during the reversibility period. This is a misalignment to clarify.
Missing plan details: No comprehensive Reversibility Plan covering scope, RACI, governance cadence, milestones, success/acceptance criteria, and reporting.
Data handling: No explicit commitment to data management and deletion within 30 days post‑termination, nor certificate of destruction.
Documentation inventory: No detailed list-based handover (documentation, SOPs, KB, access matrices) with version control and acceptance checklist.
Cost transparency: Lump‑sum price provided, but no breakdown by activities (KT sessions, documentation updates, training, overlap coverage), roles/FTEs, or assumptions.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 20'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ATAWAY'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'Ataway outlines a reversibility phase with the required activities: knowledge transfer to Accor/new provider, reverse shadowing, backlog review/reassignment, gradual capacity ramp‑down, and final handover. They state SLAs will continue to be monitored.
Commits to a 6‑month reversibility period and is open to shorter duration if aligned with the receiver, matching “up to six (6) months.”
Provides a fixed price for a 6‑month reversibility phase (€324,700)
	 
Gaps/Risks:	 
Penalties during reversibility: Proposal states penalties/bonuses stop once reversibility starts, while the RFP expects full obligations and performance levels to remain applicable during the reversibility period. This is a misalignment to clarify.
Missing plan details: No comprehensive Reversibility Plan covering scope, RACI, governance cadence, milestones, success/acceptance criteria, and reporting.
Data handling: No explicit commitment to data management and deletion within 30 days post‑termination, nor certificate of destruction.
Documentation inventory: No detailed list-based handover (documentation, SOPs, KB, access matrices) with version control and acceptance checklist.
Cost transparency: Lump‑sum price provided, but no breakdown by activities (KT sessions, documentation updates, training, overlap coverage), roles/FTEs, or assumptions.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ATAWAY - R - 20: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ATAWAY - R - 21
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      2.5,
      'Presents clear Euro pricing with three coverage options, a per-ticket banded model tied to actual volumes, and a fixed uplift for non‑ticket workload.
Volume bands (4,800–7,000; >7,001) and thresholds allow scaling without constant renegotiation; elasticity is embedded in the model and operational design (bench/shared resources).
Links pricing to performance through SLA reporting and a proposed credit/bonus scheme and ties innovation/productivity gains to cost reductions via a “Cost Reduction Index” and savings-sharing mechanism.
Options explicitly cover extended CET windows plus Mexico overlap; pricing is in EUR excl. VAT and accounts for the broader footprint.
Year-1 review: Commits to annual review (e.g., non‑ticket uplift recalibration), indicating willingness to adjust the model to observed activity and maturity.

Gaps/Risks:
Cost breakdown not fully granular: does not itemize human resources vs. service management overhead, tooling, training, and KB maintenance as distinct lines.
Threshold mechanics: ±20% variance and non‑ticket baseline could trigger price adjustments; need to ensure typical month‑end peaks are covered without extra charges.
“Quality-driven” linkage: SLA credit/bonus model deviates from Accor’s penalty framework; alignment will be needed to avoid conflicting incentives.
First‑year review: Mentioned generally (annual), but not explicitly committed as a formal end‑of‑year recalibration against productivity gains and KPI outcomes.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 21'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ATAWAY'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 2.5,
      manual_comment = 'Presents clear Euro pricing with three coverage options, a per-ticket banded model tied to actual volumes, and a fixed uplift for non‑ticket workload.
Volume bands (4,800–7,000; >7,001) and thresholds allow scaling without constant renegotiation; elasticity is embedded in the model and operational design (bench/shared resources).
Links pricing to performance through SLA reporting and a proposed credit/bonus scheme and ties innovation/productivity gains to cost reductions via a “Cost Reduction Index” and savings-sharing mechanism.
Options explicitly cover extended CET windows plus Mexico overlap; pricing is in EUR excl. VAT and accounts for the broader footprint.
Year-1 review: Commits to annual review (e.g., non‑ticket uplift recalibration), indicating willingness to adjust the model to observed activity and maturity.

Gaps/Risks:
Cost breakdown not fully granular: does not itemize human resources vs. service management overhead, tooling, training, and KB maintenance as distinct lines.
Threshold mechanics: ±20% variance and non‑ticket baseline could trigger price adjustments; need to ensure typical month‑end peaks are covered without extra charges.
“Quality-driven” linkage: SLA credit/bonus model deviates from Accor’s penalty framework; alignment will be needed to avoid conflicting incentives.
First‑year review: Mentioned generally (annual), but not explicitly committed as a formal end‑of‑year recalibration against productivity gains and KPI outcomes.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ATAWAY - R - 21: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- ATAWAY - R - 22
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      0,
      'Ataway commits to measuring productivity gains (e.g., resolution-time reduction, backlog reduction, automation coverage) and translating them into cost reductions via an explicit formula: Cost Adjustment = Base Cost − (Hours Saved × Hourly Rate × Share Factor). They also commit to an annual review to recalibrate non‑ticket uplift and overall pricing to align with observed activity and maturity.
Proposes to review innovation/automation impacts in monthly/quarterly governance and QBRs
Plans to quantify and present realized gains in dashboards (time saved, ticket reduction, automation impact) and reflect them in pricing, including a “Cost Reduction Index” and savings-sharing rules.
Provides an innovation pipeline (AI/RPA for triage, routing, KB enrichment, interface monitoring, closing/reporting automation) that underpins productivity improvements.
	 
	 
Gaps/Risks:
Share model misalignment risk: Proposed “Share Factor” (70% if Accor funds, 20% if Ataway funds) and “50% reinvest/50% not invoiced” rule may not fully meet Accor’s expectation that productivity gains result in price reductions irrespective of who funds the initiative.
Commitment strength: Annual review is stated, but reductions are not explicitly guaranteed beyond the proposed sharing mechanism; no minimum reduction thresholds.
Evidence baseline: No starting baseline and target ranges (e.g., % MTTR decrease, % ticket deflection) tied to committed cost adjustments.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 22'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'ATAWAY'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 0,
      manual_comment = 'Ataway commits to measuring productivity gains (e.g., resolution-time reduction, backlog reduction, automation coverage) and translating them into cost reductions via an explicit formula: Cost Adjustment = Base Cost − (Hours Saved × Hourly Rate × Share Factor). They also commit to an annual review to recalibrate non‑ticket uplift and overall pricing to align with observed activity and maturity.
Proposes to review innovation/automation impacts in monthly/quarterly governance and QBRs
Plans to quantify and present realized gains in dashboards (time saved, ticket reduction, automation impact) and reflect them in pricing, including a “Cost Reduction Index” and savings-sharing rules.
Provides an innovation pipeline (AI/RPA for triage, routing, KB enrichment, interface monitoring, closing/reporting automation) that underpins productivity improvements.
	 
	 
Gaps/Risks:
Share model misalignment risk: Proposed “Share Factor” (70% if Accor funds, 20% if Ataway funds) and “50% reinvest/50% not invoiced” rule may not fully meet Accor’s expectation that productivity gains result in price reductions irrespective of who funds the initiative.
Commitment strength: Annual review is stated, but reductions are not explicitly guaranteed beyond the proposed sharing mechanism; no minimum reduction thresholds.
Evidence baseline: No starting baseline and target ranges (e.g., % MTTR decrease, % ticket deflection) tied to committed cost adjustments.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing ATAWAY - R - 22: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- PREREQUIS - R - 1
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      5,
      'PREREQUIS states it “includes SPOON as a sub‑contractor to offer Accor a full commitment to deliver the full scope of L1 et L1.5 support activities and recurring and identified monitoring, administrative, and closing tasks”. The service model reiterates scope “including recurring tasks (monitoring, administrative and closing activities)” 
Operational phase “Key activities” explicitly list Administrative activities and Closing activities, plus preventive analysis and daily status reporting. 
They commit to preventive actions and continuous improvement; proposed RPA/AI use cases include automating closing reports, checking integration flows, and ticket pre‑population—supporting remediation from monitoring alerts
Reporting generated from ServiceNow/Jira/other Accor tools;


Gaps/Risks:
No one‑to‑one acceptance mapping to each RFP-listed monitoring/admin/closing task, could leave scope interpretation open.
“Identified” in “recurring and identified monitoring…” could be read narrowly; ',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 1'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'PREREQUIS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 5,
      manual_comment = 'PREREQUIS states it “includes SPOON as a sub‑contractor to offer Accor a full commitment to deliver the full scope of L1 et L1.5 support activities and recurring and identified monitoring, administrative, and closing tasks”. The service model reiterates scope “including recurring tasks (monitoring, administrative and closing activities)” 
Operational phase “Key activities” explicitly list Administrative activities and Closing activities, plus preventive analysis and daily status reporting. 
They commit to preventive actions and continuous improvement; proposed RPA/AI use cases include automating closing reports, checking integration flows, and ticket pre‑population—supporting remediation from monitoring alerts
Reporting generated from ServiceNow/Jira/other Accor tools;


Gaps/Risks:
No one‑to‑one acceptance mapping to each RFP-listed monitoring/admin/closing task, could leave scope interpretation open.
“Identified” in “recurring and identified monitoring…” could be read narrowly; ',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing PREREQUIS - R - 1: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- PREREQUIS - R - 2
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'Centralized KB and continuous updates are addressed, to be translated and maintained, and list “up‑to‑date documentation” as a run deliverable.
Alignment with Accor standards is explicit, with a formal QAP section for “Document Management & Standards” and “Escalation Procedure” 
Commit to maintaining Accor-provided documentation, improving procedures, and using Accor tools and shared spaces
The launch/initialization phase establishes procedures/tools and knowledge transfer; the operational phase explicitly states maintaining documentation previously provided by Accor, implying review/update early in the engagement


Gaps/Risks:
KB governance not detailed (article templates, approval lifecycle, periodic review cadence, KPIs such as reuse/deflection).
Transition phase does not explicitly state “review and validate” all existing Accor documentation;
Not explicitly confirming that all support process docs (including escalation paths) will live in a single centralized KB with versioning and audit trail.
No concrete examples of step‑by‑step procedures or technical resolution workflows included in the proposal.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 2'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'PREREQUIS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'Centralized KB and continuous updates are addressed, to be translated and maintained, and list “up‑to‑date documentation” as a run deliverable.
Alignment with Accor standards is explicit, with a formal QAP section for “Document Management & Standards” and “Escalation Procedure” 
Commit to maintaining Accor-provided documentation, improving procedures, and using Accor tools and shared spaces
The launch/initialization phase establishes procedures/tools and knowledge transfer; the operational phase explicitly states maintaining documentation previously provided by Accor, implying review/update early in the engagement


Gaps/Risks:
KB governance not detailed (article templates, approval lifecycle, periodic review cadence, KPIs such as reuse/deflection).
Transition phase does not explicitly state “review and validate” all existing Accor documentation;
Not explicitly confirming that all support process docs (including escalation paths) will live in a single centralized KB with versioning and audit trail.
No concrete examples of step‑by‑step procedures or technical resolution workflows included in the proposal.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing PREREQUIS - R - 2: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- PREREQUIS - R - 3
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'Explicit commitment to both coverage options
Mandatory closure coverage confirmed
Operationalization for peaks: “closing war-room,” capacity ramp-up, daily reviews, P1/P2 focus, and bench/stand-by pool to ensure continuity during extended hours 

Gaps/Risks:
“Additional time slot upon request” not stated as a formal commitment with an activation SLA (though bench/war-room suggest feasibility).
No alternative coverage proposal offered or justification (not required but permitted)',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 3'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'PREREQUIS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'Explicit commitment to both coverage options
Mandatory closure coverage confirmed
Operationalization for peaks: “closing war-room,” capacity ramp-up, daily reviews, P1/P2 focus, and bench/stand-by pool to ensure continuity during extended hours 

Gaps/Risks:
“Additional time slot upon request” not stated as a formal commitment with an activation SLA (though bench/war-room suggest feasibility).
No alternative coverage proposal offered or justification (not required but permitted)',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing PREREQUIS - R - 3: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- PREREQUIS - R - 4
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'Bilingual delivery teams are stated (Mauritius) and local leadership in France supports communication. They also plan to translate and maintain the centralized knowledge repository during the language transition 
Workforce selection includes “dual validation … bilingual” and continuous training, implying some screening and upkeep of language skills.

Gaps/Risks:
Limited detail on how language proficiency is assessed and maintained (no test criteria, CEFR levels, audit cadence, or communication-quality KPIs).',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 4'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'PREREQUIS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'Bilingual delivery teams are stated (Mauritius) and local leadership in France supports communication. They also plan to translate and maintain the centralized knowledge repository during the language transition 
Workforce selection includes “dual validation … bilingual” and continuous training, implying some screening and upkeep of language skills.

Gaps/Risks:
Limited detail on how language proficiency is assessed and maintained (no test criteria, CEFR levels, audit cadence, or communication-quality KPIs).',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing PREREQUIS - R - 4: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- PREREQUIS - R - 5
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'Hybrid nearshore–offshore setup with local leadership/governance in France (SDM + Support Functional Lead + Account Manager) and a dedicated L1/L1.5 delivery center in Mauritius split into two regional cells (Americas; Europe/North Africa). Bench/stand-by pool and shadow SDMs ensure continuity and elasticity.
Explicit commitment to Option 1  and Option 2 plus D+3/D+4 to 23:59; bilingual delivery with ability to run Scenario 1 (L1 EN, L1.5 FR) and Scenario 2 (EN for both).
Governance, use of Accor tooling (ServiceNow/Jira), reporting/KPI/SLA framework, and inclusion of recurring administrative/monitoring/closing tasks in scope.
Capacity-based planning on ServiceNow volumes and closing calendar, closing “war-room,” and a pre-trained bench to absorb peaks or backfill.
Local proximity for governance/escalation and decision-making; Mauritius center for cost efficiency, bilingual coverage, extended hours, and peak absorption.

Gaps/Risks:
Limited detail on business continuity/DR for the Mauritius center (alternative sites, failover plan) and on handoff mechanics across shifts/DST.
Footprint justification is qualitative; lacks comparative options or nearshore backup rationale.
Operating model description is strong at a high level but could include a clearer crosswalk to each operational/technical requirement and more detailed SOPs for L1/L1.5 workflows.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 5'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'PREREQUIS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'Hybrid nearshore–offshore setup with local leadership/governance in France (SDM + Support Functional Lead + Account Manager) and a dedicated L1/L1.5 delivery center in Mauritius split into two regional cells (Americas; Europe/North Africa). Bench/stand-by pool and shadow SDMs ensure continuity and elasticity.
Explicit commitment to Option 1  and Option 2 plus D+3/D+4 to 23:59; bilingual delivery with ability to run Scenario 1 (L1 EN, L1.5 FR) and Scenario 2 (EN for both).
Governance, use of Accor tooling (ServiceNow/Jira), reporting/KPI/SLA framework, and inclusion of recurring administrative/monitoring/closing tasks in scope.
Capacity-based planning on ServiceNow volumes and closing calendar, closing “war-room,” and a pre-trained bench to absorb peaks or backfill.
Local proximity for governance/escalation and decision-making; Mauritius center for cost efficiency, bilingual coverage, extended hours, and peak absorption.

Gaps/Risks:
Limited detail on business continuity/DR for the Mauritius center (alternative sites, failover plan) and on handoff mechanics across shifts/DST.
Footprint justification is qualitative; lacks comparative options or nearshore backup rationale.
Operating model description is strong at a high level but could include a clearer crosswalk to each operational/technical requirement and more detailed SOPs for L1/L1.5 workflows.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing PREREQUIS - R - 5: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- PREREQUIS - R - 6
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'Capacity-based planning on historical volumes and closure calendar, a pre-trained bench/stand-by pool, “closing war-room,” and shadow SDMs to absorb peaks and ensure continuity
Coverage of closing peaks appears included in the baseline price for both options, suggesting no incremental charges for predictable month-end surges 

Gaps/Risks:
Limited detail on the shared resource model (size of bench, reservation, cross-account sharing) and activation SLA (e.g., response within X hours).
No clear linkage of scalability to pricing beyond fixed fees and a general “annual review”; could create disputes on what’s included.
No description of downscaling during low-activity phases (e.g., built-in buffer or adjustable capacity without penalties).',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 6'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'PREREQUIS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'Capacity-based planning on historical volumes and closure calendar, a pre-trained bench/stand-by pool, “closing war-room,” and shadow SDMs to absorb peaks and ensure continuity
Coverage of closing peaks appears included in the baseline price for both options, suggesting no incremental charges for predictable month-end surges 

Gaps/Risks:
Limited detail on the shared resource model (size of bench, reservation, cross-account sharing) and activation SLA (e.g., response within X hours).
No clear linkage of scalability to pricing beyond fixed fees and a general “annual review”; could create disputes on what’s included.
No description of downscaling during low-activity phases (e.g., built-in buffer or adjustable capacity without penalties).',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing PREREQUIS - R - 6: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- PREREQUIS - R - 7
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'Cites direct experience on Grand Back and multiple EBS programs, including R12.2.x; presents a large, multinational AMS example (20 entities, 12 countries, 9,000+ users on Oracle 12.2.7) demonstrating scale. Declares 80+ Oracle EBS experts and an Oracle partnership since 2010.
Explicit coverage of all modules for L1/L1.5 with recurring ops (admin/monitoring/closing), indicating solid functional understanding.
L1/L1.5 operating maturity: QAP includes support processes, escalation procedures, service indicators; SDM responsibilities include triage/classification oversight; team roles describe using knowledge articles/standard procedures and clear L1→L1.5→L2/L3/Oracle SR pathways, evidencing correct classification and functional/technical differentiation.
Highlights training programs, continuous skills development, and a service center/Lab (automation/AI) to sustain capability.


Gaps/Risks:
No breakdown of EBS consultant counts by delivery center (Mauritius vs France) or named L1/L1.5 assignments.
Certifications/partnership levels are not detailed (e.g., specific Oracle certs by role, center-level credentials).
Few quantified outcomes from comparable L1/L1.5 engagements (KPIs achieved) to evidence operational excellence.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 7'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'PREREQUIS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'Cites direct experience on Grand Back and multiple EBS programs, including R12.2.x; presents a large, multinational AMS example (20 entities, 12 countries, 9,000+ users on Oracle 12.2.7) demonstrating scale. Declares 80+ Oracle EBS experts and an Oracle partnership since 2010.
Explicit coverage of all modules for L1/L1.5 with recurring ops (admin/monitoring/closing), indicating solid functional understanding.
L1/L1.5 operating maturity: QAP includes support processes, escalation procedures, service indicators; SDM responsibilities include triage/classification oversight; team roles describe using knowledge articles/standard procedures and clear L1→L1.5→L2/L3/Oracle SR pathways, evidencing correct classification and functional/technical differentiation.
Highlights training programs, continuous skills development, and a service center/Lab (automation/AI) to sustain capability.


Gaps/Risks:
No breakdown of EBS consultant counts by delivery center (Mauritius vs France) or named L1/L1.5 assignments.
Certifications/partnership levels are not detailed (e.g., specific Oracle certs by role, center-level credentials).
Few quantified outcomes from comparable L1/L1.5 engagements (KPIs achieved) to evidence operational excellence.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing PREREQUIS - R - 7: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- PREREQUIS - R - 11
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'Weekly operational and monthly reporting aligned to SLAs/KPIs, plus ad hoc reports. A reporting framework is described, with dashboards on SLA compliance, volumes, backlog, resolution, trend/RCA.
Proposes automated data extraction/consolidation, self-service dashboards, and ongoing enhancements; cites experience implementing Power BI over ticketing tools and “Dynamic Power BI dashboard” analysis (slides 31, 35, 55).
However, the proposal does not clearly include concrete dashboard examples/screenshots as required, and provides limited technical detail on the automation pipeline (tools, data model, refresh cadence, ownership, data quality controls).

Gaps/Risks:
No visible dashboard examples in the submission; requirement explicitly asks for them.
Reliance on Accor ticketing tools without an end-to-end automation design (connectors, refresh schedule, RBAC).
No data quality and reconciliation controls defined (neutralized tickets handling, timestamp audit).
Lack of delivery SLAs for reports and named ownership; limited KPI formula definitions may lead to disputes.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 11'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'PREREQUIS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'Weekly operational and monthly reporting aligned to SLAs/KPIs, plus ad hoc reports. A reporting framework is described, with dashboards on SLA compliance, volumes, backlog, resolution, trend/RCA.
Proposes automated data extraction/consolidation, self-service dashboards, and ongoing enhancements; cites experience implementing Power BI over ticketing tools and “Dynamic Power BI dashboard” analysis (slides 31, 35, 55).
However, the proposal does not clearly include concrete dashboard examples/screenshots as required, and provides limited technical detail on the automation pipeline (tools, data model, refresh cadence, ownership, data quality controls).

Gaps/Risks:
No visible dashboard examples in the submission; requirement explicitly asks for them.
Reliance on Accor ticketing tools without an end-to-end automation design (connectors, refresh schedule, RBAC).
No data quality and reconciliation controls defined (neutralized tickets handling, timestamp audit).
Lack of delivery SLAs for reports and named ownership; limited KPI formula definitions may lead to disputes.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing PREREQUIS - R - 11: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- PREREQUIS - R - 8
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'Active talent pool, dual validation including bilingual criteria, backup profiles, satisfaction tracking, continuous feedback/mentoring, and ongoing training. Continuity mechanisms include a bench/stand-by pool and two shadow SDMs to cover absences and peaks. 
However, the proposal does not provide the requested quantitative details (turnover rate for L1 by hub, staffing composition) nor a step-by-step onboarding/knowledge-transfer process with timelines/SLAs.

Gaps/Risks:
No turnover rates provided for L1 resources per delivery hub (Mauritius/France)
No detailed staffing composition breakdown (employees vs subcontractors/freelance) for the proposed team/hubs; annex only notes both are used.
Onboarding/knowledge-transfer process for resource changes is not specified 
Retention strategy lacks measurable targets (retention KPIs, cross-coverage ratios, succession plans) and defined audit cadence.
Bench size, activation SLA, and backfill timeline are not quantified, creating continuity risk during unexpected attrition.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 8'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'PREREQUIS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'Active talent pool, dual validation including bilingual criteria, backup profiles, satisfaction tracking, continuous feedback/mentoring, and ongoing training. Continuity mechanisms include a bench/stand-by pool and two shadow SDMs to cover absences and peaks. 
However, the proposal does not provide the requested quantitative details (turnover rate for L1 by hub, staffing composition) nor a step-by-step onboarding/knowledge-transfer process with timelines/SLAs.

Gaps/Risks:
No turnover rates provided for L1 resources per delivery hub (Mauritius/France)
No detailed staffing composition breakdown (employees vs subcontractors/freelance) for the proposed team/hubs; annex only notes both are used.
Onboarding/knowledge-transfer process for resource changes is not specified 
Retention strategy lacks measurable targets (retention KPIs, cross-coverage ratios, succession plans) and defined audit cadence.
Bench size, activation SLA, and backfill timeline are not quantified, creating continuity risk during unexpected attrition.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing PREREQUIS - R - 8: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- PREREQUIS - R - 9
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'Named Account Manager (France) and SDM (France) with detailed responsibilities including contract ownership, governance leadership, SLA/KPI accountability, capacity planning, and continuous improvement. Shadow SDMs (France/Mauritius) add resilience and coverage.
Four-tier governance with objectives, attendees, and cadence; AM noted as a member of PREREQUIS board, indicating senior sponsorship.
Executive escalation to AM, SDM ownership of P1/P2 handling, closing war-room, and “Escalation Procedure” referenced in the QAP.


Gaps/Risks:
Reporting lines/positioning not fully explicit beyond “AM is member of PREREQUIS board”; no org chart showing who the SDM reports to and how Mauritius leadership integrates formally.
Limited detail on cross-entity oversight between PREREQUIS and SPOON (subcontractor) for governance and escalation responsibilities.
',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 9'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'PREREQUIS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'Named Account Manager (France) and SDM (France) with detailed responsibilities including contract ownership, governance leadership, SLA/KPI accountability, capacity planning, and continuous improvement. Shadow SDMs (France/Mauritius) add resilience and coverage.
Four-tier governance with objectives, attendees, and cadence; AM noted as a member of PREREQUIS board, indicating senior sponsorship.
Executive escalation to AM, SDM ownership of P1/P2 handling, closing war-room, and “Escalation Procedure” referenced in the QAP.


Gaps/Risks:
Reporting lines/positioning not fully explicit beyond “AM is member of PREREQUIS board”; no org chart showing who the SDM reports to and how Mauritius leadership integrates formally.
Limited detail on cross-entity oversight between PREREQUIS and SPOON (subcontractor) for governance and escalation responsibilities.
',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing PREREQUIS - R - 9: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- PREREQUIS - R - 10
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'Formal adherence
Committees described with participants, frequency, and objectives
Reporting commitment: KPIs/SLAs defined and published weekly/monthly; reporting package and cadence outlined. Operational deliverables include meeting records and reporting per the QAP 
Escalation and governance processes anchored in the QAP

Gaps/Risks:
No explicit RACI matrix per committee in the proposal; RACI is referenced in the QAP but not shown for governance instances.
Committee deliverables are not itemized per forum (e.g., specific packs/minutes/action logs ownership); only generic deliverables stated.
Escalation SLAs/thresholds (time-bound triggers to SDM/AM/executive) are not quantified.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 10'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'PREREQUIS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'Formal adherence
Committees described with participants, frequency, and objectives
Reporting commitment: KPIs/SLAs defined and published weekly/monthly; reporting package and cadence outlined. Operational deliverables include meeting records and reporting per the QAP 
Escalation and governance processes anchored in the QAP

Gaps/Risks:
No explicit RACI matrix per committee in the proposal; RACI is referenced in the QAP but not shown for governance instances.
Committee deliverables are not itemized per forum (e.g., specific packs/minutes/action logs ownership); only generic deliverables stated.
Escalation SLAs/thresholds (time-bound triggers to SDM/AM/executive) are not quantified.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing PREREQUIS - R - 10: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- PREREQUIS - R - 13
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'Commits to weekly/monthly KPI/SLA reporting, trend and root-cause analyses to drive continuous improvement, and “analysis of indicators to reduce number of tickets”. QAP includes “Service indicators” and “Quality review (quality audit)”
Recurrent incidents: States a continuous-improvement program with analysis of recurring problems and anomalies to identify preventive actions; commits to preventive actions and a review/adjustment mechanism at 6 months and 1 year
Mentions analyzing “organisational dysfunctions” and improving procedures; proposes automation/AI/RPA to remove low-value work 
User feedback loop is not explicitly described (e.g., CSAT capture, survey cadence, qualitative feedback incorporation), and the CSI framework (owners, register, cadence, measurable targets) is not formalized.


Gaps/Risks:
No explicit user feedback mechanism (CSAT targets, survey cadence, qualitative feedback ingestion) tied to improvement actions.
CSI not formalized (no CSI register, owners, PDCA cycle, benefit realization KPIs such as deflection rate, recurrence rate targets, MTTR reductions).
RCA method not specified (e.g., 5-Whys, PIR templates) and no sample action plans/time-bound commitments.
“SLA freeze for P3/P4 during closing” may reduce measurement visibility on improvements in peak periods ',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 13'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'PREREQUIS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'Commits to weekly/monthly KPI/SLA reporting, trend and root-cause analyses to drive continuous improvement, and “analysis of indicators to reduce number of tickets”. QAP includes “Service indicators” and “Quality review (quality audit)”
Recurrent incidents: States a continuous-improvement program with analysis of recurring problems and anomalies to identify preventive actions; commits to preventive actions and a review/adjustment mechanism at 6 months and 1 year
Mentions analyzing “organisational dysfunctions” and improving procedures; proposes automation/AI/RPA to remove low-value work 
User feedback loop is not explicitly described (e.g., CSAT capture, survey cadence, qualitative feedback incorporation), and the CSI framework (owners, register, cadence, measurable targets) is not formalized.


Gaps/Risks:
No explicit user feedback mechanism (CSAT targets, survey cadence, qualitative feedback ingestion) tied to improvement actions.
CSI not formalized (no CSI register, owners, PDCA cycle, benefit realization KPIs such as deflection rate, recurrence rate targets, MTTR reductions).
RCA method not specified (e.g., 5-Whys, PIR templates) and no sample action plans/time-bound commitments.
“SLA freeze for P3/P4 during closing” may reduce measurement visibility on improvements in peak periods ',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing PREREQUIS - R - 13: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- PREREQUIS - R - 14
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      2.5,
      'Positions an innovation Lab and explicitly states ongoing adoption of AI/RPA in similar contexts. Lists concrete, applicable levers for L1/L1.5 (e.g., automating closing reports, integration-flow checks, ticket pre-population; KB assistant; GenAI summaries and response suggestions)
Concrete use cases with REX and quantified value: Provides UiPath RPA references and a GenAI/Azure OpenAI invoicing case with measured impact (from 7 days to 1 hour; 300+ invoices/month). Shows capability to deliver rapid PoCs and MVPs (two-week sprints)
Measurable benefits commitment: Includes “KPI tracking and value realization information” in the approach and proposes dynamic analytics (Power BI) to monitor outcomes
ServiceNow alignment: Notes cross-check of native ServiceNow AI capabilities before custom builds, aligning with Accor’s ITSM ecosystem 

Gaps/Risks:
No  AI/RPA roadmap with prioritized use cases, timelines, owners, and governance; approach is generic 
Limited detail on benefit-realization targets (e.g., deflection %, MTTR reduction), baselining, and periodic review cadence.
Security/data-governance guardrails for AI (model selection, PII handling, prompt/response QA, rollback) not described.
Enhancement plan for Accor’s existing RPA (already in place per RFP) is not detailed; integration risks and change control not addressed.
',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 14'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'PREREQUIS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 2.5,
      manual_comment = 'Positions an innovation Lab and explicitly states ongoing adoption of AI/RPA in similar contexts. Lists concrete, applicable levers for L1/L1.5 (e.g., automating closing reports, integration-flow checks, ticket pre-population; KB assistant; GenAI summaries and response suggestions)
Concrete use cases with REX and quantified value: Provides UiPath RPA references and a GenAI/Azure OpenAI invoicing case with measured impact (from 7 days to 1 hour; 300+ invoices/month). Shows capability to deliver rapid PoCs and MVPs (two-week sprints)
Measurable benefits commitment: Includes “KPI tracking and value realization information” in the approach and proposes dynamic analytics (Power BI) to monitor outcomes
ServiceNow alignment: Notes cross-check of native ServiceNow AI capabilities before custom builds, aligning with Accor’s ITSM ecosystem 

Gaps/Risks:
No  AI/RPA roadmap with prioritized use cases, timelines, owners, and governance; approach is generic 
Limited detail on benefit-realization targets (e.g., deflection %, MTTR reduction), baselining, and periodic review cadence.
Security/data-governance guardrails for AI (model selection, PII handling, prompt/response QA, rollback) not described.
Enhancement plan for Accor’s existing RPA (already in place per RFP) is not detailed; integration risks and change control not addressed.
',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing PREREQUIS - R - 14: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- PREREQUIS - R - 18
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      '
Gaps/Risks:
Missing explicit Shadowing and Reverse Shadowing steps in the transition (they appear in reversibility, not the launch).
No explicit Sign‑off/acceptance criteria for the end of transition; “probationary period” is an operational phase concept, not a formal handover sign‑off.
No stated commitment to submit a detailed Transition Plan within 15 business days of award.
Transition pricing not broken down by sub‑phase (Framing, Initialization, Knowledge transfer) as requested.
Required resources for launch are not itemized (roles/FTEs per sub‑phase), and dependency management (access, data, outgoing provider availability) lacks concrete timelines.
',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 18'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'PREREQUIS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = '
Gaps/Risks:
Missing explicit Shadowing and Reverse Shadowing steps in the transition (they appear in reversibility, not the launch).
No explicit Sign‑off/acceptance criteria for the end of transition; “probationary period” is an operational phase concept, not a formal handover sign‑off.
No stated commitment to submit a detailed Transition Plan within 15 business days of award.
Transition pricing not broken down by sub‑phase (Framing, Initialization, Knowledge transfer) as requested.
Required resources for launch are not itemized (roles/FTEs per sub‑phase), and dependency management (access, data, outgoing provider availability) lacks concrete timelines.
',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing PREREQUIS - R - 18: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- PREREQUIS - R - 19
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3.5,
      'A formal risk register is initiated in the launch phase and maintained for the contract duration, with mitigation plans and monitoring embedded in operational and steering committees. The QAP explicitly covers “Risk management” and governance/comitology, reinforcing structure and oversight 
A detailed table lists transition/launch risks (e.g., unavailability of Accor contacts, documentation obsolescence, ServiceNow KPI traceability gaps, ticket classification disagreements), each with mitigation actions and probability/impact ratings
Risks are reviewed through the governance cadence (weekly ops, monthly steering), with escalation processes referenced, ensuring continuous visibility and control


Gaps/Risks:
Contingency planning not explicitly formalized (no documented fallback/rollback playbooks, readiness checklists, or DR scenarios for transition blockers).
Lack of quantitative escalation SLAs/triggers (e.g., time-to-mitigation thresholds), explicit risk owners, and dated action plans in the proposal.
',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 19'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'PREREQUIS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3.5,
      manual_comment = 'A formal risk register is initiated in the launch phase and maintained for the contract duration, with mitigation plans and monitoring embedded in operational and steering committees. The QAP explicitly covers “Risk management” and governance/comitology, reinforcing structure and oversight 
A detailed table lists transition/launch risks (e.g., unavailability of Accor contacts, documentation obsolescence, ServiceNow KPI traceability gaps, ticket classification disagreements), each with mitigation actions and probability/impact ratings
Risks are reviewed through the governance cadence (weekly ops, monthly steering), with escalation processes referenced, ensuring continuous visibility and control


Gaps/Risks:
Contingency planning not explicitly formalized (no documented fallback/rollback playbooks, readiness checklists, or DR scenarios for transition blockers).
Lack of quantitative escalation SLAs/triggers (e.g., time-to-mitigation thresholds), explicit risk owners, and dated action plans in the proposal.
',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing PREREQUIS - R - 19: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- PREREQUIS - R - 20
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'Provides a complete, structured reversibility methodology with clear phases and deliverables: formal Reversibility Plan, dedicated workshops, knowledge transfer, support continuity, documentation handover/updates, and governance/risk management specific to the phase.
Commits to a total reversibility window of up to six months, split into 3 months reversibility + 3 months hypercare, matching the requirement.
Includes explicit pricing for reversibility (hypercare included) for both coverage options, satisfying the “pricing in proposal” clause.
Details operational terms during reversibility (successor enablement, daily operations continuity, document submission and updates), aligning with minimum scope.


Gaps/Risks:
Acceptance criteria and formal sign-off artifacts are implied but not explicitly listed (e.g., no named “Acceptance Report” with success criteria).
Some role wording around hypercare vs. “take back control” appears ambiguous; needs clarification that the successor leads during hypercare.
Dependencies on successor readiness and Accor-provided resources are noted but not paired with contingencies (e.g., fallback if successor is delayed).
',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 20'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'PREREQUIS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'Provides a complete, structured reversibility methodology with clear phases and deliverables: formal Reversibility Plan, dedicated workshops, knowledge transfer, support continuity, documentation handover/updates, and governance/risk management specific to the phase.
Commits to a total reversibility window of up to six months, split into 3 months reversibility + 3 months hypercare, matching the requirement.
Includes explicit pricing for reversibility (hypercare included) for both coverage options, satisfying the “pricing in proposal” clause.
Details operational terms during reversibility (successor enablement, daily operations continuity, document submission and updates), aligning with minimum scope.


Gaps/Risks:
Acceptance criteria and formal sign-off artifacts are implied but not explicitly listed (e.g., no named “Acceptance Report” with success criteria).
Some role wording around hypercare vs. “take back control” appears ambiguous; needs clarification that the successor leads during hypercare.
Dependencies on successor readiness and Accor-provided resources are noted but not paired with contingencies (e.g., fallback if successor is delayed).
',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing PREREQUIS - R - 20: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- PREREQUIS - R - 21
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      3,
      'Provides fixed-price schedules by phase and coverage option (Option 1 and Option 2), with monthly invoicing and explicit inclusion of closing peaks and both language scenarios, supporting baseline predictability.
Quality-driven performance: Ties service to SLAs/KPIs and penalties (caps for SR and incidents), aligning pricing with performance governance.
Operating model mentions a bench/stand-by and war-room for peaks; pricing tables state “including closing peaks.” However, the proposal does not explain how other volume fluctuations are handled financially (e.g., no step pricing, buffer, or unit rates).
Commits to a review/adjustment after six months and at end of year 1; prices presented in euros excl. VAT. But it lacks a transparent breakdown of cost components (HR, service management overhead, training, KB maintenance, tooling).


Gaps/Risks:
No transparent cost breakdown 
Elasticity model not financially described beyond closing peaks; no defined buffer, unit rates, or activation SLAs for ad hoc spikes, risking disputes.
“Price may change” after annual review is vague; no explicit linkage to observed productivity gains, automation benefits, or agreed economic model.
Lacks incentive/gain-sharing mechanisms or provisions for cost reductions tied to continuous improvement outcomes.',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 21'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'PREREQUIS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 3,
      manual_comment = 'Provides fixed-price schedules by phase and coverage option (Option 1 and Option 2), with monthly invoicing and explicit inclusion of closing peaks and both language scenarios, supporting baseline predictability.
Quality-driven performance: Ties service to SLAs/KPIs and penalties (caps for SR and incidents), aligning pricing with performance governance.
Operating model mentions a bench/stand-by and war-room for peaks; pricing tables state “including closing peaks.” However, the proposal does not explain how other volume fluctuations are handled financially (e.g., no step pricing, buffer, or unit rates).
Commits to a review/adjustment after six months and at end of year 1; prices presented in euros excl. VAT. But it lacks a transparent breakdown of cost components (HR, service management overhead, training, KB maintenance, tooling).


Gaps/Risks:
No transparent cost breakdown 
Elasticity model not financially described beyond closing peaks; no defined buffer, unit rates, or activation SLAs for ad hoc spikes, risking disputes.
“Price may change” after annual review is vague; no explicit linkage to observed productivity gains, automation benefits, or agreed economic model.
Lacks incentive/gain-sharing mechanisms or provisions for cost reductions tied to continuous improvement outcomes.',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing PREREQUIS - R - 21: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ----------------------------------------------------------------
  -- PREREQUIS - R - 22
  -- ----------------------------------------------------------------
  BEGIN
    INSERT INTO responses (
      rfp_id,
      requirement_id,
      supplier_id,
      manual_score,
      manual_comment,
      status,
      is_checked,
      created_at,
      updated_at
    )
    SELECT
      v_rfp_id,
      req.id,
      sup.id,
      2,
      'PREREQUIS commits to continuous optimization and innovation (RPA/AI), with KPI tracking and “value realization information,” and sets formal review points (after 6 months and at end of year 1) where “the price may change.” Governance (weekly/monthly/QBR) provides a forum to analyze improvements and their effects on service delivery.
However, the proposal does not explicitly commit that provider-driven productivity gains will translate into price reductions absent scope/SLAs changes. There is no defined mechanism (baselines, targets, gain-sharing formula) to periodically assess and reflect such gains in the pricing model. “Price may change” is ambiguous and not tied to measured efficiency improvements.


Gaps/Risks:
No explicit contractual commitment to pass productivity gains through as price reductions when scope/SLAs are unchanged.
Lacks a quantified benefit-realization model (baselines, KPIs, cadence) and a pricing translation method (e.g., rate or base-fee reductions tied to agreed gains).
No mutual agreement framework for financial translation of innovation benefits beyond a generic “price may change.”
No cost-component transparency to facilitate re-basing prices (HR, overhead, KB maintenance, etc.), making adjustments harder to execute.
',
      'pending',
      FALSE,
      NOW(),
      NOW()
    FROM requirements req
    CROSS JOIN suppliers sup
    WHERE req.rfp_id = v_rfp_id
      AND req.requirement_id_external = 'R - 22'
      AND sup.rfp_id = v_rfp_id
      AND sup.name = 'PREREQUIS'
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
      manual_score = 2,
      manual_comment = 'PREREQUIS commits to continuous optimization and innovation (RPA/AI), with KPI tracking and “value realization information,” and sets formal review points (after 6 months and at end of year 1) where “the price may change.” Governance (weekly/monthly/QBR) provides a forum to analyze improvements and their effects on service delivery.
However, the proposal does not explicitly commit that provider-driven productivity gains will translate into price reductions absent scope/SLAs changes. There is no defined mechanism (baselines, targets, gain-sharing formula) to periodically assess and reflect such gains in the pricing model. “Price may change” is ambiguous and not tied to measured efficiency improvements.


Gaps/Risks:
No explicit contractual commitment to pass productivity gains through as price reductions when scope/SLAs are unchanged.
Lacks a quantified benefit-realization model (baselines, KPIs, cadence) and a pricing translation method (e.g., rate or base-fee reductions tied to agreed gains).
No mutual agreement framework for financial translation of innovation benefits beyond a generic “price may change.”
No cost-component transparency to facilitate re-basing prices (HR, overhead, KB maintenance, etc.), making adjustments harder to execute.
',
      updated_at = NOW();

    v_inserted_count := v_inserted_count + 1;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error importing PREREQUIS - R - 22: %', SQLERRM;
      v_error_count := v_error_count + 1;
  END;

  -- ================================================================
  -- RAPPORT D'IMPORTATION
  -- ================================================================
  RAISE NOTICE '============================================';
  RAISE NOTICE 'IMPORT COMPLETED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Successful imports: %', v_inserted_count;
  RAISE NOTICE 'Errors: %', v_error_count;
  RAISE NOTICE 'Total expected: 126';
  RAISE NOTICE '============================================';

END $$;

-- ========================================================================
-- VÉRIFICATION POST-IMPORTATION
-- ========================================================================
-- Décommenter ces requêtes pour vérifier l'import

-- SELECT COUNT(*) as total_responses FROM responses WHERE rfp_id = 'YOUR_RFP_ID_HERE';
--
-- SELECT
--   s.name as supplier,
--   COUNT(*) as response_count,
--   COUNT(manual_score) as with_score,
--   COUNT(manual_comment) as with_comment
-- FROM responses r
-- JOIN suppliers s ON r.supplier_id = s.id
-- WHERE r.rfp_id = 'YOUR_RFP_ID_HERE'
-- GROUP BY s.name
-- ORDER BY s.name;

-- ========================================================================
-- FIN DU SCRIPT
-- ========================================================================
