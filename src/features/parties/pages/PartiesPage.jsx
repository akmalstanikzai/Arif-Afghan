import { useState } from 'react';
import PageHeading from '../../../components/ui/PageHeading';
import Alert from '../../../components/ui/Alert';
import { Card, Input, Table, Notice, buttonClass, secondaryClass } from '../../../components/ui/Fields';
import { useFactory, useMutation } from '../../factory/hooks/useFactory';
import History from '../../factory/components/History';
import { money, weight } from '../../../lib/format';
import { useLanguage } from '../../../lib/i18n';
export default function PartiesPage({ kind }) {
  const { data } = useFactory();
  const mutation = useMutation();
  const [form, setForm] = useState({ name:'', contact:'', active:true });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const { t } = useLanguage();
  const supplier = kind==='supplier';
  const rows = data.parties.filter(p=>p.kind===kind && `${p.name} ${p.contact}`.includes(search));
  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) { mutation.setError(t('نام را وارد کنید.')); return; }
    if (await mutation.save('party',{...form,kind})) setForm({name:'',contact:'',active:true});
  }
  return <div className="space-y-6"><PageHeading eyebrow="حساب‌ها و سابقهٔ معاملات" title={supplier ? 'تأمین‌کنندگان' : 'مشتریان'} />
    <Card title={form.id ? 'ویرایش مشخصات' : supplier ? 'افزودن تأمین‌کننده' : 'افزودن مشتری'}><form onSubmit={submit} noValidate><fieldset disabled={mutation.busy} className="grid gap-4 sm:grid-cols-2">
      <Input label="نام *" value={form.name} maxLength={160} onChange={name=>setForm(v=>({...v,name}))} />
      <Input label="شماره تماس / آدرس" value={form.contact} maxLength={200} onChange={contact=>setForm(v=>({...v,contact}))} />
      {form.id && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e=>setForm(v=>({...v,active:e.target.checked}))} />فعال برای معاملات جدید</label>}
      <div className="col-span-full"><Alert>{mutation.error}</Alert><Notice>{mutation.success}</Notice><button className={buttonClass}>{mutation.busy ? t('در حال ثبت…') : t('ذخیرهٔ مشخصات')}</button>{form.id && <button type="button" className={`${secondaryClass} ms-3`} onClick={()=>setForm({name:'',contact:'',active:true})}>{t('انصراف')}</button>}</div>
    </fieldset></form></Card>
    <Card title={supplier ? 'حساب تأمین‌کنندگان' : 'حساب مشتریان'}><div className="mb-4 max-w-sm"><Input label="جستجوی نام یا تماس" value={search} onChange={setSearch} /></div><Table rows={rows} columns={[
      {key:'name',label:'نام',render:r=><>{r.name}{!r.active && <span className="ms-2 text-stone-400">(غیرفعال)</span>}</>},{key:'contact',label:'تماس'},
      {key:'total',label:supplier?'مجموع خرید':'مجموع فروش و اجرت',render:r=>money(r.total)},
      ...(!supplier ? [{key:'sales_total',label:'خرید برنج',render:r=>money(r.sales_total)},{key:'service_total',label:'اجرت خدمات',render:r=>money(r.service_total)}] : []),
      {key:'paid',label:'پرداخت نقدی',render:r=>money(r.paid)},
      ...(!supplier ? [{key:'rice_payment',label:'پرداخت با برنج',render:r=>money(r.rice_payment)}] : []),
      {key:'remaining',label:supplier?'قابل پرداخت':'قابل دریافت',render:r=>money(r.remaining)},
      ...(!supplier ? [{key:'purchased_weight',label:'وزن خریداری‌شده',render:r=>weight(r.purchased_weight)},{key:'delivered',label:'تحویل‌شده',render:r=>weight(r.delivered)},{key:'pending',label:'منتظر تحویل',render:r=>weight(r.pending)}] : []),
      {key:'actions',label:'عملیات',render:r=><div className="flex gap-2"><button className={secondaryClass} onClick={()=>{setForm({id:r.id,name:r.name,contact:r.contact,active:r.active});mutation.setError('');mutation.setSuccess('');window.scrollTo({top:0,behavior:'smooth'});}}>{t('ویرایش')}</button><button className={secondaryClass} onClick={()=>setSelected(r.id)}>{t('سابقه')}</button></div>},
    ]} /></Card>
    {selected && <><button className={secondaryClass} onClick={()=>setSelected(null)}>{t('بستن سابقه')}</button><History key={selected} partyId={selected} title={`سابقهٔ ${data.parties.find(p=>p.id===selected)?.name || ''}`} /></>}
  </div>;
}
