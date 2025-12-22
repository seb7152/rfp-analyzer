import { useState, useEffect } from "react";

interface Supplier {
  id: string;
  name: string;
  supplier_id_external?: string;
}

export function useSuppliersByVersion(rfpId: string, versionId?: string) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoading(true);
        const url = new URL(
          `/api/rfps/${rfpId}/suppliers`,
          window.location.origin
        );
        if (versionId) {
          url.searchParams.append("versionId", versionId);
        }
        const response = await fetch(url.toString());
        if (!response.ok) throw new Error("Failed to fetch suppliers");

        const data = await response.json();
        setSuppliers(data.suppliers || []);
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        setSuppliers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, [rfpId, versionId]);

  return { suppliers, loading };
}
