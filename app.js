const qInput = document.getElementById('q');
const searchBtn = document.getElementById('searchBtn');
const hitsEl = document.getElementById('hits');
const statsEl = document.getElementById('stats');
const paginationEl = document.getElementById('pagination');
const errorEl = document.getElementById('error');

let page = 0; const hitsPerPage = 20; let lastQuery = '';

async function fetchSearch(query, pageNum=0){
  errorEl.style.display='none';
  try{
    const genre = document.getElementById('filterGenre').value || '';
    const year = document.getElementById('filterYear').value || '';
    const minRating = document.getElementById('filterMinRating').value || '';
    const params = new URLSearchParams({ q: query, page: pageNum, hitsPerPage: hitsPerPage });
    if(genre) params.set('genre', genre);
    if(year) params.set('year', year);
    if(minRating) params.set('minRating', minRating);
    const url = `api_search.php?${params.toString()}`;
    const res = await fetch(url);
    if(!res.ok){
      const txt = await res.text();
      throw new Error('Server error: '+txt);
    }
    const data = await res.json();
    if(data.error){ throw new Error(data.error); }
    return data;
  }catch(err){
    errorEl.textContent = err.message;
    errorEl.style.display='block';
    console.error(err);
    return null;
  }
}

function posterFor(hit){
  return hit.poster || hit.poster_url || hit.posterUrl || hit.image || hit.picture || (hit.poster_path?`https://image.tmdb.org/t/p/w500${hit.poster_path}`:null) || 'https://via.placeholder.com/400x600?text=No+Poster';
}

function renderHits(hits){
  hitsEl.innerHTML='';
  if(!hits || hits.length===0){ hitsEl.innerHTML='<div class="meta">No movies found.</div>'; return; }
  for(const h of hits){
    const card = document.createElement('div'); card.className='card';
    const img = document.createElement('img'); img.src = posterFor(h); img.alt = h.title || '';
    const body = document.createElement('div'); body.className='card-body';
    const title = document.createElement('div'); title.className='title'; title.textContent = h.title || h.name || 'Untitled';
    const meta = document.createElement('div'); meta.className='meta';
    meta.textContent = (h.year?('Year: '+h.year+' • '):'') + (h.rating?('Rating: '+h.rating):'');

    // genres as badges
    const genresWrap = document.createElement('div');
    if(h.genre){
      const genres = Array.isArray(h.genre) ? h.genre : (String(h.genre).split(',').map(s=>s.trim()));
      for(const g of genres){
        if(!g) continue;
        const b = document.createElement('span'); b.className = 'badge'; b.textContent = g;
        genresWrap.appendChild(b);
      }
    }

    const overview = document.createElement('p'); overview.className='overview'; overview.textContent = h.overview || '';
    body.appendChild(title);
    body.appendChild(meta);
    body.appendChild(genresWrap);
    body.appendChild(overview);
    card.appendChild(img); card.appendChild(body);
    hitsEl.appendChild(card);
  }
  // populate dropdown filters from these hits (non-destructive)
  populateFiltersFromHits(hits);
}

function populateFiltersFromHits(hits){
  try{
    const genreSet = new Set();
    const yearSet = new Set();
    for(const h of hits){
      if(h.genre){
        const arr = Array.isArray(h.genre)?h.genre:String(h.genre).split(',').map(s=>s.trim());
        for(const g of arr) if(g) genreSet.add(g);
      }
      if(h.year){ yearSet.add(String(h.year).slice(0,4)); }
      else if(h.release_date){ yearSet.add(String(h.release_date).slice(0,4)); }
    }
    const genreSelect = document.getElementById('filterGenre');
    const yearSelect = document.getElementById('filterYear');
    const ratingSelect = document.getElementById('filterMinRating');
    // preserve current selection
    const selGenre = genreSelect.value;
    const selYear = yearSelect.value;
    const selRating = ratingSelect.value;

    // rebuild options
    const genres = Array.from(genreSet).sort((a,b)=>a.localeCompare(b));
    genreSelect.innerHTML = '<option value="">All genres</option>' + genres.map(g=>`<option value="${g}">${g}</option>`).join('');
    if(selGenre) genreSelect.value = selGenre;

    const years = Array.from(yearSet).map(y=>parseInt(y)).filter(n=>!isNaN(n)).sort((a,b)=>b-a);
    yearSelect.innerHTML = '<option value="">All years</option>' + years.map(y=>`<option value="${y}">${y}</option>`).join('');
    if(selYear) yearSelect.value = selYear;

    // rating options 0-10
    if(ratingSelect.options.length <= 1){
      let opts = '<option value="">Min rating</option>';
      for(let r=0;r<=10;r++){ opts += `<option value="${r}">${r}+</option>`; }
      ratingSelect.innerHTML = opts;
    }
    if(selRating) ratingSelect.value = selRating;
  }catch(e){ console.warn('populateFiltersFromHits', e); }
}

