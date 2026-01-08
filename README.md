# ERPNext MCP Server

A Model Context Protocol server for ERPNext integration

This is a TypeScript-based MCP server that provides integration with ERPNext/Frappe API. It enables AI assistants to interact with ERPNext data and functionality through the Model Context Protocol.

## Features

### Resources
- Access ERPNext documents via `erpnext://{doctype}/{name}` URIs
- JSON format for structured data access

### Tools
- `get_doctypes` - Get a list of all available DocTypes
- `get_doctype_fields` - Get fields list for a specific DocType
- `get_documents` - Get a list of documents for a specific doctype
- `create_document` - Create a new document in ERPNext
- `update_document` - Update an existing document in ERPNext
- `run_report` - Run an ERPNext report

## Configuration

The server requires the following environment variables:
- `ERPNEXT_URL` - The base URL of your ERPNext instance
- `ERPNEXT_API_KEY` (optional) - API key for authentication
- `ERPNEXT_API_SECRET` (optional) - API secret for authentication
- `MCP_PORT` (optional) - Port for the HTTP server (default: 3000)

## Running with Docker

Build the Docker image:
```bash
docker build -t erpnext-mcp-server .
```

Run the container:
```bash
docker run -p 3000:3000 \
  -e ERPNEXT_URL=http://your-erpnext-instance.com \
  -e ERPNEXT_API_KEY=your-api-key \
  -e ERPNEXT_API_SECRET=your-api-secret \
  erpnext-mcp-server
```

The HTTP server will be available at `http://localhost:3000`.

## HTTP Server Mode

The server supports HTTP transport via the Streamable HTTP Server Transport, which is useful for web-based clients or when stdio transport isn't available.

### Starting the HTTP Server

```bash
npm run start:http
```

Or directly:
```bash
node build/http-server.js
```

### Endpoints

- `POST /mcp` - MCP message endpoint (handles initialization and requests)
- `GET /mcp` - SSE stream endpoint (for server-sent events)
- `DELETE /mcp` - Session termination endpoint
- `GET /health` - Health check endpoint

### Session Management

The HTTP transport uses session IDs for managing client connections:

1. Send an initialize request to `POST /mcp` without a session ID
2. The server responds with `Mcp-Session-Id` header
3. Include this session ID in subsequent requests via the `Mcp-Session-Id` header

### Example: Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{"status": "ok", "authenticated": true}
```

## Development

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```

## Installation

### Option 1: Stdio Transport (Local)

To use with Claude Desktop, add the server config:

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "erpnext": {
      "command": "node",
      "args": ["/path/to/erpnext-server/build/index.js"],
      "env": {
        "ERPNEXT_URL": "http://your-erpnext-instance.com",
        "ERPNEXT_API_KEY": "your-api-key",
        "ERPNEXT_API_SECRET": "your-api-secret"
      }
    }
  }
}
```

To use with Claude in VSCode, add the server config to:

On MacOS: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
On Windows: `%APPDATA%/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

### Option 2: HTTP Transport (Remote/Docker)

For HTTP-based connections (e.g., when running in Docker or on a remote server):

```json
{
  "mcpServers": {
    "erpnext": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.

## Usage Examples

### Get Customer List
```
<use_mcp_tool>
<server_name>erpnext</server_name>
<tool_name>get_documents</tool_name>
<arguments>
{
  "doctype": "Customer"
}
</arguments>
</use_mcp_tool>
```

### Get Customer Details
```
<access_mcp_resource>
<server_name>erpnext</server_name>
<uri>erpnext://Customer/CUSTOMER001</uri>
</access_mcp_resource>
```

### Create New Item
```
<use_mcp_tool>
<server_name>erpnext</server_name>
<tool_name>create_document</tool_name>
<arguments>
{
  "doctype": "Item",
  "data": {
    "item_code": "ITEM001",
    "item_name": "Test Item",
    "item_group": "Products",
    "stock_uom": "Nos"
  }
}
</arguments>
</use_mcp_tool>
```

### Get Item Fields
```
<use_mcp_tool>
<server_name>erpnext</server_name>
<tool_name>get_doctype_fields</tool_name>
<arguments>
{
  "doctype": "Item"
}
</arguments>
</use_mcp_tool>
