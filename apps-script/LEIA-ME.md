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
   `URL_CAIXA` (por volta da linha 924).

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
| mesmo @ em menos de 60 s | `{"ok":false,"erro":"espera: uma ideia por minuto"}` |
| falha real (planilha/aba/permissão) | `{"ok":false,"erro":"..."}` |

O site já sabe lidar com os dois formatos: mostra "O porteiro guardou sua ideia!"
quando `ok` é verdadeiro e "A caixa emperrou..." quando `ok` é falso.

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
