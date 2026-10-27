import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import type { CVData } from '../../types';
import { PALETTE, bullets, withAlpha } from '../common';
import { labelsFor } from '../labels';

interface Props { cv: CVData; }

const SIDEBAR_W = 175;

function makeStyles(accent: string) {
  return StyleSheet.create({
    page: {
      fontFamily: 'Helvetica', fontSize: 10,
      color: PALETTE.ink, backgroundColor: PALETTE.white,
      /* Explicit 0 so no react-pdf default padding leaks under the
         sidebar accent (was producing a faint stripe / non-flush edge). */
      padding: 0, margin: 0,
    },

    /* Accent stripe that runs the full height of every page. Empty —
       deliberately — so multi-page CVs get a flush sidebar without the
       avatar/name/contacts repeated on every page. */
    sidebarBg: {
      position: 'absolute', top: 0, left: 0, bottom: 0, right: undefined,
      width: SIDEBAR_W,
      backgroundColor: accent,
    },
    /* Content stacked on top of the accent stripe — page 1 only. When
       the CV overflows to page 2, only the bare accent stripe shows on
       the left, which reads as much cleaner. */
    sidebarContent: {
      position: 'absolute', top: 0, left: 0,
      width: SIDEBAR_W,
      padding: 18,
      color: PALETTE.white,
    },
    main: { marginLeft: SIDEBAR_W, padding: '26 26 30 26' },

    avatarWrap: { alignItems: 'center', marginBottom: 14 },
    avatar: { width: 78, height: 78, borderRadius: 999, objectFit: 'cover' },
    avatarFallback: {
      width: 78, height: 78, borderRadius: 999,
      backgroundColor: withAlpha('#ffffff', 0.18),
      alignItems: 'center', justifyContent: 'center',
    },
    avatarInitials: { color: PALETTE.white, fontSize: 26, fontFamily: 'Helvetica-Bold' },

    name: { color: PALETTE.white, fontFamily: 'Helvetica-Bold', fontSize: 14, marginTop: 10, textAlign: 'center' },
    headline: { color: withAlpha('#ffffff', 0.85), fontSize: 9.5, marginTop: 2, textAlign: 'center' },

    sideHeading: {
      color: withAlpha('#ffffff', 0.85), fontSize: 8,
      letterSpacing: 1.4, marginTop: 14, marginBottom: 5, fontFamily: 'Helvetica-Bold',
    },
    sideRow: { marginBottom: 4 },
    sideRowLabel: { color: withAlpha('#ffffff', 0.65), fontSize: 7, letterSpacing: 0.6 },
    sideRowVal: { color: PALETTE.white, fontSize: 9 },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
    chip: {
      fontSize: 8, color: PALETTE.white,
      backgroundColor: withAlpha('#ffffff', 0.18),
      paddingTop: 2, paddingBottom: 2, paddingLeft: 5, paddingRight: 5,
      borderRadius: 3, marginRight: 3, marginBottom: 3,
    },
    skillCat: { color: withAlpha('#ffffff', 0.7), fontSize: 8, marginBottom: 3, letterSpacing: 0.4 },

    langRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3, fontSize: 9 },
    langLevel: { color: withAlpha('#ffffff', 0.75) },

    block: { marginBottom: 14 },
    blockTitle: {
      color: accent, fontSize: 10, fontFamily: 'Helvetica-Bold',
      letterSpacing: 1.6, marginBottom: 4, textTransform: 'uppercase',
    },
    blockRule: { height: 0.6, backgroundColor: withAlpha(accent, 0.3), marginBottom: 8 },

    summary: { fontSize: 10.5, lineHeight: 1.5, color: PALETTE.inkSoft },

    item: { marginBottom: 9 },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    role: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: PALETTE.ink },
    companyLine: { fontSize: 9.5, color: PALETTE.inkMuted, marginTop: 1 },
    dateLine: { fontSize: 9, color: PALETTE.inkDim },
    bullet: { flexDirection: 'row', marginTop: 3 },
    bulletDot: { width: 9, color: PALETTE.inkFaint, fontSize: 10 },
    bulletText: { fontSize: 10, lineHeight: 1.45, color: PALETTE.inkSoft, flex: 1 },

    projHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    projName: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: PALETTE.ink },
    projUrl: { fontSize: 9, color: PALETTE.inkDim },
    projStack: { fontSize: 9, color: PALETTE.inkDim, marginTop: 1 },
    projDesc: { fontSize: 10, color: PALETTE.inkSoft, marginTop: 3, lineHeight: 1.4 },
  });
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '·';
}

