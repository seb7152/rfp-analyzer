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

export interface FinancialOfferVersionWithSupplier
  extends FinancialOfferVersion {
  supplier: {
    id: string;
    name: string;
  };
}

export interface FinancialComment {
  id: string;
  template_line_id: string;
  version_id: string | null;
  comment: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialCommentWithAuthor extends FinancialComment {
  author?: {
    id: string;
    email: string;
    user_metadata?: {
      display_name?: string;
      avatar_url?: string;
    };
  };
}

export interface CreateFinancialCommentInput {
  template_line_id: string;
  version_id?: string | null;
  comment: string;
}

export interface UpdateFinancialCommentInput {
  comment: string;
}
