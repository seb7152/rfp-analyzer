export type FinancialGridUIMode = 'comparison' | 'supplier';

export interface FinancialGridPreferences {
    id: string;
    rfp_id: string;
    user_id: string;
    ui_mode: FinancialGridUIMode;
    selected_supplier_id: string | null;
    // Map of supplier_id -> version_id
    displayed_versions: Record<string, string>;
    tco_period_years: number; // 1, 3, or 5
    expanded_lines: string[]; // Array of line IDs
    show_comments: boolean;
    created_at: string;
    updated_at: string;
}

export interface FinancialSummaryData {
    supplier_id: string;
    supplier_name: string;
    version_id: string;
    version_name: string;
    total_setup: number;
    total_recurrent_annual: number;
    tco: number;
    currency: string;
}

export interface FinancialSummaryResponse {
    summary: FinancialSummaryData[];
    tco_period: number;
}
