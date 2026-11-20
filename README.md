# ROS do Rei para Windows

Programa do computador do balcão. Abre o mesmo ROS de sempre (https://ros.deliverydorei.com.br), mas:
- imprime direto na impressora, sem a janelinha, mesmo minimizado;
- nunca "dorme" (o Chrome congelava a aba e a comanda só saía ao abrir o ROS);
- toca o som sem precisar clicar em "Ativar som";
- abre junto com o Windows; o X só esconde (ícone perto do relógio › Sair para fechar de verdade);
- atualiza sozinho (as telas vêm da internet; o programa em si pelo GitHub Releases).

Nova versão: subir o número em package.json, `git tag vX.Y.Z && git push --tags` — o GitHub gera o instalador.
Sem segredo neste repositório: o login é o do próprio ROS.
