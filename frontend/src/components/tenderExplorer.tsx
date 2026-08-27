import React, { useState } from 'react';
import { motion } from 'motion/react';
import { showToast } from '../lib/firebase';
import {
  Building2, MapPin, Calendar, Clock, DollarSign, ExternalLink,
  Search, SlidersHorizontal, Eye, ShieldAlert, BadgeInfo, CheckCircle,
  HelpCircle, Ban, AlertTriangle, Sparkles, AlertCircle, X,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Copy, Check,
  Bell, BellRing, Award, Star, FileText, Printer, Download,
  Plus, History, Trash2, PanelRightClose, PanelRightOpen
} from 'lucide-react';
import { Tender, User } from '../types';
import { mockNoaDataset } from '../utils/noaData';
import { sanitizeTenderRecord } from '../utils/sanitizeTender';

const getShortMethod = (method?: string): string => {
  if (!method) return 'OTM';
  const upper = method.toUpperCase();
  if (upper.includes('OPEN') || upper.includes('OTM')) return 'OTM';
  if (upper.includes('LIMITED') || upper.includes('LTM')) return 'LTM';
  if (upper.includes('QUOTATION') || upper.includes('RFQ')) return 'RFQ';
  if (upper.includes('DIRECT') || upper.includes('DPM')) return 'DPM';
  if (upper.length <= 4) return upper;
  return 'OTM';
};

const isNoaAvailableForTender = (pubDateStr?: string): boolean => {
  if (!pubDateStr) return false;
  try {
    const datePart = pubDateStr.split(' ')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    const pubDate = new Date(year, month - 1, day);
    const now = new Date();
    const diffTime = now.getTime() - pubDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays >= 45; // 45 days = 1.5 months
  } catch (e) {
    return false;
  }
};

const handlePrintPdf = (tender: Tender) => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!iframeDoc) return;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Tender_${tender.id}_Specifications</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            font-family: 'Inter', sans-serif;
            color: #0f172a;
            font-size: 11px;
            line-height: 1.45;
            margin: 0;
            padding: 0;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .govt {
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0 0 3px 0;
          }
          .dept {
            font-size: 11px;
            font-weight: 600;
            margin: 0;
            color: #334155;
          }
          .title {
            font-size: 13px;
            font-weight: 800;
            margin: 10px 0 0 0;
            text-transform: uppercase;
            color: #1d4ed8;
            letter-spacing: 0.2px;
          }
          .meta-info {
            font-size: 9px;
            font-weight: 700;
            color: #475569;
            margin-top: 5px;
            font-family: 'JetBrains Mono', monospace;
          }
          .grid-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          .grid-table th, .grid-table td {
            text-align: left;
            padding: 6px 8px;
            border: 1px solid #cbd5e1;
            vertical-align: top;
          }
          .grid-table th {
            font-weight: 700;
            background-color: #f1f5f9;
            width: 25%;
            color: #1e293b;
          }
          .grid-table td {
            color: #334155;
          }
          .section-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
            border-bottom: 1.5px solid #0f172a;
            padding-bottom: 3px;
            margin: 15px 0 8px 0;
          }
          .block-text {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 8px 10px;
            border-radius: 4px;
            white-space: pre-wrap;
            font-size: 10pt;
            color: #334155;
          }
          .bottom-layout {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
            page-break-inside: avoid;
          }
          .official-sign-box {
            width: 220px;
            text-align: right;
          }
          .official-sign-line {
            border-top: 1px solid #64748b;
            margin-top: 40px;
            padding-top: 4px;
            font-size: 9px;
            font-weight: 700;
            color: #334155;
          }
          .footer {
            margin-top: 30px;
            border-top: 1px dashed #cbd5e1;
            padding-top: 10px;
            font-size: 8px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
          }
          .watermark-text {
            position: fixed;
            bottom: 5mm;
            right: 5mm;
            font-size: 8px;
            color: #cbd5e1;
            font-family: 'JetBrains Mono', monospace;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="govt">Government of the People's Republic of Bangladesh</div>
          <div class="dept">${tender.ministry || 'National e-GP Portal'}</div>
          ${tender.organization ? `<div class="dept">${tender.organization}</div>` : ''}
          ${tender.procuringEntity ? `<div class="dept">${tender.procuringEntity}</div>` : ''}
          <div class="title">Tender Notice Specifications</div>
          <div class="meta-info">REGISTRY VERIFICATION REF: ID-${tender.id} • STATUS: CONFIRMED</div>
        </div>

        <table class="grid-table">
          <tr>
            <th>Tender / Proposal ID</th>
            <td><strong>${tender.id}</strong></td>
            <th>Scheduled Publication</th>
            <td>${tender.publicationDate || 'N/A'}</td>
          </tr>
          <tr>
            <th>Invitation Ref No</th>
            <td>${tender.invitationRefNo || 'N/A'}</td>
            <th>Document Last Selling</th>
            <td>${tender.documentLastSellingDate || 'N/A'}</td>
          </tr>
          <tr>
            <th>Procuring Entity</th>
            <td>${tender.procuringEntity || 'N/A'}</td>
            <th>Procuring District</th>
            <td>${tender.procuringDistrict || 'N/A'}</td>
          </tr>
          <tr>
            <th>Procurement Method</th>
            <td>${tender.procurementMethod || 'N/A'}</td>
            <th>Budget / Fund Source</th>
            <td>${tender.budgetType || 'N/A'} (${tender.sourceOfFunds || 'N/A'})</td>
          </tr>
          <tr>
            <th>Package No</th>
            <td>${tender.packageNo || 'N/A'}</td>
            <th>Procurement Category</th>
            <td>${tender.category || 'N/A'}</td>
          </tr>
          <tr>
            <th>Project Name</th>
            <td colspan="3">${tender.projectName || 'N/A'}</td>
          </tr>
          <tr>
            <th>Package Description</th>
            <td colspan="3">${tender.packageDescription || tender.briefDescription || 'N/A'}</td>
          </tr>
          <tr>
            <th>Document Price (BDT)</th>
            <td>৳ ${tender.documentPrice}</td>
            <th>Security Amount (BDT)</th>
            <td>৳ ${tender.securityAmount?.toLocaleString() || '0'}</td>
          </tr>
          <tr>
            <th>Tentative Start Date</th>
            <td>${tender.tentativeStartDate || 'N/A'}</td>
            <th>Tentative End Date</th>
            <td>${tender.tentativeEndDate || 'N/A'}</td>
          </tr>
        </table>

        <div class="section-title">Eligibility of Tenderer (TDS)</div>
        <div class="block-text">${tender.eligibility || 'Refer to detail bidding document guidelines.'}</div>

        <div class="bottom-layout">
          <div>
            <div style="font-weight: 700; font-size: 10px; color: #0f172a; margin-bottom: 4px;">OFFICIAL INVITING TENDER</div>
            <div style="font-size: 9.5px; color: #475569;">
              <strong>${tender.officialInviter || 'N/A'}</strong><br/>
              ${tender.officialDesignation || 'N/A'}<br/>
              Phone: ${tender.phone || 'N/A'}<br/>
              Address: ${tender.officialAddress || 'N/A'}
            </div>
          </div>
          
          <div class="official-sign-box">
            <div class="official-sign-line">Authorized Signatory / Corporate Seal</div>
          </div>
        </div>

        <div class="footer">
          <div>Report Generated via Dorpotro Smart e-GP Platform</div>
          <div>Verification Timestamp: ${new Date().toLocaleString()}</div>
        </div>

        <div class="watermark-text">VERIFIED_EGP_ID_${tender.id}</div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  setTimeout(() => {
    try {
      document.body.removeChild(iframe);
    } catch (e) {
      // ignore
    }
  }, 45000);
};

const handleDownloadTxt = (tender: Tender) => {
  const content = `========================================================================
GOVERNMENT OF THE PEOPLE'S REPUBLIC OF BANGLADESH
${(tender.ministry || 'National e-GP Portal').toUpperCase()}
${(tender.organization || '').toUpperCase()}
========================================================================
TENDER SPECIFICATIONS DOCUMENT SUMMARY
Tender ID: ${tender.id}
Invitation Ref No: ${tender.invitationRefNo || 'N/A'}
Publication Date: ${tender.publicationDate || 'N/A'}
Selling Deadline: ${tender.documentLastSellingDate || 'N/A'}

PROCURING ENTITY INFO
Procuring Entity: ${tender.procuringEntity || 'N/A'}
District: ${tender.procuringDistrict || 'N/A'}
Office Address: ${tender.officialAddress || 'N/A'}
Contact Phone: ${tender.phone || 'N/A'}

PROJECT & CONTRACT VALUE
Project Name: ${tender.projectName || 'N/A'}
Package No: ${tender.packageNo || 'N/A'}
Package Description: ${tender.packageDescription || tender.briefDescription || 'N/A'}
Procurement Method: ${tender.procurementMethod || 'N/A'}
Budget Type: ${tender.budgetType || 'N/A'}
Source of Funds: ${tender.sourceOfFunds || 'N/A'}
Document Price: BDT ${tender.documentPrice}
Security Amount: BDT ${tender.securityAmount?.toLocaleString() || '0'}

TENDERER ELIGIBILITY
${tender.eligibility || 'Standard Guidelines Apply.'}

========================================================================
Generated via Dorpotro e-GP Bidding System
`;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Tender_${tender.id}_Specifications.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const calculateAiWinningProbability = (tender: Tender, proposedDiscount: number) => {
  let baseScore = 65;
  const methodStr = tender.procurementMethod || '';
  const isLtm = methodStr.toLowerCase().includes('ltm') || methodStr.toUpperCase().includes('LIMITED');

  if (isLtm) {
    baseScore += 12;
  } else {
    baseScore -= 8;
  }

  if (tender.estimatedCostAmt > 20000000) {
    baseScore -= 10;
  } else if (tender.estimatedCostAmt > 5000000) {
    baseScore -= 5;
  } else if (tender.estimatedCostAmt > 1000000) {
    baseScore += 4;
  } else if (tender.estimatedCostAmt > 0) {
    baseScore += 8;
  }

  const dist = (tender.district || tender.procuringDistrict || "Dhaka").toLowerCase();
  if (dist === "dhaka") {
    baseScore -= 4;
  } else if (dist === "chittagong" || dist === "chattogram") {
    baseScore -= 2;
  } else {
    baseScore += 5;
  }

  const org = (tender.organization || "").toUpperCase();
  if (org.includes("PWD")) {
    baseScore -= 4;
  } else if (org.includes("LGED")) {
    baseScore += 3;
  } else if (org.includes("RHD")) {
    baseScore -= 7;
  } else if (org.includes("BWDB")) {
    baseScore -= 5;
  }

  if (tender.procurementNature === 'Works') {
    baseScore -= 2;
  } else if (tender.procurementNature === 'Goods') {
    baseScore += 4;
  } else if (tender.procurementNature === 'Services') {
    baseScore += 7;
  }

  let marginEffect = 0;
  if (isLtm) {
    if (proposedDiscount > 5.0) {
      marginEffect = -60; // Automatic disqualification per rule
    } else if (proposedDiscount === 5.0) {
      marginEffect = 18; // Tie lottery optimization peak 
    } else {
      marginEffect = (proposedDiscount - 5.0) * 8;
    }
  } else {
    if (proposedDiscount <= 8.5) {
      marginEffect = (proposedDiscount - 4.5) * 4.5;
    } else if (proposedDiscount <= 10.0) {
      marginEffect = 18 + (proposedDiscount - 8.5) * 1.5;
    } else {
      marginEffect = 20 - (proposedDiscount - 10.0) * 4;
    }
  }

  let finalScore = Math.round(baseScore + marginEffect);
  finalScore = Math.max(10, Math.min(98, finalScore));

  const riskScore = 100 - finalScore;
  let overallRiskLevel: 'Low' | 'Medium' | 'High' | 'Critical' = "Medium";
  if (riskScore > 55 || (isLtm && proposedDiscount > 5.0)) {
    overallRiskLevel = "Critical";
  } else if (riskScore > 40) {
    overallRiskLevel = "High";
  } else if (riskScore < 20) {
    overallRiskLevel = "Low";
  }

  const procuringEntityRisk = org.includes("PWD") ? "MEDIUM-HIGH" : org.includes("RHD") ? "HIGH" : "MEDIUM";
  const competitionDensity = isLtm ? "LOW (3-5 local bidders)" : "HIGH (15-28 global bidders)";
  const paymentDefaultRisk = (tender.ministry || "").toLowerCase().includes("health") ? "MODERATE-HIGH" : "LOW";
  const specComplexityRisk = (tender.eligibility || "").length > 400 ? "HIGH COMPLEXITY" : "LOW-MEDIUM";

  return {
    score: finalScore,
    overallRiskLevel,
    procuringEntityRisk,
    competitionDensity,
    paymentDefaultRisk,
    specComplexityRisk,
    collusionRiskIndex: dist === "dhaka" ? "35%" : "68% (Local Bidder Cartel Risk)",
    liquidityAssetSafety: (tender.securityAmount || 0) > 100000 ? "HIGH GUARANTEE MANDATED" : "STANDARD CAP SET",
    isDisqualifiedLtm: isLtm && proposedDiscount > 5.0,
    isAbnormallyLowBid: !isLtm && proposedDiscount > 10.0,
    biddingStrategy: isLtm
      ? `Bid inside the typical -4.90% to -5.00% discount window. LTM tenders depend highly on tie lottery outcomes; do not discount past -5.00%.`
      : `OTM tenders require aggressive margins. Optimal strategy shows -7.50% to -9.00% deviation from the official rate schedule for peak win rates.`
  };
};

interface SearchableSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  defaultLabel: string;
  placeholder: string;
  maxDisplayLength?: number;
}

