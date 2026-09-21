import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Render real screens with fixture data; never connect to a hosted database.
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { LanguageProvider } = await server.ssrLoadModule('/src/providers/LanguageProvider.jsx');
  const { FactoryContext } = await server.ssrLoadModule('/src/providers/FactoryContext.js');
  const { setCurrentLanguage, catalogs } = await server.ssrLoadModule('/src/lib/translations.js');
  const { default: DateInput } = await server.ssrLoadModule('/src/components/DateInput.jsx');
  const user = { email: 'test@example.com', user_metadata: { full_name: 'Salary' }, created_at: '2026-09-20T00:00:00Z' };
  const data = {
    raw_stock: [{ id: 1, name: 'Untranslated rice', quantity: 100, average_cost: 10, value: 1000 }],
    products: [{ id: 11, raw_type_id: 1, quality: 1, name: 'Untranslated product', available: 50 }],
    parties: [{ id: 'customer', kind: 'customer', name: 'Salary', contact: 'Original contact', active: true }],
    expense_categories: [{ id: 'salary', name: 'Salary' }], expenses: [{ id: 'salary', name: 'Salary', amount: 100 }],
    recent: [], summary: {},
  };
  const pages = [
    ['LoginPage', { configured: true, error: 'The email or password is incorrect.' }, 'Staff sign in'],
    ['AccountPage', { user }, 'Account details'], ['OverviewPage', { user }, 'Factory activity overview'],
    ['PurchasesPage', {}, 'Record raw rice purchase'], ['ProcessingPage', {}, 'Start process'],
    ['ProcessingPage', { service: true }, 'Record completed contract processing'],
    ['SalesPage', {}, 'Record sale'], ['InventoryPage', {}, 'Processed inventory'], ['RawInventoryPage', {}, 'Raw material inventory'], ['OngoingProcessesPage', {}, 'Ongoing processes'],
    ['PartiesPage', { kind: 'supplier' }, 'Add supplier'], ['PartiesPage', { kind: 'customer' }, 'Add customer'],
    ['ExpensesPage', {}, 'Record expense'], ['MonthlyExpensesPage', {}, 'Record monthly fixed expense'], ['StaffSalariesPage', {}, 'Staff and salaries'],
  ];
  for (const language of ['en', 'fa-AF', 'ps-AF']) {
    setCurrentLanguage(language);
    const dateInput = renderToStaticMarkup(React.createElement(LanguageProvider, null,
      React.createElement(DateInput, { value: '2025-03-20', required: true, onChange: () => {} })));
    assert.ok(dateInput.includes(language === 'en' ? 'value="2025-03-20"' : 'value="1403-12-30"'));
    assert.ok(dateInput.includes(catalogs[language].Gregorian));
    assert.ok(dateInput.includes(catalogs[language]['Solar Hijri']));
    for (const [name, props, heading] of pages) {
      const { default: Page } = await server.ssrLoadModule(`/src/pages/${name}.jsx`);
      const html = renderToStaticMarkup(React.createElement(LanguageProvider, null,
        React.createElement(FactoryContext.Provider, { value: { data, version: 0, refresh: async () => {} } }, React.createElement(Page, props))));
      assert.ok(html.includes(catalogs[language][heading]), `${language}: ${name}: ${heading}`);
      if (name === 'AccountPage') assert.ok(html.includes('Salary'), 'user name must remain unchanged');
      if (name === 'LoginPage') assert.ok(html.includes(catalogs[language]['The email or password is incorrect.']));
      if (name === 'InventoryPage') assert.ok(html.includes('Untranslated product'));
      if (['PurchasesPage','ProcessingPage','SalesPage','ExpensesPage'].includes(name)) {
        assert.ok(html.includes(catalogs[language].Gregorian), `${name}: Gregorian entry`);
        assert.ok(html.includes(catalogs[language]['Solar Hijri']), `${name}: Solar Hijri entry`);
        assert.ok(html.includes(catalogs[language]['From date']), `${name}: dual-calendar history filter`);
      }
    }
  }
  console.log('PASS: 45 page renders across English, Dari, and Pashto; errors and user data boundaries.');
} finally { await server.close(); }
