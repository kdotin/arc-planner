"use client";

import { useState } from "react";
import {
  Table2,
  Search,
  ChevronRight,
  Database,
  KeyRound,
  Link2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Table {
  name: string;
  schema: string;
  columns: { name: string; type: string; isPrimaryKey: boolean }[];
  foreignKeys: { column: string; referencedTable: string }[];
}

interface TablesSidebarProps {
  tables: Table[];
  selectedTable: string | null;
  onSelectTable: (tableName: string) => void;
}

export default function TablesSidebar({
  tables,
  selectedTable,
  onSelectTable,
}: TablesSidebarProps) {
  const [search, setSearch] = useState("");

  const filteredTables = tables.filter((table) =>
    table.name.toLowerCase().includes(search.toLowerCase())
  );

  // Group tables by first letter
  const groupedTables = filteredTables.reduce((acc, table) => {
    const firstLetter = table.name[0].toUpperCase();
    if (!acc[firstLetter]) acc[firstLetter] = [];
    acc[firstLetter].push(table);
    return acc;
  }, {} as Record<string, Table[]>);

  const sortedLetters = Object.keys(groupedTables).sort();

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="p-4 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-foreground/70" />
          <h2 className="font-medium text-foreground text-sm">Tables</h2>
          <span className="ml-auto text-xs text-muted-foreground">
            {tables.length}
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tables..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/50 border-0 text-foreground placeholder:text-muted-foreground h-9"
          />
        </div>
      </div>

      {/* Table List */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 pb-4">
          {filteredTables.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              No tables found
            </div>
          ) : (
            sortedLetters.map((letter) => (
              <div key={letter} className="mb-3">
                <div className="px-3 py-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                  {letter}
                </div>
                {groupedTables[letter].map((table) => {
                  const isSelected = selectedTable === table.name;
                  const pkCount = table.columns.filter(
                    (c) => c.isPrimaryKey
                  ).length;
                  const fkCount = table.foreignKeys.length;

                  return (
                    <button
                      key={table.name}
                      onClick={() => onSelectTable(table.name)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors group",
                        isSelected
                          ? "bg-foreground text-background"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <Table2
                        className={cn(
                          "w-3.5 h-3.5 shrink-0",
                          isSelected ? "text-background" : "text-muted-foreground"
                        )}
                      />
                      <span className="flex-1 truncate text-sm">
                        {table.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {pkCount > 0 && (
                          <span
                            className={cn(
                              "flex items-center gap-0.5 text-[10px]",
                              isSelected ? "text-background/70" : "text-muted-foreground"
                            )}
                          >
                            <KeyRound className="w-2.5 h-2.5" />
                            {pkCount}
                          </span>
                        )}
                        {fkCount > 0 && (
                          <span
                            className={cn(
                              "flex items-center gap-0.5 text-[10px]",
                              isSelected ? "text-background/70" : "text-muted-foreground"
                            )}
                          >
                            <Link2 className="w-2.5 h-2.5" />
                            {fkCount}
                          </span>
                        )}
                      </div>
                      <ChevronRight
                        className={cn(
                          "w-3.5 h-3.5 shrink-0",
                          isSelected ? "text-background" : "text-muted-foreground/50"
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
