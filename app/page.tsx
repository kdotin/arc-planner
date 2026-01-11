"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Loader2, Database, AlertCircle, GitBranch, FileCode, ScanSearch, AlertTriangle, ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TablesSidebar from "@/components/db-visualizer/tables-sidebar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import TableDetails from "@/components/db-visualizer/table-details";
import ChatPanel from "@/components/db-visualizer/chat-panel";

interface DatabaseFile {
  name: string;
  filename: string;
  path: string;
  size: number;
  modified: string;
}

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isUnique: boolean;
  defaultValue: string | null;
  checkConstraint: string | null;
}

interface ForeignKey {
  column: string;
  referencedTable: string;
  referencedColumn: string;
  constraintName: string;
}

interface RLSPolicy {
  name: string;
  command: string;
  roles: string[];
  using: string | null;
  withCheck: string | null;
  permissive: boolean;
  plainEnglish: string;
}

interface Table {
  name: string;
  schema: string;
  columns: Column[];
  primaryKeys: string[];
  foreignKeys: ForeignKey[];
  rlsEnabled?: boolean;
  rlsPolicies?: RLSPolicy[];
}

export default function Home() {
  const [databases, setDatabases] = useState<DatabaseFile[]>([]);
  const [selectedDb, setSelectedDb] = useState<string | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisPrompt, setAnalysisPrompt] = useState<string | null>(null);
  const [warningsExpanded, setWarningsExpanded] = useState(false);

  const handleAnalyzeDatabase = useCallback(() => {
    const prompt = `Analyze this entire database schema for quality, architecture, and multi-tenancy readiness. Please provide:

1. **Overall Architecture Score** (0-100): Rate the schema's design quality
2. **Multi-Tenancy Readiness Score** (0-100): How ready is this for multi-tenant applications?
3. **Security Score** (0-100): Based on RLS policies, constraints, and data protection

Then provide detailed analysis on:

**Strengths:**
- List what's well designed

**Critical Issues:**
- Security vulnerabilities
- Missing constraints or indexes
- Data integrity concerns

**Multi-Tenancy Improvements:**
- What needs to change for proper tenant isolation
- Missing tenant_id columns
- RLS policy recommendations

**Performance Recommendations:**
- Missing indexes
- Query optimization suggestions
- Denormalization opportunities

**Best Practice Violations:**
- Naming conventions
- Data type choices
- Relationship design

Please be specific with table and column names in your recommendations.`;
    
    setAnalysisPrompt(prompt);
  }, []);

  // Clear the analysis prompt after it's been consumed
  const clearAnalysisPrompt = useCallback(() => {
    setAnalysisPrompt(null);
  }, []);

  // Fetch available databases on mount
  useEffect(() => {
    async function fetchDatabases() {
      try {
        const res = await fetch("/api/databases");
        const data = await res.json();
        setDatabases(data.databases || []);

        // Auto-select first database if available
        if (data.databases?.length > 0) {
          setSelectedDb(data.databases[0].name);
        }
      } catch (err) {
        setError("Failed to load database files");
      } finally {
        setLoading(false);
      }
    }

    fetchDatabases();
  }, []);

  // Fetch and parse selected database
  const loadDatabase = useCallback(async (dbName: string) => {
    setParsing(true);
    setError(null);
    setTables([]);
    setSelectedTable(null);

    try {
      const res = await fetch(`/api/databases/${dbName}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setTables(data.tables || []);
        // Auto-select first table
        if (data.tables?.length > 0) {
          setSelectedTable(data.tables[0].name);
        }
      }
    } catch (err) {
      setError("Failed to parse database file");
    } finally {
      setParsing(false);
    }
  }, []);

  // Load database when selection changes
  useEffect(() => {
    if (selectedDb) {
      loadDatabase(selectedDb);
    }
  }, [selectedDb, loadDatabase]);

  const handleSelectDb = (dbName: string) => {
    setSelectedDb(dbName);
  };

  const handleSelectTable = (tableName: string) => {
    setSelectedTable(tableName);
  };

  const currentTableData = useMemo(
    () => tables.find((t) => t.name === selectedTable) || null,
    [tables, selectedTable]
  );

  // Generate comprehensive schema string for chat context
  const schemaString = useMemo(() => {
    if (tables.length === 0) return "";
    
    const dbSummary = `DATABASE SUMMARY:
- Total Tables: ${tables.length}
- Total Columns: ${tables.reduce((acc, t) => acc + t.columns.length, 0)}
- Total Foreign Keys: ${tables.reduce((acc, t) => acc + t.foreignKeys.length, 0)}
- Tables with RLS: ${tables.filter(t => t.rlsEnabled || (t.rlsPolicies && t.rlsPolicies.length > 0)).length}

`;
    
    const tableSchemas = tables
      .map((table) => {
        const columns = table.columns
          .map((c) => {
            let def = `  ${c.name} ${c.type}`;
            if (c.isPrimaryKey) def += " PRIMARY KEY";
            if (!c.nullable) def += " NOT NULL";
            if (c.isUnique) def += " UNIQUE";
            if (c.defaultValue) def += ` DEFAULT ${c.defaultValue}`;
            return def;
          })
          .join("\n");

        const fks = table.foreignKeys
          .map(
            (fk) =>
              `  FOREIGN KEY (${fk.column}) REFERENCES ${fk.referencedTable}(${fk.referencedColumn})`
          )
          .join("\n");

        // Include RLS policies
        let rlsInfo = "";
        if (table.rlsEnabled || (table.rlsPolicies && table.rlsPolicies.length > 0)) {
          rlsInfo = "\n  -- RLS ENABLED";
          if (table.rlsPolicies && table.rlsPolicies.length > 0) {
            rlsInfo += "\n  -- Policies:";
            table.rlsPolicies.forEach((policy) => {
              rlsInfo += `\n  --   ${policy.name} (${policy.command}): ${policy.plainEnglish}`;
            });
          }
        }

        return `TABLE ${table.name}${table.schema ? ` (schema: ${table.schema})` : ""}:\n${columns}${fks ? "\n" + fks : ""}${rlsInfo}`;
      })
      .join("\n\n");
      
    return dbSummary + tableSchemas;
  }, [tables]);

  // Compute schema warnings with chat prompts
  const warnings = useMemo(() => {
    if (tables.length === 0) return [];
    
    const warns: { type: 'error' | 'warning' | 'info'; message: string; chatPrompt: string }[] = [];
    
    // Check for tables without primary keys
    const tablesWithoutPK = tables.filter(t => !t.columns.some(c => c.isPrimaryKey));
    if (tablesWithoutPK.length > 0) {
      const tableNames = tablesWithoutPK.map(t => t.name).join(', ');
      warns.push({
        type: 'error',
        message: `${tablesWithoutPK.length} table(s) missing primary key: ${tableNames}`,
        chatPrompt: `The following tables are missing primary keys: ${tableNames}

Please explain:
1. Why is having a primary key critical for these tables?
2. What problems can occur without primary keys?
3. What would you recommend as primary keys for each of these tables?
4. Provide the SQL to add primary keys to fix this issue.`
      });
    }
    
    // Check for tables without RLS (security concern)
    const tablesWithoutRLS = tables.filter(t => !t.rlsEnabled && (!t.rlsPolicies || t.rlsPolicies.length === 0));
    if (tablesWithoutRLS.length > 0) {
      const tableNames = tablesWithoutRLS.map(t => t.name).join(', ');
      warns.push({
        type: 'warning',
        message: `${tablesWithoutRLS.length} table(s) without RLS policies: ${tableNames}`,
        chatPrompt: `The following tables have no Row Level Security (RLS) policies: ${tableNames}

Please explain:
1. What security risks does this pose?
2. For a multi-tenant application, why is RLS important for each of these tables?
3. Provide example RLS policies I should add to secure these tables properly.
4. Show the SQL to enable RLS and create appropriate policies.`
      });
    }
    
    // Check for tables with RLS enabled but no policies
    const rlsEnabledNoPolicies = tables.filter(t => t.rlsEnabled && (!t.rlsPolicies || t.rlsPolicies.length === 0));
    if (rlsEnabledNoPolicies.length > 0) {
      const tableNames = rlsEnabledNoPolicies.map(t => t.name).join(', ');
      warns.push({
        type: 'error',
        message: `${rlsEnabledNoPolicies.length} table(s) have RLS enabled but no policies (blocks all access): ${tableNames}`,
        chatPrompt: `CRITICAL: The following tables have RLS enabled but NO policies defined: ${tableNames}

This means ALL access to these tables is currently BLOCKED!

Please explain:
1. Why is this a critical issue?
2. How does RLS work when enabled with no policies?
3. What policies should I add to restore access while maintaining security?
4. Provide the SQL to create appropriate RLS policies for each table.`
      });
    }
    
    // Check for orphan tables (no foreign keys in or out)
    const orphanTables = tables.filter(t => {
      const hasOutgoingFK = t.foreignKeys.length > 0;
      const hasIncomingFK = tables.some(other => 
        other.foreignKeys.some(fk => fk.referencedTable === t.name)
      );
      return !hasOutgoingFK && !hasIncomingFK && t.name !== 'users';
    });
    if (orphanTables.length > 0) {
      const tableNames = orphanTables.map(t => t.name).join(', ');
      warns.push({
        type: 'info',
        message: `${orphanTables.length} isolated table(s) with no relationships: ${tableNames}`,
        chatPrompt: `The following tables have no foreign key relationships (isolated): ${tableNames}

Please analyze:
1. Is this intentional for these tables, or is it a design issue?
2. Looking at the table structure, should any of these tables have relationships to other tables?
3. What foreign keys would you recommend adding?
4. Provide SQL to add appropriate foreign key relationships if needed.`
      });
    }
    
    return warns;
  }, [tables]);
  
  // Handle explaining a warning in chat
  const handleExplainWarning = useCallback((prompt: string) => {
    setAnalysisPrompt(prompt);
  }, []);

  // Loading state
  if (loading) {
    return (
      <main className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Scanning database folder...</p>
        </div>
      </main>
    );
  }

  // Error state
  if (error && databases.length === 0) {
    return (
      <main className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <p className="text-destructive font-medium">{error}</p>
        </div>
      </main>
    );
  }

  // No databases found
  if (databases.length === 0) {
    return (
      <main className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <Database className="w-16 h-16 text-muted-foreground/50" />
          <div>
            <p className="text-lg font-medium text-muted-foreground">
              No database files found
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Add .sql files to the{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded">database/</code>{" "}
              folder
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-12 flex items-center px-4 gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">Arc Planner</span>
        </div>

        <div className="h-4 w-px bg-muted" />

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">db:</span>
          <Select value={selectedDb || ""} onValueChange={handleSelectDb}>
            <SelectTrigger className="w-[180px] h-7 text-xs border-0 bg-muted/50">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {databases.map((db) => (
                <SelectItem key={db.name} value={db.name}>
                  <div className="flex items-center gap-2">
                    <FileCode className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs">{db.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {tables.length > 0 && (
          <>
            <div className="h-4 w-px bg-muted" />
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>{tables.length} tables</span>
              <span>{tables.reduce((acc, t) => acc + t.columns.length, 0)} cols</span>
              <span>{tables.reduce((acc, t) => acc + t.foreignKeys.length, 0)} fk</span>
            </div>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAnalyzeDatabase}
                  disabled={tables.length === 0}
                  className="gap-1.5 h-7 text-xs"
                >
                  <ScanSearch className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Analyze</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Analyze schema for quality & multi-tenancy</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <ThemeToggle />
        </div>
      </header>

      {/* Warnings Banner */}
      {warnings.length > 0 && (
        <div className="shrink-0 border-b border-border/50">
          <button
            onClick={() => setWarningsExpanded(!warningsExpanded)}
            className="w-full px-4 py-1.5 flex items-center justify-between text-xs hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-muted-foreground">
                {warnings.length} schema warning{warnings.length > 1 ? 's' : ''}
              </span>
            </div>
            {warningsExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
          {warningsExpanded && (
            <div className="px-4 pb-2 space-y-1">
              {warnings.map((warn, i) => (
                <div
                  key={i}
                  className={`text-xs py-1 px-2 rounded flex items-center gap-2 ${
                    warn.type === 'error'
                      ? 'text-red-400 bg-red-500/10'
                      : warn.type === 'warning'
                      ? 'text-amber-400 bg-amber-500/10'
                      : 'text-blue-400 bg-blue-500/10'
                  }`}
                >
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span className="flex-1">{warn.message}</span>
                  <button
                    onClick={() => handleExplainWarning(warn.chatPrompt)}
                    className="p-1 rounded hover:bg-foreground/10 transition-colors shrink-0"
                    title="Explain in chat"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {parsing ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Parsing schema...</p>
            </div>
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Left Sidebar - Tables List */}
            <ResizablePanel id="sidebar" defaultSize="18%" minSize="180px" maxSize="350px">
              <TablesSidebar
                tables={tables}
                selectedTable={selectedTable}
                onSelectTable={handleSelectTable}
              />
            </ResizablePanel>

            <ResizableHandle />

            {/* Center - Table Details */}
            <ResizablePanel id="details" defaultSize="52%" minSize="300px">
              <TableDetails
                table={currentTableData}
                onNavigateToTable={handleSelectTable}
              />
            </ResizablePanel>

            <ResizableHandle />

            {/* Right - Chat Panel (Resizable) */}
            <ResizablePanel id="chat" defaultSize="30%" minSize="250px" maxSize="500px">
              <ChatPanel 
                schema={schemaString} 
                currentTable={selectedTable}
                externalPrompt={analysisPrompt}
                onExternalPromptConsumed={clearAnalysisPrompt}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </main>
  );
}
