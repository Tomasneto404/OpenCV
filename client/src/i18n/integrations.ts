import { useT } from './index';
const en = {
  title: 'SSO and notifications', intro: 'Configure your identity provider and notification services. Changes apply immediately without restarting.',
  sso: 'Single sign-on · OpenID Connect', enableSSO: 'Enable SSO', issuer: 'Issuer URL', clientId: 'Client ID', clientSecret: 'Client secret', label: 'Sign-in button label', callback: 'Redirect / callback URL',
  callbackHint: 'Register this exact callback URL with your identity provider. APP_URL sets the public address of this installation.',
  secretHint: 'Saved secrets are never displayed. Leave secret fields blank to keep their current values.', configured: 'Saved · leave blank to keep', save: 'Save configuration', saved: 'Configuration saved',
  notifications: 'Notifications', notificationsHint: 'Choose services and events. Messages contain only the event type, never names, emails or CV contents. Delivery is best effort and does not block the editor.',
  enable: 'Enable notifications', webhook: 'Discord webhook URL', token: 'Access token', botToken: 'Telegram bot token', chat: 'Telegram chat ID', url: 'Server URL', topic: 'Topic',
  events: 'Notify me about', registration: 'New accounts', pdf_export: 'PDF exports', test: 'Send test notification', testing: 'Sending…', tested: 'Test notification delivered',
  testHint: 'Save first. The test sends a real message using the saved configuration.', lastDelivery: 'Last delivery', delivered: 'Delivered', failed: 'Delivery failed', noDelivery: 'No delivery attempts yet',
  removeToken: 'Remove saved token', ntfyHint: 'Use the ntfy base URL (for example https://ntfy.sh) and topic. Tokens are optional for public topics.', gotifyHint: 'Use the Gotify base URL and an application token.',
  recovery: 'Administrator local sign-in', recoveryHint: 'Set up email/password access before changing SSO, so you can still administer this installation if the provider changes.', recoverySave: 'Enable local sign-in',
  invalid_integration: 'Check the URL, required fields and credentials.', oidc_https_required: 'The OIDC issuer must use HTTPS.', sso_admin_local_required: 'Enable local administrator sign-in before changing SSO.',
  notification_disabled: 'Enable and save this service before testing.', notification_failed: 'Delivery failed. Check the saved URL, credentials and destination permissions.', notification_busy: 'Too many notifications are pending. Try again shortly.',
};
const pt: typeof en = {
  title: 'SSO e notificações', intro: 'Configura o fornecedor de identidade e os serviços de notificações. As alterações são aplicadas imediatamente, sem reiniciar.',
  sso: 'Login único · OpenID Connect', enableSSO: 'Ativar SSO', issuer: 'URL do issuer', clientId: 'Client ID', clientSecret: 'Client secret', label: 'Texto do botão de login', callback: 'URL de redirecionamento / callback',
  callbackHint: 'Regista este URL de callback exato no fornecedor de identidade. APP_URL define o endereço público desta instalação.',
  secretHint: 'Os segredos guardados nunca são apresentados. Deixa os campos de segredos vazios para manter os valores atuais.', configured: 'Guardado · deixa vazio para manter', save: 'Guardar configuração', saved: 'Configuração guardada',
  notifications: 'Notificações', notificationsHint: 'Escolhe os serviços e eventos. As mensagens incluem apenas o tipo de evento, nunca nomes, emails ou conteúdos de CVs. O envio é feito em segundo plano e não bloqueia o editor; pode falhar se o serviço estiver indisponível.',
  enable: 'Ativar notificações', webhook: 'URL do webhook Discord', token: 'Token de acesso', botToken: 'Token do bot Telegram', chat: 'Chat ID do Telegram', url: 'URL do servidor', topic: 'Tópico',
  events: 'Notificar sobre', registration: 'Novas contas', pdf_export: 'Exportações de PDF', test: 'Enviar notificação de teste', testing: 'A enviar…', tested: 'Notificação de teste entregue',
  testHint: 'Guarda primeiro. O teste envia uma mensagem real com a configuração guardada.', lastDelivery: 'Último envio', delivered: 'Entregue', failed: 'Falha no envio', noDelivery: 'Ainda sem tentativas de envio',
  removeToken: 'Remover token guardado', ntfyHint: 'Indica o URL base do ntfy (por exemplo https://ntfy.sh) e o tópico. O token é opcional para tópicos públicos.', gotifyHint: 'Indica o URL base do Gotify e um token de aplicação.',
  recovery: 'Login local do administrador', recoveryHint: 'Configura acesso por email e palavra-passe antes de alterar o SSO, para continuares a administrar a instalação se o fornecedor mudar.', recoverySave: 'Ativar login local',
  invalid_integration: 'Verifica o URL, os campos obrigatórios e as credenciais.', oidc_https_required: 'O issuer OIDC tem de usar HTTPS.', sso_admin_local_required: 'Ativa o login local do administrador antes de alterar o SSO.',
  notification_disabled: 'Ativa e guarda este serviço antes de testar.', notification_failed: 'O envio falhou. Verifica o URL guardado, as credenciais e as permissões do destino.', notification_busy: 'Existem demasiadas notificações pendentes. Tenta novamente dentro de instantes.',
};
export function useIntegrationCopy() { const { locale } = useT(); return locale === 'pt' ? pt : en; }
