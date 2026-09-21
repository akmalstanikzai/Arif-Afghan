import { useState } from 'react';
import { sidebarNavigation } from '../lib/format.js';
import Brand from './Brand.jsx';
import Icon from './Icon.jsx';
import { getUserDisplayName } from '../lib/user.js';
import { useLanguage } from '../hooks/useLanguage';



export default function Sidebar({ user, page, open, onNavigate, onSignOut, busy }) {
  const name = getUserDisplayName(user);
  const { t, direction } = useLanguage();
  const activeGroup = sidebarNavigation.find(item => item.children?.some(child => child.id === page))?.id;
  const [expanded, setExpanded] = useState({});

  return (
    <aside dir={direction} className="flex w-full shrink-0 flex-col bg-brand p-5 text-[#ecf1e8] md:sticky md:top-0 md:h-svh md:w-[215px] md:px-3.5 md:pt-6 lg:w-[248px] lg:px-5">
      <div className="px-2"><Brand workspace /></div>
      <nav id="dashboard-navigation" aria-label={t("Main navigation")} className={`${open ? 'mt-5 grid' : 'hidden'} gap-2 md:mt-6 md:grid md:min-h-0 md:overflow-y-auto`}>
        {sidebarNavigation.map(item => item.children ? <div key={item.id}>
          <button className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-4 py-3 text-start text-[13px] hover:bg-[#234a3b] hover:text-white ${item.id===activeGroup?'bg-[#294d3e] text-[#f5efda]':'text-[#b7cabc]'}`} aria-expanded={expanded[item.id] ?? item.id===activeGroup} aria-controls={`${item.id}-items`} onClick={()=>setExpanded(old=>({...old,[item.id]:!(old[item.id] ?? item.id===activeGroup)}))}>
            <Icon name={item.icon} /><span className="flex-1">{t(item.label)}</span><span className={`text-xs transition-transform ${(expanded[item.id] ?? item.id===activeGroup)?'rotate-180':''}`} aria-hidden="true">⌄</span>
          </button>
          {(expanded[item.id] ?? item.id===activeGroup) && <div id={`${item.id}-items`} className="mt-1 grid gap-1 border-s border-[#496758] ps-3 ms-6">
            {item.children.map(child=><button key={child.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-start text-xs text-[#b7cabc] hover:bg-[#234a3b] hover:text-white aria-[current=page]:bg-[#315444] aria-[current=page]:text-[#f5efda]" aria-current={page===child.id?'page':undefined} onClick={()=>onNavigate(child.id)}><Icon name={child.icon} width="17" height="17" />{t(child.label)}</button>)}
          </div>}
        </div> : <button key={item.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 text-start text-[13px] text-[#b7cabc] hover:bg-[#234a3b] hover:text-white aria-[current=page]:bg-[#315444] aria-[current=page]:text-[#f5efda]" aria-current={page === item.id ? 'page' : undefined} onClick={() => onNavigate(item.id)}>
          <Icon name={item.icon} />{t(item.label)}
        </button>)}
      </nav>
      <div className={`${open ? 'block' : 'hidden'} mt-auto pt-4 md:block md:pt-4`}>
        <div className="flex items-center gap-2.5 border-t border-[#365547] px-1 pt-5 pb-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#dce3cf] font-semibold text-[#284b38]">{name.charAt(0).toUpperCase()}</span>
          <div className="min-w-0"><strong className="block truncate text-xs font-medium">{name}</strong><span className="mt-1 block truncate text-[10px] text-[#a9bdaf]">{user.email}</span></div>
        </div>
        <button className="flex w-full cursor-pointer items-center gap-3 rounded-md p-3 text-xs text-[#bfd0c3] hover:bg-[#315444] disabled:cursor-wait disabled:opacity-50" onClick={onSignOut} disabled={busy}><Icon name="logout" />{busy ? t("Signing out…") : t("Sign out")}</button>
      </div>
    </aside>
  );
}
