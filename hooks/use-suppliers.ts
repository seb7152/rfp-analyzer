import { useQuery } from "@tanstack/react-query";

interface Supplier {
  id: string;
  name: string;
  company_name: string;
  contact_name: string;
  email: string;
  rfp_id: string;
}

export function useSuppliers(rfpId: string) {
  return useQuery({
    queryKey: ["suppliers", rfpId],
    queryFn: async () => {
      const response = await fetch(`/api/rfps/${rfpId}/suppliers`);
      if (!response.ok) {
        throw new Error("Failed to fetch suppliers");
      }
      const data = await response.json();
      return (data.suppliers || []) as Supplier[];
    },
    enabled: !!rfpId,
  });
}
