/**
 * Supplier type definitions
 */

export interface Supplier {
  id: string;
  rfp_id: string;
  supplier_id_external: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
}

export interface SupplierWithResponseCount extends Supplier {
  response_count: number;
  completed_response_count: number;
}

export interface SupplierContactInfo {
  name: string | null;
  email: string | null;
  phone: string | null;
}

export interface CreateSupplierInput {
  supplier_id_external: string;
  name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface UpdateSupplierInput {
  name?: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
}
