/* Bureau des Légendes — page d'accueil du portail.
   Chargé par le bloc « Script » du plan de page « home ».
   Un membre connecté qui arrive sur l'accueil (clic sur le logo, connexion)
   est envoyé vers son tableau de bord. Les visiteurs non connectés restent sur l'accueil. */
(function () {
  var html = document.documentElement;
  if (!html.classList.contains("nxd-logged-in")) return;
  var base = (location.pathname.match(/^\/[^/]+/) || ["/bureaudeslegendesparis"])[0];
  if (!/^\/[^/]+\/?$/.test(location.pathname) && location.pathname !== "/") return;
  var cible = base + "/user/dashboard/personal";
  try {
    history.replaceState(history.state, "", cible);
    dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
  } catch (e) {}
  setTimeout(function () {
    if (location.pathname !== cible || !document.querySelector(".dashboard-content-container, .user-main-content")) location.replace(cible);
  }, 1500);
})();
