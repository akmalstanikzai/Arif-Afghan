export default function Alert({ children }) {
  if (!children) return null;
  return <p className="my-4 rounded-lg bg-[#fbeee9] p-3.5 text-xs leading-relaxed text-[#913d30]" role="alert">{children}</p>;
}
