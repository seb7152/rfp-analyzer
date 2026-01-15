"use client";

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
}: CellWithCommentProps) {
  return (
    <div className="flex items-stretch gap-1">
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
