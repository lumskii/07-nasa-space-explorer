/* ========= CONFIG ========= */
const API_KEY = 'DEMO_KEY';      // swap with your own key for higher rate-limits
const MIN_DATE = '1995-06-16';
const spaceFacts = [
  'The Hubble Space Telescope orbits Earth at ~8 km/s.',
  'A day on Venus is longer than its year.',
  'One million Earths could fit inside the Sun.',
  'There are more stars in the universe than grains of sand on Earth.',
  'Neutron stars can spin up to 600 times per second.',
  'Jupiter\'s Great Red Spot has raged for 350+ years.',
  'The Milky Way is ~105,700 light-years wide.',
  'A planet twice Earth\'s size is made of diamonds.',
];

/* ========= DOM refs ========= */
const startInp  = document.querySelector('#start');
const endInp    = document.querySelector('#end');
const fetchBtn  = document.querySelector('#fetch-btn');
const errorBox  = document.querySelector('#range-error');
const wrapper   = document.querySelector('#gallery-wrapper');
const factTxt   = document.querySelector('#fact-text');
const modalRoot = document.querySelector('#modal-root');

/* ========= helpers ========= */
const todayStr = () => new Date().toISOString().split('T')[0];
endInp.max = todayStr();
startInp.min = MIN_DATE;

function validRange(){
  if(!startInp.value || !endInp.value) return false;
  return startInp.value <= endInp.value;
}

/* random fact every 15 s */
function setRandomFact(){
  factTxt.textContent = spaceFacts[Math.floor(Math.random()*spaceFacts.length)];
}
setRandomFact();
setInterval(setRandomFact,15000);

/* ========= range form interactions ========= */
[startInp,endInp].forEach(inp=>{
  inp.addEventListener('input',()=>{
    fetchBtn.disabled = !validRange();
    errorBox.textContent = '';
  });
});

/* ========= fetch + render ========= */
fetchBtn.addEventListener('click', async (e)=>{
  e.preventDefault();
  if(!validRange()){
    errorBox.textContent = 'Please select a valid date range.';
    return;
  }
  // loading UI
  wrapper.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading space photos…</p>
    </div>`;
  try{
    const url = `https://api.nasa.gov/planetary/apod?api_key=${API_KEY}&start_date=${startInp.value}&end_date=${endInp.value}`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('NASA API error');
    let data = await res.json();
    if(!Array.isArray(data)) data = [data];        // ensure array
    data.reverse();                                // newest first
    renderGallery(data);
  }catch(err){
    console.error(err);
    wrapper.innerHTML = `<p style="padding:3rem 1rem;text-align:center;color:#c00">
      Failed to load NASA images. Please try again later.</p>`;
  }
});

/* ========= gallery UI ========= */
function renderGallery(items){
  if(items.length===0){
    wrapper.innerHTML='<p style="padding:3rem 1rem;text-align:center">No results.</p>';
    return;
  }
  const html = `
    <section class="gallery">
      <h2>Cosmic Gallery</h2>
      <div class="grid">
        ${items.map((item, idx)=>cardTemplate(item, idx)).join('')}
      </div>
    </section>`;
  wrapper.innerHTML = html;
  // attach click handlers
  document.querySelectorAll('.card')
          .forEach(card=>{
            card.addEventListener('click',()=>{
              const idx = +card.dataset.idx;
              openModal(items[idx]);
            });
          });
}

function cardTemplate(item, idx){
  const date = new Date(item.date)
               .toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  const isImage = item.media_type === 'image';
  return `
    <div class="card" data-idx="${idx}">
      <figure>
        ${isImage
          ? `<img src="${item.url}" alt="${item.title}">`
          : `<img class="thumb" src="${item.thumbnail_url||'https://images.unsplash.com/photo-1454789548928-9efd52dc4031?auto=format&fit=crop&w=1480&q=80'}" alt="${item.title}">
             <div class="play">▶</div>`
        }
      </figure>
      <div class="info">
        <h3>${item.title}</h3>
        <p>${date}</p>
      </div>
    </div>`;
}

/* ========= modal UI ========= */
function openModal(item){
  const dateFmt = new Date(item.date)
      .toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  const isImage = item.media_type === 'image';
  modalRoot.innerHTML = `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="modal">
        <header>
          <h2 title="${item.title}">${item.title}</h2>
          <button aria-label="Close">×</button>
        </header>
        <div class="media">
          ${isImage
            ? `<img src="${item.hdurl||item.url}" alt="${item.title}">`
            : `<iframe src="${item.url}" title="${item.title}" allowfullscreen></iframe>`}
        </div>
        <div class="body">
          <p style="color:var(--grey-600);margin-bottom:.5rem">${dateFmt}</p>
          <p>${item.explanation}</p>
        </div>
        <footer>Press <kbd>ESC</kbd> to close</footer>
      </div>
    </div>`;
  document.body.style.overflow='hidden';

  /* close events */
  const backdrop = modalRoot.firstElementChild;
  backdrop.addEventListener('click',e=>{
    if(e.target===backdrop) closeModal();
  });
  backdrop.querySelector('button').addEventListener('click',closeModal);
  document.addEventListener('keydown',escClose);
}
function closeModal(){
  modalRoot.innerHTML='';
  document.body.style.overflow='';
  document.removeEventListener('keydown',escClose);
}
function escClose(e){ if(e.key==='Escape') closeModal(); }

/* ========= default dates (past 7 days) ========= */
(function initDefault(){
  const today = todayStr();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate()-7);
  startInp.value = weekAgo.toISOString().split('T')[0];
  endInp.value   = today;
  endInp.max     = today;
  fetchBtn.disabled = false;
})();
