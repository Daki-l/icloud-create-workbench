export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Account {
  id: string;
  addressCount: number;
  appleIdMasked: string;
  cooldownUntil?: string;
  displayName?: string;
  labelPrefix: string;
  latestJobStatus?: string;
  region: string;
  unusedCount: number;
}

export interface Campaign {
  id: string;
  accountId: string;
  appleIdMasked: string;
  batchSize: number;
  currentTotal: number;
  generatedCount: number;
  labelPrefix: string;
  lastError?: string;
  nextRunAt?: string;
  status: 'completed' | 'running' | 'stopped';
  targetTotal: number;
}

export interface Address {
  id: string;
  accountId: string;
  appleIdMasked: string;
  createdAt: string;
  email: string;
  label: string;
  latestCode?: string;
  latestMessageAt?: string;
  messageCount: number;
  publicAccessEnabled: boolean | number;
  source: string;
  state: 'trash' | 'unused' | 'used';
}

export interface MailMessage {
  id: string;
  bodyText?: string;
  code?: string;
  hiddenEmail?: string;
  preview?: string;
  receivedAt?: string;
  sender?: string;
  subject?: string;
}
