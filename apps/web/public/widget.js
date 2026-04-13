(function () {
  "use strict";

  var ISYAGENT_BASE = "https://isyagent-web.vercel.app";

  function init(config) {
    var token = config && config.token;
    if (!token) {
      console.error("[IsyAgent Widget] Missing required option: token");
      return;
    }

    var position = (config && config.position) || "bottom-right";
    var primaryColor = (config && config.primaryColor) || "#2563eb";

    // Button
    var btn = document.createElement("button");
    btn.id = "isyagent-btn";
    btn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>';

    var isRight = position.indexOf("right") !== -1;
    var isBottom = position.indexOf("bottom") !== -1;

    Object.assign(btn.style, {
      position: "fixed",
      bottom: isBottom ? "24px" : "auto",
      top: isBottom ? "auto" : "24px",
      right: isRight ? "24px" : "auto",
      left: isRight ? "auto" : "24px",
      zIndex: "999998",
      width: "52px",
      height: "52px",
      borderRadius: "50%",
      border: "none",
      backgroundColor: primaryColor,
      color: "#fff",
      cursor: "pointer",
      boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "transform 0.2s, box-shadow 0.2s",
    });

    btn.addEventListener("mouseenter", function () {
      btn.style.transform = "scale(1.08)";
      btn.style.boxShadow = "0 6px 20px rgba(0,0,0,0.22)";
    });
    btn.addEventListener("mouseleave", function () {
      btn.style.transform = "scale(1)";
      btn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.18)";
    });

    // Iframe container
    var container = document.createElement("div");
    container.id = "isyagent-container";
    Object.assign(container.style, {
      position: "fixed",
      bottom: isBottom ? "88px" : "auto",
      top: isBottom ? "auto" : "88px",
      right: isRight ? "24px" : "auto",
      left: isRight ? "auto" : "24px",
      zIndex: "999999",
      width: "360px",
      height: "520px",
      borderRadius: "16px",
      overflow: "hidden",
      boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      display: "none",
      border: "1px solid rgba(0,0,0,0.08)",
      transition: "opacity 0.2s, transform 0.2s",
      opacity: "0",
      transform: "scale(0.96) translateY(8px)",
    });

    var iframe = document.createElement("iframe");
    iframe.src = ISYAGENT_BASE + "/widget/" + encodeURIComponent(token);
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.allow = "microphone";

    container.appendChild(iframe);

    var isOpen = false;

    btn.addEventListener("click", function () {
      isOpen = !isOpen;
      if (isOpen) {
        container.style.display = "block";
        requestAnimationFrame(function () {
          container.style.opacity = "1";
          container.style.transform = "scale(1) translateY(0)";
        });
      } else {
        container.style.opacity = "0";
        container.style.transform = "scale(0.96) translateY(8px)";
        setTimeout(function () {
          container.style.display = "none";
        }, 200);
      }
    });

    document.body.appendChild(btn);
    document.body.appendChild(container);
  }

  // Public API
  window.IsyAgent = { init: init };

  // Auto-init from script tag data attributes
  var scripts = document.querySelectorAll("script[data-isyagent-token]");
  for (var i = 0; i < scripts.length; i++) {
    var s = scripts[i];
    init({
      token: s.getAttribute("data-isyagent-token"),
      position: s.getAttribute("data-isyagent-position") || "bottom-right",
      primaryColor: s.getAttribute("data-isyagent-color") || "#2563eb",
    });
  }
})();
