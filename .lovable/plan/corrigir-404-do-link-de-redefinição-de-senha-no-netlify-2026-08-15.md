# Corrigir 404 do link de redefinição de senha no Netlify

## Diagnóstico (verificado)

O projeto não tem nenhum arquivo de configuração de hospedagem do Netlify: `public/` contém apenas `favicon.ico`, `placeholder.svg` e `robots.txt`, e não existe `netlify.toml` na raiz.

O app é uma SPA com React Router (`BrowserRouter`, rota `/reset-password` registrada em `src/App.tsx`). O Netlify, ao receber uma URL direta como `https://<site>/reset-password`, procura um arquivo físico com esse nome. Como não existe e não há regra de fallback, ele devolve a página "Page not found" do Netlify — antes do React sequer carregar. Por isso o link do e-mail cai em página não encontrada.

Isso afeta qualquer link direto ou F5 em rotas internas (`/tournaments`, `/admin`, `/live`, etc.), não só a redefinição de senha.

## Correção

1. Criar `public/_redirects` com a regra de fallback de SPA:
   ```text
   /*    /index.html   200
   ```
   O Vite copia esse arquivo para `dist/`, que é o que o Netlify publica.

2. Criar `netlify.toml` na raiz com build e o mesmo fallback, para funcionar mesmo se o publish directory for reconfigurado:
   - `[build] command = "npm run build"`, `publish = "dist"`
   - `[[redirects]] from = "/*"`, `to = "/index.html"`, `status = 200`

Esses arquivos são ignorados pela hospedagem da Lovable (que já faz fallback de SPA nativamente), então não afetam o preview nem o site publicado na Lovable.

## Depois do deploy

Confirmar no Supabase (Authentication > URL Configuration), já que é projeto externo:
- Site URL: o domínio real do Netlify
- Redirect URLs: `https://<seu-site>.netlify.app/**`, `https://id-preview--6aa4ac72-e335-4cc1-b296-d2a142357e01.lovable.app/**`, `http://localhost:8080/**`

O `redirectTo` no código já usa o domínio atual da janela, então funciona nos três ambientes.
