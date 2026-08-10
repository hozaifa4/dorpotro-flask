import { tendersDataset } from "../tenderData";

export interface FirebaseUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  providerData?: any[];
}

export const app = { name: "DorpotroMock" };

// Safe Local Storage Database Persistence
const getLocalCollection = (collectionName: string) => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(`dorpotro_col_${collectionName}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Local DB read error:", e);
  }

  // Supply default mock records if collections are empty initially
  if (collectionName === "tenders") {
    const defaultMap: any = {};
    tendersDataset.forEach(t => {
      defaultMap[t.id] = t;
    });
    return defaultMap;
  }
  return {};
};

const setLocalCollection = (collectionName: string, data: any) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`dorpotro_col_${collectionName}`, JSON.stringify(data));
  } catch (e) {
    console.error("Local DB write error:", e);
  }
};

export const db = {
  getCollection: (name: string) => getLocalCollection(name),
  setDocument: (collectionName: string, docId: string, data: any) => {
    const current = getLocalCollection(collectionName);
    current[docId] = data;
    setLocalCollection(collectionName, current);
  },
  getDocument: (collectionName: string, docId: string) => {
    const current = getLocalCollection(collectionName);
    return current[docId] || null;
  }
};

// Mock Auth Class with Event Listeners to seamlessly maintain reactive hooks
class MockAuth {
  currentUser: FirebaseUser | null = null;
  listeners: ((user: FirebaseUser | null) => void)[] = [];

  constructor() {
    if (typeof window !== "undefined") {
      const loggedIn = localStorage.getItem("is_user_logged_in") === "true";
      const email = localStorage.getItem("session_user_email") || "dorpotro.bd@gmail.com";
      const name = localStorage.getItem("session_user_name") || "dorpotro.bd Google User";
      const phone = localStorage.getItem("session_user_phone") || "01712345678";

      if (loggedIn) {
        this.currentUser = {
          uid: "USR-MOCK-GOOGLE",
          displayName: name,
          email: email,
          phoneNumber: phone,
          photoURL: null,
          providerData: [{ providerId: "google.com", email }]
        };
      }
    }
  }

  notify() {
    this.listeners.forEach((cb) => cb(this.currentUser));
  }

  signOut() {
    this.currentUser = null;
    this.notify();
    return Promise.resolve();
  }
}

export const auth = new MockAuth();

export const initAuth = (
  onAuthSuccess?: (user: FirebaseUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  const cb = (user: FirebaseUser | null) => {
    if (user) {
      const token = localStorage.getItem("google_cached_access_token") || "mock_access_token_12345";
      if (onAuthSuccess) onAuthSuccess(user, token);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  };
  auth.listeners.push(cb);
  
  // Initial microtask trigger
  setTimeout(() => cb(auth.currentUser), 10);

  return () => {
    auth.listeners = auth.listeners.filter((l) => l !== cb);
  };
};

export const googleSignIn = async (): Promise<{ user: FirebaseUser; accessToken: string } | null> => {
  const email = "dorpotro.bd@gmail.com";
  const name = "google_user_from_metadata";
  const phone = "01712345678";
  const token = "mock_access_token_" + Math.random().toString(36).substring(2, 9);

  auth.currentUser = {
    uid: "USR-MOCK-GOOGLE",
    displayName: name,
    email: email,
    phoneNumber: phone,
    photoURL: null,
    providerData: [{ providerId: "google.com", email }]
  };

  if (typeof window !== "undefined") {
    localStorage.setItem("is_signed_with_google", "true");
    localStorage.setItem("session_user_name", name);
    localStorage.setItem("session_user_email", email);
    localStorage.setItem("session_user_phone", phone);
    localStorage.setItem("is_user_logged_in", "true");
    localStorage.setItem("google_cached_access_token", token);
  }

  auth.notify();
  return { user: auth.currentUser, accessToken: token };
};

export const getAccessToken = async (): Promise<string | null> => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("google_cached_access_token") || "mock_access_token_12345";
  }
  return "mock_access_token_12345";
};

export const logoutUser = async () => {
  await auth.signOut();
  if (typeof window !== "undefined") {
    localStorage.removeItem("is_signed_with_google");
    localStorage.removeItem("session_user_name");
    localStorage.removeItem("session_user_phone");
    localStorage.removeItem("session_user_email");
    localStorage.removeItem("is_user_logged_in");
    localStorage.removeItem("google_cached_access_token");
  }
};

// Mock Document and Query references mimicking Firestore standard SDK signatures
export class DocumentReference {
  constructor(public collectionPath: string, public documentId: string) {}
}

export class CollectionReference {
  constructor(public collectionPath: string) {}
}

export class QueryDocumentSnapshot {
  constructor(public id: string, private dataObj: any) {}
  data() {
    return this.dataObj;
  }
  exists() {
    return this.dataObj !== null;
  }
}

export class QuerySnapshot {
  docs: QueryDocumentSnapshot[] = [];
  constructor(docsList: QueryDocumentSnapshot[]) {
    this.docs = docsList;
  }
  forEach(callback: (doc: QueryDocumentSnapshot) => void) {
    this.docs.forEach(callback);
  }
  get size() {
    return this.docs.length;
  }
}

export class DocumentSnapshot {
  constructor(public id: string, private dataObj: any) {}
  data() {
    return this.dataObj;
  }
  exists() {
    return this.dataObj !== null;
  }
}

export const collection = (database: any, path: string) => {
  return new CollectionReference(path);
};

export const doc = (database: any, path: string, ...pathSegments: string[]) => {
  const fullId = pathSegments.join("/");
  return new DocumentReference(path, fullId || path);
};

export const getDoc = async (docRef: DocumentReference): Promise<DocumentSnapshot> => {
  const data = db.getDocument(docRef.collectionPath, docRef.documentId);
  return new DocumentSnapshot(docRef.documentId, data);
};

export const getDocFromServer = async (docRef: DocumentReference): Promise<DocumentSnapshot> => {
  return new DocumentSnapshot(docRef.documentId, { status: "connected" });
};

export const getDocs = async (colRef: CollectionReference): Promise<QuerySnapshot> => {
  const allData = db.getCollection(colRef.collectionPath);
  const docsList = Object.keys(allData).map((id) => new QueryDocumentSnapshot(id, allData[id]));
  return new QuerySnapshot(docsList);
};

export const setDoc = async (docRef: DocumentReference, data: any, options?: any): Promise<void> => {
  db.setDocument(docRef.collectionPath, docRef.documentId, data);
};

export const updateDoc = async (docRef: DocumentReference, data: any): Promise<void> => {
  const existing = db.getDocument(docRef.collectionPath, docRef.documentId) || {};
  db.setDocument(docRef.collectionPath, docRef.documentId, { ...existing, ...data });
};

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: true,
      isAnonymous: false,
    },
    operationType,
    path
  };
  console.error("Firestore Mock Logged: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Global Custom Event Toast Utility
export const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
  if (typeof window !== "undefined") {
    const event = new CustomEvent("dorpotro-toast", { detail: { message, type } });
    window.dispatchEvent(event);
  } else {
    console.log(`[Toast ${type}]: ${message}`);
  }
};
