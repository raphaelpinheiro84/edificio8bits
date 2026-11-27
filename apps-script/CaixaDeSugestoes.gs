/**
 * Caixa de sugestões do site Edifício 8 Bits.
 *
 * Recebe o POST JSON enviado por index.html (#formSug) e grava uma linha
 * na planilha do Drive. A URL /exec gerada na publicação vai para a
 * constante URL_CAIXA em index.html.
 *
 * Publicar: Implantar > Nova implantação > tipo "App da Web"
 *   Executar como: eu
 *   Quem pode acessar: qualquer pessoa
 * Depois de qualquer alteração: Implantar > Gerenciar implantações > editar
 * e escolher "Nova versão" (sem isso a URL /exec continua rodando o código antigo).
 */

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------
var SPREADSHEET_ID = '15y6uM8KqGPtVi_TWBNSDnQbpycKoBnXaLrZ9n7ytEO8';
var SHEET_NAME = 'Sugestões'; // se não existir, é criada na primeira gravação
var TIMEZONE = 'America/Sao_Paulo';
var HEADERS = ['data_hora', 'tipo', 'instagram', 'texto', 'origem', 'status'];
var WAIT_SECONDS = 60; // uma ideia por minuto por @ (igual à mensagem do site)
var MIN_TEXTO = 10;

// ---------------------------------------------------------------------------
// Entrada
// ---------------------------------------------------------------------------
function doPost(e) {
  try {
    var dados = lerCorpo(e);
    if (!dados) return resposta({ ok: false, erro: 'corpo_ilegivel' });

    // Armadilha anti-bot: campo escondido preenchido = robô. Não grava.
    if (String(dados.site || '').trim()) return resposta({ ok: true, ignorado: true });

    var tipo = String(dados.tipo || '').trim();
    var ig = String(dados.ig || '').trim().replace(/^@/, '');
    var texto = String(dados.texto || '').trim();

    if (!ig) return resposta({ ok: false, erro: 'informe o @' });
    if (texto.length < MIN_TEXTO) return resposta({ ok: false, erro: 'texto curto demais' });
    if (texto.length > 1000) texto = texto.slice(0, 1000);

    var cache = CacheService.getScriptCache();
    var chave = 'ideia:' + ig.toLowerCase();
    if (cache.get(chave)) return resposta({ ok: false, erro: 'espera: uma ideia por minuto' });

    var aba = abaDeDestino();
    var linha = [
      Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss'),
      tipo,
      '@' + ig,
      texto,
      'site',
      'nova'
    ];

    var trava = LockService.getScriptLock();
    trava.waitLock(20000);
    try {
      aba.appendRow(linha);
    } finally {
      trava.releaseLock();
    }

    cache.put(chave, '1', WAIT_SECONDS);
    return resposta({ ok: true });
  } catch (err) {
    return resposta({ ok: false, erro: String(err && err.message ? err.message : err) });
  }
}

function doGet() {
  return resposta({
    ok: true,
    info: 'Caixa de sugestões do Edifício 8 Bits',
    planilha: SPREADSHEET_ID,
    aba: SHEET_NAME
  });
}

// ---------------------------------------------------------------------------
// Apoio
// ---------------------------------------------------------------------------
function lerCorpo(e) {
  if (!e) return null;
  if (e.postData && e.postData.contents) {
    var bruto = e.postData.contents;
    try {
      return JSON.parse(bruto);
    } catch (x) {
      try {
        return e.parameter || null;
      } catch (y) {
        return null;
      }
    }
  }
  return e.parameter || null;
}

function abaDeDestino() {
  var planilha = SpreadsheetApp.openById(SPREADSHEET_ID);
  var aba = planilha.getSheetByName(SHEET_NAME);
  if (!aba) {
    aba = planilha.insertSheet(SHEET_NAME);
    aba.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    aba.setFrozenRows(1);
  } else if (aba.getLastRow() === 0) {
    aba.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    aba.setFrozenRows(1);
  }
  return aba;
}

function resposta(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
