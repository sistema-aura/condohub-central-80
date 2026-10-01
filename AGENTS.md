<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Assembleias Telegram avisos
- Cron job `telegram-avisos-diario` (pg_cron, daily 08:00) calls `/api/public/telegram/avisos` (dev stable URL) with `x-avisos-token` read from `private.app_secrets` via `public.check_avisos_token(text)`; keep that contract intact when editing the route.
- The bot chat is stored in `public.telegram_config`; users link it from the Assembleias page (bot @CDinamico_avisosbot). Switch the cron URL to the published stable URL when the app goes live.

## Declaration documents
- Generate declarations in the browser by filling text runs in the supplied `public/modelo-declaracao.docx`, rather than reconstructing its layout; this preserves the original logo, header, table, footer and Word formatting.
- Store monthly charge fields on each declaration and calculate the debt-free date as the last calendar day of the current month in Lisbon; this keeps a generated declaration tied to its own values and local calendar.