export function ModernPdf({ cv }: Props) {
  const accent = cv.accentColor || '#1e3a8a';
  const s = makeStyles(accent);
  const p = cv.personal;
  const L = labelsFor(cv.locale);
  const SEC = L.sections;
  const CL  = L.contactLabels;

  return (
    <Document title={p.fullName || 'CV'} author={p.fullName} producer="OpenCV">
      <Page size="A4" style={s.page} wrap>
        {/* Accent stripe — repeats on every page (just the colour) */}
        <View style={s.sidebarBg} fixed />

        {/* Sidebar content — only on page 1; pages 2+ get a clean stripe */}
        <View style={s.sidebarContent}>
          <View style={s.avatarWrap}>
            {p.photoDataUrl ? (
              <Image src={p.photoDataUrl} style={s.avatar} />
            ) : (
              <View style={s.avatarFallback}><Text style={s.avatarInitials}>{initials(p.fullName)}</Text></View>
            )}
            <Text style={s.name}>{p.fullName || 'O teu nome'}</Text>
            {p.headline && <Text style={s.headline}>{p.headline}</Text>}
          </View>

          <Text style={s.sideHeading}>{SEC.contact.toUpperCase()}</Text>
          {[
            [CL.email,    p.email],
            [CL.phone,    p.phone],
            [CL.location, p.location],
            [CL.website,  p.website],
            [CL.linkedin, p.linkedin],
            [CL.github,   p.github],
          ].filter(([, v]) => v).map(([label, value]) => (
            <View style={s.sideRow} key={label}>
              <Text style={s.sideRowLabel}>{label?.toUpperCase()}</Text>
              <Text style={s.sideRowVal}>{value}</Text>
            </View>
          ))}

          {cv.skills.length > 0 && (
            <>
              <Text style={s.sideHeading}>{SEC.skills.toUpperCase()}</Text>
              {cv.skills.map((g) => (
                <View key={g.id} style={{ marginBottom: 6 }}>
                  {g.category && <Text style={s.skillCat}>{g.category.toUpperCase()}</Text>}
                  <View style={s.chipRow}>
                    {g.items.split(',').map((x) => x.trim()).filter(Boolean).map((x, i) => (
                      <Text key={i} style={s.chip}>{x}</Text>
                    ))}
                  </View>
                </View>
              ))}
            </>
          )}

          {cv.languages.length > 0 && (
            <>
              <Text style={s.sideHeading}>{SEC.languages.toUpperCase()}</Text>
              {cv.languages.map((l) => (
                <View key={l.id} style={s.langRow}>
                  <Text>{l.name}</Text>
                  <Text style={s.langLevel}>{l.level}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Main content */}
        <View style={s.main}>
          {cv.summary && (
            <View style={s.block}>
              <Text style={s.blockTitle}>{SEC.about.toUpperCase()}</Text>
              <View style={s.blockRule} />
              <Text style={s.summary}>{cv.summary}</Text>
            </View>
          )}

          {cv.experience.length > 0 && (
            <View style={s.block}>
              <Text style={s.blockTitle}>{SEC.experience.toUpperCase()}</Text>
              <View style={s.blockRule} />
              {cv.experience.map((it) => (
                <View key={it.id} style={s.item} wrap={false}>
                  <View style={s.itemHeader}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={s.role}>{it.role || '—'}</Text>
                      <Text style={s.companyLine}>
                        {it.company}{it.location ? ` · ${it.location}` : ''}
                      </Text>
                    </View>
                    <Text style={s.dateLine}>
                      {it.startDate}{it.endDate ? ` — ${it.endDate}` : ''}
                    </Text>
                  </View>
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

          {cv.projects.length > 0 && (
            <View style={s.block}>
              <Text style={s.blockTitle}>{SEC.projects.toUpperCase()}</Text>
              <View style={s.blockRule} />
              {cv.projects.map((proj) => (
                <View key={proj.id} style={s.item} wrap={false}>
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

          {cv.education.length > 0 && (
            <View style={s.block}>
              <Text style={s.blockTitle}>{SEC.education.toUpperCase()}</Text>
              <View style={s.blockRule} />
              {cv.education.map((it) => (
                <View key={it.id} style={s.item} wrap={false}>
                  <View style={s.itemHeader}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={s.role}>{it.degree}</Text>
                      <Text style={s.companyLine}>
                        {it.institution}{it.location ? ` · ${it.location}` : ''}
                      </Text>
                    </View>
                    <Text style={s.dateLine}>
                      {it.startDate}{it.endDate ? ` — ${it.endDate}` : ''}
                    </Text>
                  </View>
                  {it.description && <Text style={s.projDesc}>{it.description}</Text>}
                </View>
              ))}
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}
