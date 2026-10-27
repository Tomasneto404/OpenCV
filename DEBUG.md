# Diagnóstico OpenCV

- `npm run dev` deve indicar Vite em `http://localhost:5173` e API em `http://localhost:3001`.
- Se a porta 5173 estiver ocupada, liberta-a ou altera explicitamente a porta e `CLIENT_URL`; o Vite não muda de porta silenciosamente.
- Erro ao exportar: verifica `http://localhost:5173/api/health`, preenche o nome e confirma os anexos. Um anexo inválido provoca erro; não é omitido silenciosamente.
- Aviso de gravação local: guarda o JSON editável. Os certificados podem ultrapassar a quota de `localStorage`.
- PDF não reconhecido: apenas PDFs desta aplicação com as chaves correspondentes podem ser reabertos. Tenta a cópia JSON independente.
- PDFs antigos: mantém o diretório de chaves da instalação anterior.
- Para repetir verificações: `npm run build` e `npm test`.

A aplicação não requer credenciais de serviços externos para gerar PDFs.
