# Plano: Aplicação de Gestão de Condomínios

## Visão geral
App interna com login para gerir uma base de dados de prédios/condomínios, cada um com ficha detalhada (dados gerais, eletricidade, banco, seguro, contactos, documentos), com importação por Excel/CSV e dois níveis de utilizador (Administrador / Colaborador).

## Stack
- Frontend: TanStack Start + React + Tailwind + shadcn/ui
- Backend + DB + Auth + Storage: **Lovable Cloud** (ativar no início)
- Importação: parsing de `.xlsx` e `.csv` no browser (SheetJS)

## Base de dados (Lovable Cloud)

Tabelas principais no schema `public`:

- `condominios` — dados gerais + estado ativo/inativo + observações
- `contratos_eletricidade` — 1:1 com condomínio
- `contas_bancarias` — 1:1 com condomínio (sem passwords, só nota de onde consultar)
- `seguros` — 1:N (permite histórico/renovações)
- `contactos` — 1:N
- `documentos` — 1:N, ficheiros em Storage bucket privado `condominio-docs`
- `profiles` — perfil ligado a `auth.users`
- `user_roles` + enum `app_role` ('admin', 'colaborador') — tabela separada + função `has_role()` SECURITY DEFINER (padrão seguro, não guardar role no profile)

Todas com RLS ativa. GRANTs para `authenticated` e `service_role`.

### Políticas RLS
- Todos os utilizadores autenticados: SELECT, INSERT, UPDATE em tudo
- DELETE: apenas `has_role(auth.uid(), 'admin')`
- `user_roles`: só admin pode escrever; utilizador pode ler os seus

Estrutura extensível: adicionar futuros módulos (água, elevadores, fornecedores, limpeza, manutenção, assembleias, orçamentos) como novas tabelas ligadas por `condominio_id`.

## Autenticação
- Email + password (Lovable Cloud Auth)
- Primeiro utilizador registado torna-se automaticamente `admin` (trigger no signup se não existir nenhum admin); restantes ficam `colaborador` por defeito, promoção manual por admin
- Rotas protegidas sob `_authenticated/` (layout gerido pela integração)
- Página `/auth` pública com login/registo
- Ecrã de gestão de utilizadores (só admin) para alterar roles

## Rotas
```
/auth                                  — login/registo (pública)
/_authenticated/                       — layout protegido
  ├─ index                             — Dashboard: lista + pesquisa + filtros + botão "Novo"
  ├─ condominios/novo                  — criar
  ├─ condominios/$id                   — ficha (tabs: Geral, Eletricidade, Banco, Seguros, Contactos, Documentos)
  ├─ condominios/importar              — upload Excel/CSV + mapping de colunas + preview + confirmar
  └─ admin/utilizadores                — gestão de roles (só admin)
```

## Dashboard
- Tabela com: nome, morada, nº interno, estado, banco, companhia eletricidade
- Barra de pesquisa (nome / morada / nº interno) com debounce
- Filtros: estado (ativo/inativo), banco, companhia eletricidade
- Botões: "Novo condomínio", "Importar"

## Ficha do condomínio
- Header: nome, nº interno, badge estado, botões Editar / Apagar (Apagar só admin)
- Tabs com formulários (react-hook-form + zod):
  1. **Geral** — nome, morada, código postal, localidade, nº interno, estado, observações
  2. **Eletricidade** — companhia, nº contrato, CPE, titular, data início, obs.
  3. **Banco** — banco, IBAN, nº conta, link site, observações (sem password)
  4. **Seguros** — lista com adicionar/editar/apagar (companhia, apólice, tipo, início, fim, obs.)
  5. **Contactos** — lista (nome, função, telefone, email, obs.)
  6. **Documentos** — upload/listagem/download/apagar (ficheiros em Storage privado)

Colaborador pode editar tudo excepto apagar registos.

## Importação Excel/CSV
- Upload de `.xlsx` ou `.csv`
- Parse com `xlsx` (SheetJS)
- Ecrã de mapping: mapear colunas do ficheiro → campos do condomínio
- Template descarregável com colunas esperadas
- Preview das primeiras linhas + validação (zod)
- Inserção em batch; relatório final (criados / erros)

## Design
- Limpo, profissional, tipo dashboard admin moderno
- Sidebar à esquerda com navegação (Dashboard, Importar, Utilizadores)
- Paleta neutra com um accent (azul suave) — tokens semânticos em `styles.css`
- Tabelas densas mas legíveis, formulários agrupados por secção

## Detalhes técnicos
- Server functions (`createServerFn` + `requireSupabaseAuth`) para leituras/escritas do lado servidor onde faz sentido; browser client para queries simples com RLS
- TanStack Query para cache e invalidação
- Storage bucket privado `condominio-docs`, signed URLs para download
- Zod para validação em todos os formulários
- Migração inicial com todas as tabelas, enum, função `has_role`, trigger do primeiro admin, políticas RLS, GRANTs, e criação do bucket

## Fora do âmbito desta primeira versão
- Módulos futuros (água, elevadores, fornecedores, limpeza, manutenção, assembleias, orçamentos) — estrutura preparada mas não implementados
- Mobile / responsivo avançado (foco em desktop, conforme pedido)
- Recuperação de password (podemos adicionar depois se quiseres)

Confirmas para avançar? Se sim, ativo já o Lovable Cloud e começo a construir.
