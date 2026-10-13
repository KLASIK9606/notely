import React from 'react';
import type { SearchGrounding } from './api';

export function SearchSuggestions({ grounding }: { grounding: SearchGrounding }) {
  if (!grounding.searchSuggestions) return null;
  return <iframe title="Wyniki wyszukiwania Google" srcDoc={grounding.searchSuggestions} sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" style={{ width: '100%', height: 140, border: 0, borderRadius: 12, background: 'white' }} />;
}
