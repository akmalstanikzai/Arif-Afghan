const paths = {
  home: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
  logout: <path d="M9 4H4v16h5M10 12h11m-4-4 4 4-4 4" />,
  leaf: <path d="M20 4C9 2 3 7 5 15c8 5 16-1 15-11ZM4 21 15 10" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
};

export default function Icon({ name, ...props }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
