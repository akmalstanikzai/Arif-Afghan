import assert from 'node:assert/strict';
import test from 'node:test';
import { fromKilograms, toKilograms } from '../src/lib/units.js';
import { emptyInventoryFilters, filterInventory } from '../src/services/inventory.js';
import { calculateRiceCosts, validateTransaction } from '../src/services/calculations.js';

test('kg, metric tons and all bag sizes convert without changing stored weight', () => {
  assert.equal(toKilograms('۱٫۲۵'.replace('٫','.'),'tons'), '1250');
  assert.equal(toKilograms('10','bags',20), '200');
  assert.equal(toKilograms('10','bags',24.5), '245');
  assert.equal(toKilograms('10','bags',70), '700');
  assert.equal(fromKilograms('245','tons'), '0.245');
  assert.equal(fromKilograms('245','bags',24.5), '10');
  assert.equal(toKilograms('0.000001','tons'), '0.001');
  assert.equal(toKilograms('0.0000001','tons'), 'invalid');
  assert.equal(toKilograms('-1'), 'invalid');
  assert.equal(toKilograms('bad'), 'invalid');
  assert.equal(toKilograms(''), '');
});

test('processed-stock filters combine type, quality, bag size, mark and availability', () => {
  const rows = [
    { name:'Kainat Premium',raw_type_id:1,quality:1,bag_size:24.5,bag_mark:'Talha',available:245,physical:490,reserved:245 },
    { name:'Kainat Premium',raw_type_id:1,quality:1,bag_size:24.5,bag_mark:'Mahfooz',available:700,physical:700,reserved:0 },
    { name:'Lok Medium',raw_type_id:2,quality:2,bag_size:0,bag_mark:'',available:0,physical:0,reserved:0 },
  ];
  assert.deepEqual(filterInventory(rows,{...emptyInventoryFilters,search:'KAINAT',raw:'1',quality:'1',size:'24.5',mark:'Talha',status:'reserved'}),[rows[0]]);
  assert.deepEqual(filterInventory(rows,{...emptyInventoryFilters,size:'0',status:'empty'}),[rows[2]]);
  assert.equal(filterInventory(rows,{...emptyInventoryFilters,sort:'available'})[0].bag_mark,'Mahfooz');
  assert.equal(rows[0].bag_mark,'Talha','filtering must not mutate source order');
});

test('starting a process does not need outputs; purchases accept initial payments; sales validate their own stock', () => {
  const data={raw_stock:[{id:1,quantity:100,average_cost:50}],products:[],packaged_stock:[{product_id:11,bag_size:20,bag_mark:'Talha',available:20}]};
  assert.equal(validateTransaction('processing',{date:'2026-09-20',raw_type_id:1,input_weight:50},data),'');
  assert.equal(validateTransaction('processing',{date:'2026-09-20',raw_type_id:1,input_weight:101},data),'There is not enough raw rice inventory.');
  assert.equal(validateTransaction('purchase',{date:'2026-09-20',party_id:'supplier',raw_type_id:1,weight:10,unit_price:5,logistics:0},data),'');
  assert.equal(validateTransaction('purchase',{date:'2026-09-20',party_id:'supplier',raw_type_id:1,weight:10,unit_price:5,logistics:0,paid:10,payment_method:'cheque'},data),'Enter a cheque number.');
  assert.equal(validateTransaction('sale',{date:'2026-09-20',party_id:'customer',product_id:11,weight:1,unit_price:5,bag_size:20,bag_mark:'Mahfooz'},data),'There is not enough available inventory.');
});

test('rice costing allocates all period expenses by quality output weight', () => {
  const report = { total_expenses: 1000, rows: [
    { product_id: 11, raw_type_id: 1, quality: 1, output_weight: 100, raw_price: 50 },
    { product_id: 21, raw_type_id: 2, quality: 1, output_weight: 300, raw_price: 60 },
    { product_id: 12, raw_type_id: 1, quality: 2, output_weight: 250, raw_price: 50 },
    { product_id: 13, raw_type_id: 1, quality: 3, output_weight: 0, raw_price: 50 },
  ] };
  const result = calculateRiceCosts(report, [50, 25, 15, 10]);
  assert.equal(result.valid, true);
  assert.deepEqual(result.qualityTotals, [400, 250, 0, 0]);
  assert.equal(result.rows[0].expense_per_kg, 1.25);
  assert.equal(result.rows[0].final_cost, 51.25);
  assert.equal(result.rows[1].final_cost, 61.25);
  assert.equal(result.rows[2].expense_per_kg, 1);
  assert.equal(result.rows[3].final_cost, null);
  assert.equal(calculateRiceCosts(report, [50, 25, 15, 5]).valid, false);
  const selected = calculateRiceCosts(report, [50, 25, 15, 10], 1);
  assert.deepEqual(selected.qualityTotals, [100, 250, 0, 0]);
  assert.equal(selected.rows.length, 3);
  assert.equal(selected.rows[0].expense_per_kg, 5);
});
