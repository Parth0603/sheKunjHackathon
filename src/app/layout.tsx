import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Aether Intelligence | Elite Exam Preparation",
  description: "AI-powered Command Center for JEE, NEET, UPSC, and GATE preparation. Adaptive quizzes, deep analytics, and AI tutor.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body suppressHydrationWarning>
        <Providers>
          <div className="app-layout">
            <Sidebar />
            <main className="app-main">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
