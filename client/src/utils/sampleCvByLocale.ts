/**
 * Localised "Zé Castor" sample CV. The Builder lets non-PT visitors read
 * the demo content in their own language while keeping the same character
 * (civil engineer from Paços de Ferreira, ex-scout, FCPF mascot).
 *
 * Only the *sample* CV is translated on locale change — once the user
 * starts editing, their content is kept verbatim. The App tracks whether
 * the current state is still the untouched sample via a `sampleLocale`
 * flag.
 */
import type { Locale } from '../i18n/types';
import type { CVData } from '../types';
import { newId } from '../types';

const ACCENT = '#5b3a11';

export function sampleCVByLocale(locale: Locale): CVData {
  const base = (() => {
    switch (locale) {
      case 'en': return sampleEN();
      case 'es': return sampleES();
      case 'fr': return sampleFR();
      case 'de': return sampleDE();
      case 'pt':
      default:   return samplePT();
    }
  })();
  // Tag the CV with its locale so the templates (preview + PDF) render
  // section labels in the matching language.
  return { ...base, locale };
}

/* ── PT ─────────────────────────────────────────────────── */
function samplePT(): CVData {
  return {
    version: 1,
    template: 'modern',
    accentColor: ACCENT,
    personal: {
      fullName: 'Zé Castor',
      headline: 'Engenheiro Civil · Especialista em Pontes de Madeira',
      email: 'ze.castor@cveaver.com',
      phone: '+351 912 345 678',
      location: 'Paços de Ferreira, Portugal',
      website: 'cveaver.com',
      linkedin: 'linkedin.com/in/ze-castor',
      github: '',
    },
    summary:
      'Engenheiro civil com 8 anos de experiência em estruturas de madeira e infraestruturas sustentáveis. Combina rigor técnico com forte espírito de equipa — fruto da formação como escuteiro e do serviço militar. Proativo, apaixonado pela natureza e pelo trabalho de campo. Quando não está a desenhar pontes, está a nadar no Rio Sousa ou a animar a bancada do FC Paços de Ferreira como mascote oficial.',
    experience: [
      { id: newId(), role: 'Engenheiro Civil Sénior', company: 'Pontes & Diques, Lda.', location: 'Porto', startDate: 'Mar 2022', endDate: 'Presente',
        description: 'Liderança técnica do projeto da Ponte Pedonal do Rio Sousa (40 m de vão, madeira lamelada-colada) — premiada nos PT Wood Construction Awards 2024.\nGestão de equipa de 6 engenheiros e 18 operários, garantindo entrega 2 meses antes do prazo.\nRedução de 18% nos custos de material via fornecimento local certificado FSC.' },
      { id: newId(), role: 'Engenheiro de Projeto', company: 'BridgeWorks Portugal', location: 'Lisboa', startDate: 'Set 2019', endDate: 'Fev 2022',
        description: 'Desenho estrutural de 12 passadiços em parques naturais (Peneda-Gerês, Sintra-Cascais, Vale do Sousa).\nResponsável pelo cumprimento dos Eurocódigos 5 (estruturas de madeira) e estudos de impacto ambiental.\nMentor técnico de 2 engenheiros estagiários.' },
      { id: newId(), role: 'Engenheiro Júnior · Estagiário', company: 'CM Paços de Ferreira', location: 'Paços de Ferreira', startDate: 'Jul 2017', endDate: 'Ago 2019',
        description: 'Apoio na revisão de projetos urbanísticos e licenciamentos de construção.\nFiscalização de obras públicas locais (Centro Cívico, Parque Urbano).' },
      { id: newId(), role: 'Sargento Miliciano · Engenharia', company: 'Exército Português · Regimento de Engenharia n.º 3', location: 'Espinho', startDate: 'Mar 2019', endDate: 'Set 2019',
        description: 'Serviço militar obrigatório no Regimento de Engenharia.\nFormação em construção de pontes Bailey e apoio logístico de campanha.\nDesenvolveu disciplina, capacidade de comando e resiliência sob pressão.' },
      { id: newId(), role: 'Chefe de Patrulha · Voluntariado', company: 'Corpo Nacional de Escutas — Agrupamento 314', location: 'Paços de Ferreira', startDate: '2008', endDate: '2017',
        description: 'Liderança de patrulhas em acampamentos, raids e atividades de pioneirismo.\nFormação em primeiros socorros, orientação e conservação da natureza.\nResponsável por iniciativas locais de limpeza de margens fluviais.' },
    ],
    education: [
      { id: newId(), degree: 'Mestrado em Engenharia Civil — Estruturas', institution: 'Faculdade de Engenharia da Universidade do Porto (FEUP)', location: 'Porto', startDate: '2015', endDate: '2017',
        description: 'Tese: «Comportamento sismo-resistente de pontes em madeira lamelada-colada no Norte de Portugal». Classificação final: 18 valores.' },
      { id: newId(), degree: 'Licenciatura em Engenharia Civil', institution: 'Instituto Superior de Engenharia do Porto (ISEP)', location: 'Porto', startDate: '2012', endDate: '2015',
        description: 'Diploma de Mérito · Membro do Núcleo de Estudantes de Engenharia Civil.' },
      { id: newId(), degree: 'Curso de Especialização — Construção de Pontes em Madeira', institution: 'CIM-PT · Centro de Inovação em Madeira', location: 'Viana do Castelo', startDate: '2021', endDate: '2021',
        description: 'Formação intensiva certificada em projeto, dimensionamento e execução de pontes em madeira lamelada-colada.' },
    ],
    skills: [
      { id: newId(), category: 'Estruturas', items: 'Madeira lamelada-colada, Betão armado, Aço, Eurocódigos 0-9' },
      { id: newId(), category: 'Software',  items: 'AutoCAD, Revit, Robot Structural, SAP2000, QGIS' },
      { id: newId(), category: 'Gestão',    items: 'Liderança de equipa, Orçamentação, Project Management' },
      { id: newId(), category: 'Soft skills', items: 'Proatividade, Trabalho em equipa, Resolução de problemas, Comunicação' },
      { id: newId(), category: 'Interesses', items: 'Natação, Viagens, Conservação da natureza, Pioneirismo' },
    ],
    languages: [
      { id: newId(), name: 'Português', level: 'Nativo' },
      { id: newId(), name: 'Inglês',    level: 'C1 — fluente' },
      { id: newId(), name: 'Espanhol',  level: 'B2' },
      { id: newId(), name: 'Francês',   level: 'A2' },
    ],
    projects: [
      { id: newId(), name: 'Ponte Pedonal do Rio Sousa', url: 'pontes-sousa.pt',
        description: 'Vão de 40 m em madeira lamelada-colada certificada, integrada em zona protegida. Premiada nos PT Wood Construction Awards 2024.',
        stack: 'Pinho-bravo lamelado-colado, Aço inox, Eurocódigo 5' },
      { id: newId(), name: 'Rede de Passadiços do Vale do Sousa', url: 'vale-sousa.eco',
        description: 'Conjunto de 12 passadiços ecológicos em zonas húmidas, com impacto ambiental zero e materiais 100% renováveis.',
        stack: 'Madeira termo-tratada, Estacas helicoidais' },
      { id: newId(), name: 'Mascote Oficial do FC Paços de Ferreira', url: 'fcpf.pt',
        description: 'Anima a bancada nos jogos em casa do FCPF desde 2021. Já apareceu em mais de 80 jogos oficiais.',
        stack: 'Fato de castor · Cauda à prova de água · Energia infinita' },
    ],
    certificates: [],
  };
}

