import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
  isUnique: boolean;
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
  command: string; // SELECT, INSERT, UPDATE, DELETE, ALL
  roles: string[];
  using: string | null; // USING clause - for SELECT/UPDATE/DELETE
  withCheck: string | null; // WITH CHECK clause - for INSERT/UPDATE
  permissive: boolean; // PERMISSIVE or RESTRICTIVE
  plainEnglish: string; // Human-readable explanation
}

interface Table {
  name: string;
  schema: string;
  columns: Column[];
  primaryKeys: string[];
  foreignKeys: ForeignKey[];
  rlsEnabled: boolean;
  rlsPolicies: RLSPolicy[];
}

function generatePlainEnglish(
  tableName: string,
  policy: Omit<RLSPolicy, "plainEnglish">
): string {
  const commandMap: Record<string, string> = {
    SELECT: "view",
    INSERT: "create",
    UPDATE: "modify",
    DELETE: "remove",
    ALL: "access",
  };

  const action = commandMap[policy.command] || policy.command.toLowerCase();
  
  // Format roles nicely
  const formatRole = (role: string) => {
    const roleMap: Record<string, string> = {
      public: "Anyone (including anonymous)",
      authenticated: "Logged-in users",
      anon: "Anonymous users",
      service_role: "Service/backend only",
    };
    return roleMap[role.toLowerCase()] || role;
  };
  
  const roles =
    policy.roles.length === 0 || policy.roles.some(r => r.toLowerCase() === "public")
      ? "Anyone"
      : policy.roles.map(formatRole).join(", ");

  let explanation = "";

  // Start with who and what
  if (policy.permissive) {
    explanation = `${roles} can ${action} rows`;
  } else {
    explanation = `Restricts who can ${action} rows`;
  }

  // Add USING condition explanation
  if (policy.using) {
    const usingClean = policy.using.trim();

    // Common patterns and their explanations
    if (usingClean.match(/auth\.uid\(\)\s*=\s*user_id/i)) {
      explanation += " — only their own data (where user_id matches their login)";
    } else if (usingClean.match(/auth\.uid\(\)\s*=\s*id/i)) {
      explanation += " — only their own record";
    } else if (usingClean.match(/auth\.uid\(\)\s*=\s*sender_id\s+OR\s+auth\.uid\(\)\s*=\s*recipient_id/i)) {
      explanation += " — only messages they sent or received";
    } else if (usingClean.match(/auth\.uid\(\)\s*=\s*sender_id/i)) {
      explanation += " — only messages they sent";
    } else if (usingClean.match(/auth\.uid\(\)\s*=\s*recipient_id/i)) {
      explanation += " — only messages they received";
    } else if (usingClean.match(/is_published\s*=\s*true/i)) {
      explanation += " — only published content";
    } else if (usingClean.match(/auth\.role\(\)\s*=\s*'authenticated'/i)) {
      explanation += " — only if logged in";
    } else if (usingClean.match(/auth\.role\(\)\s*=\s*'anon'/i)) {
      explanation += " — even without logging in";
    } else if (usingClean.match(/auth\.role\(\)\s*=\s*'admin'/i)) {
      explanation += " — only admins";
    } else if (usingClean.match(/role\s*=\s*'admin'/i)) {
      explanation += " — only users with admin role";
    } else if (usingClean.match(/role\s*=\s*'moderator'/i)) {
      explanation += " — only moderators";
    } else if (usingClean.match(/EXISTS.*role\s*=\s*'admin'/i)) {
      explanation += " — only if user is an admin";
    } else if (usingClean.match(/EXISTS.*role\s*=\s*'moderator'/i)) {
      explanation += " — only if user is a moderator";
    } else if (usingClean.match(/EXISTS.*is_published\s*=\s*true/i)) {
      explanation += " — only on published posts";
    } else if (usingClean.match(/is_admin/i)) {
      explanation += " — only if they are an admin";
    } else if (usingClean === "true" || usingClean === "(true)") {
      explanation += " — unrestricted";
    } else if (usingClean === "false" || usingClean === "(false)") {
      explanation += " — access blocked";
    } else {
      // Truncate long conditions
      const truncated = usingClean.length > 60 ? usingClean.slice(0, 60) + "..." : usingClean;
      explanation += ` — condition: ${truncated}`;
    }
  }

  // Add WITH CHECK explanation for writes
  if (policy.withCheck && policy.command !== "SELECT") {
    const checkClean = policy.withCheck.trim();

    if (checkClean.match(/auth\.uid\(\)\s*=\s*user_id/i)) {
      explanation += ". Must set user_id to own ID";
    } else if (checkClean.match(/auth\.uid\(\)\s*=\s*sender_id/i)) {
      explanation += ". Must be the sender";
    } else if (checkClean.match(/auth\.uid\(\)\s*=\s*id/i)) {
      explanation += ". Can only modify own record";
    } else if (checkClean === "true" || checkClean === "(true)") {
      // No additional constraint
    } else {
      explanation += `. Validation required`;
    }
  }

  return explanation;
}

