"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  Inbox,
  MessageSquare,
  Brain,
  Zap,
  BarChart3,
  LogOut,
  Bell,
  Check,
  Users,
  LayoutDashboard,
  Users2,
  FileText,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Panel de control",
  },
  {
    label: "Decisiones",
    href: "/decisions",
    icon: Inbox,
    description: "Tu bandeja de entrada",
  },
  {
    label: "Chat",
    href: "/chat",
    icon: MessageSquare,
    description: "Conversa con el agente",
  },
  {
    label: "Clientes",
    href: "/clients",
    icon: Users2,
    description: "Perfiles de clientes",
  },
  {
    label: "Planificador",
    href: "/planner",
    icon: Brain,
    description: "Agente multi-paso con Opus",
  },
  {
    label: "Reportes",
    href: "/reports",
    icon: FileText,
    description: "Informes semanales automáticos",
  },
  {
    label: "Memoria",
    href: "/memory",
    icon: Brain,
    description: "Lo que sabe tu agente",
  },
  {
    label: "Habilidades",
    href: "/settings",
    icon: Zap,
    description: "Configura skills y autonomía",
  },
  {
    label: "Uso LLM",
    href: "/usage",
    icon: BarChart3,
    description: "Consumo de tokens y costos",
  },
  {
    label: "Equipo",
    href: "/team",
    icon: Users,
    description: "Miembros de la organización",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [showNotifs, setShowNotifs] = useState(false);

  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 15000, // Poll every 15s
  });
  const { data: notifications } = trpc.notifications.list.useQuery(
    { limit: 10 },
    { enabled: showNotifs }
  );
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });
  const utils = trpc.useUtils();

  const user = session?.user;
  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b px-4 py-4">
        <Image
          src="/icon-color.svg"
          alt="IsyAgent"
          width={32}
          height={32}
          className="rounded-lg"
        />
        <span className="text-lg font-bold tracking-tight">IsyAgent</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive && "text-brand-600")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Notifications */}
      <div className="px-3 pb-2">
        <button
          onClick={() => setShowNotifs(!showNotifs)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors relative"
        >
          <Bell className="h-4 w-4" />
          Notificaciones
          {(unreadCount ?? 0) > 0 && (
            <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>
        {showNotifs && (
          <div className="mt-1 rounded-lg border bg-popover shadow-lg max-h-64 overflow-y-auto">
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <span className="text-xs font-semibold text-muted-foreground">Notificaciones</span>
              {(unreadCount ?? 0) > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-xs text-brand-600 hover:underline flex items-center gap-1"
                >
                  <Check className="h-3 w-3" />
                  Marcar todas
                </button>
              )}
            </div>
            {notifications && notifications.length > 0 ? (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "px-3 py-2 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors",
                    !n.isRead && "bg-brand-50/50"
                  )}
                  onClick={() => {
                    if (!n.isRead) markRead.mutate({ id: n.id });
                  }}
                >
                  <p className={cn("text-xs", !n.isRead && "font-semibold")}>{n.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                Sin notificaciones
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer — user info */}
      <div className="border-t px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-brand-700">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.organizationName ?? "Cargando..."}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.name ?? ""}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex-shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
