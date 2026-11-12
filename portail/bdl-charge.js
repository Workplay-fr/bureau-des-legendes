/* Bureau des Légendes — chargeur de l'habillage du portail.
   Référencé par le bloc « Script » de chaque page. Il ne change jamais :
   il demande à GitHub le dernier commit de la branche « test » et charge
   bdl-portail.js à cette version précise via jsDelivr (jamais de cache périmé). */
(function () {
  if (window.__bdlCharge) return;
  window.__bdlCharge = true;
  var R = "Workplay-fr/bureau-des-legendes", F = "/portail/bdl-portail.js", K = "bdl_sha";
  function go(ref) {
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/gh/" + R + "@" + ref + F;
    s.async = true;
    document.head.appendChild(s);
  }
  var c = null;
  try { c = JSON.parse(sessionStorage.getItem(K) || "null"); } catch (e) {}
  if (c && Date.now() - c.t < 120000) return go(c.s);
  fetch("https://api.github.com/repos/" + R + "/commits/test", { headers: { Accept: "application/vnd.github.sha" } })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function (sha) {
      sha = sha.trim().slice(0, 40);
      if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error("sha");
      try { sessionStorage.setItem(K, JSON.stringify({ s: sha, t: Date.now() })); } catch (e) {}
      go(sha);
    })
    .catch(function () { go("test"); });
})();