function renderPagination(nbHits, pageNum){
  paginationEl.innerHTML='';
  const totalPages = Math.ceil(nbHits / hitsPerPage);
  if(totalPages <= 1) return;
  const prev = document.createElement('button'); prev.className='page-btn'; prev.textContent='Prev';
  prev.disabled = pageNum<=0; prev.onclick = ()=>{ goToPage(pageNum-1); };
  paginationEl.appendChild(prev);
  const info = document.createElement('div'); info.className='meta'; info.style.alignSelf='center'; info.style.margin='0 8px'; info.textContent = `Page ${pageNum+1} of ${totalPages}`;
  paginationEl.appendChild(info);
  const next = document.createElement('button'); next.className='page-btn'; next.textContent='Next'; next.disabled = pageNum >= totalPages-1; next.onclick = ()=>{ goToPage(pageNum+1); };
  paginationEl.appendChild(next);
}

async function doSearch(query, pageNum=0){
  lastQuery = query; page = pageNum;
  statsEl.textContent = 'Searching...';
  const data = await fetchSearch(query, pageNum);
  if(!data) { statsEl.textContent = ''; renderHits([]); renderPagination(0,0); return; }
  statsEl.textContent = `${data.nbHits.toLocaleString()} results in ${data.processingTimeMS}ms`;
  window.lastHits = data.hits || [];
  renderHits(window.lastHits);
  renderPagination(data.nbHits || 0, data.page || 0);
}

function goToPage(p){ doSearch(lastQuery, p); }

searchBtn.addEventListener('click', ()=>{ const q = qInput.value.trim(); doSearch(q,0); });
qInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ searchBtn.click(); } });
document.getElementById('applyFilters').addEventListener('click', ()=>{ const q = qInput.value.trim(); doSearch(q,0); });

// modal handlers
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');
const modalClose = document.getElementById('modalClose');
modalClose.addEventListener('click', ()=>{ modal.style.display='none'; modalContent.innerHTML=''; });
function openModalFor(hit){
  const img = posterFor(hit);
  const title = hit.title || hit.name || '';
  const yearText = hit.year?`Year: ${hit.year}`:(hit.release_date?`Year: ${String(hit.release_date).slice(0,4)}`:'');
  const ratingText = hit.rating?`Rating: ${hit.rating}`:'';
  const overview = hit.overview || 'No overview.';
  modalContent.innerHTML = `
    <div class="modal-body">
      <img src="${img}" alt="${title}">
      <div class="modal-details">
        <h2>${title}</h2>
        <div class="meta">${yearText}${yearText && ratingText ? ' • ' : ''}${ratingText}</div>
        <div class="modal-overview">${overview}</div>
      </div>
    </div>
  `;
  modal.style.display='flex';
}

// attach click to cards (delegate)
hitsEl.addEventListener('click', (e)=>{
  let el = e.target;
  while(el && !el.classList.contains('card')) el = el.parentElement;
  if(!el) return;
  const idx = Array.from(hitsEl.children).indexOf(el);
  if(window.lastHits && window.lastHits[idx]) openModalFor(window.lastHits[idx]);
});

// initial load: empty query to show some results
window.addEventListener('load', ()=>{ doSearch(''); });
