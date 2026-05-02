"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard",   icon: "dashboard",              label: "Dashboard" },
  { href: "/study-plan",  icon: "calendar_today",         label: "Study Plan" },
  { href: "/learn",       icon: "menu_book",              label: "Subjects" },
  { href: "/notes",       icon: "edit_note",              label: "Notes" },
  { href: "/ai-tutor",    icon: "psychology",             label: "AI Tutor" },
  { href: "/mock-exam",   icon: "assignment_turned_in",   label: "Mock Exams" },
  { href: "/analytics",   icon: "insights",               label: "Analytics" },
  { href: "/leaderboard", icon: "leaderboard",            label: "Leaderboard" },
  { href: "/rewards",     icon: "military_tech",          label: "Rewards" },
];

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Don't show sidebar on landing/auth pages
  if (!session && pathname === "/") return null;

  return (
    <aside className="app-sidebar" id="app-sidebar">
      {/* Brand */}
      <div style={{
        padding: "20px 16px 16px",
        borderBottom: "1px solid var(--outline-variant)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexShrink: 0,
      }}>
        {/* Logo mark */}
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: "linear-gradient(135deg, var(--primary-container), var(--accent-purple))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 0 16px rgba(91,95,251,0.4)",
        }}>
          <span className="material-symbols-rounded" style={{ color: "white", fontSize: 18 }}>
            auto_awesome
          </span>
        </div>
        <div className="sidebar-brand-text" style={{ overflow: "hidden" }}>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 15,
            color: "var(--on-surface)",
            letterSpacing: "-0.01em",
            lineHeight: 1.2,
          }}>
            Aether
          </div>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--primary)",
          }}>
            Intelligence
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "12px 0", overflowY: "auto" }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item${isActive ? " active" : ""}`}
              style={{ textDecoration: "none" }}
            >
              <span className="material-symbols-rounded nav-icon" style={{
                fontSize: 20,
                color: isActive ? "var(--primary)" : "var(--on-surface-variant)",
              }}>
                {item.icon}
              </span>
              <span className="nav-label" style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      {session && (
        <div style={{
          padding: "12px 8px",
          borderTop: "1px solid var(--outline-variant)",
          flexShrink: 0,
        }}>
          <Link href="/profile" style={{ textDecoration: "none" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px",
              borderRadius: 8,
              cursor: "pointer",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-container-high)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {session.user?.image ? (
                <div style={{ position: "relative", width: 32, height: 32, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
                  <Image src={session.user.image} alt="Avatar" fill style={{ objectFit: "cover" }} />
                </div>
              ) : (
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--primary-container), var(--accent-purple))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 13, fontWeight: 700,
                  color: "var(--on-primary-container)",
                  flexShrink: 0,
                }}>
                  {session.user?.name?.charAt(0) ?? "U"}
                </div>
              )}
              <div className="sidebar-user-name" style={{ overflow: "hidden", flex: 1 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600,
                  color: "var(--on-surface)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {session.user?.name?.split(" ")[0]}
                </div>
                <div style={{
                  fontSize: 11,
                  color: "var(--primary)",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                }}>
                  Elite Lv. IV
                </div>
              </div>
            </div>
          </Link>

          {/* Sign out */}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            style={{
              width: "100%",
              marginTop: 4,
              padding: "6px 8px",
              background: "transparent",
              border: "none",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--on-surface-variant)",
              fontSize: 12,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface-container-high)";
              e.currentTarget.style.color = "var(--error)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--on-surface-variant)";
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>logout</span>
            <span className="sidebar-user-name">Sign out</span>
          </button>
        </div>
      )}
    </aside>
  );
}
