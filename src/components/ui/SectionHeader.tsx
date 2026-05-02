import { ReactNode } from "react";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
};

export default function SectionHeader({ title, subtitle, right }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}
