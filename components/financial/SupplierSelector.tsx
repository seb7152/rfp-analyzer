"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

interface SupplierSelectorProps {
    suppliers: { id: string; name: string }[];
    selectedSupplierId: string | null;
    onChange: (supplierId: string) => void;
}

export function SupplierSelector({
    suppliers,
    selectedSupplierId,
    onChange,
}: SupplierSelectorProps) {
    if (suppliers.length === 0) {
        return (
            <div className="text-sm text-slate-500 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>Aucun fournisseur disponible</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Fournisseur :
            </label>
            <Select
                value={selectedSupplierId || ""}
                onValueChange={(value) => onChange(value)}
            >
                <SelectTrigger className="w-[220px] bg-white border-slate-200 shadow-sm">
                    <SelectValue placeholder="Sélectionner un fournisseur" />
                </SelectTrigger>
                <SelectContent>
                    {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                            <span className="font-medium">{supplier.name}</span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
