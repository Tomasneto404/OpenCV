import type { ReactNode } from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import type { CVData } from '../../types';
import { labelsFor } from '../labels';
import { contactList } from '../common';

export function EditorialPdf({ cv }: { cv: CVData }) {
  const compact = cv.template === 'compact';
  const academic = cv.template === 'academic';
  const technical = cv.template === 'technical';
  const serif = academic || cv.template === 'studio';
  const accent = cv.accentColor;
  const L = labelsFor(cv.locale).sections;
  const p = cv.personal;
  const s = StyleSheet.create({
    page: { padding: compact ? '27 33' : '39 43.5', fontFamily: serif ? 'Times-Roman' : 'Helvetica', fontSize: compact ? 9 : 10.5, color: '#192f32', lineHeight: 1.5 },
    header: { flexDirection: academic ? 'column' : 'row', alignItems: academic ? 'center' : 'flex-start', gap: 18, textAlign: academic ? 'center' : 'left', marginBottom: compact ? 15 : 22.5, padding: technical ? 18 : 0, paddingBottom: compact ? 9 : 19.5, backgroundColor: technical ? '#192f32' : 'white', color: technical ? 'white' : '#192f32', borderBottomWidth: cv.template === 'studio' ? 3 : academic ? .75 : 0, borderBottomColor: accent },
    name: { fontSize: compact ? 22.5 : academic ? 25.5 : 33, fontFamily: cv.template === 'studio' ? 'Times-Roman' : serif ? 'Times-Bold' : 'Helvetica-Bold', lineHeight: 1.1 },
    headline: { fontSize: 10.5, marginTop: 7.5, marginBottom: 7.5, color: technical ? '#bfe6db' : accent, fontFamily: 'Helvetica' },
    contacts: { fontSize: 8, opacity: .8, fontFamily: 'Helvetica', lineHeight: 1.6 },
    title: { fontSize: compact ? 8.25 : 9, color: accent, fontFamily: technical ? 'Courier-Bold' : serif ? 'Times-Bold' : 'Helvetica-Bold', letterSpacing: technical ? 0 : 1.2, textTransform: 'uppercase', borderBottomWidth: .5, borderBottomColor: '#d5e1df', paddingBottom: 5, marginBottom: 9 },
    block: { marginBottom: compact ? 12 : 18 },
    item: { marginBottom: compact ? 9 : 13.5 },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    strong: { fontFamily: serif ? 'Times-Bold' : 'Helvetica-Bold', flex: 1 },
    date: { fontSize: 8.25, color: '#64748b' },
    sub: { color: accent, fontSize: 9, marginTop: 2 },
    detail: { fontSize: compact ? 8.6 : 9.75, color: '#475569', lineHeight: 1.6, marginTop: 3.75 },
  });
  const block = (title: string, children: ReactNode) => <View style={s.block}><Text style={s.title} minPresenceAhead={30}>{title}</Text>{children}</View>;
  const education = cv.education.length > 0 && block(L.education, cv.education.map(it => <View key={it.id} style={s.item}>
    <View style={s.row} minPresenceAhead={22}><Text style={s.strong}>{it.degree}</Text><Text style={s.date}>{it.startDate}{it.endDate && ` — ${it.endDate}`}</Text></View>
    <Text style={s.sub}>{[it.institution, it.location].filter(Boolean).join(' · ')}</Text>
    {it.description && <Text style={s.detail}>{it.description}</Text>}
  </View>));
  return <Document title={p.fullName || 'CV'} author={p.fullName} producer="OpenCV"><Page size="A4" style={s.page} wrap>
    <View style={s.header} wrap={false}><View style={{ flex: academic ? undefined : 1, width: academic ? '100%' : undefined }}>
      <Text style={s.name}>{p.fullName}</Text>{p.headline && <Text style={s.headline}>{p.headline}</Text>}
      <Text style={s.contacts}>{contactList(p).join('   ·   ')}</Text>
    </View>{p.photoDataUrl && <Image src={p.photoDataUrl} style={{ width: compact ? 48 : 60, height: compact ? 48 : 60, objectFit: 'cover', borderRadius: cv.template === 'studio' ? 30 : 3 }} />}</View>
    {cv.summary && block(L.about, <Text style={s.detail}>{cv.summary}</Text>)}
    {academic && education}
    {cv.experience.length > 0 && block(L.experience, cv.experience.map(it => <View key={it.id} style={s.item}>
      <View style={s.row} minPresenceAhead={22}><Text style={s.strong}>{it.role}</Text><Text style={s.date}>{it.startDate}{it.endDate && ` — ${it.endDate}`}</Text></View>
      <Text style={s.sub}>{[it.company, it.location].filter(Boolean).join(' · ')}</Text>{it.description && <Text style={s.detail}>{it.description}</Text>}
    </View>))}
    {!academic && education}
    {cv.projects.length > 0 && block(L.projects, cv.projects.map(it => <View key={it.id} style={s.item}><Text style={s.strong} minPresenceAhead={22}>{it.name}</Text>{it.url && <Text style={s.sub}>{it.url}</Text>}{it.description && <Text style={s.detail}>{it.description}</Text>}{it.stack && <Text style={[s.detail, { fontSize: 8.25, fontFamily: technical ? 'Courier' : 'Helvetica' }]}>{it.stack}</Text>}</View>))}
    <View style={{ flexDirection: 'row', gap: 24 }}>
      {cv.skills.length > 0 && <View style={{ flex: 1.5 }}>{block(L.skills, cv.skills.map(it => <Text key={it.id} style={s.detail}><Text style={{ fontFamily: serif ? 'Times-Bold' : 'Helvetica-Bold' }}>{it.category}{it.category && ': '}</Text>{it.items}</Text>))}</View>}
      {cv.languages.length > 0 && <View style={{ flex: 1 }}>{block(L.languages, cv.languages.map(it => <Text key={it.id} style={s.detail}>{it.name} · {it.level}</Text>))}</View>}
    </View>
  </Page></Document>;
}
