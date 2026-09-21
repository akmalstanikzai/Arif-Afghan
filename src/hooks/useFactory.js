import { useContext, useRef, useState } from 'react';
import { FactoryContext } from '../providers/FactoryContext.js';
import { completeContractProcess, deleteParty, paySupplier, postEntry, startContractProcess, updatePurchase } from '../services/millApi.js';
import { errorMessage } from '../lib/format.js';
export const useFactory = () => useContext(FactoryContext);

export function useMutation() {
  const { refresh } = useFactory();
  const request = useRef(null);
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function save(kind, data) {
    if (running.current) return null;
    running.current = true; setBusy(true); setError(''); setSuccess('');
    const signature = JSON.stringify({ kind, data });
    if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() };
    try {
      const id = await postEntry(kind, data, request.current.id);
      request.current = null;
      setSuccess("Saved successfully.");
      await refresh();
      return id;
    } catch (err) { setError(errorMessage(err)); return null; }
    finally { running.current = false; setBusy(false); }
  }
  async function removeParty(id) {
    if (running.current) return false;
    running.current = true; setBusy(true); setError(''); setSuccess('');
    try {
      await deleteParty(id);
      setSuccess("Supplier deleted successfully.");
      await refresh();
      return true;
    } catch (err) { setError(errorMessage(err)); return false; }
    finally { running.current = false; setBusy(false); }
  }
  async function saveSupplierPayment(data) {
    if (running.current) return null;
    running.current = true; setBusy(true); setError(''); setSuccess('');
    const signature = JSON.stringify({ kind: 'supplier_payment', data });
    if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() };
    try {
      const id = await paySupplier(data, request.current.id);
      request.current = null;
      setSuccess("Supplier payment saved successfully.");
      await refresh();
      return id;
    } catch (err) { setError(errorMessage(err)); return null; }
    finally { running.current = false; setBusy(false); }
  }
  async function savePurchaseEdit(data) {
    if (running.current) return null;
    running.current = true; setBusy(true); setError(''); setSuccess('');
    const signature = JSON.stringify({ kind: 'purchase_update', data });
    if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() };
    try {
      const id = await updatePurchase(data, request.current.id);
      request.current = null;
      setSuccess("Purchase updated successfully.");
      await refresh();
      return id;
    } catch (err) { setError(errorMessage(err)); return null; }
    finally { running.current = false; setBusy(false); }
  }
  async function saveContract(action,data) {
    if (running.current) return null;
    running.current=true;setBusy(true);setError('');setSuccess('');
    const signature=JSON.stringify({kind:`contract_${action}`,data});
    if(request.current?.signature!==signature)request.current={signature,id:crypto.randomUUID()};
    try{const fn=action==='start'?startContractProcess:completeContractProcess;const id=await fn(data,request.current.id);request.current=null;setSuccess(action==='start'?'Contract process started successfully.':'Contract process completed successfully.');await refresh();return id;}catch(err){setError(errorMessage(err));return null;}finally{running.current=false;setBusy(false);}
  }
  return { save, removeParty, saveSupplierPayment, savePurchaseEdit, saveContract, busy, error, setError, success, setSuccess };
}
