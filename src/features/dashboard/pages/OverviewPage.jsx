import Icon from '../../../components/ui/Icon';
import PageHeading from '../../../components/ui/PageHeading';
import { getUserDisplayName } from '../../../lib/user';

export default function OverviewPage({ user, onViewAccount }) {
  const name = getUserDisplayName(user);
  const today = new Date();
  const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <>
      <PageHeading eyebrow="YOUR WORKSPACE AT A GLANCE" title="Overview">
        <time className="max-w-28 text-right text-[11px] leading-relaxed text-[#7e8877] md:max-w-none" dateTime={localDate}>{today.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</time>
      </PageHeading>
      <section className="flex items-center justify-between gap-5 rounded-2xl border border-[#dee5d2] bg-[#e9eedf] p-7 lg:p-10">
        <div className="min-w-0">
          <span className="flex items-center gap-2 text-[9px] tracking-[1.6px] text-[#59704c]"><span className="size-1 rounded-full bg-[#6c8853]" /> YOU’RE ALL SET</span>
          <h2 className="mt-5 mb-3 font-display text-[clamp(30px,3vw,44px)] tracking-tight wrap-anywhere">Welcome, {name}.</h2>
          <p className="max-w-[430px] text-[13px] leading-[1.9] text-[#708064]">It’s good to have you here. This is your space to keep your factory’s day moving.</p>
          <span className="mt-6 block text-[10px] text-[#7b886c]">Rooted in quality. Ready for what’s next.</span>
        </div>
        <div className="hidden size-25 shrink-0 place-items-center rounded-full border border-[#d1dbbf] text-[#8c9e6f] md:grid lg:size-39" aria-hidden="true"><Icon name="leaf" className="size-19 lg:size-30" /></div>
      </section>
      <section className="mt-6 rounded-xl border border-line bg-white px-6 py-11 text-center">
        <span className="mx-auto mb-5 grid size-13 place-items-center rounded-xl bg-[#f2f5ec] text-[#7b916b]"><Icon name="home" width="25" height="25" /></span>
        <h2 className="mb-3 text-[17px] font-medium">A fresh start for your factory.</h2>
        <p className="mx-auto max-w-[390px] text-xs leading-[1.9] text-[#90988b]">Your dashboard is ready. As factory features are added, your operations and updates will appear here.</p>
        <button className="mt-6 cursor-pointer rounded-md border border-[#dce3d4] px-4 py-2.5 text-[11px] text-[#4b6640] hover:bg-[#f2f5ec]" onClick={onViewAccount}>View my account <span className="ml-3.5" aria-hidden="true">→</span></button>
      </section>
      <footer className="mt-7 flex justify-between gap-4 text-[10px] text-[#9aa191]">Rice Factory <span>Your everyday workspace.</span></footer>
    </>
  );
}
