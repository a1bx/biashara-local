import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState } from
'react';
import { buildDemoStatements, demoBusiness, demoStoredFiles } from '../data/demoData';
import { categoryForKind } from '../services/documentGenerator';
import type {
  BusinessDocument,
  BusinessProfile,
  ComplianceAnswer,
  Statement,
  StoredFile,
  Transaction } from
'../types';

const STORAGE_KEY = 'biashara-local-state-v1';

interface PersistedState {
  business: BusinessProfile;
  documents: BusinessDocument[];
  files: StoredFile[];
  history: ComplianceAnswer[];
  demoLoaded: boolean;
}

interface AppContextValue {
  business: BusinessProfile;
  setBusiness: (profile: BusinessProfile) => void;
  statements: Statement[];
  addStatement: (statement: Statement) => void;
  removeStatement: (id: string) => void;
  latestStatement: Statement | null;
  allTransactions: Transaction[];
  documents: BusinessDocument[];
  addDocument: (doc: BusinessDocument) => void;
  renameDocument: (id: string, name: string) => void;
  deleteDocument: (id: string) => void;
  files: StoredFile[];
  renameFile: (id: string, name: string) => void;
  deleteFile: (id: string) => void;
  history: ComplianceAnswer[];
  addAnswer: (answer: ComplianceAnswer) => void;
  clearHistory: () => void;
  clearAllData: () => void;
  loadDemoData: () => void;
  hasDemoData: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

function readPersisted(): Partial<PersistedState> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as PersistedState : {};
  } catch {
    return {};
  }
}

export function AppProvider({ children }: {children: React.ReactNode;}) {
  const persisted = useMemo(readPersisted, []);
  const seeded = persisted.demoLoaded !== false;

  const [business, setBusiness] = useState<BusinessProfile>(
    persisted.business ?? demoBusiness
  );
  const [statements, setStatements] = useState<Statement[]>(() =>
  seeded ? buildDemoStatements() : []
  );
  const [documents, setDocuments] = useState<BusinessDocument[]>(
    persisted.documents ?? []
  );
  const [files, setFiles] = useState<StoredFile[]>(
    persisted.files ?? (seeded ? demoStoredFiles : [])
  );
  const [history, setHistory] = useState<ComplianceAnswer[]>(
    persisted.history ?? []
  );
  const [hasDemoData, setHasDemoData] = useState(seeded);

  useEffect(() => {
    const payload: PersistedState = {
      business,
      documents,
      files,
      history,
      demoLoaded: hasDemoData
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {

      /* storage unavailable — the app keeps working in memory */}
  }, [business, documents, files, history, hasDemoData]);

  const statementFiles = useMemo<StoredFile[]>(
    () =>
    statements.map((s) => ({
      id: `file-${s.id}`,
      name: s.fileName,
      category: 'Statements' as const,
      type: s.fileName.toLowerCase().endsWith('.pdf') ? 'PDF' : 'CSV',
      createdAt: s.importedAt,
      modifiedAt: s.importedAt,
      status: s.status,
      linkTo: `/statements/${s.id}`
    })),
    [statements]
  );

  const documentFiles = useMemo<StoredFile[]>(
    () =>
    documents.map((d) => ({
      id: `file-${d.id}`,
      name: `${d.kind} ${d.reference}.pdf`,
      category: categoryForKind(d.kind),
      type: 'PDF',
      createdAt: d.createdAt,
      modifiedAt: d.modifiedAt,
      status: d.status,
      linkTo: `/documents?doc=${d.id}`
    })),
    [documents]
  );

  const addStatement = useCallback((statement: Statement) => {
    setStatements((prev) =>
    [...prev.filter((s) => s.id !== statement.id), statement].sort((a, b) =>
    a.periodLabel.localeCompare(b.periodLabel)
    )
    );
  }, []);

  const removeStatement = useCallback((id: string) => {
    setStatements((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const addDocument = useCallback((doc: BusinessDocument) => {
    setDocuments((prev) => [doc, ...prev]);
  }, []);

  const renameDocument = useCallback((id: string, name: string) => {
    setDocuments((prev) =>
    prev.map((d) =>
    d.id === id ?
    { ...d, reference: name, modifiedAt: new Date().toISOString() } :
    d
    )
    );
  }, []);

  const deleteDocument = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const renameFile = useCallback((id: string, name: string) => {
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, name } : f));
  }, []);

  const deleteFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const addAnswer = useCallback((answer: ComplianceAnswer) => {
    setHistory((prev) => [answer, ...prev].slice(0, 30));
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const clearAllData = useCallback(() => {
    setStatements([]);
    setDocuments([]);
    setFiles([]);
    setHistory([]);
    setHasDemoData(false);
  }, []);

  const loadDemoData = useCallback(() => {
    setStatements(buildDemoStatements());
    setFiles((prev) => [
    ...demoStoredFiles.filter((d) => !prev.some((p) => p.id === d.id)),
    ...prev]
    );
    setBusiness(demoBusiness);
    setHasDemoData(true);
  }, []);

  const sortedStatements = useMemo(
    () =>
    [...statements].sort((a, b) =>
    b.importedAt.localeCompare(a.importedAt)
    ),
    [statements]
  );

  const latestStatement = sortedStatements[0] ?? null;

  const allTransactions = useMemo(
    () => statements.flatMap((s) => s.transactions),
    [statements]
  );

  const value: AppContextValue = {
    business,
    setBusiness,
    statements: sortedStatements,
    addStatement,
    removeStatement,
    latestStatement,
    allTransactions,
    documents,
    addDocument,
    renameDocument,
    deleteDocument,
    files: [...statementFiles, ...documentFiles, ...files],
    renameFile,
    deleteFile,
    history,
    addAnswer,
    clearHistory,
    clearAllData,
    loadDemoData,
    hasDemoData
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}