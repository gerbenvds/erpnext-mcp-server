/**
 * Configuration management module
 * Handles loading and validating environment variables
 */

export class Config {
  private erpnextUrl: string;
  private apiKey?: string;
  private apiSecret?: string;
  
  constructor() {
    this.erpnextUrl = this.getRequiredEnv("ERPNEXT_URL");
    // Remove trailing slash if present
    this.erpnextUrl = this.erpnextUrl.replace(/\/$/, '');
    
    this.apiKey = process.env.ERPNEXT_API_KEY;
    this.apiSecret = process.env.ERPNEXT_API_SECRET;
    
    this.validate();
  }
  
  private getRequiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`${name} environment variable is required`);
    }
    return value;
  }
  
  private validate(): void {
    if (!this.erpnextUrl.startsWith("http")) {
      throw new Error("ERPNEXT_URL must include protocol (http:// or https://)");
    }
    
    // If one of API key/secret is provided, both must be provided
    if ((this.apiKey && !this.apiSecret) || (!this.apiKey && this.apiSecret)) {
      throw new Error("Both ERPNEXT_API_KEY and ERPNEXT_API_SECRET must be provided if using API key authentication");
    }
  }
  
  getERPNextUrl(): string {
    return this.erpnextUrl;
  }
  
  getERPNextApiKey(): string | undefined {
    return this.apiKey;
  }
  
  getERPNextApiSecret(): string | undefined {
    return this.apiSecret;
  }
  
  hasApiKeyAuth(): boolean {
    return !!(this.apiKey && this.apiSecret);
  }
}

