# 🗺️ Roadmap de Implementação - LeccorDBStudio

Este documento rastreia o progresso do desenvolvimento do LeccorDBStudio. Cada passo deve ser concluído e aprovado antes de prosseguir.

---

## 🚀 FASE 1: Fundação e Estrutura Base

- [x] **Passo 1: Setup do Ambiente e Arquitetura Base**
    - **Descrição**: Configurar o projeto Electron com React utilizando Vite para alta performance. Estruturar pastas de IPC (Inter-Process Communication).
    - **Requisitos**: `electron`, `vite`, `react`, `typescript`, `tailwindcss` (para UI premium).
    - **Commit**: `feat: initial electron + react + vite setup`

- [x] **Passo 2: Layout Shell (UI Premium)**
    - **Descrição**: Criar a interface principal com Sidebar (Explorer), Área Central (Editor/Tabs) e Painel Inferior (Resultados/Logs).
    - **Requisitos**: Design system básico, componentes de layout responsivos.
    - **Commit**: `feat: main dashboard layout and shell components`

- [x] **Passo 3: Armazenamento Local (SQLite/LowDB)**
    - **Descrição**: Configurar o banco de dados local para salvar configurações e conexões do usuário.
    - **Requisitos**: SQLite ou store JSON criptografada.
    - **Commit**: `feat: local storage for application settings and connections`

---

## 🔌 FASE 2: Conectividade (O Coração)

- [x] **Passo 4: Gerenciador de Conexões (CRUD)**
    - **Descrição**: Tela para criar, editar e excluir conexões. Implementar "Test Connection" para PostgreSQL primeiro.
    - **Requisitos**: Driver `pg`, lógica de validação de conexão.
    - **Commit**: `feat: connection manager with postgres support`

- [x] **Passo 5: Database Explorer (Árvore de Objetos)**
    - **Descrição**: Implementar a árvore lateral que lista Databases, Schemas e Tabelas.
    - **Requisitos**: Queries de metadados do sistema, componente de árvore com lazy loading.
    - **Commit**: `feat: database explorer tree with schemas and tables`

---

## ✍️ FASE 3: Editor e Resultados

- [x] **Passo 6: Integração Monaco Editor**
    - **Descrição**: Integrar o editor do VS Code (Monaco) com suporte a sintaxe SQL e múltiplas abas.
    - **Requisitos**: `@monaco-editor/react`, sistema de abas de estado.
    - **Commit**: `feat: sql editor integration with monaco and tabs`

- [x] **Passo 7: Motor de Execução e Result Grid**
    - **Descrição**: Executar queries SQL no banco e exibir os resultados em uma grade de alta performance.
    - **Requisitos**: IPC bridge para queries, biblioteca de Data Grid (ex: TanStack Table).
    - **Commit**: `feat: query execution engine and result data grid`

---

## 🧬 FASE 4: Manipulação de Dados e Histórico

- [x] **Passo 8: Histórico de Queries e Logs**
    - **Descrição**: Salvar todas as queries executadas e exibir logs de tempo e status.
    - **Requisitos**: Persistência de histórico no SQLite local.
    - **Commit**: `feat: query history and execution logs`

- [x] **Passo 9: Data Editor (CRUD Visual)**
    - **Descrição**: Permitir edição direta nas células do Result Grid (Update/Delete/Insert).
    - **Requisitos**: Lógica de geração de SQL dinâmica baseada em alterações da grid.
    - **Commit**: `feat: visual data editor for inline table updates`

---

## 🔒 FASE 5: Segurança e SSH

- [x] **Passo 10: Túnel SSH e Segurança**
    - **Descrição**: Implementar conexões via túnel SSH e criptografia de senhas.
    - **Requisitos**: `ssh2`, `keytar` ou criptografia AES para senhas.
    - **Commit**: `feat: ssh tunneling and credential encryption`

---

## 📦 FASE 6: Polimento e Distribuição

- [x] **Passo 11: Gerador de SQL e DDL**
    - **Descrição**: Ações de clique direito para gerar "Script AS SELECT", "Create Table", etc.
    - **Commit**: `feat: sql generator and ddl script actions`

- [ ] **Passo 12: Build Final (.exe)**
    - **Descrição**: Configurar o `electron-builder` para gerar o executável Windows.
    - **Commit**: `chore: packaging and distribution setup`

---

