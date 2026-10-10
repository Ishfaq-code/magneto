// Shared navigation for every viewer page.
const header=document.getElementById('appHeader');
header.innerHTML='<div><span class="mark">M</span><strong>Magneto</strong><span class="sub">Parts viewer</span></div><nav aria-label="Main tabs"><button id="viewerTab" aria-pressed="true">Viewer</button><button id="designsTab" aria-pressed="false">Designs</button></nav>';
document.getElementById('viewerTab').onclick=()=>location.href='index.html';
document.getElementById('designsTab').onclick=()=>location.href='index.html#designs';
