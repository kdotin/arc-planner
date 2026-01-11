"use client";

import {
  KeyRound,
  Link2,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Eye,
  PenLine,
  Trash2,
  Plus,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

interface TableData {
  name: string;
  schema: string;
  columns: Column[];
  primaryKeys: string[];
  foreignKeys: ForeignKey[];
  rlsEnabled?: boolean;
  rlsPolicies?: RLSPolicy[];
}

interface TableDetailsProps {
  table: TableData | null;
  onNavigateToTable?: (tableName: string) => void;
}

function getTypeIcon(type: string) {
  const lowerType = type.toLowerCase();
  if (lowerType.includes("uuid") || lowerType.includes("int") || lowerType.includes("serial"))
    return <Hash className="w-3.5 h-3.5" />;
  if (lowerType.includes("timestamp") || lowerType.includes("date"))
    return <Calendar className="w-3.5 h-3.5" />;
  if (lowerType.includes("bool"))
    return <ToggleLeft className="w-3.5 h-3.5" />;
  if (lowerType.includes("text") || lowerType.includes("char") || lowerType.includes("varchar"))
    return <Type className="w-3.5 h-3.5" />;
  if (lowerType.includes("json"))
    return <FileText className="w-3.5 h-3.5" />;
  return <Type className="w-3.5 h-3.5" />;
}

function getCommandIcon(command: string) {
  switch (command) {
    case "SELECT":
      return <Eye className="w-3.5 h-3.5" />;
    case "INSERT":
      return <Plus className="w-3.5 h-3.5" />;
    case "UPDATE":
      return <PenLine className="w-3.5 h-3.5" />;
    case "DELETE":
      return <Trash2 className="w-3.5 h-3.5" />;
    default:
      return <Shield className="w-3.5 h-3.5" />;
  }
}

function getCommandColor() {
  return "bg-muted text-muted-foreground";
}

export default function TableDetails({ table, onNavigateToTable }: TableDetailsProps) {
  if (!table) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
        <FileText className="w-10 h-10 mb-3 opacity-20" />
        <p className="text-sm">Select a table</p>
      </div>
    );
  }

  const pkColumns = table.columns.filter((c) => c.isPrimaryKey);
  const fkColumns = table.foreignKeys;
  const rlsPolicies = table.rlsPolicies || [];
  const rlsEnabled = table.rlsEnabled || rlsPolicies.length > 0;

  return (
    <ScrollArea className="h-full">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-4 h-4 text-muted-foreground" />
            <div>
              <h1 className="text-lg font-semibold">{table.name}</h1>
              {table.schema && (
                <p className="text-xs text-muted-foreground">
                  Schema: {table.schema}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Hash className="w-3 h-3" />
              {table.columns.length} columns
            </span>
            {pkColumns.length > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <KeyRound className="w-3 h-3" />
                {pkColumns.length} pk
              </span>
            )}
            {fkColumns.length > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Link2 className="w-3 h-3" />
                {fkColumns.length} fk
              </span>
            )}
            {rlsEnabled && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                RLS
              </span>
            )}
          </div>
        </div>

        <div className="h-px bg-muted my-6" />

        {/* RLS Policies Section */}
        {rlsEnabled && (
          <>
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Row Level Security
                </h2>
              </div>

              {rlsPolicies.length === 0 ? (
                <div className="p-3 bg-muted/50">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm mb-1">
                        No Policies Defined
                      </p>
                      <p className="text-xs text-muted-foreground">
                        RLS is enabled but no policies are defined. All access is denied by default.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {rlsPolicies.map((policy, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <div className="p-1.5 bg-muted">
                          {getCommandIcon(policy.command)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {policy.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase">
                              {policy.command}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {policy.permissive ? "permissive" : "restrictive"}
                            </span>
                          </div>

                          {/* Plain English explanation */}
                          <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
                            {policy.plainEnglish}
                          </p>

                          {/* Roles */}
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {policy.roles.join(", ")}
                            </span>
                          </div>

                          {/* Technical details (collapsible) */}
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              View SQL
                            </summary>
                            <div className="mt-2 space-y-2">
                              {policy.using && (
                                <div className="p-2 bg-muted">
                                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                    USING
                                  </span>
                                  <code className="block mt-1 text-xs font-mono text-foreground whitespace-pre-wrap">
                                    {policy.using}
                                  </code>
                                </div>
                              )}
                              {policy.withCheck && (
                                <div className="p-2 bg-muted">
                                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                    WITH CHECK
                                  </span>
                                  <code className="block mt-1 text-xs font-mono text-foreground whitespace-pre-wrap">
                                    {policy.withCheck}
                                  </code>
                                </div>
                              )}
                            </div>
                          </details>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* RLS Implications Summary */}
              {rlsPolicies.length > 0 && (
                <div className="mt-4 p-3 bg-muted/30">
                  <h3 className="font-medium text-xs text-muted-foreground mb-2 flex items-center gap-2 uppercase tracking-wider">
                    <ShieldCheck className="w-3 h-3" />
                    Summary
                  </h3>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {rlsPolicies.some((p) => p.command === "SELECT" || p.command === "ALL") && (
                      <li className="flex items-start gap-2">
                        <Eye className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>Read access controlled</span>
                      </li>
                    )}
                    {rlsPolicies.some((p) => p.command === "INSERT" || p.command === "ALL") && (
                      <li className="flex items-start gap-2">
                        <Plus className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>Create access controlled</span>
                      </li>
                    )}
                    {rlsPolicies.some((p) => p.command === "UPDATE" || p.command === "ALL") && (
                      <li className="flex items-start gap-2">
                        <PenLine className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>Update access controlled</span>
                      </li>
                    )}
                    {rlsPolicies.some((p) => p.command === "DELETE" || p.command === "ALL") && (
                      <li className="flex items-start gap-2">
                        <Trash2 className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>Delete access controlled</span>
                      </li>
                    )}
                    {rlsPolicies.some((p) => !p.permissive) && (
                      <li className="flex items-start gap-2">
                        <ShieldAlert className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>Restrictive policies present</span>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div className="h-px bg-muted my-6" />
          </>
        )}

        {/* Columns Table */}
        <div className="mb-8">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Columns
          </h2>
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-[200px] text-xs">Name</TableHead>
                  <TableHead className="w-[150px] text-xs">Type</TableHead>
                  <TableHead className="w-[80px] text-center text-xs">Null</TableHead>
                  <TableHead className="w-[80px] text-center text-xs">Unique</TableHead>
                  <TableHead className="text-xs">Default</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.columns.map((column) => {
                  const isPK = column.isPrimaryKey;
                  const fk = fkColumns.find((f) => f.column === column.name);

                  return (
                    <TableRow
                      key={column.name}
                      className="hover:bg-muted/20"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isPK && (
                            <KeyRound className="w-3 h-3 text-muted-foreground shrink-0" />
                          )}
                          {fk && !isPK && (
                            <Link2 className="w-3 h-3 text-muted-foreground shrink-0" />
                          )}
                          <span className="text-sm">
                            {column.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs text-muted-foreground">
                          {column.type.toLowerCase()}
                        </code>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-xs text-muted-foreground">
                          {column.nullable ? "yes" : "no"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-xs text-muted-foreground">
                          {column.isUnique ? "yes" : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {column.defaultValue ? (
                          <code className="text-xs text-muted-foreground">
                            {column.defaultValue.length > 30
                              ? column.defaultValue.slice(0, 30) + "..."
                              : column.defaultValue}
                          </code>
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Foreign Keys */}
        {fkColumns.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Foreign Keys
            </h2>
            <div className="space-y-1">
              {fkColumns.map((fk, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <Link2 className="w-3 h-3 text-muted-foreground shrink-0" />
                  <code className="text-xs">
                    {fk.column}
                  </code>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <button
                    onClick={() => onNavigateToTable?.(fk.referencedTable)}
                    className="text-xs hover:underline"
                  >
                    {fk.referencedTable}.{fk.referencedColumn}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Check Constraints */}
        {table.columns.some((c) => c.checkConstraint) && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Check Constraints
            </h2>
            <div className="space-y-2">
              {table.columns
                .filter((c) => c.checkConstraint)
                .map((column) => (
                  <div
                    key={column.name}
                    className="p-3 bg-muted/50 border rounded-lg"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-chart-5" />
                      <span className="font-medium text-sm">{column.name}</span>
                    </div>
                    <code className="text-xs text-muted-foreground block mt-1 whitespace-pre-wrap">
                      {column.checkConstraint}
                    </code>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
