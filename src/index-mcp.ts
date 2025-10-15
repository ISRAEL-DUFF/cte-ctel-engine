// server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Pool } from "pg";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT now()
      )
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_conversation_id ON conversations(conversation_id)
    `);
    
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}

async function main() {
  // Initialize database
  await initDatabase();
  
  const server = new McpServer(
    { name: "postgres-chat-history", version: "1.0.0" },
  );

  server.registerTool(
    "save_chat_message",
    {
      title: "Save Chat Message",
      description: "Persist a chat message into PostgreSQL",
      inputSchema: {
        conversation_id: z.string(),
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
      },
    },
    async ({ conversation_id, role, content }) => {
      await pool.query(
        `INSERT INTO conversations (conversation_id, role, content)
         VALUES ($1, $2, $3)`,
        [conversation_id, role, content]
      );
      return { content: [{ type: "text", text: "Message saved." }] };
    }
  );

  server.registerTool(
    "load_chat_history",
    {
      title: "Load Chat History",
      description: "Retrieve messages for a conversation from Postgres",
      inputSchema: {
        conversation_id: z.string(),
      },
    },
    async ({ conversation_id }) => {
      const res = await pool.query(
        `SELECT role, content, created_at
         FROM conversations
         WHERE conversation_id = $1
         ORDER BY created_at ASC`,
        [conversation_id]
      );
      return { content: [{ type: "text", text: JSON.stringify(res.rows) }] };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("MCP server for Postgres chat history is running…");
}

main().catch(err => {
  console.error("Fatal MCP server error:", err);
  process.exit(1);
});
