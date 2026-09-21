# Editing interface wording

Each language has one UTF-8 JSON file:

- `en.json`: English.
- `fa-AF.json`: Afghan Dari / Persian.
- `ps-AF.json`: Pashto.

Find the English phrase on the **left** and edit the translation on the **right**.
For example, change `"Suppliers": "تأمین‌کنندگان"` to your preferred local term.
Keep the English key unchanged, even when changing the English wording itself.
Search that key in `src` to find the screens using it. The same key intentionally
shares wording across screens; introduce a new key if a context needs different wording.

For a new message, add the same key to all three files and call
`t('Your message')` from `useLanguage()` in `src/hooks/useLanguage.js`.
Shared components translate `label`, `title`, `hint`, table headings, and input
placeholders. `Alert` and `Notice` translate message keys when they render.
Keep validation and server error state as keys, so switching languages also
updates messages already visible. Do not store already-translated errors.

Keep placeholders such as `{name}` unchanged in every translation. Pass values
separately: `t('Welcome, {name}.', { name })`. Values are inserted literally and
React escapes them; do not concatenate translated sentence fragments.

Only the interface is translated. Customer/supplier names, contact details,
rice/product names, descriptions, notes, and deletion reasons remain as stored.
The built-in expense category names are interface choices and are translated.
No locale change updates database records. Historical automatically generated
notes also remain as stored. Currency stays AFN, weights stay kilograms, and
Business dates can be entered in Gregorian or Solar Hijri in every language. Saved records are displayed only in Solar Hijri. See `docs/calendars.md` for storage and conversion rules.

The default is Dari. The selection is saved in browser storage when available.
Dari and Pashto use RTL; English uses LTR. Runtime settings are in
`src/lib/translations.js`, and the React provider is in `src/providers`.

Run `npm test` after edits. It checks matching keys, placeholders, all database
business errors, units/dates, calculation behavior, and renders all screens in
all three languages. JSON requires double quotes and no trailing commas.
