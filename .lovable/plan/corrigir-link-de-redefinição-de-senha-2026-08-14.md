# Corrigir link de redefinição de senha

Sintoma: o e-mail chega, mas ao abrir o link o navegador diz que não foi possível acessar o site.

## Diagnóstico

O pedido de recuperação envia como destino o endereço da janela em que o usuário estava (`window.location.origin` em `src/pages/Login.tsx`). Quando isso acontece dentro do preview do Lovable (ou de um endereço temporário/sandbox), o link do e-mail aponta para um endereço que depois deixa de existir — daí o "não foi possível acessar o site". O mesmo acontece se o endereço não estiver na lista de URLs permitidas do Supabase: nesse caso o Supabase redireciona para a "Site URL" configurada, que hoje pode ainda ser um valor padrão (localhost), também inacessível.

## Correções

1. Destino fixo e confiável do link (`src/pages/Login.tsx`)
   - Usar sempre o endereço público do app (`https://pokeruff.lovable.app/reset-password`) como destino do e-mail, exceto quando o app estiver rodando em `localhost` (aí mantém o endereço local, útil para desenvolvimento).

2. Configuração de autenticação no Supabase
   - Definir a Site URL como `https://pokeruff.lovable.app`.
   - Adicionar às URLs de redirecionamento permitidas: `https://pokeruff.lovable.app/**`, o endereço de preview do projeto e `http://localhost:8080/**`.

3. Tela de nova senha mais robusta (`src/pages/ResetPassword.tsx`)
   - Hoje a tela pode ficar presa em "Verificando link de recuperação..." se o evento de recuperação acontecer antes do listener iniciar, ou se o link estiver expirado.
   - Passa a aceitar também: sessão já ativa, parâmetros `code`/`token_hash` na URL (formatos novos de link do Supabase) e mostrar mensagem clara de "link inválido ou expirado" com botão para pedir um novo e-mail, em vez de travar na tela de verificação.

## Detalhes técnicos

- `Login.tsx`: `redirectTo` calculado por helper — `window.location.hostname === "localhost" ? window.location.origin : "https://pokeruff.lovable.app"` + `/reset-password`.
- `ResetPassword.tsx`: no `useEffect`, checar `supabase.auth.getSession()`, tratar `?error_description=` / `#error=`, e chamar `verifyOtp({ type: "recovery", token_hash })` ou `exchangeCodeForSession(code)` quando esses parâmetros existirem. Estado passa a ser `checking | ready | invalid`.
- Configuração de auth via ferramenta do Supabase (site_url + redirect URLs); nenhuma migração de banco necessária.
