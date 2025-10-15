// server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const server = new McpServer(
    { name: "postgres-chat-history", version: "2.0.0" }
  );

  // Save message
  server.registerTool(
    "save_chat_message",
    {
      title: "Save Chat Message",
      description: "Save a message for a user and conversation",
      inputSchema: {
        user_id: z.string(),
        conversation_id: z.string(),
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
      },
    },
    async ({ user_id, conversation_id, role, content }) => {
      await pool.query(
        `INSERT INTO conversations (user_id, conversation_id, role, content)
         VALUES ($1, $2, $3, $4)`,
        [user_id, conversation_id, role, content]
      );
      return { content: [{ type: "text", text: "Message saved." }] };
    }
  );

  // Load history (summary + last N messages)
  server.registerTool(
    "load_chat_history",
    {
      title: "Load Chat History",
      description: "Load summary (if any) and latest messages",
      inputSchema: {
        user_id: z.string(),
        conversation_id: z.string(),
        limit: z.number().default(20),
      },
    },
    async ({ user_id, conversation_id, limit }) => {
      // Get latest summary
      const summaryRes = await pool.query(
        `SELECT summary, up_to
         FROM conversation_summaries
         WHERE user_id = $1 AND conversation_id = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [user_id, conversation_id]
      );

      const summary = summaryRes.rows.length > 0 ? summaryRes.rows[0] : null;

      // Get last N messages after the summary point
      let messages;
      if (summary) {
        messages = await pool.query(
          `SELECT role, content, created_at
           FROM conversations
           WHERE user_id = $1 AND conversation_id = $2
             AND created_at > $3
           ORDER BY created_at ASC
           LIMIT $4`,
          [user_id, conversation_id, summary.up_to, limit]
        );
      } else {
        messages = await pool.query(
          `SELECT role, content, created_at
           FROM conversations
           WHERE user_id = $1 AND conversation_id = $2
           ORDER BY created_at ASC
           LIMIT $3`,
          [user_id, conversation_id, limit]
        );
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ summary, messages: messages.rows }),
          },
        ],
      };
    }
  );

  // Summarize older messages
server.registerTool(
    "summarize_chat_history",
    {
      title: "Summarize Chat History",
      description: "Summarize old messages into a compact form",
      inputSchema: {
        user_id: z.string(),
        conversation_id: z.string(),
        before: z.string().optional(), // ISO timestamp, summarize messages before this
      },
    },
    async ({ user_id, conversation_id, before }) => {
      // Fetch old messages
      const res = await pool.query(
        `SELECT role, content, created_at
         FROM conversations
         WHERE user_id = $1 AND conversation_id = $2
           AND ($3::timestamp IS NULL OR created_at < $3::timestamp)
         ORDER BY created_at ASC`,
        [user_id, conversation_id, before ?? null]
      );

      if (res.rows.length === 0) {
        return { content: [{ type: "text", text: "No messages to summarize." }] };
      }

        const historyText = res.rows.map(r => `${r.role}: ${r.content}`).join("\n");
        // 2. Ask the agent itself to summarize
        // Cursor agent will "fill this in" because it's calling this tool
        return {
            content: [{ type: "text", text: `Summarize the following conversation:\n\n${historyText}` }],
        };
    },
);

  server.registerTool(
    "store_chat_summary",
    {
      title: "Store Chat Summary",
      description: "Store a summary into summaries table.",
      inputSchema: { user_id: z.string(), conversation_id: z.string(), summary: z.string() }
    },
    async ({ user_id, conversation_id, summary }) => {
        const res = await pool.query(
            `SELECT role, content, created_at
             FROM conversations
             WHERE user_id = $1 AND conversation_id = $2
             ORDER BY created_at DESC
             LIMIT 1
             `,
            [user_id, conversation_id]
          );
    
          if (res.rows.length === 0) {
            return { content: [{ type: "text", text: "No messages to summarize." }] };
          }

        // Save summary in DB
        const lastTimestamp = res.rows[res.rows.length - 1].created_at;
        await pool.query(
            `INSERT INTO conversation_summaries (user_id, conversation_id, summary, up_to)
            VALUES ($1, $2, $3, $4)`,
            [user_id, conversation_id, summary, lastTimestamp]
        );

        return {
            content: [{ type: "text", text: "Summary stored." }],
        };
    }
  );
  

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("MCP Postgres server (multi-user + summarization) running...");
}

main().catch((err) => {
  console.error("Fatal MCP error:", err);
  process.exit(1);
});
