/**
 * Resource request handlers for ERPNext MCP Server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  McpError,
  ErrorCode
} from "@modelcontextprotocol/sdk/types.js";
import { ERPNextClient } from "../client/erpnext-client.js";
import { Logger } from "../utils/logger.js";

/**
 * Register all resource-related handlers on the MCP server
 */
export function registerResourceHandlers(
  server: Server, 
  erpnext: ERPNextClient,
  logger: Logger
): void {
  /**
   * Handler for listing available ERPNext resources.
   * Exposes DocTypes list as a resource.
   */
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    logger.debug("Handling ListResourcesRequest");
    
    const resources = [
      {
        uri: "erpnext://DocTypes",
        name: "All DocTypes",
        mimeType: "application/json",
        description: "List of all available DocTypes in the ERPNext instance"
      }
    ];

    return { resources };
  });

  /**
   * Handler for resource templates.
   * Allows querying ERPNext documents by doctype and name.
   */
  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    logger.debug("Handling ListResourceTemplatesRequest");
    
    const resourceTemplates = [
      {
        uriTemplate: "erpnext://{doctype}/{name}",
        name: "ERPNext Document",
        mimeType: "application/json",
        description: "Fetch an ERPNext document by doctype and name"
      }
    ];

    return { resourceTemplates };
  });

  /**
   * Handler for reading ERPNext resources.
   */
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    logger.debug(`Handling ReadResourceRequest: ${request.params.uri}`);
    
    if (!erpnext.isAuthenticated()) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "Not authenticated with ERPNext. Please configure API key authentication."
      );
    }

    const uri = request.params.uri;
    let result: unknown;

    // Handle special resource: erpnext://DocTypes (list of all doctypes)
    if (uri === "erpnext://DocTypes") {
      try {
        const doctypes = await erpnext.getAllDocTypes();
        result = { doctypes };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to fetch DocTypes: ${message}`
        );
      }
    } else {
      // Handle document access: erpnext://{doctype}/{name}
      const documentMatch = uri.match(/^erpnext:\/\/([^\/]+)\/(.+)$/);
      if (documentMatch) {
        const doctype = decodeURIComponent(documentMatch[1]);
        const name = decodeURIComponent(documentMatch[2]);
        
        try {
          result = await erpnext.getDocument(doctype, name);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Failed to fetch ${doctype} ${name}: ${message}`
          );
        }
      }
    }

    if (!result) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Invalid ERPNext resource URI: ${uri}`
      );
    }

    return {
      contents: [{
        uri: request.params.uri,
        mimeType: "application/json",
        text: JSON.stringify(result, null, 2)
      }]
    };
  });
}

