import type { OfficialFormSpec } from '../utils/officialForms.ts';

export function PrintableFormSheet({
  spec,
  yearLabel,
  variant = 'print',
}: {
  spec: OfficialFormSpec;
  yearLabel: string;
  variant?: 'print' | 'preview';
}) {
  const today = new Date().toLocaleDateString('pl-PL');

  return (
    <article
      className={
        variant === 'preview'
          ? 'form-preview-sheet rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-lg sm:p-7'
          : 'print-only-sheet'
      }
      aria-label={`Projekt wniosku ${spec.symbol}`}
    >
      <div className="mb-3 border-2 border-red-300 bg-red-50 px-3 py-2 text-center text-[9pt] font-extrabold text-red-900">
        PROJEKT TESTOWY — NIE JEST OFICJALNYM FORMULARZEM ZUS. NIE SKŁADAJ.
        <br />
        Numery PESEL są fikcyjne i nie przechodzą walidacji.
      </div>
      <table className="w-full border-collapse border border-black text-left">
        <tbody>
          <tr>
            <td className="w-28 border border-black bg-[#F1F5F9] p-2 align-top">
              <div className="text-[8pt] font-bold uppercase">Symbol druku</div>
              <div className="mt-1 text-[13pt] font-extrabold">{spec.symbol}</div>
              <div className="mt-0.5 text-[7.5pt]">ZUS / PUE (eZUS)</div>
            </td>
            <td className="border border-black p-2 align-top">
              <div className="text-[8pt] font-bold uppercase">{spec.issuerHeader}</div>
              <div className="mt-0.5 text-[11pt] font-extrabold">{spec.title}</div>
              <div className="mt-1 text-[7.5pt] leading-snug">{spec.legalBasis}</div>
            </td>
            <td className="w-36 border border-black bg-[#FAFAFA] p-2 align-top text-center">
              <div className="text-[7.5pt] font-bold uppercase">{spec.receiptBoxLabel}</div>
              <div className="mt-5 text-[8pt]">.............................</div>
              <div className="mt-2 text-[7.5pt]">Sporządzono: {today}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mt-2 border border-black bg-[#F8FAFC] p-2 text-[8pt] font-bold">
        {spec.fillingInstruction}
      </div>

      {spec.sections.map((sec) => (
        <section key={`${sec.number}-${sec.title}`} className="mt-3 break-inside-avoid">
          <h2 className="mb-1 text-[9.5pt] font-extrabold uppercase">
            {sec.number}. {sec.title}
          </h2>

          {sec.paragraphs?.map((p, idx) => (
            <p key={idx} className="mb-1 text-[8.5pt]">
              {p}
            </p>
          ))}

          {sec.rows && sec.rows.length > 0 && (
            <table className="w-full border-collapse border border-black text-[8.5pt]">
              <tbody>
                {sec.rows.map((r, idx) => (
                  <tr key={idx}>
                    <td className="w-1/3 border border-black bg-[#F8FAFC] p-1.5 font-bold align-top">
                      {r.label}
                    </td>
                    <td className="border border-black p-1.5 whitespace-pre-line align-top">
                      {r.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {sec.checkboxes && sec.checkboxes.length > 0 && (
            <div className="mt-1 border border-black p-2 text-[8.5pt] space-y-1">
              {sec.checkboxes.map((cb, idx) => (
                <div key={idx}>
                  <span className="font-mono font-bold">{cb.checked ? '[X]' : '[ ]'}</span>{' '}
                  {cb.text}
                </div>
              ))}
            </div>
          )}

          {sec.table && (
            <table className="mt-1 w-full border-collapse border border-black text-[8pt]">
              <thead>
                <tr>
                  {sec.table.headers.map((h, i) => (
                    <th key={i} className="border border-black bg-[#F1F5F9] p-1.5 text-left font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sec.table.rows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="border border-black p-1.5">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}

      {spec.attachments.length > 0 && (
        <section className="mt-3 break-inside-avoid">
          <h2 className="mb-1 text-[9.5pt] font-extrabold uppercase">ZAŁĄCZNIKI DO WNIOSKU</h2>
          <div className="border border-black p-2 text-[8pt] space-y-1">
            {spec.attachments.map((att, idx) => (
              <div key={idx}>
                <span className="font-mono font-bold">{att.checked ? '[X]' : '[ ]'}</span>{' '}
                {att.text}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-3 break-inside-avoid">
        <h2 className="mb-1 text-[9.5pt] font-extrabold uppercase">
          POUCZENIE I OŚWIADCZENIE O PRAWDZIWOŚCI DANYCH
        </h2>
        <div className="space-y-1 text-[8pt]">
          {spec.legalNotice.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-6 break-inside-avoid text-center text-[8pt]">
        <div className="border border-black p-3 pt-8">
          <div className="border-t border-dotted border-black pt-1">{spec.signatureLeftLabel}</div>
        </div>
        <div className="border border-black p-3 pt-8">
          <div className="border-t border-dotted border-black pt-1">{spec.signatureRightLabel}</div>
        </div>
      </div>

      <footer className="mt-3 text-[7.5pt] text-[#334155]">
        {spec.symbol} · Projekt testowy · stan prawny {yearLabel}
      </footer>
    </article>
  );
}
