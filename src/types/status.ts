/**
 * Type definitions for cloud service status data
 */

// Cloud provider identifiers
export type CloudProvider = 'aws' | 'azure' | 'gcp' | 'aliyun' | 'tencent' | 'huawei' | 'volcano';

// Service status types
export type StatusType = 'operational' | 'degraded' | 'outage' | 'maintenance';

// Service categories
export type ServiceCategory =
  | 'compute'
  | 'storage'
  | 'database'
  | 'serverless'
  | 'networking'
  | 'security'
  | 'analytics'
  | 'ai'
  | 'integration'
  | 'management';

// Service status model
export interface ServiceStatus {
  // Unique identifier for this service status
  id: string;

  // Provider information
  provider: string;

  // Service information
  serviceId: string;
  serviceName: string;
  category?: ServiceCategory;

  // Region information
  regionId?: string;
  region: string;

  // Status information
  status: StatusType;
  statusMessage?: string;

  // Link to the provider's official status page / incident (for "view details")
  sourceUrl?: string;

  // Time information
  updatedAt: number; // Timestamp

  // Incident information (optional)
  incident?: {
    id: string;
    title: string;
    startTime: number;
    updates?: {
      time: number;
      message: string;
    }[];
  };
}

// Dashboard stats for summary display
export interface DashboardStats {
  totalServices: number;
  operational: number;
  degraded: number;
  outage: number;
  maintenance: number;
  lastUpdated: number;
}

// Status update event
export interface StatusUpdateEvent {
  oldStatus: ServiceStatus | null;
  newStatus: ServiceStatus;
  changedAt: number;
}
