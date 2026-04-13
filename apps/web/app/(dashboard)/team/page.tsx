"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  Plus,
  Crown,
  Shield,
  User,
  Eye,
  Trash2,
  Loader2,
  X,
  UserPlus,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Crown; color: string }> = {
  OWNER: { label: "Propietario", icon: Crown, color: "bg-amber-100 text-amber-800" },
  ADMIN: { label: "Admin", icon: Shield, color: "bg-blue-100 text-blue-800" },
  MEMBER: { label: "Miembro", icon: User, color: "bg-green-100 text-green-800" },
  VIEWER: { label: "Visor", icon: Eye, color: "bg-gray-100 text-gray-700" },
};

export default function TeamPage() {
  const utils = trpc.useUtils();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER" | "VIEWER">("MEMBER");

  const { data: members, isLoading } = trpc.team.list.useQuery();

  const inviteMutation = trpc.team.invite.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate();
      setShowInvite(false);
      setInviteEmail("");
    },
  });

  const updateRoleMutation = trpc.team.updateRole.useMutation({
    onSuccess: () => utils.team.list.invalidate(),
  });

  const removeMutation = trpc.team.remove.useMutation({
    onSuccess: () => utils.team.list.invalidate(),
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-brand-600" />
            Equipo
          </h1>
          <p className="text-muted-foreground mt-1">
            {members?.length ?? 0} miembros en tu organización
          </p>
        </div>
        <Button className="gap-1" onClick={() => setShowInvite(!showInvite)}>
          <UserPlus className="h-4 w-4" />
          Invitar
        </Button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <Card className="mb-6">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Plus className="h-4 w-4 text-brand-600" />
              Invitar miembro
            </h3>
            <input
              type="email"
              placeholder="email@ejemplo.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              {(["MEMBER", "ADMIN", "VIEWER"] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setInviteRole(role)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    inviteRole === role
                      ? "bg-brand-50 border-brand-300 text-brand-700"
                      : "bg-background border-input text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {ROLE_CONFIG[role].label}
                </button>
              ))}
            </div>
            {inviteMutation.error && (
              <p className="text-sm text-red-600">{inviteMutation.error.message}</p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => inviteMutation.mutate({ email: inviteEmail, role: inviteRole })}
                disabled={!inviteEmail.includes("@") || inviteMutation.isLoading}
              >
                {inviteMutation.isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <UserPlus className="h-3.5 w-3.5 mr-1" />
                )}
                Invitar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowInvite(false)}>
                <X className="h-3.5 w-3.5 mr-1" />
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members list */}
      <div className="space-y-3">
        {members?.map((member) => {
          const roleConfig = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.MEMBER;
          const RoleIcon = roleConfig.icon;
          const isOwner = member.role === "OWNER";

          return (
            <Card key={member.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-brand-700">
                      {member.user.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2) ?? "?"}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{member.user.name}</p>
                      {!member.user.isActive && (
                        <Badge variant="outline" className="text-[10px]">Invitación pendiente</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{member.user.email}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className={roleConfig.color}>
                      <RoleIcon className="h-3 w-3 mr-1" />
                      {roleConfig.label}
                    </Badge>

                    {!isOwner && (
                      <>
                        <select
                          className="text-xs border rounded px-2 py-1 bg-background"
                          value={member.role}
                          onChange={(e) =>
                            updateRoleMutation.mutate({
                              userId: member.user.id,
                              role: e.target.value as any,
                            })
                          }
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="MEMBER">Miembro</option>
                          <option value="VIEWER">Visor</option>
                        </select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeMutation.mutate({ userId: member.user.id })}
                          disabled={removeMutation.isLoading}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(!members || members.length === 0) && (
        <Card className="p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-medium">Sin miembros</p>
        </Card>
      )}
    </div>
  );
}
