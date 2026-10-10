import { importEbook, ebookStore } from './ebook.js';
// Reading records are separate from learning progress and saved CAD designs.
const key = 'magneto-stories-v1';
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeLink = value => { try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } };
let books = [], storageOK = true;
const loadedEbooks = new Map();
let readerSize = 20;
try {
  const saved = JSON.parse(localStorage.getItem(key) || '[]');
  if (!Array.isArray(saved)) throw new Error('Invalid shelf');
  books = saved.filter(b => b && typeof b.id === 'string' && typeof b.title === 'string' && typeof b.author === 'string' && ['pages','chapters'].includes(b.unit) && Number.isSafeInteger(b.total) && b.total > 0 && Number.isSafeInteger(b.current) && b.current >= 0 && b.current <= b.total);
} catch { storageOK = false; }
function save() {
  try { localStorage.setItem(key, JSON.stringify(books)); storageOK = true; }
  catch { storageOK = false; }
}
const demoKey = 'magneto-caterpillar-demo-v1';
let demo = {step:0, response:''}, opened = null;
try {
  const saved = JSON.parse(localStorage.getItem(demoKey));
  if (saved && Number.isInteger(saved.step) && saved.step >= 0 && saved.step <= 3 && ['', 'incorrect', 'correct', 'help'].includes(saved.response) && (saved.step < 2 || saved.response)) demo = saved;
} catch { storageOK = false; }
const caterpillar = `<svg viewBox="0 0 260 140" aria-hidden="true"><path d="M32 116Q130 85 239 116" fill="none" stroke="#a2ac61" stroke-width="3"/>${[0,1,2,3,4].map((n)=>`<ellipse cx="${66+n*31}" cy="${91-Math.sin(n)*12}" rx="25" ry="31" fill="${['#719851','#448567','#88a654','#428062','#98aa51'][n]}" transform="rotate(${n*8-15} ${66+n*31} 85)"/>`).join('')}<ellipse cx="207" cy="65" rx="29" ry="33" fill="#c35c48"/><path d="M194 34l-7-16m31 15 8-19" stroke="#766089" stroke-width="5" stroke-linecap="round"/><ellipse cx="199" cy="61" rx="6" ry="9" fill="#e8d679"/><ellipse cx="218" cy="59" rx="6" ry="9" fill="#e8d679"/><path d="M205 78q7 6 12-2" fill="none" stroke="#563e33" stroke-width="3"/></svg>`;
function demoView() {
  const reinforce = demo.response !== 'correct';
  const heading = ['Monday · The apple','Tuesday · The pears','Wednesday · The plums','A lovely little adventure.'][demo.step];
  const fruit = ['🍎','🍐','🟣','🦋'][demo.step];
  const copy = [
    'The teacher reads the apple passage from the book and offers the apple prop. A is already familiar, so the story keeps moving.',
    'The teacher reads the pear passage and offers the pear prop. P could use a little practice. Explore the pear, then identify the letter.',
    reinforce ? 'Plum begins with P too. Let’s use this new prop to revisit the letter, then return to the story.' : 'P was recognized confidently with the pear. Enjoy the plum passage with your teacher and keep the story flowing.',
    'You’ve finished this mock interaction. Your teacher can continue reading the original book.'
  ][demo.step];
  return `<button class="back text-button" id="story-close">← Back to my books</button><p class="tag">The Very Hungry Caterpillar · Mock interaction</p><h1>${heading}</h1><section class="panel demo-scene"><div class="demo-fruit" aria-hidden="true">${fruit}</div><p class="intro">${copy}</p>${demo.step === 1 || (demo.step === 2 && reinforce) ? `<div class="demo-letter"><span class="braille" role="img" aria-label="Braille P: left top, left middle, left bottom, and right top dots raised">${[1,2,3,4,5,6].map(n=>`<span class="dot ${n<=4?'raised':''}"></span>`).join('')}</span><div><strong>Magneto previews P</strong><p>On-screen simulation. The teacher provides the tactile letter and records the learner’s response.</p></div></div>` : ''}
  ${demo.step === 0 ? '<aside class="demo-decision"><strong>Keep the story flowing</strong><p>A is familiar. No extra activity needed.</p></aside><button class="primary" id="demo-next">Continue to the pears →</button>' : ''}
  ${demo.step === 1 ? '<aside class="demo-decision"><strong>Simulated scene check</strong><p>Apple, pear and plum props are available. Choose the pear for a short P activity.</p></aside><h2>What happened?</h2><p>Teacher: record the learner’s spoken, signed, or assisted response.</p><div class="choices"><button class="secondary" data-response="incorrect">Incorrect</button><button class="primary" data-response="correct">Correct</button><button class="secondary" data-response="help">Help</button></div>' : ''}
  ${demo.step === 2 ? `<aside class="demo-decision"><strong>${reinforce?'Reinforce P':'Continue the story'}</strong><p>${reinforce ? 'The pear activity needed support. Compare familiar A with P, then invite the learner to recognize P again using the plum.' : 'The learner recognized P with confidence. There’s no need to interrupt again.'}</p></aside><button class="primary" id="demo-next">${reinforce?'Finish practice and resume story':'Continue reading'} →</button>` : ''}
  ${demo.step === 3 ? '<button class="primary" id="story-close-done">Back to my books</button><button class="secondary" id="demo-restart">Try another response</button>' : ''}</section><p class="hint">Illustrative decision logic only. No connected Databricks, camera inspection, or Braille hardware. This demo uses activity summaries; read the story from the teacher’s own book.</p>`;
}
export function stories() {
  if (opened === 'demo') return demoView();
  const selected = Number.isInteger(opened) ? books[opened] : null;
  if (selected?.imported) {
    const content = loadedEbooks.get(selected.id), position = Math.min(selected.position || 0, selected.total-1);
    readerSize = [20,24,30].includes(selected.textSize) ? selected.textSize : 20;
    return `<button class="back text-button" id="story-close">← Back to my books</button><h1>${escape(selected.title)}</h1><p class="intro">${escape(selected.author)}</p><div id="ebook-status" role="status">${content ? '' : 'Opening your book…'}</div>${content ? `<div class="reader-tools"><label for="reader-chapter">Chapter</label><select id="reader-chapter">${content.chapters.map((chapter,i)=>`<option value="${i}" ${i===position?'selected':''}>${escape(chapter.title)}</option>`).join('')}</select><label for="reader-size">Text size</label><select id="reader-size"><option value="20" ${readerSize===20?'selected':''}>Standard</option><option value="24" ${readerSize===24?'selected':''}>Large</option><option value="30" ${readerSize===30?'selected':''}>Extra large</option></select></div><article class="ebook-content" id="ebook-content" tabindex="0" aria-label="Book text" style="font-size:${readerSize}px">${content.chapters[position].html}</article><div class="reader-tools"><button class="secondary" id="reader-prev" ${position===0?'disabled':''}>← Previous</button><button class="primary" id="reader-next">${position===selected.total-1?'Finish book':'Next chapter →'}</button><span id="reader-feedback" role="status">${selected.current===selected.total?'Book finished.':''}</span></div>` : ''}<p class="hint">Saved on this browser. Text and illustrations are adapted for reading; publisher layout and interactive content are not preserved.</p><button class="text-button" data-remove="${opened}">Remove from shelf</button>`;
  }
  if (selected) {
    const link = safeLink(selected.url);
    return `<button class="back text-button" id="story-close">← Back to my books</button><h1>${escape(selected.title)}</h1><p class="intro">${escape(selected.author)}</p><section class="panel"><form data-book="${opened}" class="story-update"><label for="book-place-${opened}">${selected.unit === 'pages' ? 'Pages' : 'Chapters'} read</label><div><input id="book-place-${opened}" name="current" type="number" min="0" max="${selected.total}" required step="1" value="${selected.current}"><button class="secondary">Save progress</button></div></form><div class="story-actions">${link ? `<a class="primary" href="${escape(link)}" target="_blank" rel="noopener noreferrer">Open ebook ↗</a>` : ''}<button class="secondary" data-finish="${opened}">Mark finished</button><button class="text-button" data-remove="${opened}">Remove from shelf</button></div></section>`;
  }
  return `<a class="back" href="#home">← Back to home</a><h1>Story mode</h1><p class="intro">Pick a book. Find your next little adventure.</p>
  <div class="ebook-import"><label class="primary" for="ebook-file">Import ebook ↗</label><input class="sr-only" id="ebook-file" type="file" accept=".epub,.txt"><p class="hint">EPUB or plain text · DRM-free · Up to 25 MB · Stays on this device</p><p id="import-status" role="status"></p></div><section class="story-shelf" aria-label="Your ebook shelf"><article class="shelf-book"><button class="book-cover caterpillar-cover" id="open-demo" aria-label="Open The Very Hungry Caterpillar mock interaction"><span class="cover-kicker">An interactive story demo</span><strong>The Very Hungry<br>Caterpillar</strong>${caterpillar}<span class="cover-author">Eric Carle</span><span class="cover-action">${demo.step ? 'Continue the adventure' : 'Let’s begin'} ↗</span></button><progress value="${demo.step}" max="3" aria-label="The Very Hungry Caterpillar demo progress"></progress></article>
  ${books.map((b,i)=>`<article class="shelf-book"><button class="book-cover personal-cover" data-open-book="${i}" aria-label="Open ${escape(b.title)}"><span class="cover-kicker">My reading shelf</span><strong>${escape(b.title)}</strong><span class="cover-symbol" data-cover="${i}" aria-hidden="true">⠎</span><span class="cover-author">${escape(b.author)}</span><span class="cover-action">Open book ↗</span></button><progress value="${b.current}" max="${b.total}" aria-label="${escape(b.title)} reading progress"></progress></article>`).join('')}</section>
  <p class="hint" id="story-storage">${storageOK ? 'Your place is saved in this browser.' : 'Browser storage is unavailable. Changes may last for this visit only.'}</p>
  <details class="panel story-add-panel"><summary>Add an ebook</summary><form id="story-add" class="story-add"><div><label for="story-title">Book title</label><input id="story-title" name="title" required maxlength="160"></div><div><label for="story-author">Author (optional)</label><input id="story-author" name="author" maxlength="160"></div><div><label for="story-unit">Track by</label><select id="story-unit" name="unit"><option value="pages">Pages</option><option value="chapters">Chapters</option></select></div><div><label for="story-total">Total pages or chapters</label><input id="story-total" name="total" type="number" min="1" max="1000000" step="1" required></div><div><label for="story-current">Already read</label><input id="story-current" name="current" type="number" min="0" step="1" required value="0"></div><div><label for="story-url">Ebook link (optional)</label><input id="story-url" name="url" type="url" placeholder="https://…"></div><button class="primary" type="submit">Add to my shelf</button></form></details>`;
}
export function bindStories(main, render, announce) {
  const refresh = (message, focus) => {
    save(); render(); main.querySelector(focus)?.focus();
    announce(message + (storageOK ? '' : ' Browser storage is unavailable; this change may last for this visit only.'));
  };
  const show = () => { render(); main.focus(); window.scrollTo(0,0); };
  const selected = Number.isInteger(opened) ? books[opened] : null;
  if (selected?.imported) {
    if (!loadedEbooks.has(selected.id)) {
      ebookStore('get',selected.id).then(content=>{
        if (!content) throw Error('This ebook is no longer in browser storage. Remove it and import the file again.');
        loadedEbooks.set(selected.id,content);
        if (main.querySelector('#ebook-status') && books[opened]?.id===selected.id) show();
      }).catch(error=>{ const status=main.querySelector('#ebook-status'); if(status) status.textContent=error.message; });
    } else {
      const reader=main.querySelector('#ebook-content');
      reader.scrollTop=selected.scroll || 0;
      reader.addEventListener('scroll',()=>{selected.scroll=reader.scrollTop; save(); if(!storageOK) main.querySelector('#ebook-status').textContent='Reading position could not be saved. Browser storage may be full.';},{passive:true});
      const move = position => { selected.position=position; selected.current=position; selected.scroll=0; save(); show(); };
      main.querySelector('#reader-chapter').onchange=event=>move(Number(event.target.value));
      main.querySelector('#reader-size').onchange=event=>{ readerSize=Number(event.target.value); selected.textSize=readerSize; reader.style.fontSize=readerSize+'px'; save(); };
      main.querySelector('#reader-prev').onclick=()=>move(Math.max(0,(selected.position||0)-1));
      main.querySelector('#reader-next').onclick=()=>{ if ((selected.position||0)<selected.total-1) move((selected.position||0)+1); else {selected.current=selected.total;save();main.querySelector('#reader-feedback').textContent='Book finished. Well done!';announce('Book finished. Well done!');} };
    }
  }
  main.querySelectorAll('[data-cover]').forEach(async element=>{
    const book=books[Number(element.dataset.cover)]; if(!book.imported)return;
    try { const content=loadedEbooks.get(book.id)||await ebookStore('get',book.id); if(!content?.cover || !element.isConnected)return; const image=document.createElement('img');image.src=content.cover;image.alt='';element.replaceChildren(image);element.closest('.book-cover').classList.add('has-cover'); } catch { /* Title remains available without cover storage. */ }
  });
  main.querySelector('#ebook-file')?.addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file)return;
    const status=main.querySelector('#import-status');event.target.disabled=true;status.textContent='Importing your ebook…';
    try {
      const content=await importEbook(file), id=crypto.randomUUID();
      await ebookStore('put',id,content);
      const book={id,title:content.title,author:content.author,unit:'chapters',total:content.chapters.length,current:0,position:0,scroll:0,url:'',imported:true};
      books.unshift(book);save();
      if(!storageOK){books.shift();await ebookStore('delete',id);throw Error('Your shelf could not be saved. Free browser storage and try again.');}
      loadedEbooks.set(id,content);opened=0;show();announce('Ebook imported. Ready to read.');
    } catch(error){status.textContent=error instanceof RangeError ? 'This EPUB is damaged or unsupported.' : error.message;event.target.disabled=false;event.target.value='';}
  });
  const saveDemo = () => { try { localStorage.setItem(demoKey, JSON.stringify(demo)); storageOK = true; } catch { storageOK = false; } };
  main.querySelector('#open-demo')?.addEventListener('click', () => { opened = 'demo'; show(); });
  main.querySelectorAll('[data-open-book]').forEach(button => button.addEventListener('click', () => { opened = Number(button.dataset.openBook); show(); }));
  main.querySelectorAll('#story-close, #story-close-done').forEach(button => button.addEventListener('click', () => { opened = null; show(); }));
  main.querySelector('#demo-next')?.addEventListener('click', () => { demo.step++; saveDemo(); show(); });
  main.querySelectorAll('[data-response]').forEach(button => button.addEventListener('click', () => { demo.response = button.dataset.response; demo.step = 2; saveDemo(); show(); announce(demo.response === 'correct' ? 'Continue the story. P was recognized confidently.' : 'Reinforce P with the plum.'); }));
  main.querySelector('#demo-restart')?.addEventListener('click', () => { demo = {step:0,response:''}; saveDemo(); show(); });
  main.querySelector('#story-add')?.addEventListener('submit' , event => {
    event.preventDefault(); const form = event.target, data = new FormData(form);
    const title = data.get('title').trim(), total = Number(data.get('total')), current = Number(data.get('current')), url = data.get('url').trim();
    form.elements.title.setCustomValidity(title ? '' : 'Enter a book title.');
    form.elements.current.setCustomValidity(Number.isSafeInteger(current) && current >= 0 && current <= total ? '' : 'Enter a whole number between zero and the total.');
    form.elements.url.setCustomValidity(!url || safeLink(url) ? '' : 'Use an http or https ebook link.');
    if (!form.reportValidity() || !Number.isSafeInteger(total) || total < 1) return;
    books.unshift({id:crypto.randomUUID(), title, author:data.get('author').trim(), unit:data.get('unit'), total, current, url:safeLink(url)});
    opened = 0; refresh(`${title} added to your shelf.`, '#book-place-0');
  });
  main.querySelector('#story-add')?.addEventListener('input', event => {
    event.target.setCustomValidity?.('');
    main.querySelector('#story-current').setCustomValidity('');
  });
  main.querySelectorAll('[data-book]').forEach(form => form.addEventListener('submit', event => {
    event.preventDefault(); const index = Number(form.dataset.book), current = Number(new FormData(form).get('current'));
    if (!Number.isSafeInteger(current) || current < 0 || current > books[index].total) return;
    books[index].current = current;
    refresh(`Progress saved for ${books[index].title}. ${current === books[index].total ? 'Book finished. Well done!' : ''}`, `#book-place-${index}`);
  }));
  main.querySelectorAll('[data-finish]').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.finish); books[index].current = books[index].total;
    refresh(`${books[index].title} finished. Well done!`, `#book-place-${index}`);
  }));
  main.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.remove);
    if (!confirm(`Remove “${books[index].title}” and its reading progress from your shelf?`)) return;
    if (books[index].imported) { ebookStore('delete',books[index].id).catch(()=>{}); loadedEbooks.delete(books[index].id); }
    books.splice(index, 1); opened = null; refresh('Book removed from your shelf.', '#story-title');
  }));
}
