import { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export default function Card({ children, className = "" }: CardProps) {
  return <div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`.trim()}>{children}</div>;
}
