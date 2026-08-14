# Corrigir a logo que não aparece

## O que está acontecendo

A nova logo foi publicada como asset de CDN (`src/assets/logo-pokeruff.png.asset.json`) e o código aponta para a URL `/__l5e/assets-v1/.../logo-pokeruff.png`. Ao pedir essa URL no ambiente atual, o servidor devolve o HTML do app (código 200, `text/html`, 1.6 KB) em vez do PNG — ou seja, a rota do CDN não é servida aqui, e o `<img>` recebe HTML e não renderiza nada.

## Correção

Passar a logo a ser um arquivo de imagem do próprio projeto, importado pelo bundler — assim funciona no preview e no site publicado, sem depender da rota de CDN.

1. Salvar o PNG enviado em `src/assets/logo-pokeruff.png`.
2. Em `src/pages/Index.tsx` e `src/components/AppHeader.tsx`, trocar o import do pointer JSON por `import logo from "@/assets/logo-pokeruff.png"`.
3. Remover o pointer `src/assets/logo-pokeruff.png.asset.json` (e apagar o asset do CDN, já que não será mais usado) e o antigo `src/assets/logo-pokeruff.jpeg`, que não é mais referenciado.
4. Manter o estilo atual (`object-contain`, sem fundo redondo vermelho) no hero e no header.

## Verificação

Abrir o preview e conferir que a logo aparece no hero e na barra superior, checando que a requisição da imagem retorna `image/png` e não HTML.
