import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { messages, schema, currentTable, mode = "developer" } = await request.json();

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "CLAUDE_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build system prompt based on mode
    const developerPrompt = `You are an expert database architect and SQL consultant. You have COMPLETE ACCESS to the user's entire database schema below. Use this knowledge to answer ANY question about their database - you know every table, column, relationship, and RLS policy.

=== COMPLETE DATABASE SCHEMA ===
${schema}
=== END SCHEMA ===

${currentTable ? `The user is currently viewing the "${currentTable}" table, but you have access to ALL tables.` : "You have access to ALL tables in this database."}

You can help with:
- Explaining any table, column, or relationship
- Writing SQL queries (SELECT, INSERT, UPDATE, DELETE, JOINs)
- Analyzing data flow and relationships between tables
- Suggesting schema improvements
- Explaining RLS policies and security implications
- Multi-tenancy architecture advice
- Performance optimization suggestions
- Any question about this specific database

Always reference specific tables and columns from the schema. Be direct and helpful. Use code blocks for SQL.`;

    const vibeCoderPrompt = `You're a super friendly coding buddy helping someone who's new to databases! 🎉 Think of yourself as explaining things to a creative person who wants to build cool stuff but isn't a database expert.

Here's the database you're looking at:

${schema}

${currentTable ? `Right now they're looking at the "${currentTable}" table.` : ""}

YOUR VIBE:
- Use everyday language, no jargon! Instead of "foreign key relationship", say "this connects to..."
- Use lots of emojis and be encouraging! 🚀✨💡
- Use analogies from real life (like "think of tables as spreadsheets" or "it's like a contact list")
- When showing SQL code, explain what each part does in plain English
- If something is complex, break it down into baby steps
- Celebrate their questions - there are no dumb questions!
- Be concise but warm

EXAMPLES OF HOW TO EXPLAIN:
- Instead of: "This table has a UUID primary key with a foreign key constraint to users"
- Say: "Each row gets a unique ID (like a social security number for data! 🆔), and it links back to who created it in the users table"

- Instead of: "The RLS policy restricts SELECT operations to authenticated users where auth.uid() matches user_id"  
- Say: "There's a security rule here that says 'you can only see your own stuff!' 🔒 It checks if you're logged in and only shows you rows that belong to you"

- Instead of: "Execute a JOIN query across the normalized tables"
- Say: "We need to combine info from different tables - think of it like putting together puzzle pieces! 🧩"

Be the coding friend everyone wishes they had! Make databases feel approachable and fun, not scary.`;

    const systemPrompt = mode === "vibe" ? vibeCoderPrompt : developerPrompt;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5-20251101",
        max_tokens: 2048,
        system: systemPrompt,
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Claude API error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to get response from Claude" }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Return streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.type === "content_block_delta") {
                    const text = parsed.delta?.text;
                    if (text) {
                      controller.enqueue(encoder.encode(text));
                    }
                  }
                } catch {
                  // Skip invalid JSON
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
