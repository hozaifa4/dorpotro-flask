import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Award, TrendingUp, Coins, Lock, ShieldCheck, Check, 
  RotateCcw, FileText, Building2, Users, Info, CreditCard, 
  Layers, Gavel, Sparkles, TrendingDown, DollarSign, Sliders, 
  Gauge, MapPin, ChevronRight, Calculator, PieChart, Landmark
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
  CartesianGrid, ReferenceLine, ComposedChart, Line
} from 'recharts';
import { Tender, User } from '../types';

interface NoaBidOptimizerProps {
  tenders: Tender[];
  currentUser: User;
  onUpdateCurrentUser: (user: User) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

// Simulated NOA (Notification of Award) Data matching e-GP signatures
export interface NOARecord {
  id: string; // Contract Ref / Contract ID
  tenderId: string; // Associated Tender ID
  projectName: string;
  ministry: string;
  organization: string;
  procuringDistrict: string;
  procurementNature: 'Goods' | 'Works' | 'Services';
  awardedBidder: string;
  estimatedCostAmt: number;
  contractAmount: number;
  discountPct: number; // Percent below estimate
  awardDate: string;
  competitorsCount: number;
  scopeOfWork: string;
  status: 'Signed' | 'Completed' | 'Terminated';
  procurementMethod?: 'OTM' | 'LTM' | 'RFQ' | string;
  
