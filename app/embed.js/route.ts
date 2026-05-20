import { NextResponse } from "next/server";

import { appUrl } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// One-line embed loader. Marketing site adds:
//   <script src="https://swell.swellbrands.co/embed.js" data-form="slug" async></script>
// We inject an iframe pointing at /f/<slug>?embed=1 and auto-size it from
// resize messages sent by the form page.
export async function GET() {
  const host = appUrl().replace(/\/$/, "");

  const js = `(function(){
  if (window.__swellFormsLoaded) return;
  window.__swellFormsLoaded = true;
  var HOST = ${JSON.stringify(host)};

  function mountFor(script){
    var slug = script.getAttribute("data-form");
    if (!slug) return;
    if (script.dataset.swellMounted === "1") return;
    script.dataset.swellMounted = "1";

    var iframe = document.createElement("iframe");
    iframe.src = HOST + "/f/" + encodeURIComponent(slug) + "?embed=1";
    iframe.title = "Catering inquiry";
    iframe.loading = "lazy";
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("scrolling", "no");
    iframe.style.width = "100%";
    iframe.style.maxWidth = "640px";
    iframe.style.border = "0";
    iframe.style.background = "transparent";
    iframe.style.display = "block";
    iframe.style.margin = "0 auto";
    iframe.dataset.swellFormSlug = slug;
    script.parentNode.insertBefore(iframe, script);
  }

  function mountAll(){
    var scripts = document.querySelectorAll(
      'script[src*="/embed.js"][data-form]'
    );
    for (var i = 0; i < scripts.length; i++) mountFor(scripts[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountAll);
  } else {
    mountAll();
  }

  window.addEventListener("message", function(e){
    var data = e && e.data;
    if (!data || data.type !== "swell-form-resize") return;
    var frames = document.querySelectorAll("iframe[data-swell-form-slug]");
    for (var i = 0; i < frames.length; i++) {
      var f = frames[i];
      if (f.dataset.swellFormSlug === data.slug && typeof data.height === "number") {
        f.style.height = (data.height + 8) + "px";
      }
    }
  });
})();`;

  return new NextResponse(js, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
