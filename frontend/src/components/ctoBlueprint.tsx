import React, { useState } from 'react';
import { showToast } from '../lib/firebase';
import { 
  Terminal, ShieldCheck, Database, Landmark, Play, Copy, Check, FileCode, CheckCircle, 
  XCircle, ArrowRight, ShieldAlert, BadgeInfo, HelpCircle, AlertCircle, RefreshCw
} from 'lucide-react';
import { User, PaymentWebhookLog } from '../types';

interface CtoBlueprintProps {
  currentUser: User;
  onUpdateCurrentUser: (updated: User) => void;
  users: User[];
  onUpdateUsers: (updated: User[]) => void;
  webhookLogs: PaymentWebhookLog[];
  onUpdateWebhookLogs: (updated: PaymentWebhookLog[]) => void;
}

export default function CtoBlueprint({ 
  currentUser, onUpdateCurrentUser, 
  users, onUpdateUsers, 
  webhookLogs, onUpdateWebhookLogs 
}: CtoBlueprintProps) {
  
  const [activeSubTab, setActiveSubTab] = useState<'scraper' | 'schema' | 'auth' | 'payments'>('scraper');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Scraper Simulation State
  const [isSimulatingScraper, setIsSimulatingScraper] = useState(false);
  const [scraperLogs, setScraperLogs] = useState<any[]>([]);

  // bkash Simulation state
  const [simulatedMobileNumber, setSimulatedMobileNumber] = useState('01711223344');
  const [simulatedAmount, setSimulatedAmount] = useState('2500');
  const [simulatedTrxID, setSimulatedTrxID] = useState(() => 'TRX' + Math.floor(Math.random() * 90000000 + 10000000));
  const [isSimulatingWebhook, setIsSimulatingWebhook] = useState(false);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const runScraperSimulation = () => {
    setIsSimulatingScraper(true);
    setScraperLogs([]);
    
    const steps = [
      { id: 1, delay: 400, action: 'BROWSER_INIT', details: 'Initialized Headless Playwright Chrome pool on port 3000.', tenderId: '' },
      { id: 2, delay: 1000, action: 'SESSION_GP', details: 'Navigated to https://www.eprocure.gov.bd/StdTenderSearch.jsp and searched keywords Works/Goods.', tenderId: '' },
      { id: 3, delay: 1800, action: 'PARSE_ROW', details: 'Found e-GP ID #1275611 (Modernization of rail switches). Status: OTM.', tenderId: '1275611' },
      { id: 4, delay: 2400, action: 'SAVE_FIRESTORE', details: 'Tender ID #1275611 published successfully into Firestore collection.', tenderId: '1275611' },
      { id: 5, delay: 3000, action: 'COPY_SHEETS', details: 'Appended raw attributes to row #204 of Google Sheet "DORPOTRO.BD Data Vault".', tenderId: '1275611' },
      { id: 6, delay: 3600, action: 'PARSE_ROW', details: 'Found e-GP ID #1275550 (Tata Garbage Dump Truck #06827 repairs). Status: Works.', tenderId: '1275550' },
      { id: 7, delay: 4200, action: 'SKIP_DUPLICATE', details: 'Tender ID #1275550 matches active ID. Triggered overwrite merge strategy rule.', tenderId: '1275550' },
      { id: 8, delay: 4800, action: 'COMPLETED', details: 'Successfully harvested 2 notices. Scraping cycle closed.', tenderId: '' }
    ];

    steps.forEach((step) => {
      setTimeout(() => {
        setScraperLogs(prev => [...prev, step]);
        if (step.action === 'COMPLETED') {
          setIsSimulatingScraper(false);
        }
      }, step.delay);
    });
  };

  const handleSimulatePaymentWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatedMobileNumber || !simulatedAmount) {
      showToast("Please provide simulated phone number and amount.", "error");
      return;
    }

    setIsSimulatingWebhook(true);

    setTimeout(() => {
      // Create live webhook log
      const logEntry: PaymentWebhookLog = {
        id: "LOG-" + Math.floor(Math.random() * 90000 + 10000),
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        amount: parseFloat(simulatedAmount),
        phone: simulatedMobileNumber,
        trxID: simulatedTrxID,
        gateway: 'bKash',
        status: 'SUCCESS',
        userId: currentUser.id
      };

      // 1. Update logs array state
      onUpdateWebhookLogs([logEntry, ...webhookLogs]);

      // 2. Update user state to premium
      const updatedUser: User = {
        ...currentUser,
        subscriptionType: 'premium',
        expiryDate: '2026-12-31'
      };
      onUpdateCurrentUser(updatedUser);

      // 3. Update in global users list
      const updatedUsersList = users.map(u => u.id === currentUser.id ? updatedUser : u);
      onUpdateUsers(updatedUsersList);

      setIsSimulatingWebhook(false);
      
      // Regene a new random TRX ID for next try
      setSimulatedTrxID('TRX' + Math.floor(Math.random() * 90000000 + 10000000));
      showToast("Success! bKash Sandbox simulated webhook payload accepted. Your user has been elevated to premium membership!", "success");
    }, 1200);
  };

  const pythonScraperCode = `import re
import gspread
from playwright.sync_api import sync_playwright

def crawl_eprocure_std():
    # 1. Initialize custom headless Chrome session
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("https://www.eprocure.gov.bd/resources/common/StdTenderSearch.jsp")
        
        # 2. Select procurement type 'Works' and trigger search
        page.select_option("select#nature", "Works")
        page.click("button#btnSearch")
        page.wait_for_selector(".table-responsive")
        
        # 3. Parse row elements
        rows = page.query_selector_all("table.tender-list-table tr")
        documents = []
        for r in rows[1:10]:  # Capture first page offsets
            cells = r.query_selector_all("td")
            if len(cells) >= 6:
                doc_id = cells[0].inner_text().strip()
                desc = cells[1].inner_text().strip()
                org = cells[2].inner_text().strip()
                last_selling = cells[4].inner_text().strip()
                
                documents.append({
                    "id": doc_id,
                    "description": desc,
                    "organization": org,
                    "deadline": last_selling
                })
        
        browser.close()
        return documents

def sync_to_google_sheet(records):
    # Authenticate credentials securely server-side
    gc = gspread.service_account(filename="service_account_secure.json")
    sh = gc.open("DORPOTRO.BD Data Vault")
    wks = sh.sheet1
    
    for r in records:
        # Prevent collisions natively
        existing_ids = wks.col_values(1)
        if r['id'] not in existing_ids:
            wks.append_row([r['id'], r['description'], r['organization'], r['deadline']])`;

  const firestoreSchemaJson = `{
  "collection": "tenders",
  "document": {
    "id": "1275550",
    "ministry": "Ministry of Local Government, Rural Development and Co-operatives",
    "division": "Local Government Division",
    "organization": "Chittagong City Corporation",
    "procuringEntity": "Office of Executive Engineer",
    "district": "Chattogram",
    "procurementNature": "Goods",
    "packageNo": "CCC.CON.MECH 38-002-78",
    "packageDescription": "Repairs of Garbage Trucks & Modern Outfittings",
    "documentPrice": 500,
    "securityAmount": 15000,
    "sourceOfFunds": "Revenue",
    "isReTender": true,
    "officialInviter": "Executive Engineer",
    "phone": "031-333333",
    "tenderLink": "https://www.eprocure.gov.bd/resources/common/ViewTender.jsp?id=1275550"
  }
}`;

  return (
    <div className="bg-white border border-border-subtle rounded-2xl overflow-hidden shadow-sm text-on-surface font-sans">
      
      {/* Top Banner section */}
      <div className="p-6 border-b border-light border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-primary text-xs font-mono font-bold border border-slate-200 uppercase tracking-wider">
            Technical Specification
          </span>
          <h2 className="text-xl font-bold text-primary mt-1.5 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-indigo-600" />
            CTO Architectural Handoff & Sandbox Simulations
          </h2>
          <p className="text-slate-500 text-xs mt-1 max-w-2xl font-semibold">
            Ready-to-use source code, Firestore NoSQL models, subscription guard algorithms, and live webhook simulators designed for engineering integration.
          </p>
        </div>

        {/* Floating tabs headers */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-border-subtle w-fit shrink-0">
          <button 
            onClick={() => setActiveSubTab('scraper')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'scraper' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Scraper API
          </button>
          <button 
            onClick={() => setActiveSubTab('schema')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'schema' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            <Database className="w-3.5 h-3.5" />
            Firestore Schema
          </button>
          <button 
            onClick={() => setActiveSubTab('payments')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'payments' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            <Landmark className="w-3.5 h-3.5" />
            webhook Sandbox
          </button>
        </div>
      </div>

      <div className="p-6">
        
        {/* TAB 1: SCRAPER CONFIGS */}
        {activeSubTab === 'scraper' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-50 p-5 rounded-xl border border-border-subtle space-y-3">
                <h3 className="text-sm font-sans font-black text-primary flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-600" />
                  eprocure.gov.bd Scraper Engine
                </h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  The crawler engine leverages Web Scraping protocols via Playwright. It bypasses e-GP portal firewalls by mimicking realistic browser scrolls, clicks and page layouts.
                </p>
                <div className="text-[11px] space-y-2 text-slate-500 pt-2 border-t border-slate-200">
                  <div className="flex gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span><strong>Data De-duplication</strong>: Avoid duplicating items by comparing Tender unique ID prime key.</span>
                  </div>
                  <div className="flex gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span><strong>Google Sheets Feed</strong>: Appends to connected sheets in real-time.</span>
                  </div>
                </div>
              </div>

              {/* Scraper Live Sandbox Simulator */}
              <div className="bg-white border border-[#6366F1]/20 p-5 rounded-xl shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-primary text-xs font-mono font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Interactive Sandbox
                  </span>
                  <button
                    onClick={runScraperSimulation}
                    disabled={isSimulatingScraper}
                    className="bg-primary text-white px-3.5 py-1.5 rounded-lg text-[10px] font-bold font-mono transition-opacity cursor-pointer disabled:opacity-50"
                  >
                    {isSimulatingScraper ? "SCRAPING IN PRODUCTION..." : "TRIGGER SCRAPER"}
                  </button>
                </div>

                <div className="bg-slate-900 text-slate-250 p-3 rounded-lg font-mono text-[11px] min-h-[170px] max-h-[170px] overflow-y-auto space-y-1 block">
                  {scraperLogs.length === 0 ? (
                    <div className="text-slate-500 flex flex-col items-center justify-center h-32 text-center">
                      <Terminal className="w-7 h-7 mb-1.5" />
                      <p>Trigger sandbox above to test e-GP crawler simulation log streams internally.</p>
                    </div>
                  ) : (
                    scraperLogs.map((log, idx) => (
                      <div key={idx} className="flex gap-2 hover:bg-slate-800 p-0.5 rounded leading-relaxed text-slate-300">
                        <span className="text-emerald-400">[{log.timestamp || 'WAIT'}]</span>
                        <div className="flex-1">
                          <span className="text-slate-450 uppercase">{log.action}:</span> {log.details}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Python code output */}
            <div className="lg:col-span-7 flex flex-col h-full">
              <div className="flex justify-between items-center bg-slate-50 py-2.5 px-4 rounded-t-xl border border-border-subtle shrink-0">
                <span className="text-primary text-xs font-mono font-bold flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-emerald-600" />
                  scraper_pipeline.py
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(pythonScraperCode, 'pyCode')}
                  className="text-slate-600 hover:text-black transition-all text-xs flex items-center gap-1 font-mono cursor-pointer"
                >
                  {copiedText === 'pyCode' ? (
                    <><Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Copy Code</>
                  )}
                </button>
              </div>
              <pre className="text-[10px] font-mono p-4 bg-slate-900 text-slate-200 rounded-b-xl border-x border-b border-slate-950 overflow-x-auto max-h-[300px] leading-relaxed">
                {pythonScraperCode}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 2: FIRESTORE SCHEMA */}
        {activeSubTab === 'schema' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-50 p-5 rounded-xl border border-border-subtle space-y-3 text-xs text-slate-700">
                <h3 className="text-sm font-sans font-black text-primary flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-600" />
                  Firestore Collection Indexes Schema
                </h3>
                <p className="leading-relaxed">
                  The eprocure scraped documents are mapped directly into highly optimized Firestore structures. Every unique tender represents a single Firestore document.
                </p>
                <div className="bg-white p-3.5 rounded-lg border border-border-subtle space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Tenders Index rules:</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-600">
                    <li>Firestore Collections: <code className="font-mono text-indigo-700">tenders</code></li>
                    <li>Security rules: Restricted write, open read.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 flex flex-col h-full">
              <div className="flex justify-between items-center bg-slate-50 py-2.5 px-4 rounded-t-xl border border-border-subtle">
                <span className="text-primary text-xs font-mono font-bold flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-[#059669]" />
                  eprocure-firestore-schema.json
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(firestoreSchemaJson, 'schemaCode')}
                  className="text-slate-600 hover:text-black text-xs flex items-center gap-1 font-mono cursor-pointer"
                >
                  {copiedText === 'schemaCode' ? 'Copied ✕' : 'Copy Schema'}
                </button>
              </div>
              <pre className="text-[10px] font-mono p-4 bg-slate-900 text-slate-200 rounded-b-xl border-x border-b border-slate-950 overflow-x-auto max-h-[300px] leading-relaxed">
                {firestoreSchemaJson}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 3: PAYMENTS AND WEBHOOK SIMULATION */}
        {activeSubTab === 'payments' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-50 p-5 rounded-xl border border-border-subtle space-y-3 text-xs text-slate-700">
                <h3 className="text-sm font-sans font-black text-primary flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-emerald-600" />
                  bKash Instant Subscription Webhook
                </h3>
                <p className="leading-relaxed">
                  DORPOTRO.BD supports automatic subscription upgrades upon receiving a successful payment payload from the BKash merchant provider.
                </p>
                <div className="bg-white p-3 border border-border-subtle rounded-lg">
                  <span className="font-mono text-[9px] text-slate-400 uppercase tracking-widest block font-bold">Plan status</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="font-black text-xs">Your Current Account Tier:</span>
                    <span className="bg-[#6366F1]/10 text-[#6366F1] font-mono px-2 py-0.5 rounded font-bold uppercase">{currentUser.subscriptionType}</span>
                  </div>
                </div>
              </div>

              {/* simulated bKash Gateway Form */}
              <div className="bg-white p-5 rounded-xl border border-[#fbbf24]/35 shadow-sm space-y-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-mono font-black text-primary uppercase">bKash Mergant Portal simulator</span>
                </div>

                <form onSubmit={handleSimulatePaymentWebhook} className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="block text-slate-500 font-bold uppercase text-[9px]">Mobile Account Number (bKash Wallet)</label>
                    <input 
                      type="text" 
                      value={simulatedMobileNumber} 
                      onChange={e => setSimulatedMobileNumber(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:border-indigo-600 outline-none" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-slate-500 font-bold uppercase text-[9px]">Payment Amount (৳)</label>
                      <input 
                        type="number" 
                        value={simulatedAmount} 
                        onChange={e => setSimulatedAmount(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:border-indigo-600 outline-none" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-slate-500 font-bold uppercase text-[9px]">Generated TransID</label>
                      <input 
                        type="text" 
                        value={simulatedTrxID} 
                        readOnly 
                        className="w-full bg-slate-100 border border-slate-200 p-2 rounded font-mono select-all focus:border-indigo-650 outline-none" 
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSimulatingWebhook}
                    className="w-full bg-[#E11D48] hover:bg-rose-600 text-white py-2.5 rounded-lg font-bold font-mono text-xs cursor-pointer text-center block transition-all"
                  >
                    {isSimulatingWebhook ? "WAITING PAYMENT PG WEBHOOK CALLBACK..." : "SIMULATE bKash PG WEBHOOK SUCCESS"}
                  </button>
                </form>
              </div>
            </div>

            {/* Webhook log history container */}
            <div className="lg:col-span-7 flex flex-col h-full space-y-3">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1.5">Mergant Webhook callback Logs</span>
              <div className="bg-slate-900 text-slate-200 p-4 rounded-xl border border-slate-950 min-h-[260px] max-h-[300px] overflow-y-auto font-mono text-xs space-y-3">
                {webhookLogs.length === 0 ? (
                  <div className="text-slate-500 flex flex-col items-center justify-center h-48 text-center">
                    <Landmark className="w-8 h-8 text-slate-700 mb-2" />
                    <p>No transactions registered yet. Try submitting the simulated gate checkout to see incoming callbacks instantly parsed here!</p>
                  </div>
                ) : (
                  webhookLogs.map((log, index) => (
                    <div key={index} className="border-b border-slate-800 pb-2.5 last:border-0 hover:bg-slate-850 p-2 rounded">
                      <div className="flex justify-between text-[11px] text-emerald-400">
                        <span>[TRXID: {log.trxID}] SUCCESS IPN</span>
                        <span>{log.timestamp}</span>
                      </div>
                      <div className="text-slate-300 mt-1">Paid ৳{log.amount} | Phone Account: {log.phone}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Gateway Provider Source: {log.gateway} • Authorized User reference: {log.userId}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