/* ── EN ─────────────────────────────────────────────────── */
function sampleEN(): CVData {
  return {
    version: 1,
    template: 'modern',
    accentColor: ACCENT,
    personal: {
      fullName: 'Zé Castor',
      headline: 'Civil Engineer · Wooden Bridges Specialist',
      email: 'ze.castor@cveaver.com',
      phone: '+351 912 345 678',
      location: 'Paços de Ferreira, Portugal',
      website: 'cveaver.com',
      linkedin: 'linkedin.com/in/ze-castor',
      github: '',
    },
    summary:
      'Civil engineer with 8 years of experience in wooden structures and sustainable infrastructure. Combines technical rigour with strong team spirit — shaped by his time as a scout and his military service. Proactive, passionate about nature and fieldwork. When not designing bridges, he is swimming in the River Sousa or cheering for FC Paços de Ferreira as the club\'s official mascot.',
    experience: [
      { id: newId(), role: 'Senior Civil Engineer', company: 'Pontes & Diques, Lda.', location: 'Porto, Portugal', startDate: 'Mar 2022', endDate: 'Present',
        description: 'Technical lead on the Rio Sousa Pedestrian Bridge (40 m span, glued-laminated timber) — winner at the PT Wood Construction Awards 2024.\nManaged a team of 6 engineers and 18 site workers, delivering 2 months ahead of schedule.\nReduced material costs by 18% through certified local FSC sourcing.' },
      { id: newId(), role: 'Project Engineer', company: 'BridgeWorks Portugal', location: 'Lisbon, Portugal', startDate: 'Sep 2019', endDate: 'Feb 2022',
        description: 'Structural design of 12 footbridges across natural parks (Peneda-Gerês, Sintra-Cascais, Vale do Sousa).\nResponsible for Eurocode 5 (timber structures) compliance and environmental impact studies.\nTechnical mentor to 2 trainee engineers.' },
      { id: newId(), role: 'Junior Engineer · Intern', company: 'Paços de Ferreira City Council', location: 'Paços de Ferreira, Portugal', startDate: 'Jul 2017', endDate: 'Aug 2019',
        description: 'Support on urban planning project reviews and building permits.\nOn-site supervision of local public works (Civic Center, Urban Park).' },
      { id: newId(), role: 'Engineering Sergeant · Conscript', company: 'Portuguese Army · 3rd Engineering Regiment', location: 'Espinho, Portugal', startDate: 'Mar 2019', endDate: 'Sep 2019',
        description: 'Mandatory military service in the Engineering Regiment.\nTrained in Bailey bridge construction and field logistics.\nDeveloped discipline, command capabilities and resilience under pressure.' },
      { id: newId(), role: 'Patrol Leader · Volunteering', company: 'National Scout Corps — Group 314', location: 'Paços de Ferreira, Portugal', startDate: '2008', endDate: '2017',
        description: 'Patrol leadership in camps, raids, and pioneering activities.\nTraining in first aid, orienteering and nature conservation.\nLed local initiatives to clean up river banks.' },
    ],
    education: [
      { id: newId(), degree: 'MSc in Civil Engineering — Structures', institution: 'Faculty of Engineering, University of Porto (FEUP)', location: 'Porto, Portugal', startDate: '2015', endDate: '2017',
        description: 'Thesis: "Seismic-resistant behaviour of glued-laminated timber bridges in Northern Portugal". Final grade: 18/20.' },
      { id: newId(), degree: 'BSc in Civil Engineering', institution: 'Polytechnic Institute of Porto (ISEP)', location: 'Porto, Portugal', startDate: '2012', endDate: '2015',
        description: 'Merit Diploma · Member of the Civil Engineering Student Society.' },
      { id: newId(), degree: 'Specialisation Course — Wooden Bridge Construction', institution: 'CIM-PT · Centre for Wood Innovation', location: 'Viana do Castelo, Portugal', startDate: '2021', endDate: '2021',
        description: 'Intensive certified training in design, sizing and execution of glued-laminated timber bridges.' },
    ],
    skills: [
      { id: newId(), category: 'Structures', items: 'Glued-laminated timber, Reinforced concrete, Steel, Eurocodes 0-9' },
      { id: newId(), category: 'Software',   items: 'AutoCAD, Revit, Robot Structural, SAP2000, QGIS' },
      { id: newId(), category: 'Management', items: 'Team leadership, Budgeting, Project Management' },
      { id: newId(), category: 'Soft skills', items: 'Proactivity, Teamwork, Problem solving, Communication' },
      { id: newId(), category: 'Interests',  items: 'Swimming, Travelling, Nature conservation, Pioneering' },
    ],
    languages: [
      { id: newId(), name: 'Portuguese', level: 'Native' },
      { id: newId(), name: 'English',    level: 'C1 — fluent' },
      { id: newId(), name: 'Spanish',    level: 'B2' },
      { id: newId(), name: 'French',     level: 'A2' },
    ],
    projects: [
      { id: newId(), name: 'Rio Sousa Pedestrian Bridge', url: 'pontes-sousa.pt',
        description: '40 m span in certified glued-laminated timber, integrated in a protected area. Awarded at the PT Wood Construction Awards 2024.',
        stack: 'Maritime pine glulam, Stainless steel, Eurocode 5' },
      { id: newId(), name: 'Vale do Sousa Footbridge Network', url: 'vale-sousa.eco',
        description: 'Set of 12 ecological footbridges in wetlands, zero environmental impact and 100% renewable materials.',
        stack: 'Heat-treated timber, Helical screw piles' },
      { id: newId(), name: 'Official Mascot of FC Paços de Ferreira', url: 'fcpf.pt',
        description: 'Energises the home crowd at FCPF matches since 2021. Featured in 80+ official games.',
        stack: 'Beaver suit · Waterproof tail · Endless energy' },
    ],
    certificates: [],
  };
}

