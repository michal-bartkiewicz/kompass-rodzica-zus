import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import type {
  CalculationResult,
  LegislativeParams,
  ParentInput,
  PersonaProfile,
  ScenarioConfig,
} from '../engine/types.ts';
import {
  buildOfficialFormSpec,
  type OfficialFormKind,
} from './officialForms.ts';

let fontsInitialized = false;

function ensurePdfFonts(): void {
  if (fontsInitialized) return;
  pdfMake.addVirtualFileSystem(pdfFonts as unknown as Record<string, string>);
  pdfMake.addFonts({
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf',
    },
  });
  fontsInitialized = true;
}

export interface OfficialPdfPayload {
  persona: PersonaProfile;
  mom: ParentInput;
  dad: ParentInput;
  scenario: ScenarioConfig;
  params: LegislativeParams;
  result: CalculationResult;
  forceForm?: OfficialFormKind;
}

/**
 * Tworzy demonstracyjny projekt dokumentu PDF na podstawie danych kalkulatora.
 * Nie jest to oficjalny formularz ZUS ani dokument do złożenia.
 */
export function downloadOfficialZusPdf(payload: OfficialPdfPayload): void {
  ensurePdfFonts();

  const spec = buildOfficialFormSpec({
    persona: payload.persona,
    mom: payload.mom,
    dad: payload.dad,
    scenario: payload.scenario,
    params: payload.params,
    result: payload.result,
    requestedKind: payload.forceForm,
  });

  const today = new Date().toLocaleDateString('pl-PL');
  const content: Content[] = [];

  content.push({
    table: {
      widths: ['*'],
      body: [[{
        text: 'PROJEKT DEMONSTRACYJNY — NIE JEST OFICJALNYM FORMULARZEM ZUS. NIE SKŁADAJ.',
        bold: true,
        fontSize: 9,
        color: '#7F1D1D',
        fillColor: '#FEF2F2',
        alignment: 'center',
        margin: [6, 6, 6, 6],
      }]],
    },
    layout: {
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      hLineColor: () => '#FCA5A5',
      vLineColor: () => '#FCA5A5',
    },
    margin: [0, 0, 0, 8],
  });

  // Urzędowy nagłówek formularza (czarno-biały, formalny układ tabelaryczny)
  content.push({
    table: {
      widths: [108, '*', 130],
      body: [
        [
          {
            stack: [
              { text: 'SYMBOL DRUKU', fontSize: 6.5, bold: true, color: '#334155' },
              {
                text: spec.symbol,
                fontSize: 13,
                bold: true,
                color: '#000000',
                margin: [0, 3, 0, 2],
              },
              { text: 'ZUS / PUE (eZUS)', fontSize: 6.5, color: '#475569' },
            ],
            fillColor: '#F1F5F9',
            margin: [6, 6, 6, 6],
          },
          {
            stack: [
              { text: spec.issuerHeader, fontSize: 7.5, bold: true, color: '#0F172A' },
              {
                text: spec.title,
                fontSize: 11,
                bold: true,
                color: '#000000',
                margin: [0, 3, 0, 3],
              },
              { text: spec.legalBasis, fontSize: 6.8, color: '#334155', lineHeight: 1.2 },
            ],
            margin: [8, 6, 8, 6],
          },
          {
            stack: [
              { text: spec.receiptBoxLabel.toUpperCase(), fontSize: 6.2, bold: true, color: '#334155' },
              { text: '\n\n.................................', fontSize: 7.5, color: '#64748B', alignment: 'center' },
              { text: `Sporządzono: ${today}`, fontSize: 6.5, color: '#475569', margin: [0, 6, 0, 0] },
            ],
            fillColor: '#FAFAFA',
            margin: [6, 6, 6, 6],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      hLineColor: () => '#0F172A',
      vLineColor: () => '#0F172A',
    },
    margin: [0, 0, 0, 6],
  });

  // Oficjalna instrukcja wypełniania
  content.push({
    table: {
      widths: ['*'],
      body: [
        [
          {
            text: spec.fillingInstruction,
            fontSize: 7.2,
            bold: true,
            color: '#0F172A',
            fillColor: '#F8FAFC',
            margin: [6, 4, 6, 4],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0.75,
      vLineWidth: () => 0.75,
      hLineColor: () => '#475569',
      vLineColor: () => '#475569',
    },
    margin: [0, 0, 0, 8],
  });

  // Kolejne sekcje urzędowe
  for (const sec of spec.sections) {
    content.push({
      text: `${sec.number}. ${sec.title}`,
      fontSize: 8.5,
      bold: true,
      color: '#000000',
      margin: [0, 4, 0, 3],
    });

    if (sec.paragraphs && sec.paragraphs.length > 0) {
      content.push({
        stack: sec.paragraphs.map((p) => ({
          text: p,
          fontSize: 7.8,
          color: '#0F172A',
          margin: [0, 0, 0, 3],
        })),
        margin: [0, 0, 0, 3],
      });
    }

    if (sec.rows && sec.rows.length > 0) {
      const body: TableCell[][] = sec.rows.map((r) => [
        {
          text: r.label,
          bold: true,
          fontSize: 7.8,
          fillColor: '#F8FAFC',
          color: '#0F172A',
        },
        {
          text: r.value,
          fontSize: 7.8,
          color: r.isManualFill ? '#334155' : '#000000',
        },
      ]);

      content.push({
        table: {
          widths: ['34%', '66%'],
          body,
        },
        layout: {
          hLineWidth: () => 0.6,
          vLineWidth: () => 0.6,
          hLineColor: () => '#475569',
          vLineColor: () => '#475569',
          paddingTop: () => 3.5,
          paddingBottom: () => 3.5,
          paddingLeft: () => 5,
          paddingRight: () => 5,
        },
        margin: [0, 0, 0, 5],
      });
    }

    if (sec.checkboxes && sec.checkboxes.length > 0) {
      content.push({
        table: {
          widths: ['*'],
          body: [
            [
              {
                stack: sec.checkboxes.map((cb, idx) => ({
                  text: `${cb.checked ? '[X]' : '[  ]'}  ${cb.text}`,
                  fontSize: 7.8,
                  color: '#0F172A',
                  margin: [0, idx === 0 ? 0 : 2.5, 0, 0],
                })),
                margin: [6, 4, 6, 4],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.6,
          vLineWidth: () => 0.6,
          hLineColor: () => '#475569',
          vLineColor: () => '#475569',
        },
        margin: [0, 0, 0, 5],
      });
    }

    if (sec.table) {
      const tableBody: TableCell[][] = [
        sec.table.headers.map((h) => ({
          text: h,
          bold: true,
          fontSize: 7.4,
          fillColor: '#F1F5F9',
          color: '#000000',
        })),
        ...sec.table.rows.map((row) =>
          row.map((cell) => ({
            text: cell,
            fontSize: 7.5,
            color: '#0F172A',
          }))
        ),
      ];
      content.push({
        table: {
          widths: ['34%', '22%', '28%', '16%'],
          body: tableBody,
        },
        layout: {
          hLineWidth: () => 0.6,
          vLineWidth: () => 0.6,
          hLineColor: () => '#475569',
          vLineColor: () => '#475569',
          paddingTop: () => 3.5,
          paddingBottom: () => 3.5,
          paddingLeft: () => 5,
          paddingRight: () => 5,
        },
        margin: [0, 0, 0, 5],
      });
    }
  }

  // Załączniki
  if (spec.attachments.length > 0) {
    content.push({
      text: 'ZAŁĄCZNIKI DO WNIOSKU',
      fontSize: 8.5,
      bold: true,
      color: '#000000',
      margin: [0, 4, 0, 3],
    });
    content.push({
      table: {
        widths: ['*'],
        body: [
          [
            {
              stack: spec.attachments.map((att, idx) => ({
                text: `${att.checked ? '[X]' : '[  ]'}  ${att.text}`,
                fontSize: 7.6,
                color: '#0F172A',
                margin: [0, idx === 0 ? 0 : 2, 0, 0],
              })),
              margin: [6, 4, 6, 4],
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.6,
        vLineWidth: () => 0.6,
        hLineColor: () => '#475569',
        vLineColor: () => '#475569',
      },
      margin: [0, 0, 0, 6],
    });
  }

  // Pouczenie
  content.push({
    text: 'POUCZENIE I OŚWIADCZENIE O PRAWDZIWOŚCI DANYCH',
    fontSize: 8.5,
    bold: true,
    color: '#000000',
    margin: [0, 4, 0, 3],
  });
  content.push({
    stack: spec.legalNotice.map((line) => ({
      text: line,
      fontSize: 7.4,
      color: '#1E293B',
      margin: [0, 0, 0, 2],
    })),
    margin: [0, 0, 0, 12],
  });

  // Podpisy
  content.push({
    columns: [
      {
        width: '46%',
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: `\n\n........................................................................\n${spec.signatureLeftLabel}`,
                alignment: 'center',
                fontSize: 7.2,
                color: '#334155',
                margin: [4, 4, 4, 4],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.75,
          vLineWidth: () => 0.75,
          hLineColor: () => '#475569',
          vLineColor: () => '#475569',
        },
      },
      { width: '8%', text: '' },
      {
        width: '46%',
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: `\n\n........................................................................\n${spec.signatureRightLabel}`,
                alignment: 'center',
                fontSize: 7.2,
                color: '#334155',
                margin: [4, 4, 4, 4],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.75,
          vLineWidth: () => 0.75,
          hLineColor: () => '#475569',
          vLineColor: () => '#475569',
        },
      },
    ],
  });

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [32, 28, 32, 34],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 8,
      color: '#0F172A',
      lineHeight: 1.22,
    },
    footer: (currentPage, pageCount) => ({
      margin: [32, 0, 32, 12],
      columns: [
        {
          text: `${spec.symbol} · Projekt demonstracyjny · stan prawny ${payload.params.yearLabel}`,
          fontSize: 6.8,
          color: '#64748B',
        },
        {
          text: `Strona ${currentPage} z ${pageCount}`,
          alignment: 'right',
          fontSize: 6.8,
          color: '#64748B',
        },
      ],
    }),
    content,
  };

  const slug = (payload.mom.name || 'rodzic')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  const filename = `${spec.filenamePrefix}_${slug || 'rodzic'}.pdf`;
  pdfMake.createPdf(docDefinition).download(filename);
}

/**
 * Generuje syntetyczny dokument PDF lub jego skan do przetestowania modułu OCR.
 */
export function downloadSampleAuditPdf(
  sampleKind: 'Z-3b' | 'ZAS-53'
): void {
  ensurePdfFonts();

  const isZ3b = sampleKind === 'Z-3b';
  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [36, 36, 36, 36],
    defaultStyle: { font: 'Roboto', fontSize: 10, color: '#0F172A', lineHeight: 1.3 },
    content: [
      {
        text: 'DOKUMENT SYNTETYCZNY DO TESTÓW — NIE JEST DOKUMENTEM ZUS ANI PRAWDZIWĄ SPRAWĄ.',
        fontSize: 10,
        bold: true,
        color: '#7F1D1D',
        margin: [0, 0, 0, 12],
      },
      {
        text: isZ3b
          ? 'ZUS Z-3b — ZAŚWIADCZENIE PŁATNIKA SKŁADEK (WZÓR ARCHIWALNY SPRZED 24.10.2026 R.)'
          : 'ZUS ZAS-53 — WNIOSEK O ZASIŁEK CHOROBOWY W OKRESIE CIĄŻY (KOD B)',
        fontSize: 13,
        bold: true,
        margin: [0, 0, 0, 12],
      },
      {
        text: isZ3b
          ? 'Profil syntetyczny: osoba prowadząca działalność (B2B)\nTytuł ubezpieczenia: B2B (dobrowolne ubezpieczenie chorobowe: TAK)\nŁączny staż ubezpieczenia chorobowego: 120 dni (4 miesiące w ostatnich 12 mies.)\nPrzerwa między okresami ubezpieczenia: 18 dni\nZadłużenie składkowe na dzień powstania prawa: 18,50 zł\nDeklarowany przychód brutto (podstawa składek): 14 000,00 zł\nLiczba ubezpieczonych zgłaszanych przez płatnika: 1 osoba\nDzień złożenia wniosku po porodzie: 19 dzień (złożono przez PUE/eZUS: TAK)\nUwagi: Przykład do testów, nie rzeczywista sprawa.'
          : 'Profil syntetyczny: osoba prowadząca działalność (B2B)\nFormularz: ZAS-53 · e-ZLA z kodem literowym B (ciąża)\nTytuł ubezpieczenia: B2B (dobrowolna składka chorobowa: TAK)\nOkres ubezpieczenia chorobowego przed niezdolnością do pracy: 60 dni\nPrzerwa między okresami ubezpieczenia: 0 dni\nZadłużenie na koncie składek: 0,00 zł\nPodstawa wymiaru składek brutto: 8 400,00 zł\nLiczba ubezpieczonych u płatnika: 1 osoba\nWykorzystane dni z kodem B: 25 dni · Przykład syntetyczny do testów',
        margin: [0, 0, 0, 14],
      },
    ],
  };

  pdfMake
    .createPdf(docDefinition)
    .download(isZ3b ? 'Demo_syntetyczne_Z-3b_B2B.pdf' : 'Demo_syntetyczne_ZAS-53_Ciaza.pdf');
}

