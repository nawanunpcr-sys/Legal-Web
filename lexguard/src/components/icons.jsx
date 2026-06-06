const P = { fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round' }
const PATHS = {
  grid:<><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></>,
  book:<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>,
  check:<><path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,
  chat:<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
  spark:<><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/></>,
  shield:<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></>,
  search:<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>,
  download:<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></>,
  bell:<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
  alert:<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></>,
  clock:<><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>,
  list:<><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></>,
  chevron:<><path d="m15 18-6-6 6-6"/></>,
  close:<><path d="M18 6 6 18M6 6l12 12"/></>,
  x:<><path d="M18 6 6 18M6 6l12 12"/></>,
  save:<><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></>,
  info:<><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></>,
  scale:<><path d="M12 3v18M5 7h14M7 7l-3 7h6zM17 7l-3 7h6z"/></>,
  ban:<><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></>,
  folder:<><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></>,
  plus:<><path d="M12 5v14M5 12h14"/></>,
}
export function I({ n, style, stroke }){
  return <svg viewBox="0 0 24 24" {...P} stroke={stroke||'currentColor'} style={style}>{PATHS[n]||null}</svg>
}
