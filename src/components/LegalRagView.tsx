import { useEffect, useRef, useState } from 'react';
import { BookOpen, Loader2, Send } from 'lucide-react';
import LEGAL_GUIDE_IMAGE from '../assets/images/tab_legal_guide_1795285878177.jpg';
import { useReducedMotion } from 'motion/react';

interface CitationItem {
  article: string;
  topic: string;
  summary: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  citations?: CitationItem[];
}

const SUGGESTED_QUESTIONS = [
  'Czy przy składaniu wniosku ZAM do ZUS muszę dołączyć skrócony odpis aktu urodzenia dziecka?',
  'Mam zaległość 62 zł na B2B w dniu porodu — czy stracę zasiłek macierzyński?',
  'Czym zastąpiono formularze ZUR, ZAO i Z-3b po 24 października 2026 r.?',
  'Jak liczy się dodatkowy urlop dla rodziców wcześniaka urodzonego w 27. tygodniu?',
];

function formatInlineText(line: string) {
  const parts = line.split(
    /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g
  );

  return parts.map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) {
      return (
        <a
          key={index}
          href={link[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#00703C] underline decoration-[#86EFAC] underline-offset-2"
        >
          {link[1]}
        </a>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-[#0F172A]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="rounded bg-[#F1F5F9] px-1 py-0.5 text-[0.9em] text-[#334155]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function AssistantAnswer({ text }: { text: string }) {
  const blocks = text
    .trim()
    .split(/(```[\s\S]*?```)/g)
    .filter(Boolean)
    .flatMap((block) =>
      block.startsWith('```') ? [block] : block.split(/\n\s*\n/).filter(Boolean)
    );
  const cellsInRow = (row: string) =>
    row
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim());

  return (
    <div className="space-y-3">
      {blocks.map((block, blockIndex) => {
        const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
        const heading = lines[0]?.match(/^#{1,3}\s+(.+)$/);
        if (/^---+$/.test(block.trim())) {
          return <hr key={blockIndex} className="border-[#E2E8F0]" />;
        }

        const fencedCode = block.match(/^```[^\n]*\n([\s\S]*?)\n```$/);
        if (fencedCode) {
          return (
            <pre key={blockIndex} className="max-w-full overflow-x-auto rounded-lg bg-[#0F172A] p-3 text-xs leading-relaxed text-[#F8FAFC]">
              <code>{fencedCode[1]}</code>
            </pre>
          );
        }

        if (heading) {
          return (
            <div key={blockIndex} className="space-y-2">
              <h3 className="font-display text-base font-bold text-[#0F172A]">
                {formatInlineText(heading[1]!)}
              </h3>
              {lines.length > 1 && <AssistantAnswer text={lines.slice(1).join('\n')} />}
            </div>
          );
        }

        const isBlockquote = lines.every((line) => /^>\s?/.test(line));
        if (isBlockquote) {
          return (
            <blockquote key={blockIndex} className="space-y-1 border-l-2 border-[#86EFAC] bg-white/70 py-2 pl-3 text-[#475569]">
              {lines.map((line, index) => (
                <p key={index}>{formatInlineText(line.replace(/^>\s?/, ''))}</p>
              ))}
            </blockquote>
          );
        }

        const hasMarkdownTable =
          lines.length >= 2 &&
          lines[0]!.includes('|') &&
          cellsInRow(lines[1]!).every((cell) => /^:?-{3,}:?$/.test(cell));
        if (hasMarkdownTable) {
          const headers = cellsInRow(lines[0]!);
          const rows = lines.slice(2).map(cellsInRow);
          return (
            <div key={blockIndex} className="max-w-full overflow-x-auto rounded-lg border border-[#E2E8F0] bg-white">
              <table className="w-full min-w-[360px] border-collapse text-left text-xs">
                <thead className="bg-[#F1F5F9] text-[#334155]">
                  <tr>
                    {headers.map((cell, index) => (
                      <th key={index} className="border-b border-[#E2E8F0] px-3 py-2 font-bold">
                        {formatInlineText(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="odd:bg-white even:bg-[#F8FAFC]">
                      {headers.map((_, cellIndex) => (
                        <td key={cellIndex} className="border-b border-[#F1F5F9] px-3 py-2 align-top last:border-b-0">
                          {formatInlineText(row[cellIndex] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        const isBulletedList = lines.every((line) => /^[-*]\s+/.test(line));
        if (isBulletedList) {
          return (
            <ul key={blockIndex} className="list-disc space-y-1 pl-5 marker:text-[#00703C]">
              {lines.map((line, index) => (
                <li key={index}>{formatInlineText(line.replace(/^[-*]\s+/, ''))}</li>
              ))}
            </ul>
          );
        }

        const isNumberedList = lines.every((line) => /^\d+[.)]\s+/.test(line));
        if (isNumberedList) {
          return (
            <ol key={blockIndex} className="list-decimal space-y-1 pl-5 marker:font-semibold marker:text-[#00703C]">
              {lines.map((line, index) => (
                <li key={index}>{formatInlineText(line.replace(/^\d+[.)]\s+/, ''))}</li>
              ))}
            </ol>
          );
        }

        return (
          <p key={blockIndex}>
            {lines.map((line, index) => (
              <span key={index}>
                {index > 0 && <br />}
                {formatInlineText(line.replace(/^#{1,3}\s+/, ''))}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export function LegalRagView({ law2027Enabled }: { law2027Enabled: boolean }) {
  const [imgError, setImgError] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Jestem Asystentem Prawa ZUS. Tłumaczę przepisy Kodeksu pracy i Ustawy zasiłkowej na prosty język oraz podaję dokładne podstawy prawne na listopad 2026 r. Zadaj pytanie lub wybierz jeden z tematów obok.',
      citations: [
        {
          article: '§ 13 ust. 2–4 Rozp. z 27.09.2026 r.',
          topic: 'Brak wymogu aktu urodzenia przy wypłacie przez ZUS',
          summary:
            'Gdy płatnikiem zasiłku jest ZUS, wystarczy podać dane i numer PESEL dziecka we wniosku ZAM.',
        },
        {
          article: 'Art. 2a ustawy zasiłkowej',
          topic: 'Próg 1% zadłużenia B2B (48,06 zł)',
          summary:
            'Zaległość przekraczająca 1% płacy minimalnej wstrzymuje powstanie prawa do zasiłku do czasu spłaty (maks. 6 miesięcy).',
        },
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<CitationItem | null>(
    null
  );

  useEffect(() => {
    const chatBody = chatBodyRef.current;
    if (chatBody) {
      chatBody.scrollTo({
        top: chatBody.scrollHeight,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    }
  }, [messages, isLoading, prefersReducedMotion]);

  const sendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isLoading) return;

    setErrorMsg(null);
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/rag-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          law2027Enabled,
          history: nextHistory.map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Błąd komunikacji z Asystentem Prawa.');
      }

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: data.answer,
        citations: Array.isArray(data.citations) ? data.citations : [],
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (assistantMsg.citations && assistantMsg.citations.length > 0) {
        setSelectedCitation(assistantMsg.citations[0]!);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Nie udało się uzyskać odpowiedzi z serwera.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-[#DCECE3] bg-white p-6">
        <div className="grid items-stretch gap-6 lg:grid-cols-12">
          <div className="flex flex-col justify-center space-y-2 lg:col-span-8">
            <h1 className="font-display text-2xl font-bold text-[#0F172A] [text-wrap:balance]">
              Asystent Prawa ZUS (Wyjaśnienia z Podstawą Prawną)
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-[#475569]">
              Rozmowa oparta na aktualnych przepisach Kodeksu pracy, Ustawy zasiłkowej i rozporządzeń 2025/2026. Wyjaśnia zawiłe artykuły prostym językiem — dokładne kwoty wylicza wyłącznie deterministyczny Kalkulator.
            </p>
          </div>
          <div className="lg:col-span-4">
            {!imgError ? (
              <img
                src={LEGAL_GUIDE_IMAGE}
                alt="Pastelowa ilustracja mądrej sowy w okularach z księgą przepisów i filiżanką herbaty rumiankowej"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="h-36 w-full rounded-xl border border-[#DCECE3] object-cover lg:h-full lg:max-h-40"
              />
            ) : (
              <div className="flex h-36 items-center justify-center rounded-xl border border-[#DCECE3] bg-[#F2FBF6] lg:h-full">
                <BookOpen className="h-10 w-10 text-[#00703C]" />
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="rounded-lg border border-[#FCD34D] bg-[#FFFBEB] px-4 py-3 text-xs leading-relaxed text-[#78350F]">
        Jeśli serwer ma skonfigurowany Gemini, Twoje pytanie i kontekst ostatnich wiadomości są wysyłane do tej usługi, aby przygotować odpowiedź. Nie wpisuj danych osobowych ani szczegółów pozwalających zidentyfikować sprawę.
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Chat Column */}
        <section className="lg:col-span-8 flex h-[560px] min-h-[420px] max-h-[72vh] flex-col rounded-2xl border border-[#DCECE3] bg-white">
          <div
            ref={chatBodyRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'rounded-br-md bg-[#00703C] text-white'
                      : 'rounded-bl-md border border-[#E2E8F0] bg-[#F8FAFC] text-[#334155]'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <AssistantAnswer text={msg.text} />
                  ) : (
                    <p className="whitespace-pre-line">{msg.text}</p>
                  )}
                </div>

                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {msg.citations.map((cit, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedCitation(cit)}
                        className="inline-flex items-center gap-1.5 rounded border border-[#CBD5E1] bg-white px-2.5 py-1 text-xs font-semibold text-[#0B5ED7] hover:bg-[#F8FAFC]"
                      >
                        <BookOpen className="h-3 w-3" />
                        {cit.article}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-[#64748B]">
                <Loader2 className="h-4 w-4 animate-spin text-[#00703C]" />
                <span>Analizuję przepisy i przygotowuję odpowiedź...</span>
              </div>
            )}

            {errorMsg && (
              <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs font-medium text-[#991B1B]">
                {errorMsg}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendQuestion(input);
            }}
            className="flex items-center gap-2 border-t border-[#E2E8F0] p-4"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Zadaj pytanie o urlop, ZAM, B2B, 81,5%, wcześniaka lub termin 21 dni..."
              className="flex-1 rounded-lg border border-[#CBD5E1] px-3.5 py-2.5 text-sm text-[#0F172A] focus:border-[#00703C] focus:outline-none"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#00703C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#005A30] disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Zapytaj
            </button>
          </form>
        </section>

        {/* Right Column: Suggested Questions + Citation Reader */}
        <div className="lg:col-span-4 space-y-6">
          <section className="rounded-2xl border border-[#DCECE3] bg-white p-5 space-y-3">
            <h2 className="font-display text-base font-semibold text-[#0F172A]">
              Najczęstsze pytania rodziców
            </h2>
            <div className="space-y-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendQuestion(q)}
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-left text-xs font-medium text-[#334155] transition-colors hover:border-[#00703C] hover:bg-white"
                >
                  {q}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#DCECE3] bg-white p-5 space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#0052a5]" />
              <h2 className="font-display text-base font-semibold text-[#0F172A]">
                Podgląd przepisu prawnego
              </h2>
            </div>

            {selectedCitation ? (
              <div className="space-y-1.5 border-t border-[#E2E8F0] pt-3 text-xs">
                <div className="font-mono font-bold text-[#0052a5]">
                  {selectedCitation.article}
                </div>
                <div className="font-semibold text-[#0F172A]">
                  {selectedCitation.topic}
                </div>
                <p className="leading-relaxed text-[#475569]">
                  {selectedCitation.summary}
                </p>
              </div>
            ) : (
              <p className="border-t border-[#E2E8F0] pt-3 text-xs text-[#64748B]">
                Kliknij dowolny powołany artykuł pod odpowiedzią asystenta, aby wyświetlić jego wyjaśnienie.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
