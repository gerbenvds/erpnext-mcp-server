/**
 * Tool request handlers for ERPNext MCP Server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode
} from "@modelcontextprotocol/sdk/types.js";
import { ERPNextClient } from "../client/erpnext-client.js";
import { Logger } from "../utils/logger.js";
import { 
  validateIdentifier, 
  validateObject, 
  validatePositiveInt 
} from "../utils/validation.js";
import { CallToolResult } from "../models/types.js";

/**
 * Register all tool-related handlers on the MCP server
 */
export function registerToolHandlers(
  server: Server, 
  erpnext: ERPNextClient,
  logger: Logger
): void {
  /**
   * Handler that lists available tools.
   */
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug("Handling ListToolsRequest");
    
    return {
      tools: [
        {
          name: "get_doctypes",
          description: "Get a list of all available DocTypes",
          inputSchema: {
            type: "object",
            properties: {}
          }
        },
        {
          name: "get_doctype_fields",
          description: "Get fields list for a specific DocType",
          inputSchema: {
            type: "object",
            properties: {
              doctype: {
                type: "string",
                description: "ERPNext DocType (e.g., Customer, Item)"
              }
            },
            required: ["doctype"]
          }
        },
        {
          name: "get_documents",
          description: "Get a list of documents for a specific doctype",
          inputSchema: {
            type: "object",
            properties: {
              doctype: {
                type: "string",
                description: "ERPNext DocType (e.g., Customer, Item)"
              },
              fields: {
                type: "array",
                items: {
                  type: "string"
                },
                description: "Fields to include (optional)"
              },
              filters: {
                type: "object",
                additionalProperties: true,
                description: "Filters in the format {field: value} (optional)"
              },
              limit: {
                type: "number",
                description: "Maximum number of documents to return (optional)"
              }
            },
            required: ["doctype"]
          }
        },
        {
          name: "create_document",
          description: "Create a new document in ERPNext",
          inputSchema: {
            type: "object",
            properties: {
              doctype: {
                type: "string",
                description: "ERPNext DocType (e.g., Customer, Item)"
              },
              data: {
                type: "object",
                additionalProperties: true,
                description: "Document data"
              }
            },
            required: ["doctype", "data"]
          }
        },
        {
          name: "update_document",
          description: "Update an existing document in ERPNext",
          inputSchema: {
            type: "object",
            properties: {
              doctype: {
                type: "string",
                description: "ERPNext DocType (e.g., Customer, Item)"
              },
              name: {
                type: "string",
                description: "Document name/ID"
              },
              data: {
                type: "object",
                additionalProperties: true,
                description: "Document data to update"
              }
            },
            required: ["doctype", "name", "data"]
          }
        },
        {
          name: "run_report",
          description: "Run an ERPNext report",
          inputSchema: {
            type: "object",
            properties: {
              report_name: {
                type: "string",
                description: "Name of the report"
              },
              filters: {
                type: "object",
                additionalProperties: true,
                description: "Report filters (optional)"
              }
            },
            required: ["report_name"]
          }
        }
      ]
    };
  });

  /**
   * Handler for tool calls.
   */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    logger.debug(`Handling CallToolRequest: ${request.params.name}`);
    
    switch (request.params.name) {
      case "get_documents":
        return handleGetDocuments(request.params.arguments, erpnext, logger);
      
      case "create_document":
        return handleCreateDocument(request.params.arguments, erpnext, logger);
      
      case "update_document":
        return handleUpdateDocument(request.params.arguments, erpnext, logger);
      
      case "run_report":
        return handleRunReport(request.params.arguments, erpnext, logger);
      
      case "get_doctype_fields":
        return handleGetDocTypeFields(request.params.arguments, erpnext, logger);
      
      case "get_doctypes":
        return handleGetDocTypes(erpnext, logger);
      
      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
    }
  });
}

/**
 * Helper to create error response
 */
function errorResponse(message: string): CallToolResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true
  };
}

/**
 * Helper to create success response
 */
function successResponse(text: string): CallToolResult {
  return {
    content: [{ type: "text", text }]
  };
}

/**
 * Check authentication and return error response if not authenticated
 */
function checkAuth(erpnext: ERPNextClient): CallToolResult | null {
  if (!erpnext.isAuthenticated()) {
    return errorResponse("Not authenticated with ERPNext. Please configure API key authentication.");
  }
  return null;
}

