"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.push("/dashboard");
  }, [status, router]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--background)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
      marginLeft: 0, // No sidebar on landing
    }}>
      {/* Ambient glow blobs */}
      <div style={{
        position: "absolute",
        width: 600,
        height: 600,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(91,95,251,0.12) 0%, transparent 70%)",
        top: "10%",
        left: "20%",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute",
        width: 400,
        height: 400,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)",
        bottom: "10%",
        right: "20%",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute",
        width: 300,
        height: 300,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(34,199,240,0.06) 0%, transparent 70%)",
        top: "40%",
        right: "10%",
        pointerEvents: "none",
      }} />

      {/* Content */}
      <div style={{
        position: "relative",
        zIndex: 1,
        textAlign: "center",
        maxWidth: 680,
        padding: "0 32px",
        animation: "fadeIn 0.6s ease forwards",
      }}>
        {/* Brand mark */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 40 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "linear-gradient(135deg, var(--primary-container), var(--accent-purple))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 32px rgba(91,95,251,0.5)",
          }}>
            <span className="material-symbols-rounded" style={{ color: "white", fontSize: 26 }}>
              auto_awesome
            </span>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 22,
              color: "var(--on-surface)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}>
              Aether Intelligence
            </div>
            <div className="text-label-caps" style={{ color: "var(--primary)", marginTop: 2 }}>
              Elite Exam Preparation
            </div>
          </div>
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "clamp(36px, 6vw, 56px)",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          lineHeight: 1.05,
          color: "var(--on-surface)",
          marginBottom: 20,
        }}>
          Your Cognitive{" "}
          <span style={{
            background: "linear-gradient(135deg, var(--primary), var(--accent-cyan))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Command Center
          </span>
        </h1>

        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 18,
          lineHeight: 1.6,
          color: "var(--on-surface-variant)",
          marginBottom: 40,
          maxWidth: 520,
          margin: "0 auto 40px",
        }}>
          AI-powered adaptive preparation for JEE, NEET, UPSC & GATE.
          Precision-engineered for high-achievers who demand more.
        </p>

        {/* Feature chips */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "center",
          marginBottom: 44,
        }}>
          {[
            { icon: "psychology", label: "AI Tutor" },
            { icon: "insights", label: "Deep Analytics" },
            { icon: "assignment_turned_in", label: "Mock Exams" },
            { icon: "leaderboard", label: "Leaderboard" },
            { icon: "auto_awesome", label: "Adaptive Quizzes" },
          ].map((feat) => (
            <div key={feat.label} className="badge badge-surface" style={{ padding: "6px 14px", gap: 6 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 14 }}>{feat.icon}</span>
              {feat.label}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          {status === "unauthenticated" && (
            <button
              id="google-signin-btn"
              className="btn btn-primary"
              onClick={() => signIn("google")}
              style={{ padding: "14px 32px", fontSize: 15, gap: 10 }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 20 }}>login</span>
              Continue with Google
            </button>
          )}
          {status === "loading" && (
            <div className="badge badge-surface" style={{ padding: "12px 24px" }}>
              <span className="material-symbols-rounded" style={{ fontSize: 16, animation: "spin 1s linear infinite" }}>
                progress_activity
              </span>
              Initializing...
            </div>
          )}
          <p style={{ fontSize: 12, color: "var(--outline)", fontFamily: "'Inter', sans-serif" }}>
            Free to use · No credit card required
          </p>
        </div>
      </div>

      {/* Bottom grid decoration */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 200,
        background: "linear-gradient(to top, rgba(91,95,251,0.04) 0%, transparent 100%)",
        pointerEvents: "none",
        backgroundImage: `
          linear-gradient(var(--outline-variant) 1px, transparent 1px),
          linear-gradient(90deg, var(--outline-variant) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
        opacity: 0.3,
        maskImage: "linear-gradient(to top, black 0%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to top, black 0%, transparent 100%)",
      }} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .app-sidebar { display: none !important; }
        .app-main { margin-left: 0 !important; }
      `}</style>
    </div>
  );
}
