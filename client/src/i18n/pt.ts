/**
 * Portuguese (PT-PT) — source-of-truth dictionary.
 *
 * Other locales (en/es/fr/de) are imported with the same structure; TS will
 * complain if any key is missing.
 *
 * Convention:
 *   - Nested objects group strings by feature/page.
 *   - Keys are short kebab-ish identifiers.
 *   - Strings may contain {placeholders} replaced at runtime by t(key, vars).
 *
 * From Sessão 22 we no longer surface ANY mention of "signature", "Ed25519",
 * "key id", "hash", or "config embedded in the PDF" to the user. Those are
 * internal-only. If you find a new string referencing them, rephrase it.
 */
export const dict = {
  common: {
    back: 'Voltar',
    cancel: 'Cancelar',
    close: 'Fechar',
    confirm: 'Confirmar',
    loading: 'A carregar...',
    save: 'Guardar',
    delete: 'Apagar',
    edit: 'Editar',
    add: 'Adicionar',
    remove: 'Remover',
    optional: 'opcional',
    yes: 'Sim',
    no: 'Não',
    saved: 'Guardado',
    saving: 'A guardar...',
    new: 'Novo',
    update: 'Atualizar',
  },

  app: {
    title: 'CVeaver',
    tagline: 'Gera o teu CV em minutos',
  },

  landing: {
    nav: {
      howItWorks: 'Como funciona',
      support: 'Suporte',
      faq: 'FAQ',
      terms: 'Termos',
    },
    hero: {
      badge: 'Sem registo · Sem subscrição · Sem PII guardado',
      title: 'O teu CV,',
      titleAccent: 'pronto em minutos',
      subtitle: 'Preenche o formulário, vê o preview ao vivo, paga {price} e descarrega o PDF — também recebes uma cópia por email. Atualiza mais tarde por apenas {updatePrice}.',
      ctaCreate: 'Criar CV agora — {price}',
      ctaSample: 'Ver exemplo preenchido',
      feature1: 'Cartão',
      feature2: 'Multibanco',
      feature3: 'MB WAY',
      feature4: 'Recebes por email',
    },
    pricing: {
      newLabel: 'Novo',
      newTitle: 'Criar CV do zero',
      newBody: 'Começa com um template premium. Edita tudo no formulário, vês o preview ao vivo, pagas e levas PDF — também enviado por email.',
      newCta: 'Começar',
      updateLabel: 'Atualizar',
      updateTitle: 'Já tens um CV CVeaver?',
      updateBody: 'Carrega o teu PDF anterior. Mudas o que quiseres e pagas apenas metade.',
      updateCta: 'Carregar PDF',
      updateBusy: 'A carregar...',
    },
    templates: {
      kicker: 'Templates',
      title: 'Estilos prontos a usar',
      comingSoon: 'Em breve',
    },
    how: {
      kicker: 'Como funciona',
      title: 'Três passos. Zero fricção.',
      step1Title: 'Preenches',
      step1Body: 'Formulário simples com preview ao vivo. Undo/redo e auto-save no browser.',
      step2Title: 'Pagas {price}',
      step2Body: 'Stripe seguro. Cartão, Multibanco ou MB WAY. Sem subscrição.',
      step3Title: 'Recebes',
      step3Body: 'Descarregas o PDF e recebes também uma cópia no email — pronto para atualizar mais tarde por metade.',
    },
    faqShort: {
      kicker: 'FAQ',
      title: 'Perguntas rápidas',
      seeAll: 'Ver todas as perguntas →',
      q1: 'Recebo o CV por email?',
      a1: 'Sim. Depois do pagamento, enviamos automaticamente uma cópia do PDF para o email que indicaste no Stripe Checkout.',
      q2: 'Os meus dados ficam guardados?',
      a2: 'Não. Ficam apenas no teu browser até pagares. No pagamento são enviados temporariamente para gerar o PDF e descartados pouco depois.',
      q3: 'Como atualizo o CV?',
      a3: 'Carregas de volta o teu PDF, mudas o que quiseres e pagas {updatePrice}.',
    },
    footer: 'Pagamento seguro via Stripe. Os teus dados não saem do teu browser sem o teu consentimento.',
    footerNav: {
      tagline: 'CV pronto em minutos. Sem registo, sem subscrição.',
      product: {
        title: 'Produto',
        create: 'Criar CV',
        update: 'Atualizar CV',
        templates: 'Templates',
      },
      support: {
        title: 'Suporte',
      },
      legal: {
        title: 'Legal',
        privacy: 'Privacidade',
        comingSoon: 'Em breve',
      },
      copyright: '© {year} CVeaver. Todos os direitos reservados.',
      craftedIn: 'Feito em Portugal · 🐾',
    },
  },

  builder: {
    backTitle: 'Voltar ao início',
    sections: {
      template: 'Template',
      personal: 'Pessoal',
      summary: 'Resumo',
      experience: 'Experiência',
      education: 'Formação',
      skills: 'Competências',
      languages: 'Idiomas',
      projects: 'Projetos',
      certificates: 'Certificados',
    },
    actions: {
      undo: 'Desfazer (⌘Z)',
      redo: 'Refazer (⌘⇧Z)',
      clear: 'Limpar tudo',
      clearConfirm: 'Limpar tudo? Vais perder todos os campos preenchidos. Podes desfazer com Ctrl/⌘+Z.',
      preview: 'Ver preview',
      payNew: 'Pagar {price}',
      payUpdate: 'Pagar {updatePrice}',
      payPreparing: 'A preparar...',
      nameRequired: 'Preenche o nome para continuar',
    },
    fillNameWarning: 'Preenche pelo menos o nome em',
    fillNameWarningAction: 'Pessoal',
    fillNameWarningTail: 'para poderes pagar e descarregar.',
    emptyHint: 'Primeira vez por aqui? Carrega um exemplo para veres como ficam os templates.',
    emptyCta: 'Carregar exemplo →',
    emptySwitchConfirm: 'Substituir o conteúdo actual por um exemplo? Podes desfazer com Ctrl/⌘+Z.',
    modeNewCaption: 'Novo CV · {price}',
    modeUpdateCaption: 'Atualização · {updatePrice}',
    mobilePreviewLabel: 'Preview',
  },

  personal: {
    fullName: 'Nome completo',
    headline: 'Título / Headline',
    email: 'Email',
    phone: 'Telefone',
    location: 'Localização',
    website: 'Website',
    linkedin: 'LinkedIn',
    github: 'GitHub',
    photo: 'Foto (opcional)',
    photoPlaceholder: 'sem foto',
    photoChoose: 'Escolher foto',
    photoChange: 'Trocar foto',
    photoProcessing: 'A processar...',
    photoHelp: 'JPG, PNG ou WebP. Redimensionada para 480×480.',
    accent: 'Cor de destaque',
    custom: 'Custom',
    invalidHex: 'Cor inválida — usa formato #rrggbb.',
    invalidEmail: 'Formato de email parece inválido.',
  },

  certificates: {
    title: 'Certificados (PDF)',
    help: 'Anexa diplomas e certificações em PDF. Aparecem no fim do CV. Até 10 MB por ficheiro · 50 MB total · só PDF.',
    empty: 'Sem certificados.',
    addCta: 'Adicionar certificado',
    name: 'Nome',
    namePlaceholder: 'Curso X — Universidade Y',
    description: 'Descrição (opcional)',
    sizeLabel: '{size} · {pages} {pageLabel}',
    page: 'página',
    pages: 'páginas',
    totalLabel: 'Total: {total} de {cap}',
    framed: 'Moldura CVeaver',
    framedHelp: 'Insere o certificado dentro de uma página com a cor de destaque e o cabeçalho do CV.',
    dragHandle: 'Arrastar para reordenar',
    quotaWarn: 'Total acima de 5 MB — o auto-save no browser pode falhar. Considera remover ficheiros grandes ou pagar e descarregar antes de acumulares mais.',
    errTooLarge: 'Ficheiro maior que 10 MB.',
    errTotalCap: 'Excede 50 MB no total.',
    errEncrypted: 'PDF cifrado / com password não é suportado.',
    errBadPdf: 'Ficheiro PDF inválido.',
  },

  paid: {
    confirmed: 'Pagamento confirmado',
    title: 'O teu CV está pronto.',
    subtitle: 'Descarrega o PDF — também enviámos uma cópia para o email indicado no pagamento.',
    downloadPdf: 'Descarregar PDF',
    downloadPdfBusy: 'A preparar PDF...',
    downloadPdfDone: '✓ PDF descarregado · descarregar novamente',
    emailSent: 'Enviámos uma cópia para {email}',
    editAgain: 'Voltar a editar (sem pagar de novo nesta sessão)',
    startOther: 'Começar outro CV',
  },

  support: {
    navBack: '← Voltar',
    title: 'Suporte CVeaver',
    subtitle: 'Carrega o teu PDF para podermos confirmar que foi gerado pelo CVeaver. Em caso afirmativo, podes abrir uma reclamação.',
    drop: 'Arrasta o PDF aqui',
    dropOr: 'ou clica para escolher um ficheiro',
    verifying: 'A verificar...',
    errorTitle: 'Não consegui verificar',
    errorPdfOnly: 'Carrega um PDF.',
    verifiedTitle: 'PDF verificado',
    verifiedBody: 'Reconhecemos este PDF como gerado pelo CVeaver. Podes agora abrir uma reclamação.',
    unverifiedTitle: 'PDF não reconhecido',
    unverifiedBody: 'Não conseguimos confirmar que este PDF foi gerado pelo CVeaver. Não podemos abrir uma reclamação sem essa confirmação.',
    complaint: {
      title: 'Abrir reclamação',
      subtitle: 'A reclamação fica associada ao PDF verificado acima. O email tem de coincidir com o email do CV.',
      email: 'O teu email',
      emailHelp: 'Deve ser igual ao email presente no CV: {expected}',
      subject: 'Assunto',
      subjectPh: 'PDF não abriu / erro de pagamento / ...',
      message: 'Mensagem',
      messagePh: 'Descreve o problema com o máximo de detalhe possível.',
      submit: 'Submeter reclamação',
      submitBusy: 'A enviar...',
      submittedTitle: 'Reclamação enviada',
      submittedBody: 'Vamos analisar e responder por email assim que possível.',
      emailMismatch: 'O email tem de coincidir com o email presente no CV.',
      missing: 'Preenche todos os campos.',
    },
  },

  faq: {
    title: 'Perguntas frequentes',
    subtitle: 'Se a tua dúvida não está aqui, abre um pedido em /support.',
    items: [
      {
        q: 'Como funciona o pagamento?',
        a: 'Usamos Stripe Checkout. Aceitamos Cartão, Multibanco e MB WAY. Não guardamos dados de pagamento — passam directamente para a Stripe.',
      },
      {
        q: 'Recebo o CV por email?',
        a: 'Sim. Depois do pagamento confirmado, enviamos automaticamente o PDF para o email que indicaste no Stripe Checkout.',
      },
      {
        q: 'Posso atualizar o meu CV mais tarde?',
        a: 'Sim. Carregas de volta o teu PDF, mudas o que quiseres e pagas apenas {updatePrice}.',
      },
      {
        q: 'Que dados pessoais guardam?',
        a: 'Apenas os mínimos para gerar o PDF, e por pouco tempo. Não há accounts, perfis nem analytics que te identifiquem.',
      },
      {
        q: 'Posso adicionar certificados ao CV?',
        a: 'Sim. Na secção Certificados podes anexar até 5 PDFs (máx 5 MB cada). Aparecem como páginas no fim do CV.',
      },
      {
        q: 'O que é o sistema de rank?',
        a: 'Cada vez que pagas para atualizar o teu CV, sobes no rank. Mais updates → melhor badge. É só decorativo.',
      },
      {
        q: 'Os meus templates são ATS-friendly?',
        a: 'O template Classic e o Minimal são ATS-friendly (texto seleccionável, single-column). Os restantes priorizam design.',
      },
    ],
  },

  terms: {
    title: 'Termos de serviço',
    lastUpdated: 'Última atualização: {date}',
    legalDisclaimer: 'Este documento é um esqueleto e deve ser revisto por advogado antes de live.',
    sections: [
      { h: '1. Serviço', p: 'O CVeaver é um gerador de CVs em PDF pago por uso (€1 por novo CV, €0,50 por atualização). Sem conta, sem subscrição.' },
      { h: '2. Pagamento', p: 'Os pagamentos são processados pela Stripe. Não armazenamos dados de cartão. Não há reembolsos após download do PDF, dado que o produto é digital e entregue de imediato.' },
      { h: '3. Dados pessoais', p: 'O conteúdo do CV é armazenado temporariamente no servidor apenas para gerar o link de download e enviar por email, e descartado após. Os dados ficam principalmente no teu browser (localStorage). Não há perfis, accounts ou analytics que te identifiquem.' },
      { h: '4. Email', p: 'Após o pagamento, enviamos automaticamente uma cópia do PDF para o email que indicaste no Stripe Checkout. Esse endereço fica guardado dentro do próprio ficheiro para preencher automaticamente em futuras atualizações.' },
      { h: '5. Limites de responsabilidade', p: 'O CVeaver é fornecido tal-como-está. Não somos responsáveis pelo resultado de candidaturas ou pela exactidão do conteúdo introduzido pelo utilizador.' },
      { h: '6. Reclamações', p: 'Podes abrir uma reclamação em /support após verificarmos o teu PDF. Respondemos em prazo razoável por email.' },
      { h: '7. Alterações', p: 'Podemos atualizar estes termos. A data de última atualização indica quando.' },
    ],
  },

  toast: {
    cvLoaded: 'CV carregado',
    pdfNotRecognised: 'PDF não reconhecido',
    pdfNotRecognisedBody: 'Não conseguimos verificar este PDF. Podes começar do zero com este conteúdo pagando o preço normal.',
    updateBlockedTitle: 'Atualização bloqueada',
    updateBlockedBody: 'Só PDFs CVeaver verificados podem ser atualizados por {updatePrice}. Podes começar com este conteúdo pagando {price}.',
    cannotOpenTitle: 'Não consegui abrir',
    paymentFailTitle: 'Falha a iniciar pagamento',
    pdfFailTitle: 'Falha a descarregar PDF',
    pdfDoneTitle: 'PDF descarregado',
    emailSent: 'Enviámos uma cópia para {email}',
  },

  badges: {
    editCount: '{n} versão paga',
    nextHint: 'Faltam {n} para {tier}',
    tiers: [
      { label: 'Castor Cria',        description: 'Primeiro contacto com o CVeaver.' },
      { label: 'Castor Aprendiz',    description: 'Primeira versão paga.' },
      { label: 'Castor Construtor',  description: 'Já fizeste o teu primeiro update.' },
      { label: 'Castor Mestre',      description: 'Atualizas o CV regularmente.' },
      { label: 'Engenheiro Castor',  description: 'Top tier — obrigado pelo apoio.' },
    ],
  },

  language: {
    label: 'Idioma',
  },
} as const;
