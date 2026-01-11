"use client";

import { Table2, Columns3, Link } from "lucide-react";

interface StatsPanelProps {
  stats: {
    totalTables: number;
    totalColumns: number;
    totalRelationships: number;
  } | null;
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  if (!stats) return null;

  return (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-chart-1/10 rounded-md">
        <Table2 className="w-4 h-4 text-chart-1" />
        <span className="text-sm font-semibold text-chart-1">{stats.totalTables}</span>
        <span className="text-xs text-muted-foreground">tables</span>
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 bg-chart-2/10 rounded-md">
        <Columns3 className="w-4 h-4 text-chart-2" />
        <span className="text-sm font-semibold text-chart-2">{stats.totalColumns}</span>
        <span className="text-xs text-muted-foreground">columns</span>
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 bg-chart-4/10 rounded-md">
        <Link className="w-4 h-4 text-chart-4" />
        <span className="text-sm font-semibold text-chart-4">
          {stats.totalRelationships}
        </span>
        <span className="text-xs text-muted-foreground">relations</span>
      </div>
    </div>
  );
}
