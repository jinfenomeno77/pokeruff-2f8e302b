# Correções pontuais na página de Torneios

Duas correções isoladas em `src/pages/Tournaments.tsx`. Sem refatoração de estrutura ou de estilos.

## 1. Fim do "pulo" de layout no carregamento

Hoje o esqueleto (`loading`) e o conteúdo real (Próximo Torneio, torneio ao vivo, Torneios Anteriores) podem renderizar juntos, porque os dados chegam antes de `loading` virar false.

Correção: as seções de conteúdo passam a renderizar apenas quando `loading` for false, mantendo cada bloco exatamente como está hoje — só a condição muda:
- Próximo Torneio (linha ~425): `!loading && nextTournament`
- Torneio ao vivo (linha ~484): `!loading && inProgress`
- Torneios Anteriores (linha ~761): `!loading && past.length > 0`

Assim, ou aparece o esqueleto, ou aparece o conteúdo — nunca os dois.

## 2. Popup não mostra mais dados do torneio anterior

Em `openTournament` (linhas ~195-208):
- Limpar `setRegistrations([])` e `setUserRegistration(null)` imediatamente ao abrir, antes da busca — a lista fica vazia/carregando em vez de exibir os inscritos do torneio anterior.
- Guard contra respostas fora de ordem: guardar o id do torneio clicado numa ref (`openRequestRef`) atualizada no início da função; ao terminar a busca, só aplicar `setRegistrations`/`setUserRegistration` se `openRequestRef.current === t.id`. Se o usuário já clicou em outro torneio, a resposta atrasada é descartada.

## Detalhes técnicos

- Nova `useRef<string | null>(null)` no componente para o guard de concorrência.
- `handleRegister` continua chamando `openTournament` para recarregar; o guard não afeta esse fluxo, pois o torneio selecionado permanece o mesmo.
