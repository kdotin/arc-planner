"use client";

import { Handle, Position } from "@xyflow/react";
import { memo } from "react";
import { KeyRound, Link2, Hash } from "lucide-react";

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isUnique: boolean;
}

interface TableNodeData {
  label: string;
  schema: string;
  columns: Column[];
  foreignKeys: { column: string; referencedTable: string }[];
}

function TableNode({ data }: { data: TableNodeData }) {
  return (
    <div className="min-w-[240px] rounded-lg border border-border bg-card shadow-xl overflow-hidden">
      {/* Table Header */}
      <div className="bg-primary px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-primary-foreground/70" />
          <span className="font-semibold text-primary-foreground text-sm tracking-wide">
            {data.label}
          </span>
        </div>
        {data.schema && data.schema !== "public" && (
          <span className="text-[10px] text-primary-foreground/60 uppercase tracking-wider">
            {data.schema}
          </span>
        )}
      </div>

      {/* Columns */}
      <div className="divide-y divide-border/50">
        {data.columns.map((column, idx) => {
          const hasForeignKey = data.foreignKeys.some(
            (fk) => fk.column === column.name
          );

          return (
            <div
              key={idx}
              className="relative px-3 py-2 flex items-center gap-2 text-xs hover:bg-muted/50 transition-colors"
            >
              {/* Left handle for incoming foreign keys */}
              <Handle
                type="target"
                position={Position.Left}
                id={`${column.name}-target`}
                className="!w-2 !h-2 !bg-chart-2 !border-0"
                style={{ top: "50%" }}
              />

              {/* Column Icons */}
              <div className="flex items-center gap-1 w-6">
                {column.isPrimaryKey && (
                  <KeyRound className="w-3.5 h-3.5 text-chart-4" />
                )}
                {hasForeignKey && (
                  <Link2 className="w-3.5 h-3.5 text-chart-2" />
                )}
              </div>

              {/* Column Name */}
              <span
                className={`flex-1 font-medium ${
                  column.isPrimaryKey
                    ? "text-chart-4"
                    : hasForeignKey
                    ? "text-chart-2"
                    : "text-foreground"
                }`}
              >
                {column.name}
              </span>

              {/* Column Type */}
              <span className="text-muted-foreground font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">
                {column.type.toLowerCase()}
              </span>

              {/* Nullable indicator */}
              {!column.nullable && (
                <span className="text-destructive text-[10px] font-bold">*</span>
              )}

              {/* Right handle for outgoing foreign keys */}
              <Handle
                type="source"
                position={Position.Right}
                id={`${column.name}-source`}
                className="!w-2 !h-2 !bg-chart-4 !border-0"
                style={{ top: "50%" }}
              />
            </div>
          );
        })}
      </div>

      {/* Footer with column count */}
      <div className="bg-muted/30 px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border/50">
        {data.columns.length} columns
      </div>
    </div>
  );
}

export default memo(TableNode);
