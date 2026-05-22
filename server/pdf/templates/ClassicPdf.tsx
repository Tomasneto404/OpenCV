import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { CVData } from '../../types';
import { PALETTE, bullets, contactList } from '../common';

interface Props { cv: CVData; }

function makeStyles(accent: string) {
  return StyleSheet.create({
    page: {
      fontFamily: 'Times-Roman', fontSize: 10.5, color: PALETTE.ink,
      backgroundColor: PALETTE.white, padding: '46 56 52 56',
    },
    header: { paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: accent, marginBottom: 14 },
    name: { fontFamily: 'Times-Bold', fontSize: 24, color: PALETTE.ink, textAlign: 'center' },
    headline: { fontFamily: 'Times-Italic', fontSize: 12, color: PALETTE.inkMuted, textAlign: 'center', marginTop: 3 },
    contact: { fontSize: 10, color: PALETTE.inkDim, textAlign: 'center', marginTop: 8 },

    section: { marginTop: 14 },
    sectionTitle: {
      fontFamily: 'Times-Bold', fontSize: 11.5, color: accent,
      letterSpacing: 2.2, marginBottom: 4, textTransform: 'uppercase',
    },
    sectionRule: { height: 0.5, backgroundColor: PALETTE.rule, marginBottom: 8 },

    summary: { fontSize: 10.5, lineHeight: 1.55, color: PALETTE.inkSoft },

    item: { marginBottom: 9 },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    role: { fontFamily: 'Times-Bold', fontSize: 11.5, color: PALETTE.ink },
    company: { fontFamily: 'Times-Italic', fontSize: 10.5, color: PALETTE.inkMuted, marginTop: 1 },
    date: { fontFamily: 'Times-Italic', fontSize: 10, color: PALETTE.inkDim },
    bullet: { flexDirection: 'row', marginTop: 2 },
    bulletDot: { width: 10, color: PALETTE.inkFaint, fontSize: 10 },
    bulletText: { fontSize: 10.5, lineHeight: 1.5, color: PALETTE.inkSoft, flex: 1 },

    skillLine: { fontSize: 10.5, color: PALETTE.inkSoft, marginBottom: 2, lineHeight: 1.5 },
    skillCat: { fontFamily: 'Times-Bold', color: PALETTE.ink },

    langLine: { fontSize: 10.5, color: PALETTE.inkSoft },
    langName: { fontFamily: 'Times-Bold', color: PALETTE.ink },
    langLevel: { fontFamily: 'Times-Italic', color: PALETTE.inkDim },
  });
}

export function ClassicPdf({ cv }: Props) {
  const accent = cv.accentColor || '#1f2937';
  const s = makeStyles(accent);
  const p = cv.personal;
  const contacts = contactList(p);

  return (
    <Document title={p.fullName || 'CV'} author={p.fullName} producer="CVeaver">
      <Page size="A4" style={s.page} wrap>
        <View style={s.header}>
          <Text style={s.name}>{p.fullName || 'O teu nome'}</Text>
          {p.headline && <Text style={s.headline}>{p.headline}</Text>}
          {contacts.length > 0 && <Text style={s.contact}>{contacts.join('  ·  ')}</Text>}
        </View>

        {cv.summary && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Sumário</Text>
            <View style={s.sectionRule} />
            <Text style={s.summary}>{cv.summary}</Text>
          </View>
        )}

        {cv.experience.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Experiência Profissional</Text>
            <View style={s.sectionRule} />
            {cv.experience.map((it) => (
              <View key={it.id} style={s.item} wrap={false}>
                <View style={s.itemHeader}>
                  <Text style={s.role}>{it.role || '—'}</Text>
                  <Text style={s.date}>{it.startDate}{it.endDate ? ` — ${it.endDate}` : ''}</Text>
                </View>
                <Text style={s.company}>{it.company}{it.location ? `, ${it.location}` : ''}</Text>
                {bullets(it.description).map((b, i) => (
                  <View key={i} style={s.bullet}>
                    <Text style={s.bulletDot}>•</Text>
                    <Text style={s.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {cv.education.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Formação</Text>
            <View style={s.sectionRule} />
            {cv.education.map((it) => (
              <View key={it.id} style={s.item} wrap={false}>
                <View style={s.itemHeader}>
                  <Text style={s.role}>{it.degree}</Text>
                  <Text style={s.date}>{it.startDate}{it.endDate ? ` — ${it.endDate}` : ''}</Text>
                </View>
                <Text style={s.company}>{it.institution}{it.location ? `, ${it.location}` : ''}</Text>
                {it.description && <Text style={s.summary}>{it.description}</Text>}
              </View>
            ))}
          </View>
        )}

        {cv.skills.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Competências</Text>
            <View style={s.sectionRule} />
            {cv.skills.map((g) => (
              <Text key={g.id} style={s.skillLine}>
                {g.category && <Text style={s.skillCat}>{g.category}: </Text>}
                {g.items}
              </Text>
            ))}
          </View>
        )}

        {cv.projects.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Projetos</Text>
            <View style={s.sectionRule} />
            {cv.projects.map((proj) => (
              <View key={proj.id} style={s.item} wrap={false}>
                <View style={s.itemHeader}>
                  <Text style={s.role}>{proj.name}</Text>
                  {proj.url && <Text style={s.date}>{proj.url}</Text>}
                </View>
                {proj.stack && <Text style={s.company}>{proj.stack}</Text>}
                {proj.description && <Text style={s.summary}>{proj.description}</Text>}
              </View>
            ))}
          </View>
        )}

        {cv.languages.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Idiomas</Text>
            <View style={s.sectionRule} />
            <Text style={s.langLine}>
              {cv.languages.map((l, i) => (
                <Text key={l.id}>
                  <Text style={s.langName}>{l.name}</Text>
                  {l.level && <Text style={s.langLevel}> ({l.level})</Text>}
                  {i < cv.languages.length - 1 && <Text>  ·  </Text>}
                </Text>
              ))}
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
