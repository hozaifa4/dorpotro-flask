import React, { useState, useMemo } from 'react';
import { 
  Building2, Landmark, ShieldCheck, Layers, Terminal, Sparkles, 
  MapPin, HelpCircle, FileText, ChevronRight, Briefcase, Key, Star, Info,
  Bell, Menu, TrendingUp, Percent, Award, AlertCircle, TrendingDown,
  Gavel, CheckCircle, BarChart3, ChevronDown, BookOpen, Mail, Phone, 
  LogOut, Calculator, Code, Users, Database, Shield, DollarSign, Rocket, 
  Search, RefreshCw, Send, CheckSquare, Plus, ArrowUpRight, Share2, Target,
  Calendar, Layers2, Zap, AlertTriangle, Eye, ArrowRight, ArrowLeft
} from 'lucide-react';
import { showToast } from '../lib/firebase';
import { User } from '../types';

interface SaaSPlatformBlueprintProps {
  currentUser: User;
  onUpdateCurrentUser: (updated: User) => void;
}

export default function SaaSPlatformBlueprint({ currentUser, onUpdateCurrentUser }: SaaSPlatformBlueprintProps) {
  // Navigation tabs for the 20 items grouped into 5 core Spec Engines
  const [activeTheme, setActiveTheme] = useState<'strategy' | 'architecture' | 'ai' | 'crawler' | 'wireframes'>('strategy');
  
  // Theme A states: Strategy & Growth
  const [pitchDeckSlide, setPitchDeckSlide] = useState(0);
  const [referralCount, setReferralCount] = useState(3);
  const [chosenRoadmapMilestone, setChosenRoadmapMilestone] = useState<number>(0);
  const [activePlan, setActivePlan] = useState<'free' | 'pro' | 'business' | 'enterprise'>('pro');

  // Theme B states: Architecture & Database
  const [selectedSchemaTable, setSelectedSchemaTable] = useState<'users' | 'companies' | 'tenders' | 'noa' | 'alerts' | 'payments'>('tenders');
  const [securityTokenSim, setSecurityTokenSim] = useState('');
  const [selectedTenant, setSelectedTenant] = useState('TENANT_REHMAN_ENG');

  // Theme C states: AI Modules Playground
  const [predictTenderCost, setPredictTenderCost] = useState(5000000);
  const [predictPE, setPredictPE] = useState('Local Government Engineering Department (LGED)');
  const [predictRegion, setPredictRegion] = useState('Dhaka');
  const [predictExperience, setPredictExperience] = useState(5);
  const [activeCompetitorProfile, setActiveCompetitorProfile] = useState('National Development Engineers (NDE)');
  const [customPrompt, setCustomPrompt] = useState('Construct 3.2km secondary RCC drainage pavement network at Gazipur district under LGED standard specifications.');
  const [generatedDocCode, setGeneratedDocCode] = useState<string>('');
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);

  // Theme D states: Scraping Simulator
  const [scrapingFrequency, setScrapingFrequency] = useState('1'); 
  const [isScrapingActive, setIsScrapingActive] = useState(false);
  const [liveScraperConsole, setLiveScraperConsole] = useState<string[]>([
    'SYSTEM: [00:00:00] Web Scraper Engine initialized in Docker container #92A',
    'SYSTEM: [00:00:00] Ready for daily cron target https://www.eprocure.gov.bd/'
  ]);

  // Theme E states: Wireframes
  const [selectedWireframeScreen, setSelectedWireframeScreen] = useState<'dashboard' | 'tender_list' | 'analytics' | 'optimizer' | 'team'>('dashboard');

  const pitchDeckSlides = [
    {
      title: "1. The Big Problem",
      subtitle: "The Opacity of Bangladesh Public Procurement",
      content: "Government contractors waste over ৳450B annually on blind bids. With no predictive data on Procuring Entities (PE) payment delays, historical competition depth, or actual discount rate maps, contractors operate in the dark, leading to high default rates and financial strain.",
      bullets: [
        "Blind Pricing: Bidding standard schedules without competitive margin algorithms.",
        "PE Favoritism Risk: Inability to detect if certain agencies lean towards specific oligarch builders.",
        "Manual Sourcing Failures: Missing crucial daily circular notices on www.eprocure.gov.bd."
      ],
      metric: "৳450 Billion",
      metricLabel: "Estimated Annual Blind Bidding Loss"
    },
    {
      title: "2. The Solution",
      subtitle: "DORPOTRO.BD — AI-Powered Procurement Cloud",
      content: "The single source of truth for e-GP tenders. A unified SaaS platform combining state-of-the-art Big Data scraping of historical contract awards, Machine Learning risk algorithms, and bidding optimization telemetry designed to win more bids.",
      bullets: [
        "Reconciled NOA Indexer: Real-time matched contract results mapped by Tender ID.",
        "Predictive Pricing Engine: Intelligent probability curves that estimate specific win odds.",
        "Automated Contractor CRM: Manage document catalogs, joint-ventures, and agency relationships."
      ],
      metric: "32% Higher",
      metricLabel: "Win Probability Gains for Pro Subscribers"
    },
    {
      title: "3. Market Size & Opportunity",
      subtitle: "Capturing the TAM of South Asia Infrastructure",
      content: "Bangladesh’s annual development budget (ADP) totals over $23 Billion with 80%+ processed online through the e-GP portal. Our user base includes 65,000+ active registered government contractors, suppliers, and procurement consultants.",
      bullets: [
        "TAM (Total Addressable Market): $45M/year in Bangladesh contractor SaaS subscriptions.",
        "SAM (Serviceable Addressable Market): $18M/year targeting premium contractors.",
        "SOM (Serviceable Obtainable Market): $2.4M within 18 months via aggressive growth loops."
      ],
      metric: "65,000+",
      metricLabel: "Active Government Registered Contractors"
    },
    {
      title: "4. Business & Monetization Model",
      subtitle: "Zero-friction Land-and-Expand",
      content: "Simple tiering that suits individual sub-contractors up to multinational engineering groups. Standard payments processed instantly via integrated mobile banking gateways (bKash, Nagad) and corporate cards.",
      bullets: [
        "Free Plan: General daily notification search (with integrated sponsor advertisements).",
        "Pro Plan (৳2,500/mo): Advanced win-prediction simulator, complete NOA price archives.",
        "Business Plan (৳8,500/mo): Multi-user sub-accounts, priority SMS alerts, auto proposal gen.",
        "Enterprise Scope: Dedicated custom REST APIs, Spanner replica syncs, custom data integrations."
      ],
      metric: "৳2,500",
      metricLabel: "Monthly ASP per Pro account - Sweet spot for SMEs"
    },
    {
      title: "5. Traction & Growth Loops",
      subtitle: "Uncapped, organic network growth",
      content: "Built-in organic loops ensure user growth supports itself: every shared quote includes a tracking link, and joint-venture proposal generation naturally drives partner sign-ups.",
      bullets: [
        "Collaborative JV Portal: Inviting partner companies instantly registers them under our shadow ledger.",
        "Referral Program: Get 10% cash reward credited directly to bKash wallet on every premium upgrade path.",
        "Value-first SEO: Rank first on Google for all e-GP Tender IDs (e.g., 'Tender ID 1282055 Award Winner')."
      ],
      metric: "4.2x",
      metricLabel: "Current Month-Over-Month Organic Growth"
    }
  ];

  const handleNextSlide = () => {
    setPitchDeckSlide((prev) => (prev + 1) % pitchDeckSlides.length);
  };
  const handlePrevSlide = () => {
    setPitchDeckSlide((prev) => (prev - 1 + pitchDeckSlides.length) % pitchDeckSlides.length);
  };

  const calculatedReferralBonus = useMemo(() => {
    return referralCount * 250; 
  }, [referralCount]);

  const roadmapMilestones = [
    { qr: "Q1 2026", title: "Alpha & MVP Crawler Launch", desc: "Release daily e-GP notice parsers, bKash gateway webhooks, and the core Notice Dashboard." },
    { qr: "Q2 2026", title: "AI Reconciler Protocol", desc: "Integrate automatic NOA Tender ID matcher to parse actual award winners. Feed training database dynamically." },
    { qr: "Q3 2026", title: "Collaborative Workspace CRM", desc: "Build Joint-Venture (JV) workspace sharing, company dashboard controls, and automated document catalogs." },
    { qr: "Q4 2026", title: "Enterprise API Platform", desc: "Provide high-efficiency REST APIs, Excel spreadsheet bulk download tools, and ML custom templates." }
  ];

  // Schema Table definition database
  const schemaTables = {
    users: {
      desc: "Stores registered individual contractor & consultant identity records.",
      cols: [
        { name: "id", type: "UUID (Primary Key)", desc: "Unique user identifier." },
        { name: "email", type: "VARCHAR(255) (Unique)", desc: "Primary account email address." },
        { name: "company_id", type: "UUID (Foreign Key)", desc: "References companies.id of current employer." },
        { name: "role", type: "VARCHAR(50)", desc: "Values: contractor | company_admin | consultant | super_admin." },
        { name: "subscription_type", type: "VARCHAR(50)", desc: "Values: free | pro | business | enterprise." },
        { name: "created_at", type: "TIMESTAMP", desc: "Record birth timestamp." }
      ]
    },
    companies: {
      desc: "Represents multi-user enterprise organizations or construction consortiums.",
      cols: [
        { name: "id", type: "UUID (Primary Key)", desc: "Unique corporate entity ID." },
        { name: "legal_name", type: "VARCHAR(255)", desc: "Official registered name (e.g. Acme Builders Ltd)." },
        { name: "license_no", type: "VARCHAR(100)", desc: "Bangladesh trade license registration number." },
        { name: "tenant_subdomain", type: "VARCHAR(100) (Unique)", desc: "Subdomain for multi-tenant isolation routing." },
        { name: "plan_tier", type: "VARCHAR(50)", desc: "Selected operational fee tier." }
      ]
    },
    tenders: {
      desc: "Ground raw procurement notice definitions crawled daily from e-GP portal.",
      cols: [
        { name: "id", type: "VARCHAR(50) (Primary Key)", desc: "Unique Tender ID issued by e-GP." },
        { name: "project_name", type: "TEXT", desc: "Detailed tender description outline." },
        { name: "organization", type: "VARCHAR(255)", desc: "Procuring Entity department name." },
        { name: "estimated_cost", type: "NUMERIC(15,2)", desc: "Internal budget allocation estimate." },
        { name: "deadline", type: "TIMESTAMP", desc: "Closing timestamp of tender bid submissions." },
        { name: "reconciled_noa_id", type: "UUID (Foreign Key)", desc: "References positive matching NOA record." }
      ]
    },
    noa: {
      desc: "Parsed Notification of Award records linking tender notices to real closed contract results.",
      cols: [
        { name: "id", type: "UUID (Primary Key)", desc: "Unique award schema ID." },
        { name: "tender_id", type: "VARCHAR(50) (Foreign Key)", desc: "Maps directly to original crawled notice." },
        { name: "awarded_bidder", type: "VARCHAR(255)", desc: "Legal winner name who received contractor signature." },
        { name: "actual_discount", type: "NUMERIC(5,2)", desc: "The official discount percentage below estimate." },
        { name: "contract_val", type: "NUMERIC(15,2)", desc: "Final agreed execution price in BDT." },
        { name: "synced_at", type: "TIMESTAMP", desc: "Timestamp parsed by automated reconciler cron." }
      ]
    },
    alerts: {
      desc: "User subscription trigger preferences.",
      cols: [
        { name: "id", type: "UUID (Primary Key)", desc: "Alert configuration database handle." },
        { name: "user_id", type: "UUID (Foreign Key)", desc: "Target recipient of alerts." },
        { name: "pe_filter", type: "VARCHAR(255)", desc: "Filters alerts by specific government agency." },
        { name: "keyword", type: "VARCHAR(100)", desc: "Keyword text filters (e.g. Roads, Hospital)." },
        { name: "delivery_mode", type: "VARCHAR(50)", desc: "Values: SMS | Email | Push." }
      ]
    },
    payments: {
      desc: "Audit trail registry of financial transactions handled via integrated payment channels.",
      cols: [
        { name: "id", type: "VARCHAR(100) (Primary Key)", desc: "Unique transaction identifier (TRX_ID)." },
        { name: "user_id", type: "UUID (Foreign Key)", desc: "Paying identity token." },
        { name: "amount", type: "NUMERIC(10,2)", desc: "SaaS purchase price in BDT." },
        { name: "gateway", type: "VARCHAR(50)", desc: "Provider source (bKash | Nagad | Card)." },
        { name: "status", type: "VARCHAR(50)", desc: "Result value: SUCCESS | FAILED | REFUNDED." }
      ]
    }
  };

  // Generate simulated dynamic Proposal document
  const triggerProposalGeneration = () => {
    setIsGeneratingDoc(true);
    setGeneratedDocCode('');
    setTimeout(() => {
      const outputMarkdown = `## BANGLADESH TECHNICAL PROPOSAL OUTLINE
### SECTION 1: DETAILED PROJECT SCOPE
The proposed tender matches the target tender specification for **${customPrompt.substring(0, 60)}...** issued by **${predictPE}**. Our engineers commit to executing all parameters within standard specifications prescribed.

### SECTION 2: DYNAMIC COMPETITIVE LANDSCAPE Analysis
Historical predictive analytics indicate that bidding on this specific agency has an average competition density of **4.8 bidders**. The dominant competitor for high-valuation civil works is **${activeCompetitorProfile}** which has successfully taken **37% of similar awards** with average discount rates of **8.6%**. 

### SECTION 3: WIN PROBABILITY OPTIMIZATION
By applying a quoted discount pricing strategy of **-${((5 + (predictExperience * 0.5)))}%** regarding the **BDT ${predictTenderCost.toLocaleString()}** official estimate, our simulated optimization model indicates a projected win rate of **${Math.min(95, 45 + (predictExperience * 6) - (predictTenderCost > 20000000 ? 12 : 3))}%** while preserving an expected gross operating margin of **14.2%** on materials transport costs.

### SECTION 4: JOINT-VENTURE (JV) STRUCTURE
This document is generated dynamically courtesy of **DORPOTRO.BD Enterprise Proposal Suite**. Authenticated under tenant **${selectedTenant}**. ISO 9001 quality guidelines guaranteed.`;
      
      setGeneratedDocCode(outputMarkdown);
      setIsGeneratingDoc(false);
      showToast("Tender Proposal Blueprint generated from active AI context!", "success");
    }, 1200);
  };

  // Scraper Simulation control
  const toggleScraperSimulator = () => {
    if (isScrapingActive) {
      setIsScrapingActive(false);
      setLiveScraperConsole(prev => [...prev, `[${new Date().toLocaleTimeString()}] SYSTEM: Scraping process suspended manual override.`]);
    } else {
      setIsScrapingActive(true);
      setLiveScraperConsole(prev => [...prev, `[${new Date().toLocaleTimeString()}] SYSTEM: Crawler process initiated. Analyzing target indexes...`]);
      
      // Simulate sequential scraper logs
      const items = [
        "PARSE: Requesting e-GP Tender search endpoint with payload Works/Civil-Engineering.",
        "PARSE: Received HTML response length: 489KB. Parsing table row nodes...",
        "PARSE: Match found! Tender ID #1281050 (Renovation of LGED Gazipur storage) parsed.",
        "DB_MERGE: Target ID #1281050 parsed. Zero hash mismatch detected inside Postgres database.",
        "NOA_SYNC: Querying award database for closed Tender #1281050. Reconciled Contract winner found: Mirza Ltd. at -9.2% discount.",
        "COMPLETED: Web crawler finished scanning targets. Sync telemetry updated gracefully."
      ];

      items.forEach((item, index) => {
        setTimeout(() => {
          setLiveScraperConsole(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${item}`]);
        }, (index + 1) * 800);
      });
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-2xl text-slate-800 font-sans animate-fadeIn">
      
      {/* SaaS Product Header banner info */}
      <div className="bg-slate-900 text-white p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -ml-20 -mb-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 font-mono">
              <span className="bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest border border-indigo-500">
                Product Core Specification
              </span>
              <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest border border-emerald-500/30">
                SaaS Architect V3
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2 font-display">
              <Landmark className="w-8 h-8 text-indigo-400" />
              DORPOTRO.BD Specification Suite
            </h1>
            <p className="text-slate-400 text-xs mt-1.5 max-w-2xl font-sans font-medium">
              Enterprise blueprint and functional mockups covering business architecture, real PostgreSQL relations, dynamic predictive AI runtimes, daily scraper pipelines, and precise page-by-page wireframe layouts.
            </p>
          </div>

          <div className="flex items-center gap-2.5 bg-slate-800 border border-slate-700/80 px-4 py-3 rounded-2xl">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
              S
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono font-bold">Signed Spec Architect</div>
              <div className="text-xs font-bold text-white font-mono break-all">{currentUser.email || 'dorpotro.bd@gmail.com'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main specification themes navigation bar */}
      <div className="bg-white border-b border-slate-200/80 px-4 py-2.5 flex flex-wrap gap-2 sticky top-[102px] z-50 shadow-sm">
        <button
          onClick={() => setActiveTheme('strategy')}
          className={`px-4 py-2 text-xs font-mono font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTheme === 'strategy' 
              ? 'bg-slate-900 text-white shadow-md' 
              : 'text-slate-650 hover:bg-slate-100 hover:text-black'
          }`}
        >
          <Rocket className="w-4 h-4 text-orange-500 font-bold" />
          1. Business &amp; Growth Strategy
        </button>

        <button
          onClick={() => setActiveTheme('architecture')}
          className={`px-4 py-2 text-xs font-mono font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTheme === 'architecture' 
              ? 'bg-slate-900 text-white shadow-md' 
              : 'text-slate-650 hover:bg-slate-100 hover:text-black'
          }`}
        >
          <Database className="w-4 h-4 text-emerald-600" />
          2. Multi-Tenant Architecture &amp; DB
        </button>

        <button
          onClick={() => setActiveTheme('ai')}
          className={`px-4 py-2 text-xs font-mono font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTheme === 'ai' 
              ? 'bg-slate-900 text-white shadow-md' 
              : 'text-slate-650 hover:bg-slate-100 hover:text-black'
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-550" />
          3. AI Predictive Kernels
        </button>

        <button
          onClick={() => setActiveTheme('crawler')}
          className={`px-4 py-2 text-xs font-mono font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTheme === 'crawler' 
              ? 'bg-slate-900 text-white shadow-md' 
              : 'text-slate-650 hover:bg-slate-100 hover:text-black'
          }`}
        >
          <Terminal className="w-4 h-4 text-rose-500" />
          4. e-GP Scraper Pipeline
        </button>

        <button
          onClick={() => setActiveTheme('wireframes')}
          className={`px-4 py-2 text-xs font-mono font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTheme === 'wireframes' 
              ? 'bg-slate-900 text-white shadow-md' 
              : 'text-slate-650 hover:bg-slate-100 hover:text-black'
          }`}
        >
          <Eye className="w-4 h-4 text-purple-600" />
          5. MVP Page Wireframes Spec
        </button>
      </div>

      {/* Main theme content containers */}
      <div className="p-4 md:p-6 space-y-6">

        {/* ==================== THEME A: STRATEGIC & GROWTH ==================== */}
        {activeTheme === 'strategy' && (
          <div className="space-y-6">
            
            {/* Slide Carousel: Investor Pitch Deck */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[9px] font-mono font-bold text-orange-600 uppercase tracking-widest block">INVESTOR SPECIFICATION</span>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5 font-display">
                    <Target className="w-5 h-5 text-orange-500" />
                    DORPOTRO.BD Funded Pitch Deck Carousel
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold bg-slate-100 px-2.5 py-1 rounded text-slate-500">
                    Slide {pitchDeckSlide + 1} of {pitchDeckSlides.length}
                  </span>
                  <div className="flex gap-1">
                    <button 
                      onClick={handlePrevSlide}
                      className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-xs font-black cursor-pointer transition"
                    >
                      &larr;
                    </button>
                    <button 
                      onClick={handleNextSlide}
                      className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-xs font-black cursor-pointer transition"
                    >
                      &rarr;
                    </button>
                  </div>
                </div>
              </div>

              {/* Individual Active Slide presentation view */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-[#fcfdff] border border-orange-100 p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-xl"></div>
                
                <div className="md:col-span-8 space-y-4 text-left">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-orange-600 uppercase tracking-wider font-bold block">ACTIVE SLIDE DECK VIEW</span>
                    <h4 className="text-lg font-black text-slate-900 tracking-tight font-display">
                      {pitchDeckSlides[pitchDeckSlide].title}
                    </h4>
                    <p className="text-xs font-bold text-slate-550 italic block text-indigo-600 mt-1">
                      {pitchDeckSlides[pitchDeckSlide].subtitle}
                    </p>
                  </div>

                  <p className="text-slate-650 text-xs leading-relaxed font-medium">
                    {pitchDeckSlides[pitchDeckSlide].content}
                  </p>

                  <div className="space-y-1.5 mt-2">
                    <span className="text-[9px] font-mono font-bold uppercase text-slate-400">Strategic Takeaways</span>
                    <div className="space-y-1">
                      {pitchDeckSlides[pitchDeckSlide].bullets.map((b, bIdx) => (
                        <div key={bIdx} className="flex items-start gap-2 text-xs text-slate-650 font-medium">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-4 bg-white border border-slate-200/85 p-5 rounded-xl flex flex-col justify-center items-center text-center shadow-2xs">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Telemetry Highlight</span>
                  <strong className="text-orange-500 font-display text-2xl font-black mt-1.5 block">{pitchDeckSlides[pitchDeckSlide].metric}</strong>
                  <p className="text-slate-500 font-sans text-[10.5px] mt-1 font-semibold leading-snug">{pitchDeckSlides[pitchDeckSlide].metricLabel}</p>
                </div>
              </div>
            </div>

            {/* Business models Matrix panel */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {[
                { 
                  id: 'free', 
                  title: 'Free Plan', 
                  price: '৳0', 
                  period: 'forever', 
                  badge: 'LAND FOR CRAWLING',
                  desc: 'A strategic gateway designed to map and onboard low-budget general suppliers organic users.',
                  features: [
                    'Standard e-GP Notice Keyword Search',
                    'Basic Daily Email Alerts (1 trigger)',
                    'Supported by Sponsor Ads (Admin ads)',
                    'Community Forum general access'
                  ]
                },
                { 
                  id: 'pro', 
                  title: 'Pro Plan', 
                  price: '৳2,500', 
                  period: 'monthly', 
                  badge: 'SWEET SPOT civil works',
                  desc: 'For active private general contractors demanding full NOA and competitive pricing telemetry.',
                  features: [
                    'Ad-Free Unrestricted User Interface',
                    'Matched NOA Award Bid & Winner Indexer',
                    'AI bid probability optimization metric',
                    '10 Daily Multi-department Alerts',
                    'Priority instant Email dispatch'
                  ]
                },
                { 
                  id: 'business', 
                  title: 'Business Tier', 
                  price: '৳8,500', 
                  period: 'monthly', 
                  badge: 'CONSTRUCTION CONSORTIUMS',
                  desc: 'Designated for established engineering groups bidding multi-department OTM contracts.',
                  features: [
                    'Up to 5 Federated user licenses included',
                    'Joint-Venture Shadow Ledger workspaces',
                    'Automated Document Catalog compliance',
                    'Bulk Export Excel and Sheet outputs',
                    'Instant SMS alert dispatch API'
                  ]
                },
                { 
                  id: 'enterprise', 
                  title: 'Enterprise CRM', 
                  price: 'Contact', 
                  period: 'annual contract', 
                  badge: 'Oligarch Builders',
                  desc: 'Fully bespoke white-labeled infrastructure mapped to national civil engineering groups.',
                  features: [
                    'Unlimited multi-tenant logins',
                    'Dedicated PostgreSQL Spanner synchronization',
                    'Custom ML fine-tuning weights',
                    'SLA-guaranteed priority technical support',
                    'Individual on-site training sessions'
                  ]
                }
              ].map((p) => (
                <div 
                  key={p.id} 
                  onClick={() => setActivePlan(p.id as any)}
                  className={`bg-white border rounded-2xl p-5 shadow-sm space-y-4 cursor-pointer transition duration-300 relative overflow-hidden flex flex-col justify-between ${
                    p.id === activePlan 
                      ? 'border-indigo-550 ring-2 ring-indigo-100 shadow-lg translate-y-[-2px]' 
                      : 'border-slate-200 hover:border-slate-350'
                  }`}
                >
                  {p.id === 'pro' && (
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[8px] font-mono font-bold px-3 py-1 rounded-bl uppercase tracking-widest flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 fill-current" /> Recommend
                    </div>
                  )}

                  <div className="space-y-2 text-left">
                    <span className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest">{p.badge}</span>
                    <h4 className="text-sm font-black text-slate-900 font-display">{p.title}</h4>
                    <p className="text-slate-500 text-[11px] leading-relaxed font-semibold">{p.desc}</p>
                    
                    <div className="pt-2">
                      <strong className="text-slate-900 text-2xl font-black font-mono">{p.price}</strong>
                      <span className="text-slate-400 font-mono text-[9px] font-bold block mt-0.5">per company / {p.period}</span>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-slate-100 pt-3.5 mt-2 text-left shrink-0">
                    <span className="text-[8.5px] font-mono font-bold uppercase text-slate-400 block font-sans">Included in Tier</span>
                    <div className="space-y-1">
                      {p.features.map((f, fIdx) => (
                        <div key={fIdx} className="flex items-center gap-1.5 text-[10px] text-slate-650 font-medium font-sans">
                          <CheckSquare className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Growth loop model & organic referrals */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Strategic Marketing Loops & SEO Channels */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <span className="text-[9px] font-mono font-bold text-indigo-600 uppercase tracking-widest block">GTM DISCOVERY Telemetry</span>
                <h4 className="text-xs font-bold font-mono tracking-tight text-slate-950 flex items-center gap-1.5 uppercase border-b border-slate-100 pb-2">
                  <Rocket className="w-4 h-4 text-indigo-500" />
                  SEO Strategy &amp; Double-Loop Viral Mechanics
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-left">
                    <span className="text-[9px] font-mono font-bold text-indigo-600 uppercase tracking-widest">A. programmatic SEO Loop</span>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Generated indexable landing pages targeting specific e-GP IDs automatically. Rank 1st on Google search indices when contractors seek official bid statistics.
                    </p>
                    <div className="bg-white px-2 py-1.5 rounded border border-slate-200 text-[9.5px]/snug font-mono text-slate-500">
                      Query: <strong className="text-slate-700">Tender 1282055 details on Google</strong><br />
                      Outcome: <span className="text-emerald-600 font-bold">1st Rank: Live metrics on DORPOTRO &rarr;</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-left">
                    <span className="text-[9px] font-mono font-bold text-emerald-600 uppercase tracking-widest">B. JV Collaborative Viral Loop</span>
                    <p className="text-slate-600 text-[11px] leading-relaxed font-semibold">
                      When primary contractors design Joint-Venture pricing profiles, they dispatch invitations to secondary partners. These partners join the CRM workspace, multiplying client bases organically.
                    </p>
                    <div className="bg-white px-2 py-1.5 rounded border border-slate-200 text-[9.5px]/snug font-mono text-slate-500">
                      Trigger: <strong className="text-slate-700">Invite consortium partner via email</strong><br />
                      Reward: <span className="text-indigo-600 font-bold">Consortium signs up on DORPOTRO to view specs</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Referral sandbox simulation */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                <span className="text-[9px] font-mono font-bold text-orange-600 uppercase tracking-widest block">MONETIZATION PROGRAM</span>
                <h4 className="text-xs font-bold font-mono tracking-tight text-slate-950 flex items-center gap-1.5 uppercase border-b border-slate-100 pb-2">
                  <Share2 className="w-4 h-4 text-orange-500" />
                  Contractor Affiliate Referral Engine
                </h4>

                <p className="text-slate-500 text-[11.5px] leading-relaxed">
                  Refer other peer contractors to DORPOTRO Pro using your personalized portal credentials. On successful premium conversion, get cash credited instantly to your bKash merchant account.
                </p>

                <div className="bg-[#fefce8] border border-yellow-200 rounded-xl p-3 text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-yellow-800">Your Share Link:</span>
                    <span className="text-[9px] bg-white border border-yellow-300 px-1.5 py-0.2 rounded font-mono text-yellow-700 font-black">ACTIVE</span>
                  </div>
                  <code className="text-[10px] text-slate-600 select-all underline block mt-1 font-mono break-all font-bold">
                    https://dorpotro.bd/register?refferal=U_DORPOTRO_BD
                  </code>
                </div>

                <div className="space-y-2.5 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Simulate Successful Referrals:</span>
                    <strong className="text-slate-800 text-xs font-black">{referralCount} users</strong>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="15" 
                    value={referralCount} 
                    onChange={e => setReferralCount(parseInt(e.target.value))} 
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex justify-between items-center text-[11px] font-mono">
                    <span className="text-slate-500 font-bold block">Estimated Commission Credit:</span>
                    <strong className="text-emerald-600 font-black text-xs block">৳{calculatedReferralBonus.toLocaleString()} BDT</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Roadmap timelines check */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <span className="text-[9px] font-mono font-bold text-indigo-600 uppercase tracking-widest block">PRODUCT MILESTONE DIRECTIVES</span>
              <h4 className="text-xs font-bold font-mono tracking-tight text-slate-900 flex items-center gap-1.5 uppercase border-b border-slate-100 pb-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                DORPOTRO.BD 12-Month Product Launch Roadmap
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {roadmapMilestones.map((rm, rmIdx) => (
                  <div 
                    key={rmIdx} 
                    onClick={() => setChosenRoadmapMilestone(rmIdx)}
                    className={`p-4 rounded-xl border text-left transition duration-200 cursor-pointer ${
                      chosenRoadmapMilestone === rmIdx 
                        ? 'bg-[#eef2ff]/60 border-indigo-250 ring-1 ring-indigo-50 shadow-sm' 
                        : 'bg-white border-slate-150 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-[9.5px] font-mono font-bold text-indigo-600 uppercase tracking-wide bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full inline-block">
                      {rm.qr}
                    </span>
                    <h5 className="text-xs font-black text-slate-800 mt-2 block font-sans leading-snug">{rm.title}</h5>
                    <p className="text-slate-500 text-[10px] leading-relaxed mt-1">{rm.desc}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ==================== THEME B: SYSTEM ARCHITECTURE ==================== */}
        {activeTheme === 'architecture' && (
          <div className="space-y-6">
            
            {/* Database schemas physical specifications */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[9px] font-mono font-bold text-emerald-600 uppercase tracking-widest block">PostgreSQL Core schemas</span>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5 font-display">
                    <Database className="w-5 h-5 text-emerald-600" />
                    Interactive Relational database specifications
                  </h3>
                </div>
                
                {/* Schema selector keys */}
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(schemaTables).map((tbl) => (
                    <button
                      key={tbl}
                      onClick={() => setSelectedSchemaTable(tbl as any)}
                      className={`px-3 py-1 text-[11px] font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                        selectedSchemaTable === tbl 
                          ? 'bg-emerald-500 text-white shadow-sm' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      tb_{tbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table details output */}
              <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl space-y-4 text-left shadow-inner relative overflow-hidden font-mono text-xs">
                <div className="absolute top-0 right-0 p-3 bg-slate-800/40 text-slate-500 text-[10px] uppercase font-bold tracking-widest rounded-bl-xl">
                  schema_definition
                </div>

                <div className="space-y-1">
                  <span className="text-emerald-400 font-bold">// Schema Table Target</span>
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-black text-white">public.{selectedSchemaTable}</strong>
                    <span className="text-[10px] text-slate-450 border border-slate-700 px-1.5 py-0.2 rounded uppercase">
                      Physical Model
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed pt-1 font-sans font-medium">
                    {schemaTables[selectedSchemaTable].desc}
                  </p>
                </div>

                <div className="border-t border-slate-800 pt-3 space-y-2">
                  <span className="text-slate-450 font-bold block text-[10.5px]">COLUMN METADATA MAPPINGS:</span>
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-2">
                    {schemaTables[selectedSchemaTable].cols.map((col: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-start py-1 border-b border-slate-800/60 text-[11px] hover:bg-slate-800/30 px-1 rounded transition">
                        <div className="flex gap-2">
                          <code className="text-emerald-350 font-bold">{col.name}</code>
                          <span className="text-slate-400">({col.type})</span>
                        </div>
                        <span className="text-slate-350 text-[10.5px] font-sans font-medium">{col.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Folder structure overview specification */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <span className="text-[9px] font-mono font-bold text-indigo-650 uppercase tracking-widest block">NestJS + Next.js repository tree</span>
                <h4 className="text-xs font-bold font-mono tracking-tight text-slate-950 flex items-center gap-1.5 uppercase border-b border-slate-100 pb-2">
                  <Code className="w-4 h-4 text-indigo-500" />
                  Product Complete Monorepo Folder Structure
                </h4>

                <div className="bg-[#fbfcfd] border border-slate-200 p-4 rounded-xl text-left max-h-[280px] overflow-y-auto font-mono text-[10px]/snug space-y-1 select-text">
                  <div className="text-slate-400 block">// Root Repository layout</div>
                  <div className="text-slate-800"><span className="text-slate-300">├──</span> app/ <span className="text-slate-450 ml-1 font-sans font-semibold">// Next.js Client Frontend SPA</span></div>
                  <div className="text-slate-550 pl-5"><span className="text-slate-300">├──</span> src/components/ <span className="text-slate-450 ml-1 font-sans">// Modular dashboards, explorers</span></div>
                  <div className="text-slate-550 pl-5"><span className="text-slate-300">├──</span> src/hooks/ <span className="text-slate-450 ml-1 font-sans">// custom polling and auth hooks</span></div>
                  <div className="text-slate-550 pl-5"><span className="text-slate-300">└──</span> package.json <span className="text-slate-450 ml-1 font-sans">// SPA package dependency</span></div>
                  
                  <div className="text-slate-800"><span className="text-slate-300">├──</span> server/ <span className="text-slate-450 ml-1 font-sans font-semibold">// NestJS Core API Backend</span></div>
                  <div className="text-slate-555 pl-5"><span className="text-slate-300">├──</span> src/auth/ <span className="text-slate-450 ml-1 font-sans">// Jwt Auth modules, Google OAuth passport</span></div>
                  <div className="text-slate-555 pl-5"><span className="text-slate-300">├──</span> src/tender/ <span className="text-slate-450 ml-1 font-sans">// e-GP crawling controller, duplicate filters</span></div>
                  <div className="text-slate-555 pl-5"><span className="text-slate-300">├──</span> src/noa-sync/ <span className="text-slate-450 ml-1 font-sans">// background reconciler daemon</span></div>
                  <div className="text-slate-555 pl-5"><span className="text-slate-300">├──</span> src/ai/ <span className="text-slate-450 ml-1 font-sans">// Gemini pricing prediction wrapper</span></div>
                  <div className="text-slate-555 pl-5"><span className="text-slate-300">└──</span> prisma/ <span className="text-slate-450 ml-1 font-sans">// PostgreSQL migrations schema</span></div>

                  <div className="text-slate-800"><span className="text-slate-300">├──</span> deployment/ <span className="text-slate-450 ml-1 font-sans font-semibold">// Container Orchestration</span></div>
                  <div className="text-slate-555 pl-5"><span className="text-slate-300">├──</span> Dockerfile <span className="text-slate-450 ml-1 font-sans">// multi-stage Alpine build wrapper</span></div>
                  <div className="text-slate-555 pl-5"><span className="text-slate-300">├──</span> kubernetes.yaml <span className="text-slate-450 ml-1 font-sans">// load balancer ingress policies</span></div>
                  <div className="text-slate-555 pl-5"><span className="text-slate-300">└──</span> .env.example <span className="text-slate-450 ml-1 font-sans">// explicit environment variable template</span></div>
                </div>
              </div>

              {/* API Security, Token verification simulators */}
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <span className="text-[9px] font-mono font-bold text-rose-650 uppercase tracking-widest block font-sans">Security architecture</span>
                <h4 className="text-xs font-bold font-mono tracking-tight text-slate-950 flex items-center gap-1.5 uppercase border-b border-slate-100 pb-2">
                  <Shield className="w-4 h-4 text-rose-500" />
                  REST API Gate &amp; Tenant JWT Verifier
                </h4>

                <p className="text-slate-555 text-[11px] leading-relaxed">
                  Bypassing manual middleware logic inside NestJS. DORPOTRO.BD authenticates API calls via custom secure JWT tokens containing tenant subdomains and subscription clearances.
                </p>

                <div className="space-y-2.5">
                  <div className="space-y-1 text-xs">
                    <label className="block text-slate-500 font-bold uppercase text-[9px] font-mono">Select Simulated Tenant Client Space</label>
                    <select
                      value={selectedTenant}
                      onChange={e => setSelectedTenant(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-220 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-rose-500"
                    >
                      <option value="TENANT_REHMAN_ENG">Rehman Engineering &amp; Co. Ltd (Pro)</option>
                      <option value="TENANT_NDE_CORP">National Development Engineers (Enterprise)</option>
                      <option value="TENANT_CHOWDHURY_SNE">Chowdhury &amp; Sons General Suppliers (Free)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const randHash = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + btoa(JSON.stringify({
                        tenant: selectedTenant,
                        iss: "DORPOTRO.BD Auth",
                        client_tier: selectedTenant === 'TENANT_CHOWDHURY_SNE' ? 'free' : 'premium',
                        iat: Date.now()
                      })).substring(0, 40) + '...verify_ok';
                      setSecurityTokenSim(randHash);
                      showToast(`JWT Token initialized for ${selectedTenant}! Headers verified securely.`, "success");
                    }}
                    className="w-full bg-slate-900 text-white font-mono text-[10.5px] py-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  >
                    GENERATE SECURE AUTH TOKEN &rarr;
                  </button>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[10.5px] font-mono text-emerald-400 max-h-[80px] overflow-hidden truncate block text-left">
                    {securityTokenSim ? (
                      <>
                        <span className="text-slate-500 block text-[8px] uppercase tracking-wider">// Authorization Bearer:</span>
                        Bearer {securityTokenSim}
                      </>
                    ) : (
                      <span className="text-slate-500 italic block font-bold mt-1 text-center">Empty security payload. Instantiate token above.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ==================== THEME C: CORE AI MODULES ==================== */}
        {activeTheme === 'ai' && (
          <div className="space-y-6">
            
            {/* AI Win Probability predictive calculator */}
            <div className="bg-white border border-indigo-250 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
              <span className="text-[9px] font-mono font-bold text-indigo-650 uppercase tracking-widest block font-sans">Active AI Modeling Engine</span>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5 uppercase border-b border-slate-100 pb-2 font-display">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                Bangladesh Government Win Probability Telemetry
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                
                {/* Simulation controls */}
                <div className="lg:col-span-5 space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-205 text-left">
                  <span className="text-[9px] font-mono font-bold text-indigo-600 uppercase tracking-widest block">Simulation input attributes</span>

                  <div className="space-y-1 font-sans text-xs">
                    <label className="block text-slate-500 font-bold uppercase text-[9px]">Official e-GP Cost Estimate (৳)</label>
                    <input 
                      type="number" 
                      value={predictTenderCost} 
                      onChange={e => setPredictTenderCost(parseFloat(e.target.value) || 0)} 
                      className="w-full bg-white border border-slate-220 p-2 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1 font-sans text-xs">
                    <label className="block text-slate-500 font-bold uppercase text-[9px]">Procuring Entity (PE) Department</label>
                    <select
                      value={predictPE}
                      onChange={e => setPredictPE(e.target.value)}
                      className="w-full bg-white border border-slate-220 p-2 rounded-lg text-xs"
                    >
                      <option value="Local Government Engineering Department (LGED)">LGED - Engineering Department</option>
                      <option value="Public Works Department (PWD)">PWD - Public Works</option>
                      <option value="Bangladesh Water Development Board (BWDB)">BWDB - Water Board</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3 font-sans text-xs">
                    <div className="space-y-1">
                      <label className="block text-slate-500 font-bold uppercase text-[9px]">District Location</label>
                      <input 
                        type="text" 
                        value={predictRegion} 
                        onChange={e => setPredictRegion(e.target.value)} 
                        className="w-full bg-white border border-slate-220 p-2 rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-slate-500 font-bold uppercase text-[9px]">Your Civil Exp (Years)</label>
                      <input 
                        type="number" 
                        value={predictExperience} 
                        onChange={e => setPredictExperience(parseInt(e.target.value) || 1)} 
                        className="w-full bg-white border border-slate-220 p-2 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* AI Outputs & Probability gauge readings */}
                <div className="lg:col-span-7 bg-white border border-slate-205 p-5 rounded-2xl flex flex-col justify-between text-left space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">// AI Prediction analysis</span>
                    <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase">
                      Gemini API Grounded Output
                    </span>
                  </div>

                  {/* Probability readout bar */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono font-bold uppercase text-slate-400 block">Estimated Win Probability percentage:</span>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden relative border border-slate-200">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
                          style={{ width: `${Math.min(95, 45 + (predictExperience * 6) - (predictTenderCost > 20000000 ? 12 : 3))}%` }}
                        ></div>
                        <span className="absolute inset-0 flex items-center justify-center font-bold text-[10.5px] text-slate-800 font-mono">
                          {Math.min(95, 45 + (predictExperience * 6) - (predictTenderCost > 20000000 ? 12 : 3))}% Win Chance
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Model justifications summary metrics */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 block text-left">
                      <span className="text-[8.5px] font-mono uppercase text-slate-400 block font-bold">Recommended Quote Margin</span>
                      <strong className="text-slate-850 font-black font-mono block mt-0.5 text-xs">-{((4 + (predictExperience * 0.4))).toFixed(1)}% Discount</strong>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 block text-left">
                      <span className="text-[8.5px] font-mono uppercase text-slate-400 block font-bold">Agencies Liquidation risk</span>
                      <strong className="text-amber-600 font-black font-sans block mt-0.5 text-xs text-left">Moderate (68-days lag)</strong>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Document generator AI playground */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-left">
              
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <span className="text-[9px] font-mono font-bold text-indigo-650 uppercase tracking-widest block">AI-powered Document creator</span>
                <h4 className="text-xs font-bold font-mono tracking-tight text-slate-900 flex items-center gap-1.5 uppercase border-b border-slate-100 pb-2">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  Dynamic compliance Proposal Blueprint Generator
                </h4>

                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Generates technical proposal arguments and competitive profiles based on recent matched databases, utilizing local contractors criteria.
                </p>

                <div className="space-y-3">
                  <div className="space-y-1 font-sans text-xs">
                    <label className="block text-slate-500 font-bold uppercase text-[9px]">Competitor targeted for analysis</label>
                    <select
                      value={activeCompetitorProfile}
                      onChange={e => setActiveCompetitorProfile(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-220 p-2 rounded-lg text-xs"
                    >
                      <option value="National Development Engineers (NDE)">National Development Engineers (NDE)</option>
                      <option value="Spectra Engineers Ltd.">Spectra Engineers Ltd.</option>
                      <option value="Rahman &amp; Sons Builders">Rahman &amp; Sons Builders Co.</option>
                    </select>
                  </div>

                  <div className="space-y-1 font-sans text-xs">
                    <label className="block text-slate-500 font-bold uppercase text-[9px]">Tender package scope context</label>
                    <textarea
                      rows={3}
                      value={customPrompt}
                      onChange={e => setCustomPrompt(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-220 p-2 rounded-lg text-xs"
                    ></textarea>
                  </div>

                  <button
                    type="button"
                    onClick={triggerProposalGeneration}
                    disabled={isGeneratingDoc}
                    className="w-full bg-indigo-600 text-white font-mono font-bold text-xs py-2 rounded-lg hover:bg-indigo-705 transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    {isGeneratingDoc ? "ENGAGING LLM KERNEL..." : "GENERATE TECHNICAL SPEC PROPOSAL"}
                  </button>
                </div>
              </div>

              {/* Dynamic generated Output preview */}
              <div className="lg:col-span-7 flex flex-col h-full bg-slate-900 border border-slate-950 rounded-2xl overflow-hidden shadow-inner font-mono text-[10.5px] text-slate-300">
                <div className="flex justify-between items-center bg-slate-950 px-4 py-2.5 shrink-0 border-b border-slate-900">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5 uppercase">
                    <Terminal className="w-4 h-4" /> Output Stream (COMPLY_PROPOSAL.md)
                  </span>
                  <span className="text-[9px] text-slate-500">PROPOSAL_ENGINE_STDOUT</span>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-2 max-h-[300px] text-left">
                  {generatedDocCode ? (
                    <div className="whitespace-pre-line leading-relaxed font-mono select-text font-medium text-slate-200">
                      {generatedDocCode}
                    </div>
                  ) : (
                    <div className="text-slate-500 flex flex-col items-center justify-center h-48 italic font-bold">
                      <FileText className="w-10 h-10 mb-2 stroke-1" />
                      Ready to generate proposal document. Engage technical spec proposal on the left!
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ==================== THEME D: CRAWLER & SCRAPING ==================== */}
        {activeTheme === 'crawler' && (
          <div className="space-y-6">
            
            {/* Scraping loop controls */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-left">
              <span className="text-[9px] font-mono font-bold text-rose-600 uppercase tracking-widest block font-sans">Automated Scraping infrastructure</span>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5 uppercase border-b border-slate-100 pb-2">
                <Terminal className="w-5 h-5 text-rose-500" />
                Bangladesh e-GP Portal Scraping &amp; Sync Architecture
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 leading-relaxed text-slate-600 font-sans text-xs">
                
                <div className="lg:col-span-5 space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-205 rounded-2xl space-y-3 text-left">
                    <span className="text-[9px] font-mono font-bold text-indigo-600 uppercase tracking-widest block">Synchronization Configs</span>
                    
                    <p className="text-[11.5px] leading-relaxed">
                      Scrapes and indexes current active procurement listings by crawling standard tables every 24 hours. The deduplication layer skips existing ID hashes natively to prevent database bloat.
                    </p>

                    <div className="space-y-1.5 pt-1">
                      <label className="block text-slate-500 font-bold uppercase text-[9px] font-mono">Sync Check IntervalFrequency</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: '1', label: 'Daily (02:00)' },
                          { id: '12', label: 'Semi-Daily' },
                          { id: '0', label: 'Continuous' }
                        ].map(f => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              setScrapingFrequency(f.id);
                              showToast(`Configured sync check frequency to ${f.label}!`, "info");
                            }}
                            className={`p-1 px-2 text-[10px] font-mono font-bold rounded border ${
                              scrapingFrequency === f.id 
                                ? 'bg-rose-50 border-rose-300 text-rose-700 font-black' 
                                : 'bg-white border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Daemon active status:</span>
                      <button
                        onClick={toggleScraperSimulator}
                        className={`p-1.5 px-3 rounded-lg text-[10.5px] font-mono font-bold uppercase transition cursor-pointer ${
                          isScrapingActive 
                            ? 'bg-rose-600 text-white hover:bg-rose-700' 
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {isScrapingActive ? 'PAUSE CRON' : 'RUN DAEMON'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Scraping logging console */}
                <div className="lg:col-span-7 flex flex-col h-full bg-slate-900 border border-slate-950 rounded-2xl overflow-hidden shadow-inner font-mono text-[10px]/snug text-slate-350">
                  <div className="bg-slate-950 px-4 py-2.5 flex justify-between items-center text-rose-450 border-b border-slate-900">
                    <span className="font-bold flex items-center gap-1.5 uppercase shrink-0">
                      <Terminal className="w-4 h-4 text-rose-450" /> e-GP crawler simulation live logging
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">CRAWLER_STDOUT</span>
                  </div>

                  <div className="flex-1 p-3.5 space-y-1 overflow-y-auto max-h-[190px] min-h-[190px] text-left">
                    {liveScraperConsole.map((msg, index) => (
                      <div key={index} className="flex gap-1.5 border-b border-slate-900 pb-0.5 whitespace-pre-wrap shrink-0">
                        <span className="text-slate-405">{msg}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* ==================== THEME E: MVP WIREFRAMES ==================== */}
        {activeTheme === 'wireframes' && (
          <div className="space-y-6">
            
            {/* Interactive MVP Wireframe page specification and display */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[9px] font-mono font-bold text-purple-600 uppercase tracking-widest block font-sans">MVP UX / UI specification</span>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 uppercase font-mono">
                    <Eye className="w-5 h-5 text-purple-600" />
                    Interactive MVP Page Wireframe blueprints &amp; Layout Grid Specs
                  </h3>
                </div>

                {/* Wireframe screen selectors */}
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'dashboard', label: '1. Executive Dashboard' },
                    { id: 'tender_list', label: '2. Notice Explorer' },
                    { id: 'analytics', label: '3. Analytics' },
                    { id: 'optimizer', label: '4. Bid Predictor' },
                    { id: 'team', label: '5. Collaborative JV Workspace' }
                  ].map((scr) => (
                    <button
                      key={scr.id}
                      onClick={() => setSelectedWireframeScreen(scr.id as any)}
                      className={`px-3 py-1.5 text-[10.5px] font-mono font-bold rounded-xl transition duration-200 cursor-pointer ${
                        selectedWireframeScreen === scr.id 
                          ? 'bg-purple-600 text-white shadow' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-250'
                      }`}
                    >
                      {scr.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Layout specs display content */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 font-sans">
                
                <div className="lg:col-span-5 space-y-4 text-left font-sans">
                  
                  {selectedWireframeScreen === 'dashboard' && (
                    <div className="space-y-3">
                      <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">PAGE-BY-PAGE SPECIFICATION:</span>
                      <h4 className="text-sm font-black text-slate-900 leading-snug">Executive Telemetry Hub Layout Specs</h4>
                      <p className="text-slate-600 text-xs leading-relaxed font-semibold">
                        The landing workspace for builders. Displays raw aggregate analytics, tender deadlines, and dynamic notifications customized by district of operations.
                      </p>
                      
                      <div className="space-y-2 text-xs pt-1">
                        <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                          <strong className="block text-slate-800 uppercase font-mono text-[9px]">Top Left Header block:</strong>
                          <span className="text-slate-500 font-medium">Enterprise custom welcome message with verified subscription status tag.</span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                          <strong className="block text-slate-800 uppercase font-mono text-[9px]">Top Right Telemetry Blocks:</strong>
                          <span className="text-slate-500 font-medium">Bento grids illustrating average quoted discount rate and matched NOA listings.</span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                          <strong className="block text-slate-800 uppercase font-mono text-[9px]">Center Content Area:</strong>
                          <span className="text-slate-500 font-medium">Responsive multi-column cards showing current active procurement circular deadlines.</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedWireframeScreen === 'tender_list' && (
                    <div className="space-y-3">
                      <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">PAGE-BY-PAGE SPECIFICATION:</span>
                      <h4 className="text-sm font-black text-slate-900">Notice Search &amp; ID matching Spec</h4>
                      <p className="text-slate-600 text-xs leading-relaxed">
                        Enables high-efficiency filtering of parsed e-GP tenders. Direct inputs allow searches across 65,000+ scraped database rows.
                      </p>
                      
                      <div className="space-y-2 text-xs pt-1">
                        <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                          <strong className="block text-slate-805 uppercase font-mono text-[9px]">Primary Input forms:</strong>
                          <span className="text-slate-500">Tender search inputs filtering by department, nature, and procurement method.</span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                          <strong className="block text-slate-805 uppercase font-mono text-[9px]">Data Table view:</strong>
                          <span className="text-slate-500">Structured row lists matching e-GP schema guidelines, complete with visual clipboard copy tools.</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedWireframeScreen === 'analytics' && (
                    <div className="space-y-3">
                      <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">PAGE-BY-PAGE SPECIFICATION:</span>
                      <h4 className="text-sm font-black text-slate-900">National civil Works Analytics layout Spec</h4>
                      <p className="text-slate-600 text-xs leading-relaxed">
                        Renders dynamic Recharts indices of specific Procuring Entity performance over the past six quarters.
                      </p>
                      
                      <div className="space-y-2 text-xs pt-1">
                        <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                          <strong className="block text-slate-805 uppercase font-mono text-[9px]">Left Hand chart:</strong>
                          <span className="text-slate-500">Recharts Bar plots mapping comparative procurement nature values (ivil works vs goods).</span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                          <strong className="block text-slate-805 uppercase font-mono text-[9px]">Right Hand Index panel:</strong>
                          <span className="text-slate-500">Lists trend indicators of delayed liquidations and payment schedules.</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedWireframeScreen === 'optimizer' && (
                    <div className="space-y-3">
                      <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">PAGE-BY-PAGE SPECIFICATION:</span>
                      <h4 className="text-sm font-black text-slate-900">Predictive Pricing Simulator Screen Spec</h4>
                      <p className="text-slate-600 text-xs leading-relaxed">
                        Interactive inputs allow simulated adjustments of profit margins to calculate probability curves dynamically.
                      </p>
                      
                      <div className="space-y-2 text-xs pt-1">
                        <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                          <strong className="block text-slate-805 uppercase font-mono text-[9px]">Left Parameters block:</strong>
                          <span className="text-slate-500">Sliders controlling expected bidding pricing quote strategy parameters.</span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                          <strong className="block text-slate-805 uppercase font-mono text-[9px]">Right Output metric display:</strong>
                          <span className="text-slate-500">Visually striking win probability index score calculations with recommendation cards.</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedWireframeScreen === 'team' && (
                    <div className="space-y-3">
                      <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">PAGE-BY-PAGE SPECIFICATION:</span>
                      <h4 className="text-sm font-black text-slate-900">Joint-Venture Workspace sharing layouts Spec</h4>
                      <p className="text-slate-600 text-xs leading-relaxed">
                        Empowers active partnership collaborations on joint civil works bid templates. Secure shadow ledger.
                      </p>
                      
                      <div className="space-y-2 text-xs pt-1">
                        <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                          <strong className="block text-slate-805 uppercase font-mono text-[9px]">Collaborative lists:</strong>
                          <span className="text-slate-500">Shared task assignments tracking file attachments and sub-contract catalog assets.</span>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Interactive Wireframe Visualizer */}
                <div className="lg:col-span-7 bg-[#0f172a] border border-slate-950 p-5 rounded-2xl shadow-xl flex flex-col min-h-[340px] text-left select-none relative font-mono text-[11px] text-slate-350">
                  <div className="absolute top-0 right-0 p-3 text-[9px] font-bold text-slate-600 tracking-wider bg-slate-950/40 rounded-bl-xl border-l border-b border-slate-800">
                    WIRE_MODEL_SHADOW
                  </div>

                  <div className="flex items-center gap-1.5 border-b border-slate-800 pb-3 mb-4 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-500 font-black ml-2 uppercase text-[10px]">
                      DORPOTRO INTERACTIVE UX MODEL: /{selectedWireframeScreen}
                    </span>
                  </div>

                  {/* Wireframe Mock Layouts renders */}
                  <div className="flex-1 bg-slate-950/80 border border-slate-850 rounded-xl p-4 flex flex-col justify-between font-mono text-[10.5px]">
                    
                    {selectedWireframeScreen === 'dashboard' && (
                      <div className="space-y-3 text-left">
                        <div className="flex justify-between items-center text-[10px] text-indigo-400">
                          <span>[NAVHEADER] DORPOTRO.BD</span>
                          <span>[MEMBER] tier=premium</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="border border-dashed border-slate-800 p-2 text-center text-slate-500">
                            [METRIC]<br />৳5.2B matched Award
                          </div>
                          <div className="border border-dashed border-slate-800 p-2 text-center text-slate-500">
                            [TENDERS]<br/>29 actively tracked
                          </div>
                          <div className="border border-dashed border-slate-800 p-2 text-center text-slate-500">
                            [WINS]<br/>+4.25% Probability
                          </div>
                        </div>
                        <div className="border border-dashed border-slate-800 p-3 rounded text-center text-slate-500 min-h-[80px] flex items-center justify-center">
                          [CENTER_GRID_NOTICE_DEADLINES] Daily circular tenders list matched by district
                        </div>
                      </div>
                    )}

                    {selectedWireframeScreen === 'tender_list' && (
                      <div className="space-y-3 text-left">
                        <div className="flex justify-between items-center text-[10px] text-indigo-400">
                          <span>[DORPOTRO] e-GP crawled database indexer</span>
                          <span>[PAGE_SIZE] showing 1-25 of 65k</span>
                        </div>
                        <div className="border border-dashed border-slate-800 p-2 text-slate-500 rounded bg-slate-900 flex justify-between">
                          <span>Search inputs payload... [Keywords] [Department_Filter] [Region]</span>
                          <span className="bg-slate-800 px-1.5 rounded cursor-pointer">[Query]</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="border border-dashed border-slate-800 p-1.5 text-slate-500 flex justify-between">
                            <span>ID: 1282055 - Pipes Construct under LGED Gazipur</span>
                            <span className="text-[9px] text-emerald-500">[View Stats]</span>
                          </div>
                          <div className="border border-dashed border-slate-800 p-1.5 text-slate-500 flex justify-between">
                            <span>ID: 1282051 - Septic Tank clearing at PWD Dhaka</span>
                            <span className="text-[9px] text-emerald-500">[View Stats]</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedWireframeScreen === 'analytics' && (
                      <div className="space-y-3 text-left">
                        <div className="flex justify-between items-center text-[10px] text-indigo-400">
                          <span>[METRICS] Civil Works comparative Nature statistics</span>
                          <span>[AUDIT_FAIL] Verified</span>
                        </div>
                        <div className="grid grid-cols-12 gap-3 min-h-[140px]">
                          <div className="col-span-8 border border-dashed border-slate-800 p-5 rounded text-center text-slate-500 flex items-center justify-center">
                            [RECHARTS_BAR_GROUPED_CHART_MODEL] Comparative allocations mapping
                          </div>
                          <div className="col-span-4 border border-dashed border-slate-800 p-3 rounded text-center text-slate-500 flex flex-col justify-center gap-1.5">
                            <span className="text-[9px] font-bold block">[TRENDS]</span>
                            <span className="text-[8.5px] block">PWD: 82% Delay</span>
                            <span className="text-[8.5px] block">LGED: 42% Delay</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedWireframeScreen === 'optimizer' && (
                      <div className="space-y-3 text-left">
                        <div className="flex justify-between items-center text-[10px] text-indigo-450">
                          <span>[SIMULATOR] Intelligent pricing recommendation models</span>
                          <span>[ML_PROB] active</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="border border-dashed border-slate-800 p-3 rounded text-slate-500 space-y-1.5">
                            <span>[INPUTS]</span>
                            <div className="h-1 w-full bg-slate-800 rounded"></div>
                            <span className="text-[9px] block">Discount quote: -8.5%</span>
                            <div className="h-1 w-full bg-slate-800 rounded"></div>
                            <span className="text-[9px] block">Tender Valuation: 5M</span>
                          </div>
                          <div className="border border-dashed border-slate-800 p-3 rounded text-slate-500 flex flex-col items-center justify-center text-center">
                            <span className="text-[9px] font-bold">PROJECTED WIN RATE</span>
                            <strong className="text-emerald-500 block text-lg font-black mt-1">74.2%</strong>
                            <span className="text-[8px] block mt-0.5">preserves 14% margin</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedWireframeScreen === 'team' && (
                      <div className="space-y-2 text-left">
                        <div className="flex justify-between items-center text-[10px] text-indigo-400">
                          <span>[CONSORTIUM_LEDGER] Rehman + NDE civil works consortium</span>
                          <span>[ACTIVE_JV_INVITES] 1</span>
                        </div>
                        <div className="border border-dashed border-slate-800 p-3 text-center text-slate-500">
                          [JOINT VENTURE SHADOW PROFILE WRAPPERS]<br />
                          Partner authorization access permissions matrix: Acme Contractor verified.
                        </div>
                        <div className="border border-dashed border-slate-800 p-2 text-slate-500 text-center text-[9px]">
                          + Click to invite secondary partner sub-contractor details
                        </div>
                      </div>
                    )}

                    <div className="border-t border-slate-800/80 pt-2 flex justify-between items-center text-[9.5px] text-slate-500 tracking-wide mt-2">
                      <span>DORPOTRO.BD UI MOCKUP WIRE_GUIDE</span>
                      <span>v3.0.1 PROT</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
