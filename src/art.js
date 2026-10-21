/* ---------- 패션 일러스트 (사이드 룩북·장식) — OTJAL · Rat Rae Choi ---------- */
const ART = (() => {
  const SK="#EBC6B0", SKd="#D9A98C", INK="#2A2228";
  const legsF=(x1,x2,y0,y1,shoe)=>`<path d="M${x1-5} ${y0} L${x1-3} ${y1} L${x1+2} ${y1} L${x1+5} ${y0}Z M${x2-5} ${y0} L${x2-2} ${y1} L${x2+3} ${y1} L${x2+5} ${y0}Z" fill="${SK}"/>
    <path d="M${x1-5} ${y1} q4 -3 8 0 l7 6 q1 3 -3 3 h-12z M${x2-5} ${y1} q4 -3 8 0 l7 6 q1 3 -3 3 h-12z" fill="${shoe}"/>
    <path d="M${x1-4} ${y1+5} l-1 7 M${x2-4} ${y1+5} l-1 7" stroke="${shoe}" stroke-width="2.2"/>`;
  const headF=(hair,x=100,y=58)=>`<path d="M${x-6} ${y+18} h12 v14 h-12z" fill="${SKd}"/>
    <ellipse cx="${x}" cy="${y}" rx="15" ry="19" fill="${SK}"/>
    <path d="M${x-17} ${y+4} C${x-20} ${y-26} ${x+20} ${y-28} ${x+17} ${y-2} C${x+19} ${y+16} ${x+22} ${y+34} ${x+14} ${y+44} C${x+12} ${y+30} ${x+11} ${y+10} ${x+6} ${y-8} C${x-2} ${y-2} ${x-10} ${y-2} ${x-14} ${y+6} C${x-15} ${y+20} ${x-17} ${y+34} ${x-21} ${y+40} C${x-24} ${y+24} ${x-20} ${y+12} ${x-17} ${y+4}Z" fill="${hair}"/>
    <path d="M${x-7} ${y+9} q7 4 14 0" stroke="#C0707A" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  const headM=(hair,x=100,y=58)=>`<path d="M${x-7} ${y+18} h14 v15 h-14z" fill="${SKd}"/>
    <ellipse cx="${x}" cy="${y}" rx="15" ry="19" fill="${SK}"/>
    <path d="M${x-16} ${y-2} C${x-18} ${y-26} ${x+18} ${y-28} ${x+16} ${y-4} C${x+10} ${y-12} ${x-4} ${y-16} ${x-16} ${y-2}Z" fill="${hair}"/>
    <path d="M${x-6} ${y+10} q6 2 12 0" stroke="#A9786C" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  function coatF(c){ return `<svg viewBox="0 0 200 470" xmlns="http://www.w3.org/2000/svg">
    ${legsF(88,112,318,428,INK)}
    <path d="M70 98 C60 140 56 200 50 330 L150 330 C144 200 140 140 130 98 C118 90 82 90 70 98Z" fill="${c}"/>
    <path d="M70 98 C62 120 56 160 52 214 L62 216 C64 170 70 140 78 112Z M130 98 C138 120 144 160 148 214 L138 216 C136 170 130 140 122 112Z" fill="${shade(c,-.12)}"/>
    <path d="M52 214 l-4 46 l10 2 l4 -46z M148 214 l4 46 l-10 2 l-4 -46z" fill="${shade(c,-.12)}"/>
    <ellipse cx="53" cy="268" rx="6" ry="8" fill="${SK}"/><ellipse cx="147" cy="268" rx="6" ry="8" fill="${SK}"/>
    <path d="M86 94 L100 150 L114 94" fill="#F6EFE8"/><path d="M86 94 L100 150 L114 94" fill="none" stroke="${INK}" stroke-width="1"/>
    <path d="M100 150 L100 330" stroke="${shade(c,-.3)}" stroke-width="1.2"/>
    <path d="M58 196 H142" stroke="${shade(c,-.3)}" stroke-width="7"/><rect x="94" y="190" width="12" height="12" rx="2" fill="none" stroke="#D8B66A" stroke-width="2"/>
    <circle cx="92" cy="166" r="2.4" fill="${shade(c,-.4)}"/><circle cx="92" cy="230" r="2.4" fill="${shade(c,-.4)}"/>
    <rect x="140" y="262" width="34" height="28" rx="6" fill="${INK}"/><path d="M146 263 q11 -18 22 0" stroke="${INK}" stroke-width="2.4" fill="none"/>
    ${headF("#3A2620")}</svg>`; }
  function dressF(c){ return `<svg viewBox="0 0 200 470" xmlns="http://www.w3.org/2000/svg">
    ${legsF(90,110,300,428,"#E0577D")}
    <path d="M78 98 C74 130 80 160 86 178 L58 300 C90 312 110 312 142 300 L114 178 C120 160 126 130 122 98 C110 92 90 92 78 98Z" fill="${c}"/>
    <path d="M58 300 C90 312 110 312 142 300" stroke="${shade(c,-.25)}" stroke-width="2" fill="none"/>
    <path d="M86 178 H114" stroke="${shade(c,-.3)}" stroke-width="4"/>
    <path d="M78 100 C68 140 66 180 70 214 M122 100 C132 140 134 180 130 214" stroke="${SK}" stroke-width="8" stroke-linecap="round" fill="none"/>
    ${[...Array(9)].map((_,i)=>`<circle cx="${70+((i*37)%60)}" cy="${200+((i*53)%95)}" r="3.2" fill="#fff" opacity=".85"/>`).join("")}
    ${headF("#4B3226")}
    <ellipse cx="100" cy="42" rx="40" ry="8" fill="#E9D8C0"/><path d="M80 42 C80 18 120 18 120 42Z" fill="#E9D8C0"/><path d="M80 38 h40" stroke="${INK}" stroke-width="3"/></svg>`; }
  function suitM(c){ return `<svg viewBox="0 0 200 470" xmlns="http://www.w3.org/2000/svg">
    <path d="M76 250 L80 420 L97 420 L100 270 L103 420 L120 420 L124 250Z" fill="${shade(c,-.08)}"/>
    <path d="M78 420 h22 l2 8 h-26z M100 420 h22 l2 8 h-26z" fill="${INK}"/>
    <path d="M66 100 C60 150 60 210 64 262 L136 262 C140 210 140 150 134 100 C120 90 80 90 66 100Z" fill="${c}"/>
    <path d="M66 100 C58 140 56 190 56 240 L66 242 C68 190 70 150 76 118Z M134 100 C142 140 144 190 144 240 L134 242 C132 190 130 150 124 118Z" fill="${shade(c,-.15)}"/>
    <ellipse cx="61" cy="250" rx="6" ry="8" fill="${SK}"/><ellipse cx="139" cy="250" rx="6" ry="8" fill="${SK}"/>
    <path d="M88 94 L100 160 L112 94Z" fill="#F7F5F2"/><path d="M97 100 L100 150 L103 100 L100 96Z" fill="#8E2F3E"/>
    <path d="M86 94 L100 160 L96 170 L80 110Z M114 94 L100 160 L104 170 L120 110Z" fill="${shade(c,-.25)}"/>
    <path d="M100 160 V262" stroke="${shade(c,-.35)}" stroke-width="1.2"/><circle cx="104" cy="200" r="2.4" fill="${INK}"/><circle cx="104" cy="230" r="2.4" fill="${INK}"/>
    <path d="M118 128 h12" stroke="#fff" stroke-width="2.4"/>
    ${headM("#1E1715")}</svg>`; }
  function coatM(c){ return `<svg viewBox="0 0 200 470" xmlns="http://www.w3.org/2000/svg">
    <path d="M80 320 L82 420 L98 420 L100 330 L102 420 L118 420 L120 320Z" fill="#2E3440"/>
    <path d="M78 420 h22 l2 8 h-26z M100 420 h22 l2 8 h-26z" fill="#F2EEE8"/><path d="M78 426 h24 M100 426 h24" stroke="#C9C2B8" stroke-width="2"/>
    <path d="M66 100 C58 160 56 240 54 330 L146 330 C144 240 142 160 134 100 C120 90 80 90 66 100Z" fill="${c}"/>
    <path d="M66 100 C58 140 54 200 54 250 L64 252 C66 200 70 150 76 118Z M134 100 C142 140 146 200 146 250 L136 252 C134 200 130 150 124 118Z" fill="${shade(c,-.14)}"/>
    <ellipse cx="59" cy="260" rx="6" ry="8" fill="${SK}"/><ellipse cx="141" cy="260" rx="6" ry="8" fill="${SK}"/>
    <path d="M86 92 C90 110 96 130 100 140 C104 130 110 110 114 92" fill="#2B2F3A"/>
    <path d="M100 140 V330" stroke="${shade(c,-.35)}" stroke-width="1.2"/>
    <path d="M82 92 C86 120 92 140 100 156 L94 160 C84 140 78 120 76 100Z M118 92 C114 120 108 140 100 156 L106 160 C116 140 122 120 124 100Z" fill="${shade(c,-.22)}"/>
    ${headM("#2A201C")}</svg>`; }
  function still(c,g){ return `<svg viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg">
    <path d="M100 30 C100 22 108 20 110 14 C112 6 102 2 96 8" fill="none" stroke="#B79A6B" stroke-width="3" stroke-linecap="round"/>
    <path d="M100 30 L48 64 Q42 70 50 72 H150 Q158 70 152 64Z" fill="none" stroke="#B79A6B" stroke-width="3" stroke-linejoin="round"/>
    <path d="M56 70 C52 110 50 150 46 200 L154 200 C150 150 148 110 144 70 C126 78 74 78 56 70Z" fill="${c}"/>
    <path d="M86 72 L100 96 L114 72" fill="none" stroke="${shade(c,-.3)}" stroke-width="1.4"/>
    <path d="M58 200 C70 196 130 196 142 200" stroke="${shade(c,-.25)}" stroke-width="1.6" fill="none"/>
    ${g==="M" ? `<path d="M18 250 C20 236 38 232 54 238 L74 246 Q80 252 72 253 H20Z" fill="#FBFAF7" stroke="#BDB5AA" stroke-width="1.6"/><path d="M18 250 H76" stroke="#BDB5AA" stroke-width="3"/><path d="M34 238 l6 8 M42 236 l6 9" stroke="#BDB5AA" stroke-width="1.4"/>` : `<path d="M24 250 C30 228 52 226 62 236 L70 246 Q72 252 64 252 H30 Z" fill="${INK}"/><path d="M28 250 l-4 -26" stroke="${INK}" stroke-width="3"/>`}
    <rect x="140" y="214" width="40" height="36" rx="7" fill="#E9D8C0"/><path d="M148 215 q12 -22 24 0" stroke="#B79A6B" stroke-width="2.4" fill="none"/>
    <path d="M90 216 h20 v34 h-20z" fill="#F6E5EA" stroke="#D9A9B6"/><rect x="95" y="208" width="10" height="9" rx="2" fill="#D8B66A"/></svg>`; }
  const pal = { F:[["coat","#C9A27C","Trench & Tweed"],["dress","#F2B6C6","Flower Midi"],["still","#E8E1F5","Weekend Edit"]],
                M:[["suit","#2C3A5E","Office Classic"],["coatM","#6B6F78","Balmacaan Coat"],["still","#DCE6F3","Daily Basics"]] };
  const fn={coat:coatF,dress:dressF,suit:suitM,coatM,still};
  return { list:g=>pal[g].map(([k,c,cap])=>({svg:fn[k](c,g),cap})), still, coatF, dressF, suitM, coatM };
})();
