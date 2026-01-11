"use client";

import { Database, FileCode, Clock, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DatabaseFile {
  name: string;
  filename: string;
  path: string;
  size: number;
  modified: string;
}

interface DatabaseSelectorProps {
  databases: DatabaseFile[];
  selected: string | null;
  onSelect: (filename: string) => void;
  loading?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DatabaseSelector({
  databases,
  selected,
  onSelect,
  loading,
}: DatabaseSelectorProps) {
  const selectedDb = databases.find((db) => db.name === selected);

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Database className="w-5 h-5" />
        <span className="text-sm font-medium">Database:</span>
      </div>

      <Select value={selected || ""} onValueChange={onSelect} disabled={loading}>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Select a database file..." />
        </SelectTrigger>
        <SelectContent>
          {databases.length === 0 ? (
            <div className="px-3 py-6 text-center text-muted-foreground text-sm">
              No .sql files found in /database
            </div>
          ) : (
            databases.map((db) => (
              <SelectItem key={db.name} value={db.name}>
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-chart-1" />
                  <span>{db.name}</span>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {selectedDb && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <HardDrive className="w-3.5 h-3.5" />
            <span>{formatFileSize(selectedDb.size)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDate(selectedDb.modified)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
