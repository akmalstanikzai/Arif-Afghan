import PageHeading from '../../../components/ui/PageHeading';
import { getUserDisplayName } from '../../../lib/user';

export default function AccountPage({ user }) {
  const name = getUserDisplayName(user);
  const details = [
    { label: 'Email address', value: user.email || 'Not provided' },
    { label: 'Account created', value: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Not available' },
  ];

  return (
    <>
      <PageHeading eyebrow="YOUR WORKSPACE PROFILE" title="My account" />
      <section className="max-w-[680px] rounded-xl border border-line bg-white p-8">
        <span className="mb-5 grid size-14 place-items-center rounded-full bg-[#e9eedf] text-[22px] font-semibold text-[#59704c]">{name.charAt(0).toUpperCase()}</span>
        <h2 className="text-[22px] font-semibold wrap-anywhere">{name}</h2>
        <p className="mt-3 text-[13px] leading-relaxed text-[#7e8877]">Your signed-in account details.</p>
        <dl className="mt-8">
          {details.map(detail => <div key={detail.label} className="border-t border-line py-4"><dt className="mb-2 text-[11px] text-[#7e8877]">{detail.label}</dt><dd className="wrap-anywhere">{detail.value}</dd></div>)}
        </dl>
        <p className="mt-6 text-xs leading-relaxed text-[#7e8877]">For account changes or password help, contact your factory administrator.</p>
      </section>
    </>
  );
}
