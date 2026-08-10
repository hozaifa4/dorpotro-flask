export interface Tender {
  id: string; // The Tender/Proposal ID (corresponds to unique id from CSV, e.g. 1275550)
  ministry: string;
  division?: string;
  organization: string;
  procuringEntity: string;
  procuringDistrict: string;
  procurementNature: 'Goods' | 'Works' | 'Services' | string;
  procurementType: string;
  eventType: string;
  invitationRefNo: string;
  appId: string;
  procurementMethod: string;
  budgetType: string;
  sourceOfFunds: string;
  projectCode: string;
  projectName: string;
  packageNo: string;
  packageDescription: string;
  category: string;
  publicationDate: string; // Scheduled Publication Date and time
  documentLastSellingDate: string; // Tender/Proposal Document last selling/downloading
  eligibility: string;
  briefDescription: string;
  evaluationType: string;
  documentPrice: number; // Parsed from BDT Price
  securityAmount: number; // Parsed from Tender/Proposal security
  location: string;
  tentativeStartDate: string;
  tentativeEndDate: string;
  officialInviter: string;
  officialDesignation: string;
  officialAddress: string;
  thana: string;
  district: string;
  phone: string;
  estimatedCost: string; // Raw estimation, e.g. "500000.00,OTM"
  estimatedCostAmt: number; // Parsed number
  tenderLink: string;
  isReTender: boolean; // Computed by comparing package numbers
  potentialConflicts: string[]; // Grouping similar descriptions
  hasAmendment?: boolean;
  amendmentDetails?: string;
  lastRecheckedAt?: string;
  awardedBidder?: string;
  actualDiscount?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  subscriptionType: 'free' | 'premium' | 'expired' | 'blocked';
  trialExtendedDays: number;
  createdAt: string;
  expiryDate: string;
  bKashNumber?: string;
  city?: string;
}

export interface ScraperJobLog {
  id: string;
  timestamp: string;
  action: 'FETCH' | 'SKIP_DUPLICATE' | 'SAVE_FIRESTORE' | 'SYNC_SHEET';
  details: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  tenderId?: string;
}

export interface PaymentWebhookLog {
  id: string;
  timestamp: string;
  amount: number;
  phone: string;
  trxID: string;
  gateway: 'bKash' | 'Nagad' | 'Shurjopay' | 'SSLCommerz';
  status: 'SUCCESS' | 'FAILED';
  userId: string;
}

export interface SavedFilter {
  id: string;
  name: string;
  ministry?: string;
  keywords?: string;
  location?: string;
  minCost?: number;
  maxCost?: number;
  procurementNature?: string;
  procurementMethod?: string;
  procuringEntity?: string;
  notificationType: 'email' | 'push' | 'both';
  createdAt: string;
}

export interface ProactiveNotification {
  id: string;
  timestamp: string;
  filterId: string;
  filterName: string;
  tenderId: string;
  tenderTitle: string;
  ministry: string;
  estimatedCost: number;
  location: string;
  type: 'email' | 'push';
  isRead: boolean;
}

