# OpenCV

Repositório: [Tomasneto404/OpenCV](https://github.com/Tomasneto404/OpenCV).

Um editor de currículos gratuito, sem conta, com preview em tempo real e exportação em PDF. Este projeto é um construtor de CVs; não está associado à biblioteca de visão computacional com o mesmo nome.

## Executar em desenvolvimento

Requer Node.js 22.12+ e npm.

```sh
npm run install:all
npm run dev
```

- Aplicação: http://localhost:5173
- API: http://localhost:3001/health
- `Ctrl+C` termina os dois processos.

Não é necessário criar `.env`. Para personalizar portas, concorrência ou diretório de chaves, usa [.env.example](.env.example). O Vite lê o `.env` da raiz; `/api` é encaminhado para a API local. Se mudares `PORT`, ajusta também o destino do proxy em `client/vite.config.ts`.

## Funcionalidades

- Nove templates: Modern, Classic, Minimal, Creative, Executive, **Compact, Studio, Technical e Academic**.
- Galeria com filtros, personalização de cor, fotografia, tema claro/escuro e interface responsiva.
- Português, inglês, espanhol, francês e alemão.
- Dados pessoais, resumo, experiência, formação, competências, idiomas, projetos e certificados.
- Download direto e gratuito do PDF, sem marca de água, checkout ou envio de emails.
- Botão «Upload CV já existente» em destaque na landing e no editor: JSON e PDFs exportados pelo OpenCV, com confirmação antes de substituir o rascunho.
- Recomeçar com confirmação, desfazer/refazer e preview com scroll independente.
- Cópia editável em JSON, rascunho local e desfazer/refazer.
- Certificados PDF: 10 MB por ficheiro, 50 MB no total; moldura opcional e preservação de todas as páginas.

O rascunho fica no `localStorage` deste browser. Se o browser recusar a gravação (por exemplo, por falta de espaço), aparece um aviso: guarda o JSON editável antes de sair. JSONs importados são validados antes de entrar no editor.

## Dados e PDFs

A API processa os CVs em memória, sem guardar rascunhos ou PDFs em disco. Não existem integrações de pagamento, email, notificações de vendas ou analytics.

Cada PDF inclui os dados editáveis num anexo JSON (`opencv.json`), sem encriptação nem assinatura. Pode ser reimportado e editado em qualquer instalação OpenCV, sem chaves ou dependência do servidor que o gerou. Quem recebe o PDF também pode ler os dados do anexo. PDFs de outras aplicações sem dados OpenCV não podem ser importados.

Os PDFs antigos com anexos encriptados `cveaver.dat` ou `opencv.dat` precisam de ser abertos na versão anterior para guardar o JSON. Essa cópia JSON pode ser importada na versão atual. Os rascunhos e preferências da marca anterior continuam a ser lidos no mesmo browser.

O preview HTML e o PDF usam renderizadores diferentes; a paginação pode variar. Confirma o PDF final antes de o enviar. Os novos templates permitem múltiplas páginas; Compact reduz espaçamento, sem cortar conteúdo para forçar uma página.

## Verificação

```sh
npm run build   # TypeScript do cliente e servidor + build Vite
npm test        # validação, portabilidade, idiomas e round-trip dos nove templates
npx playwright install chromium # apenas na primeira execução
npm run test:e2e # fluxos de browser em desktop e mobile
```

Os testes incluem PDFs extensos, alteração de nome após reimportação, leitura num processo independente sem chaves, certificados multipágina e rejeição de dados inválidos.

Os testes de browser iniciam os servidores de desenvolvimento quando necessário. Para testar uma instalação já ativa, usa `E2E_BASE_URL=http://localhost:8080 npm run test:e2e`. Cobrem upload JSON/PDF, ficheiros inválidos, substituição/cancelamento, persistência, reset/desfazer, scroll de CVs extensos e créditos Konami.

A CI executa os testes de browser contra a stack Docker real. Só publica imagens no Docker Hub (`tomasneto26`) depois de passarem o build, TypeScript, testes e verificação de segredos.

## API

| Método | Endpoint | Função |
| --- | --- | --- |
| GET | `/health` | Estado do serviço |
| POST | `/pdf` | Recebe `{ cv }` e devolve o PDF, gratuitamente |
| POST | `/decode-pdf` | Recebe bytes `application/pdf` e devolve o CV validado |

A API limita a frequência e concorrência de pedidos. O limite de corpo HTTP é 80 MB para acomodar os anexos codificados em base64. Não existem endpoints de checkout, sessões pagas ou email.

## Docker

```sh
docker compose up -d --wait
```

O `compose.yaml` descarrega `tomasneto26/opencv:latest` diretamente do Docker Hub. Para fixar a versão atual, usa `IMAGE_TAG=0.1.0 docker compose up -d --wait`. Para construir o código localmente, usa `docker compose -f docker-compose.yml up -d --build --wait`.

Abre http://localhost:8080. Um único container Node.js serve a interface e a API `/api`. Não precisa de chaves nem volumes. Vê [DEPLOY.md](DEPLOY.md) para detalhes de migração.

## Estrutura

- `client/`: React, TypeScript, Vite, Tailwind, editor e preview HTML.
- `server/`: Express, React PDF, pdf-lib, exportação e leitura de PDFs portáveis.
- `shared/`: tipos e validação usados no cliente e no servidor.

A marca da aplicação foi alterada para OpenCV. Não foi configurado nem publicado um novo domínio.

## Licença

Privado — todos os direitos reservados a Tomás Neto. © 2026.
