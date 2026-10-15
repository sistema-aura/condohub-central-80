# Condo Manager Hub

Quero criar uma aplicação interna para uma empresa de gestão/administração de condomínios.

A aplicação deve funcionar como uma base de dados dos prédios/condomínios administrados pela empresa.

Objetivo:
Ter uma ficha individual para cada prédio/condomínio, onde seja possível consultar e editar rapidamente as principais informações administrativas.

Funcionalidades principais:

Página inicial / Dashboard

Mostrar uma lista de todos os condomínios/prédios.

Ter campo de pesquisa por nome do condomínio, morada ou número interno.

Ter botão para adicionar novo condomínio.

Ter filtros simples, por exemplo: ativo/inativo, banco, companhia de eletricidade.

Ficha de cada condomínio
Cada condomínio deve ter uma página própria com os seguintes campos:

Dados gerais:

Nome do condomínio/prédio

Morada completa

Código postal

Localidade

Número interno/referência

Estado: ativo ou inativo

Observações gerais

Contrato de eletricidade:

Companhia de eletricidade

Número de contrato

CPE

Titular do contrato

Data de início do contrato

Observações

Banco:

Nome do banco

IBAN da conta do condomínio

Número de conta, se aplicável

Link para o site do banco

Observações de acesso

Nota importante: a aplicação não deve guardar palavras-passe bancárias em texto simples. Deve existir apenas um campo de observações para indicar onde consultar as credenciais, por exemplo: “consultar gestor de passwords da empresa”.

Seguro:

Companhia de seguros

Número da apólice

Tipo de seguro

Data de início

Data de fim/renovação

Observações

Contactos úteis:

Nome do contacto

Função

Telefone

E-mail

Observações

Documentos:

Permitir anexar documentos ao condomínio, como contratos, apólices, atas, fichas do prédio, comprovativos ou outros ficheiros relevantes.

Importação de dados
Quero conseguir importar uma ficha/lista de prédios já existente para a aplicação, para que os dados sejam criados automaticamente sem ter de inserir tudo manualmente.

A aplicação deve permitir importar ficheiros em Excel ou CSV com os dados dos condomínios.

Permissões e segurança
A aplicação deve ter login.
Só utilizadores autorizados podem aceder.
Deve existir pelo menos dois tipos de utilizador:

Administrador: pode criar, editar e apagar condomínios.

Colaborador: pode consultar e editar, mas não apagar.

Design
Quero um design simples, profissional e moderno.
A aplicação deve ser fácil de usar no computador.
O estilo deve ser limpo, com tabelas organizadas e fichas fáceis de preencher.

Base de dados
Criar uma base de dados estruturada para guardar todos os condomínios e respetivas informações.
A estrutura deve permitir adicionar novos campos no futuro, como água, elevadores, fornecedores, limpeza, manutenção, assembleias e orçamentos.

Criar a aplicação completa com frontend, backend, base de dados, autenticação, dashboard, listagem de condomínios, página de detalhe de cada condomínio, formulário de criação/edição e importação de dados por ficheiro.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://condohub-central-80.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a7dce097-825a-428c-8386-038f29345e8c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Avisos do Telegram

- Convocatórias pendentes agrupadas num resumo, por ordem de data.
- Reuniões dos próximos dois dias mantêm avisos próprios (hoje/amanhã/em breve).
- Cada execução da agenda reúne tarefas, vistorias e declarações por destinatário.
- Textos longos são divididos em partes numeradas, sem eliminar registos.
- «Gerir pendências» abre o menu interativo no Telegram. /menu e /start também o abrem.
- Convocatórias, declarações, tarefas e vistorias têm confirmação antes de concluir,
  desfazer durante 10 minutos e lembretes pessoais para daqui a 1 ou 24 horas.
- Alterações concorrentes impedem confirmar/desfazer uma versão antiga do registo.
- `TELEGRAM_APP_URL` é opcional, apenas no servidor, e deve ser um endereço HTTPS.
  Por omissão os botões apontam para `https://condohub-central-80.lovable.app`.
- Preservam-se o gateway existente, os horários e os cabeçalhos do cron.
  O webhook usa um segredo derivado no servidor; apenas chats privados previamente
  ligados podem consultar ou alterar dados. Novas ligações usam links de utilização
  única, gerados por um utilizador autenticado e válidos durante 10 minutos.
- Após disponibilizar a versão no ambiente usado pelo cron, o botão de teste na
  página Assembleias permite verificar a formatação e os links no Telegram.
- Testes locais sem envio de mensagens: `node --test tests/telegram-*.test.mjs` (Node 24).

### Ativação dos botões interativos

1. Aplicar `drizzle/migrations/0019_telegram_interativo.sql` à base de dados.
2. Publicar a versão com `/api/public/telegram/webhook` no domínio de `TELEGRAM_APP_URL`.
3. Em Assembleias → Telegram, carregar em **Ativar botões**. Regista o webhook e
   instala o cron de lembretes (cada minuto), reutilizando o segredo existente.
   Em alternativa, a chamada autenticada de cron com `x-modo: configurar-botoes`
   executa a mesma ativação, sem enviar mensagens.
4. Enviar `/menu` ao bot. Para ligar outra pessoa, usar **Ligar o meu Telegram**
   e abrir a ligação pessoal. O antigo getUpdates não é usado com o webhook ativo.

Os lembretes são verificados a cada minuto e deixam de ser enviados se o assunto
já estiver tratado. Não suspendem os resumos gerais. Falhas temporárias são
repetidas após a reserva de dois minutos expirar; como em qualquer envio externo,
uma falha após a entrega mas antes da confirmação pode causar um envio repetido.
Os botões antigos de navegação continuam a abrir o site.
