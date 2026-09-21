import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { catalogs, languages, translate, setCurrentLanguage } from '../src/lib/translations.js';
import { errorMessage, money, weight, dateLabel, normalizeDigits } from '../src/lib/format.js';
import { calculate, validateTransaction } from '../src/services/calculations.js';

test('all language catalogs have matching keys and interpolation variables', () => {
  const keys = Object.keys(catalogs.en).sort();
  const variables = text => [...text.matchAll(/\{\w+\}/g)].map(m => m[0]).sort();
  for (const [language, catalog] of Object.entries(catalogs)) {
    assert.deepEqual(Object.keys(catalog).sort(), keys, language);
    for (const key of keys) {
      assert.ok(catalog[key].trim(), `${language}: ${key}`);
      assert.deepEqual(variables(catalog[key]), variables(key), `${language}: ${key}`);
    }
  }
});

test('language switches update units and show record dates only in Solar Hijri without touching user data', () => {
  for (const language of Object.keys(languages)) {
    setCurrentLanguage(language);
    assert.ok(money(125).endsWith(catalogs[language].AFN));
    assert.ok(weight(1.25).endsWith(catalogs[language].kg));
    const displayedDate = dateLabel('2026-09-20');
    assert.ok(!displayedDate.includes(catalogs[language].Gregorian));
    assert.ok(!displayedDate.includes(catalogs[language]['Solar Hijri']));
    assert.ok(!displayedDate.includes('·'));
    assert.ok(translate('Welcome, {name}.', { name: 'Salary $& {name}' }).includes('Salary $& {name}'));
  }
  assert.equal(setCurrentLanguage('unsupported'), 'fa-AF');
  assert.equal(normalizeDigits('۱۲٣٫۵'), '123.5');
});

test('all database business errors have specific translations', () => {
  const migrations = fs.readdirSync('supabase/migrations').map(f => fs.readFileSync(`supabase/migrations/${f}`, 'utf8')).join('\n');
  for (const [, message] of migrations.matchAll(/raise exception '([^']+)'/g)) {
    const key = errorMessage({ code: 'P0001', message });
    assert.notEqual(key, 'The operation could not be completed. Refresh and try again.', message);
    for (const language of Object.keys(languages)) assert.ok(catalogs[language][key], `${language}: ${message}`);
  }
  assert.match(errorMessage({ code: '23514', message: 'private constraint detail' }), /^The entered values/);
  assert.equal(errorMessage(new Error('private server detail')), 'The operation could not be completed. Refresh and try again.');
});

test('purchase costing and settlement validation survive the folder move', () => {
  const data = { raw_stock: [{ id: 1, quantity: 100, average_cost: 50 }], products: [{ id: 11, available: 20 }] };
  const purchase = { date: '2026-09-20', party_id: 'supplier', raw_type_id: 1, weight: '۱۰', unit_price: '۵۰', logistics: '۲۰', paid: '۱۰۰' };
  assert.equal(calculate('purchase', purchase, data).landed, 520);
  assert.equal(calculate('purchase', purchase, data).remaining, 400);
  assert.equal(validateTransaction('purchase', purchase, data), '');
  assert.equal(validateTransaction('purchase', { ...purchase, paid: 501 }, data), 'Cash and rice payments exceed the record amount.');
  assert.equal(validateTransaction('sale', { ...purchase, product_id: 11, weight: 21 }, data), 'There is not enough available inventory.');
});
