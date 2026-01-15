// Types manually defined for financial grid features
export interface FinancialOfferVersion {
    id: string;
    supplier_id: string;
    version_name: string | null;
    version_date: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface FinancialOfferValue {
    id: string;
    version_id: string;
    template_line_id: string;
    setup_cost: number | null;
    recurrent_cost: number | null;
    quantity: number;
    created_at: string;
    updated_at: string;
}

export interface FinancialOfferVersionWithSupplier extends FinancialOfferVersion {
    supplier: {
        id: string;
        name: string;
    };
}