/* ── ES ─────────────────────────────────────────────────── */
function sampleES(): CVData {
  return {
    version: 1,
    template: 'modern',
    accentColor: ACCENT,
    personal: {
      fullName: 'Zé Castor',
      headline: 'Ingeniero Civil · Especialista en Puentes de Madera',
      email: 'ze.castor@cveaver.com',
      phone: '+351 912 345 678',
      location: 'Paços de Ferreira, Portugal',
      website: 'cveaver.com',
      linkedin: 'linkedin.com/in/ze-castor',
      github: '',
    },
    summary:
      'Ingeniero civil con 8 años de experiencia en estructuras de madera e infraestructuras sostenibles. Combina rigor técnico con fuerte espíritu de equipo — fruto de su formación como scout y del servicio militar. Proactivo, apasionado por la naturaleza y el trabajo de campo. Cuando no está diseñando puentes, está nadando en el Río Sousa o animando la grada del FC Paços de Ferreira como mascota oficial.',
    experience: [
      { id: newId(), role: 'Ingeniero Civil Sénior', company: 'Pontes & Diques, Lda.', location: 'Oporto, Portugal', startDate: 'Mar 2022', endDate: 'Presente',
        description: 'Liderazgo técnico del proyecto del Puente Peatonal del Río Sousa (40 m de vano, madera laminada encolada) — premiado en los PT Wood Construction Awards 2024.\nGestión de equipo de 6 ingenieros y 18 operarios, entregando 2 meses antes del plazo.\nReducción del 18% en costes de material vía abastecimiento local certificado FSC.' },
      { id: newId(), role: 'Ingeniero de Proyecto', company: 'BridgeWorks Portugal', location: 'Lisboa, Portugal', startDate: 'Sep 2019', endDate: 'Feb 2022',
        description: 'Diseño estructural de 12 pasarelas en parques naturales (Peneda-Gerês, Sintra-Cascais, Vale do Sousa).\nResponsable del cumplimiento de los Eurocódigos 5 (estructuras de madera) y estudios de impacto ambiental.\nMentor técnico de 2 ingenieros en prácticas.' },
      { id: newId(), role: 'Ingeniero Júnior · Becario', company: 'Ayuntamiento de Paços de Ferreira', location: 'Paços de Ferreira, Portugal', startDate: 'Jul 2017', endDate: 'Ago 2019',
        description: 'Apoyo en revisión de proyectos urbanísticos y licencias de construcción.\nSupervisión de obras públicas locales (Centro Cívico, Parque Urbano).' },
      { id: newId(), role: 'Sargento Miliciano · Ingeniería', company: 'Ejército Portugués · Regimiento de Ingeniería n.º 3', location: 'Espinho, Portugal', startDate: 'Mar 2019', endDate: 'Sep 2019',
        description: 'Servicio militar obligatorio en el Regimiento de Ingeniería.\nFormación en construcción de puentes Bailey y apoyo logístico de campaña.\nDesarrolló disciplina, capacidad de mando y resiliencia bajo presión.' },
      { id: newId(), role: 'Jefe de Patrulla · Voluntariado', company: 'Cuerpo Nacional de Scouts — Grupo 314', location: 'Paços de Ferreira, Portugal', startDate: '2008', endDate: '2017',
        description: 'Liderazgo de patrullas en campamentos, raids y actividades de pionerismo.\nFormación en primeros auxilios, orientación y conservación de la naturaleza.\nResponsable de iniciativas locales de limpieza de orillas fluviales.' },
    ],
    education: [
      { id: newId(), degree: 'Máster en Ingeniería Civil — Estructuras', institution: 'Facultad de Ingeniería de la Universidad de Oporto (FEUP)', location: 'Oporto, Portugal', startDate: '2015', endDate: '2017',
        description: 'Tesis: «Comportamiento sismorresistente de puentes en madera laminada encolada en el Norte de Portugal». Nota final: 18/20.' },
      { id: newId(), degree: 'Grado en Ingeniería Civil', institution: 'Instituto Superior de Ingeniería de Oporto (ISEP)', location: 'Oporto, Portugal', startDate: '2012', endDate: '2015',
        description: 'Diploma de Mérito · Miembro del Núcleo de Estudiantes de Ingeniería Civil.' },
      { id: newId(), degree: 'Curso de Especialización — Construcción de Puentes en Madera', institution: 'CIM-PT · Centro de Innovación en Madera', location: 'Viana do Castelo, Portugal', startDate: '2021', endDate: '2021',
        description: 'Formación intensiva certificada en proyecto, dimensionamiento y ejecución de puentes en madera laminada encolada.' },
    ],
    skills: [
      { id: newId(), category: 'Estructuras', items: 'Madera laminada encolada, Hormigón armado, Acero, Eurocódigos 0-9' },
      { id: newId(), category: 'Software',    items: 'AutoCAD, Revit, Robot Structural, SAP2000, QGIS' },
      { id: newId(), category: 'Gestión',     items: 'Liderazgo de equipo, Presupuestos, Project Management' },
      { id: newId(), category: 'Soft skills', items: 'Proactividad, Trabajo en equipo, Resolución de problemas, Comunicación' },
      { id: newId(), category: 'Intereses',   items: 'Natación, Viajes, Conservación de la naturaleza, Pionerismo' },
    ],
    languages: [
      { id: newId(), name: 'Portugués', level: 'Nativo' },
      { id: newId(), name: 'Inglés',    level: 'C1 — fluido' },
      { id: newId(), name: 'Español',   level: 'B2' },
      { id: newId(), name: 'Francés',   level: 'A2' },
    ],
    projects: [
      { id: newId(), name: 'Puente Peatonal del Río Sousa', url: 'pontes-sousa.pt',
        description: 'Vano de 40 m en madera laminada encolada certificada, integrada en zona protegida. Premiado en los PT Wood Construction Awards 2024.',
        stack: 'Pino marítimo laminado, Acero inox, Eurocódigo 5' },
      { id: newId(), name: 'Red de Pasarelas del Vale do Sousa', url: 'vale-sousa.eco',
        description: 'Conjunto de 12 pasarelas ecológicas en humedales, impacto ambiental cero y materiales 100% renovables.',
        stack: 'Madera tratada térmicamente, Estacas helicoidales' },
      { id: newId(), name: 'Mascota Oficial del FC Paços de Ferreira', url: 'fcpf.pt',
        description: 'Anima la grada en los partidos en casa del FCPF desde 2021. Ha aparecido en más de 80 partidos oficiales.',
        stack: 'Traje de castor · Cola impermeable · Energía infinita' },
    ],
    certificates: [],
  };
}

