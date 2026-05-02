type ProgressBarProps = {
  value: number;
  tone?: "weak" | "moderate" | "strong";
};

export default function ProgressBar({ value, tone = "moderate" }: ProgressBarProps) {
  const fill = tone === "strong" ? "bg-[#22C55E]" : tone === "moderate" ? "bg-[#F59E0B]" : "bg-[#EF4444]";
  return (
    <div className="h-2 w-full rounded-full bg-slate-200">
      <div className={`h-full rounded-full ${fill}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
