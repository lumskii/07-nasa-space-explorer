/* ========= CONFIG ========= */
// API key is now loaded from config.js for better security
const API_KEY = (typeof CONFIG !== 'undefined' && CONFIG.NASA_API_KEY) 
  ? CONFIG.NASA_API_KEY 
  : 'DEMO_KEY';  // Fallback to demo key if config fails to load

// Log API key status for debugging (remove in production)
console.log('API Key loaded:', API_KEY === 'DEMO_KEY' ? 'Using DEMO_KEY' : 'Using custom key');

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
const clearBtn  = document.querySelector('#clear-btn');
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

// Clear button functionality
clearBtn.addEventListener('click', ()=>{
  // Clear the gallery display
  wrapper.innerHTML = '';
  
  // Reset the form to default state
  const today = todayStr();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate()-7);
  startInp.value = weekAgo.toISOString().split('T')[0];
  endInp.value   = today;
  
  // Reset button states
  fetchBtn.disabled = false;
  clearBtn.disabled = true;
  
  // Clear any error messages
  errorBox.textContent = '';
  
  // Close modal if it's open
  closeModal();
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
  
  // Enable the clear button since we have results to clear
  clearBtn.disabled = false;
  
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
  
  // Get media information using our helper function
  const mediaInfo = getMediaInfo(item);
  
  return `
    <div class="card" data-idx="${idx}">
      <figure>
        ${mediaInfo.isImage
          ? `<img src="${item.url}" alt="${item.title}">`
          : `<img class="thumb" src="${mediaInfo.thumbnailUrl || 'https://images.unsplash.com/photo-1454789548928-9efd52dc4031?auto=format&fit=crop&w=1480&q=80'}" alt="${item.title}">
             <div class="play">
               ${mediaInfo.isYouTube ? '▶' : '▶'}
             </div>
             <div class="media-badge">
               ${mediaInfo.isYouTube ? 'YouTube' : 'Video'}
             </div>`
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
  
  // Get media information using our helper function
  const mediaInfo = getMediaInfo(item);
  
  // Create the appropriate media element based on type
  let mediaElement;
  if (mediaInfo.isImage) {
    mediaElement = `<img src="${item.hdurl||item.url}" alt="${item.title}">`;
  } else if (mediaInfo.isYouTube) {
    // For YouTube videos, use the embed URL
    const embedUrl = getYouTubeEmbedUrl(mediaInfo.videoId);
    mediaElement = `<iframe src="${embedUrl}" title="${item.title}" allowfullscreen frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>`;
  } else {
    // For other video types (like Vimeo), use the original URL
    mediaElement = `<iframe src="${item.url}" title="${item.title}" allowfullscreen frameborder="0"></iframe>`;
  }
  
  modalRoot.innerHTML = `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="modal">
        <header>
          <h2 title="${item.title}">${item.title}</h2>
          <button aria-label="Close">×</button>
        </header>
        <div class="media">
          ${mediaElement}
        </div>
        <div class="body">
          <p style="color:var(--grey-600);margin-bottom:.5rem">${dateFmt}</p>
          ${mediaInfo.isYouTube ? '<p style="color:var(--nasa-blue);font-weight:600;margin-bottom:.5rem">📺 YouTube Video</p>' : ''}
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
  clearBtn.disabled = true; // Initially disabled since there are no results to clear
})();

/* ========= dateRange.js integration ========= */
// Wait for the page to load before running our code
document.addEventListener('DOMContentLoaded', () => {
  // Get the date input elements from the HTML using the correct IDs
  const startInput = document.getElementById('start');
  const endInput = document.getElementById('end');
  
  // Only setup date inputs if they exist and if setupDateInputs function exists
  if (startInput && endInput && typeof setupDateInputs === 'function') {
    // Use the setupDateInputs function from dateRange.js
    // This will configure the date inputs with proper ranges and defaults
    setupDateInputs(startInput, endInput);
    
    // Add any additional functionality here as needed
    // For example, you might want to fetch NASA images when dates change
    endInput.addEventListener('change', () => {
      console.log(`Date range selected: ${startInput.value} to ${endInput.value}`);
      // Here you could add code to fetch NASA APOD images for the selected range
    });
  }
});

/* ========= YouTube video utilities ========= */
// Function to check if a URL is a YouTube video
function isYouTubeVideo(url) {
  if (!url) return false;
  // Check for various YouTube URL formats
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  return youtubeRegex.test(url);
}

// Function to extract YouTube video ID from URL
function getYouTubeVideoId(url) {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Function to get YouTube thumbnail URL from video ID
function getYouTubeThumbnail(videoId) {
  // Use high quality thumbnail (hqdefault) for better visual quality
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// Function to create YouTube embed URL from video ID
function getYouTubeEmbedUrl(videoId) {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
}

// Function to determine media type and get appropriate data
function getMediaInfo(item) {
  const isImage = item.media_type === 'image';
  const isYouTube = isYouTubeVideo(item.url);
  
  return {
    isImage,
    isYouTube,
    isVideo: !isImage && !isYouTube, // Other video types
    videoId: isYouTube ? getYouTubeVideoId(item.url) : null,
    thumbnailUrl: isYouTube ? getYouTubeThumbnail(getYouTubeVideoId(item.url)) : item.thumbnail_url
  };
}
