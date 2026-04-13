"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Sparkles,
  Building2,
  Users,
  Globe,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  ClipboardList,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";

const STEPS = [
  { id: "agency", label: "Tu agencia", icon: Building2 },
  { id: "connect", label: "Conectar productos", icon: Zap },
  { id: "memory", label: "Memoria inicial", icon: Sparkles },
  { id: "done", label: "¡Listo!", icon: CheckCircle2 },
];

export default function OnboardingPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [step, setStep] = useState(0);

  // Step 0: Agency info
  const [orgName, setOrgName] = useState("");
  const [clientName, setClientName] = useState("");
  const [description, setDescription] = useState("");

  // Step 1: Connect products
  const [isytaskId, setIsytaskId] = useState("");
  const [isysocialId, setIsysocialId] = useState("");

  // Step 2: Memory seeding
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");

  const completeMutation = trpc.onboarding.complete.useMutation({
    onSuccess: () => {
      utils.invalidate();
    },
  });

  const updateAgencyIds = trpc.onboarding.updateAgencyIds.useMutation();

  const [isFinishing, setIsFinishing] = useState(false);

  const handleNext = async () => {
    if (step === 0 && !orgName.trim()) return;
    setStep((s) => s + 1);
  };

  const handleFinish = async () => {
    setIsFinishing(true);
    try {
      // Complete onboarding with org info
      await completeMutation.mutateAsync({
        organizationName: orgName,
        clientName: clientName || undefined,
        description: description || undefined,
        websiteUrl: websiteUrl || undefined,
        instagramHandle: instagramHandle || undefined,
      });

      // Save agency IDs if provided
      if (isytaskId || isysocialId) {
        await updateAgencyIds.mutateAsync({
          isytaskAgencyId: isytaskId || undefined,
          isysocialAgencyId: isysocialId || undefined,
        });
      }

      setStep(3); // Done
    } catch (err) {
      console.error(err);
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-start justify-center pt-10 pb-20 px-4">
      <div className="w-full max-w-xl">
        {/* Logo + title */}
        <div className="flex flex-col items-center mb-8">
          <Image src="/icon-color.svg" alt="IsyAgent" width={48} height={48} className="mb-3" />
          <h1 className="text-2xl font-bold">Configura IsyAgent</h1>
          <p className="text-sm text-muted-foreground mt-1">Solo toma 2 minutos</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isDone = i < step;
            const isCurrent = i === step;
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    isDone
                      ? "bg-brand-600 text-white"
                      : isCurrent
                      ? "bg-brand-100 text-brand-700 ring-2 ring-brand-400"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 w-8 transition-colors ${isDone ? "bg-brand-400" : "bg-gray-200"}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Step 0: Agency info ── */}
        {step === 0 && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
                  <Building2 className="h-5 w-5 text-brand-600" />
                  Cuéntame sobre tu agencia
                </h2>
                <p className="text-sm text-muted-foreground">
                  El agente usará esta información para presentarse y contextualizarse.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Nombre de la agencia *</label>
                <input
                  autoFocus
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Brandot, Mi Agencia Digital, etc."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Primer cliente <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nombre del cliente principal"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Descripción del negocio <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="¿A qué se dedica tu agencia? ¿Cuál es tu especialidad?"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
                />
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleNext}
                disabled={!orgName.trim()}
              >
                Siguiente
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Step 1: Connect products ── */}
        {step === 1 && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
                  <Zap className="h-5 w-5 text-brand-600" />
                  Conecta IsyTask e IsySocial
                </h2>
                <p className="text-sm text-muted-foreground">
                  Esto permite al agente crear tareas y posts directamente.
                  Puedes configurarlo después en Habilidades.
                </p>
              </div>

              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
                <strong>¿Cómo encontrar el Agency ID?</strong><br />
                IsyTask → Configuración → Agencia → copiar el ID<br />
                IsySocial → Configuración → Agencia → copiar el ID
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                  <ClipboardList className="h-4 w-4 text-blue-600" />
                  IsyTask Agency ID
                  <Badge variant="outline" className="text-[10px] ml-1">opcional</Badge>
                </label>
                <input
                  value={isytaskId}
                  onChange={(e) => setIsytaskId(e.target.value)}
                  placeholder="cmmkplwq70001npm7x2t66sko"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  IsySocial Agency ID
                  <Badge variant="outline" className="text-[10px] ml-1">opcional</Badge>
                </label>
                <input
                  value={isysocialId}
                  onChange={(e) => setIsysocialId(e.target.value)}
                  placeholder="cmn0v0orf000111vu1fzced94"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="gap-1" onClick={() => setStep(0)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button className="flex-1 gap-2" onClick={handleNext}>
                  Siguiente
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Memory seeding ── */}
        {step === 2 && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
                  <Sparkles className="h-5 w-5 text-brand-600" />
                  Dale memoria a tu agente
                </h2>
                <p className="text-sm text-muted-foreground">
                  El agente aprenderá de estas fuentes para responder mejor.
                  Puedes agregar más desde la página de Memoria.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-green-600" />
                  Sitio web de la agencia
                  <Badge variant="outline" className="text-[10px] ml-1">opcional</Badge>
                </label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://miagencia.com"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-pink-600" />
                  Instagram de la agencia
                  <Badge variant="outline" className="text-[10px] ml-1">opcional</Badge>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                  <input
                    value={instagramHandle}
                    onChange={(e) => setInstagramHandle(e.target.value)}
                    placeholder="miagencia"
                    className="w-full rounded-lg border border-input bg-background pl-7 pr-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="gap-1" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleFinish}
                  disabled={isFinishing}
                >
                  {isFinishing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Configurando...
                    </>
                  ) : (
                    <>
                      Finalizar setup
                      <CheckCircle2 className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 3: Done ── */}
        {step === 3 && (
          <Card className="text-center">
            <CardContent className="p-8 space-y-4">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold">¡IsyAgent está listo!</h2>
              <p className="text-muted-foreground text-sm">
                Tu agente ya conoce tu agencia y está listo para ayudarte.
                Comienza chateando o revisa las decisiones pendientes.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => router.push("/decisions")}
                >
                  <ClipboardList className="h-4 w-4" />
                  Decisiones
                </Button>
                <Button
                  className="gap-2"
                  onClick={() => router.push("/chat")}
                >
                  <Sparkles className="h-4 w-4" />
                  Chatear
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => router.push("/memory")}
              >
                Ver mi memoria →
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