## ✅ Resumo do Progresso
- **Passo 1 concluído**: Estrutura Electron + React (Vite) configurada. TailwindCSS integrado com paleta Dark Premium. Configuração de IPC, Preload e Main Process pronta. Docker Compose para bancos de teste adicionado.
  - **Commit**: `feat: initial electron + react + vite setup`
- **Passo 2 concluído**: Layout Shell UI Premium criado com componentes `ActivityBar`, `Sidebar`, `EditorArea` e `BottomPanel`, todos com design moderno, responsivo e baseado no TailwindCSS.
  - **Commit**: `feat: main dashboard layout and shell components`
- **Passo 3 concluído**: Implementado banco de dados local com `better-sqlite3`. Criada a persistência de "settings" e "connections". Funções IPC expostas no preload e tipadas no TypeScript.
  - **Commit**: `feat: local storage for application settings and connections`
- **Passo 4 concluído**: Criado o módulo `postgres.ts` no processo principal para testar conexões com `pg`. Criado o componente React `ConnectionManager.tsx` para gerenciar (Criar, Editar, Excluir, Testar) as conexões. Integrado à interface na ActivityBar.
  - **Commit**: `feat: connection manager with postgres support`
- **Passo 5 concluído**: Implementado o `pg:getMetadata` para buscar schemas e tabelas via query no PostgreSQL. Componente `Sidebar` atualizado para carregar de forma preguiçosa (lazy load) a árvore de Conexões -> Schemas -> Tabelas/Views usando cache local no React.
  - **Commit**: `feat: database explorer tree with schemas and tables`
- **Passo 6 concluído**: Instalado `@monaco-editor/react`. Atualizada a `EditorArea` para suportar múltiplas abas dinâmicas com estado local. Integrado o Monaco Editor com tema dark personalizado (`leccor-dark`), sem minimap e formatado para a melhor experiência na escrita de queries.
  - **Commit**: `feat: sql editor integration with monaco and tabs`
- **Passo 7 concluído**: Implementado motor de execução de query via Node.js (`pg:executeQuery`). Criado estado global no React (`App.tsx`) ligando a `EditorArea` ao `BottomPanel`. Instalado e configurado `@tanstack/react-table` para renderização dinâmica (com colunas e formatações de tipo detectadas automaticamente) dos resultados, além da aba visual de Messages para falhas de SQL.
  - **Commit**: `feat: query execution engine and result data grid`
- **Passo 8 concluído**: Criada a tabela `query_history` no banco local (SQLite) via `database.ts`. Implementada gravação automática do SQL executado, identificando a conexão, status de falha/sucesso e duração em milissegundos. Na aba inferior (BottomPanel), a tab `History` foi ativada para exibir um grid em tempo real do histórico completo das execuções persistidas.
  - **Commit**: `feat: query history and execution logs`
- **Passo 9 concluído**: Atualizado o `BottomPanel` para permitir double-click nas células retornadas. Quando a célula sofre alteração, ela é destacada e o botão "Save Changes" surge no header. Ao clicar, o sistema gera dinamicamente statements de `UPDATE`, detectando a tabela original da query anterior, extraindo a provável PK (campo ID) para atualizar com segurança direto no PostgreSQL usando a mesma engine de execução do banco.
  - **Commit**: `feat: visual data editor for inline table updates`
- **Passo 10 concluído**: Instalado o módulo `ssh2` para suporte a túnel (Port Forwarding). Integrada uma wrapper `createClient` transparente em `postgres.ts` que escuta numa porta randômica local e redireciona os dados para o servidor SSH antes de entregar ao PG. A tabela do SQLite foi alterada para aceitar colunas de túnel SSH. Por fim, implementei criptografia local padrão banco (AES-256-CBC nativo via `crypto` do Node.js) que protege as senhas salvas no SQLite, usando uma chave única gerada randomicamente no ambiente do usuário.
  - **Commit**: `feat: ssh tunneling and credential encryption`
- **Passo 11 concluído**: Adicionado menu de contexto (botão direito) na listagem das tabelas do Sidebar. Ao clicar, um menu surge permitindo gerar "SELECT Statement" ou "CREATE Statement". Essa requisição sobe para o `App.tsx` e é injetada numa nova aba gerada dinamicamente pelo `EditorArea.tsx` contendo o DDL ou DML pronto daquela tabela de forma fluida.
  - **Commit**: `feat: sql generator and ddl script actions`
