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

- [ ] **Passo 3: Armazenamento Local (SQLite/LowDB)**
    - **Descrição**: Configurar o banco de dados local para salvar configurações e conexões do usuário.
    - **Requisitos**: SQLite ou store JSON criptografada.
    - **Commit**: `feat: local storage for application settings and connections`

---

## 🔌 FASE 2: Conectividade (O Coração)

- [ ] **Passo 4: Gerenciador de Conexões (CRUD)**
    - **Descrição**: Tela para criar, editar e excluir conexões. Implementar "Test Connection" para PostgreSQL primeiro.
    - **Requisitos**: Driver `pg`, lógica de validação de conexão.
    - **Commit**: `feat: connection manager with postgres support`

- [ ] **Passo 5: Database Explorer (Árvore de Objetos)**
    - **Descrição**: Implementar a árvore lateral que lista Databases, Schemas e Tabelas.
    - **Requisitos**: Queries de metadados do sistema, componente de árvore com lazy loading.
    - **Commit**: `feat: database explorer tree with schemas and tables`

---

## ✍️ FASE 3: Editor e Resultados

- [ ] **Passo 6: Integração Monaco Editor**
    - **Descrição**: Integrar o editor do VS Code (Monaco) com suporte a sintaxe SQL e múltiplas abas.
    - **Requisitos**: `@monaco-editor/react`, sistema de abas de estado.
    - **Commit**: `feat: sql editor integration with monaco and tabs`

- [ ] **Passo 7: Motor de Execução e Result Grid**
    - **Descrição**: Executar queries SQL no banco e exibir os resultados em uma grade de alta performance.
    - **Requisitos**: IPC bridge para queries, biblioteca de Data Grid (ex: TanStack Table).
    - **Commit**: `feat: query execution engine and result data grid`

---

## 🧬 FASE 4: Manipulação de Dados e Histórico

- [ ] **Passo 8: Histórico de Queries e Logs**
    - **Descrição**: Salvar todas as queries executadas e exibir logs de tempo e status.
    - **Requisitos**: Persistência de histórico no SQLite local.
    - **Commit**: `feat: query history and execution logs`

- [ ] **Passo 9: Data Editor (CRUD Visual)**
    - **Descrição**: Permitir edição direta nas células do Result Grid (Update/Delete/Insert).
    - **Requisitos**: Lógica de geração de SQL dinâmica baseada em alterações da grid.
    - **Commit**: `feat: visual data editor for inline table updates`

---

## 🔒 FASE 5: Segurança e SSH

- [ ] **Passo 10: Túnel SSH e Segurança**
    - **Descrição**: Implementar conexões via túnel SSH e criptografia de senhas.
    - **Requisitos**: `ssh2`, `keytar` ou criptografia AES para senhas.
    - **Commit**: `feat: ssh tunneling and credential encryption`

---

## 📦 FASE 6: Polimento e Distribuição

- [ ] **Passo 11: Gerador de SQL e DDL**
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
