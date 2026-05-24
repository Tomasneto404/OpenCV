/**
 * Executive — premium serif PDF template.
 *
 * Mirrors templates/Executive.tsx but rendered via @react-pdf/renderer so the
 * downloaded PDF has selectable text. Page wrapping is automatic; we hold
 * each <View key=… wrap={false}> together for items that should stay on one
 * page (a single experience entry, for example).
 */
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { CVData } from '../../types';
import { labelsFor } from '../labels';
import { PALETTE, bullets, contactList } from '../common';

interface Props { cv: CVData; }

function makeStyles(accent: string) {
  return StyleSheet.create({
    page: {
      fontFamily: 'Times-Roman', fontSize: 10.5, color: PALETTE.ink,
      backgroundColor: PALETTE.white, padding: '54 60 56 60',
    },

    headerWrap: { textAlign: 'center' },
    headerRules: { borderTopWidth: 2, borderTopColor: accent, borderBottomWidth: 0.6, borderBottomColor: accent, paddingTop: 12, paddingBottom: 10 },
    name: {
      fontFamily: 'Times-Bold', fontSize: 22, color: PALETTE.ink,
      letterSpacing: 4, textTransform: 'uppercase',
    },
    headline: { fontSize: 11, color: PALETTE.inkMuted, marginTop: 3, letterSpacing: 1.2 },
    contact: { fontSize: 10, color: PALETTE.inkDim, textAlign: 'center', marginTop: 10 },

    section: { marginTop: 16 },
    sectionTitle: {
      fontFamily: 'Times-Bold', fontSize: 10.5, color: accent,
      letterSpacing: 3, marginBottom: 3, textTransform: 'uppercase',
    },
    sectionRule: { height: 1, backgroundColor: accent, marginBottom: 8 },

    summary: { fontSize: 10.5, lineHeight: 1.6, color: PALETTE.inkSoft },

    item: { marginBottom: 11 },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    role: { fontFamily: 'Times-Bold', fontSize: 11.5, color: PALETTE.ink, letterSpacing: 0.4 },
    company: { fontSize: 10.5, color: PALETTE.inkMuted, marginTop: 1 },
    date: { fontFamily: 'Times-Italic', fontSize: 10, color: PALETTE.inkDim, letterSpacing: 0.4 },
    bullet: { flexDirection: 'row', marginTop: 2 },
    bulletDot: { width: 10, color: PALETTE.inkFaint, fontSize: 10 },
    bulletText: { fontSize: 10.5, lineHeight: 1.5, color: PALETTE.inkSoft, flex: 1 },

    twoCol:    { flexDirection: 'row', gap: 24 },
    col:       { flex: 1 },
    skillLine: { fontSize: 10.5, color: PALETTE.inkSoft, marginBottom: 2, lineHeight: 1.55 },
    skillCat:  { fontFamily: 'Times-Bold', color: PALETTE.ink },
    langRow:   { flexDirection: 'row', justifyContent: 'space-between', fontSize: 10.5, color: PALETTE.inkSoft, marginBottom: 2 },
    langLevel: { fontFamily: 'Times-Italic', color: PALETTE.inkDim },
  });
}

export function ExecutivePdf({ cv }: Props) {
  const accent = cv.accentColor || '#0b1220';
  const s = makeStyles(accent);
  const p = cv.personal;
  const contacts = contactList(p);
  const L = labelsFor(cv.locale).sections;

  return (
    <Document title={p.fullName || 'CV'} author={p.fullName} producer="CVeaver">
      <Page size="A4" style={s.page} wrap>
        <View style={s.headerWrap}>
          <View style={s.headerRules}>
            <Text style={s.name}>{p.fullName || 'O teu nome'}</Text>
            {p.headline && <Text style={s.headline}>{p.headline}</Text>}
          </View>
          {contacts.length > 0 && <Text style={s.contact}>{contacts.join('  ·  ')}</Text>}
        </View>

        {cv.summary && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{L.about}</Text>
            <View style={s.sectionRule} />
            <Text style={s.summary}>{cv.summary}</Text>
          </View>
        )}

        {cv.experience.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{L.experience}</Text>
            <View style={s.sectionRule} />
            {cv.experience.map((it) => (
              <View key={it.id} style={s.item} wrap={false}>
                <View style={s.itemHeader}>
                  <Text style={s.role}>{it.role || '—'}</Text>
                  <Text style={s.date}>{it.startDate}{it.endDate ? ` — ${it.endDate}` : ''}</Text>
                </View>
                <Text style={s.company}>{it.company}{it.location ? ` · ${it.location}` : ''}</Text>
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
            <Text style={s.sectionTitle}>{L.education}</Text>
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

        {cv.projects.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{L.projects}</Text>
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

        {(cv.skills.length > 0 || cv.languages.length > 0) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{L.skills} · {L.languages}</Text>
            <View style={s.sectionRule} />
            <View style={s.twoCol}>
              {cv.skills.length > 0 && (
                <View style={s.col}>
                  {cv.skills.map((g) => (
                    <Text key={g.id} style={s.skillLine}>
                      {g.category && <Text style={s.skillCat}>{g.category}: </Text>}
                      {g.items}
                    </Text>
                  ))}
                </View>
              )}
              {cv.languages.length > 0 && (
                <View style={s.col}>
                  {cv.languages.map((l) => (
                    <View key={l.id} style={s.langRow}>
                      <Text>{l.name}</Text>
                      {l.level && <Text style={s.langLevel}>{l.level}</Text>}
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
