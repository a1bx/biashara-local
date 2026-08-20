import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  StatementWorkspace,
  type StatementTab } from
'../components/statements/StatementWorkspace';

export function StatementDetail() {
  const { statementId } = useParams<{statementId: string;}>();
  const location = useLocation();
  const state = location.state as {tab?: StatementTab;} | null;

  return (
    <StatementWorkspace
      statementId={statementId}
      initialTab={state?.tab ?? 'Summary'} />);


}