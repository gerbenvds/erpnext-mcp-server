#!/usr/bin/env node

/**
 * ERPNext MCP Server
 * This server provides integration with the ERPNext/Frappe API, allowing:
 * - Authentication with ERPNext
 * - Fetching documents from ERPNext
 * - Querying lists of documents
 * - Creating and updating documents
 * - Running reports
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Config } from "./utils/config.js";
import { Logger } from "./utils/logger.js";
import { ERPNextClient } from "./client/erpnext-client.js";
import { registerResourceHandlers } from "./handlers/resource-handlers.js";
import { registerToolHandlers } from "./handlers/tool-handlers.js";

/**
 * Start the server using stdio transport.
 */
async function main(): Promise<void> {
  // Initialize logger
  const logger = Logger.fromEnv();
  
  try {
    logger.info("Initializing ERPNext MCP server");
    
    // Initialize configuration
    const config = new Config();
    
    // Initialize ERPNext client
    const erpnext = new ERPNextClient(config, logger);
    
    // Create MCP server with capabilities for resources and tools
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
      logger.error("Server error:", error);
    };
    
    // Start server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info("ERPNext MCP server running on stdio");
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info("Shutting down...");
      await server.close();
      process.exit(0);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();
