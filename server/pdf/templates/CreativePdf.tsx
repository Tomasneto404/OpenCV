import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import type { CVData } from '../../types';
import { PALETTE, bullets, withAlpha } from '../common';
import { labelsFor } from '../labels';

interface Props { cv: CVData; }

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '·';
}

function makeStyles(accent: string) {
  return StyleSheet.create({
    page: { fontFamily: 'Helvetica', fontSize: 10, color: PALETTE.ink, backgroundColor: PALETTE.surface },

    header: {
      padding: '32 44 28 44',
      backgroundColor: withAlpha(accent, 0.12),
      borderBottomWidth: 1, borderBottomColor: withAlpha(accent, 0.25),
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
    avatar: { width: 70, height: 70, borderRadius: 999, objectFit: 'cover' },
    avatarFallback: {
      width: 70, height: 70, borderRadius: 999,
      backgroundColor: accent, alignItems: 'center', justifyContent: 'center',
    },
    avatarInitials: { color: PALETTE.white, fontSize: 22, fontFamily: 'Helvetica-Bold' },
    kicker: { fontSize: 8, color: accent, letterSpacing: 2.5, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
    name: { fontSize: 26, color: PALETTE.ink, fontFamily: 'Helvetica-Bold', letterSpacing: -0.4 },
    headline: { fontSize: 11, color: PALETTE.inkDim, marginTop: 2 },
    pills: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16 },
    pill: {
      fontSize: 9, color: PALETTE.inkMuted,
      backgroundColor: PALETTE.white,
      borderWidth: 0.6, borderColor: withAlpha(accent, 0.28),
      paddingTop: 3, paddingBottom: 3, paddingLeft: 8, paddingRight: 8,
      borderRadius: 9999, marginRight: 6, marginBottom: 5,
    },

    body: { flexDirection: 'row', padding: '24 44 32 44', gap: 26 },
    main: { flex: 1, gap: 18 },
    aside: { width: 178, gap: 16 },

    block: { marginBottom: 4 },
    blockTitle: {
      fontSize: 9, color: accent, letterSpacing: 2.4, marginBottom: 7,
      fontFamily: 'Helvetica-Bold', textTransform: 'uppercase',
    },

    summary: { fontSize: 10.5, lineHeight: 1.55, color: PALETTE.inkSoft },

    expItem: {
      paddingLeft: 11,
      borderLeftWidth: 1.5, borderLeftColor: withAlpha(accent, 0.4),
      marginBottom: 12,
    },
    expHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    role: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: PALETTE.ink },
    company: { fontSize: 10, color: accent, fontFamily: 'Helvetica-Bold' },
    date: { fontSize: 9, color: PALETTE.inkDim },
    bullet: { flexDirection: 'row', marginTop: 3 },
    bulletDot: { width: 10, color: accent, fontFamily: 'Helvetica-Bold', fontSize: 10 },
    bulletText: { fontSize: 10, lineHeight: 1.45, color: PALETTE.inkSoft, flex: 1 },

    projectCard: {
      padding: 10, borderRadius: 6,
      backgroundColor: PALETTE.white,
      borderWidth: 0.6, borderColor: withAlpha(accent, 0.22),
      marginBottom: 8,
    },
    projHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    projName: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: PALETTE.ink },
    projUrl: { fontSize: 9, color: accent },
    projStack: { fontSize: 9, color: PALETTE.inkDim, marginTop: 1 },
    projDesc: { fontSize: 10, color: PALETTE.inkSoft, marginTop: 4 },

    skillCat: { fontSize: 8.5, color: accent, fontFamily: 'Helvetica-Bold', letterSpacing: 0.6, marginBottom: 3 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
    chip: {
      fontSize: 8.5, color: PALETTE.inkSoft,
      backgroundColor: withAlpha(accent, 0.1),
      paddingTop: 2, paddingBottom: 2, paddingLeft: 6, paddingRight: 6,
      borderRadius: 3, marginRight: 3, marginBottom: 3,
    },

    eduItem: { marginBottom: 8 },
    eduDeg: { fontFamily: 'Helvetica-Bold', fontSize: 10.5, color: PALETTE.ink },
    eduInst: { fontSize: 9.5, color: accent },
    eduDate: { fontSize: 9, color: PALETTE.inkDim, marginTop: 1 },

    langRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3, fontSize: 9.5, color: PALETTE.inkSoft },
    langLevel: { color: PALETTE.inkDim },
  });
}

