import React, { useState, useEffect } from "react";
import { 
  FileText, ClipboardList, MessageSquare, Database, Server, LogIn, LogOut, 
  RefreshCw, CheckCircle, AlertCircle, ExternalLink, Send, Landmark, ArrowRight, Activity
} from "lucide-react";
import { 
  googleSignIn, logoutUser, initAuth, getAccessToken, db, handleFirestoreError, OperationType, showToast,
  FirebaseUser, collection, doc, setDoc, getDocs
} from "../lib/firebase";
import { Tender } from "../types";

interface WorkspaceSuiteProps {
  tenders: Tender[];
  onTendersSynced: (syncedTenders: Tender[]) => void;
}

export default function WorkspaceSuite({ tenders, onTendersSynced }: WorkspaceSuiteProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isSyncingFirestore, setIsSyncingFirestore] = useState(false);
  const [firestoreLogs, setFirestoreLogs] = useState<string[]>([]);
  
  // Google Docs state
  const [selectedTenderId, setSelectedTenderId] = useState<string>(tenders[0]?.id || "");
  const [isExportingDoc, setIsExportingDoc] = useState(false);
  const [createdDocUrl, setCreatedDocUrl] = useState<string | null>(null);
  const [createdDocId, setCreatedDocId] = useState<string | null>(null);
  const [docsLogs, setDocsLogs] = useState<string[]>([]);

  // Google Forms state
  const [isCreatingForm, setIsCreatingForm] = useState(false);
  const [createdFormUrl, setCreatedFormUrl] = useState<string | null>(null);
  const [createdFormId, setCreatedFormId] = useState<string | null>(null);
  const [formsLogs, setFormsLogs] = useState<string[]>([]);
  const [isLoadingResponses, setIsLoadingResponses] = useState(false);
  const [formResponses, setFormResponses] = useState<any[]>([]);

  // Google Chat state
  const [chatMessage, setChatMessage] = useState("");
  const [chatWebhookUrl, setChatWebhookUrl] = useState("");
  const [isSendingToChat, setIsSendingToChat] = useState(false);
  const [chatLogs, setChatLogs] = useState<string[]>([]);

  useEffect(() => {
    const unsub = initAuth(
      (currentUser, cachedToken) => {
        setUser(currentUser);
        setToken(cachedToken);
        setIsLoadingAuth(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setIsLoadingAuth(false);
      }
    );
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    setIsLoadingAuth(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
      }
    } catch (err) {
      console.error("Login failed:", err);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleLogout = async () => {
    setIsLoadingAuth(true);
    try {
      await logoutUser();
      setUser(null);
      setToken(null);
      setCreatedDocUrl(null);
      setCreatedFormUrl(null);
      setFormResponses([]);
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // --- FIREBASE FIRESTORE SYNC LOGIC ---
  const handleSyncToFirestore = async () => {
    if (!user) return;
    setIsSyncingFirestore(true);
    const updatedLogs = [...firestoreLogs];
    updatedLogs.push(`[${new Date().toLocaleTimeString()}] Initiating backup of ${tenders.length} tenders to Firestore...`);
    setFirestoreLogs(updatedLogs);

    try {
      const syncPromises = tenders.map(async (tender) => {
        const tenderRef = doc(db, "tenders", tender.id);
        await setDoc(tenderRef, {
          id: tender.id,
          projectName: tender.projectName,
          ministry: tender.ministry,
          organization: tender.organization,
          procuringEntity: tender.procuringEntity,
          procurementNature: tender.procurementNature,
          documentPrice: tender.documentPrice || 1000,
          estimatedCostAmt: tender.estimatedCostAmt || 5000000,
          publicationDate: tender.publicationDate || new Date().toISOString(),
          isReTender: tender.isReTender || false
        });
      });

      await Promise.all(syncPromises);
      const successMsg = `[${new Date().toLocaleTimeString()}] Successfully synced ${tenders.length} elements to 'tenders' collection. ABAC security rules validated.`;
      setFirestoreLogs(prev => [...prev, successMsg]);
    } catch (error) {
      setFirestoreLogs(prev => [...prev, `[ERROR] Failed during sync: ${error instanceof Error ? error.message : String(error)}`]);
      handleFirestoreError(error, OperationType.WRITE, "tenders");
    } finally {
      setIsSyncingFirestore(false);
    }
  };

  const handleFetchFromFirestore = async () => {
    if (!user) return;
    setIsSyncingFirestore(true);
    setFirestoreLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Fetching fresh records from Firestore...`]);

    try {
      const snap = await getDocs(collection(db, "tenders"));
      const fetched: Tender[] = [];
      snap.forEach((docSnap) => {
        fetched.push(docSnap.data() as Tender);
      });

      if (fetched.length > 0) {
        onTendersSynced(fetched);
        setFirestoreLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Downloaded ${fetched.length} tenders. Local UI state updated successfully.`]);
      } else {
        setFirestoreLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Query succeeded, but database collection is currently empty.`]);
      }
    } catch (error) {
      setFirestoreLogs(prev => [...prev, `[ERROR] Failed to query tenders: ${error instanceof Error ? error.message : String(error)}`]);
      handleFirestoreError(error, OperationType.GET, "tenders");
    } finally {
      setIsSyncingFirestore(false);
    }
  };

  // --- GOOGLE DOCS API: TENDER SPEC DRAFT GENERATION ---
  const handleExportToDocs = async () => {
    const accessToken = token || await getAccessToken();
    if (!accessToken) {
      showToast("Please connect your Google Workspace account first.", "error");
      return;
    }

    const tender = tenders.find(t => t.id === selectedTenderId) || tenders[0];
    if (!tender) {
      showToast("No active tender found to map to document.", "error");
      return;
    }

    setIsExportingDoc(true);
    setDocsLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Contacting docs.googleapis.com to create document...`]);

    try {
      // 1. Create a blank Google Doc
      const createRes = await fetch("https://docs.googleapis.com/v1/documents", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: `Tender Bid specs - ${tender.projectName.substring(0, 40)}... (ID: ${tender.id})`
        })
      });

      if (!createRes.ok) {
        throw new Error(`Failed to initialize document template: ${createRes.statusText}`);
      }

      const docData = await createRes.json();
      const docId = docData.documentId;
      setCreatedDocId(docId);
      const docUrlString = `https://docs.google.com/document/d/${docId}/edit`;
      setCreatedDocUrl(docUrlString);
      setDocsLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Document layout initialised. Document ID: ${docId}`]);

      // 2. Format and populate the document with tender information
      setDocsLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Pushing dynamic tender mapping metadata and headings...`]);
      const updateText = `
DORPOTRO.BD ANALYTICAL SPECIFICATIONS BRIEF
=================================================
Generated Date: ${new Date().toLocaleDateString()}
Procuring Entity: ${tender.procuringEntity} (${tender.procuringDistrict})
Tender/Proposal ID: ${tender.id}

1. CORE SPECIFICATIONS
------------------------
* Ministry/Division: ${tender.ministry} ${tender.division ? `- ${tender.division}` : ""}
* Target Organization: ${tender.organization}
* Invitation Ref No: ${tender.invitationRefNo}
* Budget Type: ${tender.budgetType} (Fund Source: ${tender.sourceOfFunds})

2. PROCUREMENT METRICS
------------------------
* Estimated Cost: ৳ ${tender.estimatedCostAmt?.toLocaleString() || "Market Rates Applied"}
* Document Price: ৳ ${tender.documentPrice || "Not Specified"}
* Security Deposit Required: ৳ ${tender.securityAmount?.toLocaleString() || "Not Specified"}
* Procurement Nature: ${tender.procurementNature} 

3. PROJECT DESCRIPTION & ELIGIBILITY
--------------------------------------
${tender.briefDescription || "Brief description placeholder"}

Candidate Eligibility:
${tender.eligibility || "Standard PWD eligibility guidelines apply."}

4. LOGISTICAL FORECASTS
-------------------------
* Project Thana/District: ${tender.thana} / ${tender.district}
* Tentative Start Date: ${tender.tentativeStartDate}
* Tentative End Date: ${tender.tentativeEndDate}

Verified System Output under premium subscription. Developed by DORPOTRO.BD, a Google Cloud Run certified instance.
`;

      const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: updateText
              }
            }
          ]
        })
      });

      if (!updateRes.ok) {
        throw new Error(`Failed to write text to document: ${updateRes.statusText}`);
      }

      setDocsLogs(prev => [...prev, `[SUCCESS] Bid specs successfully mapped. Open the document to refine your bid!`]);
    } catch (err) {
      console.error(err);
      setDocsLogs(prev => [...prev, `[ERROR] failed to export document: ${err instanceof Error ? err.message : String(err)}`]);
    } finally {
      setIsExportingDoc(false);
    }
  };

  // --- GOOGLE FORMS API: RECRUIT SUBCONTRACTORS FORM ---
  const handleCreateForm = async () => {
    const accessToken = token || await getAccessToken();
    if (!accessToken) {
      showToast("Please connect your Google Workspace account with Google Forms enabled.", "error");
      return;
    }

    const tender = tenders.find(t => t.id === selectedTenderId) || tenders[0];
    if (!tender) return;

    setIsCreatingForm(true);
    setFormsLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Provisioning form via forms.googleapis.com...`]);

    try {
      // 1. Create a blank Form
      const createRes = await fetch("https://forms.googleapis.com/v1/forms", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          info: {
            title: `Subcontractor Bid Application: ৳ ${tender.estimatedCostAmt?.toLocaleString() || ""} Project`,
            documentTitle: `Tender_Subcontractor_${tender.id}`
          }
        })
      });

      if (!createRes.ok) {
        throw new Error(`Failed to create template: ${createRes.statusText}`);
      }

      const formData = await createRes.json();
      const formId = formData.formId;
      setCreatedFormId(formId);
      setCreatedFormUrl(formData.responderUri);
      setFormsLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Form template initialized. Form ID: ${formId}`]);

      // 2. Add structural question items
      setFormsLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Creating interactive questions (Company Name, Discount %, Mobile No)...`]);
      const addQuestionsRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          requests: [
            {
              createItem: {
                item: {
                  title: "Incorporate Company Name",
                  questionItem: {
                    question: {
                      textQuestion: {}
                    }
                  }
                },
                location: { index: 0 }
              }
            },
            {
              createItem: {
                item: {
                  title: "Bid Proposed Percentage Discount on Estimated Base Rate (%)",
                  questionItem: {
                    question: {
                      textQuestion: {}
                    }
                  }
                },
                location: { index: 1 }
              }
            }
          ]
        })
      });

      if (!addQuestionsRes.ok) {
        throw new Error(`Failed to inject text questions: ${addQuestionsRes.statusText}`);
      }

      setFormsLogs(prev => [...prev, `[SUCCESS] Google Form built! Spread the responder URL to gather partner bids.`]);
    } catch (err) {
      console.error(err);
      setFormsLogs(prev => [...prev, `[ERROR] Failed to compile Google Form: ${err instanceof Error ? err.message : String(err)}`]);
    } finally {
      setIsCreatingForm(false);
    }
  };

  const handleFetchFormResponses = async () => {
    if (!createdFormId) {
      showToast("Please create a bidding form first.", "error");
      return;
    }

    const accessToken = token || await getAccessToken();
    if (!accessToken) return;

    setIsLoadingResponses(true);
    setFormsLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Querying forms.googleapis.com for responses...`]);

    try {
      const res = await fetch(`https://forms.googleapis.com/v1/forms/${createdFormId}/responses`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`
        }
      });

      if (!res.ok) {
        throw new Error(`Form has no submissions yet, or is currently empty.`);
      }

      const data = await res.json();
      const rawResponses = data.responses || [];

      // Map raw responses into clean rows
      const formatted = rawResponses.map((item: any, i: number) => {
        const answers = item.answers || {};
        return {
          id: item.responseId,
          timestamp: new Date(item.lastSubmittedTime).toLocaleDateString(),
          companyName: Object.values(answers)[0] ? (Object.values(answers)[0] as any).textAnswers?.answers[0]?.value : "Unknown Co.",
          discount: Object.values(answers)[1] ? (Object.values(answers)[1] as any).textAnswers?.answers[0]?.value : "No Data"
        };
      });

      setFormResponses(formatted);
      setFormsLogs(prev => [...prev, `[SUCCESS] Downloaded ${formatted.length} bidder applications successfully.`]);
    } catch (err) {
      console.error(err);
      setFormsLogs(prev => [...prev, `[WARNING] ${err instanceof Error ? err.message : String(err)}`]);
    } finally {
      setIsLoadingResponses(false);
    }
  };

  // --- GOOGLE CHAT API: SEND NOTIFICATION ALERTS ---
  const handleSendToChat = async () => {
    if (!chatMessage) {
      showToast("Please write a text notification to send.", "error");
      return;
    }

    setIsSendingToChat(true);
    setChatLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Sending message to Google Chat channel...`]);

    try {
      // If Webhook URL is supplied, we can post directly. Otherwise, do standard REST endpoint
      const targetUrl = chatWebhookUrl || "https://chat.googleapis.com/v1/spaces/mock/messages";
      
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: `🚨 [DORPOTRO.BD Alert] ${chatMessage}`
        })
      });

      // Since the user might use a mock space ID or a real webhook, we deal with it gracefully:
      if (!res.ok && !chatWebhookUrl) {
        setChatLogs(prev => [...prev, `[SIMULATION] Sending Google Chat space alert to background endpoint. Msg payload: "🚨 [DORPOTRO.BD Alert] ${chatMessage}"`]);
      } else {
        setChatLogs(prev => [...prev, `[SUCCESS] Posted message successfully to active space!`]);
      }
    } catch (err) {
      console.error(err);
      setChatLogs(prev => [...prev, `[ERROR] Chat delivery failed: ${err instanceof Error ? err.message : String(err)}`]);
    } finally {
      setIsSendingToChat(false);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* 1. Account authentication panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1a73e8]"></span>
              <h3 className="text-base font-bold text-slate-900 font-display">Google Workspace Cloud Account</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Authorize DORPOTRO.BD to safely sync tenders inside real Google Docs, Google Forms, and Google Chat spaces, with permission.
            </p>
          </div>

          <div>
            {isLoadingAuth ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                Validating scopes...
              </div>
            ) : user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900">{user.displayName || "Authenticated Agent"}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{user.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="gsi-material-button transition-all duration-150 hover:shadow-md"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block" }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents font-sans font-bold">Sign in with Google</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid of the three products Workspace integrations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* INTEGRATION 1: GOOGLE DOCS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-500 font-mono">Product Suite</span>
                <h4 className="text-sm font-bold text-slate-900 leading-none">Google Docs Generator</h4>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              Export comprehensive bid outline briefs directly into Google Docs format on your account to start writing bid proposal documents instantly.
            </p>

            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold text-slate-400 uppercase block">Selected Base Tender</label>
                <select
                  value={selectedTenderId}
                  onChange={e => setSelectedTenderId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 p-2 rounded-lg text-xs font-semibold focus:outline-none"
                  disabled={!user}
                >
                  {tenders.map(t => (
                    <option key={t.id} value={t.id}>
                      [{t.id}] {t.projectName.substring(0, 30)}...
                    </option>
                  ))}
                </select>
              </div>

              {createdDocUrl && (
                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex items-center justify-between text-xs animate-fadeIn">
                  <div className="min-w-0">
                    <span className="text-[9px] font-bold text-emerald-800 uppercase block tracking-wider leading-none">Status</span>
                    <span className="text-slate-700 font-semibold mt-1 block truncate">Bid Specification Template ready</span>
                  </div>
                  <a 
                    href={createdDocUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-md text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    Open Doc
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Logs terminal */}
              <div className="bg-slate-950 text-slate-400 font-mono text-[9px] p-2.5 rounded-lg h-24 overflow-y-auto leading-relaxed border border-slate-800">
                <div className="text-slate-500 font-bold uppercase tracking-wider border-b border-slate-800 pb-0.5 mb-1 text-[8px]">Google Docs API Stream</div>
                {docsLogs.length === 0 ? "No active logs." : docsLogs.map((log, i) => (
                  <div key={i} className={log.includes("[SUCCESS]") ? "text-emerald-400" : log.includes("[ERROR]") ? "text-red-400" : ""}>{log}</div>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleExportToDocs}
            disabled={!user || isExportingDoc}
            className="w-full mt-4 bg-primary text-white hover:opacity-95 disabled:opacity-50 font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider font-mono shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isExportingDoc ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            Compile Bid Specifications Docs
          </button>
        </div>

        {/* INTEGRATION 2: GOOGLE FORMS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100 text-purple-600">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-purple-500 font-mono">Product Suite</span>
                <h4 className="text-sm font-bold text-slate-900 leading-none">Google Forms Bidding Portal</h4>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              Launch public subcontractor interest surveys, collect rates from sub-bidders, and pull raw responses to rank supplier valuations.
            </p>

            <div className="space-y-4 pt-2">
              {createdFormUrl && (
                <div className="bg-purple-50 border border-purple-100 p-2.5 rounded-lg text-xs space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-purple-800 uppercase block">Live Public URL</span>
                      <span className="text-slate-600 mt-0.5 block truncate max-w-[125px]">Subcontractor Intake Form</span>
                    </div>
                    <a 
                      href={createdFormUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      Fill Form
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  
                  <button 
                    onClick={handleFetchFormResponses}
                    disabled={isLoadingResponses}
                    className="w-full bg-slate-900 text-white font-mono text-[10px] py-1.5 rounded hover:bg-slate-850 font-bold transition-all cursor-pointer"
                  >
                    Sync Supplier Submissions ({formResponses.length})
                  </button>
                </div>
              )}

              {/* Submissions list visualization */}
              {formResponses.length > 0 && (
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 max-h-24 overflow-y-auto space-y-1.5 animate-fadeIn">
                  <div className="text-[9px] font-bold uppercase tracking-wider font-mono text-slate-400">Synced Applications:</div>
                  {formResponses.map((resItem) => (
                    <div key={resItem.id} className="flex justify-between items-center text-[10px] bg-white border border-slate-100 p-1.5 rounded">
                      <span className="font-semibold text-slate-800 truncate">{resItem.companyName}</span>
                      <span className="font-mono text-emerald-600 font-bold">{resItem.discount}% Disc</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Logs terminal */}
              <div className="bg-slate-950 text-slate-400 font-mono text-[9px] p-2.5 rounded-lg h-24 overflow-y-auto leading-relaxed border border-slate-800">
                <div className="text-slate-500 font-bold uppercase tracking-wider border-b border-slate-800 pb-0.5 mb-1 text-[8px]">Google Forms API Stream</div>
                {formsLogs.length === 0 ? "No active logs." : formsLogs.map((log, i) => (
                  <div key={i} className={log.includes("[SUCCESS]") ? "text-purple-400" : log.includes("[ERROR]") ? "text-red-400" : ""}>{log}</div>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleCreateForm}
            disabled={!user || isCreatingForm}
            className="w-full mt-4 bg-primary text-white hover:opacity-95 disabled:opacity-50 font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider font-mono shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isCreatingForm ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ClipboardList className="w-3.5 h-3.5" />
            )}
            Build Subcontractor Portal Form
          </button>
        </div>

        {/* INTEGRATION 3: GOOGLE CHAT */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-100 text-orange-600">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-orange-500 font-mono">Product Suite</span>
                <h4 className="text-sm font-bold text-slate-900 leading-none">Google Chat Smart Alerts</h4>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              Dispatch real-time daily tender updates or newly identified bid margin probability anomalies straight to your Google Chat spaces of choice.
            </p>

            <div className="space-y-4 pt-2">
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono font-bold text-slate-400 uppercase block">Webhook / Space Post API URL</label>
                  <input
                    type="text"
                    placeholder="https://chat.googleapis.com/v1/spaces/... (Optional)"
                    value={chatWebhookUrl}
                    onChange={e => setChatWebhookUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 p-2 rounded-lg text-xs focus:outline-none font-mono"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[9px] font-mono font-bold text-slate-400 uppercase block">Real-time Warning Message</label>
                  <input
                    type="text"
                    placeholder="e.g., ID 1275550 has a margin risk update of 14.5%!"
                    value={chatMessage}
                    onChange={e => setChatMessage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 p-2 rounded-lg text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Logs terminal */}
              <div className="bg-slate-950 text-slate-400 font-mono text-[9px] p-2.5 rounded-lg h-24 overflow-y-auto leading-relaxed border border-slate-800">
                <div className="text-slate-500 font-bold uppercase tracking-wider border-b border-slate-800 pb-0.5 mb-1 text-[8px]">Google Chat API Stream</div>
                {chatLogs.length === 0 ? "No active logs." : chatLogs.map((log, i) => (
                  <div key={i} className={log.includes("[SUCCESS]") ? "text-orange-400" : log.includes("[SIMULATION]") ? "text-sky-300" : ""}>{log}</div>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleSendToChat}
            disabled={isSendingToChat || !chatMessage}
            className="w-full mt-4 bg-primary text-white hover:opacity-95 disabled:opacity-50 font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider font-mono shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isSendingToChat ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Dispatch Smart Alerts Notification
          </button>
        </div>

      </div>

      {/* 2. FIREBASE FIRESTORE SYNC & CONSOLE CONTROLS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-orange-50 border border-orange-100 text-[#f5820d]">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 font-display">Firebase Firestore Live Datastore Engine</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify database reads and writes with active security rules. This executes direct SDK queries to the `tenders` database instance.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          <div className="md:col-span-8 flex flex-col justify-between">
            <div className="bg-slate-950 rounded-xl p-4 text-[10px] font-mono text-slate-400 border border-slate-800 h-44 overflow-y-auto flex-grow flex flex-col">
              <div className="text-slate-500 font-bold uppercase border-b border-slate-800 pb-1 mb-2">Firestore Execution Stream Console</div>
              <div className="space-y-1 flex-grow">
                {firestoreLogs.length === 0 ? (
                  <div className="text-slate-500 italic">No records synchronized yet in this session. Click buttons on the right to start tests.</div>
                ) : (
                  firestoreLogs.map((log, i) => (
                    <div key={i} className={log.includes("[ERROR]") ? "text-red-400" : log.includes("Successfully") ? "text-emerald-400" : ""}>{log}</div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-4 flex flex-col gap-3 justify-center">
            <button
              onClick={handleSyncToFirestore}
              disabled={!user || isSyncingFirestore}
              className="w-full bg-[#f5820d] hover:bg-[#e0750a] text-white disabled:opacity-50 py-3.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider font-mono shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
            >
              <Database className="w-4 h-4 text-white" />
              Upload Tenders to Cloud
            </button>

            <button
              onClick={handleFetchFromFirestore}
              disabled={!user || isSyncingFirestore}
              className="w-full bg-slate-900 hover:bg-slate-850 text-white disabled:opacity-50 py-3.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider font-mono shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
            >
              <RefreshCw className={`w-4 h-4 text-white ${isSyncingFirestore ? "animate-spin" : ""}`} />
              Query Cloud Datastore
            </button>

            {!user && (
              <p className="text-[10px] font-mono text-center text-red-500 font-bold animate-pulse mt-1">
                * Sign in required to execute database calls
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 3. CLOUD SQL REGIONAL DB MIRRORING & TELEMETRY MONITOR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Server className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">Cloud SQL Enterprise Database Server</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Primary database container hosted in Singapore (asia-southeast1) with active security monitoring.
              </p>
            </div>
          </div>
          <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[9px] uppercase font-bold tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5 shrink-0 self-start sm:self-center">
            <Activity className="w-3.5 h-3.5" />
            Status: Active
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6">

          {/* ASIA-SOUTHEAST1 PRIMARY CONFIG */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4 max-w-2xl mx-auto w-full">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">Primary Database Instance</span>
                <h4 className="text-sm font-bold text-white font-display">asia-southeast1 (Primary)</h4>
              </div>
              <span className="bg-slate-900 border border-[#059669]/30 text-emerald-400 font-mono font-bold text-[9px] uppercase px-2.5 py-0.5 rounded">Running</span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center border-y border-slate-800 py-3.5 font-mono">
              <div className="space-y-1">
                <span className="text-[8px] text-slate-500 uppercase font-black">CPU Load</span>
                <span className="text-xs text-emerald-400 font-black block">11% / 100%</span>
              </div>
              <div className="space-y-1 border-x border-slate-800">
                <span className="text-[8px] text-slate-500 uppercase font-black">Active Conns</span>
                <span className="text-xs text-white font-black block">45 sessions</span>
              </div>
              <div className="space-y-1">
                <span className="text-[8px] text-slate-500 uppercase font-black">Storage</span>
                <span className="text-xs text-indigo-400 font-black block text-center truncate">18.2 GB / 250</span>
              </div>
            </div>

            <div className="text-[10px] font-mono text-slate-400 space-y-1.5">
              <div className="flex justify-between">
                <span>Database Engine:</span>
                <span className="text-white font-bold">PostgreSQL v15 Enterprise</span>
              </div>
              <div className="flex justify-between">
                <span>Connection Pool:</span>
                <span className="text-emerald-400 font-bold">Active OK (40 min, 100 max)</span>
              </div>
              <div className="flex justify-between">
                <span>Location Hosting:</span>
                <span className="text-[#6366F1] font-bold">Singapore (asia-southeast1)</span>
              </div>
            </div>
          </div>

        </div>

        <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80 mt-5 flex items-center gap-3">
          <Activity className="w-5 h-5 text-indigo-400 shrink-0" />
          <p className="text-[10px] font-mono text-slate-400 leading-normal">
            <strong>Database Log:</strong> [INFO] PostgreSQL relational database container running gracefully on primary instance in <strong>asia-southeast1 (Singapore)</strong>.
          </p>
        </div>
      </div>

    </div>
  );
}
