import { dateLabel, errorMessage } from '../lib/format.js';
import PageHeading from '../components/PageHeading.jsx';
import { getUserDisplayName } from '../lib/user.js';
import { useLanguage } from '../hooks/useLanguage';
import { useState } from 'react';
import { useFactory } from '../hooks/useFactory.js';
import { clearTestingData } from '../services/millApi.js';
import Alert from '../components/Alert.jsx';
import { Notice } from '../components/Fields.jsx';

export default function AccountPage({ user }) {
  const name = getUserDisplayName(user);
  const { t } = useLanguage();
  const { refresh } = useFactory();
  const [clearing,setClearing]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const details = [
    { label: "Email address", value: user.email || t("Not provided") },
    { label: "Account created", value: user.created_at ? dateLabel(user.created_at) : t("Unavailable") },
  ];

  const clearAll=async()=>{
    if(!globalThis.confirm(t("This permanently deletes all factory records, suppliers, customers, employees, salaries, and expenses. User accounts and fixed catalogs will remain. Continue?")))return;
    setClearing(true);setMessage('');setError('');
    try{await clearTestingData();await refresh();setMessage("All testing data was cleared successfully.");}
    catch(err){setError(errorMessage(err));}
    finally{setClearing(false);}
  };
  return (
    <div className="space-y-6">
      <PageHeading eyebrow="Account details" title="Settings" />
      <section className="max-w-[680px] rounded-xl border border-line bg-white p-8">
        <span className="mb-5 grid size-14 place-items-center rounded-full bg-[#e9eedf] text-[22px] font-semibold text-[#59704c]">{name.charAt(0).toUpperCase()}</span>
        <h2 className="text-[22px] font-semibold wrap-anywhere">{name}</h2>
        <p className="mt-3 text-[13px] leading-relaxed text-[#7e8877]">{t("Details for the account you are signed in with.")}</p>
        <dl className="mt-8">
          {details.map(detail => <div key={detail.label} className="border-t border-line py-4"><dt className="mb-2 text-[11px] text-[#7e8877]">{t(detail.label)}</dt><dd className="wrap-anywhere">{detail.value}</dd></div>)}
        </dl>
        <p className="mt-6 text-xs leading-relaxed text-[#7e8877]">{t("Contact the factory administrator to change your details or get password help.")}</p>
      </section>
      <section className="max-w-[680px] rounded-xl border border-red-200 bg-white p-8">
        <h2 className="text-lg font-semibold text-red-800">{t("Testing data reset")}</h2>
        <p className="mt-3 text-sm leading-7 text-stone-600">{t("Delete all factory records and people added for testing. Your login account and fixed rice, product, and expense catalogs will not be deleted.")}</p>
        <Alert>{error}</Alert><Notice>{message}</Notice>
        <button type="button" className="mt-5 rounded-lg bg-red-700 px-5 py-2.5 text-sm text-white hover:bg-red-800 disabled:cursor-wait disabled:opacity-50" disabled={clearing} onClick={clearAll}>{t(clearing?"Clearing data…":"Clear all testing data")}</button>
      </section>
    </div>
  );
}
