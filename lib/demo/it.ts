import { locale } from '@/lib/i18n';

/**
 * The demo company in Italian. Kept apart from the UI dictionaries
 * (lib/i18n/it/*): this one covers DATA, the text the demo store writes into
 * demo-data/ (lib/demo/store.ts), not the text the components render.
 *
 * The English source (company.json, seed-v1.ts, brain.ts, company.ts) stays the
 * key and stays byte-identical; with GLADOS_LOCALE unset nothing here runs.
 * Only text a person reads is translated. Ids, slugs, status/stage/kind
 * values, dates, URLs, emails, people, company, brand and agent names, handles,
 * file paths and currency codes are never keys here, and `localizeCompany`
 * only looks at the fields listed in TEXT_KEYS on top of that.
 *
 * Placeholders `{name}` and every number in a key survive in its value
 * (tests/demo-it.test.ts).
 */
const IT: Record<string, string> = {
  // ── company.json: departments ────────────────────────────────────────────
  Growth: 'Crescita',
  'demand, funnel and partnerships': 'domanda, funnel e partnership',
  Content: 'Contenuti',
  'the publishing line, end to end': 'la linea di pubblicazione, dall’inizio alla fine',
  Operations: 'Operazioni',
  'the machinery everything else runs on': 'il motore su cui gira tutto il resto',
  Finance: 'Finanza',
  'money in, money out, and the runway': 'entrate, uscite e runway',
  Client: 'Clienti',
  'onboarding, delivery and renewals': 'onboarding, consegna e rinnovi',
  Intelligence: 'Intelligence',
  'what the company knows': 'ciò che l’azienda sa',

  // ── company.json: agent roles ────────────────────────────────────────────
  'Runs the weekly plan and chases what slipped': 'Gestisce il piano settimanale e insegue ciò che è slittato',
  'Triages every inbound message and answers the easy half': 'Smista ogni messaggio in arrivo e risponde alla metà facile',
  'Drafts long-form from the brief and the transcript': 'Scrive i contenuti long-form dal brief e dalla trascrizione',
  'Watches the funnel and flags a stalling deal': 'Tiene d’occhio il funnel e segnala un deal che si blocca',
  'Reconciles the ledger and files the receipts': 'Riconcilia il registro e archivia le ricevute',
  'Researches a prospect before the first call': 'Studia un prospect prima della prima call',
  'Cuts the week into clips and schedules them': 'Taglia la settimana in clip e le programma',
  'Runs the health checks and opens the incident': 'Esegue i controlli di salute e apre l’incidente',
  'Keeps the knowledge base current from what shipped': 'Tiene aggiornata la knowledge base con ciò che è stato rilasciato',
  'Prepares the onboarding pack for a signed client': 'Prepara il pacchetto di onboarding per un cliente firmato',
  'Writes and tests the ad variants': 'Scrive e testa le varianti degli annunci',
  'Summarises every call into decisions and owners': 'Riassume ogni call in decisioni e responsabili',
  'Builds the monthly board pack': 'Prepara il board pack mensile',
  'Answers the docs questions nobody has written down': 'Risponde alle domande sulla documentazione che nessuno ha mai messo per iscritto',
  'Keeps the CRM honest after every touch': 'Tiene il CRM fedele alla realtà dopo ogni contatto',
  'Chases the invoices that went quiet': 'Sollecita le fatture rimaste senza risposta',
  'Writes the weekly newsletter from what shipped': 'Scrive la newsletter settimanale da ciò che è stato rilasciato',
  'Scripts the short-form hooks from the long-form': 'Scrive gli hook short-form partendo dal long-form',
  'Designs the thumbnails and the carousels': 'Disegna le miniature e i caroselli',
  'Schedules every post across the platforms': 'Programma ogni post su tutte le piattaforme',
  'Answers comments and DMs on what went out': 'Risponde a commenti e DM su ciò che è uscito',
  'Routes every instruction to the department that owns it': 'Instrada ogni istruzione al reparto che ne è responsabile',
  'The super agent. Takes an instruction in plain language and hands it to the right crew.':
    'Il super agente. Prende un’istruzione in linguaggio naturale e la affida alla squadra giusta.',

  // ── company.json: standard work (SOPs) ───────────────────────────────────
  'Qualify an inbound lead': 'Qualificare un lead in entrata',
  'Qualify an inbound lead — written down so it runs the same way every time.': 'Qualificare un lead in entrata: messo per iscritto perché vada sempre allo stesso modo.',
  'Read the message and the source': 'Leggi il messaggio e la fonte',
  'Score against the ICP': 'Valuta rispetto all’ICP',
  'Route or archive with a reason': 'Instrada o archivia con una motivazione',
  'Research before a first call': 'Ricerca prima di una prima call',
  'Research before a first call — written down so it runs the same way every time.': 'Ricerca prima di una prima call: messa per iscritto perché vada sempre allo stesso modo.',
  'Pull the company and the person': 'Recupera l’azienda e la persona',
  'Find what they have shipped lately': 'Scopri cosa hanno rilasciato di recente',
  'Write the brief into the deal': 'Scrivi il brief nel deal',
  'Test three ad variants': 'Testare tre varianti di annuncio',
  'Test three ad variants — written down so it runs the same way every time.': 'Testare tre varianti di annuncio: messo per iscritto perché vada sempre allo stesso modo.',
  'Write three angles': 'Scrivi tre angolazioni',
  'Split by geography': 'Dividi per area geografica',
  'Keep the winner, kill the rest': 'Tieni la vincente, spegni le altre',
  'Turn a recording into a draft': 'Trasformare una registrazione in una bozza',
  'Turn a recording into a draft — written down so it runs the same way every time.': 'Trasformare una registrazione in una bozza: messo per iscritto perché vada sempre allo stesso modo.',
  'Transcribe and file': 'Trascrivi e archivia',
  'Pull the brief out of it': 'Estrai il brief',
  'Write the first pass': 'Scrivi la prima stesura',
  'Cut the week into clips': 'Tagliare la settimana in clip',
  'Cut the week into clips — written down so it runs the same way every time.': 'Tagliare la settimana in clip: messo per iscritto perché vada sempre allo stesso modo.',
  'Find the six moments': 'Trova i sei momenti',
  'Cut and caption': 'Taglia e sottotitola',
  'Schedule across the channels': 'Programma su tutti i canali',
  'Build the day plan': 'Preparare il piano della giornata',
  'Build the day plan — written down so it runs the same way every time.': 'Preparare il piano della giornata: messo per iscritto perché vada sempre allo stesso modo.',
  'Read what slipped': 'Leggi cosa è slittato',
  'Rank what is due': 'Ordina ciò che è in scadenza',
  'Post it before standup': 'Pubblicalo prima dello standup',
  'Open an incident': 'Aprire un incidente',
  'Open an incident — written down so it runs the same way every time.': 'Aprire un incidente: messo per iscritto perché vada sempre allo stesso modo.',
  'Confirm it is real': 'Conferma che sia reale',
  'Page the owner': 'Avvisa il responsabile',
  'Write what broke and when': 'Scrivi cosa si è rotto e quando',
  'Reconcile the day': 'Riconciliare la giornata',
  'Reconcile the day — written down so it runs the same way every time.': 'Riconciliare la giornata: messo per iscritto perché vada sempre allo stesso modo.',
  'Match charges to the ledger': 'Abbina gli addebiti al registro',
  'Flag anything unexplained': 'Segnala tutto ciò che non torna',
  'Raise the exceptions as work': 'Trasforma le eccezioni in attività',
  'Build the board pack': 'Preparare il board pack',
  'Build the board pack — written down so it runs the same way every time.': 'Preparare il board pack: messo per iscritto perché vada sempre allo stesso modo.',
  'Pull the month': 'Estrai il mese',
  'Compare against plan': 'Confronta con il piano',
  'Write the three things that changed': 'Scrivi le tre cose che sono cambiate',
  'Prepare an onboarding pack': 'Preparare un pacchetto di onboarding',
  'Prepare an onboarding pack — written down so it runs the same way every time.': 'Preparare un pacchetto di onboarding: messo per iscritto perché vada sempre allo stesso modo.',
  'Assemble the scope': 'Definisci lo scope',
  'Book the kickoff': 'Fissa il kickoff',
  'Send day one': 'Invia il materiale del primo giorno',
  'Keep the CRM honest': 'Tenere il CRM fedele alla realtà',
  'Keep the CRM honest — written down so it runs the same way every time.': 'Tenere il CRM fedele alla realtà: messo per iscritto perché vada sempre allo stesso modo.',
  'Log every touch': 'Registra ogni contatto',
  'Move the stage': 'Aggiorna la fase',
  'Archive with a reason': 'Archivia con una motivazione',
  'Re-index after a docs change': 'Reindicizzare dopo una modifica alla documentazione',
  'Re-index after a docs change — written down so it runs the same way every time.': 'Reindicizzare dopo una modifica alla documentazione: messo per iscritto perché vada sempre allo stesso modo.',
  'Diff what moved': 'Confronta cosa è cambiato',
  'Re-chunk the changed pages': 'Rispezza in chunk le pagine modificate',
  'Report the dead links': 'Segnala i link non funzionanti',
  'Summarise a call': 'Riassumere una call',
  'Summarise a call — written down so it runs the same way every time.': 'Riassumere una call: messo per iscritto perché vada sempre allo stesso modo.',
  'Pull the decisions': 'Estrai le decisioni',
  'Name the owners': 'Indica i responsabili',
  'File it against the client': 'Archivialo sotto il cliente',

  // ── company.json: tasks ──────────────────────────────────────────────────
  'Rewrite the onboarding email so it stops burying the calendar link': 'Riscrivere l’email di onboarding perché non nasconda più il link al calendario',
  'Reconcile September against the bank export': 'Riconciliare settembre con l’export della banca',
  'Pull the three stalled deals into a single follow-up thread': 'Riunire i tre deal fermi in un unico thread di follow-up',
  'Draft the case study from the Halden call transcript': 'Scrivere la bozza del case study dalla trascrizione della call con Halden',
  'Cut six clips from the workshop recording': 'Tagliare sei clip dalla registrazione del workshop',
  'Second pass on the pricing page copy': 'Seconda revisione dei testi della pagina prezzi',
  'Write the runbook for a failed nightly sync': 'Scrivere il runbook per una sincronizzazione notturna fallita',
  'Chase the two invoices past 30 days': 'Sollecitare le due fatture scadute da oltre 30 giorni',
  'Refresh the competitor teardown for Q4': 'Aggiornare l’analisi dei concorrenti per il Q4',
  'Tag every contact that came in from the workshop': 'Taggare ogni contatto arrivato dal workshop',
  'Split the ad set by geography and re-test': 'Dividere l’ad set per area geografica e ritestare',
  'Document the handover checklist properly': 'Documentare per bene la checklist di passaggio di consegne',
  'Move the weekly plan to run before standup, not after': 'Spostare il piano settimanale prima dello standup, non dopo',
  'Answer the fourteen support threads from the weekend': 'Rispondere ai quattordici thread di supporto del weekend',
  'File the Q3 board pack': 'Archiviare il board pack del Q3',
  'Fix the webhook that was retrying forever': 'Sistemare il webhook che ritentava all’infinito',
  'Summarise the three discovery calls into one brief': 'Riassumere le tre discovery call in un unico brief',
  'Publish the September changelog': 'Pubblicare il changelog di settembre',
  'Re-run the funnel report with the corrected stage names': 'Rigenerare il report del funnel con i nomi delle fasi corretti',
  'Archive the dead leads from the spring list': 'Archiviare i lead morti della lista di primavera',
  'Set up the ad account for the new venture': 'Configurare l’account pubblicitario per la nuova venture',
  'Rebuild the knowledge index after the docs move': 'Ricostruire l’indice della knowledge base dopo lo spostamento dei documenti',

  // ── company.json: scheduled jobs and runs ────────────────────────────────
  'Build the day plan and post it before standup': 'Prepara il piano della giornata e pubblicalo prima dello standup',
  'Triage the inbox and answer what is routine': 'Smista la inbox e rispondi a ciò che è di routine',
  'Flag any deal that has not moved in five days': 'Segnala ogni deal fermo da cinque giorni',
  'Reconcile yesterday against the bank feed': 'Riconcilia la giornata di ieri con il feed bancario',
  'Run the health checks across every connector': 'Esegui i controlli di salute su ogni connettore',
  'Cut and schedule clips from the week': 'Taglia e programma le clip della settimana',
  'Re-index whatever changed in the knowledge base': 'Reindicizza tutto ciò che è cambiato nella knowledge base',
  'Chase anything past thirty days': 'Sollecita tutto ciò che supera i trenta giorni',
  completed: 'completato',
  'failed on a timeout, retried': 'fallito per timeout, ritentato',

  // ── roadmap and phases (company.json, same rows as seed-v1) ──────────────
  'FOUNDER OS v1 baseline': 'Base di FOUNDER OS v1',
  'Six views, SQLite repos, 32 tests.': 'Sei viste, repo SQLite, 32 test.',
  'Monochrome rebuild + real connectors': 'Ricostruzione monocromatica + connettori reali',
  'Black & white theme; IMAP, Slack, Stripe, optimal wired.': 'Tema in bianco e nero; IMAP, Slack, Stripe e optimal collegati.',
  'Black & white theme; IMAP, Slack, Stripe, gbrain wired.': 'Tema in bianco e nero; IMAP, Slack, Stripe e gbrain collegati.',
  'Optimal Engine provider live': 'Provider Optimal Engine attivo',
  'optimal CLI doctor/query + brain-store local fallback.': 'CLI optimal doctor/query + fallback locale su brain-store.',
  'engine CLI doctor/query + brain-store local fallback.': 'CLI del motore doctor/query + fallback locale su brain-store.',
  'Connect 4 email inboxes': 'Collegare 4 caselle email',
  'Four Gmail IMAP slots live on app passwords, feeding /comms.': 'Quattro slot IMAP Gmail attivi con password per app, che alimentano /comms.',
  'Connect Slack workspace': 'Collegare il workspace Slack',
  'Bot token reads channels + history for the per-client board.': 'Il token del bot legge canali + cronologia per la board per cliente.',
  'Connect payment processors': 'Collegare i processori di pagamento',
  'Stripe live; PayKit, PayPal and Square in the registry.': 'Stripe attivo; PayKit, PayPal e Square nel registro.',
  'Revive Supabase Second Brain': 'Riattivare il Second Brain su Supabase',
  'Free-tier project unpaused; optimal hybrid queries resolve again.': 'Progetto free tier riattivato; le query ibride di optimal tornano a rispondere.',
  'Free-tier project unpaused; engine hybrid queries resolve again.': 'Progetto free tier riattivato; le query ibride del motore tornano a rispondere.',
  'Agent scheduler (cron runs)': 'Scheduler degli agenti (esecuzioni cron)',
  'Seven schedules on a 60s tick with cron_runs history and catch-up.': 'Sette pianificazioni su un tick di 60s con cronologia cron_runs e recupero.',
  'LLM summarization layer': 'Livello di sintesi LLM',
  'Agent chat and digests through the AI Gateway, with model failover.': 'Chat degli agenti e digest tramite l’AI Gateway, con failover del modello.',
  'Migrate to a dedicated host': 'Migrare su un host dedicato',
  'App, optimal and agents run on the host; Supabase stays managed.': 'App, optimal e agenti girano sull’host; Supabase resta gestito.',
  'App, the engine and agents run on the host; Supabase stays managed.': 'App, motore e agenti girano sull’host; Supabase resta gestito.',
  'Own the embedding stack': 'Avere il controllo dello stack di embedding',
  'Brain moved onto local embeddings before the hosted vendor went away.': 'Il brain è passato agli embedding locali prima che il fornitore in hosting chiudesse.',
  'Archive every sales call': 'Archiviare ogni call di vendita',
  'CRM and notetaker transcripts exported into brain-store as one page each.': 'Trascrizioni del CRM e del notetaker esportate in brain-store, una pagina ciascuna.',
  'Voice recorders into the brain': 'Registratori vocali nel brain',
  'Pocket recorder and Recall on /comms; transcripts file themselves into Optimal Engine.': 'Registratore tascabile e Recall su /comms; le trascrizioni si archiviano da sole in Optimal Engine.',
  'Trading board': 'Board di trading',
  'Robinhood and Phantom sleeves, agent reasoning, orders and trade log.': 'Sleeve Robinhood e Phantom, ragionamento dell’agente, ordini e registro dei trade.',
  'Token burn board': 'Board del consumo di token',
  'Live seat-by-seat spend after the August burn; other boxes push in.': 'Spesa in tempo reale postazione per postazione dopo il picco di agosto; le altre macchine inviano i dati.',
  'Worker pool on the host': 'Pool di worker sull’host',
  'Cheap model seats behind the Conductor. Hardening and gateway install left.': 'Postazioni di modelli economici dietro il Conductor. Restano hardening e installazione del gateway.',
  'Statement ingestion': 'Importazione degli estratti conto',
  'Card and bank statements parsed into /finances instead of hand entry.': 'Estratti conto di carte e banca importati in /finances invece dell’inserimento a mano.',
  'Move hosting to Railway': 'Spostare l’hosting su Railway',
  'Every app moving to one platform; the gated OS demo went first as the pilot.': 'Tutte le app passano a un’unica piattaforma; la demo protetta dell’OS è andata per prima come pilota.',
  'Interaction rebrand': 'Rebrand dell’interazione',
  'Alex-led design pass over the whole OS now the integrations are live.': 'Revisione del design di tutto l’OS guidata da Alex, ora che le integrazioni sono attive.',
  'Auth + remote access': 'Auth + accesso remoto',
  'Reach FOUNDER OS on the host from anywhere, safely.': 'Raggiungere FOUNDER OS sull’host da ovunque, in sicurezza.',
  'Replace Postly with Postiz': 'Sostituire Postly con Postiz',
  'Self-hosted scheduler with ungated post and channel analytics.': 'Scheduler self-hosted con analytics di post e canali senza limiti.',
  'Board fully inside the OS': 'Board interamente dentro l’OS',
  'Conductor and 40+ agents driven from the OS, SOPs running as real skills.': 'Conductor e oltre 40 agenti guidati dall’OS, con le SOP eseguite come skill reali.',
  'Real Connections': 'Connessioni reali',
  '4 email inboxes': '4 caselle email',
  'Payment processors': 'Processori di pagamento',
  'Real Agents': 'Agenti reali',
  'Runtime + run log': 'Runtime + registro delle esecuzioni',
  'Honest status board': 'Board di stato onesta',
  'On-demand runs': 'Esecuzioni on demand',
  Autonomy: 'Autonomia',
  'Scheduled runs': 'Esecuzioni pianificate',
  'LLM digests': 'Digest LLM',
  'Failure alerts': 'Avvisi di errore',
  'Dedicated Host': 'Host dedicato',
  'Migrate compute': 'Migrare il calcolo',
  'Remote access + auth': 'Accesso remoto + auth',
  '24/7 uptime': 'Uptime 24/7',

  // ── company.json: skills ─────────────────────────────────────────────────
  'Answer a pricing question without discounting': 'Rispondere a una domanda sui prezzi senza fare sconti',
  'What good looks like when Vera does this, and where to stop and ask.': 'Come appare un buon lavoro quando lo fa Vera, e dove fermarsi a chiedere.',
  '# Answer a pricing question without discounting\n\nWritten down so it runs the same way every time.':
    '# Rispondere a una domanda sui prezzi senza fare sconti\n\nMesso per iscritto perché vada sempre allo stesso modo.',
  'Qualify an inbound lead against the ICP': 'Qualificare un lead in entrata rispetto all’ICP',
  'What good looks like when Beacon does this, and where to stop and ask.': 'Come appare un buon lavoro quando lo fa Beacon, e dove fermarsi a chiedere.',
  '# Qualify an inbound lead against the ICP\n\nWritten down so it runs the same way every time.':
    '# Qualificare un lead in entrata rispetto all’ICP\n\nMesso per iscritto perché vada sempre allo stesso modo.',
  'Book a call without a scheduling round-trip': 'Fissare una call senza avanti e indietro sugli orari',
  'What good looks like when Koda does this, and where to stop and ask.': 'Come appare un buon lavoro quando lo fa Koda, e dove fermarsi a chiedere.',
  '# Book a call without a scheduling round-trip\n\nWritten down so it runs the same way every time.':
    '# Fissare una call senza avanti e indietro sugli orari\n\nMesso per iscritto perché vada sempre allo stesso modo.',
  'Write a case study from a call transcript': 'Scrivere un case study dalla trascrizione di una call',
  'What good looks like when Quill does this, and where to stop and ask.': 'Come appare un buon lavoro quando lo fa Quill, e dove fermarsi a chiedere.',
  '# Write a case study from a call transcript\n\nWritten down so it runs the same way every time.':
    '# Scrivere un case study dalla trascrizione di una call\n\nMesso per iscritto perché vada sempre allo stesso modo.',
  'Cut a long recording into shorts': 'Tagliare una registrazione lunga in short',
  'What good looks like when Ember does this, and where to stop and ask.': 'Come appare un buon lavoro quando lo fa Ember, e dove fermarsi a chiedere.',
  '# Cut a long recording into shorts\n\nWritten down so it runs the same way every time.':
    '# Tagliare una registrazione lunga in short\n\nMesso per iscritto perché vada sempre allo stesso modo.',
  'Turn a changelog into a newsletter': 'Trasformare un changelog in una newsletter',
  '# Turn a changelog into a newsletter\n\nWritten down so it runs the same way every time.':
    '# Trasformare un changelog in una newsletter\n\nMesso per iscritto perché vada sempre allo stesso modo.',
  'Reconcile a bank statement against the ledger': 'Riconciliare un estratto conto con il registro',
  'What good looks like when Sable does this, and where to stop and ask.': 'Come appare un buon lavoro quando lo fa Sable, e dove fermarsi a chiedere.',
  '# Reconcile a bank statement against the ledger\n\nWritten down so it runs the same way every time.':
    '# Riconciliare un estratto conto con il registro\n\nMesso per iscritto perché vada sempre allo stesso modo.',
  'Build a monthly board pack': 'Preparare un board pack mensile',
  'What good looks like when Tessel does this, and where to stop and ask.': 'Come appare un buon lavoro quando lo fa Tessel, e dove fermarsi a chiedere.',
  '# Build a monthly board pack\n\nWritten down so it runs the same way every time.':
    '# Preparare un board pack mensile\n\nMesso per iscritto perché vada sempre allo stesso modo.',
  'Chase an overdue invoice politely twice, then firmly': 'Sollecitare una fattura scaduta due volte con garbo, poi con fermezza',
  'What good looks like when Brisk does this, and where to stop and ask.': 'Come appare un buon lavoro quando lo fa Brisk, e dove fermarsi a chiedere.',
  '# Chase an overdue invoice politely twice, then firmly\n\nWritten down so it runs the same way every time.':
    '# Sollecitare una fattura scaduta due volte con garbo, poi con fermezza\n\nMesso per iscritto perché vada sempre allo stesso modo.',
  'Open an incident and page the right owner': 'Aprire un incidente e avvisare il responsabile giusto',
  'What good looks like when Warden does this, and where to stop and ask.': 'Come appare un buon lavoro quando lo fa Warden, e dove fermarsi a chiedere.',
  '# Open an incident and page the right owner\n\nWritten down so it runs the same way every time.':
    '# Aprire un incidente e avvisare il responsabile giusto\n\nMesso per iscritto perché vada sempre allo stesso modo.',
  'Run the weekly plan and publish what slipped': 'Gestire il piano settimanale e pubblicare ciò che è slittato',
  'What good looks like when Atlas does this, and where to stop and ask.': 'Come appare un buon lavoro quando lo fa Atlas, e dove fermarsi a chiedere.',
  '# Run the weekly plan and publish what slipped\n\nWritten down so it runs the same way every time.':
    '# Gestire il piano settimanale e pubblicare ciò che è slittato\n\nMesso per iscritto perché vada sempre allo stesso modo.',
  'Re-index the knowledge base after a docs change': 'Reindicizzare la knowledge base dopo una modifica alla documentazione',
  'What good looks like when Lumen does this, and where to stop and ask.': 'Come appare un buon lavoro quando lo fa Lumen, e dove fermarsi a chiedere.',
  '# Re-index the knowledge base after a docs change\n\nWritten down so it runs the same way every time.':
    '# Reindicizzare la knowledge base dopo una modifica alla documentazione\n\nMesso per iscritto perché vada sempre allo stesso modo.',
  'Prepare an onboarding pack for a signed client': 'Preparare un pacchetto di onboarding per un cliente firmato',
  'What good looks like when Pike does this, and where to stop and ask.': 'Come appare un buon lavoro quando lo fa Pike, e dove fermarsi a chiedere.',
  '# Prepare an onboarding pack for a signed client\n\nWritten down so it runs the same way every time.':
    '# Preparare un pacchetto di onboarding per un cliente firmato\n\nMesso per iscritto perché vada sempre allo stesso modo.',
  'Summarise a call into decisions and owners': 'Riassumere una call in decisioni e responsabili',
  'What good looks like when Marrow does this, and where to stop and ask.': 'Come appare un buon lavoro quando lo fa Marrow, e dove fermarsi a chiedere.',
  '# Summarise a call into decisions and owners\n\nWritten down so it runs the same way every time.':
    '# Riassumere una call in decisioni e responsabili\n\nMesso per iscritto perché vada sempre allo stesso modo.',
  'Research a prospect before a first call': 'Studiare un prospect prima di una prima call',
  'What good looks like when Nomad does this, and where to stop and ask.': 'Come appare un buon lavoro quando lo fa Nomad, e dove fermarsi a chiedere.',
  '# Research a prospect before a first call\n\nWritten down so it runs the same way every time.':
    '# Studiare un prospect prima di una prima call\n\nMesso per iscritto perché vada sempre allo stesso modo.',
  'Write and test three ad variants': 'Scrivere e testare tre varianti di annuncio',
  'What good looks like when Flint does this, and where to stop and ask.': 'Come appare un buon lavoro quando lo fa Flint, e dove fermarsi a chiedere.',
  '# Write and test three ad variants\n\nWritten down so it runs the same way every time.':
    '# Scrivere e testare tre varianti di annuncio\n\nMesso per iscritto perché vada sempre allo stesso modo.',
  'Escalate to a human with the full thread attached': 'Passare a una persona con il thread completo allegato',
  '# Escalate to a human with the full thread attached\n\nWritten down so it runs the same way every time.':
    '# Passare a una persona con il thread completo allegato\n\nMesso per iscritto perché vada sempre allo stesso modo.',
  'Archive a dead lead and record why': 'Archiviare un lead morto e registrarne il motivo',
  '# Archive a dead lead and record why\n\nWritten down so it runs the same way every time.':
    '# Archiviare un lead morto e registrarne il motivo\n\nMesso per iscritto perché vada sempre allo stesso modo.',

  // ── company.json: agent chats (the operator is "tu") ─────────────────────
  'What slipped yesterday?': 'Cosa è slittato ieri?',
  'Three items, all on Delivery: the Halden onboarding pack, the Calder proposal revision and the September changelog. None are blocked, they ran out of day.':
    'Tre attività, tutte su Delivery: il pacchetto di onboarding di Halden, la revisione della proposta per Calder e il changelog di settembre. Nessuna è bloccata, è finita la giornata.',
  'Move the plan so standup sees them first.': 'Sposta il piano così allo standup le vedono per prime.',
  'Done. The weekly plan now runs at 08:45 instead of 09:30, so the three carry-overs are at the top of the board when standup opens.':
    'Fatto. Il piano settimanale ora parte alle 08:45 invece che alle 09:30, così le tre attività riportate sono in cima alla board quando inizia lo standup.',
  'Anything else at risk this week?': 'Qualcos’altro a rischio questa settimana?',
  'Moved the plan to run before standup. Three items slipped from yesterday, all on Delivery.':
    'Ho spostato il piano prima dello standup. Tre attività sono slittate da ieri, tutte su Delivery.',
  'How many weekend threads are still open?': 'Quanti thread del weekend sono ancora aperti?',
  'Fourteen came in. I have answered eleven: scheduling, two refund questions under the threshold, and the usual "is this still available".':
    'Ne sono arrivati quattordici. Ho risposto a undici: appuntamenti, due richieste di rimborso sotto la soglia e il solito "è ancora disponibile".',
  'And the other three?': 'E gli altri tre?',
  'All three want a price for work we have not quoted before: a custom integration, a two-site rollout and a rush timeline. I drafted holding replies and left them for you.':
    'Tutti e tre chiedono un prezzo per lavori che non abbiamo mai quotato: un’integrazione su misura, un rollout su due sedi e una tempistica urgente. Ho preparato risposte interlocutorie e le ho lasciate a te.',
  'Send the holding replies.': 'Invia le risposte interlocutorie.',
  'Answered eleven of the fourteen weekend threads. The three left need a price I cannot quote.':
    'Ho risposto a undici dei quattordici thread del weekend. Ai tre rimasti serve un prezzo che non posso quotare.',
  'Is September ready to close?': 'Settembre è pronto per la chiusura?',
  'Almost. Every bank line matches a ledger entry except two card charges: $212 at a hardware store and $64 for a SaaS seat I cannot place.':
    'Quasi. Ogni riga della banca corrisponde a una voce del registro, tranne due addebiti su carta: $212 in un negozio di ferramenta e $64 per una licenza SaaS che non riesco a collocare.',
  'Raise them as tasks for me.': 'Crea delle attività per me.',
  'September reconciles except for two card charges with no receipt. Raised as tasks.':
    'Settembre torna, tranne due addebiti su carta senza ricevuta. Create le attività.',
  'Where is Calder?': 'A che punto è Calder?',
  'Opted in, quote sent at $14,000 six days ago. No reply, no opens since Tuesday.':
    'Opt-in fatto, preventivo da $14,000 inviato sei giorni fa. Nessuna risposta, nessuna apertura da martedì.',
  'Draft something that does not read like a chase.': 'Scrivi una bozza che non sembri un sollecito.',
  'Drafted. It quotes their own go-live date back to them and asks whether it still holds, which is a question they want to answer.':
    'Fatto. Riprende la loro data di go-live e chiede se è ancora valida: una domanda a cui vorranno rispondere.',
  'Good. Hold it until Monday.': 'Bene. Tienila ferma fino a lunedì.',
  'Calder has not moved in six days. Drafted a follow-up that references their own timeline.':
    'Calder è fermo da sei giorni. Ho preparato un follow-up che richiama la loro tempistica.',
  'Where is the Halden case study?': 'A che punto è il case study di Halden?',
  'Second draft. 1,400 words, three pull quotes from the kickoff call, the before-and-after on response time.':
    'Seconda bozza. 1.400 parole, tre citazioni dalla call di kickoff, il prima e dopo sui tempi di risposta.',
  'Can it go out this week?': 'Può uscire questa settimana?',
  'Not until Halden signs off on the numbers. Their contract says they approve anything that names them.':
    'Non finché Halden non approva i numeri. Il contratto dice che approvano tutto ciò che li nomina.',
  'Send it to them for sign-off.': 'Mandalo a loro per l’approvazione.',
  'Case study is at second draft. The Halden quote needs their sign-off before it ships.':
    'Il case study è alla seconda bozza. La citazione di Halden va approvata da loro prima di uscire.',
  'Why is Meta Ads red?': 'Perché Meta Ads è rosso?',
  'Every call since 06:00 returns 401. The token is still valid in format, so it was rotated by someone on the ad account, not revoked.':
    'Ogni chiamata dalle 06:00 restituisce 401. Il token ha ancora un formato valido, quindi qualcuno sull’account pubblicitario l’ha ruotato, non revocato.',
  'Can you fix it?': 'Riesci a sistemarlo?',
  'Meta Ads has been returning 401 since 06:00. The key looks rotated, not revoked.':
    'Meta Ads restituisce 401 dalle 06:00. La chiave sembra ruotata, non revocata.',
  'The docs moved to the new folder. Is Optimal Engine up to date?': 'I documenti sono stati spostati nella nuova cartella. Optimal Engine è aggiornato?',
  'Re-indexing now. 418 pages in scope.': 'Sto reindicizzando ora. 418 pagine coinvolte.',
  'Anything break?': 'Si è rotto qualcosa?',
  'Re-indexed after the docs move. Eleven pages changed, two links now dead.':
    'Reindicizzato dopo lo spostamento dei documenti. Undici pagine cambiate, due link ora non funzionano.',

  // ── company.json: workflows ──────────────────────────────────────────────
  'Inbound to booked': 'Dal contatto alla call fissata',
  'every new message read, scored, answered or escalated': 'ogni nuovo messaggio letto, valutato, con risposta o passato a una persona',
  'Message lands': 'Arriva il messaggio',
  'scored in under a minute': 'valutato in meno di un minuto',
  'Inbox triage': 'Smistamento della inbox',
  'Qualify against the ICP': 'Qualifica rispetto all’ICP',
  'fits the profile': 'corrisponde al profilo',
  'ICP scoring': 'Punteggio ICP',
  'Research before the call': 'Ricerca prima della call',
  'brief attached': 'brief allegato',
  'Prospect brief': 'Brief sul prospect',
  'Run the call': 'Fai la call',
  'wants a proposal': 'vuole una proposta',
  'Proposal out, follow-up scheduled': 'Proposta inviata, follow-up programmato',
  'Proposal assembly': 'Composizione della proposta',
  'Recording to published': 'Dalla registrazione alla pubblicazione',
  'one call becomes an article, six clips and a filled calendar': 'una call diventa un articolo, sei clip e un calendario pieno',
  'Recording captured': 'Registrazione acquisita',
  transcribed: 'trascritta',
  'Brief written from the transcript': 'Brief scritto dalla trascrizione',
  'brief approved': 'brief approvato',
  'Brief from transcript': 'Brief dalla trascrizione',
  'Long-form draft': 'Bozza long-form',
  'draft ready for edit': 'bozza pronta per la revisione',
  'First draft': 'Prima bozza',
  'Edit pass': 'Revisione',
  'signed off': 'approvata',
  'Clips cut and scheduled': 'Clip tagliate e programmate',
  'Clip and schedule': 'Taglio e programmazione',
  'Signed to onboarded': 'Dalla firma all’onboarding',
  'the first two weeks, without anyone remembering to start them': 'le prime due settimane, senza che nessuno debba ricordarsi di avviarle',
  'Contract signed': 'Contratto firmato',
  'triggers the pack': 'avvia il pacchetto',
  'Signature watch': 'Monitoraggio firme',
  'Onboarding pack assembled': 'Pacchetto di onboarding pronto',
  'sent day one': 'inviato il primo giorno',
  'Pack assembly': 'Composizione del pacchetto',
  'Kickoff call': 'Call di kickoff',
  'scope confirmed': 'scope confermato',
  'First deliverable': 'Primo deliverable',
  accepted: 'accettato',
  'scope changed after kickoff': 'scope cambiato dopo il kickoff',
  'Handover and cadence set': 'Passaggio di consegne e cadenza definiti',
  'Handover checklist': 'Checklist di passaggio di consegne',
  'Money in, money reconciled': 'Soldi incassati, soldi riconciliati',
  'nightly, against the bank feed, with the exceptions raised as work': 'ogni notte, sul feed bancario, con le eccezioni trasformate in attività',
  'Charges land': 'Arrivano gli addebiti',
  'matched to the ledger': 'abbinati al registro',
  'Nightly reconciliation': 'Riconciliazione notturna',
  'Exceptions raised as tasks': 'Eccezioni trasformate in attività',
  'anything unexplained': 'tutto ciò che non torna',
  'Exception to task': 'Da eccezione ad attività',
  'Overdue chased': 'Scaduti sollecitati',
  'twice politely, then firmly': 'due volte con garbo, poi con fermezza',
  'Dunning ladder': 'Scala dei solleciti',
  'Board pack': 'Board pack',
  'Monthly pack': 'Pack mensile',

  // ── company.json: funnel journeys ────────────────────────────────────────
  'Deployment + 90 days': 'Deployment + 90 giorni',
  'Reel: what an agent actually is': 'Reel: cos’è davvero un agente',
  'Watched the full walkthrough': 'Ha guardato tutta la demo guidata',
  'Asked about the deployment model': 'Ha chiesto del modello di deployment',
  'Introduced their ops lead': 'Ha presentato il proprio responsabile operativo',
  'Kickoff booked': 'Kickoff fissato',
  'Read the teardown end to end': 'Ha letto l’analisi dall’inizio alla fine',
  'Joined the Thursday workshop': 'Ha partecipato al workshop del giovedì',
  'First invoice cleared': 'Prima fattura saldata',
  'Cohort seat': 'Posto nella cohort',
  'Downloaded the architecture notes': 'Ha scaricato le note sull’architettura',
  Signed: 'Firmato',
  'Replied to the newsletter': 'Ha risposto alla newsletter',
  'Booked a call': 'Ha fissato una call',
  'Search: self-hosted business OS': 'Ricerca: OS aziendale self-hosted',

  // ── company.json: Instagram DMs ──────────────────────────────────────────
  'Hey — saw the three-person company video.': 'Ciao, ho visto il video sull’azienda di tre persone.',
  'Is the onboarding pack something we could see before the call?': 'Il pacchetto di onboarding possiamo vederlo prima della call?',
  'Watched the walkthrough twice. How does it handle two businesses?': 'Ho guardato la demo guidata due volte. Come gestisce due attività?',
  'Thanks — booked for Thursday.': 'Grazie, prenotato per giovedì.',
  'Which plan did Northwind end up on?': 'Alla fine Northwind che piano ha scelto?',
  'Got the notes, cheers.': 'Ricevuti gli appunti, grazie.',
  'Can it read our shared inbox as well as mine?': 'Riesce a leggere la nostra inbox condivisa oltre alla mia?',

  // ── company.json: trading rationale ──────────────────────────────────────
  'Gold broke the 20-day band on volume; policy allows one add per breakout.':
    'L’oro ha rotto la banda a 20 giorni con volumi; la policy consente un incremento per breakout.',
  'Weekly contribution, allocated to the underweight sleeve.': 'Versamento settimanale, allocato alla sleeve sottopesata.',
  'Trimmed semis back under the 15% position cap after the run.': 'Ridotti i semiconduttori sotto il limite di posizione del 15% dopo il rialzo.',
  'Energy relative strength over the index for six sessions; sized to risk 1%.':
    'Forza relativa dell’energia sull’indice per sei sedute; dimensionata per rischiare l’1%.',
  'Trimming duration after the rate print; thesis unchanged, size was wrong.':
    'Riduco la duration dopo il dato sui tassi; tesi invariata, era sbagliata la size.',
  'Small caps reclaimed the 50-day; starter position inside the daily trade limit.':
    'Le small cap hanno riconquistato la media a 50 giorni; posizione iniziale entro il limite giornaliero di trading.',
  'Rebalance back to target after last week’s drift.': 'Ribilanciamento al target dopo la deriva della settimana scorsa.',
  'Rejected: would have put $3.9k of notional on a name already past the per-trade band.':
    'Rifiutato: avrebbe messo $3.9k di nozionale su un titolo già oltre la banda per singolo trade.',
  'Took the partial at the first target; the rest rides with the stop moved to cost.':
    'Preso il parziale al primo target; il resto prosegue con lo stop spostato a prezzo di carico.',
  'Opened semis on the earnings gap hold; two-day confirmation per the playbook.':
    'Aperti i semiconduttori sulla tenuta del gap da trimestrale; conferma di due giorni come da playbook.',
  'Scheduled buy; no discretionary call.': 'Acquisto programmato; nessuna scelta discrezionale.',
  'Initial energy allocation from the sleeve plan; half size, add on confirmation.':
    'Allocazione iniziale sull’energia dal piano della sleeve; metà size, incremento su conferma.',
  'Cash above the band, allocated per policy.': 'Liquidità sopra la banda, allocata come da policy.',
  'Initial small-cap allocation from the sleeve plan.': 'Allocazione iniziale sulle small cap dal piano della sleeve.',
  'Gold allocation from the sleeve plan; the hedge leg.': 'Allocazione sull’oro dal piano della sleeve; la gamba di copertura.',

  // ── seed-v1.ts: people ───────────────────────────────────────────────────
  'Head of Sales': 'Responsabile vendite',
  'Head of Growth & Marketing': 'Responsabile growth e marketing',
  'Executive Assistant': 'Assistente di direzione',
  Bookkeeper: 'Contabile',
  'Account Manager': 'Account manager',

  // ── seed-v1.ts: lead magnets ─────────────────────────────────────────────
  'Every layer of the agent stack, and what to use instead of each one': 'Ogni livello dello stack degli agenti, e cosa usare al posto di ciascuno',
  'A workflow pulled apart step by step, with the hours each one costs': 'Un workflow smontato passo per passo, con le ore che costa ogni passaggio',
  'A seat in the next cohort before it opens publicly': 'Un posto nella prossima cohort prima dell’apertura pubblica',
  'Carousel · "One person, a company of agents" (comment STACK)': 'Carosello · "Una persona, un’azienda di agenti" (commenta STACK)',
  'Short · "Where the week actually goes" (comment TEARDOWN)': 'Short · "Dove va davvero la settimana" (commenta TEARDOWN)',
  'Bio link + end cards': 'Link in bio + schermate finali',
  'Ungated. Newsletter signup plus a separate cohort waitlist form.': 'Libero. Iscrizione alla newsletter più un modulo separato per la lista d’attesa della cohort.',
  'Built from the workflows view. Doubles as the cohort lesson one handout.': 'Costruito dalla vista dei workflow. Fa anche da dispensa per la prima lezione della cohort.',
  'Paused between cohorts. Reopen when the next intake is dated.': 'In pausa tra una cohort e l’altra. Riapri quando la prossima iscrizione ha una data.',

  // ── seed-v1.ts: tools ────────────────────────────────────────────────────
  'Markdown brain-store plus a hosted vector backend and local embeddings.': 'Brain-store in markdown più un backend vettoriale in hosting ed embedding locali.',
  'Local markdown knowledge base on disk.': 'Knowledge base locale in markdown su disco.',
  'Local 1024d embeddings behind engine hybrid search, plus the local rerank pass. No key, no vendor.':
    'Embedding locali a 1024d dietro la ricerca ibrida del motore, più il passaggio di rerank locale. Nessuna chiave, nessun fornitore.',
  'Roughly a thousand pages of chunked knowledge. A free tier pauses on idle: unpause from the dashboard when queries fail.':
    'Circa mille pagine di conoscenza suddivisa in chunk. Il free tier va in pausa quando è inattivo: riattivalo dalla dashboard quando le query falliscono.',
  'Local notes vault. Direct filesystem access.': 'Archivio locale di note. Accesso diretto al filesystem.',
  'Six platforms behind one publishing account (IG, TikTok, X…). Key comes from the environment.':
    'Sei piattaforme dietro un unico account di pubblicazione (IG, TikTok, X…). La chiave arriva dall’ambiente.',
  'DM automation, live via the standalone DMFlow MCP. Keyword flows are still authored in the DMFlow UI: the public API has no flow authoring.':
    'Automazione dei DM, attiva tramite l’MCP DMFlow autonomo. I flussi a parola chiave si creano ancora nella UI di DMFlow: l’API pubblica non permette di crearli.',
  'launchpad-cohort community, driven by the documented Playwright workflow.': 'Community launchpad-cohort, gestita dal workflow Playwright documentato.',
  'Vantage and Launchpad Cohort deals, read-scoped (query records, not lists).': 'Deal di Vantage e Launchpad Cohort, in sola lettura (query sui record, non sulle liste).',
  'Offer/payment/customer context for Sales, including the Vantage PayKit lane.': 'Contesto su offerta/pagamento/cliente per le vendite, inclusa la corsia PayKit di Vantage.',
  'Financing options for sales offers and payment-plan context.': 'Opzioni di finanziamento per le offerte di vendita e contesto sui piani di pagamento.',
  'Full client implemented — balance + charges live once STRIPE_SECRET_KEY is set.': 'Client completo implementato: saldo + addebiti attivi appena imposti STRIPE_SECRET_KEY.',
  'CLI wrapper scaffolded; no keys configured.': 'Wrapper CLI impostato; nessuna chiave configurata.',
  'AI meeting notetaker. Needs RECALL_API_KEY for API access.': 'Notetaker AI per le riunioni. Serve RECALL_API_KEY per l’accesso API.',
  'Pocket voice recorder for the room: in-person client meetings, site walks, memos. Transcripts + AI notes over its API; pairs with Recall on the Recordings tab.':
    'Registratore vocale tascabile per gli incontri dal vivo: riunioni con i clienti, sopralluoghi, promemoria. Trascrizioni + note AI tramite la sua API; si affianca a Recall nella scheda Registrazioni.',
  'Revenue attribution for Launchpad Cohort: content → booked calls → payments. Status-only until Trakyo ships a public API (TRAKYO_API_KEY).':
    'Attribuzione dei ricavi per Launchpad Cohort: contenuti → call fissate → pagamenti. Solo stato finché Trakyo non rilascia un’API pubblica (TRAKYO_API_KEY).',
  'Local render pipeline with per-brand themes and a skill library.': 'Pipeline di rendering locale con temi per brand e una libreria di skill.',
  'Authenticated CLI: generate / product-photoshoot / marketing-studio / soul-id.': 'CLI autenticata: generate / product-photoshoot / marketing-studio / soul-id.',
  'UGC ads for Vantage (Veo/Sora/Kling). Basic auth from env.': 'Annunci UGC per Vantage (Veo/Sora/Kling). Basic auth dall’ambiente.',
  'Local transcription CLI plus ffmpeg. Nothing leaves the host.': 'CLI di trascrizione locale più ffmpeg. Nulla lascia l’host.',
  'REST API with a token from the environment. Architecture boards live here.': 'API REST con un token dall’ambiente. Qui vivono le board di architettura.',
  'Connected as session-scoped MCPs. A standalone API needs separate keys.': 'Collegati come MCP a livello di sessione. Un’API autonoma richiede chiavi separate.',
  'Client implemented for 4 inboxes — set INBOX_1..4_HOST/_USER/_PASS.': 'Client implementato per 4 caselle: imposta INBOX_1..4_HOST/_USER/_PASS.',
  'Client implemented. Needs a bot token with channels:read/history scopes.': 'Client implementato. Serve un token bot con gli scope channels:read/history.',
  'Voice dictation. Its local SQLite history is read live.': 'Dettatura vocale. La sua cronologia SQLite locale viene letta in tempo reale.',
  'Desktop app local ChatStorage.sqlite, read-only: local team chats.': 'ChatStorage.sqlite locale dell’app desktop, in sola lettura: chat locali del team.',
  'Kanban, brand deals, sales calls, SOPs and dispatch. Start it with npm run dev.': 'Kanban, brand deal, call di vendita, SOP e smistamento. Avvialo con npm run dev.',
  'Dormant: gateway offline and token missing. Needs a reinstall.': 'Inattivo: gateway offline e token mancante. Va reinstallato.',
  'Multi-session orchestration. The dashboard reads the live session list.': 'Orchestrazione multi-sessione. La dashboard legge l’elenco delle sessioni attive.',
  'Local LLM server :11434, no auth. Start it to enable free local inference.': 'Server LLM locale :11434, senza auth. Avvialo per abilitare l’inferenza locale gratuita.',
  'Authenticated CLI. The deploy target for a public build.': 'CLI autenticata. La destinazione di deploy per una build pubblica.',
  'Authenticated CLI for repos, issues and releases.': 'CLI autenticata per repo, issue e release.',
  'Registered in the processor registry; client lands when keys do.': 'Registrato nel registro dei processori; il client arriva insieme alle chiavi.',

  // ── seed-v1.ts: metrics and the queued post ──────────────────────────────
  'Unread (all inboxes)': 'Non letti (tutte le caselle)',
  'Brain-store Pages': 'Pagine del brain-store',
  'Stripe Available': 'Disponibile su Stripe',
  'Agent Runs Logged': 'Esecuzioni degli agenti registrate',
  'pending creds': 'credenziali in attesa',
  'run Data Agent': 'esegui il Data Agent',
  'all time': 'da sempre',
  'New Vantage case study — 3x pipeline in 60 days. Full breakdown dropping this week 🚀':
    'Nuovo case study Vantage: pipeline 3x in 60 giorni. L’analisi completa esce questa settimana 🚀',

  // ── company.ts: cron runs, brand deals, drift, Wizard projects ───────────
  '{task}: done.': '{task}: fatto.',
  '{task}: failed, retried on the next tick.': '{task}: non riuscito, ritentato al tick successivo.',
  'Category fit and a budget above the floor': 'Categoria in linea e budget sopra la soglia minima',
  '{brand} wants a YouTube integration.': '{brand} vuole un’integrazione su YouTube.',
  '{brand} wants a newsletter feature.': '{brand} vuole uno spazio nella newsletter.',
  '{brand} wants a podcast read.': '{brand} vuole una lettura nel podcast.',
  'Declined on timing.': 'Rifiutato per le tempistiche.',
  'Budget around {amount}.': 'Budget intorno a {amount}.',
  'No budget named yet.': 'Nessun budget indicato per ora.',
  'For an integration in the main video we are at {amount}, which includes the newsletter mention.':
    'Per un’integrazione nel video principale siamo a {amount}, menzione nella newsletter inclusa.',
  'Happy to share rates once we know the format you have in mind.': 'Volentieri condividiamo le tariffe appena sappiamo che formato avete in mente.',
  'Hi, we have been following the channel and think {brand} fits your audience. Would you be open to a partnership this quarter?':
    'Ciao, seguiamo il canale e pensiamo che {brand} sia in linea con il vostro pubblico. Sareste disponibili per una partnership in questo trimestre?',
  'Thanks for reaching out. {ask}': 'Grazie per averci scritto. {ask}',

  'Onboarding takes three weeks': 'L’onboarding richiede tre settimane',
  'Prepare an onboarding pack: assemble the scope, book the kickoff, send day one. Live inside ten working days.':
    'Prepara un pacchetto di onboarding: definisci lo scope, fissa il kickoff, invia il materiale del primo giorno. Operativi entro dieci giorni lavorativi.',
  'Call with Halden & Roe': 'Call con Halden & Roe',
  'Realistically you are looking at three weeks before the inboxes are live.': 'Realisticamente servono tre settimane prima che le caselle siano operative.',
  'Email to Calder Supply': 'Email a Calder Supply',
  'Onboarding usually runs about three weeks end to end.': 'L’onboarding di solito dura circa tre settimane dall’inizio alla fine.',
  'told them three weeks for onboarding, same as last time': 'gli ho detto tre settimane per l’onboarding, come l’ultima volta',
  'The retainer starts at $3,500 a month': 'Il retainer parte da $3,500 al mese',
  'Retainers start at $4,500 a month. Hold the price; trade scope, not rate.': 'I retainer partono da $4,500 al mese. Tieni il prezzo; negozia lo scope, non la tariffa.',
  'Call with Ossington Partners': 'Call con Ossington Partners',
  'Retainers start around three and a half a month.': 'I retainer partono da circa tre e mezzo al mese.',
  'DM thread, Kestrel Health': 'Thread DM, Kestrel Health',
  'Monthly support starts at $3.5k.': 'Il supporto mensile parte da $3.5k.',
  'Proposal draft, Dunmore Foods': 'Bozza di proposta, Dunmore Foods',
  'Ongoing retainer: $3,500 per month.': 'Retainer continuativo: $3,500 al mese.',
  'The newsletter goes out on Fridays': 'La newsletter esce il venerdì',
  'Wren writes the weekly newsletter from what shipped; it sends Tuesday at 9am.': 'Wren scrive la newsletter settimanale da ciò che è stato rilasciato; parte il martedì alle 9.',
  'Content standup notes': 'Note dello standup contenuti',
  'Friday send, so the hooks need to be in by Thursday.': 'Invio il venerdì, quindi gli hook vanno consegnati entro giovedì.',
  'Reply to a reader': 'Risposta a un lettore',
  'It lands every Friday morning.': 'Arriva ogni venerdì mattina.',
  'Sponsor brief, Hollis Audio': 'Brief dello sponsor, Hollis Audio',
  'Placement runs in the Friday issue.': 'Lo spazio esce nel numero del venerdì.',
  'Books are reconciled weekly': 'La contabilità viene riconciliata ogni settimana',
  'Reconcile the day: match charges to the ledger every night and raise the exceptions as work.':
    'Riconcilia la giornata: abbina ogni notte gli addebiti al registro e trasforma le eccezioni in attività.',
  'Board pack draft': 'Bozza del board pack',
  'Ledger reconciled weekly against the bank feed.': 'Registro riconciliato ogni settimana con il feed bancario.',
  'Call with the bookkeeper': 'Call con il contabile',
  'We close the books every Friday.': 'Chiudiamo i conti ogni venerdì.',
  'weekly recon is done, two exceptions': 'riconciliazione settimanale fatta, due eccezioni',

  'Get Halden & Roe live by the 14th': 'Rendere operativi Halden & Roe entro il 14',
  'Halden & Roe signed. I want them live by the 14th without me chasing anyone.':
    'Halden & Roe hanno firmato. Li voglio operativi entro il 14 senza dover rincorrere nessuno.',
  'Split it three ways: Pike builds the onboarding pack, Vera takes the scope change reply, Atlas puts the kickoff on the plan. I will move it to done when all three close.':
    'L’ho diviso in tre: Pike prepara il pacchetto di onboarding, Vera risponde sulla modifica dello scope, Atlas mette il kickoff nel piano. Lo segno come fatto quando si chiudono tutte e tre.',
  'Assemble the onboarding pack': 'Preparare il pacchetto di onboarding',
  'Reply on the scope change': 'Rispondere sulla modifica dello scope',
  'Book the kickoff and add it to the plan': 'Fissare il kickoff e aggiungerlo al piano',
  'Close September': 'Chiudere settembre',
  'Close the books for September and tell me what changed against plan.': 'Chiudi i conti di settembre e dimmi cosa è cambiato rispetto al piano.',
  'Sable reconciles the month against the bank feed, Brisk chases the two invoices past thirty days, and Tessel writes the board pack once both are in.':
    'Sable riconcilia il mese con il feed bancario, Brisk sollecita le due fatture scadute da oltre trenta giorni e Tessel scrive il board pack quando entrambe sono a posto.',
  'Chase the two overdue invoices': 'Sollecitare le due fatture scadute',
  'Write the September board pack': 'Scrivere il board pack di settembre',
  'Launch week content': 'Contenuti della settimana di lancio',
  'Turn the launch call into a week of content.': 'Trasforma la call di lancio in una settimana di contenuti.',
  'Quill drafts the article from the transcript, Ember cuts six clips, Cinder schedules them across the week and Wren writes the newsletter around it.':
    'Quill scrive la bozza dell’articolo dalla trascrizione, Ember taglia sei clip, Cinder le programma nella settimana e Wren ci costruisce attorno la newsletter.',
  'Draft the article from the launch call': 'Scrivere la bozza dell’articolo dalla call di lancio',
  'Cut six clips': 'Tagliare sei clip',
  'Schedule the week': 'Programmare la settimana',
  'Write the launch newsletter': 'Scrivere la newsletter di lancio',

  // ── brain.ts: the knowledge store's page text ────────────────────────────
  'The done-for-you arm. Builds AI intake and operations systems for service businesses, sold as a fixed sprint or a monthly retainer. Delivery runs through the Clients pillar; pipeline through Sales.':
    'Il ramo done-for-you. Costruisce sistemi AI di acquisizione e operazioni per aziende di servizi, venduti come sprint a prezzo fisso o retainer mensile. La consegna passa dal pilastro Clienti; la pipeline dalle Vendite.',
  'The mentorship programme. Six weeks, live, a small group building their own operating system with guidance. Sold paid-in-full or on a three-payment plan; leads arrive from the webinar and Instagram DMs.':
    'Il programma di mentorship. Sei settimane, dal vivo, un piccolo gruppo che costruisce il proprio sistema operativo con una guida. Venduto in un’unica soluzione o in tre rate; i lead arrivano dal webinar e dai DM di Instagram.',
  '## Pipeline': '## Pipeline',
  'Owned by {a} and {b}.': 'Di competenza di {a} e {b}.',
  '## Agents': '## Agenti',
  '## People': '## Persone',
  '## Standard work': '## Procedure standard',
  '- none yet': '- ancora nessuno',
  '- none written down': '- nessuna messa per iscritto',
  'Reports to {parent}.': 'Riporta a {parent}.',
  'Leads its pillar.': 'Guida il suo pilastro.',
  '**{role}** in {dept}. {parent}': '**{role}** in {dept}. {parent}',
  'Tools: {tools}.': 'Strumenti: {tools}.',
  none: 'nessuno',
  'Model: {model}.': 'Modello: {model}.',
  'Works in: {tools}.': 'Lavora in: {tools}.',
  'Deal: {product}, {amount}.': 'Deal: {product}, {amount}.',
  '{role} at {company}. ': '{role} presso {company}. ',
  'At {company}. ': 'Presso {company}. ',
  'In the {venture} pipeline, {relationship} with a {likelihood}% likelihood to buy.':
    'Nella pipeline {venture}, relazione {relationship} con una probabilità di acquisto del {likelihood}%.',
  'Owner: {owner}.': 'Responsabile: {owner}.',
  'Client account. People: {people}.': 'Account cliente. Persone: {people}.',
  'Delivery tracked by {dept}.': 'Consegna seguita da {dept}.',
  'Category: {category}. Status: {status}.': 'Categoria: {category}. Stato: {status}.',
  'Owner: {who}, {dept}.': 'Responsabile: {who}, {dept}.',
  'Run by {agent}.': 'Eseguita da {agent}.',
  Step: 'Passaggio',
  'Revenue it carries: {amount}. See {a} and {b}.': 'Ricavi che sostiene: {amount}. Vedi {a} e {b}.',
  ' Pillar: {dept}.': ' Pilastro: {dept}.',
  'Campaign: {campaign}.': 'Campagna: {campaign}.',
  'Feeds {venture}.': 'Alimenta {venture}.',
  'Call with {person}': 'Call con {person}',
  '{date}. {contact} on {product}.': '{date}. {contact} su {product}.',
  '- Walked through the current week and where the hours go': '- Analizzata la settimana in corso e dove finiscono le ore',
  '- Agreed scope and start date; {agent} sends the proposal': '- Concordati scope e data di inizio; {agent} invia la proposta',
  '- Follow-up owned by {agent}': '- Follow-up a cura di {agent}',
  'Daily briefing': 'Briefing quotidiano',
  '{date}. Built at 7am by {agent} from every inbox, Slack and the calendar.': '{date}. Preparato alle 7 da {agent} da ogni casella, Slack e il calendario.',
  '- Two clients waiting on a reply: {clients}': '- Due clienti in attesa di risposta: {clients}',
  '- Brand deal pipeline: four drafts need approval before noon': '- Pipeline dei brand deal: quattro bozze da approvare entro mezzogiorno',
  '- The pipeline moved: one deal to opted in, one stalled for a week': '- La pipeline si è mossa: un deal passato a opt-in, uno fermo da una settimana',
  '- Kickoff today, prep pack from {agent}': '- Kickoff oggi, pacchetto di preparazione da {agent}',
  'Sender rules': 'Regole sui mittenti',
  'Who gets an answer from an agent and who waits for a human.': 'Chi riceve una risposta da un agente e chi aspetta una persona.',
  '- A known client sender goes to {agent}, drafted, never sent without sign-off': '- Un mittente cliente noto va a {agent}, in bozza, mai inviato senza approvazione',
  '- A brand deal sender goes to the approval queue with the quote parsed': '- Un mittente di brand deal va nella coda di approvazione con il preventivo già letto',
  '- A new sender with a pricing question is scored by {agent} against the ICP first': '- Un nuovo mittente con una domanda sui prezzi viene prima valutato da {agent} rispetto all’ICP',
  '- Anything about money owed goes to {agent}': '- Tutto ciò che riguarda crediti da incassare va a {agent}',
};

