/**
 * TypeScript interfaces and types for ERPNext MCP Server
 */

/** ERPNext document field definition */
export interface DocTypeField {
  fieldname: string;
  fieldtype: string;
  label: string;
  reqd: number;
  options: string | null;
  description: string | null;
}

/** Generic ERPNext document */
export interface ERPNextDocument {
  name: string;
  [key: string]: unknown;
}

/** Tool response content item */
export interface TextContent {
  type: "text";
  text: string;
}

/** Tool response - matches CallToolResult from MCP SDK */
export interface CallToolResult {
  content: TextContent[];
  isError?: boolean;
  [key: string]: unknown;
}

