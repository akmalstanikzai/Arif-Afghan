export default function PageHeading({ eyebrow, title, children }) {
  return (
    <div className="mb-7 flex items-start justify-between gap-5 md:items-center">
      <div>
        <span className="text-[9px] font-bold tracking-[1.5px] text-[#84917c]">{eyebrow}</span>
        <h1 className="mt-2 text-[28px] font-medium tracking-tight">{title}</h1>
      </div>
      {children}
    </div>
  );
}
