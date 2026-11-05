import React, { useState } from 'react';
import {
  Calculator,
  Crown,
  FileText,
  Folder,
  Loader2,
  Map,
  Plus,
  Search,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import type { NavSectionId } from '../types/nexcarga';

interface NexIAPanelProps {
  onNavigate: (section: NavSectionId) => void;
  onOpenPublishModal: () => void;
  subscription: {
    planName: string;
    status: string;
    validUntil: string;
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export const NexIAPanel: React.FC<NexIAPanelProps> = ({
  onNavigate,
  onOpenPublishModal,
  subscription,
}) => {
  const [promptInput, setPromptInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sendToNexIA = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setPromptInput('');
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/nexia/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao consultar a NexIA.');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: data.reply,
        },
      ]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha de comunicação com a NexIA.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendToNexIA(promptInput);
  };

  return (
    <aside className="flex flex-col gap-3.5" aria-label="Painel Lateral NexIA e Atalhos">
      {/* 1. NexIA Card */}
      <div className="rounded-2xl bg-[#181818]/95 border border-white/[0.08] p-4 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-12 -left-12 w-36 h-36 rounded-full bg-[#FF8A00]/12 blur-2xl"
        />

        <div className="flex items-center justify-between gap-2.5 mb-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3a220d] to-[#1f150d] border border-[#FF8A00]/40 flex items-center justify-center shadow-[0_0_20px_rgba(255,138,0,0.25)] shrink-0">
              <Sparkles className="w-5 h-5 text-[#FF8A00]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">NexIA</h2>
              <p className="text-[11px] text-neutral-400">
                Assistente Inteligente da NexCarga
              </p>
            </div>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              aria-label="Limpar conversa NexIA"
              className="text-xs text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-xs font-semibold text-white mb-2 relative z-10">
          Como posso ajudar hoje?
        </p>

        {/* Quick Actions matching reference image */}
        <div className="space-y-1.5 mb-3 relative z-10">
          <button
            type="button"
            onClick={() => sendToNexIA('Buscar fretes ativos na região de Manhuaçu/MG')}
            className="w-full rounded-xl bg-[#222225]/90 hover:bg-[#2a2a2e] border border-white/[0.08] hover:border-[#FF8A00]/40 px-3 py-2 text-left flex items-center gap-2.5 text-xs font-medium text-neutral-200 transition-all cursor-pointer"
          >
            <Search className="w-4 h-4 text-[#FF8A00] shrink-0" />
            <span className="truncate">Buscar fretes na região</span>
          </button>

          <button
            type="button"
            onClick={() => sendToNexIA('Como publicar um frete com alta taxa de aceitação?')}
            className="w-full rounded-xl bg-[#222225]/90 hover:bg-[#2a2a2e] border border-white/[0.08] hover:border-[#FF8A00]/40 px-3 py-2 text-left flex items-center gap-2.5 text-xs font-medium text-neutral-200 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-[#FF8A00] shrink-0" />
            <span className="truncate">Ajudar a publicar um frete</span>
          </button>

          <button
            type="button"
            onClick={() =>
              sendToNexIA('Calcular custo de transporte entre Manhuaçu/MG e Vitória/ES')
            }
            className="w-full rounded-xl bg-[#222225]/90 hover:bg-[#2a2a2e] border border-white/[0.08] hover:border-[#FF8A00]/40 px-3 py-2 text-left flex items-center gap-2.5 text-xs font-medium text-neutral-200 transition-all cursor-pointer"
          >
            <Calculator className="w-4 h-4 text-[#FF8A00] shrink-0" />
            <span className="truncate">Calcular custo de transporte</span>
          </button>
        </div>

        {/* Conversation History Stream */}
        {messages.length > 0 && (
          <div className="mb-2.5 max-h-36 overflow-y-auto rounded-xl bg-[#121214] border border-white/[0.07] p-2.5 space-y-2 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`p-2 rounded-lg whitespace-pre-line ${
                  m.role === 'user'
                    ? 'bg-[#FF8A00]/15 text-amber-100 border border-[#FF8A00]/30 ml-4'
                    : 'bg-[#1f1f23] text-neutral-200 border border-white/5 mr-2'
                }`}
              >
                <span className="block text-[10px] font-semibold text-[#FF8A00] mb-0.5">
                  {m.role === 'user' ? 'Você' : 'NexIA'}
                </span>
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-neutral-400 p-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF8A00]" />
                <span>Consultando base logística NexCarga...</span>
              </div>
            )}
          </div>
        )}

        {errorMsg && <p className="text-[11px] text-red-400 mb-2">{errorMsg}</p>}

        {/* Chat Input Field */}
        <form onSubmit={handleFormSubmit} className="relative flex items-center gap-1.5 z-10">
          <input
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder="Digite sua pergunta..."
            aria-label="Digite sua pergunta para a NexIA"
            className="w-full rounded-xl bg-[#202024] border border-white/[0.09] pl-3 pr-10 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#FF8A00]"
          />
          <button
            type="submit"
            disabled={loading}
            aria-label="Enviar mensagem para NexIA"
            className="absolute right-1.5 w-7 h-7 rounded-lg bg-gradient-to-b from-[#FF981A] to-[#E85D04] hover:from-[#ffa533] hover:to-[#f0640a] text-white flex items-center justify-center shadow-[0_2px_10px_rgba(255,138,0,0.4)] transition-all cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* 2. Acessos rápidos Card */}
      <div className="rounded-2xl bg-[#181818]/95 border border-white/[0.08] p-4">
        <h3 className="text-sm font-bold text-white mb-2.5">Acessos rápidos</h3>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenPublishModal}
            className="rounded-xl bg-[#222225]/90 hover:bg-[#2a2a2e] border border-white/[0.08] hover:border-[#FF8A00]/40 px-2.5 py-2.5 flex items-center gap-1.5 text-[11px] font-medium text-neutral-200 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-[#FF8A00] shrink-0" />
            <span>Publicar Frete</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('radar-nexgrid')}
            className="rounded-xl bg-[#222225]/90 hover:bg-[#2a2a2e] border border-white/[0.08] hover:border-[#FF8A00]/40 px-2.5 py-2.5 flex items-center gap-1.5 text-[11px] font-medium text-neutral-200 transition-all cursor-pointer whitespace-nowrap"
          >
            <Map className="w-3.5 h-3.5 text-[#FF8A00] shrink-0" />
            <span>Radar NEXGRID</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('motor-custos')}
            className="rounded-xl bg-[#222225]/90 hover:bg-[#2a2a2e] border border-white/[0.08] hover:border-[#FF8A00]/40 px-2.5 py-2.5 flex items-center gap-1.5 text-[11px] font-medium text-neutral-200 transition-all cursor-pointer whitespace-nowrap"
          >
            <Calculator className="w-3.5 h-3.5 text-[#FF8A00] shrink-0" />
            <span>Motor de Custos</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('documentos')}
            className="rounded-xl bg-[#222225]/90 hover:bg-[#2a2a2e] border border-white/[0.08] hover:border-[#FF8A00]/40 px-2.5 py-2.5 flex items-center gap-1.5 text-[11px] font-medium text-neutral-200 transition-all cursor-pointer whitespace-nowrap"
          >
            <Folder className="w-3.5 h-3.5 text-[#FF8A00] shrink-0" />
            <span>Documentos</span>
          </button>
        </div>
      </div>

      {/* 3. Plano Profissional Card (Pure Vector Orange Waves — Zero Ghost Text) */}
      <div className="rounded-2xl bg-[#181818] border border-[#FF8A00]/25 p-4 relative overflow-hidden min-h-[112px] flex flex-col justify-between">
        <svg
          viewBox="0 0 380 140"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <defs>
            <linearGradient id="waveGrad1" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E85D04" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#FF8A00" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#FFB703" stopOpacity="0.2" />
            </linearGradient>
            <radialGradient id="cornerGlow" cx="85%" cy="80%" r="60%">
              <stop offset="0%" stopColor="#FF8A00" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#181818" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="380" height="140" fill="url(#cornerGlow)" />
          <path
            d="M -20 135 Q 90 120 185 88 T 395 45 L 395 145 L -20 145 Z"
            fill="url(#waveGrad1)"
            opacity="0.35"
          />
          <path
            d="M -10 138 Q 110 115 205 82 T 390 40"
            stroke="url(#waveGrad1)"
            strokeWidth="2.5"
            fill="none"
          />
          <path
            d="M 20 142 Q 140 122 235 92 T 395 58"
            stroke="#FF8A00"
            strokeOpacity="0.45"
            strokeWidth="1.4"
            fill="none"
          />
        </svg>

        <div className="relative z-10 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[#2c2014] border border-[#FF8A00]/40 flex items-center justify-center shrink-0">
            <Crown className="w-4 h-4 text-[#FF8A00]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-snug">
              {subscription.planName}
            </h3>
            <p className="text-xs text-neutral-300 mt-0.5">
              Ativo até {subscription.validUntil}
            </p>
            <button
              type="button"
              onClick={() => onNavigate('financeiro')}
              className="mt-2 text-xs font-semibold text-[#FF8A00] hover:text-[#ffa73d] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Ver plano</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
