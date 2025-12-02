#!/usr/bin/env node

/**
 * ERPNext MCP Server - HTTP Transport
 * This server provides integration with the ERPNext/Frappe API over HTTP.
 * Uses StreamableHTTPServerTransport for MCP communication.
 */

import express, { Request, Response } from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { Config } from "./utils/config.js";
import { Logger } from "./utils/logger.js";
import { ERPNextClient } from "./client/erpnext-client.js";
import { registerResourceHandlers } from "./handlers/resource-handlers.js";
import { registerToolHandlers } from "./handlers/tool-handlers.js";

// Initialize logger
const logger = Logger.fromEnv();

// Initialize configuration
let config: Config;
let erpnext: ERPNextClient;

try {
  config = new Config();
  erpnext = new ERPNextClient(config, logger);
} catch (error) {
  logger.error("Failed to initialize configuration:", error);
  process.exit(1);
}

/**
 * Create a new MCP server instance with handlers registered
 */
function createMcpServer(): Server {
  const server = new Server(
    {
      name: "erpnext-server",
      version: "0.1.0"
    },
    {
      capabilities: {
        resources: {},
        tools: {}
      }
    }
  );

  // Register handlers
  registerResourceHandlers(server, erpnext, logger);
  registerToolHandlers(server, erpnext, logger);

  // Setup error handling
  server.onerror = (error) => {
    logger.error("MCP Server error:", error);
  };

  return server;
}

// Express app setup
const app = express();
app.use(express.json());
app.use(cors({
  origin: "*",
  exposedHeaders: ["Mcp-Session-Id"]
}));

// Store transports by session ID
const transports: Record<string, StreamableHTTPServerTransport> = {};

/**
 * Health check endpoint
 */
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", authenticated: erpnext.isAuthenticated() });
});

/**
 * MCP POST endpoint - handles initialization and messages
 */
app.post("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (sessionId) {
    logger.debug(`Received MCP request for session: ${sessionId}`);
  }

  try {
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      // Reuse existing transport
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New initialization request
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          logger.info(`Session initialized: ${newSessionId}`);
          transports[newSessionId] = transport;
        },
        onsessionclosed: (closedSessionId) => {
          logger.info(`Session closed: ${closedSessionId}`);
          delete transports[closedSessionId];
        }
      });

      // Set up onclose handler
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {
          logger.debug(`Transport closed for session ${sid}`);
          delete transports[sid];
        }
      };

      // Connect transport to MCP server
      const server = createMcpServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    } else {
      // Invalid request
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided"
        },
        id: null
      });
      return;
    }

    // Handle request with existing transport
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    logger.error("Error handling MCP POST request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error"
        },
        id: null
      });
    }
  }
});

/**
 * MCP GET endpoint - handles SSE streams
 */
app.get("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  const lastEventId = req.headers["last-event-id"];
  if (lastEventId) {
    logger.debug(`Client reconnecting with Last-Event-ID: ${lastEventId}`);
  } else {
    logger.debug(`Establishing SSE stream for session ${sessionId}`);
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
});

/**
 * MCP DELETE endpoint - handles session termination
 */
app.delete("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  logger.info(`Session termination request for session ${sessionId}`);

  try {
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  } catch (error) {
    logger.error("Error handling session termination:", error);
    if (!res.headersSent) {
      res.status(500).send("Error processing session termination");
    }
  }
});

// Start server
const port = parseInt(process.env.MCP_PORT || "3000", 10);

app.listen(port, () => {
  logger.info(`ERPNext MCP HTTP Server listening on port ${port}`);
  logger.info(`MCP endpoint: http://localhost:${port}/mcp`);
  logger.info(`Health check: http://localhost:${port}/health`);
});

// Handle graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down server...");

  // Close all active transports
  for (const sessionId in transports) {
    try {
      logger.debug(`Closing transport for session ${sessionId}`);
      await transports[sessionId].close();
      delete transports[sessionId];
    } catch (error) {
      logger.error(`Error closing transport for session ${sessionId}:`, error);
    }
  }

  logger.info("Server shutdown complete");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Received SIGTERM, shutting down...");
  process.emit("SIGINT", "SIGINT");
});

