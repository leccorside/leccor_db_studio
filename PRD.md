preciso criar um aplicativo para windows com as mesmas funções do Beekeeper studio, dbeaver entre outros aplicativos desktop para administração de banco de dados.

🧠 VISÃO GERAL DO SISTEMA

Você vai construir um:

👉 Database IDE Desktop (tipo DBeaver) chamado LeccorDBStudio

Stack recomendada (mantendo produtividade):
Electron + React + Node.js
Monaco Editor (igual VS Code)
SQLite (armazenamento local)
🏗️ ARQUITETURA COMPLETA
UI (React)
│
├── Editor SQL (Monaco)
├── Explorer (árvore de DB)
├── Result Grid
├── Painéis (logs, explain, jobs)
│
Electron (IPC)
│
Backend Node
│
├── Connection Manager
├── Query Engine
├── Metadata Engine
├── Driver Manager
├── Cache Layer
│

TUDO DEVE RODAR 100% NO DOCKER

Drivers DB (pg, mysql2, etc)
🧩 MÓDULOS COMPLETOS (TODAS AS FEATURES)
🔌 1. GERENCIADOR DE CONEXÕES

Features:
CRUD conexões
Test connection

Multi-banco:
PostgreSQL
MySQL
SQL Server
Oracle

SSH Tunnel
SSL config
Connection pooling

Extras:
Favoritos
Agrupamento por ambiente (DEV/STG/PROD)
Reconexão automática

🗂️ 2. DATABASE EXPLORER (árvore lateral)
Features:
Listar:
Databases
Schemas
Tables
Views
Indexes
Functions
Triggers
Lazy loading (performance)
Busca rápida

Ações:
Create / Alter / Drop
Right-click actions:
Open table
Generate SELECT
Copy DDL

🧠 3. ENGINE DE METADADOS
Responsável por:
Ler estrutura do banco
Cache local
Features:
Auto refresh
Cache inteligente
Diff entre schemas

✍️ 4. EDITOR SQL (NÍVEL VS CODE)
Base:
Monaco Editor
Features:
Syntax highlight (multi-SQL)
Auto-complete (INTELLISENSE)
Formatação SQL
Multi-tabs
Split editor
Histórico
Avançado:
Snippets
Sugestões baseadas no schema
Lint SQL

⚙️ 5. EXECUTOR DE QUERIES
Features:
Executar:
Query única
Múltiplas queries
Execução parcial (seleção)
Cancelar query
Timeout
Avançado:
Paralelismo
Batch execution
Transaction mode (BEGIN/COMMIT/ROLLBACK)

📊 6. RESULT GRID (estilo Excel)
Features:
Tabela dinâmica
Ordenação
Filtros
Resize colunas
Copy/paste
Avançado:
Edição inline (UPDATE direto)
Virtual scroll (dados grandes)
Export:
CSV
JSON
Excel

📈 7. QUERY ANALYSIS
Features:
EXPLAIN / EXPLAIN ANALYZE
Visual plano de execução
Avançado:
Highlight de gargalos
Sugestão de índices

🧪 8. HISTORY & LOGS
Features:
Histórico de queries
Logs de execução
Tempo de execução
Avançado:
Favoritar queries
Replay de queries

🧬 9. DATA EDITOR (CRUD VISUAL)
Features:
Abrir tabela
Editar células
Inserir linhas
Deletar registros
Avançado:
Diff antes/depois
Commit manual

🧱 10. GERADOR DE SQL
Features:
Generate:
SELECT
INSERT
UPDATE
DELETE
DDL:
CREATE TABLE
ALTER TABLE

🔄 11. MIGRATION / SCHEMA DIFF
Features:
Comparar dois schemas
Gerar script de migração

🔍 12. SEARCH GLOBAL
Features:
Buscar:
Tabelas
Colunas
Dados

🔐 13. SEGURANÇA
Features:
Criptografia de senha (Keytar)
Mascarar dados sensíveis

🌐 14. SSH / TUNNELING
Features:
Conexão via SSH
Jump servers

📡 15. JOBS / TASKS
Features:
Agendar queries
Execução automática

📊 16. DASHBOARD / MONITORAMENTO
Features:
Queries ativas
Locks
Conexões abertas

🧩 17. PLUGIN SYSTEM (opcional)
Plugins custom
Extensão futura

🛠️ PASSO A PASSO DE IMPLEMENTAÇÃO (REAL)
🚀 FASE 1 – Base
Setup Electron + React
Layout inicial (sidebar + editor)

🔌 FASE 2 – Conexão DB
PostgreSQL primeiro
Connection manager funcional

🗂️ FASE 3 – Explorer
Listar tabelas
Navegação

✍️ FASE 4 – Editor SQL
Monaco integrado
Run query

📊 FASE 5 – Result Grid
Tabela com dados

⚙️ FASE 6 – Engine robusta
Multi-query
Cancelamento

📈 FASE 7 – Features avançadas
Explain
Histórico

🧬 FASE 8 – Data Editor
CRUD direto

🔐 FASE 9 – Segurança
Criptografia de credenciais

🌐 FASE 10 – SSH
Tunnel funcional

📦 FASE 11 – Build
Gerar .exe

💡 DICA DE OURO (EVITA FRUSTRAÇÃO)

Implemente nessa ordem:

Conectar banco
Executar query
Mostrar resultado

👉 Só depois disso:

Explorer
Editor avançado
Features extras

🚀 CONCLUSÃO

Você não está criando só um app — está criando um:

👉 IDE de banco completo estilo DBeaver

Mas como é uso pessoal:

Pode simplificar partes internas
Pode “hackear” soluções
Pode priorizar velocidade ao invés de perfeição

ANTES DE CRIAR A APLICAÇÃO EM SI, CRIE PRIMEIRO UM ARQUIVO CHAMADO PASSOS.md dividindo o projeto em passos menores, mas que faça sentido logicamente para implementação. Cada passo deve conter um título, descrição e o que será necessário para implementar aquele passo. Os passos devem ser implementados em ordem, um de cada vez, e ao final de cada passo, automaticamente você deve atualizar esse arquivo marcando o check nas opções que foram implementadas, e sempre ao final de cada passo você deve me perguntar se devemos continuar para o próximo passo ou se devo fazer alguma alteração. NÃO continue para o próximo passo sem minha permissão. E no mesmo arquivo ao selecionar os checks, você deve criar um texto resumido do que foi feito para que eu use como commit. LEMBRANDO, NÃO INICIE OUTRO PASSO SEM MINHA