function parseSQL(sql: string): { tables: Table[]; rlsPolicies: Map<string, RLSPolicy[]> } {
  const tables: Table[] = [];
  const rlsPoliciesMap = new Map<string, RLSPolicy[]>();
  const rlsEnabledTables = new Set<string>();

  // Match ALTER TABLE ... ENABLE ROW LEVEL SECURITY
  const rlsEnableRegex =
    /ALTER\s+TABLE\s+(?:(?:ONLY\s+)?(?:(\w+)\.)?)?(\S+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;
  let rlsMatch;
  while ((rlsMatch = rlsEnableRegex.exec(sql)) !== null) {
    const tableName = rlsMatch[2].replace(/["`]/g, "");
    rlsEnabledTables.add(tableName);
  }

  // Match CREATE POLICY statements
  const policyRegex =
    /CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+(?:(\w+)\.)?(\S+)\s+([\s\S]*?)(?=;\s*CREATE|\s*;?\s*$)/gi;

  let policyMatch;
  while ((policyMatch = policyRegex.exec(sql)) !== null) {
    const policyName = policyMatch[1];
    const tableName = policyMatch[3].replace(/["`]/g, "");
    const policyBody = policyMatch[4];

    // Parse policy details
    const forMatch = policyBody.match(/FOR\s+(ALL|SELECT|INSERT|UPDATE|DELETE)/i);
    const command = forMatch ? forMatch[1].toUpperCase() : "ALL";

    const toMatch = policyBody.match(/TO\s+(\w+)/i);
    const roles = toMatch
      ? [toMatch[1].trim().replace(/["`]/g, "")]
      : ["public"];

    // Extract USING clause (handles nested parentheses)
    let usingClause: string | null = null;
    const usingMatch = policyBody.match(/USING\s*\(([\s\S]*)\)(?:\s*WITH\s+CHECK|\s*$)/i);
    if (usingMatch) {
      usingClause = usingMatch[1].trim();
      // Balance parentheses
      let depth = 0;
      let endIdx = 0;
      for (let i = 0; i < usingMatch[1].length; i++) {
        if (usingMatch[1][i] === "(") depth++;
        if (usingMatch[1][i] === ")") depth--;
        if (depth < 0) {
          endIdx = i;
          break;
        }
        endIdx = i + 1;
      }
      usingClause = usingMatch[1].slice(0, endIdx).trim();
    }

    // Extract WITH CHECK clause
    let withCheckClause: string | null = null;
    const withCheckMatch = policyBody.match(/WITH\s+CHECK\s*\(([\s\S]*)\)\s*$/i);
    if (withCheckMatch) {
      withCheckClause = withCheckMatch[1].trim();
    }

    const isPermissive = !policyBody.match(/AS\s+RESTRICTIVE/i);

    const policyData: Omit<RLSPolicy, "plainEnglish"> = {
      name: policyName,
      command,
      roles,
      using: usingClause,
      withCheck: withCheckClause,
      permissive: isPermissive,
    };

    const policy: RLSPolicy = {
      ...policyData,
      plainEnglish: generatePlainEnglish(tableName, policyData),
    };

    if (!rlsPoliciesMap.has(tableName)) {
      rlsPoliciesMap.set(tableName, []);
    }
    rlsPoliciesMap.get(tableName)!.push(policy);
    rlsEnabledTables.add(tableName);
  }

  // Match CREATE TABLE statements
  const tableRegex =
    /CREATE TABLE\s+(?:(\w+)\.)?(\S+)\s*\(([\s\S]*?)(?=\n\);|\n\);\s*CREATE|\n\);\s*$)/gi;

  let match;
  while ((match = tableRegex.exec(sql)) !== null) {
    const schema = match[1] || "public";
    const tableName = match[2].replace(/["`]/g, "");
    const tableBody = match[3];

    const columns: Column[] = [];
    const primaryKeys: string[] = [];
    const foreignKeys: ForeignKey[] = [];

    // Split by lines and process each
    const lines = tableBody.split("\n").map((line) => line.trim());

    for (const line of lines) {
      if (!line || line.startsWith("--")) continue;

      // Check for CONSTRAINT PRIMARY KEY
      const pkConstraintMatch = line.match(
        /CONSTRAINT\s+\w+\s+PRIMARY KEY\s*\(([^)]+)\)/i
      );
      if (pkConstraintMatch) {
        const pkCols = pkConstraintMatch[1].split(",").map((c) => c.trim());
        primaryKeys.push(...pkCols);
        continue;
      }

      // Check for FOREIGN KEY constraints
      const fkMatch = line.match(
        /CONSTRAINT\s+(\w+)\s+FOREIGN KEY\s*\(([^)]+)\)\s*REFERENCES\s+(?:(\w+)\.)?(\S+)\(([^)]+)\)/i
      );
      if (fkMatch) {
        foreignKeys.push({
          constraintName: fkMatch[1],
          column: fkMatch[2].trim(),
          referencedTable: fkMatch[4].replace(/["`]/g, ""),
          referencedColumn: fkMatch[5].trim(),
        });
        continue;
      }

      // Skip other constraints
      if (line.match(/^CONSTRAINT\s+/i)) continue;

      // Parse column definition
      const colMatch = line.match(/^(\w+)\s+(.+?)(?:,\s*)?$/);
      if (colMatch) {
        const colName = colMatch[1];
        const colDef = colMatch[2];

        // Skip if it looks like a keyword
        if (
          ["CONSTRAINT", "PRIMARY", "FOREIGN", "UNIQUE", "CHECK", "INDEX"].includes(
            colName.toUpperCase()
          )
        )
          continue;

        // Extract type (first word after column name)
        const typeMatch = colDef.match(
          /^([\w\s]+?(?:\([^)]*\))?(?:\s+ARRAY)?)/i
        );
        let colType = typeMatch ? typeMatch[1].trim() : colDef.split(/\s/)[0];

        // Clean up type
        colType = colType
          .replace(/\s+NOT\s+NULL.*/i, "")
          .replace(/\s+DEFAULT.*/i, "")
          .replace(/\s+CHECK.*/i, "")
          .replace(/\s+UNIQUE.*/i, "")
          .replace(/\s+PRIMARY.*/i, "")
          .replace(/\s+REFERENCES.*/i, "")
          .replace(/\s+GENERATED.*/i, "")
          .trim();

        const nullable = !colDef.toUpperCase().includes("NOT NULL");
        const isPrimaryKey = colDef.toUpperCase().includes("PRIMARY KEY");
        const isUnique =
          colDef.toUpperCase().includes("UNIQUE") &&
          !colDef.toUpperCase().includes("NOT UNIQUE");

        // Extract default value
        const defaultMatch = colDef.match(/DEFAULT\s+([^,\s]+(?:\([^)]*\))?)/i);
        const defaultValue = defaultMatch ? defaultMatch[1] : null;

        // Extract check constraint
        const checkMatch = colDef.match(/CHECK\s*\(([^)]+(?:\([^)]*\)[^)]*)*)\)/i);
        const checkConstraint = checkMatch ? checkMatch[1] : null;

        if (isPrimaryKey) {
          primaryKeys.push(colName);
        }

        columns.push({
          name: colName,
          type: colType,
          nullable,
          defaultValue,
          isPrimaryKey,
          isUnique,
          checkConstraint,
        });
      }
    }

    // Mark primary keys in columns
    columns.forEach((col) => {
      if (primaryKeys.includes(col.name)) {
        col.isPrimaryKey = true;
      }
    });

    tables.push({
      name: tableName,
      schema,
      columns,
      primaryKeys,
      foreignKeys,
      rlsEnabled: rlsEnabledTables.has(tableName),
      rlsPolicies: rlsPoliciesMap.get(tableName) || [],
    });
  }

  return { tables, rlsPolicies: rlsPoliciesMap };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const filePath = path.join(process.cwd(), "database", `${filename}.sql`);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Database file not found" },
        { status: 404 }
      );
    }

    const sql = fs.readFileSync(filePath, "utf-8");
    const { tables } = parseSQL(sql);

    // Calculate stats
    const stats = {
      totalTables: tables.length,
      totalColumns: tables.reduce((acc, t) => acc + t.columns.length, 0),
      totalRelationships: tables.reduce((acc, t) => acc + t.foreignKeys.length, 0),
      totalRLSPolicies: tables.reduce((acc, t) => acc + t.rlsPolicies.length, 0),
      tablesWithRLS: tables.filter((t) => t.rlsEnabled).length,
    };

    return NextResponse.json({ tables, stats, filename });
  } catch (error) {
    console.error("Error parsing database file:", error);
    return NextResponse.json(
      { error: "Failed to parse database file" },
      { status: 500 }
    );
  }
}
