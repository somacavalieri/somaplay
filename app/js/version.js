// version.js — a versão do app, em X.Y.Z.
//
// Este número é lido em dois lugares: aqui, para mostrar em Ajustes, e em sw.js,
// como chave do cache (`somaplay-<versão>`). Os dois literais são mantidos em
// sincronia por app/test/version.test.js — o mesmo recurso que i18n.test.js usa
// para as duas tabelas de tradução. O projeto não tem build step, então não há
// etapa onde injetar a versão num só lugar.
//
// Regras de quando subir cada dígito, e o que marca a 1.0.0:
// docs/superpowers/specs/2026-08-14-versionamento-design.md
export const VERSION = '0.11.1';
