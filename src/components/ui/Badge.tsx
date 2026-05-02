type BadgeTone = "weak" | "moderate" | "strong" | "neutral";

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
};

export default function Badge({ label, tone = "neutral" }: BadgeProps) {
  const style = tone === "strong" ? "bg-green-50 text-green-700 border-green-200" : tone === "moderate" ? "bg-amber-50 text-amber-700 border-amber-200" : tone === "weak" ? "bg-red-50 text-red-700 border-red-200" : "bg-slate-50 text-slate-600 border-slate-200";
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${style}`}>{label}</span>;
}
