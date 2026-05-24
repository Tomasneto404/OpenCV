import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { CVData } from '../../types';
import { PALETTE, bullets, contactList } from '../common';
import { labelsFor } from '../labels';

interface Props { cv: CVData; }

function makeStyles(accent: string) {
  return StyleSheet.create({
    page: {
      fontFamily: 'Helvetica', fontSize: 10, color: PALETTE.ink,
      backgroundColor: PALETTE.white, padding: '60 64 64 64',
    },
    header: { marginBottom: 28 },
    name: { fontFamily: 'Helvetica', fontSize: 30, color: PALETTE.ink, letterSpacing: -0.4 },
    headline: { fontSize: 11, color: PALETTE.inkMuted, marginTop: 4 },
    bar: { height: 2, width: 36, backgroundColor: accent, marginTop: 12 },
    contact: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 },
    contactItem: { fontSize: 9, color: PALETTE.inkDim, marginRight: 18, marginBottom: 3 },

    block: { marginBottom: 22 },
    blockTitle: {
      fontSize: 8, color: accent, letterSpacing: 2.8, marginBottom: 10,
      fontFamily: 'Helvetica-Bold', textTransform: 'uppercase',
    },

    summary: { fontSize: 10.5, lineHeight: 1.65, color: PALETTE.inkSoft, maxWidth: 460 },

    row: { flexDirection: 'row', marginBottom: 14 },
    rowDate: { width: 95, fontSize: 9, color: PALETTE.inkFaint, paddingTop: 2 },
    rowBody: { flex: 1 },
    rowTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: PALETTE.ink },
    rowSubtitle: { fontSize: 9.5, color: PALETTE.inkMuted, marginTop: 1 },
    rowText: { fontSize: 9.5, color: PALETTE.inkSoft, marginTop: 4, lineHeight: 1.5 },

    detailsRow: { flexDirection: 'row' },
    detailsCol: { flex: 1 },
    detailLine: { fontSize: 9.5, color: PALETTE.inkSoft, marginBottom: 4, lineHeight: 1.45 },
    detailLabel: { color: PALETTE.inkFaint },
    langRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3, fontSize: 9.5, color: PALETTE.inkSoft },
    langLevel: { color: PALETTE.inkFaint },
  });
}

export function MinimalPdf({ cv }: Props) {
  const accent = cv.accentColor || '#0f172a';
  const s = makeStyles(accent);
  const p = cv.personal;
  const contacts = contactList(p);
  const L = labelsFor(cv.locale).sections;

  return (
    <Document title={p.fullName || 'CV'} author={p.fullName} producer="CVeaver">
      <Page size="A4" style={s.page} wrap>
        <View style={s.header}>
          <Text style={s.name}>{p.fullName || 'O teu nome'}</Text>
          {p.headline && <Text style={s.headline}>{p.headline}</Text>}
          <View style={s.bar} />
          <View style={s.contact}>
            {contacts.map((c, i) => <Text key={i} style={s.contactItem}>{c}</Text>)}
          </View>
        </View>

        {cv.summary && (
          <View style={s.block}>
            <Text style={s.blockTitle}>{L.about.toUpperCase()}</Text>
            <Text style={s.summary}>{cv.summary}</Text>
          </View>
        )}

        {cv.experience.length > 0 && (
          <View style={s.block}>
            <Text style={s.blockTitle}>{L.experience.toUpperCase()}</Text>
            {cv.experience.map((it) => (
              <View key={it.id} style={s.row} wrap={false}>
                <Text style={s.rowDate}>{it.startDate}{it.endDate ? ` — ${it.endDate}` : ''}</Text>
                <View style={s.rowBody}>
                  <Text style={s.rowTitle}>{it.role || '—'}</Text>
                  <Text style={s.rowSubtitle}>{it.company}{it.location ? ` · ${it.location}` : ''}</Text>
                  {bullets(it.description).map((b, i) => (
                    <Text key={i} style={s.rowText}>{b}</Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {cv.projects.length > 0 && (
          <View style={s.block}>
            <Text style={s.blockTitle}>{L.projects.toUpperCase()}</Text>
            {cv.projects.map((proj) => (
              <View key={proj.id} style={s.row} wrap={false}>
                <Text style={s.rowDate}>{proj.stack || ' '}</Text>
                <View style={s.rowBody}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={s.rowTitle}>{proj.name}</Text>
                    {proj.url && <Text style={[s.rowDate, { width: 'auto', paddingTop: 0 }]}>{proj.url}</Text>}
                  </View>
                  {proj.description && <Text style={s.rowText}>{proj.description}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}

        {cv.education.length > 0 && (
          <View style={s.block}>
            <Text style={s.blockTitle}>{L.education.toUpperCase()}</Text>
            {cv.education.map((it) => (
              <View key={it.id} style={s.row} wrap={false}>
                <Text style={s.rowDate}>{it.startDate}{it.endDate ? ` — ${it.endDate}` : ''}</Text>
                <View style={s.rowBody}>
                  <Text style={s.rowTitle}>{it.degree}</Text>
                  <Text style={s.rowSubtitle}>{it.institution}{it.location ? ` · ${it.location}` : ''}</Text>
                  {it.description && <Text style={s.rowText}>{it.description}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}

        {(cv.skills.length > 0 || cv.languages.length > 0) && (
          <View style={s.block}>
            <Text style={s.blockTitle}>DETALHES</Text>
            <View style={s.detailsRow}>
              {cv.skills.length > 0 && (
                <View style={s.detailsCol}>
                  {cv.skills.map((g) => (
                    <Text key={g.id} style={s.detailLine}>
                      {g.category && <Text style={s.detailLabel}>{g.category}: </Text>}
                      {g.items}
                    </Text>
                  ))}
                </View>
              )}
              {cv.languages.length > 0 && (
                <View style={s.detailsCol}>
                  {cv.languages.map((l) => (
                    <View key={l.id} style={s.langRow}>
                      <Text>{l.name}</Text>
                      <Text style={s.langLevel}>{l.level}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
}
