# IT Troubleshooting Knowledge Base + Chatbot

Starter do projeto: uma Knowledge Base de incidentes com um chatbot simples
(keyword-matching) exposta via API Flask, e uma extensão de navegador
(Chrome/Edge, Manifest V3) para consultar tudo sem sair do browser.

## Estrutura do projeto

```
chatbot-troubleshooting/
├── backend/
│   ├── app.py            # API Flask (health, incidents, search, chat)
│   ├── database.py       # Acesso a SQLite + seed de dados
│   ├── requirements.txt  # Dependências Python
│   └── kb.db              # Criado automaticamente na 1ª execução
└── extension/
    ├── manifest.json     # Configuração da extensão (Manifest V3)
    ├── popup.html         # Interface (Chat / Pesquisa / Novo Incidente)
    ├── popup.css
    ├── popup.js           # Lógica que chama a API Flask
    └── icons/             # Ícones da extensão
```

## 1. Rodar o backend (Flask) pelo VS Code

1. Abre a pasta `chatbot-troubleshooting` no VS Code (`File > Open Folder`).
2. Abre um terminal integrado (`Ctrl + '` ou `Terminal > New Terminal`).
3. Cria e ativa um ambiente virtual (recomendado):

   ```bash
   cd backend
   python -m venv venv
   ```

   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`

4. Instala as dependências:

   ```bash
   pip install -r requirements.txt
   ```

5. Corre o servidor:

   ```bash
   python app.py
   ```

6. Devias ver algo como:

   ```
    * Running on http://127.0.0.1:5000
   ```

   Na primeira execução, o ficheiro `kb.db` (SQLite) é criado automaticamente
   e populado com 3 incidentes de exemplo.

7. Testa no browser ou Postman: `http://localhost:5000/api/health`
   deve devolver `{"status": "ok", ...}`.

> Dica VS Code: instala a extensão oficial **Python** (Microsoft) para ter
> autocomplete, debug (F5) e seleção de interpretador (`Ctrl+Shift+P` >
> "Python: Select Interpreter" > escolhe o `venv` criado acima).

## 2. Carregar a extensão no Chrome/Edge

1. Com o backend a correr (passo 1), abre `chrome://extensions` (ou
   `edge://extensions` no Edge).
2. Ativa o **Modo de programador / Developer mode** (canto superior direito).
3. Clica em **Carregar sem compactação / Load unpacked**.
4. Seleciona a pasta `chatbot-troubleshooting/extension`.
5. O ícone "KB" vai aparecer na barra de extensões. Clica nele para abrir o
   popup.

Se o indicador no rodapé do popup mostrar "Servidor offline", confirma que o
`python app.py` ainda está a correr no terminal.

## 3. Funcionalidades incluídas neste starter

- **Chatbot**: faz keyword-matching contra a Knowledge Base e sugere a
  solução mais próxima.
- **Pesquisa**: busca por título, descrição, solução ou tags.
- **Novo Incidente**: formulário para registar manualmente um novo caso
  resolvido, guardado direto no SQLite.
- **Healthcheck**: indicador visual (verde/vermelho) da ligação ao backend.

## 4. Próximos passos sugeridos

- Trocar o chatbot de keyword-matching por um LLM (ex: API da Anthropic)
  usando o conteúdo da Knowledge Base como contexto (RAG).
- Adicionar autenticação (ex: SSO corporativo) antes de expor fora de
  localhost.
- Criar os conectores de ETL para importar automaticamente dados do
  Remedy, GitLab e Service Desk (mencionados na arquitetura da proposta).
- Trocar SQLite por um SQL Server/Postgres corporativo quando sair da fase
  de protótipo.
- Adicionar dashboards em Power BI consumindo os dados via API ou export.
