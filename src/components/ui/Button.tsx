import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
  className?: string;
};

export default function Button({ children, variant = "primary", className = "", ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50";
  const styles = variant === "primary" ? "bg-[#2563EB] text-white hover:bg-blue-700" : "border border-gray-200 bg-white text-slate-700 hover:bg-slate-50";
  return <button className={`${base} ${styles} ${className}`.trim()} {...props}>{children}</button>;
}