export function CreativePdf({ cv }: Props) {
  const accent = cv.accentColor || '#7f1d1d';
  const s = makeStyles(accent);
  const p = cv.personal;
  const contacts = [p.email, p.phone, p.location, p.website, p.linkedin, p.github].filter(Boolean);
  const L = labelsFor(cv.locale).sections;

  return (
    <Document title={p.fullName || 'CV'} author={p.fullName} producer="CVeaver">
      <Page size="A4" style={s.page} wrap>
        <View style={s.header}>
          <View style={s.headerRow}>
            {p.photoDataUrl ? (
              <Image src={p.photoDataUrl} style={s.avatar} />
            ) : (
              <View style={s.avatarFallback}><Text style={s.avatarInitials}>{initials(p.fullName)}</Text></View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.kicker}>CURRICULUM</Text>
              <Text style={s.name}>{p.fullName || 'O teu nome'}</Text>
              {p.headline && <Text style={s.headline}>{p.headline}</Text>}
            </View>
          </View>
          {contacts.length > 0 && (
            <View style={s.pills}>{contacts.map((c, i) => <Text key={i} style={s.pill}>{c}</Text>)}</View>
          )}
        </View>

        <View style={s.body}>
          {/* Main */}
          <View style={s.main}>
            {cv.summary && (
              <View style={s.block}>
                <Text style={s.blockTitle}>SOBRE</Text>
                <Text style={s.summary}>{cv.summary}</Text>
              </View>
            )}

            {cv.experience.length > 0 && (
              <View style={s.block}>
                <Text style={s.blockTitle}>{L.experience.toUpperCase()}</Text>
                {cv.experience.map((it) => (
                  <View key={it.id} style={s.expItem} wrap={false}>
                    <View style={s.expHeader}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={s.role}>{it.role || '—'}</Text>
                        <Text style={s.company}>{it.company}{it.location ? ` · ${it.location}` : ''}</Text>
                      </View>
                      <Text style={s.date}>{it.startDate}{it.endDate ? ` — ${it.endDate}` : ''}</Text>
                    </View>
                    {bullets(it.description).map((b, i) => (
                      <View key={i} style={s.bullet}>
                        <Text style={s.bulletDot}>▹</Text>
                        <Text style={s.bulletText}>{b}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}

            {cv.projects.length > 0 && (
              <View style={s.block}>
                <Text style={s.blockTitle}>{L.projects.toUpperCase()}</Text>
                {cv.projects.map((proj) => (
                  <View key={proj.id} style={s.projectCard} wrap={false}>
                    <View style={s.projHeader}>
                      <Text style={s.projName}>{proj.name}</Text>
                      {proj.url && <Text style={s.projUrl}>{proj.url}</Text>}
                    </View>
                    {proj.stack && <Text style={s.projStack}>{proj.stack}</Text>}
                    {proj.description && <Text style={s.projDesc}>{proj.description}</Text>}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Aside */}
          <View style={s.aside}>
            {cv.skills.length > 0 && (
              <View style={s.block}>
                <Text style={s.blockTitle}>{L.skills.toUpperCase()}</Text>
                {cv.skills.map((g) => (
                  <View key={g.id} style={{ marginBottom: 8 }}>
                    {g.category && <Text style={s.skillCat}>{g.category.toUpperCase()}</Text>}
                    <View style={s.chipRow}>
                      {g.items.split(',').map((x) => x.trim()).filter(Boolean).map((x, i) => (
                        <Text key={i} style={s.chip}>{x}</Text>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {cv.education.length > 0 && (
              <View style={s.block}>
                <Text style={s.blockTitle}>{L.education.toUpperCase()}</Text>
                {cv.education.map((it) => (
                  <View key={it.id} style={s.eduItem} wrap={false}>
                    <Text style={s.eduDeg}>{it.degree}</Text>
                    <Text style={s.eduInst}>{it.institution}</Text>
                    <Text style={s.eduDate}>{it.startDate}{it.endDate ? ` — ${it.endDate}` : ''}</Text>
                  </View>
                ))}
              </View>
            )}

            {cv.languages.length > 0 && (
              <View style={s.block}>
                <Text style={s.blockTitle}>{L.languages.toUpperCase()}</Text>
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
      </Page>
    </Document>
  );
}
