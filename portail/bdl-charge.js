/* Bureau des Légendes — chargeur de l'habillage du portail.
   Référencé par le bloc « Script » de chaque page. Il ne change jamais :
   il charge la dernière version de bdl-portail.js (branche test), rafraîchie toutes les 5 minutes. */
(function () {
  if (window.__bdlCharge) return;
  window.__bdlCharge = true;
  var s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/gh/Workplay-fr/bureau-des-legendes@test/portail/bdl-portail.js?v=" + Math.floor(Date.now() / 300000);
  s.async = true;
  document.head.appendChild(s);
})();
