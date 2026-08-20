import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AppProvider } from './contexts/AppContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { About } from './pages/About';
import { BusinessData } from './pages/BusinessData';
import { Compliance } from './pages/Compliance';
import { Dashboard } from './pages/Dashboard';
import { Documents } from './pages/Documents';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { MyDocuments } from './pages/MyDocuments';
import { Settings } from './pages/Settings';
import { StatementDetail } from './pages/StatementDetail';
import { Statements } from './pages/Statements';

export function App() {
  return (
    <ThemeProvider>
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/statements" element={<Statements />} />
            <Route path="/statements/:statementId" element={<StatementDetail />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/compliance" element={<Compliance />} />
            <Route path="/knowledge-base" element={<KnowledgeBase />} />
            <Route path="/files" element={<MyDocuments />} />
            <Route path="/business-data" element={<BusinessData />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
    </ThemeProvider>);

}