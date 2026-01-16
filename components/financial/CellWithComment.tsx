import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { EditableCell } from "./EditableCell";
import { CommentPopover } from "./CommentPopover";

interface CellWithCommentProps {
  lineId: string;
  versionId?: string | null;
  currentUserId: string;
  // EditableCell props
  value: number | null;
  onChange: (val: number | null) => void;
  isEditing: boolean;
  type: "currency" | "number";
  suffix?: string;
  isModified?: boolean;
  // Analysis props
  isAnalysisMode?: boolean;
  isMin?: boolean;
  isMax?: boolean;
  metrics?: {
    diffMin: number;
    diffMax: number;
    average: number;
    rowMin: number;
    rowMax: number;
  };
}

export function CellWithComment({
  lineId,
  versionId,
  currentUserId,
  value,
  onChange,
  isEditing,
  type,
  suffix,
  isModified,
  isAnalysisMode,
  isMin,
  isMax,
  metrics,
}: CellWithCommentProps) {
  return (
    <div className="flex items-center gap-1 relative group">
      {isAnalysisMode && (isMin || isMax) && metrics && (
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 z-10">
          <HoverCard openDelay={0}>
            <HoverCardTrigger asChild>
              <div
                className={cn(
                  "w-2 h-2 rounded-full cursor-help shadow-sm ring-1 ring-white",
                  isMin ? "bg-green-500" : "bg-red-500"
                )}
              />
            </HoverCardTrigger>
            <HoverCardContent side="left" className="w-64 p-3 z-50">
              <div className="space-y-2 text-xs">
                <p className="font-semibold border-b pb-1 mb-1">
                  Analyse de l'offre
                </p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  <span className="text-slate-500">Moyenne ligne:</span>
                  <span className="font-medium text-right">
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    }).format(metrics.average)}
                  </span>

                  <span className="text-slate-500">Écart / Min:</span>
                  <span
                    className={cn(
                      "font-medium text-right",
                      metrics.diffMin === 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {metrics.diffMin === 0
                      ? "-"
                      : `+${new Intl.NumberFormat("fr-FR", {
                        style: "percent",
                        maximumFractionDigits: 1,
                      }).format(metrics.diffMin)}`}
                  </span>

                  <span className="text-slate-500">Écart / Max:</span>
                  <span
                    className={cn(
                      "font-medium text-right",
                      metrics.diffMax === 0 ? "text-red-600" : "text-green-600"
                    )}
                  >
                    {metrics.diffMax === 0
                      ? "-"
                      : `${new Intl.NumberFormat("fr-FR", {
                        style: "percent",
                        maximumFractionDigits: 1,
                      }).format(metrics.diffMax)}`}
                  </span>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
      )}
      <div className="flex-1 relative">
        <EditableCell
          value={value}
          onChange={onChange}
          isEditing={isEditing}
          type={type}
          suffix={suffix}
          isModified={isModified}
        />
      </div>
      <div className="flex items-center pr-1">
        <CommentPopover
          lineId={lineId}
          versionId={versionId}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}