function SearchableSelect({
  value,
  onChange,
  options,
  defaultLabel,
  placeholder,
  maxDisplayLength = 18
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  const displaySelected = value === 'ALL'
    ? defaultLabel
    : value;

  return (
    <div className="relative block text-left w-full font-sans">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 flex items-center justify-between gap-1 cursor-pointer font-semibold hover:bg-slate-50 dark:hover:bg-slate-850 select-none text-left shadow-2xs h-9"
      >
        <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-hide pr-2">
          {displaySelected}
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => {
              setIsOpen(false);
              setSearch('');
            }}
          />

          <div className="absolute left-0 mt-1.5 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn p-1">
            <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 rounded-t-xl">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-52 overflow-y-auto py-1">
              <button
                type="button"
                onClick={() => {
                  onChange('ALL');
                  setIsOpen(false);
                  setSearch('');
                }}
                className={`w-full text-left px-3 py-1.5 text-xs select-none cursor-pointer transition-colors block rounded-md ${value === 'ALL'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
              >
                {defaultLabel}
              </button>

              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-400 italic font-mono text-center">
                  No options found
                </div>
              ) : (
                filteredOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    title={opt}
                    className={`w-full text-left px-3 py-1.5 text-xs select-none cursor-pointer transition-colors block break-words whitespace-normal rounded-md ${value === opt
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                  >
                    {opt}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface TenderExplorerProps {
  tenders: Tender[];
  currentUser: User;
  googleAdsAccount?: string;
  googleAdsSlot?: string;
  customAdTitle?: string;
  customAdText?: string;
  customAdLink?: string;
  customAdImage?: string;
  activeAdType?: 'google' | 'custom';
  watchlistedIds?: string[];
  onToggleWatchlist?: (id: string) => void;
}

export default function TenderExplorer({
  tenders,
  currentUser,
  googleAdsAccount = 'ca-pub-9928174301984252',
  googleAdsSlot = '5501827431',
  customAdTitle = 'Anwar Cement & Rods Ltd.',
  customAdText = 'Exclusive 8% OFF for e-GP contractors on bulk procurement of grade 500W TMT steel and specialized cement bags!',
  customAdLink = 'https://www.anwarsteel.com.bd',
  customAdImage = '',
  activeAdType = 'custom',
  watchlistedIds = [],
  onToggleWatchlist
}: TenderExplorerProps) {
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [natureFilter, setNatureFilter] = useState('ALL');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [orgFilter, setOrgFilter] = useState('ALL');
  const [peFilter, setPeFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState<boolean>(false);
  const [winningProbabilityTender, setWinningProbabilityTender] = useState<Tender | null>(null);
  const [tenderDiscount, setTenderDiscount] = useState<number>(4.5);
  const [currentPage, setCurrentPage] = useState(1);
  const [goToPageInput, setGoToPageInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});
  const [expandedTitleIds, setExpandedTitleIds] = useState<Record<string, boolean>>({});

  // Self-contained offline state tracker for offline badges
  const [offlineState, setOfflineState] = useState<boolean>(false);
  React.useEffect(() => {
    const checkState = () => {
      const simulated = localStorage.getItem('dorpotro_simulated_offline') === 'true';
      const actualOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
      setOfflineState(simulated || actualOffline);
    };
    checkState();
    window.addEventListener('online', checkState);
    window.addEventListener('offline', checkState);
    const interval = setInterval(checkState, 1500);
    return () => {
      window.removeEventListener('online', checkState);
      window.removeEventListener('offline', checkState);
      clearInterval(interval);
    };
  }, []);

  // Right Sidebar toggle state
  // Search and filter state

  // Recent Searches state and handlers
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dorpotro_recent_searches');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return [];
        }
      }
    }
    return [];
  });

  const handleSaveSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 10);
      if (typeof window !== 'undefined') {
        localStorage.setItem('dorpotro_recent_searches', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveSearch(searchTerm);
    }
  };

  // Notification Alert Preferences state
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dorpotro_push_enabled');
      return saved === 'true';
    }
    return false;
  });

  const [savedPreferences, setSavedPreferences] = useState<{ nature: string; district: string; updatedAt?: string } | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dorpotro_alert_prefs');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  });

  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);
  const [showStatusSuccess, setShowStatusSuccess] = useState(false);

  const [deadlineFilter, setDeadlineFilter] = useState<'active' | 'archived' | 'all'>('all');

  const isTenderArchived = (tender: Tender): boolean => {
    // Strictly check Document Last Selling / Application Date
    const targetDateStr = tender.documentLastSellingDate || "";
    if (!targetDateStr || targetDateStr === 'N/A') return true;
    try {
      const parts = targetDateStr.trim().split(' ');
      const datePart = parts[0];
      const timePart = parts[1] || '17:00';
      const dateParts = datePart.split('-');
      const timeParts = timePart.split(':');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const day = parseInt(dateParts[2], 10);
        const hoursVal = parseInt(timeParts[0] || '17', 10);
        const minutesVal = parseInt(timeParts[1] || '00', 10);

        const deadlineDate = new Date(year, month, day, hoursVal, minutesVal, 0);
        // Compare application deadline against dataset baseline (2026-06-05) or now
        const evalTime = Math.min(now.getTime(), new Date(2026, 5, 5, 0, 0, 0).getTime());
        return evalTime > deadlineDate.getTime();
      }
    } catch (e) {
      // ignore
    }
    return true;
  };

  const handleSaveAlertPreferences = async () => {
    // Attempt standard browser notification request if toggled on
    if (pushNotificationsEnabled && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.warn('Notification permission was denied by the user/browser sandbox.');
        }
      } catch (e) {
        console.warn('Browser notification permission request is restricted in this sandboxed iframe:', e);
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('dorpotro_push_enabled', pushNotificationsEnabled ? 'true' : 'false');
      const prefs = {
        nature: natureFilter,
        district: districtFilter,
        updatedAt: new Date().toLocaleTimeString()
      };
      localStorage.setItem('dorpotro_alert_prefs', JSON.stringify(prefs));
      setSavedPreferences(prefs);
    }

    setShowStatusSuccess(true);

    // Auto-dismiss the success alert after 6 seconds
    setTimeout(() => {
      setShowStatusSuccess(false);
    }, 6000);
  };

  // Real-time ticking clock for precise countdown watches with seconds
  const [now, setNow] = useState(new Date());
  React.useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Reset page when search or filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, natureFilter, districtFilter, orgFilter, peFilter, methodFilter, deadlineFilter]);

  // Resolve active dataset (always the default/local dataset)
  const activeTendersList = tenders;

  // Compute base filtered list applying all filters EXCEPT the deadline/status filter itself
  const baseFilteredList = activeTendersList.filter(t => {
    const matchesSearch =
      t.id.includes(searchTerm) ||
      t.packageNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.packageDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.procuringEntity && t.procuringEntity.toLowerCase().includes(searchTerm.toLowerCase())) ||
      t.officialInviter.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesNature = natureFilter === 'ALL' || t.procurementNature === natureFilter;
    const matchesDistrict = districtFilter === 'ALL' || (t.district === districtFilter || t.procuringDistrict === districtFilter);
    const matchesOrg = orgFilter === 'ALL' || t.organization === orgFilter;
    const matchesPE = peFilter === 'ALL' || t.procuringEntity === peFilter;
    const matchesMethod = methodFilter === 'ALL' || getShortMethod(t.procurementMethod) === methodFilter;

    return matchesSearch && matchesNature && matchesDistrict && matchesOrg && matchesPE && matchesMethod;
  });

  // Active vs Archived counts computed dynamically using the filtered results (excluding deadlineFilter itself)
  const totalActiveCount = baseFilteredList.filter(t => !isTenderArchived(t)).length;
  const totalArchivedCount = baseFilteredList.filter(t => isTenderArchived(t)).length;
  const totalAllCount = baseFilteredList.length;

  // Quick lists
  const districts = Array.from(new Set(activeTendersList.map(t => t.district || t.procuringDistrict))).filter(Boolean) as string[];
  const organizations = Array.from(new Set(activeTendersList.map(t => t.organization))).filter(Boolean) as string[];
  const procuringEntities = Array.from(new Set(activeTendersList.map(t => t.procuringEntity))).filter(Boolean) as string[];
  const procurementMethods = Array.from(new Set(activeTendersList.map(t => getShortMethod(t.procurementMethod)))).filter(Boolean) as string[];

  // Sub restriction status
  const userSub = currentUser?.subscriptionType || 'free';
  const isAccessBlocked = userSub === 'blocked';
  const isPremiumActive = userSub === 'premium';
  const isExpired = userSub === 'expired';

  // Final filtered list applying the deadline status check on of the base filtered list
  const filterTenders = baseFilteredList.filter(t => {
    const isArchived = isTenderArchived(t);
    if (deadlineFilter === 'active' && isArchived) return false;
    if (deadlineFilter === 'archived' && !isArchived) return false;
    return true;
  });

  const totalCalculatedBudget = filterTenders.reduce((acc, current) => acc + current.estimatedCostAmt, 0);

  const formatBDT = (amount: number) => {
    if (amount >= 10000000) {
      return "৳ " + (amount / 10000000).toFixed(2) + " Crore";
    }
    if (amount >= 100000) {
      return "৳ " + (amount / 100000).toFixed(2) + " Lac";
    }
    return "৳ " + amount.toLocaleString();
  };

  return (
    <div className="space-y-6 text-on-surface font-sans">

      {/* Main content area */}
      <div className="space-y-6">

        {/* Search Header toolbar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 rounded-2xl space-y-3 shadow-sm transition-colors">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search by Tender ID (e.g. 1314688), keyword, district, ministry..."
                  className="w-full bg-white dark:bg-slate-950 border-2 border-indigo-200 dark:border-indigo-800/80 focus:border-indigo-600 dark:focus:border-indigo-400 outline-none rounded-xl text-xs py-2.5 pl-9 pr-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 font-sans font-medium transition-all shadow-xs h-10"
                />
              </div>
              {searchTerm.trim() && (
                <button
                  type="button"
                  onClick={() => handleSaveSearch(searchTerm)}
                  title="Save current query"
                  className="px-3 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shrink-0 h-9 select-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Save
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">


              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setNatureFilter('ALL');
                  setMethodFilter('ALL');
                  setDistrictFilter('ALL');
                  setOrgFilter('ALL');
                  setPeFilter('ALL');
                }}
                className="px-3 py-1.5 text-xs font-bold font-mono text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer shrink-0 text-center"
              >
                Clear Filters
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full">
            {/* Nature filter */}
            <div className="w-full">
              <select
                value={natureFilter}
                onChange={(e) => setNatureFilter(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 cursor-pointer font-semibold h-9 shadow-2xs"
              >
                <option value="ALL">Natures: All</option>
                <option value="Goods">Goods</option>
                <option value="Works">Works</option>
              </select>
            </div>

            {/* Method filter - Searchable! */}
            <div className="w-full">
              <SearchableSelect
                value={methodFilter}
                onChange={(val) => setMethodFilter(val)}
                options={procurementMethods}
                defaultLabel="Methods: All"
                placeholder="Search method..."
                maxDisplayLength={12}
              />
            </div>

            {/* District filter - Searchable! */}
            <div className="w-full">
              <SearchableSelect
                value={districtFilter}
                onChange={(val) => setDistrictFilter(val)}
                options={districts}
                defaultLabel="Districts: All"
                placeholder="Search district..."
                maxDisplayLength={12}
              />
            </div>

            {/* Org filter - Searchable! */}
            <div className="w-full">
              <SearchableSelect
                value={orgFilter}
                onChange={(val) => setOrgFilter(val)}
                options={organizations}
                defaultLabel="Orgs: All"
                placeholder="Search org..."
                maxDisplayLength={12}
              />
            </div>

            {/* PE filter - Searchable! - Spans both columns for a neat footer-bento look */}
            <div className="col-span-2 w-full">
              <SearchableSelect
                value={peFilter}
                onChange={(val) => setPeFilter(val)}
                options={procuringEntities}
                defaultLabel="PEs: All"
                placeholder="Search PE..."
                maxDisplayLength={12}
              />
            </div>
          </div>
        </div>

        {/* Subscription banner constraints banner */}
        {(isAccessBlocked || isExpired) && (
          <div className="bg-red-50 border border-red-200 p-5 rounded-2xl flex items-start gap-4">
            <Ban className="w-8 h-8 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1">
              <span className="text-rose-800 text-xs font-mono font-bold uppercase tracking-wider block">Premium Access Restrained</span>
              <p className="text-slate-700 text-sm">
                {isAccessBlocked
                  ? "Your corporate platform membership is blocked by extreme administrative rules. Please contact customer support of DORPOTRO.BD."
                  : "Your subscription has expired. You are currently browsing in read-only sandbox. Analytical insights are locked."
                }
              </p>
              <p className="text-slate-500 text-xs mt-1 font-mono">To renew, click the "Simulate bKash" sandbox inside 'CTO Specs Blueprint' then 'Simulated Payment API' to instantly update credentials natively!</p>
            </div>
          </div>
        )}



        {/* Active vs Archived Sub-Navigation Tab Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2 mt-2">
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg w-fit">
            <button
              onClick={() => setDeadlineFilter('active')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-mono transition-all flex items-center gap-1 cursor-pointer select-none h-7 ${deadlineFilter === 'active'
                  ? 'bg-white text-emerald-800 shadow-2xs border border-emerald-200/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${deadlineFilter === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
              Active ({totalActiveCount})
            </button>
            <button
              onClick={() => setDeadlineFilter('archived')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-mono transition-all flex items-center gap-1 cursor-pointer select-none h-7 ${deadlineFilter === 'archived'
                  ? 'bg-white text-slate-800 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
              Archived ({totalArchivedCount})
            </button>
            <button
              onClick={() => setDeadlineFilter('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-mono transition-all flex items-center gap-1 cursor-pointer select-none h-7 ${deadlineFilter === 'all'
                  ? 'bg-white text-indigo-800 shadow-2xs border border-indigo-200/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              All ({totalAllCount})
            </button>
          </div>
        </div>

        {/* Exact Tender ID Search Match Alert */}
        {(() => {
          const term = searchTerm.trim();
          if (term.length >= 4) {
            const matched = activeTendersList.find(t => t.id === term || t.id.includes(term));
            if (matched) {
              return (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-indigo-50/80 to-blue-50/80 border border-indigo-200/80 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-3xs text-left"
                >
                  <div className="flex gap-3 text-left">
                    <div className="bg-indigo-100 p-2.5 rounded-xl border border-indigo-200 flex items-center justify-center shrink-0 w-10 h-10 mt-0.5 shadow-2xs">
                      <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono bg-indigo-600 text-white px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                        ID Match Detected: #{matched.id}
                      </span>
                      <h4 className="text-xs font-bold text-slate-950 mt-1.5 font-sans leading-snug">
                        {matched.packageDescription || matched.briefDescription}
                      </h4>
                      <p className="text-[10.5px] text-slate-500 font-semibold font-sans mt-0.5">
                        Entity: {matched.procuringEntity || matched.organization} • {matched.procurementNature} work type
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            }
          }
          return null;
        })()}

        {/* Grid of Tenders (Paginated: 16 items per page for 4-column grid fill) */}
        {(() => {
          const ITEMS_PER_PAGE = 16;
          const totalPages = Math.ceil(filterTenders.length / ITEMS_PER_PAGE) || 1;
          const activePage = Math.min(Math.max(1, currentPage), totalPages);

          // Always sort tenders newest first (publicationDate descending, then ID descending)
          const sortedFilterTenders = [...filterTenders].sort((a, b) => {
            const dateA = a.publicationDate || "";
            const dateB = b.publicationDate || "";
            if (dateA !== dateB) {
              return dateB.localeCompare(dateA);
            }
            const idA = parseInt(a.id, 10) || 0;
            const idB = parseInt(b.id, 10) || 0;
            return idB - idA;
          });

          const paginatedTenders = sortedFilterTenders.slice((activePage - 1) * ITEMS_PER_PAGE, activePage * ITEMS_PER_PAGE);

          return (
            <>
              {filterTenders.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center space-y-4 max-w-lg mx-auto shadow-sm my-8 font-sans">
                  <div className="w-14 h-14 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-100">
                    <BadgeInfo className="w-6 h-6 text-slate-500" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-bold text-slate-800">No matching tenders found</h4>
                    <p className="text-slate-500 text-xs leading-relaxed max-w-sm mx-auto">
                      {deadlineFilter === 'archived'
                        ? "There are currently no archived tenders. Tenders automatically shift to the archive as soon as their target selling deadline expires."
                        : "We couldn't find any active tenders matching your filters. Try adjusting your district or search keywords."
                      }
                    </p>
                  </div>
                  {(searchTerm || natureFilter !== 'ALL' || districtFilter !== 'ALL' || orgFilter !== 'ALL' || peFilter !== 'ALL' || methodFilter !== 'ALL') && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setNatureFilter('ALL');
                        setDistrictFilter('ALL');
                        setOrgFilter('ALL');
                        setPeFilter('ALL');
                        setMethodFilter('ALL');
                      }}
                      className="bg-indigo-50 hover:bg-indigo-100 text-[#6366F1] border border-indigo-200/50 py-2 px-4 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer inline-block"
                    >
                      Reset Active Filters
                    </button>
                  )}
                </div>
              ) : (
                <motion.div
                  key={`${currentPage}-${searchTerm}-${natureFilter}-${districtFilter}-${orgFilter}-${peFilter}-${methodFilter}-${deadlineFilter}`}
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.05
                      }
                    }
                  }}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-2.5 items-stretch"
                >
                  {paginatedTenders.map((tender) => {
                    const isReTender = tender.isReTender;

                    // Calculate precise countdown (days, hours, minutes, seconds)
                    const lastSelling = tender.documentLastSellingDate || "N/A";
                    const parts = lastSelling.split(' ');
                    const datePart = parts[0];
                    const timePart = parts[1] || '17:05';

                    let watchText = '';
                    if (lastSelling && lastSelling !== 'N/A') {
                      try {
                        const dateParts = datePart.split('-');
                        const timeParts = timePart.split(':');
                        if (dateParts.length === 3) {
                          const year = parseInt(dateParts[0], 10);
                          const month = parseInt(dateParts[1], 10) - 1;
                          const day = parseInt(dateParts[2], 10);
                          const hoursVal = parseInt(timeParts[0], 10);
                          const minutesVal = parseInt(timeParts[1], 10);

                          const deadlineDate = new Date(year, month, day, hoursVal, minutesVal, 0);
                          const diffMs = deadlineDate.getTime() - now.getTime();
                          if (diffMs > 0) {
                            const totalSecs = Math.floor(diffMs / 1000);
                            const secs = totalSecs % 60;
                            const mins = Math.floor(totalSecs / 60) % 60;
                            const hours = Math.floor(totalSecs / 3600) % 24;
                            const days = Math.floor(totalSecs / (3600 * 24));

                            const dStr = days > 0 ? `${days}d ` : '';
                            const hStr = `${hours.toString().padStart(2, '0')}h `;
                            const mStr = `${mins.toString().padStart(2, '0')}m `;
                            const sStr = `${secs.toString().padStart(2, '0')}s`;
                            watchText = `${dStr}${hStr}${mStr}${sStr}`;
                          }
                        }
                      } catch (e) {
                        // fall back
                      }
                    }

                    return (
                      <motion.div
                        key={tender.id}
                        variants={{
                          hidden: { opacity: 0, y: 15 },
                          show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
                        }}
                        onClick={() => {
                          if (!isAccessBlocked) {
                            setSelectedTender(tender);
                          } else {
                            showToast("Access Restricted: Please upgrade subscription inside 'CTO Specs Blueprint' tab -> payment simulation.", "error");
                          }
                        }}
                        className="bg-white dark:bg-slate-900 hover:bg-slate-50/70 dark:hover:bg-slate-850 border-0 p-2.5 rounded-xl transition-all duration-200 cursor-pointer flex flex-col justify-between group relative shadow-sm hover:shadow-md hover:-translate-y-0.5 text-left"
                      >
                        <div className="space-y-2">

                          {/* Header indicators */}
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  title={watchlistedIds.includes(tender.id) ? "Remove from Watchlist" : "Add to Watchlist"}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onToggleWatchlist) {
                                      onToggleWatchlist(tender.id);
                                    }
                                  }}
                                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold border cursor-pointer flex items-center justify-center active:scale-95 transition-all select-none ${watchlistedIds.includes(tender.id)
                                      ? 'bg-amber-400 text-amber-950 border-amber-400 hover:bg-amber-500'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                                    }`}
                                >
                                  <Star className={`w-3 h-3 ${watchlistedIds.includes(tender.id) ? 'fill-amber-950' : ''}`} />
                                </button>
                                <span
                                  title="Click to copy ID"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(tender.id);
                                    setCopiedId(tender.id);
                                    setTimeout(() => setCopiedId(null), 1500);
                                  }}
                                  className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 px-2 py-0.5 rounded-md text-slate-800 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center gap-1 active:scale-95 transition-all select-none"
                                >
                                  ID: {tender.id}
                                  {copiedId === tender.id ? (
                                    <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5 text-slate-400 shrink-0 hover:text-slate-600" />
                                  )}
                                </span>

                                <span className="text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800/60">
                                  {getShortMethod(tender.procurementMethod)}
                                </span>
                                {offlineState && (
                                  <span className="text-[10px] font-mono bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 px-2 py-0.5 rounded-md font-bold animate-pulse">
                                    📥 Off-line Sync
                                  </span>
                                )}
                                {tender.budgetType && (
                                  <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                                    {tender.budgetType}
                                  </span>
                                )}
                                {tender.hasAmendment && (
                                  <span className="text-[10px] font-mono bg-slate-900 text-amber-400 px-2 py-0.5 rounded-md font-bold border border-amber-400/40 animate-pulse flex items-center gap-1">
                                    ⚠️ Corrigendum
                                  </span>
                                )}
                              </div>
                            </div>

                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border shrink-0 ${tender.procurementNature === 'Works'
                                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
                                : tender.procurementNature === 'Goods'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                              }`}>
                              {(tender.procurementNature || '').toUpperCase()}
                            </span>
                          </div>

                          {/* District, Organization & PE above Title */}
                          <div className="flex flex-col gap-0.5 text-[11px] leading-tight">
                            <div className="flex items-center gap-1.5 text-[10.5px]">
                              <div className="flex items-center gap-1 font-extrabold text-slate-900 dark:text-slate-100 shrink-0">
                                <MapPin className="w-3 h-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <span>{tender.district || tender.procuringDistrict || "BD"}</span>
                              </div>
                              <span className="text-slate-300 dark:text-slate-600 mx-0.5">•</span>
                              <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 min-w-0 truncate">
                                <Building2 className="w-3 h-3 shrink-0 text-indigo-500 dark:text-indigo-400" />
                                <span className="truncate">{tender.organization}</span>
                              </div>
                            </div>
                            {tender.procuringEntity && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                <span><strong className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">PE:</strong> {tender.procuringEntity}</span>
                              </div>
                            )}
                          </div>

                          {/* Package description */}
                          <div className="space-y-1.5">
                            <h3
                              className={`text-[11.5px] font-sans font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 leading-snug transition-colors cursor-pointer ${expandedTitleIds[tender.id] ? '' : 'line-clamp-2'}`}
                              title={tender.packageDescription || tender.briefDescription}
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedTitleIds(prev => ({ ...prev, [tender.id]: !prev[tender.id] }));
                              }}
                            >
                              {tender.packageDescription || tender.briefDescription}
                            </h3>
                            <div className="flex justify-between items-center mt-1">
                              {(() => {
                                let itemWorkingDays: number | null = null;
                                if (tender.tentativeStartDate && tender.tentativeEndDate) {
                                  const start = new Date(tender.tentativeStartDate);
                                  const end = new Date(tender.tentativeEndDate);
                                  if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                                    const diffTime = end.getTime() - start.getTime();
                                    if (diffTime >= 0) {
                                      itemWorkingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    }
                                  }
                                }
                                return (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedCardIds(prev => ({
                                          ...prev,
                                          [tender.id]: !prev[tender.id]
                                        }));
                                      }}
                                      className="text-[11px] font-sans font-extrabold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-0.5 cursor-pointer select-none bg-indigo-50/70 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/60 transition-all active:scale-95 leading-none"
                                    >
                                      <span>{expandedCardIds[tender.id] ? "Hide Eligibility" : "Show Eligibility"}</span>
                                      {expandedCardIds[tender.id] ? (
                                        <ChevronUp className="w-3 h-3 shrink-0" />
                                      ) : (
                                        <ChevronDown className="w-3 h-3 shrink-0" />
                                      )}
                                    </button>
                                    {itemWorkingDays !== null && (
                                      <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0 select-none">
                                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span>{itemWorkingDays} Days</span>
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                            {expandedCardIds[tender.id] && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 mt-2.5 text-[10.5px] text-slate-700 dark:text-slate-300 space-y-1 text-left shadow-2xs font-sans leading-relaxed animate-fadeIn"
                              >
                                <div className="text-[10.5px] font-mono font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1 leading-none mb-1">
                                  <BadgeInfo className="w-3 h-3 text-indigo-500" />
                                  Eligibility Requirements
                                </div>
                                <p className="whitespace-pre-wrap text-slate-800 dark:text-slate-200 font-medium">
                                  {tender.eligibility || "Standard PWD / e-GP bidding documents and validation guidelines apply."}
                                </p>
                              </div>
                            )}

                            {expandedCardIds[tender.id] && (() => {
                              const matchingAward = mockNoaDataset.find(n => n.tenderId === tender.id);
                              if (!matchingAward) return null;
                              return (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="bg-emerald-50/80 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 rounded-xl p-3.5 mt-2.5 text-[10.5px] text-emerald-950 dark:text-emerald-100 space-y-2.5 text-left shadow-2xs font-sans leading-relaxed animate-fadeIn"
                                >
                                  <div className="text-[11px] font-mono font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 leading-none mb-1">
                                    <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    🏆 e-GP Live Tender Box - Notification of Award (NOA) Summary
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 bg-white/80 dark:bg-slate-900/80 border border-emerald-150 dark:border-emerald-800/60 rounded-lg p-2.5 text-xs">
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] uppercase tracking-wider font-mono text-emerald-700 dark:text-emerald-400 font-extrabold block">Awarded Contractor Entity</span>
                                      <strong className="text-slate-900 dark:text-slate-100 font-sans text-[11.5px] leading-tight block">{matchingAward.awardedBidder}</strong>
                                      {matchingAward.contractorTendererId && (
                                        <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 block">Tenderer Office ID: #{matchingAward.contractorTendererId}</span>
                                      )}
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] uppercase tracking-wider font-mono text-emerald-700 dark:text-emerald-400 font-extrabold block">Contract Awarded Value</span>
                                      <strong className="text-emerald-700 dark:text-emerald-300 font-mono text-[11.5px] leading-tight block">৳ {matchingAward.contractAmount.toLocaleString()} BDT</strong>
                                      <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 block">(-{matchingAward.discountPct.toFixed(2)}% discount below estimate)</span>
                                    </div>
                                  </div>

                                  {matchingAward.contractorBeneficialOwner && (
                                    <div className="bg-white/40 dark:bg-slate-900/50 border border-emerald-150/40 dark:border-emerald-800/40 rounded-lg p-2.5 text-[10px] space-y-1">
                                      <div className="flex justify-between items-center">
                                        <span className="text-[10px] uppercase tracking-wider font-mono text-emerald-700 dark:text-emerald-400 font-extrabold block">Active Beneficial Owner (100% Ownership)</span>
                                        <span className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 px-1 rounded-sm leading-none py-0.5 font-bold">Verified Ledger</span>
                                      </div>
                                      <p className="text-slate-900 dark:text-slate-100 font-bold">{matchingAward.contractorBeneficialOwner}</p>
                                      {matchingAward.contractorAddress && (
                                        <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-normal">{matchingAward.contractorAddress}</p>
                                      )}
                                    </div>
                                  )}

                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono text-slate-800 dark:text-slate-200 bg-emerald-100/30 dark:bg-slate-900/60 p-2 rounded-lg border border-emerald-150/40 dark:border-emerald-800/40">
                                    <div>
                                      <span className="text-emerald-700 dark:text-emerald-400 font-extrabold block text-[10px] uppercase">Adv Date</span>
                                      <strong>{matchingAward.advertisementDate || matchingAward.awardDate}</strong>
                                    </div>
                                    <div>
                                      <span className="text-emerald-700 dark:text-emerald-400 font-extrabold block text-[10px] uppercase">NOA Signed</span>
                                      <strong>{matchingAward.awardDate}</strong>
                                    </div>
                                    <div>
                                      <span className="text-emerald-700 dark:text-emerald-400 font-extrabold block text-[10px] uppercase">Contract Start</span>
                                      <strong>{matchingAward.proposedStart || "N/A"}</strong>
                                    </div>
                                    <div>
                                      <span className="text-emerald-700 dark:text-emerald-400 font-extrabold block text-[10px] uppercase">Completion Target</span>
                                      <strong>{matchingAward.proposedCompletion || "N/A"}</strong>
                                    </div>
                                  </div>

                                  {matchingAward.authorisedOfficer && (
                                    <div className="text-[10.5px] font-mono text-emerald-700 dark:text-emerald-400 flex justify-between items-center px-1">
                                      <span>Procuring Entity Executive Officer:</span>
                                      <span className="font-bold underline">{matchingAward.authorisedOfficer}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Inline price, security, and EST Budget specification */}
                          <div className="font-mono text-[11px] mt-1">
                            <div className="grid grid-cols-3 text-center py-1.5 px-2 bg-slate-50/80 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-xl leading-tight">
                              <div className="border-r border-slate-200 dark:border-slate-800 px-1 flex flex-col justify-center">
                                <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-bold">PRICE</span>
                                <span className="text-slate-900 dark:text-emerald-400 font-extrabold mt-0.5 block truncate text-[10.5px]">
                                  ৳{tender.documentPrice ? `${tender.documentPrice.toLocaleString()}` : "500"}
                                </span>
                              </div>
                              <div className="border-r border-slate-200 dark:border-slate-800 px-1 flex flex-col justify-center">
                                <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-bold">SECURITY</span>
                                <span className="text-slate-900 dark:text-emerald-400 font-extrabold mt-0.5 block truncate text-[10.5px]">
                                  ৳{tender.securityAmount ? `${tender.securityAmount.toLocaleString()}` : "15,000"}
                                </span>
                              </div>
                              <div className="px-1 flex flex-col justify-center">
                                <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-bold">EST. BUDGET</span>
                                <span className="text-slate-900 dark:text-emerald-400 font-extrabold mt-0.5 block truncate text-[10.5px]">
                                  {tender.estimatedCostAmt > 0 ? formatBDT(tender.estimatedCostAmt).replace(" Crore", " Cr").replace(" Lac", " L") : "Rate Contract"}
                                </span>
                              </div>
                            </div>
                          </div>

                        </div>

                        {/* Bottom statistics panel & direct Apply button */}
                        <div className="mt-2 space-y-1.5">
                          <div className="grid grid-cols-[0.8fr_1fr_1.4fr] items-center text-[10px] bg-slate-100/70 dark:bg-slate-950/80 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800/80 gap-1">
                            <div className="flex flex-col text-left py-0.5">
                              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500 dark:text-slate-400 leading-none">Published</span>
                              <span className="text-slate-700 dark:text-slate-300 font-mono font-bold mt-0.5 leading-none">{(tender.publicationDate || "N/A").split(' ')[0]}</span>
                            </div>

                            <div className="flex flex-col items-center justify-center text-center py-0.5">
                              {watchText ? (
                                <>
                                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500 dark:text-slate-400 leading-none">Time Left</span>
                                  <span className={`text-emerald-700 dark:text-emerald-400 font-mono font-extrabold mt-0.5 text-[11px] tracking-tight leading-none ${watchText.includes('s') && !watchText.startsWith('00') ? 'animate-pulse' : ''}`}>
                                    {watchText}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500 dark:text-slate-400 leading-none">Time Left</span>
                                  <span className="text-slate-800 dark:text-slate-300 font-mono font-bold mt-0.5 text-[11px] leading-none">
                                    Expired
                                  </span>
                                </>
                              )}
                            </div>

                            <div className="flex flex-col text-right py-0.5">
                              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500 dark:text-slate-400 leading-none">Selling Deadline</span>
                              <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200 font-mono font-bold justify-end mt-0.5 leading-none">
                                <Clock className="w-2.5 h-2.5 text-slate-500 dark:text-slate-400 shrink-0" />
                                <span className="text-[11px] font-bold tracking-tight whitespace-nowrap leading-none">{datePart} {timePart}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <a
                              href={tender.tenderLink}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="w-full bg-white hover:bg-slate-50 text-slate-800 font-bold font-mono py-2.5 rounded-xl text-center flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow active:scale-[0.99] select-none border border-slate-200 text-xs tracking-wider"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-slate-600 font-black" strokeWidth={2.5} />
                              e-GP Notice
                            </a>
                          </div>
                        </div>

                      </motion.div>
                    );
                  })}
                </motion.div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                  <div className="text-xs text-slate-500 font-medium text-center sm:text-left">
                    Showing <span className="font-mono font-bold text-slate-800">{Math.min(filterTenders.length, (activePage - 1) * ITEMS_PER_PAGE + 1)}</span> to{" "}
                    <span className="font-mono font-bold text-slate-800">{Math.min(filterTenders.length, activePage * ITEMS_PER_PAGE)}</span> of{" "}
                    <span className="font-mono font-bold text-slate-800">{filterTenders.length}</span> tenders (Page {activePage} of {totalPages})
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-center font-sans">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={activePage === 1}
                      className="p-2 rounded-lg border border-slate-205 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white select-none transition-all cursor-pointer flex items-center justify-center min-w-[36px]"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Smart page numbers rendering with ellipses support */}
                    {(() => {
                      const pages: (number | string)[] = [];
                      const range = 1;

                      for (let i = 1; i <= totalPages; i++) {
                        if (
                          i === 1 ||
                          i === totalPages ||
                          (i >= activePage - range && i <= activePage + range)
                        ) {
                          pages.push(i);
                        } else if (
                          (i === 2 && activePage - range > 2) ||
                          (i === totalPages - 1 && activePage + range < totalPages - 1)
                        ) {
                          pages.push("...");
                        }
                      }

                      const cleanPages = pages.filter((item, index) => item !== "..." || pages[index - 1] !== "...");

                      return cleanPages.map((p, idx) => {
                        if (p === "...") {
                          return (
                            <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 font-mono text-xs select-none">
                              ...
                            </span>
                          );
                        }
                        const isSelected = p === activePage;
                        return (
                          <button
                            key={`page-${p}`}
                            onClick={() => setCurrentPage(Number(p))}
                            className={`w-9 h-9 rounded-lg border text-xs font-mono font-bold select-none transition-all cursor-pointer ${isSelected
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                : "border-slate-205 text-slate-600 bg-white hover:bg-slate-50"
                              }`}
                          >
                            {p}
                          </button>
                        );
                      });
                    })()}

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={activePage === totalPages}
                      className="p-2 rounded-lg border border-slate-205 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white select-none transition-all cursor-pointer flex items-center justify-center min-w-[36px]"
                      title="Next Page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-1 ml-2.5 pl-2.5 border-l border-slate-200">
                      <span className="text-[11px] font-medium text-slate-500 font-sans">Go to</span>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const p = parseInt(goToPageInput, 10);
                          if (!isNaN(p) && p >= 1 && p <= totalPages) {
                            setCurrentPage(p);
                            setGoToPageInput('');
                          } else {
                            showToast(`Please enter a valid page between 1 and ${totalPages}.`, "error");
                          }
                        }}
                        className="flex items-center gap-1"
                      >
                        <input
                          type="text"
                          placeholder="Page..."
                          value={goToPageInput}
                          onChange={(e) => setGoToPageInput(e.target.value)}
                          className="w-14 h-9 px-1.5 text-center text-xs font-mono font-bold border border-slate-205 rounded-lg focus:outline-none focus:border-indigo-505 bg-white text-slate-800"
                        />
                        <button
                          type="submit"
                          className="h-9 px-2.5 rounded-lg bg-indigo-650 hover:bg-indigo-700 bg-indigo-600 text-white text-[10px] font-bold font-mono transition-colors cursor-pointer shadow-2xs"
                        >
                          Go
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {/* DETAILED TECHNICAL TENDER INSPECTOR MODAL */}
        {selectedTender && (() => {
          const activeTender = sanitizeTenderRecord(selectedTender);
          return (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex justify-center items-center z-50 p-2 sm:p-4 overflow-hidden" onClick={() => { if (!showPdfPreview) setSelectedTender(null); }}>
              <div
                id="tender-details-view"
                className="bg-white border border-border-subtle rounded-2xl w-full max-w-[96vw] sm:max-w-5xl lg:max-w-6xl xl:max-w-7xl max-h-[92vh] sm:max-h-[90vh] shadow-2xl animate-fade-in text-on-surface flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
              >

                {/* Modal Header */}
                <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:py-4 border-b border-border-subtle flex justify-between items-center shrink-0">
                  <div>
                    <span className="text-[11px] font-mono text-[#059669] font-bold block uppercase tracking-wider">eprocure.gov.bd Document Registry</span>
                    <h3 className="text-base font-display font-black text-primary flex items-center gap-2 mt-1 flex-wrap">
                      <BadgeInfo className="text-[#6366F1] w-4.5 h-4.5" />
                      Detailed e-GP Record Check: ID {activeTender.id}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedTender(null)}
                    className="text-slate-600 hover:text-black bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full border border-border-subtle transition-all text-xs cursor-pointer focus:outline-none flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Modal Contents (Scrollable Body) */}
                <div className="p-3.5 sm:p-6 space-y-4 flex-1 overflow-y-auto overscroll-contain">

                  {/* Grid of full attributes directly from attached CSV */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1.5">Tender Metadata</span>

                    {(() => {
                      let workingDays: number | null = null;
                      if (activeTender.tentativeStartDate && activeTender.tentativeEndDate) {
                        const start = new Date(activeTender.tentativeStartDate);
                        const end = new Date(activeTender.tentativeEndDate);
                        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                          const diffTime = end.getTime() - start.getTime();
                          if (diffTime >= 0) {
                            workingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          }
                        }
                      }

                      // Check if deadline is within next 24 hours
                      let isUrgentDeadline = false;
                      const lastSelling = activeTender.documentLastSellingDate || "N/A";
                      if (lastSelling && lastSelling !== 'N/A') {
                        try {
                          const parts = lastSelling.split(' ');
                          const datePart = parts[0];
                          const timePart = parts[1] || '17:05';
                          const dateParts = datePart.split('-');
                          const timeParts = timePart.split(':');
                          if (dateParts.length === 3) {
                            const year = parseInt(dateParts[0], 10);
                            const month = parseInt(dateParts[1], 10) - 1;
                            const day = parseInt(dateParts[2], 10);
                            const hoursVal = parseInt(timeParts[0], 10);
                            const minutesVal = parseInt(timeParts[1], 10);

                            const deadlineDate = new Date(year, month, day, hoursVal, minutesVal, 0);
                            const diffMs = deadlineDate.getTime() - now.getTime();
                            if (diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000) {
                              isUrgentDeadline = true;
                            }
                          }
                        } catch (e) {
                          // ignore
                        }
                      }

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5 text-xs">
                          <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200 p-1.5 px-2 rounded-lg flex flex-col justify-center transition-all">
                            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-extrabold font-mono mb-0.5">Ministry</span>
                            <span className="font-bold text-slate-800 break-words leading-tight" title={activeTender.ministry}>{activeTender.ministry}</span>
                          </div>
                          <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200 p-1.5 px-2 rounded-lg flex flex-col justify-center transition-all">
                            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-extrabold font-mono mb-0.5">Scheduled Publication</span>
                            <span className="font-mono text-slate-800 font-bold break-words leading-tight">{activeTender.publicationDate?.replace(' 00:00', '')}</span>
                          </div>
                          <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200 p-1.5 px-2 rounded-lg flex flex-col justify-center transition-all min-w-0">
                            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-extrabold font-mono mb-0.5 shrink-0">Organization Name</span>
                            <div className="overflow-y-auto max-h-[44px] pr-1">
                              <span className="font-bold text-slate-800 break-words leading-tight block" title={activeTender.organization}>{activeTender.organization}</span>
                            </div>
                          </div>
                          <div className={`p-1.5 px-2 rounded-lg flex flex-col justify-center transition-all duration-300 min-w-0 ${isUrgentDeadline
                              ? 'bg-red-50 border border-red-300 animate-pulse text-red-700'
                              : 'bg-slate-50/80 hover:bg-slate-50 border border-slate-200'
                            }`}>
                            <span className={`text-[10px] uppercase tracking-wider font-extrabold font-mono mb-0.5 shrink-0 ${isUrgentDeadline ? 'text-red-700' : 'text-slate-400'}`}>Selling Deadline</span>
                            <span className={`font-mono font-bold break-words leading-tight ${isUrgentDeadline ? 'text-red-700 font-black' : 'text-amber-700'}`}>
                              {activeTender.documentLastSellingDate?.replace(' 00:00', '')} {isUrgentDeadline && '⚠️'}
                            </span>
                          </div>
                          <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200 p-1.5 px-2 rounded-lg flex flex-col justify-center transition-all min-w-0">
                            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-extrabold font-mono mb-0.5 shrink-0">PE</span>
                            <div className="overflow-y-auto max-h-[44px] pr-1">
                              <span className="font-bold text-slate-800 break-words leading-tight block" title={activeTender.procuringEntity}>{activeTender.procuringEntity}</span>
                            </div>
                          </div>
                          <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200 p-1.5 px-2 rounded-lg flex flex-col justify-center transition-all">
                            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-extrabold font-mono mb-0.5">Tentative Start</span>
                            <span className="font-mono text-slate-800 leading-tight">{activeTender.tentativeStartDate?.replace(' 00:00', '')}</span>
                          </div>
                          <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200 p-1.5 px-2 rounded-lg flex flex-col justify-center transition-all">
                            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-extrabold font-mono mb-0.5">Tentative End</span>
                            <span className="font-mono text-slate-800 leading-tight">{activeTender.tentativeEndDate?.replace(' 00:00', '')}</span>
                          </div>
                          <div className="bg-indigo-50/90 hover:bg-indigo-50 border border-indigo-150 p-1.5 px-2 rounded-lg flex flex-col justify-center transition-all">
                            <span className="text-indigo-650 text-[10px] uppercase tracking-wider font-extrabold font-mono mb-0.5">Working Time</span>
                            <span className="font-mono text-indigo-800 font-extrabold leading-tight">
                              {workingDays !== null ? `${workingDays} Days` : "N/A"}
                            </span>
                          </div>
                          <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200 p-1.5 px-2 rounded-lg flex flex-col justify-center transition-all">
                            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-extrabold font-mono mb-0.5">Procurement Method</span>
                            <span className="font-mono text-slate-800 font-semibold leading-tight">{activeTender.procurementMethod}</span>
                          </div>
                          <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200 p-1.5 px-2 rounded-lg flex flex-col justify-center transition-all">
                            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-extrabold font-mono mb-0.5">Invitation Reference</span>
                            <span className="font-mono text-slate-800 font-semibold break-words select-all leading-tight">{activeTender.invitationRefNo}</span>
                          </div>
                          <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200 p-1.5 px-2 rounded-lg flex flex-col justify-center transition-all">
                            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-extrabold font-mono mb-0.5">Package No.</span>
                            <span className="font-mono text-indigo-700 font-bold break-words select-all leading-tight">{activeTender.packageNo || "N/A"}</span>
                          </div>
                          <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200 p-1.5 px-2 rounded-lg flex flex-col justify-center transition-all">
                            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-extrabold font-mono mb-0.5">Doc / Security</span>
                            <div className="flex items-center gap-2 leading-tight">
                              <span className="text-emerald-700 font-extrabold">৳ {activeTender.documentPrice}</span>
                              <span className="text-slate-300">/</span>
                              <span className="text-amber-700 font-extrabold">৳ {activeTender.securityAmount?.toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200 p-1.5 px-2 rounded-lg flex flex-col justify-center transition-all">
                            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-extrabold font-mono mb-0.5">Budget / Fund Source</span>
                            <span className="font-mono font-bold text-slate-800 break-words leading-tight">
                              {activeTender.budgetType}{activeTender.sourceOfFunds && activeTender.sourceOfFunds !== 'Not applicable' && activeTender.sourceOfFunds !== activeTender.budgetType ? ` (${activeTender.sourceOfFunds})` : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Extensive Descriptions & Inviting Official Contact Card */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Eligibility criteria box */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 flex flex-col lg:col-span-2">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-200 mb-2 font-sans">
                        <span className="font-mono text-[10.5px] text-slate-400 uppercase font-black tracking-wider">TENDERER ELIGIBILITY (TDS)</span>
                        <span className="font-mono text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-extrabold">
                          Database length: {activeTender.eligibility?.split(/\s+/).filter(Boolean).length || 0} words / {activeTender.eligibility?.length || 0} chars
                        </span>
                      </div>
                      <p className="text-slate-800 leading-relaxed whitespace-pre-wrap break-words text-sm flex-1">
                        {activeTender.eligibility}
                      </p>
                    </div>

                    {/* Inviting official Contact Card */}
                    <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col justify-between">
                      <div>
                        <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5 border-b border-slate-200 pb-1.5 font-bold">INVITING OFFICIAL</span>
                        <div className="space-y-1.5 text-sm">
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-mono mr-1.5">Name:</span>
                            <strong className="text-slate-800 font-bold">{activeTender.officialInviter}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-mono mr-1.5">Designation:</span>
                            <span className="text-slate-700 font-medium">{activeTender.officialDesignation}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-mono mr-1.5">Phone:</span>
                            <span className="font-mono text-slate-800 font-bold">{activeTender.phone}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs border-t border-slate-200 pt-2 text-slate-500 break-words whitespace-normal" title={activeTender.officialAddress}>
                        <strong className="text-slate-400 font-semibold mr-1">Address:</strong>{activeTender.officialAddress}
                      </div>
                    </div>
                  </div>

                  {/* Paid/Free Ads Spot box insertion for free users only */}
                  {userSub === 'free' && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest border-b border-slate-200 pb-1.5">
                        <span>Sponsored Advertisement</span>
                        <span>
                          {activeAdType === 'google'
                            ? `Google AdSense | ${googleAdsAccount}`
                            : 'Premium Partner Ad'}
                        </span>
                      </div>

                      {activeAdType === 'google' ? (
                        <div className="bg-amber-500/5 hover:bg-amber-500/10 border border-dashed border-amber-500/35 p-5 rounded-lg flex flex-col md:flex-row items-center gap-4 text-center md:text-left transition-all">
                          <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center font-mono font-bold text-amber-600 text-xs shrink-0 select-none">
                            Ad
                          </div>
                          <div className="space-y-1 flex-1 min-w-0 text-left">
                            <span className="text-amber-800 text-[10px] font-mono font-bold block uppercase tracking-wider">Dynamic Google Banner</span>
                            <h4 className="text-xs font-bold text-slate-800 font-sans truncate">Apply with Pre-Approved Bid Bonds</h4>
                            <p className="text-slate-500 text-[11px] leading-relaxed">
                              Secure instant BG limits and high value credit facilities within 24 hours. Sponsored by Ad AdsSense Slot {googleAdsSlot}.
                            </p>
                          </div>
                          <div className="shrink-0 text-[10px] font-mono font-bold bg-white text-slate-600 border border-slate-300 py-1 px-2.5 rounded-md uppercase tracking-wider">
                            AdSense
                          </div>
                        </div>
                      ) : (
                        <a
                          href={customAdLink}
                          target="_blank"
                          rel="noreferrer"
                          className="flex flex-col md:flex-row gap-4 items-center bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-150 p-4 rounded-lg transition-all text-left block"
                        >
                          {customAdImage && (
                            <img
                              src={customAdImage}
                              alt="Banner Upload"
                              referrerPolicy="no-referrer"
                              className="w-full md:w-32 h-16 object-cover rounded-md border border-slate-200 shrink-0 select-none shadow-sm"
                            />
                          )}
                          <div className="space-y-1 text-xs">
                            <div className="font-bold text-indigo-950 font-sans leading-snug flex items-center gap-1.5 flex-wrap">
                              <span>{customAdTitle}</span>
                              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-mono tracking-widest px-1.5 py-0.2 rounded font-black uppercase">PARTNER</span>
                            </div>
                            <p className="text-slate-600 text-[11px] leading-relaxed font-sans">{customAdText}</p>
                          </div>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Action Buttons inside modals */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-3">
                  </div>

                </div>

                {/* Modal Footer (Pinned at bottom) */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 p-3 sm:px-6 sm:py-3.5 bg-slate-50 border-t border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedTender(null)}
                    className="flex-grow sm:flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 sm:py-3 rounded-xl font-bold font-mono text-xs cursor-pointer transition-colors border border-border-subtle"
                  >
                    RETURN TO DIRECTORY
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPdfPreview(true)}
                    className="flex-grow sm:flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2.5 sm:py-3 rounded-xl font-bold font-mono text-xs flex items-center justify-center gap-2 cursor-pointer transition-all border border-indigo-200 shadow-3xs"
                  >
                    <FileText className="w-4 h-4 text-indigo-500" />
                    PREVIEW PDF NOTICE
                  </button>
                  <a
                    href={activeTender.tenderLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-grow sm:flex-1 bg-white hover:bg-slate-50 text-slate-800 py-2.5 sm:py-3 rounded-xl font-bold font-mono text-xs text-center flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-200 shadow-sm active:scale-[0.99]"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-600" strokeWidth={2.5} />
                    e-GP Notice
                  </a>
                </div>

              </div>
            </div>
          );
        })()}

        {/* PDF PRINT PREVIEW INTERACTIVE MODAL OVERLAY */}
        {selectedTender && showPdfPreview && (
          <div id="pdf-preview-modal" className="fixed inset-0 bg-slate-900/85 backdrop-blur-md flex flex-col justify-between z-55 overflow-hidden animate-fadeIn" onClick={() => setShowPdfPreview(false)}>

            {/* Header Action Bar */}
            <div className="bg-slate-950 text-white px-4 py-3 border-b border-slate-800 flex justify-between items-center z-10 shrink-0" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2.5 text-left">
                <div className="bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/30">
                  <FileText className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h4 className="text-xs font-black font-mono tracking-wide">Document_Notice_ID_{selectedTender.id}.pdf</h4>
                  <p className="text-[11px] text-slate-400 font-semibold font-sans">e-GP Registry Specification File Summary • A4 Sheet Preview</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => handlePrintPdf(selectedTender)}
                  className="bg-indigo-650 hover:bg-indigo-700 bg-indigo-600 text-white font-mono hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer select-none border border-indigo-500"
                  title="Print specifications or save as official PDF file"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>PRINT / SAVE PDF</span>
                </button>
                <button
                  onClick={() => handleDownloadTxt(selectedTender)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-205 text-slate-200 font-mono px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer select-none border border-slate-700"
                  title="Download notice records as raw plain text spec"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>RAW TXT SUMMARY</span>
                </button>
                <button
                  onClick={() => setShowPdfPreview(false)}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-full transition-all text-xs cursor-pointer focus:outline-none flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Interactive Document Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-900/30" onClick={e => e.stopPropagation()}>
              <div
                id="simulated-pdf-sheet"
                className="bg-white text-slate-800 max-w-3xl mx-auto p-6 sm:p-12 rounded-lg shadow-2xl border border-slate-300 relative text-left select-text font-sans scroll-smooth"
                style={{ minHeight: '297mm' }}
              >
                {/* Seal Draft Background Watermark */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none opacity-[0.035] -rotate-45 font-mono text-center z-0 w-full">
                  <div className="text-[34px] sm:text-[45px] font-black tracking-widest text-[#1e293b] leading-none mb-2">DORPOTRO SMART</div>
                  <div className="text-[20px] sm:text-[25px] font-bold text-[#1e293b]">E-GP CO-PILOT SPEC</div>
                </div>

                {/* Document Header */}
                <div className="text-center border-b-2 border-slate-900 pb-4 mb-6 relative z-1">
                  <div className="text-[11px] sm:text-[13px] font-extrabold uppercase tracking-wider text-slate-900">Government of the People's Republic of Bangladesh</div>
                  <div className="text-[10px] sm:text-[11.5px] font-bold text-slate-600 mt-0.5">{selectedTender.ministry}</div>
                  {selectedTender.organization && <div className="text-[10px] sm:text-[11px] font-medium text-slate-500">{selectedTender.organization}</div>}
                  {selectedTender.procuringEntity && <div className="text-[11px] sm:text-[10.5px] font-semibold text-slate-400 font-mono">{selectedTender.procuringEntity}</div>}

                  <h2 className="text-base sm:text-lg font-black text-blue-800 mt-4 uppercase tracking-normal">Tender Notice Specifications</h2>
                  <div className="text-[11px]/none font-bold text-slate-500 font-mono mt-1.5">CONSOLIDATED E-GP SPECIFICATION SHEET • TENDER ID: {selectedTender.id}</div>
                </div>

                {/* Detailed specification metrics table */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5 text-xs border border-slate-200 p-4 sm:p-5 rounded-lg bg-slate-50/50 mb-6 relative z-1 font-sans">
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 font-bold uppercase block">Tender Proposal ID</span>
                    <span className="text-slate-800 font-bold block mt-0.5">{selectedTender.id}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 font-bold uppercase block">Scheduled Publication Date</span>
                    <span className="text-slate-800 font-semibold block mt-0.5">{selectedTender.publicationDate || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 font-bold uppercase block">Invitation Reference Number</span>
                    <span className="text-slate-800 font-mono font-semibold block mt-0.5 break-all">{selectedTender.invitationRefNo || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 font-bold uppercase block">Document Last Selling Date</span>
                    <span className="text-slate-800 font-semibold block mt-0.5 text-amber-700">{selectedTender.documentLastSellingDate || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 font-bold uppercase block">Procurement Method</span>
                    <span className="text-slate-800 font-bold block mt-0.5">{selectedTender.procurementMethod || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 font-bold uppercase block">Budget Type / Fund Source</span>
                    <span className="text-slate-800 font-semibold block mt-0.5">{selectedTender.budgetType} ({selectedTender.sourceOfFunds})</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 font-bold uppercase block">Package Number</span>
                    <span className="text-indigo-700 font-semibold block mt-0.5 font-mono">{selectedTender.packageNo || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 font-bold uppercase block">Procurement Category</span>
                    <span className="text-slate-800 font-semibold block mt-0.5 truncate text-[11px]" title={selectedTender.category}>{selectedTender.category || 'N/A'}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-[11px] font-mono text-slate-400 font-bold uppercase block">Project Name</span>
                    <span className="text-slate-800 font-bold block mt-0.5 text-[11px] leading-snug">{selectedTender.projectName || 'N/A'}</span>
                  </div>
                  <div className="md:col-span-2 border-t border-slate-100 pt-3">
                    <span className="text-[11px] font-mono text-slate-400 font-bold uppercase block">Package Description (Scope of Works)</span>
                    <span className="text-slate-700 font-medium block mt-0.5 whitespace-pre-wrap text-[11px] leading-relaxed">{selectedTender.packageDescription || selectedTender.briefDescription || 'N/A'}</span>
                  </div>
                  <div className="border-t border-slate-100 pt-3">
                    <span className="text-[11px] font-mono text-slate-400 font-bold uppercase block">Document Purchasing Price</span>
                    <span className="text-emerald-700 font-black block mt-0.5">৳ {selectedTender.documentPrice}</span>
                  </div>
                  <div className="border-t border-slate-100 pt-3">
                    <span className="text-[11px] font-mono text-slate-400 font-bold uppercase block">Tender Security Bank Guarantee</span>
                    <span className="text-amber-700 font-black block mt-0.5">৳ {selectedTender.securityAmount?.toLocaleString() || '0'}</span>
                  </div>
                </div>

                {/* Eligibility text box representation */}
                <div className="mb-6 relative z-1 text-xs font-sans">
                  <h3 className="font-mono text-[11px] font-bold text-slate-900 border-b border-slate-300 pb-1.5 mb-2 uppercase tracking-wide">Tenderer Eligibility & Compliance Checklist</h3>
                  <div className="bg-slate-100 border border-slate-200 p-4 rounded-lg text-slate-700 leading-relaxed whitespace-pre-wrap text-[11px]">
                    {selectedTender.eligibility || 'Standard e-GP Bidding Document guidelines and license class requirements apply.'}
                  </div>
                </div>

                {/* Invitation Representative details mapping */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-t border-slate-200 pt-5 relative z-1 text-xs">
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] font-mono mb-2 tracking-wide">Official Inviting Tender (PE Representative)</h4>
                    <div className="space-y-1 text-slate-600 text-[11px]">
                      <div><span className="font-semibold text-slate-400">Name:</span> <strong className="text-slate-800">{selectedTender.officialInviter || 'N/A'}</strong></div>
                      <div><span className="font-semibold text-slate-400">Designation:</span> {selectedTender.officialDesignation || 'N/A'}</div>
                      <div><span className="font-semibold text-slate-400">Phone/Fax:</span> <span className="font-mono text-slate-850 font-semibold">{selectedTender.phone || 'N/A'}</span></div>
                      <div><span className="font-semibold text-slate-400">Address:</span> <span className="text-slate-700 font-medium">{selectedTender.officialAddress || 'N/A'}</span></div>
                    </div>
                  </div>

                  <div className="w-56 text-right sm:self-end mt-4 sm:mt-0 shrink-0">
                    <div className="border-b border-dashed border-slate-400 h-10 w-full mb-1"></div>
                    <span className="text-[11px] font-mono text-slate-400 font-bold uppercase block tracking-wider">Authorized Signature & Seal</span>
                    <span className="text-[10px] text-slate-400 font-semibold block">Office of the Procuring Entity</span>
                  </div>
                </div>

                {/* Print verification stamp footer */}
                <div className="border-t border-slate-200 pt-4 mt-6 flex justify-between items-center text-[11px] text-slate-400 font-semibold font-mono relative z-1">
                  <div>DORPOTRO SMART SPECIFICATIONS SHEETS</div>
                  <div>PRINT TIMESTAMP: {new Date().toLocaleString()}</div>
                </div>

              </div>
            </div>

            {/* Bottom emulator tray */}
            <div className="bg-slate-950 text-white px-4 py-2 border-t border-slate-800 text-[10px] font-mono text-center flex-shrink-0 flex justify-between items-center z-10" onClick={e => e.stopPropagation()}>
              <span className="text-slate-400">A4 LIVE WORKSPACE SPEC PREVIEW</span>
              <span className="text-amber-500 font-bold">READY FOR EXPORT / LOCAL DOWNLOAD</span>
            </div>

          </div>
        )}

        {/* Sticky bottom Ad Bar for Free Users */}
        {userSub === 'free' && (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mt-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 select-none relative overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-6 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 transform -translate-x-12 translate-y-6 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex items-center gap-3 w-full md:w-auto z-10">
              <span className="bg-amber-500 text-amber-950 animate-pulse text-[11px] font-black tracking-widest leading-none px-2 py-1 rounded font-mono uppercase shrink-0">
                Google Ads
              </span>
              <div className="space-y-0.5 text-left">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-[11px] font-bold text-slate-200">Pre-Qualified Bid Bonds & Cash Limits</span>
                  <span className="text-[11px] font-mono text-slate-500 font-semibold text-[10px] uppercase tracking-wider">Account: {googleAdsAccount}</span>
                </div>
                <p className="text-[10px] text-slate-400 max-w-xl leading-snug font-sans">
                  {activeAdType === 'google'
                    ? `Secure instant BG limit facilities mapped securely inside AdSlot ${googleAdsSlot}.`
                    : `Partner: ${customAdTitle} - ${customAdText}`
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 z-10 w-full md:w-auto justify-end border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
              {activeAdType === 'custom' && customAdImage && (
                <img
                  src={customAdImage}
                  alt="Partner ad"
                  referrerPolicy="no-referrer"
                  className="w-24 h-10 object-cover rounded border border-slate-800 hidden md:block select-none"
                />
              )}
              <a
                href={activeAdType === 'google' ? `https://google.com/adsense` : customAdLink}
                target="_blank"
                rel="noreferrer"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wider transition-all shadow-md text-center inline-block w-full md:w-auto cursor-pointer"
              >
                {activeAdType === 'google' ? 'ADSENSE INFO' : 'VISIT SPONSOR'}
              </a>
            </div>
          </div>
        )}

        {/* AI WINNING PROBABILITY MODAL OVERLAY */}
        {winningProbabilityTender && (
          <div id="ai-probability-modal" className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex justify-center items-center z-55 p-4 overflow-y-auto animate-fade-in animate-fadeIn" onClick={() => setWinningProbabilityTender(null)}>
            <div
              id="ai-probability-content"
              className="bg-slate-950 text-slate-200 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl transition-all font-sans relative flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Top Bar Indicator */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-2xl"></div>

              {/* Header */}
              <div className="px-6 py-4.5 border-b border-slate-850 flex justify-between items-center bg-slate-950 sticky top-0 z-10 backdrop-blur-md">
                <div className="flex items-center gap-3 text-left">
                  <div className="bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20 shadow-inner">
                    <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black font-mono tracking-wide uppercase text-indigo-400">DORPOTRO AI Bid-Analytica™</h3>
                    <p className="text-[11px] font-bold text-slate-400">Tender probability simulation & statutory risk profile</p>
                  </div>
                </div>
                <button
                  onClick={() => setWinningProbabilityTender(null)}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6">

                {/* Top Summary Banner */}
                <div className="bg-slate-905 bg-slate-900/60 border border-slate-850 p-4 rounded-xl space-y-1.5 text-left">
                  <span className="text-[11px] font-mono font-black text-indigo-400 uppercase tracking-widest bg-indigo-950/70 border border-indigo-900/40 px-2.5 py-0.5 rounded-md">ID Match Detected</span>
                  <h4 className="text-xs font-black text-white leading-snug">
                    {winningProbabilityTender.packageDescription || winningProbabilityTender.briefDescription}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400 font-semibold font-sans pt-1">
                    <span>ID: <strong className="text-white font-mono">{winningProbabilityTender.id}</strong></span>
                    <span className="text-slate-700">•</span>
                    <span>Entity: <strong className="text-slate-300">{winningProbabilityTender.procuringEntity || winningProbabilityTender.organization}</strong></span>
                    <span className="text-slate-700">•</span>
                    <span>Method: <strong className="text-indigo-405 text-indigo-400 font-mono">{winningProbabilityTender.procurementMethod}</strong></span>
                  </div>
                </div>

                {/* Main Analysis Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                  {/* Left Column: Interactive Metric Gauge & Slider */}
                  <div className="lg:col-span-5 bg-slate-900/45 border border-slate-850 p-5 rounded-2xl text-center space-y-5 flex flex-col justify-between h-full">

                    {/* Gauge Ring */}
                    {(() => {
                      const analysis = calculateAiWinningProbability(winningProbabilityTender, tenderDiscount);
                      let strokeColor = "stroke-emerald-500";
                      let textColor = "text-emerald-400";
                      let bgGlow = "shadow-emerald-500/5 border-emerald-500/20";
                      let riskLabel = "EXCELLENT CHANCE";

                      if (analysis.overallRiskLevel === "Critical") {
                        strokeColor = "stroke-rose-650 stroke-rose-600";
                        textColor = "text-rose-500";
                        bgGlow = "shadow-rose-500/5 border-rose-500/20";
                        riskLabel = "SEVERE EXCLUSION RISK";
                      } else if (analysis.overallRiskLevel === "High") {
                        strokeColor = "stroke-amber-500";
                        textColor = "text-amber-400";
                        bgGlow = "shadow-amber-500/5 border-amber-500/20";
                        riskLabel = "SUBSTANTIAL RISK / LOW BID";
                      } else if (analysis.overallRiskLevel === "Medium") {
                        strokeColor = "stroke-indigo-500";
                        textColor = "text-indigo-400";
                        bgGlow = "shadow-indigo-500/5 border-indigo-500/20";
                        riskLabel = "MODERATE WIN CHANCE";
                      }

                      const radius = 64;
                      const circumference = 2 * Math.PI * radius;
                      const offset = circumference - (analysis.score / 100) * circumference;

                      return (
                        <div className="space-y-4">
                          <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90">
                              <circle
                                cx="88"
                                cy="88"
                                r={radius}
                                className="stroke-slate-800 fill-none"
                                strokeWidth="12"
                              />
                              <circle
                                cx="88"
                                cy="88"
                                r={radius}
                                className={`${strokeColor} fill-none transition-all duration-300 ease-out`}
                                strokeWidth="12"
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                                strokeLinecap="round"
                              />
                            </svg>

                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                              <span className={`text-[32px] font-black font-mono tracking-tight leading-none ${textColor}`}>
                                {analysis.score}%
                              </span>
                              <span className="text-[11px] font-bold font-mono text-slate-400 uppercase tracking-widest mt-1">WIN PROBABILITY</span>
                            </div>
                          </div>

                          <div className={`border p-2.5 rounded-xl bg-slate-950/40 text-center ${bgGlow} shadow-xs`}>
                            <span className="text-[10px] font-mono font-bold text-slate-500 block uppercase tracking-widest">CALCULATED COMPETITIVE STATE</span>
                            <strong className={`text-xs font-black block mt-0.5 tracking-tight ${textColor}`}>{riskLabel}</strong>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Interactive Proposed Bid Discount Slider */}
                    {(() => {
                      const isLtm = winningProbabilityTender.procurementMethod.toLowerCase().includes('ltm') || winningProbabilityTender.procurementMethod.toUpperCase().includes('LIMITED');
                      return (
                        <div className="text-left space-y-2.5 pt-2 border-t border-slate-850">
                          <div className="flex justify-between items-center text-[10.5px]">
                            <label className="font-bold text-slate-300">Proposed Bidding Discount</label>
                            <span className="text-indigo-400 font-black font-mono text-xs bg-indigo-950/40 border border-indigo-900/50 px-2 py-0.5 rounded-md">
                              -{tenderDiscount.toFixed(2)} %
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="15"
                            step="0.05"
                            value={tenderDiscount}
                            onChange={(e) => setTenderDiscount(parseFloat(e.target.value))}
                            className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                          />
                          <div className="flex justify-between text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider">
                            <span>0% (OFFICIAL RATE)</span>
                            <span>{isLtm ? "LTM LIMIT: 5.0%" : "OTM ALB LIMIT: 10.0%"}</span>
                            <span>15% MAX</span>
                          </div>

                          {/* Warnings */}
                          {isLtm && tenderDiscount > 5.0 && (
                            <div className="bg-rose-950/20 border border-rose-900/50 rounded-xl p-3 flex gap-2 text-rose-400 text-[10px] leading-relaxed font-sans">
                              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                              <div>
                                <strong className="font-bold block">Statutory Rule Infraction (Disqualification Alert)</strong>
                                Under e-GP LTM rules, public tenders strictly disqualify bids deviating by more than -5.00%. Adjust down to avoid system filtering.
                              </div>
                            </div>
                          )}

                          {!isLtm && tenderDiscount > 10.0 && (
                            <div className="bg-amber-950/20 border border-amber-900/50 rounded-xl p-3 flex gap-2 text-amber-400 text-[10px] leading-relaxed font-sans">
                              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                              <div>
                                <strong className="font-bold block">Abnormally Low Bid (ALB Review Warning)</strong>
                                Bidding higher than -10.00% discount on OTM works flags your submission for statutory Post-Qualification Audit.
                              </div>
                            </div>
                          )}

                          {!isLtm && tenderDiscount <= 10.0 && tenderDiscount >= 6.5 && (
                            <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-3 flex gap-2 text-emerald-400 text-[10px] leading-relaxed font-sans">
                              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" strokeWidth={2.5} />
                              <div>
                                <strong className="font-bold block">Optimal OTM Discount Window</strong>
                                Bidding analytics suggest robust win thresholds at {tenderDiscount}% deviation while protecting commercial margins.
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                  </div>

                  {/* Right Column: Complete Risk Assessment & Suggestions */}
                  {(() => {
                    const analysis = calculateAiWinningProbability(winningProbabilityTender, tenderDiscount);
                    return (
                      <div className="lg:col-span-7 space-y-4 text-left">

                        <h4 className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest border-b border-slate-850 pb-2 mb-1.5">AI statutory Risk Matrix factors</h4>

                        {/* Risk Factors Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">

                          {/* Procuring Entity Risk */}
                          <div className="bg-slate-900/40 border border-slate-850 p-3.5 rounded-xl space-y-1">
                            <span className="text-[10.5px] font-mono font-semibold text-slate-500 uppercase tracking-widest block">Entity Billing Velocity</span>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <span className={`text-[10.5px] font-black font-mono px-1.5 py-0.5 uppercase rounded ${analysis.procuringEntityRisk === "HIGH" ? "bg-rose-950 text-rose-400 border border-rose-900/55" : "bg-slate-950 text-slate-300 border border-slate-800"
                                }`}>
                                {analysis.procuringEntityRisk}
                              </span>
                              <strong className="text-white font-bold max-w-[120px] truncate">{winningProbabilityTender.organization}</strong>
                            </div>
                            <p className="text-[9.8px] text-slate-400 pt-1 font-sans leading-relaxed">
                              {winningProbabilityTender.organization.toUpperCase().includes("PWD")
                                ? "PWD Division contracts require extensive bill-verification buffers and strict quality logs audits."
                                : winningProbabilityTender.organization.toUpperCase().includes("RHD")
                                  ? "RHD payment cycles are linked directly to Capital development budgets."
                                  : "Standard LGED administrative speeds with typical local audit checkpoints."
                              }
                            </p>
                          </div>

                          {/* Competition Density */}
                          <div className="bg-slate-900/40 border border-slate-850 p-3.5 rounded-xl space-y-1">
                            <span className="text-[10.5px] font-mono font-semibold text-slate-500 uppercase tracking-widest block">Bidding Competitor Density</span>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <span className="text-[10.5px] font-black font-mono bg-slate-950 text-slate-300 border border-slate-800 px-1.5 py-0.5 rounded">
                                {winningProbabilityTender.procurementMethod.toUpperCase().includes("LTM") ? "LOW" : "HIGH"}
                              </span>
                              <strong className="text-white font-bold">Density Index</strong>
                            </div>
                            <p className="text-[9.8px] text-slate-400 pt-1 font-sans leading-relaxed">
                              {winningProbabilityTender.procurementMethod.toUpperCase().includes("LTM")
                                ? "LTM is restricted exclusively to enlisted bidders. Maximum competition is sealed under 10 entities."
                                : "OTM attracts extensive country-wide contractors. Peak bidding density is expected (18+ average offers)."
                              }
                            </p>
                          </div>

                          {/* Regional Cartel Index */}
                          <div className="bg-slate-900/40 border border-slate-850 p-3.5 rounded-xl space-y-1">
                            <span className="text-[10.5px] font-mono font-semibold text-slate-500 uppercase tracking-widest block">Regional Cartel Index</span>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <strong className="text-amber-400 font-extrabold font-mono text-[11px]">{analysis.collusionRiskIndex}</strong>
                            </div>
                            <p className="text-[9.8px] text-slate-400 pt-1 font-sans leading-relaxed">
                              Based on historical e-GP bidding cluster analysis of {winningProbabilityTender.district || winningProbabilityTender.procuringDistrict || "Capital District"} geographical distribution.
                            </p>
                          </div>

                          {/* Specs Compliance Difficulty */}
                          <div className="bg-slate-900/40 border border-slate-850 p-3.5 rounded-xl space-y-1">
                            <span className="text-[10.5px] font-mono font-semibold text-slate-500 uppercase tracking-widest block">Statutory Eligibility Barrier</span>
                            <div className="flex items-center gap-1.5 pt-0.5 font-bold">
                              <span className="text-[10.5px] font-black font-mono bg-slate-950 text-slate-300 border border-slate-800 px-1.5 py-0.5 rounded">
                                {analysis.specComplexityRisk}
                              </span>
                            </div>
                            <p className="text-[9.8px] text-slate-400 pt-1 font-sans leading-relaxed">
                              TDS specs demand a minimum general contractor experience of 3 years and verified prime contractor certificates.
                            </p>
                          </div>

                        </div>

                        {/* AI Bidding Strategy & Action Plan */}
                        <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-850 rounded-xl p-4 space-y-2 mt-4 text-slate-200">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-400" />
                            <h5 className="font-bold text-xs uppercase tracking-wide text-white">Recommended Bidding Action Plan</h5>
                          </div>
                          <p className="text-[10px] leading-relaxed font-sans text-slate-350">
                            {analysis.biddingStrategy} Ensure that your general turnover ledger documents include payment certificates corresponding to the last 3 financial fiscal years to withstand automated pre-qualification screenings.
                          </p>
                          <div className="pt-2 flex flex-wrap gap-2 text-[10px] font-mono font-bold uppercase">
                            <span className="bg-indigo-950/60 border border-indigo-900/40 text-indigo-300 px-2.5 py-1 rounded">Bid Security: Verified</span>
                            <span className="bg-indigo-950/60 border border-indigo-900/40 text-indigo-300 px-2.5 py-1 rounded">JV Association: Optional</span>
                            <span className="bg-indigo-950/60 border border-indigo-900/40 text-indigo-300 px-2.5 py-1 rounded">Turnover margin: Safe</span>
                          </div>
                        </div>

                      </div>
                    );
                  })()}

                </div>

              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-850 bg-slate-950 flex flex-col sm:flex-row justify-between items-center gap-3 sticky bottom-0 shrink-0 z-10 text-left">
                <span className="text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-widest">
                  Statutory analytics governed via Dorpotro e-GP Engine
                </span>
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const analysis = calculateAiWinningProbability(winningProbabilityTender, tenderDiscount);
                      const docText = `=========================================================
DORPOTRO AI CO-PILOT STATUTORY BIDDING REPORT
TENDER SPECIFICATIONS WINNING ASSESSMENT
=========================================================
Tender ID: ${winningProbabilityTender.id}
Procuring District: ${winningProbabilityTender.district || winningProbabilityTender.procuringDistrict || 'N/A'}
Organization: ${winningProbabilityTender.organization}
Procurement Category: ${winningProbabilityTender.category || 'N/A'}

PROPOSED BIDDING DEVIATION & MARGIN
Bidding Discount Margin: -${tenderDiscount.toFixed(2)}%
Win Probability Index: ${analysis.score}%
Overall Competitive Class: ${analysis.overallRiskLevel.toUpperCase()}

REGULATORY RISK ASSESSMENT INDEX
- PE Corporate Speed Risk: ${analysis.procuringEntityRisk}
- Competition Density Profile: ${analysis.competitionDensity}
- Regional Cartel Collusion Index: ${analysis.collusionRiskIndex}
- Specific Technical Spec Risk: ${analysis.specComplexityRisk}

PROCURING ENTITY & WORKS SPECIFIC RECOMMENDATION:
${analysis.biddingStrategy}

Report generated dynamically on: ${new Date().toLocaleString()}
`;
                      const blob = new Blob([docText], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `Tender_${winningProbabilityTender.id}_AI_Predictive_Report.txt`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                      showToast("Bidding Report downloaded successfully!", "success");
                    }}
                    className="w-full sm:w-auto bg-slate-850 hover:bg-slate-700 hover:text-white text-slate-200 border border-slate-800 px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wide cursor-pointer flex items-center justify-center gap-1.5 transition-all select-none"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    EXPORT TXT REPORT
                  </button>
                  <button
                    type="button"
                    onClick={() => setWinningProbabilityTender(null)}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold font-mono tracking-wide cursor-pointer transition-all border border-indigo-700 shadow-md hover:shadow-lg select-none h-9.5 flex items-center justify-center"
                  >
                    CLOSE ASSESSMENT
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
}
