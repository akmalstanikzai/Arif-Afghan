import Brand from '../../../components/ui/Brand';

export default function LoginBrandPanel() {
  return (
    <section className="relative flex flex-col overflow-hidden bg-brand p-7 text-[#f6f3df] sm:min-h-svh sm:p-9 lg:px-16 lg:pt-12 lg:pb-8" aria-label="Rice Factory">
      <Brand />
      <div className="relative z-10 my-auto pt-10 pb-3 sm:pt-20 sm:pb-40">
        <span className="text-[10px] font-bold tracking-[2px] text-brand-gold">FROM GRAIN TO GROWTH</span>
        <h1 className="my-5 font-display text-[39px] leading-[1.08] tracking-[-2px] sm:text-[50px] lg:text-[clamp(48px,5vw,78px)]">
          Good things<br className="hidden sm:block" /> start with<br className="hidden sm:block" /> <em className="block font-normal text-brand-gold">a single grain.</em>
        </h1>
        <p className="hidden max-w-80 text-sm leading-[1.9] text-[#becac0] sm:block">A dedicated space for the people behind every harvest. Welcome to your factory workspace.</p>
      </div>
      <div className="absolute -right-9 bottom-20 h-64 w-60 rotate-[28deg] border-l border-brand-gold opacity-20 max-sm:-right-16 max-sm:-bottom-36" aria-hidden="true">
        {['top-0 left-0', 'top-16 left-0', 'top-32 left-0', 'top-10 -left-[68px] -scale-x-100', 'top-28 -left-[68px] -scale-x-100', 'top-44 -left-[68px] -scale-x-100'].map(position => (
          <i key={position} className={`absolute h-28 w-16 rounded-[100%_0_100%_0] border border-brand-gold ${position}`} />
        ))}
      </div>
      <div className="relative z-10 hidden gap-2 text-[10px] tracking-wider text-[#bdc8bd] sm:flex sm:flex-col lg:flex-row lg:justify-between">
        <span>Rooted in quality.</span><span>Built for every day.</span>
      </div>
    </section>
  );
}
