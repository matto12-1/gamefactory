const paths = {
  home:'M3 11 12 3l9 8M5 10v11h14V10M9 21v-7h6v7',
  clock:'M12 7v5l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  branches:'M5 3v12c0 3 2 5 5 5h9M5 8h14M15 4l4 4-4 4M15 16l4 4-4 4',
  korean:'M4 4h16v13H9l-5 4V4ZM8 8h8M8 12h5',
  math:'M5 2h14v20H5zM8 6h8M8 11h2M14 11h2M8 15h2M14 15h2M8 19h2M14 19h2',
  social:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z',
  science:'M9 3h6M10 3v7L4 20q-1 1 1 1h14q2 0 1-1l-6-10V3M7 15h10M9 18h1M14 18h1',
  info:'M3 4h18v13H3zM8 21h8M12 17v4m-3-13-3 3 3 3m6-6 3 3-3 3',
  safety:'M12 2 3 6v6c0 5 5 8 9 10 4-2 9-5 9-10V6L12 2Zm-5 10 3 3 7-7',
  spark:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z',
  flame:'M13 2c1 6-5 6-4 11-3-1-3-3-3-3-4 8 0 12 6 12 7 0 11-9 1-20Z',
  duo:'M10 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0M20 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0M2 21v-4a5 5 0 0 1 10 0v4M13 13a5 5 0 0 1 9 4v4',
  map:'m2 5 6-3 8 3 6-3v17l-6 3-8-3-6 3zM8 2v17M16 5v17',
  bolt:'m14 2-11 12h8l-1 8 11-12h-8z',
  filter:'M4 5h16l-6 7.5V19l-4 2v-8.5z',
  tv:'M3 6h18v13H3zM8 23h8M12 19v4M8 2l4 4 4-4',
  calendar:'M3 5h18v17H3zM7 2v6M17 2v6M3 11h18m-14 5h3m4 0h3',
  subject:'M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1Zm0 0v16',
  trophy:'M7 3h10v7a5 5 0 0 1-10 0zM7 5H3v2a4 4 0 0 0 4 4M17 5h4v2a4 4 0 0 1-4 4M12 15v6M7 22h10',
  stamp:'M18 8a6 6 0 1 1-12 0 6 6 0 0 1 12 0M8 13l-2 9 6-3 6 3-2-9',
  more:'M4 6h16M4 12h16M4 18h16', close:'m6 6 12 12M18 6 6 18'
};
export function navIcon(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name]??paths.grid}"/></svg>`;
}
