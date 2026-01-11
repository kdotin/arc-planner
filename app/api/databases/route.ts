import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const databaseDir = path.join(process.cwd(), "database");

    // Check if directory exists
    if (!fs.existsSync(databaseDir)) {
      return NextResponse.json({ databases: [], error: "No database folder found" });
    }

    // Read all .sql files
    const files = fs.readdirSync(databaseDir);
    const sqlFiles = files
      .filter((file) => file.endsWith(".sql"))
      .map((file) => ({
        name: file.replace(".sql", ""),
        filename: file,
        path: path.join("database", file),
        size: fs.statSync(path.join(databaseDir, file)).size,
        modified: fs.statSync(path.join(databaseDir, file)).mtime,
      }));

    return NextResponse.json({ databases: sqlFiles });
  } catch (error) {
    console.error("Error scanning database folder:", error);
    return NextResponse.json(
      { databases: [], error: "Failed to scan database folder" },
      { status: 500 }
    );
  }
}
