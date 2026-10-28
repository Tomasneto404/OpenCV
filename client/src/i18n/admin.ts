import { useT } from './index';
const en = {
  admin: 'Administration', intro: 'Manage access and see how OpenCV is being used.', overview: 'Overview',
  users: 'Registered users', active24h: 'Active users · 24h', active30d: 'Active users · 30 days', savedCVs: 'Saved CVs',
  pdfExports: 'PDFs issued', visits: 'Visits', pageViews: 'Page views', local: 'Email / password', sso: 'SSO',
  guests: 'Public editor', members: 'Signed in', total: 'Total', since: 'Analytics since',
  analyticsHint: 'A visit is a browser session with up to 30 minutes of inactivity, not a unique person. Active users are signed-in accounts. PDFs count successful exports, including repeat downloads. Dates use UTC. No IP addresses, referrers or CV contents are collected for analytics. Visit tracking respects Do Not Track and Global Privacy Control.',
  daily: 'Daily activity · last 30 days', metric: 'Show metric', active: 'Active users', registrations: 'New accounts', date: 'Date',
  settings: 'Registration settings', registration: 'Allow new registrations',
  registrationHint: 'Applies to email registration and new SSO accounts. Existing users and valid invitations can still sign in or register. The public editor always stays available.',
  enabled: 'Open', disabled: 'Invitation only', saved: 'Settings saved', refresh: 'Refresh',
  invitations: 'Invitations', inviteHint: 'Create a single-use link tied to an email, valid for 7 days. Share it directly; no email is sent. The most recent 50 invitations are shown.',
  invite: 'Create invitation', inviteEmail: 'Invitation email', inviteLink: 'Invitation link', copy: 'Copy link', copied: 'Link copied',
  linkHint: 'Copy this link now. It will not be shown again after leaving this page.', revoke: 'Revoke',
  pending: 'Pending', used: 'Accepted', revoked: 'Revoked', expired: 'Expired', expires: 'Expires', status: 'Status', noInvites: 'No invitations yet.',
  search: 'Search users by name or email', name: 'Name', email: 'Email', role: 'Role', administrator: 'Administrator', member: 'User',
  method: 'Sign-in method', joined: 'Registered', lastSeen: 'Last active', never: 'No activity yet', noUsers: 'No matching users.',
  previous: 'Previous', next: 'Next', page: 'Page', of: 'of', private: 'The directory shows account details and CV counts. Personal CV contents remain private.',
  forbidden: 'This page is only available to the administrator.', closed: 'New registrations are currently invitation only. You can still sign in or use the public editor.',
  invited: 'You have been invited to OpenCV.', checking: 'Checking invitation…', invalid_invitation: 'This invitation is invalid, expired, revoked, already used, or belongs to another email. Ask the administrator for a new link.',
  registration_closed: 'New registrations are currently invitation only.', admin_required: 'Administrator access is required.', invalid_email: 'Enter a valid email.',
  invalid_settings: 'Check the registration settings.', invitation_unavailable: 'This invitation has already been used or revoked.',
};
const pt: typeof en = {
  admin: 'Administração', intro: 'Gere os acessos e acompanha a utilização do OpenCV.', overview: 'Vista geral',
  users: 'Utilizadores registados', active24h: 'Utilizadores ativos · 24h', active30d: 'Utilizadores ativos · 30 dias', savedCVs: 'CVs guardados',
  pdfExports: 'PDFs emitidos', visits: 'Visitas', pageViews: 'Páginas vistas', local: 'Email / palavra-passe', sso: 'SSO',
  guests: 'Editor público', members: 'Com sessão iniciada', total: 'Total', since: 'Analytics desde',
  analyticsHint: 'Uma visita é uma sessão de browser com até 30 minutos de inatividade, não uma pessoa única. Os utilizadores ativos têm sessão iniciada. Os PDFs contam exportações bem-sucedidas, incluindo downloads repetidos. As datas usam UTC. Os analytics não recolhem IPs, referências de origem nem conteúdos dos CVs. As visitas respeitam Do Not Track e Global Privacy Control.',
  daily: 'Atividade diária · últimos 30 dias', metric: 'Mostrar métrica', active: 'Utilizadores ativos', registrations: 'Novas contas', date: 'Data',
  settings: 'Definições de registo', registration: 'Permitir novos registos',
  registrationHint: 'Aplica-se ao registo por email e a novas contas SSO. Os utilizadores existentes e convites válidos continuam a poder entrar ou registar-se. O editor público está sempre disponível.',
  enabled: 'Aberto', disabled: 'Apenas por convite', saved: 'Definições guardadas', refresh: 'Atualizar',
  invitations: 'Convites', inviteHint: 'Cria um link de utilização única associado a um email, válido durante 7 dias. Partilha-o diretamente; não é enviado nenhum email. São apresentados os 50 convites mais recentes.',
  invite: 'Criar convite', inviteEmail: 'Email do convite', inviteLink: 'Link do convite', copy: 'Copiar link', copied: 'Link copiado',
  linkHint: 'Copia este link agora. Não voltará a ser mostrado depois de saíres desta página.', revoke: 'Revogar',
  pending: 'Pendente', used: 'Aceite', revoked: 'Revogado', expired: 'Expirado', expires: 'Expira', status: 'Estado', noInvites: 'Ainda não existem convites.',
  search: 'Pesquisar utilizadores por nome ou email', name: 'Nome', email: 'Email', role: 'Papel', administrator: 'Administrador', member: 'Utilizador',
  method: 'Método de login', joined: 'Registo', lastSeen: 'Última atividade', never: 'Ainda sem atividade', noUsers: 'Nenhum utilizador encontrado.',
  previous: 'Anterior', next: 'Seguinte', page: 'Página', of: 'de', private: 'A lista mostra os dados da conta e o número de CVs. O conteúdo dos CVs pessoais mantém-se privado.',
  forbidden: 'Esta página está disponível apenas para o administrador.', closed: 'Os novos registos estão limitados a convites. Podes entrar na tua conta ou usar o editor público.',
  invited: 'Recebeste um convite para o OpenCV.', checking: 'A verificar o convite…', invalid_invitation: 'Este convite é inválido, expirou, foi revogado, já foi usado ou pertence a outro email. Pede um novo link ao administrador.',
  registration_closed: 'Os novos registos estão limitados a convites.', admin_required: 'É necessário acesso de administrador.', invalid_email: 'Indica um email válido.',
  invalid_settings: 'Verifica as definições de registo.', invitation_unavailable: 'Este convite já foi usado ou revogado.',
};
const es: typeof en = { ...en, admin: 'Administración', users: 'Usuarios registrados', savedCVs: 'CV guardados', pdfExports: 'PDF emitidos', visits: 'Visitas', pageViews: 'Páginas vistas', settings: 'Ajustes de registro', registration: 'Permitir nuevos registros', invitations: 'Invitaciones', invite: 'Crear invitación', search: 'Buscar usuarios por nombre o email', refresh: 'Actualizar', closed: 'Los nuevos registros requieren invitación. Puedes iniciar sesión o usar el editor público.', registration_closed: 'Los nuevos registros requieren invitación.', invalid_invitation: 'Invitación inválida, caducada, revocada, utilizada o para otro email. Solicita un nuevo enlace.' };
const fr: typeof en = { ...en, admin: 'Administration', users: 'Utilisateurs inscrits', savedCVs: 'CV enregistrés', pdfExports: 'PDF générés', visits: 'Visites', pageViews: 'Pages vues', settings: 'Paramètres d’inscription', registration: 'Autoriser les inscriptions', invitations: 'Invitations', invite: 'Créer une invitation', search: 'Rechercher par nom ou email', refresh: 'Actualiser', closed: 'Les inscriptions se font sur invitation. Vous pouvez vous connecter ou utiliser l’éditeur public.', registration_closed: 'Les inscriptions se font sur invitation.', invalid_invitation: 'Invitation invalide, expirée, révoquée, utilisée ou pour un autre email. Demandez un nouveau lien.' };
const de: typeof en = { ...en, admin: 'Verwaltung', users: 'Registrierte Nutzer', savedCVs: 'Gespeicherte Lebensläufe', pdfExports: 'Erstellte PDFs', visits: 'Besuche', pageViews: 'Seitenaufrufe', settings: 'Registrierungseinstellungen', registration: 'Neue Registrierungen erlauben', invitations: 'Einladungen', invite: 'Einladung erstellen', search: 'Nutzer nach Name oder E-Mail suchen', refresh: 'Aktualisieren', closed: 'Neue Registrierungen benötigen eine Einladung. Anmeldung und öffentlicher Editor bleiben verfügbar.', registration_closed: 'Neue Registrierungen benötigen eine Einladung.', invalid_invitation: 'Einladung ungültig, abgelaufen, widerrufen, benutzt oder für eine andere E-Mail. Bitte einen neuen Link anfordern.' };
export function useAdminCopy() { const { locale } = useT(); return { en, pt, es, fr, de }[locale]; }
