import { useLanguage } from '../hooks/useLanguage';
import { qualityLabels, weight, numeric } from '../lib/format.js';
import { bagSizes, bagMarks } from '../lib/units.js';
import WeightInput from './WeightInput.jsx';
import PackagingFields from './PackagingFields.jsx';
import { Input, secondaryClass } from './Fields.jsx';

export default function ProcessingOutputs({ outputs, onChange, service = false, products = [] }) {
  const { t } = useLanguage();
  const update = (index,row) => onChange(outputs.map((item,i)=>i===index?row:item));
  const productIds = [...new Set(outputs.map(row=>row.product_id))].sort((a,b)=>Number(a)-Number(b));
  function addPackaging(product) {
    const existing=outputs.filter(row=>row.product_id===product);
    const variants=[{bag_size:0,bag_mark:''},...bagSizes.flatMap(bag_size=>bagMarks.map(bag_mark=>({bag_size,bag_mark})))];
    const variant=variants.find(v=>!existing.some(row=>Number(row.bag_size || 0)===v.bag_size && (row.bag_mark || '')===v.bag_mark));
    if(variant)onChange([...outputs,{product_id:product,weight:'0',retained:'0',fee_price:'0',...variant,_key:crypto.randomUUID()}]);
  }
  return <div className="mt-5 space-y-5">{productIds.map(product=>{
    const rows=outputs.map((row,index)=>({row,index})).filter(({row})=>row.product_id===product);
    return <section key={product} className="space-y-4 rounded-lg border border-line p-4">
      <h3 className="font-semibold">{t(qualityLabels[Number(products.find(p=>String(p.id)===String(product))?.quality || 1)-1])}</h3>
      <div className="grid gap-4 lg:grid-cols-2">{rows.map(({row,index})=><div className="space-y-4 rounded-lg bg-surface p-4" key={row._key || `${product}-original`}>
        <PackagingFields value={row} onChange={value=>update(index,value)} />
        <WeightInput label="Output" value={row.weight} bagSize={row.bag_size} onChange={value=>update(index,{...row,weight:value})} />
        {service && <>
          <WeightInput label="Factory share" value={row.retained} bagSize={row.bag_size} onChange={value=>update(index,{...row,retained:value})} />
          <Input label="Agreed price per kg" value={row.fee_price} inputMode="decimal" onChange={fee_price=>update(index,{...row,fee_price})} />
          <p className="text-xs">{t('Returned to owner')}: {weight(numeric(row.weight)-numeric(row.retained))}</p>
        </>}
        {rows.length>1 && <button type="button" className={secondaryClass} onClick={()=>onChange(outputs.filter((_,i)=>i!==index))}>{t('Remove packaging row')}</button>}
      </div>)}</div>
      {rows.length<7 && <button type="button" className={secondaryClass} onClick={()=>addPackaging(product)}>{t('Add another bag size / mark')}</button>}
    </section>;
  })}</div>;
}