  // Custom professional e-GP fields requested by the user
  packageName?: string;
  packageNo?: string;
  budgetType?: string;
  contractValueTaka?: string;
  advertisementDate?: string;
  signingDate?: string;
  proposedStart?: string;
  proposedCompletion?: string;
  contractorTendererId?: string;
  contractorBeneficialOwner?: string;
  contractorAddress?: string;
  authorisedOfficer?: string;
}

export const mockNoaDataset: NOARecord[] = [
  {
    id: "NOA-1226367-DPHE",
    tenderId: "1226367",
    projectName: "Rural Sanitation Project",
    packageName: "Construction of 1035 nos Twin pit Latrine in Sunamganj Sadar Upazila of Sunamganj District",
    packageNo: "WDTPL-187",
    ministry: "Ministry of Local Government Rural Development & Co-operatives",
    organization: "Office of the Executive Engineer, DPHE, Sunamganj",
    procuringDistrict: "Sunamganj",
    procurementNature: "Works",
    awardedBidder: "Green Constraction",
    estimatedCostAmt: 62500000,
    contractAmount: 59269305.55,
    discountPct: 5.17,
    awardDate: "2026-05-18",
    competitorsCount: 8,
    scopeOfWork: "Construction of 1035 numbers of Twin Pit offset pour-flush latrines with reinforced concrete pipes, brick masonry superstructure, ventilation arrays, and sub-soil leaching systems matching DPHE structural designs in Sunamganj Sadar.",
    status: "Signed",
    procurementMethod: "OTM",
    budgetType: "Development Government",
    advertisementDate: "2026-02-10",
    signingDate: "2026-06-08",
    proposedStart: "2026-07-15",
    proposedCompletion: "2027-12-23",
    contractorTendererId: "1021540",
    contractorBeneficialOwner: "MD. UZZAL MIAH (100% ownership)",
    contractorAddress: "HOLDING NO-1040-01 BLOCK NO-A DHANSHIRI-11 BANANIPARA, SUNAMGANJ SADAR, SUNAMGANJ.",
    authorisedOfficer: "SYED KHALEDUL ISLAM (Executive Engineer)"
  },
  {
    id: "NOA-1082-9921",
    tenderId: "1282055",
    projectName: "Civil and sanitary repair work of public toilets at Sir Salimullah Medical College Mitford Hospital.",
    ministry: "Ministry of Housing and Public Works",
    organization: "Public Works Department (PWD)",
    procuringDistrict: "Dhaka",
    procurementNature: "Works",
    awardedBidder: "Rahman & Sons Co.",
    estimatedCostAmt: 300000,
    contractAmount: 283500,
    discountPct: 5.5,
    awardDate: "2026-05-10",
    competitorsCount: 6,
    scopeOfWork: "Repairing tile masonry, fitting and fixing high commode closets, plastic flushing tanks, master painting, plumbing pipelines and sanitary fittings.",
    status: "Signed",
    procurementMethod: "OTM"
  },
  {
    id: "NOA-2910-3882",
    tenderId: "1282051",
    projectName: "Cleaning of the septic tank, sockwell and sewage line of the X Block of Fazle Rabbi Hostel in Baksibazar under Dhaka Medical College.",
    ministry: "Ministry of Housing and Public Works",
    organization: "Public Works Department (PWD)",
    procuringDistrict: "Dhaka",
    procurementNature: "Works",
    awardedBidder: "Anwar Construction Co.",
    estimatedCostAmt: 300000,
    contractAmount: 288000,
    discountPct: 4.0,
    awardDate: "2026-05-02",
    competitorsCount: 4,
    scopeOfWork: "Silt lifting from pipeline, mechanical suction pumping, manual clearing of septic chambers and refitting sockwell lids.",
    status: "Signed",
    procurementMethod: "LTM"
  },
  {
    id: "NOA-7731-1029",
    tenderId: "1278850",
    projectName: "Sinking & Installation of 150 mm X 200 mm dia Upvc Deep tuble well including 38 mm dia test a observation well with External water supply pipe line at Sir Salimullah Medical College Hospital, Mitford, Dhaka.",
    ministry: "Ministry of Housing and Public Works",
    organization: "Public Works Department (PWD)",
    procuringDistrict: "Dhaka",
    procurementNature: "Works",
    awardedBidder: "National Development Engineers (NDE)",
    estimatedCostAmt: 2500000,
    contractAmount: 2325000,
    discountPct: 7.0,
    awardDate: "2026-04-28",
    competitorsCount: 9,
    scopeOfWork: "Borehole drilling down to 800 feet, installing heavy-duty UPVC casing, supplying and setting submersible pump motor, test pumping, chlorination, and external fittings.",
    status: "Signed",
    procurementMethod: "OTM"
  },
  {
    id: "NOA-9921-2081",
    tenderId: "1152011",
    projectName: "Emergency brick pavement repair along VIP Link Road (LGED Chittagong).",
    ministry: "Ministry of Local Government Rural Development & Co-operatives",
    organization: "Local Government Engineering Department (LGED)",
    procuringDistrict: "Chittagong",
    procurementNature: "Works",
    awardedBidder: "Spectra Engineers Ltd.",
    estimatedCostAmt: 8500000,
    contractAmount: 7922000,
    discountPct: 6.8,
    awardDate: "2026-05-12",
    competitorsCount: 11,
    scopeOfWork: "Subgrade preparation, sand cushioning, flat brick soling and herring-bone-bond brick pavement overlay spanning 1.5 kilometers of municipal shoulder.",
    status: "Signed",
    procurementMethod: "OTM"
  },
  {
    id: "NOA-3351-4029",
    tenderId: "1168532",
    projectName: "Supply and installation of split-type air conditioners at LGED HQ Annex B.",
    ministry: "Ministry of Local Government Rural Development & Co-operatives",
    organization: "Local Government Engineering Department (LGED)",
    procuringDistrict: "Dhaka",
    procurementNature: "Goods",
    awardedBidder: "Cybernet Automation Bangladesh",
    estimatedCostAmt: 1200000,
    contractAmount: 1140000,
    discountPct: 5.0,
    awardDate: "2026-05-18",
    competitorsCount: 5,
    scopeOfWork: "Delivering 15 units of 2.0 Ton smart inverter air conditioners, bracket fabrication, refrigerant piping, outdoor mounting, and testing.",
    status: "Completed",
    procurementMethod: "OTM"
  },
  {
    id: "NOA-8219-4821",
    tenderId: "1231049",
    projectName: "Renovation of administrative quarters and boundary masonry wall construction (PWD Sylhet).",
    ministry: "Ministry of Housing and Public Works",
    organization: "Public Works Department (PWD)",
    procuringDistrict: "Sylhet",
    procurementNature: "Works",
    awardedBidder: "Sajjad & Brothers Joint Venture",
    estimatedCostAmt: 4500000,
    contractAmount: 4140000,
    discountPct: 8.0,
    awardDate: "2026-04-15",
    competitorsCount: 8,
    scopeOfWork: "RCC beam reinforcement, brick masonry works up to 6 feet high, decorative grill installation, master plastering and weathering course insulation.",
    status: "Completed",
    procurementMethod: "OTM"
  },
  {
    id: "NOA-6102-1299",
    tenderId: "1275990",
    projectName: "Development of storm drainage network and RCC drain construction at Munshiganj Sadar secondary link roads.",
    ministry: "Ministry of Local Government Rural Development & Co-operatives",
    organization: "Local Government Engineering Department (LGED)",
    procuringDistrict: "Gazipur",
    procurementNature: "Works",
    awardedBidder: "National Development Engineers (NDE)",
    estimatedCostAmt: 12400000,
    contractAmount: 11346000,
    discountPct: 8.5,
    awardDate: "2026-04-20",
    competitorsCount: 14,
    scopeOfWork: "Excavation, precast RCC pipe laying, construction of deep catchpits, brick manholes, and site restoration.",
    status: "Signed",
    procurementMethod: "OTM"
  },
  {
    id: "NOA-1192-3881",
    tenderId: "1274530",
    projectName: "Supply and delivery of high performance centrifugal backup pumps at BWDB Dhaka.",
    ministry: "Ministry of Water Resources",
    organization: "Bangladesh Water Development Board (BWDB)",
    procuringDistrict: "Dhaka",
    procurementNature: "Goods",
    awardedBidder: "Anwar Construction Co.",
    estimatedCostAmt: 1800000,
    contractAmount: 1728000,
    discountPct: 4.0,
    awardDate: "2026-05-09",
    competitorsCount: 4,
    scopeOfWork: "Procurement of 3 industrial diesel pumps with capacity 150 m3/hr, heavy-duty suction hoses, spare couplers, and commissioning.",
    status: "Completed",
    procurementMethod: "LTM"
  },
  {
    id: "NOA-5192-1021",
    tenderId: "1259920",
    projectName: "Installation of RCC pipe culverts and BC rehabilitation / repair works of primary bypass link road.",
    ministry: "Ministry of Local Government Rural Development & Co-operatives",
    organization: "Local Government Engineering Department (LGED)",
    procuringDistrict: "Sylhet",
    procurementNature: "Works",
    awardedBidder: "Sajjad & Brothers Joint Venture",
    estimatedCostAmt: 6200000,
    contractAmount: 5642000,
    discountPct: 9.0,
    awardDate: "2026-03-12",
    competitorsCount: 7,
    scopeOfWork: "Drilling RCC support frames, asphalt carpeting overlay, subbase repair works along the municipal bypass.",
    status: "Completed",
    procurementMethod: "OTM"
  },
  {
    id: "NOA-4831-2911",
    tenderId: "1249911",
    projectName: "Emergency repairing of tiles masonry, bathroom fittings, sewerage pipelines and wall plastering of cabin blocks.",
    ministry: "Ministry of Housing and Public Works",
    organization: "Public Works Department (PWD)",
    procuringDistrict: "Dhaka",
    procurementNature: "Works",
    awardedBidder: "Anwar Construction Co.",
    estimatedCostAmt: 850000,
    contractAmount: 816000,
    discountPct: 4.0,
    awardDate: "2026-05-22",
    competitorsCount: 5,
    scopeOfWork: "Emergency plastering, replacement of broken porcelain commodes, floor tiles replacement, and drainage washouts.",
    status: "Signed",
    procurementMethod: "LTM"
  },
  {
    id: "NOA-7740-4921",
    tenderId: "1225501",
    projectName: "Sinking BFS pavement Herring Bone Soling brick road construction under Union Road Project.",
    ministry: "Ministry of Local Government Rural Development & Co-operatives",
    organization: "Local Government Engineering Department (LGED)",
    procuringDistrict: "Chittagong",
    procurementNature: "Works",
    awardedBidder: "Spectra Engineers Ltd.",
    estimatedCostAmt: 4200000,
    contractAmount: 3885000,
    discountPct: 7.5,
    awardDate: "2026-04-10",
    competitorsCount: 12,
    scopeOfWork: "Clay brick laying in herringbone pattern, subgrade compacting with heavy rollers, sand filling on subgrade.",
    status: "Signed",
    procurementMethod: "OTM"
  },
  {
    id: "NOA-2911-3881",
    tenderId: "1282052",
    projectName: "Supply and delivery of high performance solar panels, hybrid charge planners and led arrays at LGED HQ.",
    ministry: "Ministry of Local Government Rural Development & Co-operatives",
    organization: "Local Government Engineering Department (LGED)",
    procuringDistrict: "Dhaka",
    procurementNature: "Goods",
    awardedBidder: "Cybernet Automation Bangladesh",
    estimatedCostAmt: 2900000,
    contractAmount: 2755000,
    discountPct: 5.0,
    awardDate: "2026-05-01",
    competitorsCount: 3,
    scopeOfWork: "200W solar panel arrays supply, lead-acid backup deep cycle batteries, customized rack mounting, charge planners calibration.",
    status: "Signed",
    procurementMethod: "RFQ"
  },
  {
    id: "NOA-1102-4819",
    tenderId: "1230198",
    projectName: "Procurement of office stationaries, file folders, customized ledger books, offset ink toner sets for PWD HQ.",
    ministry: "Ministry of Housing and Public Works",
    organization: "Public Works Department (PWD)",
    procuringDistrict: "Dhaka",
    procurementNature: "Goods",
    awardedBidder: "Anwar Construction Co.",
    estimatedCostAmt: 600000,
    contractAmount: 582000,
    discountPct: 3.0,
    awardDate: "2026-04-18",
    competitorsCount: 5,
    scopeOfWork: "Supply of 1500 sets of offset multi-color printing ledgers, heavy folders, ballpoint packages and paper registers.",
    status: "Completed",
    procurementMethod: "RFQ"
  },
  {
    id: "NOA-9102-1209",
    tenderId: "1273391",
    projectName: "Supply of high speed computer systems, laserjet duplex printers and office electronics gadgets for BWDB ICT Cell.",
    ministry: "Ministry of Water Resources",
    organization: "Bangladesh Water Development Board (BWDB)",
    procuringDistrict: "Dhaka",
    procurementNature: "Goods",
    awardedBidder: "Cybernet Automation Bangladesh",
    estimatedCostAmt: 1950000,
    contractAmount: 1852500,
    discountPct: 5.0,
    awardDate: "2026-05-15",
    competitorsCount: 6,
    scopeOfWork: "Core-i7 workstations, dual duplex network lasers, unmanaged gigabit switches and CAT6 overhead cabling setup.",
    status: "Signed",
    procurementMethod: "LTM"
  },
  {
    id: "NOA-5821-2910",
    tenderId: "1198421",
    projectName: "Bituminous BC road carpeting and overlay repair works for PWD Sylhet residential colony segment B.",
    ministry: "Ministry of Housing and Public Works",
    organization: "Public Works Department (PWD)",
    procuringDistrict: "Sylhet",
    procurementNature: "Works",
    awardedBidder: "Sajjad & Brothers Joint Venture",
    estimatedCostAmt: 7800000,
    contractAmount: 7176000,
    discountPct: 8.0,
    awardDate: "2026-02-19",
    competitorsCount: 9,
    scopeOfWork: "Hot bituminous mixture laying, 40mm thickness binder laying, roller compaction on 1.2km interior roads.",
    status: "Completed",
    procurementMethod: "OTM"
  },
  {
    id: "NOA-6102-4911",
    tenderId: "1200491",
    projectName: "Special renovation of PWD VIP guest chambers, administrative hall ceilings, wall paneling and interior masonry.",
    ministry: "Ministry of Housing and Public Works",
    organization: "Public Works Department (PWD)",
    procuringDistrict: "Dhaka",
    procurementNature: "Works",
    awardedBidder: "Anwar Construction Co.",
    estimatedCostAmt: 3400000,
    contractAmount: 3264000,
    discountPct: 4.0,
    awardDate: "2026-03-22",
    competitorsCount: 4,
    scopeOfWork: "Teak timber wall panel decoration, suspended mineral tile boards ceiling installation, premium latex painting.",
    status: "Completed",
    procurementMethod: "LTM"
  }
];

// Profile data for Bangladesh's top bidding contractors
interface BidderProfile {
  name: string;
  totalWonAmt: number;
  wonCount: number;
  bidCount: number;
  avgDiscount: number;
  topDistrict: string;
  topOrganization: string;
  tier: 'Diamond' | 'Gold' | 'Silver';
}

const mockBidderProfiles: BidderProfile[] = [
  {
    name: "National Development Engineers (NDE)",
    totalWonAmt: 198500000,
    wonCount: 22,
    bidCount: 95,
    avgDiscount: 7.8,
    topDistrict: "Dhaka",
    topOrganization: "Public Works Department (PWD)",
    tier: "Diamond"
  },
  {
    name: "Spectra Engineers Ltd.",
    totalWonAmt: 175000000,
    wonCount: 19,
    bidCount: 68,
    avgDiscount: 7.2,
    topDistrict: "Chittagong",
    topOrganization: "Local Government Engineering Department (LGED)",
    tier: "Diamond"
  },
  {
    name: "Anwar Construction Co.",
    totalWonAmt: 85200000,
    wonCount: 14,
    bidCount: 52,
    avgDiscount: 4.2,
    topDistrict: "Dhaka",
    topOrganization: "Public Works Department (PWD)",
    tier: "Gold"
  },
  {
    name: "Rahman & Sons Co.",
    totalWonAmt: 54000000,
    wonCount: 8,
    bidCount: 45,
    avgDiscount: 5.6,
    topDistrict: "Dhaka",
    topOrganization: "Public Works Department (PWD)",
    tier: "Gold"
  },
  {
    name: "Sajjad & Brothers Joint Venture",
    totalWonAmt: 92400000,
    wonCount: 12,
    bidCount: 41,
    avgDiscount: 8.1,
    topDistrict: "Sylhet",
    topOrganization: "Local Government Engineering Department (LGED)",
    tier: "Gold"
  },
  {
    name: "Cybernet Automation Bangladesh",
    totalWonAmt: 11400000,
    wonCount: 4,
    bidCount: 18,
    avgDiscount: 5.0,
    topDistrict: "Dhaka",
    topOrganization: "Local Government Engineering Department (LGED)",
    tier: "Silver"
  }
];

const detectCategory = (title: string, scope?: string): string => {
  const t = ((title || '') + ' ' + (scope || '')).toLowerCase();
  
  // Works
  if (t.includes('repair') || t.includes('maintenance') || t.includes('clearing') || t.includes('sanitary') || t.includes('washroom') || t.includes('toilet') || t.includes('sewage') || t.includes('toilet')) {
    return 'Repair Works';
  }
  if (t.includes('rcc') || t.includes('concrete') || t.includes('drain') || t.includes('culvert') || t.includes('pipe laying')) {
    return 'RCC Works';
  }
  if (t.includes('herring') || t.includes('bfs') || t.includes('brick soling') || t.includes('soling') || t.includes('flat brick')) {
    return 'BFS Herring Bond';
  }
  if (t.includes('bituminous') || t.includes('bc carpeting') || t.includes('bc pavement') || t.includes('road carpeting') || t.includes('asphalt')) {
    return 'BC Works';
  }
  if (t.includes('renovation') || t.includes(' quarter') || t.includes('renovate')) {
    return 'Renovation';
  }
  if (t.includes('improvement') || t.includes('extension') || t.includes('construction') || t.includes('building') || t.includes('installation of')) {
    return 'Improvement & Construction';
  }

  // Goods
  if (t.includes('stationary') || t.includes('stationaries') || t.includes('paper') || t.includes('file cover') || t.includes('folders') || t.includes('printing') || t.includes('ledger')) {
    return 'Stationary Supply';
  }
  if (t.includes('electronics') || t.includes('computer') || t.includes('networking') || t.includes('lan') || t.includes('server') || t.includes('biometric')) {
    return 'Electronics Supply';
  }
  if (t.includes('solar') || t.includes('photovoltaic') || t.includes('green power')) {
    return 'Solar Supply';
  }
  if (t.includes('equipment') || t.includes('pump') || t.includes('ac unit') || t.includes('compressor') || t.includes('air conditioner') || t.includes('diesel pump') || t.includes('generator')) {
    return 'Equipment Supply';
  }

  return 'General Engineering';
};

interface FairnessMetrics {
  totalTenderValue: number;
  totalTenders: number;
  uniqueBidders: number;
  winnerConcentration: number;
  topBidder: string;
  topBidderCount: number;
  hhi: number;
  fairnessScore: number;
  avgWinningDiscount: number;
  riskRating: 'Low' | 'Medium' | 'High';
  bidderBreakdown: { bidder: string; count: number; value: number }[];
  analysisText: string;
}

const getFairnessMetrics = (org: string, cat: string, district?: string): FairnessMetrics => {
  let filtered = mockNoaDataset.filter(rec => {
    const matchesOrg = org === 'ALL' || rec.organization.toUpperCase().includes(org.toUpperCase());
    const matchedCategory = detectCategory(rec.projectName, rec.scopeOfWork) === cat;
    const matchesDist = !district || district === 'ALL' || rec.procuringDistrict.toUpperCase() === district.toUpperCase();
    return matchesOrg && matchedCategory && matchesDist;
  });

  if (filtered.length === 0) {
    const seedValue = cat.length + org.length;
    let fallbackBidders: string[] = [];
    if (cat.includes('Supply') || cat.includes('Stationary') || cat.includes('Solar')) {
      fallbackBidders = ["Cybernet Automation Bangladesh", "Dhaka Trade Consortium", "M/S Kamal Brothers"];
    } else {
      fallbackBidders = ["National Development Engineers (NDE)", "Spectra Engineers Ltd.", "Anwar Construction Co.", "Sajjad & Brothers Joint Venture"];
    }

    const simCount = 5;
    filtered = Array.from({ length: simCount }).map((_, i) => {
      const bidder = fallbackBidders[(i + seedValue) % fallbackBidders.length];
      const est = (1200 + (i * 450)) * 1000;
      const disc = 4.2 + ((i * 1.3 + seedValue) % 5.5);
      return {
        id: `SIM-NOA-${i}-${seedValue}`,
        tenderId: `992${i}`,
        projectName: `Simulated historic completed tender for ${cat} under ${org}.`,
        ministry: "Ministry of Infrastructure",
        organization: org === 'ALL' ? "Public Works Department (PWD)" : org,
        procuringDistrict: district && district !== 'ALL' ? district : 'Dhaka',
        procurementNature: cat.includes('Supply') ? 'Goods' : 'Works',
        awardedBidder: bidder,
        estimatedCostAmt: est,
        contractAmount: est * (1 - disc / 100),
        discountPct: disc,
        awardDate: `2026-0${1 + i}-15`,
        competitorsCount: 6 + i,
        scopeOfWork: `Detailed engineering work scope for simulated contract ${i}.`,
        status: 'Signed',
        procurementMethod: 'OTM'
      };
    });
  }

  const totalTenders = filtered.length;
  let totalTenderValue = 0;
  const bidderMap: { [key: string]: { count: number; value: number } } = {};
  let totalDiscount = 0;

  filtered.forEach(rec => {
    totalTenderValue += rec.contractAmount;
    totalDiscount += rec.discountPct;
    if (!bidderMap[rec.awardedBidder]) {
      bidderMap[rec.awardedBidder] = { count: 0, value: 0 };
    }
    bidderMap[rec.awardedBidder].count += 1;
    bidderMap[rec.awardedBidder].value += rec.contractAmount;
  });

  const bidderBreakdown = Object.entries(bidderMap).map(([bidder, stats]) => ({
    bidder,
    count: stats.count,
    value: stats.value
  })).sort((a, b) => b.count - a.count);

  const uniqueBidders = bidderBreakdown.length;
  let hhi = 0;
  let topBidder = "N/A";
  let topBidderCount = 0;
  let winnerConcentration = 0;

  if (totalTenders > 0) {
    bidderBreakdown.forEach(item => {
      const sharePct = (item.count / totalTenders) * 100;
      hhi += (sharePct * sharePct);
    });
    if (bidderBreakdown[0]) {
      topBidder = bidderBreakdown[0].bidder;
      topBidderCount = bidderBreakdown[0].count;
      winnerConcentration = (topBidderCount / totalTenders) * 100;
    }
  }

  let fairnessScore = 100;
  if (totalTenders === 1) {
    fairnessScore = 78;
  } else {
    fairnessScore = Math.max(12, Math.min(98, Math.round(112 - (hhi / 32))));
  }

  const avgWinningDiscount = totalTenders > 0 ? (totalDiscount / totalTenders) : 5.8;

  let riskRating: 'Low' | 'Medium' | 'High' = 'Low';
  if (fairnessScore < 45) riskRating = 'High';
  else if (fairnessScore < 72) riskRating = 'Medium';

  let analysisText = "";
  if (riskRating === 'High') {
    analysisText = `Flagged High Favoritism Concentration! In ${cat}, this office awards a highly concentrated ${winnerConcentration.toFixed(0)}% of contracts to a single dominant contractor: "${topBidder}". Entering as a newcomer is high-risk unless partnering or quoting heavily optimized discount margins.`;
  } else if (riskRating === 'Medium') {
    analysisText = `Moderate bidding pool concentration detected. While competition is present, established firms like "${topBidder}" hold strong geographical incumbency roots. Quoted bids should stay close to the typical ${avgWinningDiscount.toFixed(1)}% discount corridor to remain viable.`;
  } else {
    analysisText = `Excellent Fairness Index! Contract awards are widely and equitably distributed across ${uniqueBidders} different active bidders. No single contractor dominates this category, signaling a highly transparent, competitive, and welcoming procurement playing field.`;
  }

  return {
    totalTenderValue,
    totalTenders,
    uniqueBidders,
    winnerConcentration,
    topBidder,
    topBidderCount,
    hhi,
    fairnessScore,
    avgWinningDiscount,
    riskRating,
    bidderBreakdown,
    analysisText
  };
};

export default function NoaBidOptimizer({ 
  tenders, 
  currentUser, 
  onUpdateCurrentUser, 
  showToast 
}: NoaBidOptimizerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'search' | 'competitors' | 'fairness' | 'optimizer'>('search');

  // --- TAB 1: NOA SEARCH STATES ---
  const [searchTenderId, setSearchTenderId] = useState('');
  const [searchOrganization, setSearchOrganization] = useState('ALL');
  const [searchDistrict, setSearchDistrict] = useState('ALL');
  const [searchBidder, setSearchBidder] = useState('');
  const [selectedNoa, setSelectedNoa] = useState<NOARecord | null>(mockNoaDataset[0]);

  // Filters results
  const filteredNoas = useMemo(() => {
    return mockNoaDataset.filter(rec => {
      const matchId = !searchTenderId || rec.tenderId.includes(searchTenderId) || rec.id.toLowerCase().includes(searchTenderId.toLowerCase());
      const matchOrg = searchOrganization === 'ALL' || rec.organization.includes(searchOrganization);
      const matchDist = searchDistrict === 'ALL' || rec.procuringDistrict === searchDistrict;
      const matchBidder = !searchBidder || rec.awardedBidder.toLowerCase().includes(searchBidder.toLowerCase());
      return matchId && matchOrg && matchDist && matchBidder;
    });
  }, [searchTenderId, searchOrganization, searchDistrict, searchBidder]);

  // --- TAB 2: COMPETITORS EXTENDED STATES ---
  const [selectedCompetitorName, setSelectedCompetitorName] = useState<string>(mockBidderProfiles[0].name);

  // --- NEW TAB 2.5: PE FAIRNESS STATES ---
  const [selectedFairnessPE, setSelectedFairnessPE] = useState<string>('Public Works Department (PWD)');
  const [selectedFairnessCategory, setSelectedFairnessCategory] = useState<string>('Repair Works');
  const [selectedFairnessDistrict, setSelectedFairnessDistrict] = useState<string>('Dhaka');

  // --- NEW TAB 2.7: TENDER NOTICE-TO-NOA SYNC PREDICTOR STATES ---
  const [syncInputTenderId, setSyncInputTenderId] = useState<string>('1282055');
  const [syncAppliedTenderId, setSyncAppliedTenderId] = useState<string>('1282055');
  const [syncUserDiscount, setSyncUserDiscount] = useState<number>(6.2);
  const [isSyncRunning, setIsSyncRunning] = useState<boolean>(false);
  const [hasSynced, setHasSynced] = useState<boolean>(true);

  // --- TAB 3: OPTIMIZER STATES ---
  const [selectedTenderId, setSelectedTenderId] = useState<string>(tenders[0]?.id || '1282055');
  const [customEstimateStr, setCustomEstimateStr] = useState<string>('5,000,000');
  const [targetMargin, setTargetMargin] = useState<number>(12); // Pct
  const [quotedDiscount, setQuotedDiscount] = useState<number>(5.5); // Pct discount below estimate
  const [calculatedFlag, setCalculatedFlag] = useState<boolean>(false);
  const [isComputing, setIsComputing] = useState<boolean>(false);

  // Custom AI simulator parameters (PE specifc, method specific, category specific)
  const [customPE, setCustomPE] = useState<string>('Public Works Department (PWD)');
  const [customMethod, setCustomMethod] = useState<string>('OTM');
  const [customCategory, setCustomCategory] = useState<string>('Repair Works');

  // checkout flow states
  const [showCheckout, setShowCheckout] = useState<boolean>(false);
  const [checkoutGateway, setCheckoutGateway] = useState<'bKash' | 'Nagad'>('bKash');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  const activeTenderDetail = useMemo(() => {
    return tenders.find(t => t.id === selectedTenderId) || tenders[0];
  }, [selectedTenderId, tenders]);

  // Sync estimate BDT, PE, method, and category when tender changes
  React.useEffect(() => {
    if (activeTenderDetail && selectedTenderId !== 'custom') {
      setCustomEstimateStr(activeTenderDetail.estimatedCostAmt.toLocaleString());
      
      if (activeTenderDetail.organization) {
        setCustomPE(activeTenderDetail.organization);
      }
      
      const rawMethod = activeTenderDetail.procurementMethod || '';
      if (rawMethod.includes('LTM') || rawMethod.toLowerCase().includes('limited')) {
        setCustomMethod('LTM');
      } else if (rawMethod.includes('RFQ') || rawMethod.toLowerCase().includes('quotation')) {
        setCustomMethod('RFQ');
      } else {
        setCustomMethod('OTM');
      }

      const detectedCat = detectCategory(
        activeTenderDetail.packageDescription || activeTenderDetail.projectName || '',
        activeTenderDetail.briefDescription || ''
      );
      setCustomCategory(detectedCat);
    }
  }, [activeTenderDetail, selectedTenderId]);

  const parsedEstimate = useMemo(() => {
    return parseFloat(customEstimateStr.replace(/,/g, '')) || 1000000;
  }, [customEstimateStr]);

  // Trigger simulated optimizer calculation
  const handleRunOptimization = () => {
    setIsComputing(true);
    setTimeout(() => {
      setIsComputing(false);
      setCalculatedFlag(true);
      showToast("Optimized win probability matrices generated successfully!", "success");
    }, 1200);
  };

  // Generate charts data based on target margins/quoted discount, grounded specifically in Selected PE, Method, and Category
  const chartData = useMemo(() => {
    const data = [];
    const baseDiscount = quotedDiscount;
    
    // Fetch background statistics for custom combo
    const comboStats = getFairnessMetrics(customPE, customCategory, 'ALL');
    const benchmarkDiscount = comboStats.avgWinningDiscount; // (e.g., 5.8%)
    
    for (let d = 1; d <= 15; d += 0.5) {
      // Grounded probability curves
      let prob = 5;
      
      if (customMethod === 'LTM') {
        // Limited Tendering has extremely tight target winning discount of 5% (regulated or coordinated)
        const diff = Math.abs(d - 5.0);
        prob = Math.max(8, Math.round(92 - (diff * 22)));
      } else if (customMethod === 'RFQ') {
        // Quotations are low discount contracts (usually 2-4% is optimal)
        const diff = Math.abs(d - 3.2);
        prob = Math.max(5, Math.round(95 - (diff * 25)));
      } else {
        // OTM (Open Tender) has a standard competitive bell curve
        const optimalPoint = benchmarkDiscount + 1.0;
        if (d < optimalPoint) {
          // Under-discounting (Price is too high, competitors easily win)
          const diff = optimalPoint - d;
          prob = Math.max(10, Math.round(85 - (diff * 14)));
        } else {
          // Over-discounting (Rate is extremely low/aggressive)
          const diff = d - optimalPoint;
          // Beyond 10% discount, CPTU regulations flag bid as unworkable rate! Risk of rejection by Engineer increases.
          if (d > 10.0) {
            prob = Math.max(15, Math.round(82 - (diff * 9) - 15)); // Penalize for Rule 112 rate risk
          } else {
            prob = Math.max(40, Math.round(88 - (diff * 7)));
          }
        }
      }
      
      data.push({
        discount: `-${d.toFixed(1)}%`,
        "Win Probability (%)": Math.min(98, Math.max(5, prob)),
      });
    }
    return data;
  }, [quotedDiscount, customPE, customCategory, customMethod]);

  // Premium Unlock Handler
  const handleInitiateUpgrade = (gateway: 'bKash' | 'Nagad') => {
    setCheckoutGateway(gateway);
    setShowCheckout(true);
    setOtpSent(false);
    setOtpCode('');
  };

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length < 11) {
      showToast("Please enter a valid 11-digit mobile number.", "error");
      return;
    }
    setOtpSent(true);
    showToast(`Verification code sent to +880 ${phoneNumber}!`, "info");
  };

  const handleAuthorizeUpgrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 4) {
      showToast("Please enter the 4-digit verification code.", "error");
      return;
    }

    setIsVerifyingPayment(true);
    setTimeout(() => {
      setIsVerifyingPayment(false);
      setShowCheckout(false);

      // Perform state switch
      const upgradedUser: User = {
        ...currentUser,
        subscriptionType: 'premium',
        expiryDate: '2026-12-31'
      };
      
      onUpdateCurrentUser(upgradedUser);
      showToast(`Congratulations! You have upgraded to Core Premium via ${checkoutGateway} successfully. Smart Bid Optimizer fully unlocked!`, "success");
    }, 2000);
  };

  // --- NEW HOOK 2.7.1: SYNC TENDER RECORD MATCH ---
  const syncedTenderResult = useMemo(() => {
    // 1. Search in active live tenders
    const activeMatch = tenders.find(t => t.id === syncAppliedTenderId);
    if (activeMatch) {
      return {
        id: activeMatch.id,
        projectName: activeMatch.packageDescription || activeMatch.projectName || activeMatch.briefDescription,
        organization: activeMatch.organization,
        ministry: activeMatch.ministry,
        procuringDistrict: activeMatch.procuringDistrict || activeMatch.district || 'Dhaka',
        procurementNature: activeMatch.procurementNature || 'Works',
        procurementMethod: activeMatch.procurementMethod || 'Open Tendering Method (OTM)',
        estimatedCostAmt: activeMatch.estimatedCostAmt,
        source: 'Active Tender Notice Database',
        category: detectCategory(activeMatch.packageDescription || activeMatch.projectName, activeMatch.briefDescription),
        scopeOfWork: activeMatch.briefDescription || activeMatch.packageDescription || 'Civil and engineering works as specified by procuring entity.'
      };
    }
    
    // 2. Search in mockNoaDataset for past tender awards
    const pastNoaMatch = mockNoaDataset.find(n => n.tenderId === syncAppliedTenderId);
    if (pastNoaMatch) {
      return {
        id: pastNoaMatch.tenderId,
        projectName: pastNoaMatch.projectName,
        organization: pastNoaMatch.organization,
        ministry: pastNoaMatch.ministry,
        procuringDistrict: pastNoaMatch.procuringDistrict,
        procurementNature: pastNoaMatch.procurementNature,
        procurementMethod: pastNoaMatch.procurementMethod || 'OTM',
        estimatedCostAmt: pastNoaMatch.estimatedCostAmt,
        source: 'Archived e-GP NOA Contract Logs',
        category: detectCategory(pastNoaMatch.projectName, pastNoaMatch.scopeOfWork),
        scopeOfWork: pastNoaMatch.scopeOfWork
      };
    }

    // 3. Fallback procedural generator if user inputs any custom Tender ID
    const seed = parseInt(syncAppliedTenderId) || 123456;
    const districtOptions = ['Dhaka', 'Chittagong', 'Sylhet', 'Gazipur', 'Rajshahi', 'Khulna'];
    const selectedDist = districtOptions[seed % districtOptions.length];
    
    const orgOptions = [
      { name: 'Public Works Department (PWD)', min: 'Ministry of Housing and Public Works' },
      { name: 'Local Government Engineering Department (LGED)', min: 'Ministry of Local Government Rural Development & Co-operatives' },
      { name: 'Bangladesh Water Development Board (BWDB)', min: 'Ministry of Water Resources' }
    ];
    const selectedOrg = orgOptions[seed % orgOptions.length];
    
    const worksCategoryKeywords = [
      { name: 'Repair Works', desc: 'Repairing tile masonry, fitting and fixing toilets, pipe flushing and sanitary fittings.' },
      { name: 'RCC Works', desc: 'RCC drain construction, concrete reinforcement pipeline laying and brick manholes.' },
      { name: 'BFS Herring Bond', desc: 'Sinking flat brick floor soling, subgrade roller compaction, sand filling.' },
      { name: 'BC Works', desc: 'Asphalt bituminous carpeting road overlay, subbase repair works.' },
      { name: 'Renovation', desc: 'Renovation of administrative staff quarters, wall plastering and premium latex painting.' },
      { name: 'Improvement & Construction', desc: 'Construction of vertical office extension, building reinforcement and frame casting.' }
    ];
    const selectedWork = worksCategoryKeywords[seed % worksCategoryKeywords.length];

    return {
      id: syncAppliedTenderId,
      projectName: `Emergency development scheme for ${selectedWork.name} under ${selectedOrg.name} division office.`,
      organization: selectedOrg.name,
      ministry: selectedOrg.min,
      procuringDistrict: selectedDist,
      procurementNature: 'Works',
      procurementMethod: (seed % 3 === 0) ? 'OTM' : (seed % 3 === 1 ? 'LTM' : 'RFQ'),
      estimatedCostAmt: 150000 + (seed % 95000) * 125,
      source: 'External eprocure.gov.bd Synced Notice Notice',
      category: selectedWork.name,
      scopeOfWork: selectedWork.desc
    };
  }, [syncAppliedTenderId, tenders]);

  // --- NEW HOOK 2.7.2: DYNAMIC COMBID-SYNC PREDICTIVE ANALYSIS ---
  const syncAnalysisResult = useMemo(() => {
    const t = syncedTenderResult;
    const cat = t.category;
    const method = t.procurementMethod;
    const dist = t.procuringDistrict;
    const scope = t.scopeOfWork;

    // Fetch live PE favoritism indices
    const peMetric = getFairnessMetrics(t.organization, cat, dist);
    
    // Extract exact detailed "what works are there" checklist based on semantic matching
    const parsedWorkItems: string[] = [];
    const combinedText = (scope + ' ' + t.projectName).toLowerCase();
    
    if (combinedText.includes('toilet') || combinedText.includes('sanitary') || combinedText.includes('plumbing') || combinedText.includes('commode')) {
      parsedWorkItems.push('Plumbing lines & bathroom sanitary fixtures installation');
    }
    if (combinedText.includes('tile') || combinedText.includes('masonry') || combinedText.includes('porcelain')) {
      parsedWorkItems.push('Vitrified anti-skid floor tiles masonry detailing');
    }
    if (combinedText.includes('concrete') || combinedText.includes('rcc') || combinedText.includes('drain') || combinedText.includes('manhole')) {
      parsedWorkItems.push('Reinforced concrete frame casting & structural support');
    }
    if (combinedText.includes('excavation') || combinedText.includes('clearance') || combinedText.includes('silt')) {
      parsedWorkItems.push('Excavated silt suction cleaning and sewage disposal');
    }
    if (combinedText.includes('brick') || combinedText.includes('soling') || combinedText.includes('herring') || combinedText.includes('bfs')) {
      parsedWorkItems.push('Class-A BFS flat brick laying in custom herringbone patterns');
    }
    if (combinedText.includes('asphalt') || combinedText.includes('bituminous') || combinedText.includes('carpeting') || combinedText.includes('pavement')) {
      parsedWorkItems.push('Hot-mix asphalt 40mm bituminous carpeting overlay');
    }
    if (combinedText.includes('solar') || combinedText.includes('battery') || combinedText.includes('photovoltaic')) {
      parsedWorkItems.push('PV solar charge regulators & backup battery arrays calibration');
    }
    if (combinedText.includes('pump') || combinedText.includes('suction') || combinedText.includes('diesel')) {
      parsedWorkItems.push('Heavy duty submersible diesel centrifugal pump setups');
    }
    if (combinedText.includes('paint') || combinedText.includes('plaster') || combinedText.includes('latex')) {
      parsedWorkItems.push('Waterproof outer plastering with premium weather-coat paint');
    }

    if (parsedWorkItems.length === 0) {
      parsedWorkItems.push('Site ground prep & logistical transport coordination');
      parsedWorkItems.push('Local construction hazard safety barrier installations');
    }

    // Grounded Math combination logic
    const avgWinDiscount = peMetric.avgWinningDiscount;
    const currentDiscount = syncUserDiscount;
    let baseChance = 50;
    let methodHelperText = '';

    if (method.includes('LTM')) {
      baseChance = 74;
      methodHelperText = 'LTM is geographically restricted, capping total bidder entries.';
    } else if (method.includes('RFQ')) {
      baseChance = 78;
      methodHelperText = 'RFQ uses direct invitation parameters, leading to highly optimized pricing pools.';
    } else {
      baseChance = 42;
      methodHelperText = 'OTM has fully open enrollment, maximizing standard competitive rivalries.';
    }

    // Geolocation / District modifier
    let distMultiplier = 1.0;
    if (dist === 'Dhaka') distMultiplier = 0.88;
    else if (dist === 'Chittagong') distMultiplier = 0.94;
    else distMultiplier = 1.06;

    // PE favoritism risk impact
    let favoritismDiff = 0;
    if (peMetric.riskRating === 'High') {
      favoritismDiff = -22;
    } else if (peMetric.riskRating === 'Medium') {
      favoritismDiff = -8;
    } else {
      favoritismDiff = +6;
    }

    // Discount proximity bell curve matching e-GP signatures
    let pricingModifier = 0;
    if (method.includes('LTM')) {
      const diffLTM = Math.abs(currentDiscount - 5.0);
      pricingModifier = Math.max(-45, 20 - (diffLTM * 24));
    } else if (method.includes('RFQ')) {
      const diffRFQ = Math.abs(currentDiscount - 3.2);
      pricingModifier = Math.max(-45, 20 - (diffRFQ * 26));
    } else {
      const offset = currentDiscount - avgWinDiscount;
      if (offset < 0) {
        pricingModifier = offset * 18; // Heavy penalty for bidding too high
      } else {
        if (currentDiscount > 10.0) {
          pricingModifier = 20 - (currentDiscount - 10.0) * 12; // Penalize rate risk
        } else {
          pricingModifier = Math.max(0, 30 - (offset * 6)); // Sweet spot
        }
      }
    }

    const calculatedProbability = Math.min(98, Math.max(5, Math.round((baseChance + favoritismDiff + pricingModifier) * distMultiplier)));

    const dominantBuilders = peMetric.bidderBreakdown.map(b => b.bidder).slice(0, 3);
    if (dominantBuilders.length === 0) {
      dominantBuilders.push('Rahman & Sons Co.');
      dominantBuilders.push('Anwar Construction Co.');
    }

    return {
      probabilityPercent: calculatedProbability,
      peFavoritismRating: peMetric.riskRating,
      hhiScore: peMetric.hhi,
      avgWinDiscount,
      methodHelperText,
      parsedWorkItems,
      dominantBuilders,
      rawScope: scope
    };
  }, [syncedTenderResult, syncUserDiscount]);

  const handleTriggerSync = (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncInputTenderId || syncInputTenderId.trim() === '') {
      showToast("Please enter a valid e-GP Tender ID.", "error");
      return;
    }
    setIsSyncRunning(true);
    setHasSynced(false);
    setTimeout(() => {
      setIsSyncRunning(false);
      setHasSynced(true);
      setSyncAppliedTenderId(syncInputTenderId.trim());
      showToast(`e-GP Tender ID #${syncInputTenderId} successfully matched with past award database! Notice-to-NOA sync analysis compiled.`, "success");
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans text-slate-800">
      {/* Visual Title Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full translate-x-8 -translate-y-8 blur-2xl"></div>
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-250 text-emerald-800 px-3 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider uppercase">
            <Award className="w-3 h-3 text-emerald-600 shrink-0" />
            eprocure.gov.bd Award Intelligence
          </div>
          <h2 className="text-xl font-display text-primary font-black uppercase tracking-tight">
            NOA Analytics & Smart Bid Optimizer
          </h2>
          <p className="text-slate-500 text-xs max-w-xl">
            Leverage Notifications of Award (NOA) logs to decrypt competitors' historic pricing. Avoid margins suicide or losing high-potential packages.
          </p>
        </div>
        
        {/* Metric badge highlighting monetization value */}
        <div className="bg-slate-50 border border-slate-205 p-3 rounded-xl shrink-0 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center border border-emerald-150">
            <Coins className="w-5 h-5 text-emerald-700" />
          </div>
          <div className="text-left font-mono text-xs">
            <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wide">Historical Win Rate Improvement</span>
            <strong className="text-sm font-black text-slate-800">+24.5% Avg Yield</strong>
          </div>
        </div>
      </div>

      {/* Tabs list bar */}
      <div className="flex border-b border-slate-200 p-0.5 bg-slate-100/60 rounded-xl max-w-5xl flex-wrap gap-1">
        {[
          { id: 'search', label: 'Award Search (SearchNOA)', icon: Search },
          { id: 'competitors', label: 'True Success Rates', icon: Users },
          { id: 'fairness', label: 'PE Favoritism Analysis', icon: Landmark },
          { id: 'tenderSync', label: 'Bid Sync & Win Predictor', icon: Layers },
          { id: 'optimizer', label: 'Smart Winning Bid Predictor', icon: Calculator }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold font-mono tracking-tight transition-all cursor-pointer flex-1 justify-center whitespace-nowrap min-w-[160px] ${
                isActive 
                  ? 'bg-white text-primary shadow-sm border border-slate-200/50' 
                  : 'text-slate-650 hover:text-black hover:bg-white/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* RENDER ACTIVE TAB */}
      
      {/* SUBTAB 1: NOA DATABASE SEARCH PAGE */}
      {activeSubTab === 'search' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
          {/* SEARCH FILTERS CONTAINER (LEFT SIDE) */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 font-sans self-start">
            <h3 className="text-xs font-bold text-[#1e293b] font-display uppercase tracking-wider border-b border-slate-100 pb-2">
              Search parameters (SearchNOA.jsp)
            </h3>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Tender ID or Contract ID</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">#</span>
                  <input
                    type="text"
                    value={searchTenderId}
                    onChange={(e) => setSearchTenderId(e.target.value)}
                    placeholder="e.g. 1282055, 9921"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Procuring Entity / Agency</label>
                <select
                  value={searchOrganization}
                  onChange={(e) => setSearchOrganization(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer h-9"
                >
                  <option value="ALL">All Entities</option>
                  <option value="PWD">PWD - Public Works</option>
                  <option value="LGED">LGED - Local Government</option>
                  <option value="BWDB">BWDB - Water Development</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">District Location</label>
                <select
                  value={searchDistrict}
                  onChange={(e) => setSearchDistrict(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer h-9"
                >
                  <option value="ALL">All Districts</option>
                  <option value="Dhaka">Dhaka</option>
                  <option value="Chittagong">Chittagong</option>
                  <option value="Sylhet">Sylhet</option>
                  <option value="Gazipur">Gazipur</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Awarded Bidder Name</label>
                <input
                  type="text"
                  value={searchBidder}
                  onChange={(e) => setSearchBidder(e.target.value)}
                  placeholder="e.g. Spectra, Rahman, Anwar"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3-5 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 border-dashed"
                />
              </div>

              <button
                onClick={() => {
                  setSearchTenderId('');
                  setSearchOrganization('ALL');
                  setSearchDistrict('ALL');
                  setSearchBidder('');
                  showToast("Cleared filters successfully", "info");
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-mono font-bold tracking-wider text-[10px] py-2 px-3.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all uppercase"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear Search Fields
              </button>
            </div>
          </div>

          {/* SEARCH RESULTS LIST AND DETAIL VIEWER */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
                <h3 className="text-xs font-bold text-slate-800 font-display uppercase tracking-wider">
                  Notifications of Award matched ({filteredNoas.length})
                </h3>
                <span className="text-[10px] font-mono text-slate-400">Bangladesh e-GP Database</span>
              </div>

              {filteredNoas.length === 0 ? (
                <div className="py-12 text-center text-slate-450 border border-slate-100 rounded-xl bg-slate-50/55 font-mono text-[11px]">
                  No past Awards (NOAs) found matching the specified parameters.
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {filteredNoas.map((rec) => {
                    const isSelected = selectedNoa?.id === rec.id;
                    return (
                      <div
                        key={rec.id}
                        onClick={() => setSelectedNoa(rec)}
                        className={`p-3.5 rounded-xl border transition-all text-xs text-left cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isSelected 
                            ? 'bg-slate-50 border-indigo-500 shadow-xs translate-x-1' 
                            : 'bg-white hover:bg-slate-50/50 border-slate-150'
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[9px] text-[#475569] font-black uppercase">
                              Tender ID: {rec.tenderId}
                            </span>
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-150 text-[8px] px-1.5 py-0.5 rounded font-black font-mono">
                              -{rec.discountPct.toFixed(1)}% Discount
                            </span>
                            <span className="text-[8px] text-slate-400 font-mono font-bold capitalize">
                              • {rec.procurementNature}
                            </span>
                          </div>
                          <span className="font-bold text-slate-800 text-[11.5px] block truncate">
                            {rec.projectName}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono truncate block">
                            PE Office: {rec.organization} ({rec.procuringDistrict})
                          </span>
                        </div>

                        <div className="text-left sm:text-right shrink-0 flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-end gap-1 font-mono">
                          <div className="text-xs font-black text-indigo-700">
                            ৳ {(rec.contractAmount / 100000).toFixed(2)} Lac
                          </div>
                          <span className="text-[9px] text-slate-400 block shrink-0">{rec.awardDate}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* DETAILED AWARD SHEET BOX */}
            {selectedNoa && (
              <div className="bg-slate-950 text-slate-200 border border-slate-850 rounded-2xl overflow-hidden shadow-xl text-left font-sans animate-fadeIn">
                {/* Header title */}
                <div className="bg-slate-900 border-b border-slate-800/80 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-mono text-slate-400">e-GP Contract ID: <strong>{selectedNoa.id}</strong></span>
                  </div>
                  <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                    Official Signed
                  </span>
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-6">
                  {/* Bangladesh Seal imitation block */}
                  <div className="text-center space-y-1.5 border-b border-slate-800/60 pb-5">
                    <h4 className="text-xs uppercase font-mono tracking-widest text-slate-400 font-black">Notification of Award Summary</h4>
                    <span className="text-[10px] text-[#94a3b8] block">Section-74 e-GP Procurement Protocol 2008</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-xs font-sans">
                    <div className="space-y-1 text-left">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Procuring Entity</span>
                      <strong className="text-slate-100 text-[11px] block">{selectedNoa.organization}</strong>
                      <span className="text-slate-400 block text-[9px]">{selectedNoa.ministry}</span>
                    </div>

                    <div className="space-y-1 text-left">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Awarded Bidder Contractor</span>
                      <strong className="text-emerald-400 text-sm font-black flex items-center gap-1.5 leading-none">
                        <ShieldCheck className="w-4 h-4" />
                        {selectedNoa.awardedBidder}
                      </strong>
                    </div>

                    <div className="space-y-1 text-left border-t border-slate-800/40 pt-3.5">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Official Estimated Cost</span>
                      <strong className="text-slate-300 font-mono text-[11px] block">৳ {selectedNoa.estimatedCostAmt.toLocaleString()} BDT</strong>
                    </div>

                    <div className="space-y-1 text-left border-t border-slate-800/40 pt-3.5">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Contract Awarded Value</span>
                      <strong className="text-white text-base font-black font-mono leading-none block">
                        ৳ {selectedNoa.contractAmount.toLocaleString()} BDT
                      </strong>
                      <span className="text-slate-400 font-mono text-[9px] mt-0.5 block leading-tight">
                        Saved ৳ {(selectedNoa.estimatedCostAmt - selectedNoa.contractAmount).toLocaleString()} below estimate (-{selectedNoa.discountPct.toFixed(2)}%)
                      </span>
                    </div>

                    <div className="md:col-span-2 space-y-1 text-left border-t border-slate-800/40 pt-3.5">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Contract Project Name</span>
                      <p className="text-[#cbd5e1] text-[11.5px] leading-relaxed font-sans">{selectedNoa.projectName}</p>
                    </div>

                    <div className="md:col-span-2 space-y-1 text-left border-t border-slate-800/40 pt-3.5">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Specific Scope of Engineering Work Executed</span>
                      <p className="text-slate-400 text-[10.5px] leading-relaxed font-sans italic">{selectedNoa.scopeOfWork}</p>
                    </div>

                    {/* DYNAMIC METADATA FROM RURAL SANITATION / SPECIALIZED REAL-LIFE NOAs */}
                    {selectedNoa.packageName && (
                      <div className="md:col-span-2 space-y-1 text-left border-t border-slate-800/40 pt-3.5">
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Official e-GP Package Details</span>
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 mt-1">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-slate-400 block text-[9.5px]">Package Number:</span>
                              <strong className="text-slate-100 font-mono text-[11px]">{selectedNoa.packageNo || "N/A"}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9.5px]">Budget & Funding Source:</span>
                              <strong className="text-slate-100 font-sans text-[11px]">{selectedNoa.budgetType || "General Budget"}</strong>
                            </div>
                          </div>
                          <div className="pt-2 border-t border-slate-800 text-xs">
                            <span className="text-slate-400 block text-[9.5px]">Full Package Specification Name:</span>
                            <p className="text-slate-200 text-[11px] font-medium leading-relaxed font-sans">{selectedNoa.packageName}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {(selectedNoa.advertisementDate || selectedNoa.signingDate || selectedNoa.proposedStart) && (
                      <div className="md:col-span-2 space-y-1 text-left border-t border-slate-800/40 pt-3.5">
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Official Project Delivery Lifecycle Timeline</span>
                        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 mt-1">
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center sm:text-left">
                            <div>
                              <span className="text-slate-500 block text-[8.5px] uppercase font-mono">Advertised</span>
                              <strong className="text-slate-200 font-mono text-[10.5px]">{selectedNoa.advertisementDate || "N/A"}</strong>
                            </div>
                            <div>
                              <span className="text-emerald-500 block text-[8.5px] uppercase font-mono">Award Issued</span>
                              <strong className="text-emerald-300 font-mono text-[10.5px]">{selectedNoa.awardDate}</strong>
                            </div>
                            <div>
                              <span className="text-indigo-400 block text-[8.5px] uppercase font-mono">Contract Signed</span>
                              <strong className="text-indigo-200 font-mono text-[10.5px]">{selectedNoa.signingDate || "N/A"}</strong>
                            </div>
                            <div>
                              <span className="text-amber-400 block text-[8.5px] uppercase font-mono">Commences</span>
                              <strong className="text-amber-200 font-mono text-[10.5px]">{selectedNoa.proposedStart || "N/A"}</strong>
                            </div>
                            <div>
                              <span className="text-rose-400 block text-[8.5px] uppercase font-mono">Completion</span>
                              <strong className="text-rose-300 font-mono text-[10.5px]">{selectedNoa.proposedCompletion || "N/A"}</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {(selectedNoa.contractorTendererId || selectedNoa.contractorBeneficialOwner) && (
                      <div className="md:col-span-2 space-y-1 text-left border-t border-slate-800/40 pt-3.5">
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Licensed Contractor Profile (e-GP Verified Ledger)</span>
                        <div className="bg-slate-900 border border-slate-800/85 rounded-xl p-4 mt-1 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-slate-400 block text-[9.5px]">Contractor Business Name:</span>
                              <strong className="text-emerald-450 font-sans text-[12.5px] font-extrabold">{selectedNoa.awardedBidder}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9.5px]">Tenderer ID Profile Code:</span>
                              <strong className="text-indigo-300 font-mono text-[12px] font-black">#{selectedNoa.contractorTendererId}</strong>
                            </div>
                          </div>
                          
                          <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-slate-400 block text-[9.5px]">Beneficial Owner & Stake Breakdown:</span>
                              <strong className="text-slate-100 font-sans text-[11px]">{selectedNoa.contractorBeneficialOwner || "N/A"}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9.5px]">Authorized Cleared Officer:</span>
                              <strong className="text-slate-100 font-sans text-[11px]">{selectedNoa.authorisedOfficer || "N/A"}</strong>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-800 text-xs">
                            <span className="text-slate-400 block text-[9.5px]">Corporate Registered Business Address:</span>
                            <p className="text-slate-300 text-[10.5px] font-sans leading-relaxed mt-0.5">{selectedNoa.contractorAddress || "N/A"}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-800/60 pt-4 font-mono text-[10px] text-slate-500 flex flex-wrap justify-between items-center gap-2">
                    <span>Award Authorized Date: <strong>{selectedNoa.awardDate}</strong></span>
                    <span>Evaluation Competitors: <strong>{selectedNoa.competitorsCount} Firms Bidded</strong></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: COMPETITOR INTELLIGENCE MODULE */}
      {activeSubTab === 'competitors' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm text-left">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-4 mb-6">
              <div className="space-y-1 flex-1">
                <h3 className="text-sm font-black text-slate-900 font-display uppercase tracking-wider">
                  Contractor Profiles & True Success Rate Intelligence
                </h3>
                <p className="text-slate-500 text-xs">
                  Review the Bangladesh e-GP bidding register to examine competitor histories, won-to-bid ratios, and spatial focus areas.
                </p>
              </div>
              <div className="bg-emerald-50 border border-emerald-150 px-3 py-1.5 rounded-lg flex items-center gap-2 self-start lg:self-center">
                <Gauge className="w-3.5 h-3.5 text-emerald-600 animate-pulse shrink-0" />
                <span className="text-[11px] font-mono font-bold text-emerald-800">
                  e-GP Log Source: Verified
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* LEFT SIDE: CONTRACTOR LIST */}
              <div className="lg:col-span-5 space-y-3 max-h-[500px] overflow-y-auto pr-2">
                <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block mb-1">Registered Contractors ({mockBidderProfiles.length})</span>
                {mockBidderProfiles.map((b, idx) => {
                  const isSelected = selectedCompetitorName === b.name;
                  const winRate = (b.wonCount / b.bidCount) * 100;
                  return (
                    <div 
                      key={idx}
                      onClick={() => setSelectedCompetitorName(b.name)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left relative overflow-hidden group ${
                        isSelected 
                          ? 'bg-[#1e293b] text-white border-[#1e293b] shadow-md scale-[1.01]' 
                          : 'bg-slate-50 hover:bg-slate-105 text-slate-850 border-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-xs font-sans tracking-tight line-clamp-1">{b.name}</h4>
                          <div className={`p-0.5 px-2 rounded text-[8.5px] font-mono font-bold w-fit ${
                            isSelected ? 'bg-slate-800 text-slate-300' : 'bg-slate-200/80 text-slate-600'
                          }`}>
                            {b.tier} • {b.topDistrict}
                          </div>
                        </div>
                        <span className={`text-[10px] font-mono font-black shrink-0 ${
                          winRate > 20 ? 'text-emerald-500' : 'text-indigo-400'
                        }`}>
                          {winRate.toFixed(1)}% Win Rate
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center mt-3 pt-2 border-t border-dashed border-current/10 font-mono text-[9px] opacity-80">
                        <span>Bids Won: <strong>{b.wonCount}</strong></span>
                        <span>Avg Discount: <strong>-{b.avgDiscount}%</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* RIGHT SIDE: COMPLEX ANALYTICAL DETAIL REPORT */}
              <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-6">
                {(() => {
                  const comp = mockBidderProfiles.find(b => b.name === selectedCompetitorName) || mockBidderProfiles[0];
                  const winRate = (comp.wonCount / comp.bidCount) * 100;
                  const lossCount = comp.bidCount - comp.wonCount;
                  
                  // Dynamic PE specific win breakdown matching e-GP realism
                  const lgedWins = Math.round(comp.wonCount * 0.45);
                  const pwdWins = Math.round(comp.wonCount * 0.35);
                  const bwdbWins = Math.max(0, comp.wonCount - lgedWins - pwdWins);

                  return (
                    <div className="space-y-6 text-left">
                      {/* Name Card */}
                      <div className="flex justify-between items-start border-b border-slate-200 pb-4 gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono font-black text-indigo-600 uppercase tracking-widest block leading-none">Contractor True Success Audit</span>
                          <h4 className="text-sm font-black text-[#1e293b] font-display">{comp.name}</h4>
                          <p className="text-slate-500 text-xs">
                            Active since 2021. Primary Operation: <strong className="text-slate-800">{comp.topDistrict} District</strong>.
                          </p>
                        </div>
                        <span className="bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider shrink-0 font-mono">
                          {comp.tier} Tier
                        </span>
                      </div>

                      {/* True Success Circle and Stat grid */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        {/* Circular Success Diagram */}
                        <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-2xl relative shadow-xs">
                          <div className="relative w-28 h-28 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90">
                              <circle 
                                cx="56" 
                                cy="56" 
                                r="44" 
                                className="stroke-slate-100 fill-none" 
                                strokeWidth="7"
                              />
                              <circle 
                                cx="56" 
                                cy="56" 
                                r="44" 
                                className="stroke-indigo-650 fill-none transition-all duration-1000" 
                                strokeWidth="7"
                                strokeDasharray="276"
                                strokeDashoffset={276 - (276 * winRate) / 100}
                              />
                            </svg>
                            <span className="absolute text-xs font-black text-slate-850 font-mono">
                              {winRate.toFixed(1)}%
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mt-3">True Success Ratio</span>
                        </div>

                        {/* Standard Stats Details */}
                        <div className="md:col-span-7 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-white border border-slate-200 rounded-xl font-mono text-left">
                              <span className="text-[8px] text-slate-400 font-bold block uppercase leading-none">Contracts Placed</span>
                              <strong className="text-xs font-black text-slate-800 block mt-1">{comp.bidCount} Bids</strong>
                            </div>
                            <div className="p-3 bg-white border border-slate-200 rounded-xl font-mono text-left">
                              <span className="text-[8px] text-slate-400 font-bold block uppercase leading-none">Contracts Won</span>
                              <strong className="text-xs font-black text-emerald-600 block mt-1">{comp.wonCount} Awards</strong>
                            </div>
                          </div>

                          <div className="p-3 bg-white border border-slate-200 rounded-xl font-sans space-y-1.5 text-left text-xs text-slate-600">
                            <div className="flex justify-between items-center text-[11px]">
                              <span>Win Probability:</span>
                              <strong className="font-mono text-slate-800">{winRate.toFixed(1)}%</strong>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                              <span>Rejection/Loss Ratio:</span>
                              <strong className="font-mono text-slate-850">{((lossCount / comp.bidCount) * 100).toFixed(1)}% ({lossCount} losses)</strong>
                            </div>
                            <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-slate-100">
                              <span>Typical Bid Discount:</span>
                              <strong className="font-mono text-indigo-650">-{comp.avgDiscount.toFixed(1)}% off estimate</strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* PE-Specific Win-Loss Breakdown & Procurement Method Analysis */}
                      <div className="space-y-4">
                        <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block">PE Agency Penetration Summary</span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* LGED Box */}
                          <div className="bg-white border border-slate-200 rounded-xl p-3 text-left">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              <span className="text-[10px] font-mono font-bold text-slate-800">LGED Project</span>
                            </div>
                            <span className="text-[9px] text-slate-500 block">Wins: <strong>{lgedWins} awarded</strong></span>
                            <span className="text-[9px] text-slate-500 block">Avg: <strong className="text-emerald-700">-{comp.avgDiscount.toFixed(1)}%</strong></span>
                          </div>

                          {/* PWD Box */}
                          <div className="bg-white border border-slate-200 rounded-xl p-3 text-left">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                              <span className="text-[10px] font-mono font-bold text-slate-800">PWD Project</span>
                            </div>
                            <span className="text-[9px] text-slate-500 block">Wins: <strong>{pwdWins} awarded</strong></span>
                            <span className="text-[9px] text-slate-500 block">Avg: <strong className="text-indigo-700">-{Math.max(3.0, comp.avgDiscount - 1.0).toFixed(1)}%</strong></span>
                          </div>

                          {/* BWDB Box */}
                          <div className="bg-white border border-slate-200 rounded-xl p-3 text-left">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                              <span className="text-[10px] font-mono font-bold text-slate-800">BWDB Project</span>
                            </div>
                            <span className="text-[9px] text-slate-500 block">Wins: <strong>{bwdbWins} awarded</strong></span>
                            <span className="text-[9px] text-slate-500 block">Avg: <strong className="text-yellow-700">-{Math.max(3.2, comp.avgDiscount + 0.6).toFixed(1)}%</strong></span>
                          </div>
                        </div>

                        {/* Success metrics per method */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 font-sans">
                          <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-wide block">Bid Win Rates by Procurement Method</span>
                          
                          <div className="space-y-2 text-xs text-slate-600">
                            {/* OTM Success */}
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="font-semibold text-slate-700">OTM (Open Tendering Method - High Rivalry):</span>
                                <strong className="font-mono text-indigo-700">{Math.max(5, Math.round(winRate * 0.85))}% Ratio</strong>
                              </div>
                              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                                <div className="bg-indigo-600 h-full rounded" style={{ width: `${Math.max(5, Math.round(winRate * 0.85))}%` }}></div>
                              </div>
                            </div>

                            {/* LTM Success */}
                            <div className="space-y-1 pt-1">
                              <div className="flex justify-between">
                                <span className="font-semibold text-slate-700">LTM (Limited Tendering Method - Area Caps):</span>
                                <strong className="font-mono text-emerald-700">{Math.min(99, Math.round(winRate * 1.45))}% Ratio</strong>
                              </div>
                              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                                <div className="bg-emerald-600 h-full rounded" style={{ width: `${Math.min(99, Math.round(winRate * 1.45))}%` }}></div>
                              </div>
                            </div>

                            {/* RFQ Success */}
                            <div className="space-y-1 pt-1">
                              <div className="flex justify-between">
                                <span className="font-semibold text-slate-700">RFQ (Request for Quotations - Swift Quotation):</span>
                                <strong className="font-mono text-slate-800">{Math.min(99, Math.round(winRate * 1.25))}% Ratio</strong>
                              </div>
                              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                                <div className="bg-slate-400 h-full rounded" style={{ width: `${Math.min(99, Math.round(winRate * 1.25))}%` }}></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bidder Strategy Insight summary */}
                        <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl text-left">
                          <div className="flex gap-2.5 items-start text-xs text-indigo-900">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block font-bold">AI Competitor Strategy Summary:</strong>
                              <p className="text-slate-600 text-[11px] leading-relaxed mt-0.5 font-normal">
                                "{comp.name}" behaves with highly localized geographic patterns. They prioritize bidding in {comp.topDistrict} using {comp.avgDiscount > 6.5 ? "aggressive price-drop OTM strategies" : "conservative high-yielding quotes"}. They historically partner with local brick suppliers to optimize BFS Soling bids.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* PAST AWARDS LEDGER */}
                        <div className="space-y-4 pt-3 border-t border-slate-200">
                          <div className="flex justify-between items-center text-left">
                            <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block leading-none">Past e-GP Bid Win History</span>
                            <span className="text-[9px] font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                              {mockNoaDataset.filter(n => n.awardedBidder.toLowerCase() === comp.name.toLowerCase()).length} Verified Awards
                            </span>
                          </div>

                          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                            {(() => {
                              const contractorAwards = mockNoaDataset.filter(
                                n => n.awardedBidder.toLowerCase() === comp.name.toLowerCase()
                              );
                              if (contractorAwards.length === 0) {
                                return (
                                  <div className="text-center py-6 text-slate-400 font-mono text-[10.5px] border border-dashed border-slate-200 bg-slate-50/50 rounded-xl leading-relaxed italic text-left">
                                    No direct tenders listed in primary records. Check active logs for other district evaluations.
                                  </div>
                                );
                              }
                              return contractorAwards.map((award, aIdx) => (
                                <div key={aIdx} className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-slate-350 transition-colors text-left">
                                  <div className="space-y-1 text-left min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap text-left">
                                      <span className="text-[9px] font-mono font-black text-indigo-700 uppercase bg-indigo-50 px-1.5 py-0.5 rounded leading-none">ID #{award.tenderId}</span>
                                      <span className="text-[9px] text-slate-400 font-mono font-bold">• {award.awardDate}</span>
                                      <span className="text-[9px] bg-emerald-50 text-emerald-800 font-mono font-bold px-1.5 py-0.5 rounded shrink-0">-{award.discountPct}% rate</span>
                                    </div>
                                    <strong className="text-[11px] font-bold text-slate-800 line-clamp-1 block leading-tight text-left">{award.projectName}</strong>
                                    <span className="text-[10px] text-slate-500 block leading-tight text-left">Entity: {award.organization} ({award.procuringDistrict})</span>
                                  </div>
                                  <div className="font-mono text-left sm:text-right shrink-0">
                                    <div className="text-[11px] font-black text-slate-700">৳ {(award.contractAmount / 100000).toFixed(2)} Lac</div>
                                    <span className="text-[9px] text-[#059669] font-bold font-sans">L1 Winner</span>
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW SUBTAB 2.5: PE FAVORITISM & FAIRNESS ANALYSIS */}
      {activeSubTab === 'fairness' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm text-left">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-4 mb-6">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900 font-display uppercase tracking-wider flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-indigo-600 shrink-0" />
                  PE Favoritism & Bidding Fairness Index
                </h3>
                <p className="text-slate-505 text-xs">
                  Run dynamic semantic keyword checks on e-GP awards to audit whether a Procuring Entity (PE) favors standard bidders for specific categories of works or goods.
                </p>
              </div>
              <div className="bg-indigo-50 border border-indigo-150 px-3 py-1.5 rounded-lg flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse shrink-0" />
                <span className="text-[11px] font-mono font-bold text-indigo-800">
                  AI Semantic Audit Active
                </span>
              </div>
            </div>

            {/* SELECTION ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl mb-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">1. Target Procuring Entity</label>
                <select
                  value={selectedFairnessPE}
                  onChange={(e) => setSelectedFairnessPE(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-850 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="Public Works Department (PWD)">Public Works Department (PWD)</option>
                  <option value="Local Government Engineering Department (LGED)">Local Government Engineering Department (LGED)</option>
                  <option value="Bangladesh Water Development Board (BWDB)">Bangladesh Water Development Board (BWDB)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">2. Category (Works / Goods Keywords)</label>
                <select
                  value={selectedFairnessCategory}
                  onChange={(e) => setSelectedFairnessCategory(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-850 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <optgroup label="Works categories">
                    <option value="Repair Works">Repair & Sanitary Works (clean, repair, toilets)</option>
                    <option value="RCC Works">RCC Works (concrete, drain, manholes, columns)</option>
                    <option value="BFS Herring Bond">BFS Herring Bond Roads (brick flat soling, soling)</option>
                    <option value="BC Works">BC Works (asphalt, bituminous, road carpeting)</option>
                    <option value="Renovation">Renovation segment (quarters, paint, ceiling)</option>
                    <option value="Improvement & Construction">Improvement & Construction (extension, building)</option>
                  </optgroup>
                  <optgroup label="Goods categories">
                    <option value="Stationary Supply">Stationary Supply (paper, folder, printing, ink)</option>
                    <option value="Electronics Supply">Electronics Supply (computer, local server, network)</option>
                    <option value="Solar Supply">Solar Supply (solar panel, hybrid backup generator)</option>
                    <option value="Equipment Supply">Equipment Supply (centrifugal pump, ac units, diesel)</option>
                  </optgroup>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">3. Division / District Location</label>
                <select
                  value={selectedFairnessDistrict}
                  onChange={(e) => setSelectedFairnessDistrict(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-850 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="ALL">All Districts Combined</option>
                  <option value="Dhaka">Dhaka Division</option>
                  <option value="Chittagong">Chittagong Division</option>
                  <option value="Sylhet">Sylhet Division</option>
                  <option value="Gazipur">Gazipur Division</option>
                </select>
              </div>
            </div>

            {/* DYNAMIC METRICS OUTPUT PANEL */}
            {(() => {
              const metrics = getFairnessMetrics(selectedFairnessPE, selectedFairnessCategory, selectedFairnessDistrict);
              return (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* LEFT DETAIL CARD: FAIRNESS SCORE */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white text-left relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full translate-x-10 -translate-y-10 blur-xl"></div>
                      
                      <span className="text-[9px] font-mono font-black text-indigo-400 uppercase tracking-widest block leading-none">PE Concentrated Index</span>
                      
                      {/* Circle Score Gauge */}
                      <div className="flex items-center gap-6 mt-4">
                        <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                          <svg className="w-full h-full -rotate-90">
                            <circle 
                              cx="48" 
                              cy="48" 
                              r="38" 
                              className="stroke-slate-800 fill-none" 
                              strokeWidth="6"
                            />
                            <circle 
                              cx="48" 
                              cy="48" 
                              r="38" 
                              className={`fill-none transition-all duration-1000 ${
                                metrics.fairnessScore > 75 
                                  ? 'stroke-emerald-450' 
                                  : metrics.fairnessScore > 50 
                                    ? 'stroke-yellow-450' 
                                    : 'stroke-red-500'
                              }`}
                              strokeWidth="6"
                              strokeDasharray="238"
                              strokeDashoffset={238 - (238 * metrics.fairnessScore) / 100}
                            />
                          </svg>
                          <span className="absolute text-sm font-black font-mono text-white">
                            {metrics.fairnessScore}
                          </span>
                        </div>

                        <div className="space-y-1 text-left">
                          <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-wide">Risk Classification:</span>
                          <span className={`text-xs font-black uppercase px-2 py-0.5 rounded border inline-block select-all leading-none ${
                            metrics.riskRating === 'Low' 
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-450' 
                              : metrics.riskRating === 'Medium'
                                ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300'
                                : 'bg-red-500/15 border-red-500/30 text-red-405 animate-pulse'
                          }`}>
                            {metrics.riskRating} Favoritism Risk
                          </span>
                          <span className="text-[10px] text-slate-400 block pt-1">
                            HHI Index: <strong>{Math.round(metrics.hhi)} pts</strong>
                          </span>
                        </div>
                      </div>

                      {/* Summary Analysis Area */}
                      <div className="mt-5 border-t border-slate-850 pt-4 text-xs font-sans text-slate-300 leading-relaxed font-normal">
                        {metrics.analysisText}
                      </div>
                    </div>

                    {/* Standard historical bid margin corridor */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 text-left font-mono space-y-3 shadow-xs">
                      <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-wide block">Bid Discount Corridor</span>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-left font-mono">
                          <span className="text-[8px] text-slate-450 font-bold block uppercase leading-none">Avg Won Discount</span>
                          <strong className="text-sm font-black text-[#059669] block mt-1">-{metrics.avgWinningDiscount.toFixed(2)}%</strong>
                        </div>
                        <div className="text-left font-mono">
                          <span className="text-[8px] text-slate-450 font-bold block uppercase leading-none">Pool Diversification</span>
                          <strong className="text-sm font-black text-indigo-600 block mt-1">{metrics.uniqueBidders} Bidders</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT SIDE DETAIL PANEL: REGISTER SUMMARY OF ALL WINNING ALLOCATIONS */}
                  <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
                      <span className="text-xs font-black text-slate-900 font-sans uppercase">Award Distributions on {selectedFairnessCategory}</span>
                      <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono text-[9px] font-black uppercase">
                        History: {metrics.totalTenders} Awards
                      </span>
                    </div>

                    <div className="max-h-60 overflow-y-auto pr-1">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-slate-100 text-[9px] font-mono font-black text-slate-400 uppercase tracking-wider">
                            <th className="py-2">Contractor Name</th>
                            <th className="py-2 text-center">Won Projects</th>
                            <th className="py-2 text-right">Aggregate Amount</th>
                            <th className="py-2 text-right">Volume Share</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {metrics.bidderBreakdown.map((row, idx) => {
                            const pct = ((row.count / metrics.totalTenders) * 100).toFixed(0);
                            return (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="py-2.5 pr-2 font-semibold text-[#1e293b] select-all">{row.bidder}</td>
                                <td className="py-2.5 text-center font-mono font-bold text-slate-600">{row.count}</td>
                                <td className="py-2.5 text-right font-mono font-extrabold text-[#4f46e5]">৳ {(row.value / 100000).toFixed(1)} Lac</td>
                                <td className="py-2.5 text-right font-mono text-slate-500">{pct}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Cartels risk detection details */}
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <div className="flex gap-2.5 items-start text-xs text-slate-600">
                        <Info className="w-4 h-4 text-slate-450 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-[#1e293b] font-bold">Bangladesh Central Procurement Technical Unit (CPTU) Advice:</strong>
                          <p className="text-[11px] leading-relaxed mt-0.5 font-normal">
                            Under e-GP guidelines, PE-specific concentrations could indicate cartel agreements or customized tender specifications designed around particular builder portfolios. In high risk areas, bidder optimization requires strict cost-accuracy to win over political incumbents.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })()}

          </div>
        </div>
      )}

      {/* NEW SUBTAB 2.7: TENDER NOTICE-TO-NOA SYNC PREDICTOR */}
      {activeSubTab === 'tenderSync' && (
        <div className="space-y-6 text-left font-sans">
          {/* SEARCH & INTAKE HEADER HERO CARD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded font-mono text-[9px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-indigo-600 shrink-0" />
                eprocure-gov-bd Sync Engine
              </span>
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight">
                Tender Notice-to-NOA Synthesizer & Win Rate Predictor
              </h3>
              <p className="text-slate-500 text-xs max-w-3xl leading-relaxed">
                Tender notices publish key specifications, but original bids are evaluated and officially announced in **Notifications of Award (NOA)** nearly 1.5 months later. Our system automatically collects historical NOAs, maps them back to active tender notices by Unique Tender ID, and models the perfect combination of Works type, Bidding method, and specific component items to predict your exact win percentage.
              </p>
            </div>

            {/* INTERACTIVE SEARCH FORM */}
            <form onSubmit={handleTriggerSync} className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
              <div className="md:col-span-8 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-bold">#</span>
                <input
                  type="text"
                  value={syncInputTenderId}
                  onChange={(e) => setSyncInputTenderId(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6 or 7-Digit Tender Unique ID (e.g., 1282055, 1275990, 1152011)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3.5 py-3 text-xs font-bold font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="md:col-span-4">
                <button
                  type="submit"
                  disabled={isSyncRunning}
                  className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-mono font-bold text-xs uppercase py-3 px-4 rounded-xl shadow cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  {isSyncRunning ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      Syncing Portal Logs...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Sync & Predict Win %
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* QUICK SUGGESTION PILLS */}
            <div className="flex gap-2 items-center flex-wrap text-[10px]">
              <span className="text-slate-450 font-bold uppercase shrink-0 font-mono">Sample Tender Notice IDs:</span>
              {[
                { id: '1282055', label: '1282055 (Pipes & Toilets Repair)' },
                { id: '1282051', label: '1282051 (Septic Tank Clearing)' },
                { id: '1275990', label: '1275990 (RCC Drainage Storm-Network)' },
                { id: '1152011', label: '1152011 (VIP Herring Soling Pavement)' }
              ].map(pill => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => {
                    setSyncInputTenderId(pill.id);
                    setSyncAppliedTenderId(pill.id);
                    setHasSynced(true);
                    showToast(`Loaded details for Tender ID #${pill.id}`, "info");
                  }}
                  className={`px-2.5 py-1 border rounded-lg cursor-pointer font-semibold transition-all ${
                    syncAppliedTenderId === pill.id
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-extrabold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* ACTIVE SYNCHRONIZING SCREEN LOADING SEQUENCE */}
          {isSyncRunning && (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mx-auto"></div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#6366f1] font-bold block animate-pulse">Establishing e-GP Secure Hook</span>
                <h4 className="text-xs font-bold text-slate-800">Processing Combinatorics Alignment</h4>
                <p className="text-[11px] text-slate-400 italic">
                  Mapping database notice fields with Notification of Award records nearly 1.5 months later... Please wait.
                </p>
              </div>
            </div>
          )}

          {/* SYNCED DASHBOARD DISPLAY PANEL */}
          {hasSynced && !isSyncRunning && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
              
              {/* LEFT COLUMN: SYNCED NOTICE DETAILS & SEMANTIC WORKS CHECKLIST */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* 1. SYNCED TENDER NOTICE CARD */}
                <div className="bg-slate-950 text-slate-200 border border-slate-800 rounded-2xl shadow-lg overflow-hidden text-left relative">
                  <div className="bg-[#1e1b4b] px-4 py-3 border-b border-slate-800 flex justify-between items-center">
                    <span className="text-[9px] font-mono font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Synced e-GP Notice
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[8px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-500/20 animate-pulse">
                      Matched with NOA Logs
                    </span>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="space-y-1.5">
                      <span className="font-mono text-[9px] text-slate-500 font-extrabold uppercase tracking-wide block">Tender Ref ID: {syncedTenderResult.id} ({syncedTenderResult.source})</span>
                      <h4 className="text-xs sm:text-sm font-black text-white hover:text-indigo-200 transition-colors leading-snug">
                        {syncedTenderResult.projectName}
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[10px] font-mono text-slate-400 border-t border-slate-900 pt-3">
                      <div>
                        <span className="text-[8px] text-slate-500 uppercase block font-bold leading-none">Procuring Entity:</span>
                        <strong className="text-slate-100 block mt-1 truncate">{syncedTenderResult.organization}</strong>
                        <span className="text-[9px] text-[#94a3b8] block mt-0.5">{syncedTenderResult.procuringDistrict} District</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-500 uppercase block font-bold leading-none">Estimated Value limit:</span>
                        <strong className="text-[#34d399] block mt-1 text-xs">৳ {(syncedTenderResult.estimatedCostAmt / 100000).toFixed(2)} Lac</strong>
                        <span className="text-slate-500 block mt-0.5">{syncedTenderResult.ministry.substring(0, 20)}...</span>
                      </div>
                    </div>

                    <div className="flex gap-2 border-t border-slate-900 pt-3">
                      <span className="bg-indigo-950 text-indigo-300 border border-indigo-900/60 text-[8px] px-2 py-0.5 rounded font-black font-mono">
                        {syncedTenderResult.procurementMethod}
                      </span>
                      <span className="bg-slate-900 text-slate-300 border border-slate-800 text-[8px] px-2 py-0.5 rounded font-black font-mono">
                        {syncedTenderResult.category}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. THE 1.5-MONTH NOA SYNC TIMELINE DIAGRAM */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs text-left text-xs space-y-4">
                  <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block pb-1 border-b border-slate-100">
                    1.5-Month Notice-to-NOA Lifecycle Map
                  </span>
                  
                  <div className="relative pl-5 space-y-4 border-l-2 border-dashed border-indigo-200">
                    {/* Step 1 */}
                    <div className="relative">
                      <div className="absolute -left-7 top-0.5 w-3.5 h-3.5 rounded-full bg-indigo-500 border-2 border-white"></div>
                      <div className="space-y-0.5">
                        <strong className="text-slate-800 text-[11px] block font-bold leading-none">Day 0: Tender Publication Notice</strong>
                        <span className="text-[10px] text-slate-500 block font-normal leading-normal">Approved e-GP specifications, bidding rules and BDT estimates are issued online.</span>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="relative">
                      <div className="absolute -left-7 top-0.5 w-3.5 h-3.5 rounded-full bg-indigo-500 border-2 border-white"></div>
                      <div className="space-y-0.5">
                        <strong className="text-slate-800 text-[11px] block font-bold leading-none">Day 21: Bid Submission Deadline</strong>
                        <span className="text-[10px] text-slate-500 block font-normal leading-normal">Electronic rates are closed. Contractors submit secured security deposits.</span>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="relative">
                      <div className="absolute -left-7 top-0.5 w-3.5 h-3.5 rounded-full bg-[#10b981] border-2 border-white"></div>
                      <div className="space-y-0.5">
                        <strong className="text-[#10b981] text-[11px] block font-bold leading-none">Nearly After 1.5 Months: NOA Official Collection</strong>
                        <span className="text-[10px] text-slate-600 block font-semibold leading-normal">Executive Engineer issues the formal Notification of Award contract. Database sniffs this signed document and syncs it securely by Unique ID index.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. PARSED WORKS CHECKLIST ("WHATS WORKS ARE THERE") */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3.5 text-left">
                  <div className="space-y-1 pb-1 border-b border-slate-100">
                    <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block">Works Component Analysis</span>
                    <h4 className="text-xs font-bold text-[#1e293b]">What physical works are in this tender?</h4>
                  </div>

                  <div className="space-y-2">
                    {syncAnalysisResult.parsedWorkItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2.5 items-start text-[11px] font-medium text-slate-700 bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                        <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-[#101010] block font-extrabold text-[11.5px]">{item}</strong>
                          <span className="text-slate-500 text-[10px] block mt-0.5 italic">Semantic pattern synced from scope description.</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: PREDICTIVE METRICS, INTERACTIVE SLIDERS, COMBINATORICS GRID */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* 1. COMPREHENSIVE GAUGES & METERS */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
                  
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div className="space-y-0.5">
                      <h4 className="text-xs uppercase font-mono tracking-wider font-extrabold text-slate-400">Winning Likelihood Core</h4>
                      <strong className="text-[#1e293b] text-sm uppercase font-display block">Combinatorial Bid Success Index</strong>
                    </div>
                    <span className="bg-indigo-100/80 text-indigo-700 px-2.5 py-1 rounded font-mono text-[9px] font-extrabold uppercase">
                      Live Grounded
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* Circular Score Meter Layout */}
                    <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="72"
                          cy="72"
                          r="60"
                          className="stroke-slate-100 fill-transparent"
                          strokeWidth="10"
                        />
                        <circle
                          cx="72"
                          cy="72"
                          r="60"
                          className="fill-transparent transition-all duration-500 ease-out"
                          stroke={
                            syncAnalysisResult.probabilityPercent > 70 
                              ? '#10b981' 
                              : syncAnalysisResult.probabilityPercent > 45 
                                ? '#f59e0b' 
                                : '#ef4444'
                          }
                          strokeWidth="10"
                          strokeDasharray="377"
                          strokeDashoffset={377 - (377 * syncAnalysisResult.probabilityPercent) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      
                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-black font-mono text-slate-800 leading-none">
                          {syncAnalysisResult.probabilityPercent}%
                        </span>
                        <span className="text-[8.5px] font-mono tracking-wider text-slate-400 font-extrabold block uppercase mt-1">
                          WIN CHANCE
                        </span>
                      </div>
                    </div>

                    {/* Quick Core Combination Explanations */}
                    <div className="space-y-3 flex-1 text-xs text-slate-600 font-sans">
                      <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1 shadow-inner">
                        <span className="text-[9px] font-mono font-black text-indigo-700 block uppercase leading-none">Current Sync Combination:</span>
                        <strong className="text-slate-800 text-[11px] block mt-1 font-bold">
                          {syncedTenderResult.category} (+{syncedTenderResult.procurementMethod})
                        </strong>
                        <p className="text-[10px] text-slate-500 font-normal leading-relaxed mt-1">
                          {syncedTenderResult.procuringDistrict} competition district limits base success of OTM works. Local incumbent dominance ratings suggest rigorous margin pricing targets.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-lg text-left">
                          <span className="text-[8px] font-bold text-slate-400 block uppercase font-mono">PE Avg Discount</span>
                          <strong className="text-[#059669] text-xs font-mono font-black block mt-1">-{syncAnalysisResult.avgWinDiscount.toFixed(2)}%</strong>
                        </div>
                        <div className="bg-indigo-50/50 border border-indigo-100 p-2.5 rounded-lg text-left">
                          <span className="text-[8px] font-bold text-slate-400 block uppercase font-mono">PE Favoritism Rating</span>
                          <strong className="text-indigo-700 text-xs font-mono font-black block mt-1 uppercase">{syncAnalysisResult.peFavoritismRating} Risk</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTenderId(syncedTenderResult.id);
                          setQuotedDiscount(syncUserDiscount);
                          setActiveSubTab('optimizer');
                          showToast(`Transferred Tender #${syncedTenderResult.id} and discount (-${syncUserDiscount.toFixed(1)}%) to advanced simulator!`, "success");
                        }}
                        className="w-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10.5px] font-bold uppercase py-2 px-3 rounded-xl transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                      >
                        <Calculator className="w-4 h-4 text-indigo-650" />
                        Run Advanced Win Predictor &amp; Pricing Optimizer →
                      </button>
                    </div>
                  </div>

                  {/* 2. THE EXPLICIT MULTI-FACTOR COMBINATION SLIDER CONTAINER */}
                  <div className="space-y-4 border-t border-slate-100 pt-5 text-left font-sans">
                    <div className="flex justify-between items-baseline flex-wrap gap-2">
                      <div className="space-y-0.5">
                        <h5 className="text-xs font-bold text-slate-800">Your Proposed Bid Discount (Below Estimate)</h5>
                        <p className="text-[10.5px] text-slate-500">Slide to instantly check how target bid discounts affect winning probability.</p>
                      </div>
                      <span className="text-sm font-black font-mono text-[#059669] bg-emerald-50 px-3 py-1 rounded border border-emerald-150 shrink-0">
                        -{syncUserDiscount.toFixed(1)}% Discount
                      </span>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="range"
                        min={0.5}
                        max={15}
                        step={0.1}
                        value={syncUserDiscount}
                        onChange={(e) => setSyncUserDiscount(parseFloat(e.target.value))}
                        className="w-full accent-indigo-650 h-2 bg-slate-150 rounded-lg cursor-pointer transition-all duration-300"
                      />
                      <div className="flex justify-between text-[8px] font-mono text-slate-400 uppercase font-black tracking-widest pt-1 select-none">
                        <span>-0.5% (High Rate)</span>
                        <span className="text-emerald-600 font-extrabold">-5.0% LTM Median</span>
                        <span className="text-[#ef4444] font-extrabold">-10.0% CPTU Warning limit</span>
                        <span>-15.0% (Margins Suicide)</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. DYNAMIC STRATEGIC ADVISORY CARD */}
                  <div className="bg-[#6366F1]/5 border border-indigo-150 rounded-2xl p-4 sm:p-5 text-left space-y-2">
                    <h5 className="font-extrabold text-[#4338ca] text-[11.5px] uppercase tracking-wider flex items-center gap-1.5 leading-none">
                      <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                      Dynamic Synergistic Pricing Advisory
                    </h5>
                    
                    <p className="text-slate-600 text-xs leading-relaxed">
                      We ran 14 combinatorial simulations for **{syncedTenderResult.category}** with **{syncedTenderResult.procurementMethod}** in **{syncedTenderResult.procuringDistrict}**. The historical average won discount for this specific combination is **-{syncAnalysisResult.avgWinDiscount.toFixed(1)}%**. 
                      At your selected bid rate of **-{syncUserDiscount.toFixed(1)}%**, your win probability is estimated at **{syncAnalysisResult.probabilityPercent}%**.
                    </p>

                    <div className="pt-2 border-t border-indigo-150/40 text-[10.5px] text-slate-500 font-normal space-y-1 font-sans">
                      <div className="flex justify-between">
                        <span>• Procurement Method competition modifier:</span>
                        <span className="font-bold text-slate-800">{syncAnalysisResult.methodHelperText}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• PE Dominant Incumbent Competitors in this range:</span>
                        <span className="font-mono text-xs font-black text-indigo-700 capitalize">
                          {syncAnalysisResult.dominantBuilders.join(' / ')}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-indigo-200/20">
                        <span className="font-bold">⚠️ Strategic Recommendation:</span>
                        <span className="font-extrabold text-[#10b981] leading-none">
                          {syncUserDiscount > 10.0 
                            ? 'Warning: Rejection under CPC rule 112 rate parameters.' 
                            : syncUserDiscount < syncAnalysisResult.avgWinDiscount 
                              ? `Suggest raising discount to -${(syncAnalysisResult.avgWinDiscount + 0.5).toFixed(1)}% for a 88% chance.`
                              : `Excellent balance corridor! Submit securely.`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* SEMANTIC TENDER SCOPE MATCHER PANEL */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse shrink-0" />
                        <h5 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider font-sans">Semantic Tender Scope Matcher</h5>
                      </div>
                      <span className="text-[10px] font-mono bg-emerald-50 border border-emerald-150 text-emerald-700 font-bold px-2.5 py-0.5 rounded uppercase leading-none">
                        94% Semantic Overlap
                      </span>
                    </div>

                    <p className="text-[11.5px] text-slate-505 leading-relaxed text-left font-sans">
                      We matched this active notice's scope keywords against <strong>{mockNoaDataset.length} primary historical award records</strong>. Below are the verified overlaps in work items:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="border border-slate-150 rounded-xl p-3 bg-slate-50/50 space-y-2 text-left font-sans">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Matched Works Scope</span>
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                          <strong className="text-slate-800 text-[11px] font-extrabold leading-none">{syncedTenderResult.category} Items</strong>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          Matches 4 verified awards in this district. Direct pricing average suggests a -7.5% threshold.
                        </p>
                      </div>

                      <div className="border border-slate-150 rounded-xl p-3 bg-slate-50/50 space-y-2 text-left font-sans">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">PE Pricing Concentration Rating (HHI)</span>
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                          <strong className="text-slate-800 text-[11px] font-extrabold leading-none">HHI Score: 0.18 (Moderate)</strong>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          The procuring entity showing healthy entrant distribution. Ideal for competitive bidding.
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left font-sans">
                      <div className="flex justify-between items-center text-[10.5px] sm:text-xs">
                        <span className="font-bold text-slate-650">Semantic Similarity Matrix Breakdown:</span>
                        <span className="text-emerald-700 font-mono font-bold">94.2% Match Rank</span>
                      </div>
                      <div className="mt-2 space-y-2 text-[10.5px] font-medium text-slate-600 font-sans">
                        <div className="flex items-center justify-between">
                          <span>🔧 Structural brickwork (BFS) overlap</span>
                          <span className="text-slate-800 font-bold font-mono">98% Perfect</span>
                        </div>
                        <div className="w-full bg-slate-100/70 h-1.5 rounded overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded" style={{ width: '98%' }}></div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span>📦 Supply delivery schedule similarity</span>
                          <span className="text-slate-800 font-bold font-mono">89% Strong</span>
                        </div>
                        <div className="w-full bg-slate-100/70 h-1.5 rounded overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded" style={{ width: '89%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* 4. COMBINATION BREAKDOWN INFO BOX */}
                <div className="p-4 bg-slate-900 text-slate-300 border border-slate-850 rounded-2xl relative font-sans text-xs space-y-2.5">
                  <span className="inline-flex items-center gap-1 uppercase font-mono font-bold tracking-widest text-emerald-400 text-[9px] leading-none pb-1 border-b border-slate-800 block w-full">
                    <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    Multi-Variable Analytical Combination Factors
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1.5 font-sans leading-relaxed text-[11px] font-normal">
                    <div className="space-y-1 text-left">
                      <strong className="text-white block font-bold leading-normal">Works type Factor</strong>
                      <p className="text-slate-400">
                        High-skill works (like RCC Pipe culverts or Complex sanitary systems) suffer less price undercutting due to equipment barriers. BFS floor soling works are simple and suffer extreme entry rivalries.
                      </p>
                    </div>
                    <div className="space-y-1 text-left">
                      <strong className="text-white block font-bold leading-normal">District density factor</strong>
                      <p className="text-slate-400">
                        Dhaka and Gazipur divisions aggregate up to 14 active bidders per lottery segment, diminishing newcomer chances. Sylhet division enjoys lower competitor concentration, creating optimal sweep entries.
                      </p>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: SMART WINNING BID PREDICTOR (MONETIZATION TRIGGER) */}
      {activeSubTab === 'optimizer' && (
        <div className="space-y-6 text-left">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6 relative overflow-hidden">
            
            {/* Header section inside the Optimizer */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 font-display uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-indigo-600" />
                  VIP Smart Winning Bid pricing Simulator
                </h4>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Input cost formulas and assess the statistical sweet spot between profit margin and win likelihood using local e-GP historical metrics.
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wide">AI Engine status:</span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase inline-block leading-none ${
                  currentUser.subscriptionType === 'premium' ? 'bg-emerald-100 text-emerald-800 border border-emerald-150' : 'bg-amber-100 text-amber-800'
                }`}>
                  {currentUser.subscriptionType === 'premium' ? "PREMIUM VIP ACTIVE" : "STANDARD TRIAL GATED"}
                </span>
              </div>
            </div>

            {/* INPUT VARIABLES ROW */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* LEFT PARAMS SECTION inputs */}
              <div className="md:col-span-4 space-y-4 font-sans">
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Select Target Active Tender</label>
                    <select
                      value={selectedTenderId}
                      onChange={(e) => setSelectedTenderId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer h-9"
                    >
                      {tenders.slice(0, 8).map(t => (
                        <option key={t.id} value={t.id}>ID: {t.id} - {t.projectName.substring(0, 30)}...</option>
                      ))}
                      {selectedTenderId !== 'custom' && !tenders.slice(0, 8).some(t => t.id === selectedTenderId) && (
                        <option value={selectedTenderId}>
                          ID: {selectedTenderId} - {activeTenderDetail?.projectName?.substring(0, 30) || 'Synced Tender'}...
                        </option>
                      )}
                      <option value="custom">Custom Tender Profile...</option>
                    </select>
                  </div>

                  {/* QUICK SEARCH INPUT BAR FOR ANY TENDER ID */}
                  <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-2.5 space-y-1.5">
                    <span className="text-[9px] font-mono font-bold text-indigo-600 uppercase tracking-wider block">Notice ID Instant Loader</span>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Type Tender ID..."
                        className="flex-1 bg-white border border-slate-250 rounded-lg px-2 text-[11px] font-mono font-bold focus:outline-none focus:border-indigo-500 h-8 text-slate-800 shadow-2xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = (e.currentTarget as HTMLInputElement).value.trim().replace(/\D/g, '');
                            if (val) {
                              const match = tenders.find(t => t.id === val);
                              if (match) {
                                setSelectedTenderId(val);
                                showToast(`Loaded details for Tender ID #${val} and auto-analyzed pricing!`, "success");
                              } else {
                                showToast(`Tender ID #${val} not found in database.`, "error");
                              }
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          const val = input.value.trim().replace(/\D/g, '');
                          if (val) {
                            const match = tenders.find(t => t.id === val);
                            if (match) {
                              setSelectedTenderId(val);
                              showToast(`Loaded details for Tender ID #${val} and auto-analyzed pricing!`, "success");
                            } else {
                              showToast(`Tender ID #${val} not found in database.`, "error");
                            }
                          }
                        }}
                        className="bg-indigo-600 hover:bg-indigo-705 bg-indigo-600 text-white text-[10px] uppercase font-mono font-bold px-3 rounded-lg cursor-pointer flex items-center justify-center shrink-0 border border-indigo-700 transition"
                      >
                        Search
                      </button>
                    </div>
                  </div>
                </div>

                {/* DYNAMIC AI PROBABILITY GROUNDING PREDICTORS */}
                <div className="space-y-3 bg-indigo-50/40 border border-indigo-120 p-3.5 rounded-xl">
                  <span className="text-[9px] font-mono font-black text-indigo-700 uppercase tracking-widest block">AI Probability Grounding</span>
                  
                  <div className="space-y-1">
                    <label className="text-[8.5px] font-bold text-slate-550 uppercase tracking-wide block">Procuring Entity (PE):</label>
                    <select
                      value={customPE}
                      onChange={(e) => setCustomPE(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-[11px] font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="Public Works Department (PWD)">PWD - Public Works Dept</option>
                      <option value="Local Government Engineering Department (LGED)">LGED - Gov Engineering</option>
                      <option value="Bangladesh Water Development Board (BWDB)">BWDB - Water Board</option>
                      {customPE !== "Public Works Department (PWD)" && 
                       customPE !== "Local Government Engineering Department (LGED)" && 
                       customPE !== "Bangladesh Water Development Board (BWDB)" && (
                        <option value={customPE}>{customPE}</option>
                      )}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8.5px] font-bold text-slate-550 uppercase tracking-wide block">Bidding Method:</label>
                    <select
                      value={customMethod}
                      onChange={(e) => setCustomMethod(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-[11px] font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="OTM">OTM - Open Tendering Method</option>
                      <option value="LTM">LTM - Limited Tendering Method</option>
                      <option value="RFQ">RFQ - Request for Quotations</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8.5px] font-bold text-slate-550 uppercase tracking-wide block">Bid Type Sector (Keywords):</label>
                    <select
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-[11px] font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <optgroup label="Works categories">
                        <option value="Repair Works">Repair & Sanitary Works</option>
                        <option value="RCC Works">RCC Drainage & Manholes</option>
                        <option value="BFS Herring Bond">BFS Herring Bond Roads</option>
                        <option value="BC Works">BC Asphalt Carpeting</option>
                        <option value="Renovation">Renovation segment</option>
                        <option value="Improvement & Construction">Improvement & Construction</option>
                      </optgroup>
                      <optgroup label="Goods categories">
                        <option value="Stationary Supply">Stationary Office Supply</option>
                        <option value="Electronics Supply">Electronics & Servers</option>
                        <option value="Solar Supply">Solar Power Supplies</option>
                        <option value="Equipment Supply">Heavy Pump Equipment</option>
                      </optgroup>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Official Estimated Government Budget (BDT)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">৳</span>
                    <input
                      type="text"
                      value={customEstimateStr}
                      disabled={selectedTenderId !== 'custom'}
                      onChange={(e) => setCustomEstimateStr(e.target.value)}
                      placeholder="e.g. 5,000,000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3.5 py-2 text-xs font-semibold font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-75 disabled:cursor-not-allowed"
                    />
                  </div>
                  {selectedTenderId !== 'custom' && (
                    <span className="text-[9px] text-slate-400 block italic leading-tight">
                      Dynamically synchronized from tender database parameters.
                    </span>
                  )}
                </div>

                <div className="space-y-1 border-t border-slate-100 pt-3">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    <span>Target Bidding Focus:</span>
                    <span className="text-indigo-650 font-mono font-bold text-[11px] uppercase animate-pulse">Predict & Win Mainly</span>
                  </div>
                  <p className="text-[10px] text-slate-450 leading-relaxed font-sans font-medium">
                    This advanced predictor models past Bangladesh e-GP contract awards to determine the absolute sweet spot for winning the bid L1 position without CPC Rule 112 rate rejection.
                  </p>
                </div>

                <div className="space-y-1 border-t border-slate-100 pt-3">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Proposed Quoted Bid Discount:</span>
                    <span className="text-[#059669] font-mono font-bold text-[11px]">-{quotedDiscount}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={15}
                    step={0.1}
                    value={quotedDiscount}
                    onChange={(e) => setQuotedDiscount(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-150 rounded-lg cursor-pointer mt-1"
                  />
                  <span className="text-[9px] text-slate-400 block font-medium leading-normal">
                    Quote discount below estimate. Past LGED tenders show works are usually bid between <strong>-4% and -9%</strong>.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleRunOptimization}
                  disabled={isComputing}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-bold uppercase tracking-wider text-xs py-3 rounded-xl cursor-pointer shadow border border-indigo-650 flex items-center justify-center gap-1.5 transition-all mt-4 hover:shadow-md"
                >
                  {isComputing ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      SIMULATING DISCOUNTS...
                    </>
                  ) : (
                    <>
                      <Gauge className="w-4 h-4" />
                      Run pricing optimization &rarr;
                    </>
                  )}
                </button>
              </div>

              {/* RIGHT OUTLET: RECHARGE PREDICTOR CHART GRAPH (OR BKASH PAYWALL GATING FLOW) */}
              <div className="md:col-span-8 bg-slate-50 border border-slate-200 rounded-2xl relative min-h-[360px] flex flex-col overflow-hidden">
                
                {/* CHECK SUBSCRIPTION LEVEL */}
                {currentUser.subscriptionType !== 'premium' ? (
                  /* GATED PAYWALL INTERACTIVE OVERLAY */
                  <div className="absolute inset-0 bg-[#0f172a]/95 text-white z-20 p-6 sm:p-10 flex flex-col justify-between overflow-y-auto text-left relative">
                    <div className="absolute inset-0 bg-[#cbd5e1]/5 opacity-15 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)]"></div>
                    
                    <div className="space-y-4 relative z-10">
                      <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 px-3 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider uppercase">
                        <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        Interactive Monetized paywall Gate
                      </div>
                      
                      <div className="space-y-1.5">
                        <h4 className="text-xl font-black font-display text-white tracking-tight leading-none uppercase">
                          Unlock smart Bidding Intelligence Panel
                        </h4>
                        <p className="text-slate-400 text-xs">
                          Unlock win-bid probabilities, backtests against pees, margin calculators, and target curves utilizing historical eprocure awards.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-xs">
                        {[
                          { title: "Competitor Margin Backtesting", dec: "Access actual quoted prices of peer contractors on PWD/LGED contracts in Sylhet, Chittagong, and Dhaka." },
                          { title: "Dynamic Win Probability Curves", dec: "Interactive real-time charting displaying where the quoted price maximizes win probability without loss." },
                          { title: "PE Estimator Decryptor", dec: "Retrieve historical evaluation metrics of specific Executive Engineers and Tender Opening Committees." },
                          { title: "Targeted Strategic Bid %", dec: "Recommended exact pricing suggestions based on bidding history of your top competitors." }
                        ].map((item, id) => (
                          <div key={id} className="flex gap-2.5 items-start">
                            <Check className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-white block font-bold text-[11.5px]">{item.title}</strong>
                              <span className="text-slate-400 text-[10px] leading-tight block mt-0.5">{item.dec}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* PAYMENT BUTTONS AND PRICING SHEET */}
                    <div className="border-t border-slate-800/80 pt-6 mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 font-sans">
                      <div className="text-left">
                        <span className="text-[9px] font-mono font-bold tracking-widest text-slate-500 uppercase block">VIP BID MASTER MEMB.</span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <strong className="text-2xl font-black font-mono text-emerald-400">৳ 2,500</strong>
                          <span className="text-slate-400 text-xs font-medium">/ 30 Days Access</span>
                        </div>
                        <p className="text-slate-500 text-[9px] leading-none shrink-0 mt-1 font-sans">
                          Auto-upgrades in simulated sandbox mode. Perfect test.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <button
                          onClick={() => handleInitiateUpgrade('bKash')}
                          className="bg-[#D12053] hover:bg-opacity-90 text-white font-mono font-bold text-[10px] px-4.5 py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
                        >
                          <CreditCard className="w-4.5 h-4.5 shrink-0" />
                          Pay with bKash
                        </button>
                        <button
                          onClick={() => handleInitiateUpgrade('Nagad')}
                          className="bg-[#f05a24] hover:bg-opacity-90 text-white font-mono font-bold text-[10px] px-4.5 py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
                        >
                          <CreditCard className="w-4.5 h-4.5 shrink-0" />
                          Pay with Nagad
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* PREMIUM OPTIMIZED INTELLIGENCE VIEW */
                  <div className="p-5 flex-1 flex flex-col justify-between text-left space-y-6">
                    {!calculatedFlag ? (
                      /* BLANK OPTIMIZATION NEEDED STATE */
                      <div className="flex-1 flex flex-col justify-center items-center py-16 text-center text-slate-500 font-sans space-y-3">
                        <div className="w-14 h-14 rounded-full bg-indigo-50 border border-indigo-150 flex items-center justify-center">
                          <Sliders className="w-6 h-6 text-indigo-600 shrink-0" />
                        </div>
                        <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Ready to Run prediction model</h5>
                        <p className="text-slate-500 text-[11px] leading-relaxed max-w-sm">
                          Set your Proposed Quoted Bid Discount in the left panel, and click <strong>"Run Pricing Optimization"</strong> to model win matrices.
                        </p>
                      </div>
                    ) : (
                      /* FULL SIMULATION PERFORMANCE DASHBOARD */
                      <div className="space-y-6 animate-fadeIn">
                        
                        {/* refocused stats panel tracking probability, rank, and discount */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="bg-white border border-slate-150 p-3.5 rounded-xl text-left">
                            <span className="text-[8px] font-bold text-slate-400 block uppercase tracking-wide font-mono">Target Bid Package</span>
                            <strong className="text-xs font-black text-slate-800 block mt-1">ID {selectedTenderId}</strong>
                            <span className="text-[10px] text-slate-505 leading-tight block truncate mt-0.5">{activeTenderDetail?.procuringDistrict || 'Dhaka'} district limits</span>
                          </div>

                          <div className="bg-white border border-slate-150 p-3.5 rounded-xl text-left">
                            <span className="text-[8px] font-bold text-slate-400 block uppercase tracking-wide font-mono">Win Probability</span>
                            <strong className="text-base font-mono font-black text-emerald-600 block mt-1">
                              {Math.min(99, Math.max(5, Math.round(5 + quotedDiscount * 8.5)))}%
                            </strong>
                            <span className="text-[9px] text-[#059669] font-bold leading-none mt-0.5 flex items-center gap-0.5">
                              <TrendingUp className="w-3 h-3 inline animate-bounce" />
                              Highly Optimised
                            </span>
                          </div>

                          <div className="bg-white border border-slate-150 p-3.5 rounded-xl text-left">
                            <span className="text-[8px] font-bold text-slate-400 block uppercase tracking-wide font-mono">Proposed Discount</span>
                            <strong className="text-base font-mono font-black text-[#059669] block mt-1 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-150/50 w-fit">
                              -{quotedDiscount.toFixed(1)}%
                            </strong>
                            <span className="text-[10px] text-slate-505 leading-none block mt-0.5">Below budget schedule</span>
                          </div>

                          <div className="bg-indigo-950 text-indigo-100 border border-indigo-900 p-3.5 rounded-xl text-left">
                            <span className="text-[8px] font-bold text-indigo-300 block uppercase tracking-wide font-mono">Predicted Rank</span>
                            <strong className="text-base font-mono font-black text-white block mt-1">
                              L1 (Rank #{quotedDiscount >= 7.8 ? '1' : quotedDiscount >= 5.0 ? '2' : '3+'})
                            </strong>
                            <span className="text-[9.5px] text-emerald-450 leading-none block mt-1 font-semibold uppercase tracking-wide font-mono font-bold">
                              {quotedDiscount >= 7.8 ? '★ Direct Winner' : quotedDiscount >= 5.0 ? 'Competitive' : 'High Rejection Risk'}
                            </span>
                          </div>
                        </div>

                        {/* RECOMMENDATION EXPLANATION BOX */}
                        <div className="bg-[#6366F1]/5 border border-indigo-150 p-4 rounded-2xl space-y-1.5 text-left">
                          <h5 className="font-extrabold text-[#4338ca] text-xs uppercase tracking-wide flex items-center gap-1.5 leading-none font-sans">
                            <Sparkles className="w-4 h-4" />
                            Strategic Bid Recommendation Suggestions
                          </h5>
                          <p className="text-slate-655 text-xs leading-relaxed font-sans">
                            Historical NOA analysis for works in **{activeTenderDetail?.procuringDistrict || 'Dhaka'}** shows that **{activeTenderDetail?.organization || 'PWD'}** typically awards similar size contracts at **-4.8% to -7.5%** discount margins. Bidding exactly **-{quotedDiscount.toFixed(1)}%** grants a **{Math.min(99, Math.max(5, Math.round(5 + quotedDiscount * 8.5)))}% win probability**. 
                            To outbid historical competitor averages in this sector, we suggest a target bid of **-7.80%** (Projected Rank: #1 (L1 position), Win Probability: 71%).
                          </p>
                        </div>

                        {/* SINGLE AXIS RECHARTS WIN PROBABILITY GRAPH */}
                        <div className="space-y-2 text-left font-sans">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Dynamic Win Probability Curve</span>
                          <div className="h-64 bg-white border border-slate-150 rounded-xl p-4 shadow-inner text-xs">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart
                                data={chartData}
                                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                              >
                                <defs>
                                  <linearGradient id="colorWin" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <XAxis dataKey="discount" stroke="#94a3b8" fontSize={10} fontStyle="mono" />
                                <YAxis stroke="#94a3b8" fontSize={10} fontStyle="mono" domain={[0, 100]} label={{ value: 'Win Probability (%)', angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 9 }} />
                                <Tooltip contentStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <Area type="monotone" dataKey="Win Probability (%)" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorWin)" />
                                <ReferenceLine x={`-${quotedDiscount.toFixed(1)}%`} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Your Bid', fill: '#ef4444', fontSize: 10, position: 'top' }} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* NEW FEATURE 5: COMPETITOR OUTBIDDING ANALYZER */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 font-sans text-left">
                          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-indigo-600 animate-pulse" />
                              <h5 className="font-extrabold text-[#1a2e4c] text-xs uppercase tracking-wider font-display">Competitor Outbidding Analyzer</h5>
                            </div>
                            <span className="text-[9px] font-mono bg-indigo-50 border border-indigo-150 text-indigo-750 font-bold px-2 py-0.5 rounded leading-none uppercase">Predictive Matrix</span>
                          </div>

                          <p className="text-[11px] text-slate-505 leading-relaxed">
                            Based on verified historic CPTU bid registrations for <strong>{customCategory}</strong> works published by <strong>{customPE.replace('Public Works Department (PWD)', 'PWD').replace('Local Government Engineering Department (LGED)', 'LGED')}</strong>, we simulated likely bidders and their estimated bid rates for this package:
                          </p>

                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-slate-755">
                              <thead>
                                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 font-mono tracking-wider">
                                  <th className="pb-2 text-left">Likely Bidder / Contractor</th>
                                  <th className="pb-2 text-center">Historical Rate Signature</th>
                                  <th className="pb-2 text-center">Estimated Competitor Bid Rate</th>
                                  <th className="pb-2 text-right">Outbid Recommendation</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50 font-medium">
                                {[
                                  { name: "National Development Engineers (NDE)", sig: "Aggressive (L1 Focused)", rate: 7.8, color: "text-emerald-700" },
                                  { name: "Spectra Engineers Ltd.", sig: "Competitive Average", rate: 7.2, color: "text-indigo-600" },
                                  { name: "Anwar Construction Co.", sig: "Conservative / Localised", rate: 4.2, color: "text-amber-600" },
                                  { name: "Sajjad & Brothers Joint Venture", sig: "Aggressive OTM", rate: 8.1, color: "text-rose-600" }
                                ].map((bidder, idx) => {
                                  const targetOutbidRate = (bidder.rate + 0.1).toFixed(1);
                                  return (
                                    <tr key={idx} className="hover:bg-slate-50/50">
                                      <td className="py-2.5 text-left font-bold text-slate-850">{bidder.name}</td>
                                      <td className="py-2.5 text-center text-[11px] text-slate-505 font-mono">{bidder.sig}</td>
                                      <td className={`py-2.5 text-center font-mono font-bold ${bidder.color}`}>-{bidder.rate.toFixed(1)}%</td>
                                      <td className="py-2.5 text-right font-mono text-emerald-800 text-[11px]">
                                        <span className="bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-150 font-bold">
                                          Bid -{targetOutbidRate}% to outbid
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          <div className="p-3.5 bg-emerald-50/50 border border-emerald-110 rounded-xl flex items-start gap-2 text-[11.5px] text-emerald-950 font-normal">
                            <Sparkles className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                            <div className="leading-relaxed">
                              <strong>AI Winning Formulation Strategy:</strong> At your active choice of <strong className="font-mono bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-md font-extrabold select-all">-{quotedDiscount.toFixed(1)}%</strong>, you are currently projected to comfortably outbid <strong>Anwar Construction Co.</strong> and match closely with <strong>Spectra Engineers Ltd.</strong>. Adjust your bid discount to <strong className="font-mono bg-indigo-150 hover:bg-indigo-200 border border-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded-md font-extrabold select-all">-{quotedDiscount >= 8.2 ? quotedDiscount.toFixed(1) : '8.2'}%</strong> to secure direct L1 dominance over all likely entrants!
                            </div>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL CHECKOUT DIALOG LAYER (bKash/Nagad popup window style) */}
      <AnimatePresence>
        {showCheckout && (
          <div className="fixed inset-0 bg-black/60 z-55 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl w-full max-w-sm text-left font-sans"
            >
              {/* Checkout header banner styled with specific portal color */}
              <div className={`p-5 text-white flex items-center justify-between ${
                checkoutGateway === 'bKash' ? 'bg-[#D12053]' : 'bg-[#f05a24]'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
                    <span className="text-xs font-black" style={{ color: checkoutGateway === 'bKash' ? '#D12053' : '#f05a24' }}>
                      {checkoutGateway === 'bKash' ? 'bK' : 'Na'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm tracking-tight capitalize leading-none">{checkoutGateway} Checkout</h4>
                    <span className="text-[10px] text-white/80 font-mono mt-1 block">Tender Bid Optimizer subscription</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCheckout(false)}
                  className="p-1 px-2.5 hover:bg-white/10 rounded-lg text-white font-bold text-xs select-none cursor-pointer border border-transparent hover:border-white/20 transition-all font-mono"
                >
                  X
                </button>
              </div>

              {/* Checkout interactive Forms */}
              <div className="p-6 space-y-4 text-xs font-sans">
                <div className="text-center space-y-1 py-1.5 select-none bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest block">PAYMENT DUE</span>
                  <strong className="text-lg font-black text-slate-800 font-mono block">৳ 2,500 BDT</strong>
                  <span className="text-[9.5px] text-slate-600 block font-medium leading-none font-sans">For 30-Day VIP Access Profile</span>
                </div>

                {!otpSent ? (
                  <form onSubmit={handleSendOTP} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-550 uppercase block">Your {checkoutGateway} Mobile Number</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-405 font-mono text-[10px] font-bold">+880</span>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                          maxLength={11}
                          required
                          placeholder="01712345678"
                          className="w-full bg-slate-50 border border-slate-205 rounded-xl pl-13 pr-3.5 py-2.5 font-mono text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-indigo-50/50 text-indigo-900 rounded-lg text-[10px] space-y-1 border border-indigo-100">
                      <strong className="font-extrabold uppercase block text-[9px] tracking-wide mb-1 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Simulated Sandbox Checkout Protocol
                      </strong>
                      This billing represents a secure webhook simulation. All triggers are handled client-side instantly. No actual bank funds will be transferred.
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-black text-white text-xs font-mono font-bold py-3 px-4 rounded-xl cursor-pointer transition-all uppercase tracking-wider text-center"
                    >
                      SEND VERIFICATION OTP
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleAuthorizeUpgrade} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-550 uppercase block">6-Digit Verification OTP (Input Mock numeric)</label>
                      <input
                        type="password"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        maxLength={6}
                        required
                        placeholder="e.g. 123456"
                        className="w-full bg-slate-50 border border-slate-205 py-2.5 rounded-xl px-3.5 font-mono text-xs font-black tracking-widest text-center text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="p-3 bg-slate-50 text-slate-600 rounded-lg text-[10px] leading-relaxed text-left border border-slate-100">
                      We sent a simulated 6-digit verification code to **+880 {phoneNumber}**. Input any mock number structure to confirm checkout authorization.
                    </div>

                    <button
                      type="submit"
                      disabled={isVerifyingPayment}
                      className="w-full text-white text-xs font-mono font-bold py-3 px-4 rounded-xl cursor-pointer transition-all uppercase tracking-wider text-center flex items-center justify-center gap-1.5"
                      style={{ backgroundColor: checkoutGateway === 'bKash' ? '#D12053' : '#f05a24' }}
                    >
                      {isVerifyingPayment ? (
                        <>
                          <Sparkles className="w-4 h-4 animate-spin" />
                          AUTHORIZING WEBHOOK...
                        </>
                      ) : (
                        `CONFIRM PAYMENT ৳ 2,500`
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="w-full bg-slate-50 border border-slate-220 text-slate-500 font-mono font-bold py-2 rounded-lg text-[10px] cursor-pointer text-center hover:bg-slate-100 uppercase"
                    >
                      &larr; Back to edit Number
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
