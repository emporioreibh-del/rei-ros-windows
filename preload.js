// Ponte segura entre o ROS (site) e o programa: o site só enxerga estas 3 funções, nada do Windows além disso.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('rosDesktop', {
  versao: ipcRenderer.sendSync('ros:versao'),
  imprimir: (o) => ipcRenderer.invoke('ros:imprimir', o),
  impressoras: () => ipcRenderer.invoke('ros:impressoras'),
  avisar: (o) => ipcRenderer.send('ros:avisar', o),
});
