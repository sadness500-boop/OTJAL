/* 팔도 제철맛길 — 휴대폰 앱(안드로이드·아이폰) 연결 코드
   · 앱 안에서는 길찾기·출처 링크를 휴대폰 브라우저(또는 카카오맵 앱)로 엽니다.
   · 웹(PWA)으로 열면 오프라인에서도 열리도록 화면 파일을 저장합니다. */
(function () {
  var C = window.Capacitor;
  var N = window.NativeApp; // 안드로이드 앱(자체 빌드) 연결
  var isApp = !!(N || (C && C.isNativePlatform && C.isNativePlatform()));
  document.documentElement.classList.toggle("is-app", isApp);

  // 바깥 링크 열기: 앱이면 시스템 브라우저(카카오맵 앱 연결 가능), 웹이면 새 탭
  window.openExternal = function (url) {
    if (N) { N.open(url); return; }
    var B = isApp && C && C.Plugins && C.Plugins.Browser;
    if (B) { B.open({ url: url, presentationStyle: "popover" }); return; }
    window.open(url, "_blank", "noopener");
  };
  document.addEventListener("click", function (e) {
    if (!isApp) return;
    var a = e.target.closest && e.target.closest('a[target="_blank"]');
    if (!a || a.hasAttribute("data-ext")) return; // data-ext 링크는 지도 코드가 이미 처리
    e.preventDefault(); window.openExternal(a.href);
  }, true);

  // 뒤로 가기(앱): 열린 팝업 → 지도 말풍선 → 맨 위로. 처리했으면 true
  window.__appBack = function () {
    var pop = document.getElementById("pop");
    if (window.__invClose && window.__invClose()) return true;
    if (pop && !pop.hidden) { var x = document.getElementById("popX"); if (x) x.click(); return true; }
    if (window.PALDO && window.PALDO.map && document.querySelector(".leaflet-popup")) { window.PALDO.map.closePopup(); return true; }
    var sug = document.getElementById("mmSug"); if (sug && !sug.hidden) { sug.hidden = true; return true; }
    if (window.scrollY > 200) { window.scrollTo({ top: 0, behavior: "smooth" }); return true; }
    return false;
  };

  // 앱: 상태 표시줄 색 · 시작 화면 닫기 (Capacitor 빌드)
  if (isApp && C && C.Plugins) {
    var P = C.Plugins || {};
    try {
      var dark = matchMedia("(prefers-color-scheme: dark)").matches;
      if (P.StatusBar) { P.StatusBar.setStyle({ style: dark ? "DARK" : "LIGHT" }); P.StatusBar.setBackgroundColor && P.StatusBar.setBackgroundColor({ color: dark ? "#141816" : "#f2f3ee" }); }
    } catch (e) {}
    window.addEventListener("load", function () { setTimeout(function () { try { P.SplashScreen && P.SplashScreen.hide(); } catch (e) {} }, 300); });
    // 안드로이드 뒤로가기: 열린 팝업부터 닫기
    try {
      P.App && P.App.addListener("backButton", function () { if (!window.__appBack()) P.App.exitApp(); });
    } catch (e) {}
  }

  // 웹(PWA): 오프라인 저장
  if (!isApp && "serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }
})();
