// Ponte segura entre o ROS (site) e o programa: o site só enxerga estas funções, nada do Windows além disso.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('rosDesktop', {
  versao: ipcRenderer.sendSync('ros:versao'),
  imprimir: (o) => ipcRenderer.invoke('ros:imprimir', o),
  impressoras: () => ipcRenderer.invoke('ros:impressoras'),
  avisar: (o) => ipcRenderer.send('ros:avisar', o),
  // 23/11 (1.0.4) — impressora escondida: qual janela sou eu, e o "estou viva" do laço de impressão
  papel: ipcRenderer.sendSync('ros:papel'),
  batida: (o) => ipcRenderer.send('ros:batida', o ?? {}),
});
