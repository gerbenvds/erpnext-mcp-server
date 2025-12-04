/**
 * ERPNext API Client
 * Handles all communication with the ERPNext/Frappe API
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import { Config } from "../utils/config.js";
import { Logger } from "../utils/logger.js";
import { DocTypeField, ERPNextDocument } from "../models/types.js";

/**
 * Extract a detailed error message from an axios error response.
 * ERPNext/Frappe returns validation errors in the response body.
 */
function extractErrorDetails(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : 'Unknown error';
  }

  const axiosError = error as AxiosError;
  const status = axiosError.response?.status;
  const statusText = axiosError.response?.statusText;
  const responseData = axiosError.response?.data as Record<string, unknown> | undefined;

  // ERPNext typically returns errors in these formats:
  // { "exc_type": "ValidationError", "exception": "...", "_server_messages": "[...]" }
  // { "message": "..." }
  // { "exc": "..." }
  
  const parts: string[] = [];
  
  if (status) {
    parts.push(`HTTP ${status}${statusText ? ` ${statusText}` : ''}`);
  }

  if (responseData) {
    // Try to extract _server_messages (JSON array of JSON strings)
    if (responseData._server_messages) {
      try {
        const serverMessages = JSON.parse(responseData._server_messages as string) as string[];
        const messages = serverMessages.map((msg: string) => {
          try {
            const parsed = JSON.parse(msg);
            return parsed.message || msg;
          } catch {
            return msg;
          }
        });
        parts.push(messages.join('; '));
      } catch {
        parts.push(String(responseData._server_messages));
      }
    }
    // Try message field
    else if (responseData.message) {
      parts.push(String(responseData.message));
    }
    // Try exception field
    else if (responseData.exception) {
      // Clean up Python traceback - extract just the error message
      const exc = String(responseData.exception);
      const lines = exc.split('\n').filter(l => l.trim());
      const lastLine = lines[lines.length - 1];
      if (lastLine && !lastLine.startsWith('Traceback') && !lastLine.startsWith('  ')) {
        parts.push(lastLine);
      } else {
        parts.push(exc.substring(0, 500)); // Truncate long tracebacks
      }
    }
    // Try exc field  
    else if (responseData.exc) {
      parts.push(String(responseData.exc).substring(0, 500));
    }
    // If exc_type is present, include it
    else if (responseData.exc_type) {
      parts.push(`${responseData.exc_type}`);
    }
  }

  // Fallback to axios message if we couldn't extract anything useful
  if (parts.length === 0 || (parts.length === 1 && status)) {
    parts.push(axiosError.message);
  }

  return parts.join(' - ');
}

export class ERPNextClient {
  private baseUrl: string;
  private axiosInstance: AxiosInstance;
  private authenticated: boolean = false;
  private logger: Logger;