/**
 * Handle get_documents tool
 */
async function handleGetDocuments(
  args: Record<string, unknown> | undefined,
  erpnext: ERPNextClient,
  logger: Logger
): Promise<CallToolResult> {
  const authError = checkAuth(erpnext);
  if (authError) return authError;
  
  try {
    const doctype = validateIdentifier(args?.doctype, "doctype");
    const fields = args?.fields as string[] | undefined;
    const filters = args?.filters as Record<string, unknown> | undefined;
    const limit = validatePositiveInt(args?.limit, "limit");
    
    logger.debug(`Getting documents for doctype: ${doctype}`);
    const documents = await erpnext.getDocList(doctype, filters, fields, limit);
    
    return successResponse(JSON.stringify(documents, null, 2));
  } catch (error: unknown) {
    if (error instanceof McpError) throw error;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to get documents: ${message}`);
  }
}

/**
 * Handle create_document tool
 */
async function handleCreateDocument(
  args: Record<string, unknown> | undefined,
  erpnext: ERPNextClient,
  logger: Logger
): Promise<CallToolResult> {
  const authError = checkAuth(erpnext);
  if (authError) return authError;
  
  try {
    const doctype = validateIdentifier(args?.doctype, "doctype");
    const data = validateObject(args?.data, "data");
    
    logger.debug(`Creating document of type: ${doctype}`);
    const result = await erpnext.createDocument(doctype, data);
    
    return successResponse(`Created ${doctype}: ${result.name}\n\n${JSON.stringify(result, null, 2)}`);
  } catch (error: unknown) {
    if (error instanceof McpError) throw error;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to create document: ${message}`);
  }
}

/**
 * Handle update_document tool
 */
async function handleUpdateDocument(
  args: Record<string, unknown> | undefined,
  erpnext: ERPNextClient,
  logger: Logger
): Promise<CallToolResult> {
  const authError = checkAuth(erpnext);
  if (authError) return authError;
  
  try {
    const doctype = validateIdentifier(args?.doctype, "doctype");
    const name = validateIdentifier(args?.name, "name");
    const data = validateObject(args?.data, "data");
    
    logger.debug(`Updating document: ${doctype}/${name}`);
    const result = await erpnext.updateDocument(doctype, name, data);
    
    return successResponse(`Updated ${doctype} ${name}\n\n${JSON.stringify(result, null, 2)}`);
  } catch (error: unknown) {
    if (error instanceof McpError) throw error;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to update document: ${message}`);
  }
}

/**
 * Handle run_report tool
 */
async function handleRunReport(
  args: Record<string, unknown> | undefined,
  erpnext: ERPNextClient,
  logger: Logger
): Promise<CallToolResult> {
  const authError = checkAuth(erpnext);
  if (authError) return authError;
  
  try {
    const reportName = validateIdentifier(args?.report_name, "report_name");
    const filters = args?.filters as Record<string, unknown> | undefined;
    
    logger.debug(`Running report: ${reportName}`);
    const result = await erpnext.runReport(reportName, filters);
    
    return successResponse(JSON.stringify(result, null, 2));
  } catch (error: unknown) {
    if (error instanceof McpError) throw error;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to run report: ${message}`);
  }
}

/**
 * Handle get_doctype_fields tool
 */
async function handleGetDocTypeFields(
  args: Record<string, unknown> | undefined,
  erpnext: ERPNextClient,
  logger: Logger
): Promise<CallToolResult> {
  const authError = checkAuth(erpnext);
  if (authError) return authError;
  
  try {
    const doctype = validateIdentifier(args?.doctype, "doctype");
    
    logger.debug(`Getting fields for doctype: ${doctype}`);
    const fields = await erpnext.getDocTypeFields(doctype);
    
    return successResponse(JSON.stringify(fields, null, 2));
  } catch (error: unknown) {
    if (error instanceof McpError) throw error;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to get fields: ${message}`);
  }
}

/**
 * Handle get_doctypes tool
 */
async function handleGetDocTypes(
  erpnext: ERPNextClient,
  logger: Logger
): Promise<CallToolResult> {
  const authError = checkAuth(erpnext);
  if (authError) return authError;
  
  try {
    logger.debug("Getting all DocTypes");
    const doctypes = await erpnext.getAllDocTypes();
    
    return successResponse(JSON.stringify(doctypes, null, 2));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to get DocTypes: ${message}`);
  }
}

