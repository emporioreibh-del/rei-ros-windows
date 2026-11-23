// ROS do Rei para Windows — 19/11/2026 (Livia: "quero o nosso próprio, sem sistema pago").
// É uma "TV" para o ROS: abre o MESMO ROS de sempre (ros.deliverydorei.com.br), mas como programa. Por isso:
//  • nunca "dorme" (o Chrome congela aba que não está na frente — era por isso que a comanda só saía ao abrir o ROS);
//  • imprime DIRETO na impressora, sem a janelinha, mesmo minimizado (window.rosDesktop.imprimir, ver preload.js);
//  • o som toca sem precisar clicar em "Ativar som";
//  • abre junto com o Windows; fechar no X só esconde (fica no relógio do Windows), para não parar de imprimir;
//  • atualiza SOZINHO pelo GitHub (as telas do ROS já atualizam sozinhas — vêm da internet).
// Nada de senha ou chave aqui: o login é o mesmo do ROS, feito na própria tela.
const { app, BrowserWindow, ipcMain, Tray, Menu, Notification, shell, nativeImage } = require('electron');
const path = require('node:path');

const URL_ROS = 'https://ros.deliverydorei.com.br/pedidos';
const HOST_ROS = 'ros.deliverydorei.com.br';
// SEGURANÇA: só o endereço EXATO do ROS (https) abre dentro do programa e enxerga window.rosDesktop.
const ehRos = (u) => { try { const x = new URL(u); return x.protocol === 'https:' && x.hostname === HOST_ROS; } catch { return false; } };
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');   // som sem clicar
app.commandLine.appendSwitch('disable-renderer-backgrounding');                  // nunca dormir
app.commandLine.appendSwitch('disable-background-timer-throttling');

if (!app.requestSingleInstanceLock()) { app.quit(); }
let janela = null; let tray = null; let saindo = false;
const icone = () => nativeImage.createFromPath(path.join(__dirname, 'build', 'icon.png'));

function mostrar() { if (!janela) return; if (janela.isMinimized()) janela.restore(); janela.show(); janela.focus(); }

function criarJanela() {
  janela = new BrowserWindow({
    width: 1366, height: 820, show: false, autoHideMenuBar: true, title: 'ROS do Rei', icon: icone(),
    backgroundColor: '#ffffff',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false },
  });
  janela.once('ready-to-show', () => { janela.maximize(); janela.show(); });
  janela.loadURL(URL_ROS);
  // Link para fora do ROS (WhatsApp, iFood, Google…) abre no navegador, não dentro do programa.
  janela.webContents.setWindowOpenHandler(({ url }) => { if (!ehRos(url)) { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; } return { action: 'allow' }; });
  janela.webContents.on('will-navigate', (e, url) => { if (!ehRos(url)) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
  janela.webContents.on('will-redirect', (e, url) => { if (!ehRos(url)) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
  // Sem internet: tenta de novo a cada 15 s (o ROS volta sozinho quando a internet voltar).
  janela.webContents.on('did-fail-load', (_e, codigo) => { if (codigo !== -3) setTimeout(() => janela?.loadURL(URL_ROS), 15_000); });
  janela.webContents.on('render-process-gone', () => setTimeout(() => janela?.loadURL(URL_ROS), 2_000));
  // 23/11 (Livia) — F5 e Ctrl+R recarregam a tela, como no navegador (o menu escondido não fazia isso).
  janela.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F5' || ((input.control || input.meta) && String(input.key).toLowerCase() === 'r')) { e.preventDefault(); janela.webContents.reload(); }
  });
  // Fechar no X = esconder. Sair de verdade só pelo ícone perto do relógio › Sair.
  janela.on('close', (e) => { if (!saindo) { e.preventDefault(); janela.hide(); } });
}

let atualizacaoPronta = null; // 23/11 — versão nova já baixada, esperando instalar
function menuTray() {
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir o ROS', click: mostrar },
    { label: 'Recarregar', click: () => janela?.webContents.reload() },
    ...(atualizacaoPronta ? [{ label: `⬆️ Instalar a versão ${atualizacaoPronta} agora (reabre sozinho)`, click: instalarAgora }] : []),
    { type: 'separator' },
    { label: `Versão ${app.getVersion()}`, enabled: false },
    { label: 'Sair (para de imprimir)', click: () => { saindo = true; app.quit(); } },
  ]));
}
function instalarAgora() {
  try { saindo = true; require('electron-updater').autoUpdater.quitAndInstall(true, true); } catch { saindo = false; }
}
function criarTray() {
  tray = new Tray(icone().resize({ width: 16, height: 16 }));
  tray.setToolTip('ROS do Rei — imprimindo');
  menuTray();
  tray.on('click', mostrar);
}