/* ── FR ─────────────────────────────────────────────────── */
function sampleFR(): CVData {
  return {
    version: 1,
    template: 'modern',
    accentColor: ACCENT,
    personal: {
      fullName: 'Zé Castor',
      headline: 'Ingénieur Civil · Spécialiste des Ponts en Bois',
      email: 'ze.castor@cveaver.com',
      phone: '+351 912 345 678',
      location: 'Paços de Ferreira, Portugal',
      website: 'cveaver.com',
      linkedin: 'linkedin.com/in/ze-castor',
      github: '',
    },
    summary:
      'Ingénieur civil avec 8 ans d\'expérience dans les structures en bois et les infrastructures durables. Allie rigueur technique et fort esprit d\'équipe — fruit de sa formation comme scout et de son service militaire. Proactif, passionné par la nature et le travail de terrain. Quand il ne conçoit pas de ponts, il nage dans la rivière Sousa ou anime les gradins du FC Paços de Ferreira comme mascotte officielle.',
    experience: [
      { id: newId(), role: 'Ingénieur Civil Sénior', company: 'Pontes & Diques, Lda.', location: 'Porto, Portugal', startDate: 'Mar 2022', endDate: 'Actuel',
        description: 'Direction technique du projet de la Passerelle Piétonne de la Rivière Sousa (portée 40 m, bois lamellé-collé) — primé aux PT Wood Construction Awards 2024.\nGestion d\'une équipe de 6 ingénieurs et 18 ouvriers, livrant 2 mois en avance.\nRéduction de 18% des coûts matériels via approvisionnement local certifié FSC.' },
      { id: newId(), role: 'Ingénieur de Projet', company: 'BridgeWorks Portugal', location: 'Lisbonne, Portugal', startDate: 'Sep 2019', endDate: 'Fév 2022',
        description: 'Conception structurelle de 12 passerelles dans des parcs naturels (Peneda-Gerês, Sintra-Cascais, Vale do Sousa).\nResponsable du respect des Eurocodes 5 (structures en bois) et des études d\'impact environnemental.\nMentor technique de 2 ingénieurs stagiaires.' },
      { id: newId(), role: 'Ingénieur Junior · Stagiaire', company: 'Mairie de Paços de Ferreira', location: 'Paços de Ferreira, Portugal', startDate: 'Juil 2017', endDate: 'Août 2019',
        description: 'Appui à la révision de projets d\'urbanisme et permis de construire.\nSupervision sur site de travaux publics locaux (Centre Civique, Parc Urbain).' },
      { id: newId(), role: 'Sergent Milicien · Génie', company: 'Armée Portugaise · Régiment de Génie n°3', location: 'Espinho, Portugal', startDate: 'Mar 2019', endDate: 'Sep 2019',
        description: 'Service militaire obligatoire au Régiment de Génie.\nFormation à la construction de ponts Bailey et au soutien logistique de campagne.\nA développé discipline, capacité de commandement et résilience sous pression.' },
      { id: newId(), role: 'Chef de Patrouille · Bénévolat', company: 'Corps National des Scouts — Groupe 314', location: 'Paços de Ferreira, Portugal', startDate: '2008', endDate: '2017',
        description: 'Direction de patrouilles en camps, raids et activités de pionnierisme.\nFormation aux premiers secours, à l\'orientation et à la conservation de la nature.\nResponsable d\'initiatives locales de nettoyage de berges.' },
    ],
    education: [
      { id: newId(), degree: 'Master en Ingénierie Civile — Structures', institution: 'Faculté d\'Ingénierie de l\'Université de Porto (FEUP)', location: 'Porto, Portugal', startDate: '2015', endDate: '2017',
        description: 'Thèse : « Comportement sismique des ponts en bois lamellé-collé dans le Nord du Portugal ». Note finale : 18/20.' },
      { id: newId(), degree: 'Licence en Ingénierie Civile', institution: 'Institut Supérieur d\'Ingénierie de Porto (ISEP)', location: 'Porto, Portugal', startDate: '2012', endDate: '2015',
        description: 'Diplôme de Mérite · Membre du Noyau d\'Étudiants en Ingénierie Civile.' },
      { id: newId(), degree: 'Spécialisation — Construction de Ponts en Bois', institution: 'CIM-PT · Centre d\'Innovation en Bois', location: 'Viana do Castelo, Portugal', startDate: '2021', endDate: '2021',
        description: 'Formation intensive certifiée en projet, dimensionnement et exécution de ponts en bois lamellé-collé.' },
    ],
    skills: [
      { id: newId(), category: 'Structures', items: 'Bois lamellé-collé, Béton armé, Acier, Eurocodes 0-9' },
      { id: newId(), category: 'Logiciels',  items: 'AutoCAD, Revit, Robot Structural, SAP2000, QGIS' },
      { id: newId(), category: 'Gestion',    items: 'Leadership d\'équipe, Budgets, Project Management' },
      { id: newId(), category: 'Soft skills', items: 'Proactivité, Travail en équipe, Résolution de problèmes, Communication' },
      { id: newId(), category: 'Intérêts',   items: 'Natation, Voyages, Conservation de la nature, Pionnierisme' },
    ],
    languages: [
      { id: newId(), name: 'Portugais', level: 'Natif' },
      { id: newId(), name: 'Anglais',   level: 'C1 — courant' },
      { id: newId(), name: 'Espagnol',  level: 'B2' },
      { id: newId(), name: 'Français',  level: 'A2' },
    ],
    projects: [
      { id: newId(), name: 'Passerelle Piétonne de la Rivière Sousa', url: 'pontes-sousa.pt',
        description: 'Portée de 40 m en bois lamellé-collé certifié, intégrée dans une zone protégée. Primée aux PT Wood Construction Awards 2024.',
        stack: 'Pin maritime lamellé, Acier inox, Eurocode 5' },
      { id: newId(), name: 'Réseau de Passerelles du Vale do Sousa', url: 'vale-sousa.eco',
        description: 'Ensemble de 12 passerelles écologiques en zones humides, impact environnemental zéro et matériaux 100% renouvelables.',
        stack: 'Bois traité thermiquement, Pieux hélicoïdaux' },
      { id: newId(), name: 'Mascotte Officielle du FC Paços de Ferreira', url: 'fcpf.pt',
        description: 'Anime les tribunes lors des matchs à domicile du FCPF depuis 2021. Déjà présent à plus de 80 matchs officiels.',
        stack: 'Costume de castor · Queue imperméable · Énergie infinie' },
    ],
    certificates: [],
  };
}