  constructor(config: Config, logger: Logger) {
    this.logger = logger;
    this.baseUrl = config.getERPNextUrl();
    
    // Initialize axios instance
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    // Configure authentication if credentials provided
    const apiKey = config.getERPNextApiKey();
    const apiSecret = config.getERPNextApiSecret();
    
    if (apiKey && apiSecret) {
      this.axiosInstance.defaults.headers.common['Authorization'] = 
        `token ${apiKey}:${apiSecret}`;
      this.authenticated = true;
      this.logger.info("Initialized with API key authentication");
    }
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  /**
   * Get a document by doctype and name
   */
  async getDocument(doctype: string, name: string): Promise<ERPNextDocument> {
    try {
      const response = await this.axiosInstance.get(`/api/resource/${doctype}/${name}`);
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(`Failed to get ${doctype} ${name}: ${extractErrorDetails(error)}`);
    }
  }

  /**
   * Get list of documents for a doctype
   */
  async getDocList(
    doctype: string, 
    filters?: Record<string, unknown>, 
    fields?: string[], 
    limit?: number
  ): Promise<ERPNextDocument[]> {
    try {
      const params: Record<string, string | number> = {};
      
      if (fields && fields.length) {
        params['fields'] = JSON.stringify(fields);
      }
      
      if (filters) {
        params['filters'] = JSON.stringify(filters);
      }
      
      if (limit) {
        params['limit_page_length'] = limit;
      }
      
      const response = await this.axiosInstance.get(`/api/resource/${doctype}`, { params });
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(`Failed to get ${doctype} list: ${extractErrorDetails(error)}`);
    }
  }

  /**
   * Create a new document
   */
  async createDocument(doctype: string, doc: Record<string, unknown>): Promise<ERPNextDocument> {
    try {
      const response = await this.axiosInstance.post(`/api/resource/${doctype}`, {
        data: doc
      });
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(`Failed to create ${doctype}: ${extractErrorDetails(error)}`);
    }
  }

  /**
   * Update an existing document
   */
  async updateDocument(
    doctype: string, 
    name: string, 
    doc: Record<string, unknown>
  ): Promise<ERPNextDocument> {
    try {
      const response = await this.axiosInstance.put(`/api/resource/${doctype}/${name}`, {
        data: doc
      });
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(`Failed to update ${doctype} ${name}: ${extractErrorDetails(error)}`);
    }
  }

  /**
   * Run a report
   */
  async runReport(reportName: string, filters?: Record<string, unknown>): Promise<unknown> {
    try {
      const response = await this.axiosInstance.get(`/api/method/frappe.desk.query_report.run`, {
        params: {
          report_name: reportName,
          filters: filters ? JSON.stringify(filters) : undefined
        }
      });
      return response.data.message;
    } catch (error: unknown) {
      throw new Error(`Failed to run report ${reportName}: ${extractErrorDetails(error)}`);
    }
  }

  /**
   * Get all available DocTypes
   */
  async getAllDocTypes(): Promise<string[]> {
    try {
      // Use the standard REST API to fetch DocTypes
      const response = await this.axiosInstance.get('/api/resource/DocType', {
        params: {
          fields: JSON.stringify(["name"]),
          limit_page_length: 500 // Get more doctypes at once
        }
      });
      
      if (response.data && response.data.data) {
        return response.data.data.map((item: { name: string }) => item.name);
      }
      
      return [];
    } catch (error: unknown) {
      const message = extractErrorDetails(error);
      this.logger.error("Failed to get DocTypes:", message);
      
      // Try an alternative approach if the first one fails
      try {
        // Try using the method API to get doctypes
        const altResponse = await this.axiosInstance.get('/api/method/frappe.desk.search.search_link', {
          params: {
            doctype: 'DocType',
            txt: '',
            limit: 500
          }
        });
        
        if (altResponse.data && altResponse.data.results) {
          return altResponse.data.results.map((item: { value: string }) => item.value);
        }
        
        return [];
      } catch (altError: unknown) {
        this.logger.error("Alternative DocType fetch failed:", extractErrorDetails(altError));
        
        // Fallback: Return a list of common DocTypes
        return [
          "Customer", "Supplier", "Item", "Sales Order", "Purchase Order",
          "Sales Invoice", "Purchase Invoice", "Employee", "Lead", "Opportunity",
          "Quotation", "Payment Entry", "Journal Entry", "Stock Entry"
        ];
      }
    }
  }

  /**
   * Get DocType metadata including field definitions
   */
  async getDocTypeFields(doctype: string): Promise<DocTypeField[]> {
    try {
      const response = await this.axiosInstance.get(`/api/resource/DocType/${encodeURIComponent(doctype)}`);
      
      if (response.data && response.data.data && response.data.data.fields) {
        // Return relevant field information
        return response.data.data.fields.map((field: Record<string, unknown>) => ({
          fieldname: field.fieldname,
          fieldtype: field.fieldtype,
          label: field.label,
          reqd: field.reqd || 0,
          options: field.options || null,
          description: field.description || null
        }));
      }
      
      return [];
    } catch (error: unknown) {
      throw new Error(`Failed to get fields for ${doctype}: ${extractErrorDetails(error)}`);
    }
  }
}