// ── Impressão direto na impressora (sem janelinha) ────────────────────────────────────────────
// Uma folha por vez (a tela já manda em fila). Folha = página pronta da tela, do tamanho medido lá.
async function imprimir({ html, larguraMm, alturaMm, impressora }) {
  const folha = new BrowserWindow({ show: false, webPreferences: { sandbox: true, javascript: false } });
  try {
    await folha.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(String(html ?? '')));
    const largura = Math.round((Number(larguraMm) || 80) * 1000);           // mícrons
    const altura = Math.max(30_000, Math.round((Number(alturaMm) || 200) * 1000));
    const lista = await folha.webContents.getPrintersAsync();
    const nome = impressora && lista.some((p) => p.name === impressora) ? impressora : (lista.find((p) => p.isDefault)?.name ?? undefined);
    return await new Promise((pronto) => {
      folha.webContents.print({ silent: true, printBackground: true, deviceName: nome, margins: { marginType: 'none' }, pageSize: { width: largura, height: altura } },
        (ok, erro) => pronto(ok ? { ok: true } : { ok: false, erro: String(erro || 'a impressora recusou') }));
    });
  } catch (e) { return { ok: false, erro: e.message }; }
  finally { setTimeout(() => { if (!folha.isDestroyed()) folha.destroy(); }, 3_000); }
}
ipcMain.on('ros:versao', (e) => { e.returnValue = app.getVersion(); });
ipcMain.handle('ros:imprimir', (e, o) => (ehRos(e.senderFrame?.url ?? '') ? imprimir(o ?? {}) : { ok: false, erro: 'origem não autorizada' }));
ipcMain.handle('ros:impressoras', async (e) => !ehRos(e.senderFrame?.url ?? '') ? [] : (await janela.webContents.getPrintersAsync()).map((p) => ({ nome: p.name, padrao: !!p.isDefault })));
ipcMain.on('ros:avisar', (e, o) => {
  if (!ehRos(e.senderFrame?.url ?? '')) return;
  try { if (Notification.isSupported()) new Notification({ title: String(o?.titulo ?? 'ROS do Rei'), body: String(o?.texto ?? ''), icon: icone() }).show(); } catch { /* sem aviso, segue */ }
  if (janela && !janela.isFocused()) { mostrar(); janela.flashFrame(true); }
});

app.on('second-instance', mostrar);
app.whenReady().then(() => {
  app.setAppUserModelId('br.com.deliverydorei.ros');
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: true });   // abre junto com o Windows
  // SEGURANÇA: câmera, microfone, localização etc. só para o ROS (o leitor de código pela câmera usa); o resto é negado.
  const { session } = require('electron');
  session.defaultSession.setPermissionRequestHandler((wc, _perm, ok) => ok(ehRos(wc.getURL())));
  session.defaultSession.setPermissionCheckHandler((wc) => !!wc && ehRos(wc.getURL()));
  criarJanela(); criarTray();
  // Atualização sozinha: baixa a versão nova em segundo plano e instala na próxima vez que o programa abrir.
  if (app.isPackaged) {
    try {
      const { autoUpdater } = require('electron-updater');
      autoUpdater.autoInstallOnAppQuit = true;
      // 23/11 (Livia: o ícone novo não chegou) — o X só esconde, então "instalar ao fechar" quase nunca acontecia.
      // Agora: versão baixada aparece no menu do ícone (perto do relógio) e é instalada sozinha de madrugada (4h).
      autoUpdater.on('update-downloaded', (info) => {
        atualizacaoPronta = info?.version ?? 'nova'; menuTray();
        try { new Notification({ title: 'ROS do Rei', body: `Versão ${atualizacaoPronta} pronta. Clique com o botão direito no ícone perto do relógio › Instalar agora.`, icon: icone() }).show(); } catch { /* sem aviso */ }
      });
      setInterval(() => { if (atualizacaoPronta && new Date().getHours() === 4) instalarAgora(); }, 10 * 60 * 1000);
      autoUpdater.checkForUpdatesAndNotify().catch(() => {});
      setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 6 * 60 * 60 * 1000);
    } catch { /* sem atualizador, segue */ }
  }
});
// A janela nunca é destruída (o X só esconde); o programa fecha só pelo menu do ícone › Sair.
app.on('window-all-closed', () => { if (saindo) app.quit(); });