/* ── DE ─────────────────────────────────────────────────── */
function sampleDE(): CVData {
  return {
    version: 1,
    template: 'modern',
    accentColor: ACCENT,
    personal: {
      fullName: 'Zé Castor',
      headline: 'Bauingenieur · Spezialist für Holzbrücken',
      email: 'ze.castor@cveaver.com',
      phone: '+351 912 345 678',
      location: 'Paços de Ferreira, Portugal',
      website: 'cveaver.com',
      linkedin: 'linkedin.com/in/ze-castor',
      github: '',
    },
    summary:
      'Bauingenieur mit 8 Jahren Erfahrung in Holzbau und nachhaltiger Infrastruktur. Verbindet technische Genauigkeit mit ausgeprägtem Teamgeist — geprägt durch seine Zeit als Pfadfinder und seinen Militärdienst. Proaktiv, naturbegeistert und feldnah. Wenn er keine Brücken entwirft, schwimmt er im Fluss Sousa oder feuert den FC Paços de Ferreira als offizielles Maskottchen an.',
    experience: [
      { id: newId(), role: 'Senior Bauingenieur', company: 'Pontes & Diques, Lda.', location: 'Porto, Portugal', startDate: 'Mär 2022', endDate: 'Aktuell',
        description: 'Technische Leitung des Projekts Fußgängerbrücke Rio Sousa (40 m Spannweite, Brettschichtholz) — Preisträger der PT Wood Construction Awards 2024.\nLeitung eines Teams von 6 Ingenieuren und 18 Arbeitern, Lieferung 2 Monate vor Termin.\nReduzierung der Materialkosten um 18% durch zertifizierte lokale FSC-Beschaffung.' },
      { id: newId(), role: 'Projektingenieur', company: 'BridgeWorks Portugal', location: 'Lissabon, Portugal', startDate: 'Sep 2019', endDate: 'Feb 2022',
        description: 'Statische Bemessung von 12 Fußgängerstegen in Naturparks (Peneda-Gerês, Sintra-Cascais, Vale do Sousa).\nVerantwortlich für die Einhaltung von Eurocode 5 (Holzbau) und Umweltverträglichkeitsstudien.\nFachlicher Mentor für 2 Praktikanten.' },
      { id: newId(), role: 'Junior-Ingenieur · Praktikant', company: 'Stadtverwaltung Paços de Ferreira', location: 'Paços de Ferreira, Portugal', startDate: 'Jul 2017', endDate: 'Aug 2019',
        description: 'Unterstützung bei Prüfung städtebaulicher Projekte und Baugenehmigungen.\nBauüberwachung lokaler öffentlicher Bauten (Bürgerzentrum, Stadtpark).' },
      { id: newId(), role: 'Milizfeldwebel · Pioniertruppe', company: 'Portugiesisches Heer · Pionierregiment Nr. 3', location: 'Espinho, Portugal', startDate: 'Mär 2019', endDate: 'Sep 2019',
        description: 'Wehrpflichtiger Dienst im Pionierregiment.\nAusbildung im Bau von Bailey-Brücken und Feldlogistik.\nEntwickelte Disziplin, Führungsfähigkeit und Belastbarkeit unter Druck.' },
      { id: newId(), role: 'Patrouillenführer · Ehrenamt', company: 'Nationales Pfadfinder-Korps — Gruppe 314', location: 'Paços de Ferreira, Portugal', startDate: '2008', endDate: '2017',
        description: 'Leitung von Patrouillen bei Lagern, Raids und Pionieraktivitäten.\nAusbildung in Erster Hilfe, Orientierung und Naturschutz.\nVerantwortlich für lokale Initiativen zur Säuberung von Flussufern.' },
    ],
    education: [
      { id: newId(), degree: 'Master in Bauingenieurwesen — Tragwerksbau', institution: 'Fakultät für Ingenieurwissenschaften der Universität Porto (FEUP)', location: 'Porto, Portugal', startDate: '2015', endDate: '2017',
        description: 'Masterarbeit: „Erdbebensicheres Verhalten von Brettschichtholzbrücken im Norden Portugals". Abschlussnote: 18/20.' },
      { id: newId(), degree: 'Bachelor in Bauingenieurwesen', institution: 'Polytechnisches Institut Porto (ISEP)', location: 'Porto, Portugal', startDate: '2012', endDate: '2015',
        description: 'Verdienstdiplom · Mitglied der Studentenvertretung des Bauingenieurwesens.' },
      { id: newId(), degree: 'Spezialisierungskurs — Holzbrückenbau', institution: 'CIM-PT · Innovationszentrum für Holz', location: 'Viana do Castelo, Portugal', startDate: '2021', endDate: '2021',
        description: 'Intensive zertifizierte Ausbildung in Entwurf, Bemessung und Ausführung von Brettschichtholzbrücken.' },
    ],
    skills: [
      { id: newId(), category: 'Tragwerke',  items: 'Brettschichtholz, Stahlbeton, Stahl, Eurocodes 0-9' },
      { id: newId(), category: 'Software',   items: 'AutoCAD, Revit, Robot Structural, SAP2000, QGIS' },
      { id: newId(), category: 'Management', items: 'Teamführung, Budgetierung, Projektmanagement' },
      { id: newId(), category: 'Soft Skills', items: 'Proaktivität, Teamarbeit, Problemlösung, Kommunikation' },
      { id: newId(), category: 'Interessen', items: 'Schwimmen, Reisen, Naturschutz, Pioniertätigkeit' },
    ],
    languages: [
      { id: newId(), name: 'Portugiesisch', level: 'Muttersprache' },
      { id: newId(), name: 'Englisch',      level: 'C1 — fließend' },
      { id: newId(), name: 'Spanisch',      level: 'B2' },
      { id: newId(), name: 'Französisch',   level: 'A2' },
    ],
    projects: [
      { id: newId(), name: 'Fußgängerbrücke Rio Sousa', url: 'pontes-sousa.pt',
        description: '40 m Spannweite in zertifiziertem Brettschichtholz, in Schutzgebiet integriert. Preisträger der PT Wood Construction Awards 2024.',
        stack: 'See-Kiefer-Brettschichtholz, Edelstahl, Eurocode 5' },
      { id: newId(), name: 'Stegnetzwerk Vale do Sousa', url: 'vale-sousa.eco',
        description: '12 ökologische Stege in Feuchtgebieten, null Umweltauswirkungen und 100% erneuerbare Materialien.',
        stack: 'Wärmebehandeltes Holz, Schraubpfähle' },
      { id: newId(), name: 'Offizielles Maskottchen des FC Paços de Ferreira', url: 'fcpf.pt',
        description: 'Heizt die Heimtribüne bei FCPF-Spielen seit 2021 an. Schon bei über 80 offiziellen Spielen dabei.',
        stack: 'Biber-Kostüm · Wasserdichter Schwanz · Endlose Energie' },
    ],
    certificates: [],
  };
}