export default IT;

function fill(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** Demo text in the current locale: the Italian entry when GLADOS_LOCALE=it,
 *  the English source otherwise. `{name}` placeholders are filled either way,
 *  so an English template renders exactly as the template literal it replaced. */
export function dt(text: string, vars?: Record<string, string | number>): string {
  const hit = locale() === 'it' && Object.prototype.hasOwnProperty.call(IT, text) ? IT[text] : text;
  return fill(hit, vars);
}

/** The fields of the exported company that carry text a person reads. Every
 *  other key (ids, names, status/stage/kind, dates, urls, handles…) is never
 *  touched, even when its value happens to match a dictionary entry. */
const TEXT_KEYS = new Set([
  'name',
  'tagline',
  'role',
  'description',
  'title',
  'summary',
  'steps',
  'items',
  'content',
  'subtitle',
  'detail',
  'edgeLabel',
  'condition',
  'markdown',
  'product',
  'label',
  'text',
  'rationale',
]);

/** The exported company with its readable text in the current locale. A
 *  string is replaced only when it sits under a TEXT_KEYS field and is an
 *  exact dictionary key; object keys are never translated. Identity in English. */
export function localizeCompany<T>(value: T): T {
  if (locale() !== 'it') return value;
  const walk = (v: unknown, key: string | null): unknown => {
    if (typeof v === 'string') return key != null && TEXT_KEYS.has(key) && Object.prototype.hasOwnProperty.call(IT, v) ? IT[v] : v;
    if (Array.isArray(v)) return v.map((x) => walk(x, key));
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, k)]));
    return v;
  };
  return walk(value, null) as T;
}
