import { useEffect, useState } from 'react';
import { CheckCircle2, ShieldAlert, Users, X } from 'lucide-react';
import { PERSONA_PROFILES } from '../engine/presets.ts';

export type AuthMethod = 'Symulacja logowania · eZUS';

export interface AuthSession {
  loggedIn: boolean;
  method: AuthMethod;
  loginTime: string;
}

interface ZusLoginModalProps {
  isOpen: boolean;
  activePersonaId?: string;
  onClose: () => void;
  onLoginSuccess: (method: AuthMethod, personaId: string) => void;
}

export function ZusLoginModal({
  isOpen,
  activePersonaId,
  onClose,
  onLoginSuccess,
}: ZusLoginModalProps) {
  const [selectedPersonaId, setSelectedPersonaId] = useState(
    activePersonaId || PERSONA_PROFILES[0]!.id
  );

  useEffect(() => {
    if (isOpen && activePersonaId) setSelectedPersonaId(activePersonaId);
  }, [isOpen, activePersonaId]);

  if (!isOpen) return null;

  const handleStartTestCase = () => {
    onLoginSuccess('Symulacja logowania · eZUS', selectedPersonaId);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ezus-login-title"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#DCECE3] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#DCECE3] bg-[#F2FBF6] px-6 py-5">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#DCFCE7] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[#166534]">
              <ShieldAlert className="h-3.5 w-3.5" />
              Symulacja logowania
            </div>
            <h2 id="ezus-login-title" className="font-display text-xl font-extrabold text-[#0F172A]">
              Zaloguj się do eZUS
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC]"
            aria-label="Zamknij okno symulacji logowania"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-xl border border-[#FCD34D] bg-[#FFFBEB] p-4 text-sm leading-relaxed text-[#78350F]">
            To jest symulacja logowania. Aplikacja nie łączy się z eZUS i nie
            pobiera prawdziwych danych. Nie wpisuj tu
            hasła, kodu SMS ani innych danych logowania.
          </div>

          <div className="space-y-2">
            <label
              htmlFor="test-case-select"
              className="flex items-center gap-2 text-sm font-bold text-[#0F172A]"
            >
              <Users className="h-4 w-4 text-[#00703C]" />
              Wybierz przypadek testowy
            </label>
            <select
              id="test-case-select"
              value={selectedPersonaId}
              onChange={(event) => setSelectedPersonaId(event.target.value)}
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-3 text-sm font-semibold text-[#0F172A] focus:border-[#00703C] focus:outline-none focus:ring-2 focus:ring-[#BBF7D0]"
            >
              {PERSONA_PROFILES.map((persona) => (
                <option key={persona.id} value={persona.id}>
                  {persona.label} — {persona.shortRole}
                </option>
              ))}
            </select>
            <p className="text-xs leading-relaxed text-[#64748B]">
              Wybór wypełni aplikację fikcyjnymi danymi. Numery PESEL na
              wydrukach są testowe i nie przechodzą walidacji sumy kontrolnej.
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-[#E2E8F0] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#CBD5E1] bg-white px-4 py-2.5 text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC]"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={handleStartTestCase}
              className="inline-flex items-center gap-2 rounded-xl bg-[#00703C] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#005A30]"
            >
              <CheckCircle2 className="h-4 w-4" />
              Zaloguj się do eZUS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
