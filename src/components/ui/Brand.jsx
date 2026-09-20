export default function Brand({ workspace = false }) {
  return (
    <a className="flex items-center gap-3 text-xs font-bold tracking-[2px] text-inherit no-underline" href="/" aria-label="Rice Factory home">
      <span className="text-[38px] leading-none text-brand-gold" aria-hidden="true">✳</span>
      <span>RICE FACTORY{workspace && <small className="mt-1.5 block text-[8px] font-normal tracking-[1.7px] text-[#9eb3a6]">TEAM WORKSPACE</small>}</span>
    </a>
  );
}
