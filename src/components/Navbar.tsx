"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/ui/Button";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2563EB] text-sm font-black text-white">A</div>
          <span className="text-lg font-bold text-slate-900">StudyAI</span>
        </Link>

        <div className="flex items-center gap-3">
          {session ? (
            <>
              <Link href="/learn" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                Learn
              </Link>
              <Link href="/dashboard" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                Dashboard
              </Link>
              {session.user?.image ? (
                <div className="relative h-9 w-9 overflow-hidden rounded-full border border-gray-200">
                  <Image src={session.user.image} alt="Avatar" fill className="object-cover" />
                </div>
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  {session.user?.name?.charAt(0)}
                </div>
              )}
              <Button variant="secondary" onClick={() => signOut({ callbackUrl: "/" })}>Logout</Button>
            </>
          ) : (
            <Button onClick={() => (window.location.href = "/")}>Sign In</Button>
          )}
        </div>
      </div>
    </nav>
  );
}
