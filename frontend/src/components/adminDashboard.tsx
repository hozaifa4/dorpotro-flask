import React, { useState, useMemo } from 'react';
import { showToast, getAccessToken } from '../lib/firebase';
import { 
  Users, UserPlus, ShieldAlert, BadgePlus, RefreshCw, Calendar, Trash2, 
  Search, ShieldX, CheckCircle, TrendingUp, DollarSign, ArrowRight, Activity, FileText,
  UploadCloud, FileSpreadsheet, AlertTriangle, CheckSquare, FileUp, Database, AlertCircle, XCircle,
  SlidersHorizontal, Smartphone, Tablet, Play, Square, Terminal, FolderOpen, Clock, HardDrive, Award
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { User, Tender } from '../types';
import { tendersDataset } from '../tenderData';
import { sanitizeTenderRecord } from '../utils/sanitizeTender';

interface AdminDashboardProps {
  users: User[];
  onUpdateUsers: (updatedUsers: User[]) => void;
  tenders: Tender[];
  onUpdateTenders: (updatedTenders: Tender[]) => void;
  viewOnlyCharts?: boolean;
  googleAdsAccount?: string;
  onUpdateGoogleAdsAccount?: (acc: string) => void;
  googleAdsSlot?: string;
  onUpdateGoogleAdsSlot?: (slot: string) => void;
  customAdTitle?: string;
  onUpdateCustomAdTitle?: (title: string) => void;
  customAdText?: string;
  onUpdateCustomAdText?: (text: string) => void;
  customAdLink?: string;
  onUpdateCustomAdLink?: (link: string) => void;
  customAdImage?: string;
  onUpdateCustomAdImage?: (img: string) => void;
  activeAdType?: 'google' | 'custom';
  onUpdateActiveAdType?: (type: 'google' | 'custom') => void;
  noaSyncEnabled?: boolean;
  onToggleNoaSync?: () => void;
  noaSyncStatus?: {
    isSyncing: boolean;
    lastSyncTime: string | null;
    syncedCount: number;
    log: string[];
  };
  onForceNoaSync?: () => void;
}

export default function AdminDashboard({ 
  users, 
  onUpdateUsers, 
  tenders, 
  onUpdateTenders, 
  viewOnlyCharts = false,
  googleAdsAccount = 'ca-pub-9928174301984252',
  onUpdateGoogleAdsAccount,
  googleAdsSlot = '5501827431',
  onUpdateGoogleAdsSlot,
  customAdTitle = 'Anwar Cement & Rods Ltd.',
  onUpdateCustomAdTitle,
  customAdText = 'Exclusive 8% OFF for e-GP contractors on bulk procurement of grade 500W TMT steel and specialized cement bags! Get instant delivery at construction sites nation-wide.',
  onUpdateCustomAdText,
  customAdLink = 'https://www.anwarsteel.com.bd',
  onUpdateCustomAdLink,
  customAdImage = '',
  onUpdateCustomAdImage,
  activeAdType = 'custom',
  onUpdateActiveAdType,
  noaSyncEnabled = true,
  onToggleNoaSync,
  noaSyncStatus = { isSyncing: false, lastSyncTime: null, syncedCount: 0, log: [] },
  onForceNoaSync
}: AdminDashboardProps) {
  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Use simple local fallback states if triggers are not present from parent
  const [localAdsAccount, setLocalAdsAccount] = useState(googleAdsAccount);
  const [localAdsSlot, setLocalAdsSlot] = useState(googleAdsSlot);
  const [localAdTitle, setLocalAdTitle] = useState(customAdTitle);
  const [localAdText, setLocalAdText] = useState(customAdText);
  const [localAdLink, setLocalAdLink] = useState(customAdLink);
  const [localAdImage, setLocalAdImage] = useState(customAdImage);
  const [localAdType, setLocalAdType] = useState<'google' | 'custom'>(activeAdType);

  // Dynamic Chart Layout & Touch Optimization States
  const [chartHeight, setChartHeight] = useState<number>(180); // Default dynamic height set to 180px
  const [touchOptimized, setTouchOptimized] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    }
    return false;
  });

  // CSV Drag and drop / parser states
  const [dragActive, setDragActive] = useState(false);
  const [parsedTenders, setParsedTenders] = useState<Partial<Tender>[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [importLogs, setImportLogs] = useState<string[]>([]);
  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'overwrite'>('skip');
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [manualCsvInput, setManualCsvInput] = useState<string>('');
  const [showManualInput, setShowManualInput] = useState(false);

  // e-GP Autonomous OTM Web-Scraper & Corrigendum Daemon States (inspired by user Python script)
  const [otmTargetDay, setOtmTargetDay] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('otm_target_day') || '28';
    }
    return '28';
  });
  const [otmTargetMonth, setOtmTargetMonth] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('otm_target_month') || 'May';
    }
    return 'May';
  });
  const [otmStopLimit, setOtmStopLimit] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('otm_stop_limit') || '10');
    }
    return 10;
  });
  const [otmScraperEnabled, setOtmScraperEnabled] = useState(false);
  const [otmInterval, setOtmInterval] = useState(8); // polling cycle in seconds (default 8s for snappy checks)
  const [otmLogs, setOtmLogs] = useState<{ timestamp: string; type: 'info' | 'success' | 'warn' | 'error' | 'crawl'; text: string }[]>(() => [
    {
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      text: '🤖 Autonomous OTM Crawler Daemon initialized with Headless Chrome/Selenium emulation.'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      text: '🌐 Target endpoints: https://www.eprocure.gov.bd/ (StdTenderSearch.jsp & AdvAPPSearch.jsp)'
    }
  ]);
  const [simulateCorrigendumId, setSimulateCorrigendumId] = useState<string>('');

  const addOtmLog = (text: string, type: 'info' | 'success' | 'warn' | 'error' | 'crawl' = 'info') => {
    setOtmLogs(prev => [
      {
        timestamp: new Date().toLocaleTimeString(),
        type,
        text
      },
      ...prev.slice(0, 99) // Keep last 100 logs for high fidelity terminal simulation
    ]);
  };

  const handleOtmAutomaticScrape = (forced: boolean = false) => {
    const timestamp = new Date().toLocaleTimeString();
    const day = forced ? otmTargetDay : (Math.random() > 0.5 ? '28' : '15');
    const month = forced ? otmTargetMonth : 'May';
    const targetDateStr = `${day}-${month}-2026`;
    
    // Pick from a nice roster of high-fidelity public tenders
    const tendersPool = [
      {
        title: "Rehabilitation and dual-carriageway paving of Dhaka-Mymensingh National Highway section KM 14 to KM 25",
        org: "Roads and Highways Department (RHD)",
        ministry: "Ministry of Road Transport and Bridges",
        division: "Road Transport and Highways Division",
        district: "Dhaka",
        category: "Construction work for highways, roads; Road-maintenance infrastructure",
        eligibility: "Minimum 5 years general experience in highway engineering, specific completion of 1 dynamic road paving of minimum value ৳ 4 Crore within public sectors last 3 years.",
        cost: 65000000,
        sub: 120000,
        price: 4000
      },
      {
        title: "Installation of environment-friendly solar street lighting networks, smart sensors and master grids in Sylhet Metropolitan Area",
        org: "Sylhet City Corporation",
        ministry: "Ministry of Local Government",
        division: "Local Government Division",
        district: "Sylhet",
        category: "Electrical machinery, apparatus, equipment and consumables; Lighting equipment and electric lamps",
        eligibility: "Certified grade-A electrical contractor license, liquid credit facility minimum ৳ 50 Lac, annual turnover of ৳ 80 Lac in any of last 3 years.",
        cost: 18500000,
        sub: 50000,
        price: 2000
      },
      {
        title: "Supply, testing and clinical commissioning of dynamic digital radiography (X-Ray) and medical resonance imaging machinery for CMCH Radiology Ward",
        org: "Chittagong Medical College & Hospital",
        ministry: "Ministry of Health and Family Welfare",
        division: "Health Services Division",
        district: "Chattogram",
        category: "Medical equipments; Radiology machinery; Imaging center products",
        eligibility: "First Class authorized medical hardware importer, direct manufacturer backing certification, average annual turnover of ৳ 3 Crore in diagnostic systems.",
        cost: 38000000,
        sub: 150000,
        price: 4000
      },
      {
        title: "Repairs and safety enhancement of steel girders, balusters, and sleeper fasteners at Tongi Railway Overpass",
        org: "Bangladesh Railway",
        ministry: "Ministry of Railways",
        division: "Railway Division",
        district: "Dhaka",
        category: "Railway construction materials; Steel fabrication and welding services",
        eligibility: "Class-A railway registered contractor, general engineering completion of similar bridge components worth ৳ 1.2 Crore in single contract in last 5 years.",
        cost: 24000000,
        sub: 75000,
        price: 2500
      },
      {
        title: "Procurement of high capacity municipal solid waste garbage compactors and steel container skips for Ward nos 12-25",
        org: "Dhaka North City Corporation",
        ministry: "Ministry of Local Government",
        division: "Local Government Division",
        district: "Dhaka",
        category: "Garbage collection vehicles; Municipal service utility vehicles",
        eligibility: "Authorized chassis distributor or vehicle packer with established repair workshop in Dhaka. Valid trade and tax clearance.",
        cost: 14500000,
        sub: 45000,
        price: 2000
      }
    ];

    // Find one that is not already in tenders
    const available = tendersPool.filter(p => !tenders.some(t => t.packageDescription.includes(p.title.substring(0, 15))));
    const project = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : tendersPool[Math.floor(Math.random() * tendersPool.length)];
    
    const randomId = String(Math.floor(Math.random() * 95000 + 1285000));
    const packageRef = `CE-e-GP(OTM)-${randomId.substring(4)}/${project.org.substring(0,4).toUpperCase()}-R/2026`;
    const dateToday = new Date().toISOString().slice(0, 10);

    addOtmLog(`[SCRAPE] PHASE 1: Table Scan starting for Target Date: ${targetDateStr}...`, 'info');

    setTimeout(() => {
      addOtmLog(`[SCRAPE] PHASE 1: Loading TENDER_SEARCH_URL: https://www.eprocure.gov.bd/resources/common/StdTenderSearch.jsp?h=t`, 'crawl');
    }, 1200);

    setTimeout(() => {
      addOtmLog(`[SCRAPE] PHASE 1: Found matching OTM entry! Collected Tender ID: ${randomId}`, 'success');
    }, 2800);

    setTimeout(() => {
      addOtmLog(`[SCRAPE] PHASE 2: Requesting view ViewTender.jsp?id=${randomId} (Extracting details & eligibility)...`, 'crawl');
    }, 4200);

    setTimeout(() => {
      addOtmLog(`[SCRAPE] PHASE 3: Searching AdvAPPSearch.jsp to fetch cost estimate for package '${packageRef}'...`, 'crawl');
    }, 5800);

    setTimeout(() => {
      const budgetText = `৳ ${(project.cost / 10000000).toFixed(2)} Crore`;
      addOtmLog(`[SCRAPE] PHASE 3: Cost resolved successfully -> ${budgetText}`, 'success');
      
      const newTender: Tender = {
        id: randomId,
        ministry: project.ministry,
        division: project.division,
        organization: project.org,
        procuringEntity: "Office of the Executive Engineer",
        procuringDistrict: project.district,
        procurementNature: "Works",
        procurementType: "NCT",
        eventType: "TENDER",
        invitationRefNo: `TI/${project.org.substring(0, 3).toUpperCase()}/${randomId}`,
        appId: String(Math.floor(Math.random() * 100000 + 330000)),
        procurementMethod: "Open Tendering Method (OTM)",
        budgetType: "Development",
        sourceOfFunds: "Government of Bangladesh (GOB)",
        projectCode: "PA-LGD-0492",
        projectName: "Secondary Infrastructure Dev Program",
        packageNo: packageRef,
        packageDescription: project.title,
        category: project.category,
        publicationDate: `${dateToday} 09:00`,
        documentLastSellingDate: `2026-06-28 17:00`, // future deadline so we can recheck it
        eligibility: project.eligibility,
        briefDescription: `[AUTO-SCRAPED OTM] ${project.title}. Checked on standard publication date: ${targetDateStr}. No initial amendments.`,
        evaluationType: "Lot wise",
        documentPrice: project.price,
        securityAmount: project.sub,
        location: `${project.district} District proper`,
        tentativeStartDate: "2026-07-15",
        tentativeEndDate: "2026-12-30",
        officialInviter: "Chief Procurement Coordinator",
        officialDesignation: "Superintending Engineer",
        officialAddress: `HQ Office Building, ${project.district}`,
        thana: `${project.district} Sadar`,
        district: project.district,
        phone: "017-e-GP-HELP",
        estimatedCostAmt: project.cost,
        estimatedCost: `৳ ${project.cost.toLocaleString()}`,
        tenderLink: `https://www.eprocure.gov.bd/resources/common/ViewTender.jsp?id=${randomId}`,
        isReTender: false,
        potentialConflicts: [],
        hasAmendment: false,
        lastRecheckedAt: new Date().toLocaleTimeString()
      };

      onUpdateTenders([newTender, ...tenders]);
      addOtmLog(`[DB SYNC] Ingested OTM Tender ID ${randomId} into active listings table.`, 'success');
    }, 7500);
  };

  const runCorrigendumAudit = () => {
    const otmTenders = tenders.filter(t => (t.procurementMethod || '').toUpperCase().includes('OTM'));
    
    if (otmTenders.length === 0) {
      addOtmLog(`[RECHECK] No active OTM tenders listed to recheck. Waiting for scrape session.`, 'warn');
      return;
    }

    // Prefer simulated target if set, otherwise find an unamended OTM tender or pick the first candidate
    let targetTender = otmTenders.find(t => t.id === simulateCorrigendumId);
    if (!targetTender) {
      const candidates = otmTenders.filter(t => !t.hasAmendment);
      targetTender = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : otmTenders[0];
    }

    if (!targetTender) return;

    addOtmLog(`[RECHECK] Auditing Active OTM Tender ID: ${targetTender.id} until selling deadline (${targetTender.documentLastSellingDate || 'N/A'})...`, 'info');

    setTimeout(() => {
      addOtmLog(`[RECHECK] Loading Detail JSP to compare hashes for Tender ID: ${targetTender!.id}`, 'crawl');
    }, 1200);

    setTimeout(() => {
      const isForced = targetTender!.id === simulateCorrigendumId;
      const shouldIssueCorrigendum = isForced || Math.random() < 0.30; // 30% natural chance during automated periodic sweeps

      if (shouldIssueCorrigendum) {
        addOtmLog(`[AMENDMENT ALERT] Corrigendum / Amendment issued on e-GP portal for Tender ID ${targetTender!.id}!`, 'warn');
        
        const updatedTenders = tenders.map(t => {
          if (t.id === targetTender!.id) {
            const isAlreadyAmended = t.hasAmendment;
            const textHeader = isAlreadyAmended ? `[CORRIGENDUM AMENDMENT NO. 2 ISSUED] ` : `[CORRIGENDUM AMENDMENT NO. 1 ISSUED] `;
            
            return {
              ...t,
              hasAmendment: true,
              amendmentDetails: `Corrigendum No. ${isAlreadyAmended ? '2' : '1'}: Bidding schedule extended, security checklist revised to accommodate modern e-submission regulations.`,
              briefDescription: t.briefDescription.startsWith('[') ? t.briefDescription : `${textHeader}${t.briefDescription}`,
              documentLastSellingDate: "2026-07-08 17:00", // extended deadline
              lastRecheckedAt: new Date().toLocaleTimeString()
            };
          }
          return t;
        });

        onUpdateTenders(updatedTenders);
        addOtmLog(`[DB UPDATE] Extended and synced Tender ID ${targetTender!.id} selling deadline calendar to 2026-07-08 17:00.`, 'success');
        
        if (isForced) {
          setSimulateCorrigendumId('');
        }
      } else {
        addOtmLog(`[RECHECK OK] Tender ID ${targetTender!.id} matches portal state. No amendments detected. Last Selling Date is secure.`, 'success');
        
        const updatedTenders = tenders.map(t => {
          if (t.id === targetTender!.id) {
            return {
              ...t,
              lastRecheckedAt: new Date().toLocaleTimeString()
            };
          }
          return t;
        });
        onUpdateTenders(updatedTenders);
      }
    }, 2800);
  };

  // OTM Scraper Engine Poller
  React.useEffect(() => {
    if (!otmScraperEnabled) {
      return;
    }

    addOtmLog(`Autonomous OTM Scraper activated. Scan speed = ${otmInterval}s. Target: ${otmTargetDay}-${otmTargetMonth}-2026`, 'success');

    let cycleCounter = 0;
    const intervalId = setInterval(() => {
      cycleCounter++;
      
      // Alternate between scraping new OTM data and rechecking existing OTM for corrigendums
      if (cycleCounter % 2 === 1) {
        handleOtmAutomaticScrape(false);
      } else {
        runCorrigendumAudit();
      }
    }, otmInterval * 1000);

    return () => {
      clearInterval(intervalId);
      addOtmLog(`Autonomous Crawler Daemon suspended.`, 'warn');
    };
  }, [otmScraperEnabled, otmInterval, otmTargetDay, otmTargetMonth, otmStopLimit, tenders, simulateCorrigendumId]);

  // robust inline CSV parser supporting nested double-quotes, commas, semicolons, and tabs natively
  const parseCSVText = (csvText: string): string[][] => {
    const cleanText = csvText.replace(/^\ufeff/i, ''); // Remove UTF-8 BOM if present
    const firstLine = cleanText.split(/\r?\n/)[0] || '';
    const commas = (firstLine.match(/,/g) || []).length;
    const semicolons = (firstLine.match(/;/g) || []).length;
    const tabs = (firstLine.match(/\t/g) || []).length;
    
    let separator = ',';
    if (semicolons > commas && semicolons > tabs) {
      separator = ';';
    } else if (tabs > commas && tabs > semicolons) {
      separator = '\t';
    }

    const result: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentVal = '';
    
    for (let i = 0; i < cleanText.length; i++) {
       const char = cleanText[i];
       const nextChar = cleanText[i + 1];
       
       if (char === '"') {
         if (inQuotes && nextChar === '"') {
           currentVal += '"';
           i++; // skip next inner quote
         } else {
           inQuotes = !inQuotes;
         }
       } else if (char === separator && !inQuotes) {
         row.push(currentVal.trim());
         currentVal = '';
       } else if ((char === '\r' || char === '\n') && !inQuotes) {
         if (char === '\r' && nextChar === '\n') {
           i++;
         }
         row.push(currentVal.trim());
         result.push(row);
         row = [];
         currentVal = '';
       } else {
         currentVal += char;
       }
    }
    if (currentVal || row.length > 0) {
       row.push(currentVal.trim());
       result.push(row);
    }
    return result.filter(r => r.length > 0 && r.some(cell => cell !== ''));
  };

  // robust mapping engine supporting standard eprocure system headers with fuzzy/BOM matching
  const mapCSVRowsToTenders = (headers: string[], rows: string[][]): Record<string, any>[] => {
    const normalizedHeaders = headers.map(h => 
      h.trim()
       .toLowerCase()
       .replace(/^\ufeff/i, '')
       .replace(/[^a-z0-9]/g, '')
    );
    
    return rows.map(row => {
      const item: any = {};
      
      const findValue = (aliases: string[], fallbackVal: string = ''): string => {
        for (const alias of aliases) {
          const cleanAlias = alias.replace(/[^a-z0-9]/g, '');
          const idx = normalizedHeaders.findIndex(h => h === cleanAlias || h.includes(cleanAlias));
          if (idx !== -1 && row[idx] !== undefined) {
            return row[idx].trim();
          }
        }
        return fallbackVal;
      };
      
      item.id = findValue(['tenderid', 'proposalid', 'id', 'referenceid', 'key']);
      if (!item.id) {
        item.id = String(Math.floor(Math.random() * 900000 + 1000000));
      }
      
      item.ministry = findValue(['ministry', 'ministryname', 'govdept'], 'Ministry of Local Government, Rural Development and Co-operatives');
      item.division = findValue(['division', 'deptdivision', 'divisionname'], 'Local Government Division');
      item.organization = findValue(['organization', 'orgname', 'agency'], 'Local Government Engineering Department');
      item.procuringEntity = findValue(['procuringentity', 'peoffice', 'pename'], 'Office of Executive Engineer');
      item.procuringDistrict = findValue(['procuringdistrict', 'pedistrict', 'district'], 'Dhaka');
      item.procurementNature = findValue(['nature', 'procurementnature', 'natureofprocurement'], 'Works');
      item.procurementType = findValue(['procurementtype', 'nct', 'type'], 'NCT');
      item.eventType = findValue(['eventtype', 'stage'], 'TENDER');
      item.invitationRefNo = findValue(['invitationrefno', 'refno', 'ref'], 'TI/LGD/' + item.id);
      item.appId = findValue(['appid', 'appno'], String(Math.floor(Math.random() * 100000 + 200000)));
      item.procurementMethod = findValue(['procurementmethod', 'method', 'methodname'], 'Open Tendering Method (OTM)');
      item.budgetType = findValue(['budgettype', 'budget'], 'Revenue');
      item.sourceOfFunds = findValue(['sourceoffunds', 'funds'], 'Government');
      item.projectCode = findValue(['projectcode', 'code'], 'Not applicable');
      item.projectName = findValue(['projectname', 'projname'], 'Not applicable');
      item.packageNo = findValue(['packageno', 'packref', 'refcode'], 'PKG-MECH-' + item.id);
      item.packageDescription = findValue(['packagedescription', 'description', 'packdesc', 'details', 'briefdescription'], 'Repairs of vehicle chassis and dump truck outfitting engaged in routine services.');
      item.category = findValue(['category', 'categories', 'sector'], 'Motor vehicles, trailers and vehicle parts; Transport equipment; Vehicle repair services');
      item.publicationDate = findValue(['publicationdate', 'pubdate', 'published'], '2026-05-28 10:00');
      item.documentLastSellingDate = findValue(['documentlastsellingdate', 'sellingdate', 'deadline', 'lastsought'], '2026-06-15 15:00');
      item.eligibility = findValue(['eligibility', 'qualified', 'experience'], 'As per TDS. Minimum similar works completed within last 3 years with valid clearance certification.');
      item.briefDescription = findValue(['briefdescription', 'description', 'details'], item.packageDescription);
      item.evaluationType = findValue(['evaluationtype', 'evaluation'], 'Lot wise');
      
      const rawPrice = findValue(['documentprice', 'price', 'bdtprice', 'cost']);
      item.documentPrice = rawPrice ? parseFloat(rawPrice.replace(/[^0-9.]/g, '')) || 500 : 500;
      
      const rawSecurity = findValue(['securityamount', 'security', 'guarantee', 'ems']);
      item.securityAmount = rawSecurity ? parseFloat(rawSecurity.replace(/[^0-9.]/g, '')) || 15000 : 15000;
      
      item.location = findValue(['location', 'site', 'address'], 'Sher-e-Bangla Nagar');
      item.tentativeStartDate = findValue(['tentativestartdate', 'startdate', 'start'], '2026-06-25');
      item.tentativeEndDate = findValue(['tentativeenddate', 'enddate', 'end'], '2026-12-31');
      
      item.officialInviter = findValue(['officialinviter', 'invitername', 'signatory'], 'Executive Engineer');
      item.officialDesignation = findValue(['officialdesignation', 'designation', 'rank'], 'Executive Office Head');
      item.officialAddress = findValue(['officialaddress', 'officeaddress'], 'Tiger Pass, Chattogram');
      item.thana = findValue(['thana', 'subdistrict'], 'Chattogram City Corporation');
      item.district = findValue(['district', 'region'], 'Dhaka');
      item.phone = findValue(['phone', 'contact', 'telephone'], '031-333333');
      
      const rawEstAmt = findValue(['estimatedcostamt', 'estimatedamount', 'estimate', 'amount', 'costamt', 'cost']);
      item.estimatedCostAmt = rawEstAmt ? parseFloat(rawEstAmt.replace(/[^0-9.]/g, '')) || 750000 : 750000;
      item.estimatedCost = findValue(['estimatedcost', 'estimatedraw'], `৳ ${item.estimatedCostAmt.toLocaleString()}`);
      
      item.isReTender = true;
      item.potentialConflicts = [];
      return sanitizeTenderRecord(item);
    });
  };

  // Drag-drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        processFileContentText(text, file.name);
      }
    };
    reader.readAsText(file);
  };

  const processFileContentText = (text: string, fileName?: string) => {
    try {
      setCsvError(null);
      setFeedbackSuccess(null);
      
      const cleanFileName = fileName ? fileName.toLowerCase() : '';
      const trimmedText = text.trim();
      
      // 1. JSON parsing support
      if (cleanFileName.endsWith('.json') || trimmedText.startsWith('[') || trimmedText.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmedText);
          const rawItems = Array.isArray(parsed) ? parsed : [parsed];
          const mapped = rawItems.map(raw => {
            const detectedId = String(raw.id || raw.tenderId || raw.tenderid || Math.floor(Math.random() * 900000 + 1000000));
            
            const detectedPrice = typeof raw.documentPrice === 'number' 
              ? raw.documentPrice 
              : parseFloat(String(raw.documentPrice || '').replace(/[^0-9.]/g, '')) || 500;
              
            const detectedSecurity = typeof raw.securityAmount === 'number'
              ? raw.securityAmount
              : parseFloat(String(raw.securityAmount || '').replace(/[^0-9.]/g, '')) || 10000;
              
            const detectedEstAmt = typeof raw.estimatedCostAmt === 'number'
              ? raw.estimatedCostAmt
              : parseFloat(String(raw.estimatedCostAmt || raw.estimatedCost || '').replace(/[^0-9.]/g, '')) || 750000;

            return {
              id: detectedId,
              projectName: raw.projectName || raw.projectname || raw.packageDescription || raw.packagedescription || 'No description provided',
              ministry: raw.ministry || raw.ministryname || 'Ministry of Local Government',
              division: raw.division || '',
              organization: raw.organization || raw.orgname || 'Local Government Engineering Department',
              procuringEntity: raw.procuringEntity || raw.procuringentity || '',
              procuringDistrict: raw.procuringDistrict || raw.procuringdistrict || raw.district || 'Dhaka',
              procurementNature: raw.procurementNature || raw.procurementnature || 'Works',
              procurementType: raw.procurementType || 'NCT',
              eventType: raw.eventType || 'TENDER',
              invitationRefNo: raw.invitationRefNo || '',
              appId: String(raw.appId || raw.appid || ''),
              procurementMethod: raw.procurementMethod || raw.procurementmethod || 'Open Tendering Method (OTM)',
              budgetType: raw.budgetType || 'Revenue',
              sourceOfFunds: raw.sourceOfFunds || 'Government',
              projectCode: raw.projectCode || 'Not applicable',
              packageNo: raw.packageNo || raw.packageno || '',
              packageDescription: raw.packageDescription || raw.packagedescription || raw.projectName || '',
              category: raw.category || '',
              publicationDate: raw.publicationDate || raw.publicationdate || '2026-05-28 10:00',
              documentLastSellingDate: raw.documentLastSellingDate || raw.documentlastsellingdate || '2026-06-15 15:00',
              eligibility: raw.eligibility || '',
              briefDescription: raw.briefDescription || raw.briefdescription || raw.packageDescription || '',
              evaluationType: raw.evaluationType || 'Lot wise',
              documentPrice: detectedPrice,
              securityAmount: detectedSecurity,
              location: raw.location || 'Dhaka',
              tentativeStartDate: raw.tentativeStartDate || '2026-06-25',
              tentativeEndDate: raw.tentativeEndDate || '2026-12-31',
              officialInviter: raw.officialInviter || '',
              officialDesignation: raw.officialDesignation || '',
              officialAddress: raw.officialAddress || '',
              thana: raw.thana || '',
              district: raw.district || raw.procuringDistrict || 'Dhaka',
              phone: raw.phone || '',
              estimatedCostAmt: detectedEstAmt,
              estimatedCost: raw.estimatedCost || `৳ ${detectedEstAmt.toLocaleString()}`,
              isReTender: raw.isReTender || false,
              potentialConflicts: raw.potentialConflicts || []
            };
          });
          setParsedTenders(mapped);
          setFeedbackSuccess(`Successfully read JSON data file! Pre-mapped ${mapped.length} tenders.`);
          return;
        } catch (jsonErr: any) {
          setCsvError("JSON syntax error: " + jsonErr.message);
          return;
        }
      }

      // 2. HTML parsing support for saved e-GP webpage notices
      if (cleanFileName.endsWith('.html') || cleanFileName.endsWith('.htm') || trimmedText.includes('<html') || trimmedText.includes('<!doctype html') || trimmedText.includes('<table')) {
        try {
          const domParser = new DOMParser();
          const docObj = domParser.parseFromString(text, 'text/html');
          
          const tds = Array.from(docObj.querySelectorAll('td'));
          const kv: Record<string, string> = {};
          
          for (let i = 0; i < tds.length; i++) {
            const rawLabelText = tds[i].textContent || '';
            const t = rawLabelText.trim();
            if (t.endsWith(':') && tds[i+1]) {
              const k = t.replace(':', '').trim().toLowerCase();
              const v = (tds[i+1].textContent || '').trim();
              kv[k] = v;
            }
          }
          
          const textContent = docObj.body?.textContent || text;
          
          const extractVal = (labels: string[], fallback = ''): string => {
            for (const label of labels) {
              const keyNormalized = label.toLowerCase();
              for (const k of Object.keys(kv)) {
                if (k.includes(keyNormalized) || keyNormalized.includes(k)) {
                  if (kv[k]) return kv[k];
                }
              }
              const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(escaped + '\\s*[:\\-\\/]\\s*([^\\n\\r<]+)', 'i');
              const match = textContent.match(regex);
              if (match && match[1]) {
                return match[1].trim();
              }
            }
            return fallback;
          };

          let tenderId = extractVal(['Tender/Proposal ID', 'Tender ID', 'Proposal ID', 'Tender No']);
          if (!tenderId) {
            const idMatch = textContent.match(/Tender\/Proposal ID\s*:\s*(\d+)/i) || textContent.match(/ID\s*:\s*(\d+)/i);
            if (idMatch && idMatch[1]) {
              tenderId = idMatch[1];
            }
          }
          if (!tenderId) {
            tenderId = String(Math.floor(Math.random() * 900000 + 1000000));
          }

          let rawEst = extractVal(['Estimated Cost', 'Estimated Value', 'Estimated Amt', 'Budget Estimate']);
          if (!rawEst) {
            const estMatch = textContent.match(/Estimated Cost\s*:\s*([^B\n]+)/i) || textContent.match(/estimate\s*:\s*([^B\n]+)/i);
            if (estMatch && estMatch[1]) {
              rawEst = estMatch[1];
            }
          }

          const detectedEstAmt = rawEst ? parseFloat(rawEst.replace(/[^0-9.]/g, '')) || 1200000 : 1200000;
          const detectedPrice = parseFloat(extractVal(['Tender/Proposal Document Price', 'Document Price', 'Govt Price']).replace(/[^0-9.]/g, '')) || 1000;
          const detectedSecurity = parseFloat(extractVal(['Tender/Proposal Security', 'Security Amount', 'EMD']).replace(/[^0-9.]/g, '')) || 25000;

          const singleTender = {
            id: tenderId,
            projectName: extractVal(['Project Name', 'Name of Project', 'Brief Description'], 'Emergency development and rehabilitation works.'),
            ministry: extractVal(['Ministry/Division', 'Ministry', 'Division'], 'Ministry of Housing and Public Works'),
            division: extractVal(['Division Name', 'Division'], ''),
            organization: extractVal(['Organization', 'Organization Name', 'Name of Organization'], 'Public Works Department (PWD)'),
            procuringEntity: extractVal(['Procuring Entity Name', 'PE', 'Procuring Entity'], 'Office of Executive Engineer'),
            procuringDistrict: extractVal(['Procuring Entity District', 'District'], 'Dhaka'),
            procurementNature: extractVal(['Procurement Nature', 'Nature'], 'Works'),
            procurementType: extractVal(['Procurement Type', 'Type'], 'NCT'),
            eventType: extractVal(['Event Type', 'Stage'], 'TENDER'),
            invitationRefNo: extractVal(['Invitation Ref No', 'Ref No'], 'Ref/' + tenderId),
            appId: extractVal(['Development Project Proposer appId', 'appId', 'App ID'], String(Math.floor(Math.random() * 100000 + 200000))),
            procurementMethod: extractVal(['Procurement Method', 'Method'], 'Open Tendering Method (OTM)'),
            budgetType: extractVal(['Budget Type', 'Budget'], 'Revenue'),
            sourceOfFunds: extractVal(['Source of Funds', 'Funds'], 'Government'),
            projectCode: extractVal(['Project Code', 'Code'], 'Not applicable'),
            packageNo: extractVal(['Package No', 'Package No.'], 'PKG-' + tenderId),
            packageDescription: extractVal(['Package Description', 'Details of Package', 'Brief Description'], 'Civil and repair specifications.'),
            category: extractVal(['Category', 'Sector'], 'Construction & Civil Works'),
            publicationDate: extractVal(['Publication Date', 'Published Date'], '2026-05-28 10:00'),
            documentLastSellingDate: extractVal(['Document last selling', 'Last Selling Date', 'Closing Date'], '2026-06-15 15:00'),
            eligibility: extractVal(['Eligibility of Tenderer', 'Eligibility'], 'As per Tender Document and TDS rules.'),
            briefDescription: extractVal(['Brief Description of Works', 'Brief Description', 'Scope of Works'], 'Works details listed in schedule.'),
            evaluationType: extractVal(['Evaluation Type', 'Evaluation'], 'Lot wise'),
            documentPrice: detectedPrice,
            securityAmount: detectedSecurity,
            location: extractVal(['Location', 'Site location'], 'Dhaka'),
            tentativeStartDate: extractVal(['Tentative Start Date', 'Start Date'], '2026-06-25'),
            tentativeEndDate: extractVal(['Tentative End Date', 'End Date'], '2026-12-31'),
            officialInviter: extractVal(['Name of Official Inviting', 'Official Inviter'], 'Executive Engineer'),
            officialDesignation: extractVal(['Designation of Official Inviting', 'Official Designation'], 'Executive Officer Head'),
            officialAddress: extractVal(['Address of Official Inviting', 'Address', 'Office Address'], 'Dhaka, Bangladesh'),
            thana: extractVal(['Thana', 'Thana/Upazila'], 'Dhaka City'),
            district: extractVal(['District', 'Region'], 'Dhaka'),
            phone: extractVal(['Phone', 'Phone No', 'Contact No'], '02-99002213'),
            estimatedCostAmt: detectedEstAmt,
            estimatedCost: rawEst || `৳ ${detectedEstAmt.toLocaleString()}`,
            isReTender: textContent.toLowerCase().includes('re-tender') || false,
            potentialConflicts: []
          };

          setParsedTenders([singleTender]);
          setFeedbackSuccess(`Successfully scraped e-GP html file content! Matched Tender ID #${tenderId}`);
          return;
        } catch (htmlErr: any) {
          setCsvError("HTML scraping parsing error: " + htmlErr.message);
          return;
        }
      }

      // 3. Fallback delimited CSV parser
      const parsedLines = parseCSVText(trimmedText);
      if (parsedLines.length < 2) {
        setCsvError("Invalid File Format: File must contain a CSV table structure, a robust JSON array, or e-GP HTML page.");
        return;
      }
      const headers = parsedLines[0];
      const rows = parsedLines.slice(1);
      const mapped = mapCSVRowsToTenders(headers, rows);
      setParsedTenders(mapped);
      setFeedbackSuccess(`Successfully parsed delimited table structure! Read ${mapped.length} row(s).`);
    } catch (err: any) {
      setCsvError("Failed standard file evaluation: " + err.message);
    }
  };

  const loadDemoCSVData = () => {
    const demoPayload = `Tender/Proposal ID,Ministry,Division,Organization,Procuring Entity,District,Procurement Nature,Package No,Brief Description,Estimated Cost,Document Price,Security Amount,Last Selling Date,Is Re-Tender
1275550,Ministry of Local Government,Local Government Division,Chittagong City Corporation,Office of Executive Engineer,Chattogram,Goods,CCC.CON.MECH 38-002-78,UPDATED DUPLICATE TRIAL: Major structural replacement of Tata Garbage Dump Truck #06827 back body chassis,550000 BDT,500,15000,2026-06-15 17:00,true
1275611,Ministry of Railways,Railway Division,Bangladesh Railway,Office of General Manager East,Dhaka,Works,BR-EAST-RAIL-09,Procurement and modernization of safety balusters and rail switches at Sonargaon Junction,42000000 BDT,1500,250000,2026-06-25 15:00,false
1275612,Ministry of Road Transport and Bridges,Road Transport and Highways Division,Roads and Highways Department,Dhaka Circle,Dhaka,Works,RHD-HATIRJHEEL-01,Emergency asphalt overlaying and drainage repairs at Hatirjheel bypass circle ring road,980000 BDT,800,20000,2026-06-20 14:00,true`;
    
    processFileContentText(demoPayload, "demo.csv");
  };

  const commitImport = () => {
    if (!parsedTenders || parsedTenders.length === 0) return;
    let newCount = 0;
    let duplicateCount = 0;
    const updatedTenders = [...tenders];
    
    parsedTenders.forEach((incoming) => {
      if (!incoming.id) return;
      const existingIdx = updatedTenders.findIndex(t => t.id === incoming.id);
      if (existingIdx !== -1) {
        if (duplicateAction === 'overwrite') {
          updatedTenders[existingIdx] = {
            ...updatedTenders[existingIdx],
            ...incoming as Tender,
            isReTender: true
          };
          duplicateCount++;
        } else {
          duplicateCount++;
        }
      } else {
        updatedTenders.unshift(incoming as Tender);
        newCount++;
      }
    });

    onUpdateTenders(updatedTenders);
    setFeedbackSuccess(`Bulk Ingestion Phase Successful! Mapped ${newCount} completely new tender(s) into search workspace.`);
    setParsedTenders([]);
  };

  const chartData = useMemo(() => {
    const data = [];
    const baseDate = new Date("2026-05-28");
    const premiumCount = users.filter((u) => u.subscriptionType === 'premium').length;
    const freeCount = users.filter((u) => u.subscriptionType === 'free').length;
    
    for (let i = 29; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
      const baseTenders = isWeekend ? 3 : 15;
      const seedVal = (d.getDate() * 19) % 9;
      const tendersCount = Math.max(1, baseTenders + (seedVal - 4));
      const progress = (29 - i) / 29;
      const premiumSubs = i === 0 ? premiumCount : Math.max(1, Math.round(1 + progress * (premiumCount - 1)));
      const activeTrials = i === 0 ? freeCount : Math.max(1, Math.round(2 + progress * (freeCount - 2)));
      
      data.push({
        date: dateStr,
        tendersCount,
        premiumSubs,
        activeTrials
      });
    }
    return data;
  }, [users]);

  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 text-white rounded-lg shadow-xl font-mono text-left p-3 text-[11px]">
          <p className="text-slate-400 font-bold mb-1 border-b border-slate-800 pb-1">{label}</p>
          {payload.map((p: any, idx: number) => (
            <p key={idx} style={{ color: p.color || p.stroke }} className="flex justify-between items-center gap-5 py-0.5">
              <span>{p.name === 'tendersCount' ? 'Daily Notices' : p.name === 'premiumSubs' ? 'Premium active' : 'Trial evaluators'}:</span>
              <span className="font-bold">{p.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Modify User Manual Action center
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    subscriptionType: 'free' as 'free' | 'premium' | 'expired' | 'blocked',
    expiryDate: '2026-06-30',
    city: 'Dhaka'
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) {
      showToast("Name and Email are required", "error");
      return;
    }
    const created: User = {
      id: "USR-" + Math.floor(Math.random() * 900 + 100),
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone || '01711223344',
      companyName: newUser.companyName || 'Freelance Bidder',
      subscriptionType: newUser.subscriptionType,
      trialExtendedDays: 0,
      createdAt: '2026-05-28',
      expiryDate: newUser.expiryDate,
      city: newUser.city
    };
    onUpdateUsers([...users, created]);
    setShowCreateModal(false);
  };

  const handleToggleBlock = (userId: string) => {
    const updated = users.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          subscriptionType: (u.subscriptionType === 'blocked' ? 'free' : 'blocked') as any
        };
      }
      return u;
    });
    onUpdateUsers(updated);
    const synced = updated.find(u => u.id === userId);
    if (synced) setSelectedUser(synced);
  };

  const handleSetPremium = (userId: string) => {
    const updated = users.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          subscriptionType: 'premium' as any,
          expiryDate: '2026-12-31'
        };
      }
      return u;
    });
    onUpdateUsers(updated);
    const synced = updated.find(u => u.id === userId);
    if (synced) setSelectedUser(synced);
  };

  const handleRemoveUser = (userId: string) => {
    if (window.confirm("Remove this user?")) {
      onUpdateUsers(users.filter(u => u.id !== userId));
      setSelectedUser(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // If view-only, just output the beautiful charts segment
  if (viewOnlyCharts) {
    return (
      <div className="space-y-4 text-on-surface">
        {/* Sizing & Touch Optimizers Toolbar */}
        <div className="bg-slate-50 border border-border-subtle rounded-xl p-3.5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono shadow-sm">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
              Chart Height Selection:
            </span>
            <div className="bg-white p-1 rounded-lg border border-border-subtle flex gap-1">
              {[
                { name: 'Compact', val: 140 },
                { name: 'Medium', val: 195 },
                { name: 'Tablet Max', val: 280 }
              ].map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => setChartHeight(preset.val)}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    chartHeight === preset.val 
                      ? 'bg-primary text-white' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>

            {/* Manual Slider adjustment */}
            <div className="flex items-center gap-2 ml-1">
              <input
                type="range"
                min="130"
                max="400"
                value={chartHeight}
                onChange={(e) => setChartHeight(Number(e.target.value))}
                className="w-24 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-primary font-bold text-[10px] w-9 font-mono">{chartHeight}px</span>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto border-t md:border-t-0 border-slate-100 pt-2.5 md:pt-0">
            <span className="text-slate-550 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 font-sans">
              {touchOptimized ? <Tablet className="w-3.5 h-3.5 text-emerald-600" /> : <Smartphone className="w-3.5 h-3.5 text-slate-400" />}
              Touch Interactions Scaling:
            </span>
            <button
              type="button"
              onClick={() => setTouchOptimized(!touchOptimized)}
              className={`px-3 py-1.5 rounded-lg border font-bold text-[10px] transition-all flex items-center gap-1.5 cursor-pointer ${
                touchOptimized 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-805 shadow-sm' 
                  : 'bg-white border-border-subtle text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${touchOptimized ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
              {touchOptimized ? 'TOUCH ENABLED' : 'MOUSE SCALED'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: daily GP Tender Volume */}
          <div className="bg-white p-5 rounded-xl border border-border-subtle shadow-sm space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-light border-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-primary font-sans leading-none uppercase">e-GP Daily Tender Notices</span>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">AVG: 11.2/DAY</span>
            </div>
            
            <div style={{ height: `${chartHeight}px` }} className="w-full font-mono text-[10px] text-slate-500 transition-all duration-200">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tenderGradColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#031636" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#031636" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#94a3b8" tickLine={false} tick={{ fontSize: touchOptimized ? 11 : 9, fill: '#64748b' }} />
                  <YAxis stroke="#94a3b8" tickLine={false} tick={{ fontSize: touchOptimized ? 11 : 9, fill: '#64748b' }} />
                  <Tooltip content={renderCustomTooltip} />
                  <Area 
                    type="monotone" 
                    dataKey="tendersCount" 
                    stroke="#031636" 
                    strokeWidth={touchOptimized ? 3.5 : 2} 
                    fillOpacity={1} 
                    fill="url(#tenderGradColor)" 
                    activeDot={{ r: touchOptimized ? 8 : 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Subscription Growth */}
          <div className="bg-white p-5 rounded-xl border border-border-subtle shadow-sm space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-light border-slate-50">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#059669]" />
                <span className="text-xs font-bold text-primary font-sans leading-none uppercase">Live Subscriptions Metrics</span>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">REALTIME OK</span>
            </div>
            
            <div style={{ height: `${chartHeight}px` }} className="w-full font-mono text-[10px] text-slate-500 transition-all duration-200">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="premiumGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#94a3b8" tickLine={false} tick={{ fontSize: touchOptimized ? 11 : 9, fill: '#64748b' }} />
                  <YAxis stroke="#94a3b8" tickLine={false} tick={{ fontSize: touchOptimized ? 11 : 9, fill: '#64748b' }} />
                  <Tooltip content={renderCustomTooltip} />
                  <Area 
                    type="monotone" 
                    dataKey="premiumSubs" 
                    stroke="#10b981" 
                    strokeWidth={touchOptimized ? 3.5 : 2} 
                    fillOpacity={1} 
                    fill="url(#premiumGrad)" 
                    name="premiumSubs" 
                    activeDot={{ r: touchOptimized ? 8 : 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border-subtle rounded-2xl overflow-hidden shadow-sm text-on-surface font-sans space-y-6 p-6">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <h3 className="text-base font-bold text-primary uppercase font-mono">DORPOTRO.BD Database Management Console</h3>
        <span className="bg-slate-100 text-slate-650 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">SYSTEM LEVEL 1</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-border-subtle">
          <span className="text-slate-450 text-[10px] font-mono font-bold uppercase tracking-wider block">Bidders List</span>
          <h4 className="text-2xl font-black mt-1 text-primary">{users.length}</h4>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-border-subtle">
          <span className="text-slate-450 text-[10px] font-mono font-bold uppercase tracking-wider block">Premium Live</span>
          <h4 className="text-2xl font-black mt-1 text-emerald-600">
            {users.filter(u => u.subscriptionType === 'premium').length}
          </h4>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-border-subtle">
          <span className="text-slate-450 text-[10px] font-mono font-bold uppercase tracking-wider block">Active Trialists</span>
          <h4 className="text-2xl font-black mt-1 text-orange-600">
            {users.filter(u => u.subscriptionType === 'free').length}
          </h4>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-border-subtle">
          <span className="text-slate-450 text-[10px] font-mono font-bold uppercase tracking-wider block">Blocked status</span>
          <h4 className="text-2xl font-black mt-1 text-rose-600">
            {users.filter(u => u.subscriptionType === 'blocked').length}
          </h4>
        </div>
      </div>

      {/* CSV Uploader */}
      <div className="bg-slate-50 border border-border-subtle rounded-xl p-5 space-y-4">
        <div>
          <h4 className="text-xs font-mono font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
            <Database className="w-4 h-4 text-emerald-600" />
            Bulk CSV Mappings
          </h4>
          <p className="text-slate-500 text-xs mt-0.5">Drop raw eprocure CSV rows directly to test real-time parsing.</p>
        </div>

        {feedbackSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg text-xs font-sans">
            {feedbackSuccess}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all flex flex-col justify-center items-center cursor-pointer min-h-[120px] ${
              dragActive ? 'border-primary bg-slate-100' : 'border-slate-300 hover:border-slate-400 bg-white'
            }`}
          >
            <input id="csv-file-uploader-panel" type="file" accept=".csv,.json,.html,.htm,.txt" onChange={handleFileChange} className="hidden" />
            <label htmlFor="csv-file-uploader-panel" className="cursor-pointer">
              <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <span className="text-xs font-bold text-primary block">Click/Drop CSV, JSON or HTML to import</span>
              <span className="text-[10px] text-slate-400">Accepts standard CSV tables, JSON backups, or e-GP notice webpages</span>
            </label>
          </div>

          <div className="flex flex-col justify-center bg-white p-4 rounded-xl border border-border-subtle space-y-3">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">No CSV on hand? Use Demo</span>
            <button 
              onClick={loadDemoCSVData}
              className="w-full bg-primary text-white hover:opacity-90 font-bold font-mono text-[11px] py-2 rounded-lg cursor-pointer"
            >
              ⚡ INJECT DEMO TENDER PAYLOADS
            </button>
          </div>
        </div>

        {parsedTenders.length > 0 && (
          <div className="bg-white border border-border-subtle rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-primary font-mono">{parsedTenders.length} items parsed. Ready?</span>
              <button onClick={commitImport} className="bg-[#059669] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-emerald-600">
                Commit & Write into list
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AUTOMATED TRIGGER DIRECTORY WATCHER */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-3">
          <div>
            <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest block">Autonomous Crawling Engine</span>
            <h4 className="text-xs font-bold font-mono tracking-tight text-white flex items-center gap-1.5 uppercase">
              <Activity className="w-4 h-4 text-indigo-400 shrink-0" />
              e-GP OTM Web Scraper & Corrigendum Guard
            </h4>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Simulates Selenium headless automation index scraping, ViewTender.jsp extraction, AdvAPPSearch.jsp budget mapping, and periodic corrigendum checks.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setOtmScraperEnabled(!otmScraperEnabled);
                addOtmLog(`${!otmScraperEnabled ? 'Activating' : 'Deactivating'} e-GP automated crawler daemon...`, 'info');
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                otmScraperEnabled 
                  ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                  : 'bg-indigo-650 hover:bg-indigo-600 text-white shadow'
              }`}
            >
              {otmScraperEnabled ? (
                <>
                  <Square className="w-3 h-3 fill-current" />
                  Stop Daemon
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  Start Daemon
                </>
              )}
            </button>
            
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md text-[10px]">
              <span className={`w-1.5 h-1.5 rounded-full ${otmScraperEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-605'}`}></span>
              <span className="font-mono text-[9px] text-slate-400 uppercase font-bold">
                {otmScraperEnabled ? 'Active' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Configuration and Sandbox control (5 cols) */}
          <div className="lg:col-span-12 xl:col-span-5 space-y-3.5">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3 font-sans">
              <span className="text-[9px] uppercase font-bold text-indigo-400 block tracking-wider font-mono font-bold">Python-Selenium Settings</span>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[9px] text-slate-400 uppercase font-bold font-mono">Target Day (day)</label>
                  <input 
                    type="text" 
                    value={otmTargetDay} 
                    onChange={(e) => {
                      setOtmTargetDay(e.target.value);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('otm_target_day', e.target.value);
                      }
                    }}
                    placeholder="e.g. 28"
                    className="w-full bg-slate-900 border border-slate-800 rounded-md text-[11px] py-1.5 px-2 text-slate-300 font-mono outline-none focus:border-indigo-500 text-center"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="block text-[9px] text-slate-400 uppercase font-bold font-mono">Target Month (month)</label>
                  <select 
                    value={otmTargetMonth} 
                    onChange={(e) => {
                      setOtmTargetMonth(e.target.value);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('otm_target_month', e.target.value);
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-md text-[11px] py-1.5 px-2 text-slate-300 font-mono outline-none focus:border-indigo-500 text-center cursor-pointer text-slate-300 min-h-[30px]"
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                      <option key={m} value={m} className="bg-slate-900 text-slate-300">{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[9px] text-slate-400 uppercase font-bold font-mono">Stop Limit (max page)</label>
                  <input 
                    type="number" 
                    value={otmStopLimit} 
                    onChange={(e) => {
                      const limit = parseInt(e.target.value) || 1;
                      setOtmStopLimit(limit);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('otm_stop_limit', String(limit));
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-md text-[11px] py-1.5 px-2 text-slate-300 font-mono outline-none focus:border-indigo-500 text-center"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] text-slate-400 uppercase font-bold font-mono">Polling Cycle speed</label>
                  <select 
                    value={otmInterval} 
                    onChange={(e) => {
                      setOtmInterval(parseInt(e.target.value));
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-md text-[11px] py-1.5 px-2 text-slate-300 font-mono outline-none focus:border-indigo-500 text-center cursor-pointer text-slate-300 min-h-[30px]"
                  >
                    {[
                      { l: 'High Speed (5s)', v: 5 },
                      { l: 'Balanced (8s)', v: 8 },
                      { l: 'Standard (15s)', v: 15 },
                      { l: 'Paced (30s)', v: 30 }
                    ].map(opt => (
                      <option key={opt.v} value={opt.v} className="bg-slate-900 text-slate-300">{opt.l}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleOtmAutomaticScrape(true)}
                  className="bg-indigo-600/35 border border-indigo-500/50 hover:bg-indigo-600/50 text-indigo-200 text-[10px] font-bold py-1.5 px-2 rounded-md font-mono cursor-pointer text-center"
                >
                  ⚡ Force Crawl Sweep
                </button>
                <button
                  type="button"
                  onClick={runCorrigendumAudit}
                  className="bg-emerald-600/35 border border-emerald-500/50 hover:bg-emerald-600/50 text-emerald-250 text-[10px] font-bold py-1.5 px-2 rounded-md font-mono cursor-pointer text-center"
                >
                  🔍 Force Audit Sweep
                </button>
              </div>
            </div>

            {/* Sandbox Corrigendum / Amendment Creator */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5 font-sans">
              <span className="text-[9px] uppercase font-bold text-amber-400 block tracking-wider font-mono font-bold">Simulate e-GP Corrigendum Drop</span>
              <p className="text-slate-400 text-[10.5px] leading-relaxed">
                Select an active OTM tender and push an amendment post on e-GP portal. The running cron will discover it on the next loop, extend the deadline calendar, check estimated cost integrity, and flag it as amended!
              </p>

              <div className="space-y-2">
                <select
                  value={simulateCorrigendumId}
                  onChange={(e) => setSimulateCorrigendumId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-md text-[10px] py-1.5 px-2 text-slate-300 font-mono outline-none focus:border-amber-500 cursor-pointer text-ellipsis overflow-hidden min-h-[30px]"
                >
                  <option value="" className="bg-slate-900 text-slate-300">-- Choose active OTM Tender --</option>
                  {tenders
                    .filter(t => (t.procurementMethod || '').toUpperCase().includes('OTM'))
                    .map(t => (
                      <option key={t.id} value={t.id} className="bg-slate-900 text-slate-300 text-[10px]">
                        [{t.id}] {t.packageDescription.substring(0, 45)}...
                      </option>
                    ))
                  }
                </select>

                <button
                  type="button"
                  disabled={!simulateCorrigendumId}
                  onClick={() => {
                    addOtmLog(`[ALERT] Ingressed simulated amendment trigger for Tender ID ${simulateCorrigendumId}. Next audit sweep will execute corrigendum update.`, 'warn');
                    runCorrigendumAudit();
                  }}
                  className={`w-full text-center text-[10.5px] font-bold py-1.5 rounded-lg transition-all ${
                    simulateCorrigendumId 
                      ? 'bg-amber-650 hover:bg-amber-600 text-slate-950 font-black cursor-pointer' 
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  📡 Trigger Portal Corrigendum Alert
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Watcher State Terminal and queue status */}
          <div className="lg:col-span-12 xl:col-span-7 flex flex-col gap-3">
            {/* OTM Live list */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex-1 flex flex-col max-h-[145px] overflow-hidden">
              <span className="text-[9px] uppercase font-bold text-indigo-400 block tracking-wider font-mono mb-1.5 font-bold">
                Active OTM Monitored Tenders Queue ({tenders.filter(t => (t.procurementMethod || '').toUpperCase().includes('OTM')).length})
              </span>
              
              <div className="overflow-y-auto space-y-1.5 pr-1 flex-1">
                {tenders.filter(t => (t.procurementMethod || '').toUpperCase().includes('OTM')).length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 py-4 font-sans">
                    <Activity className="w-5 h-5 mb-1 opacity-40 text-indigo-400 animate-pulse" />
                    <span className="text-[9px] font-mono">No OTM tenders in data list. Try Force Crawl Sweep.</span>
                  </div>
                ) : (
                  tenders
                    .filter(t => (t.procurementMethod || '').toUpperCase().includes('OTM'))
                    .slice(0, 25)
                    .map((t) => (
                      <div key={t.id} className="flex justify-between items-center bg-slate-900/40 p-1.5 rounded border border-slate-850 text-[10px] font-mono gap-2 animate-fade-in">
                        <div className="flex flex-col truncate min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-indigo-400 font-bold">ID: {t.id}</span>
                            <span className="text-slate-500 text-[9px] truncate max-w-[150px]" title={t.organization}>{t.organization}</span>
                            {t.hasAmendment && (
                              <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[8px] uppercase px-1 rounded animate-pulse">
                                Amended corrigendum
                              </span>
                            )}
                          </div>
                          <span className="text-slate-350 text-[9.5px] truncate font-medium mt-0.5" title={t.packageDescription}>{t.packageDescription}</span>
                          <span className="text-slate-500 text-[8.5px] mt-0.2 select-none">
                            Deadline: {t.documentLastSellingDate || 'N/A'} • Last sweep: {t.lastRecheckedAt || 'None'}
                          </span>
                        </div>
                        
                        <div className="shrink-0 flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-400 text-[9px]">
                          <Clock className="w-2.5 h-2.5 text-indigo-405" />
                          <span>Active</span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Terminal console logger */}
            <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 flex-1 flex flex-col font-mono text-[9px] text-slate-300 min-h-[145px] max-h-[145px] overflow-hidden">
              <div className="flex justify-between items-center border-b border-slate-850 pb-1.5 mb-1.5 shrink-0">
                <span className="text-slate-400 font-bold flex items-center gap-1">
                  <Terminal className="w-3 h-3 text-indigo-400" />
                  Selenium Headless Core Output (e-GP Scraping logs)
                </span>
                <span className="text-[8px] bg-indigo-950 border border-indigo-900 px-1 rounded text-indigo-305">STDOUT</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 pr-1 flex flex-col select-text font-mono">
                {otmLogs.map((log, idx) => (
                  <div key={idx} className="flex gap-1.5 leading-relaxed shrink-0">
                    <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                    <span className={` ${
                      log.type === 'success' 
                        ? 'text-emerald-400 font-bold' 
                        : log.type === 'error' 
                          ? 'text-rose-400 font-bold' 
                          : log.type === 'warn' 
                            ? 'text-amber-400 font-bold' 
                            : log.type === 'crawl'
                              ? 'text-indigo-400 italic'
                              : 'text-slate-300'
                    }`}>
                      {log.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BACKGROUND NOA SYNC SERVICE CONSOLE */}
      <div className="bg-slate-50 border border-border-subtle rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/80 pb-3">
          <div>
            <span className="text-[9px] font-mono font-bold text-indigo-600 uppercase tracking-widest block">BACKGROUND RECONCILER DAEMON</span>
            <h4 className="text-xs font-bold font-mono tracking-tight text-slate-900 flex items-center gap-1.5 uppercase">
              <Award className="w-4 h-4 text-indigo-600 shrink-0" />
              e-GP Notification of Award (NOA) Sync Mechanism
            </h4>
            <p className="text-slate-500 text-[11px] mt-0.5 mt-1.5">
              Queries e-GP Contract Award archives by Tender ID. Performs reconciliation to map active procurement notices with their corresponding <strong className="text-slate-800">Awarded Bidder</strong> and <strong className="text-slate-800">Actual Discount</strong> metrics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onToggleNoaSync}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                noaSyncEnabled 
                  ? 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100' 
                  : 'bg-indigo-605 hover:bg-indigo-700 text-white shadow shadow-indigo-200'
              }`}
            >
              {noaSyncEnabled ? 'Pause Daemon' : 'Resume Daemon'}
            </button>

            <button
              onClick={onForceNoaSync}
              disabled={noaSyncStatus.isSyncing}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all border shrink-0 ${
                noaSyncStatus.isSyncing
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-white hover:bg-slate-100 text-slate-705 border-slate-300 shadow-sm cursor-pointer'
              }`}
            >
              {noaSyncStatus.isSyncing ? (
                <>
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin"></div>
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 text-slate-650" />
                  Sync Latest Now
                </>
              )}
            </button>

            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-md text-[10px]">
              <span className={`w-1.5 h-1.5 rounded-full ${noaSyncEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
              <span className="font-mono text-[9px] text-slate-500 uppercase font-bold">
                {noaSyncEnabled ? 'Background Active' : 'Suspended'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 text-center">
          <div className="bg-white border border-slate-200/60 p-3 rounded-lg flex flex-col justify-center">
            <span className="text-[8px] font-mono font-bold uppercase text-slate-440 tracking-wider">Total Notices Scanned</span>
            <strong className="text-slate-805 text-lg font-black mt-0.5">{tenders.length}</strong>
          </div>
          <div className="bg-white border border-slate-200/60 p-3 rounded-lg flex flex-col justify-center">
            <span className="text-[8px] font-mono font-bold uppercase text-slate-440 tracking-wider">Matched &amp; Reconciled</span>
            <strong className="text-emerald-600 text-lg font-black mt-0.5">
              {tenders.filter(t => t.awardedBidder).length}
            </strong>
          </div>
          <div className="bg-white border border-slate-200/60 p-3 rounded-lg flex flex-col justify-center">
            <span className="text-[8px] font-mono font-bold uppercase text-slate-440 tracking-wider">Historical Archives Map</span>
            <strong className="text-slate-800 text-lg font-black mt-0.5">65,491 records</strong>
          </div>
          <div className="bg-white border border-slate-200/60 p-3 rounded-lg flex flex-col justify-center">
            <span className="text-[8px] font-mono font-bold uppercase text-slate-440 tracking-wider">Last Sync Checked At</span>
            <strong className="text-slate-500 text-[10.5px] font-mono font-bold mt-0.5 truncate">
              {noaSyncStatus.lastSyncTime || 'Pending First Cycle'}
            </strong>
          </div>
        </div>

        <div className="bg-white border border-border-subtle rounded-xl p-3.5 flex flex-col font-mono text-[9.5px] text-slate-700 min-h-[145px] max-h-[160px] overflow-hidden shadow-inner">
          <div className="flex justify-between items-center border-b border-slate-100 pb-1.5 mb-1.5 shrink-0">
            <span className="text-slate-500 font-bold flex items-center gap-1">
              <Terminal className="w-3 h-3 text-indigo-550" />
              Contract Award Reconciler Status Logger
            </span>
            <span className="text-[8.5px] bg-[#eef2ff] border border-indigo-200 px-1.5 py-0.2 text-indigo-700 rounded font-bold font-mono">RECONCILER_STDOUT</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1 flex flex-col select-text font-mono leading-relaxed text-left">
            {noaSyncStatus.log && noaSyncStatus.log.length > 0 ? (
              noaSyncStatus.log.map((logMsg, idx) => {
                const isMatch = logMsg.includes('matched');
                const isDynamic = logMsg.includes('dynamically');
                return (
                  <div key={idx} className="flex gap-1.5 shrink-0 border-b border-slate-50/50 pb-0.5 text-left">
                    <span className={` ${
                      isMatch 
                        ? 'text-indigo-600 font-bold' 
                        : isDynamic 
                          ? 'text-slate-700 font-medium' 
                          : 'text-slate-400'
                    }`}>
                      {logMsg}
                    </span>
                  </div>
                );
              })
            ) : (
              <span className="text-slate-400 font-bold italic">Logger is currently empty. Reconciler active in waiting state.</span>
            )}
          </div>
        </div>
      </div>

      {/* Manual Users Grid */}
      <div className="space-y-3 mt-4">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search local bidders..."
              className="w-full bg-slate-50 border border-border-subtle focus:border-primary outline-none rounded-lg text-xs py-2.5 pl-9 pr-4 text-slate-700"
            />
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-primary text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer"
          >
            Create Bidder
          </button>
        </div>

        <div className="overflow-x-auto border border-border-subtle rounded-xl bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-mono text-[10px] uppercase border-b border-border-subtle">
              <tr>
                <th className="py-2.5 px-3 font-bold">Bidder name</th>
                <th className="py-2.5 px-3 font-bold">Company entity</th>
                <th className="py-2.5 px-3 font-bold">Subscription Status</th>
                <th className="py-2.5 px-3 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-3">
                    <span className="font-bold text-primary text-xs">{u.name}</span>
                    <p className="text-slate-400 mt-0.5">{u.email}</p>
                  </td>
                  <td className="py-3 px-3 text-slate-600">{u.companyName}</td>
                  <td className="py-3 px-3 font-mono">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      u.subscriptionType === 'premium' ? 'bg-emerald-105 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {u.subscriptionType}
                    </span>
                  </td>
                  <td className="py-3 px-3 space-x-2">
                    <button onClick={() => handleSetPremium(u.id)} className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-2.5 py-1 text-[10px] font-bold cursor-pointer">
                      Grant Premium
                    </button>
                    <button onClick={() => handleToggleBlock(u.id)} className="bg-rose-50 text-rose-700 border border-rose-200 rounded px-2.5 py-1 text-[10px] font-bold cursor-pointer">
                      Toggle Restriction
                    </button>
                    <button onClick={() => handleRemoveUser(u.id)} className="text-red-500 hover:underline font-bold text-[10px] cursor-pointer">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white border border-border-subtle rounded-xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <h3 className="font-bold text-primary font-display">New Bidder Registration</h3>
            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-500 font-bold uppercase tracking-wider text-[9px]">Full Name</label>
                <input type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full bg-slate-50 border p-2 rounded" />
              </div>
              <div className="space-y-1">
                <label className="block text-slate-500 font-bold uppercase tracking-wider text-[9px]">Email Address</label>
                <input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full bg-slate-50 border p-2 rounded" />
              </div>
              <div className="space-y-1">
                <label className="block text-slate-500 font-bold uppercase tracking-wider text-[9px]">Company Agency Name</label>
                <input type="text" value={newUser.companyName} onChange={e => setNewUser({...newUser, companyName: e.target.value})} className="w-full bg-slate-50 border p-2 rounded" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-primary text-white py-2 rounded font-bold cursor-pointer">Register</button>
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-grow bg-slate-100 py-2 rounded font-bold cursor-pointer">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
