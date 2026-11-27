# Caixa de sugestões (Apps Script)

Este é o código que recebe as ideias enviadas pelo formulário `#formSug` do
`index.html` e grava uma linha na planilha
[Caixa de sugestões](https://docs.google.com/spreadsheets/d/15y6uM8KqGPtVi_TWBNSDnQbpycKoBnXaLrZ9n7ytEO8).

Antes ele vivia só no editor do Apps Script; agora fica versionado aqui.

## Como publicar

1. Abra a planilha → **Extensões › Apps Script**.
2. Apague o conteúdo do `Code.gs` e cole o `CaixaDeSugestoes.gs` inteiro.
3. Confira no topo: `SPREADSHEET_ID` e `SHEET_NAME` (a aba é criada se não existir).
4. **Implantar › Nova implantação** → tipo **App da Web**
   - Executar como: **eu**
   - Quem pode acessar: **qualquer pessoa**
5. Copie a URL que termina em `/exec` e cole em `index.html`, na constante
   `URL_CAIXA` (por volta da linha 933) — **em base64**, não em texto puro:
   ```powershell
   [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('<URL /exec>'))
   ```
   O site decodifica em runtime com `atob()`, então a URL não aparece pronta
   para raspadores de bot no código-fonte.

> Toda alteração no código precisa de **Implantar › Gerenciar implantações ›
> editar › Nova versão**. Sem isso a URL `/exec` continua rodando a versão antiga.

## Como testar sem o site

```powershell
$u = '<URL /exec>'
$body = '{"tipo":"Ideia de treta","ig":"@teste","texto":"TESTE - pode apagar","site":""}'
Invoke-WebRequest -Uri $u -Method POST -Body ([Text.Encoding]::UTF8.GetBytes($body)) `
  -ContentType 'text/plain;charset=utf-8' -UseBasicParsing
```

Respostas esperadas:

| Situação | Resposta |
| --- | --- |
| gravou | `{"ok":true}` |
| robô (campo `site` preenchido) | `{"ok":true,"ignorado":true}` |
| robô (preencheu em menos de 2 s) | `{"ok":true,"ignorado":true}` |
| `@` fora do padrão do Instagram | `{"ok":false,"erro":"instagram invalido"}` |
| mesmo @ em menos de 60 s | `{"ok":false,"erro":"espera: uma ideia por minuto"}` |
| falha real (planilha/aba/permissão) | `{"ok":false,"erro":"..."}` |

O site já sabe lidar com os dois formatos: mostra "O porteiro guardou sua ideia!"
quando `ok` é verdadeiro e "A caixa emperrou..." quando `ok` é falso.

## Blindagem do frontend (index.html)

O `#formSug` não chama o `/exec` direto: antes de qualquer requisição ele passa
por estas travas, e todas valem também no `CaixaDeSugestoes.gs`:

| Trava | Onde | O que faz |
| --- | --- | --- |
| URL em base64 | `URL_CAIXA` | o endereço não aparece no HTML para raspadores de bot |
| honeypot `#sugSite` | form + `doPost` | bot que preenche o campo oculto recebe "guardou" e nada é gravado |
| tempo mínimo 2,5 s | `MINIMO_MS` + `ts` | envio rápido demais é descartado (front e back) |
| 1 ideia por minuto | `localStorage` + `CacheService` | trava no navegador **e** no servidor, por @ |
| teto de 6 tentativas | `MAX_REDE` | freia flood por página aberta |
| `@` validado | `ARROBA` | só letras, números, ponto e `_`, até 30 caracteres |
| texto saneado | `limpar()` | remove caracteres de controle e espaços repetidos, corta em 1000 |
| anti-fórmula | `celula()` + `setNumberFormat('@')` | ideia com `=`, `+` ou `-` não vira fórmula na planilha |
| timeout 15 s | `AbortController` | botão não fica preso em "Enviando…" |
| CSP + `no-referrer` | `<head>` | página só fala com o próprio site, Apps Script e Google Fonts |

A CSP (`connect-src`) libera apenas `script.google.com` e
`script.googleusercontent.com`. Se um dia o script mudar de domínio ou o site
passar a carregar imagem de outro host, é essa linha que precisa de ajuste.

## Colunas gravadas

`data` · `instagram` · `categoria` · `texto` · `status` · `origem`

Mesma ordem da aba **Sugestões** da planilha. `status` nasce como `nova` — é o
campo que o comando `/episodio` espera ao ler `data/sugestoes.csv`
(nova / lida / usada).

## Ordem das abas (armadilha que já confundiu)

A planilha tem duas abas: `Sheet1` (vazia, primeira) e `Sugestões` (onde os
dados caem). O link abre na primeira aba, então parece que nada chegou.
O ideal é **excluir a `Sheet1` vazia** ou arrastar `Sugestões` para a
posição 1 — o script continua gravando pelo nome da aba, não pela posição.
