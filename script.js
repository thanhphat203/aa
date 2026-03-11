const API_BASE = 'https://phimapi.com';
const IMAGE_DOMAIN = 'https://phimimg.com/';

let gridState = { urlPrefix: '', page: 1, totalPages: 1 };
let historyView = ['home'];
let heroMovies = [];
let currentHeroIndex = 0;
let heroInterval;

function getImg(url) { return url ? (url.startsWith('http') ? url : IMAGE_DOMAIN + url) : ''; }

window.addEventListener('scroll', () => {
    document.getElementById('header').classList.toggle('scrolled', window.scrollY > 10);
});

// Xử lý bật/tắt Dropdown trên Mobile cực chuẩn
function toggleMobileMenu(event, menuId) {
    // Chỉ chạy logic click này nếu là màn hình nhỏ (Mobile/Tablet)
    if(window.innerWidth <= 768) {
        event.stopPropagation(); // Ngăn chặn sự kiện nổi bọt
        const targetMenu = document.getElementById(menuId);
        
        // Nếu menu này đang mở -> Đóng nó
        if(targetMenu.classList.contains('show-mobile')) {
            targetMenu.classList.remove('show-mobile');
        } else {
            // Đóng tất cả menu khác trước
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.classList.remove('show-mobile');
            });
            // Mở menu được click
            targetMenu.classList.add('show-mobile');
        }
    }
}

// Click ra ngoài thì đóng Dropdown Mobile
document.addEventListener('click', (event) => {
    if(window.innerWidth <= 768) {
        if (!event.target.closest('.nav-dropdown')) {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.classList.remove('show-mobile');
            });
        }
    }
});


function switchView(viewName) {
    document.getElementById('home-view').style.display = viewName === 'home' ? 'block' : 'none';
    document.getElementById('grid-view').style.display = viewName === 'grid' ? 'block' : 'none';
    document.getElementById('detail-view').style.display = viewName === 'detail' ? 'block' : 'none';
    
    // Đóng dropdown nếu chuyển trang
    document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.remove('show-mobile'));

    // Tắt video khi back ra ngoài
    if(viewName !== 'detail') {
        document.querySelector('.player-container').style.display = 'none';
        document.getElementById('playerWrapper').innerHTML = ''; 
    }
    
    if(viewName !== historyView[historyView.length -1]) historyView.push(viewName);
    window.scrollTo(0, 0);
}

function goBack() {
    historyView.pop();
    let prevView = historyView.pop() || 'home';
    if (prevView === 'home') initHomePage();
    else switchView(prevView);
}

// KHỞI TẠO APP
async function initApp() {
    try {
        const [resTL, resQG] = await Promise.all([
            fetch(`${API_BASE}/the-loai`).then(r => r.json()),
            fetch(`${API_BASE}/quoc-gia`).then(r => r.json())
        ]);
        
        document.getElementById('genreDropdown').innerHTML = resTL.map(i => 
            `<a class="dropdown-item" onclick="loadGrid('v1/api/the-loai/${i.slug}', 'Thể loại: ${i.name}')">${i.name}</a>`
        ).join('');

        document.getElementById('countryDropdown').innerHTML = resQG.map(i => 
            `<a class="dropdown-item" onclick="loadGrid('v1/api/quoc-gia/${i.slug}', 'Quốc gia: ${i.name}')">${i.name}</a>`
        ).join('');
        
        renderHotGenres(resTL.slice(0, 5));
    } catch (e) { console.error("Lỗi menu:", e); }

    initHomePage();
}

async function initHomePage() {
    historyView = ['home'];
    switchView('home');
    
    await loadHeroAndTrending();

    document.getElementById('homepage-content').innerHTML = '';
    const rows = [
        { title: 'Phim Lẻ Mới Nhất', endpoint: 'v1/api/danh-sach/phim-le' },
        { title: 'Phim Bộ Hàn Quốc', endpoint: 'v1/api/quoc-gia/han-quoc' },
        { title: 'Phim Trung Quốc', endpoint: 'v1/api/quoc-gia/trung-quoc' },
        { title: 'Phim Hoạt Hình', endpoint: 'v1/api/danh-sach/hoat-hinh' }
    ];

    for (let row of rows) {
        await renderCategoryRow(row);
    }
}

async function loadHeroAndTrending() {
    try {
        const res = await fetch(`${API_BASE}/danh-sach/phim-moi-cap-nhat?limit=15`);
        const data = await res.json();
        const items = data.items || [];
        
        if(items.length >= 10) {
            heroMovies = items.slice(0, 5);
            renderHeroSlider();
            renderTrendingList('hotList', items.slice(0, 5));
            renderTrendingList('favList', items.slice(5, 10));
        }
    } catch(e) {}
}

function renderHeroSlider() {
    const bgContainer = document.getElementById('heroBackgrounds');
    const thumbContainer = document.getElementById('heroThumbnails');
    
    bgContainer.innerHTML = '';
    thumbContainer.innerHTML = '';

    heroMovies.forEach((m, index) => {
        const bgImg = getImg(m.poster_url || m.thumb_url);
        bgContainer.innerHTML += `<div class="hero-bg ${index === 0 ? 'active' : ''}" id="hero-bg-${index}" style="background-image: url('${bgImg}')"></div>`;
        
        const thumbImg = getImg(m.thumb_url || m.poster_url);
        thumbContainer.innerHTML += `
            <div class="thumb-item ${index === 0 ? 'active' : ''}" id="hero-thumb-${index}" onclick="changeHeroSlide(${index})">
                <img src="${thumbImg}" alt="thumb">
            </div>
        `;
    });

    updateHeroContent(0);
    
    clearInterval(heroInterval);
    heroInterval = setInterval(() => {
        changeHeroSlide((currentHeroIndex + 1) % heroMovies.length);
    }, 5000);
}

function updateHeroContent(index) {
    const m = heroMovies[index];
    document.getElementById('heroContent').innerHTML = `
        <h1 class="hero-title">${m.name}</h1>
        <div class="hero-meta">
            <span class="meta-tag imdb">IMDb 8.5</span>
            <span class="meta-tag">${m.year || '2026'}</span>
            <span class="meta-tag">${m.quality || 'FHD'}</span>
            <span class="meta-tag">${m.episode_current || 'Cập nhật'}</span>
        </div>
        <p class="hero-genres">${m.origin_name || 'Đang cập nhật'}</p>
        <p class="hero-desc">Bộ phim mang đến những thước phim ấn tượng, nội dung kịch tính và kỹ xảo sắc nét. Một siêu phẩm không thể bỏ lỡ trong năm nay tại PhimHay...</p>
        <div class="hero-actions">
            <button class="btn-play" onclick="fetchDetail('${m.slug}')"><i class="fas fa-play"></i></button>
            <button class="btn-icon"><i class="fas fa-heart"></i></button>
            <button class="btn-icon" onclick="fetchDetail('${m.slug}')"><i class="fas fa-info"></i></button>
        </div>
    `;
}

function changeHeroSlide(index) {
    document.querySelectorAll('.hero-bg').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.thumb-item').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`hero-bg-${index}`).classList.add('active');
    
    const thumb = document.getElementById(`hero-thumb-${index}`);
    if (thumb) thumb.classList.add('active');
    
    currentHeroIndex = index;
    updateHeroContent(index);
    
    clearInterval(heroInterval);
    heroInterval = setInterval(() => {
        changeHeroSlide((currentHeroIndex + 1) % heroMovies.length);
    }, 5000);
}

function renderTrendingList(elementId, items) {
    const html = items.map((m, index) => {
        return `
        <div class="rank-item" onclick="fetchDetail('${m.slug}')">
            <div class="rank-num">0${index + 1}</div>
            <img src="${getImg(m.thumb_url || m.poster_url)}" class="rank-img">
            <div class="rank-info">
                <div class="rank-name">${m.name}</div>
                <div class="rank-meta">${m.episode_current || 'Tập mới'}</div>
            </div>
        </div>`;
    }).join('');
    document.getElementById(elementId).innerHTML = html;
}

function renderHotGenres(genres) {
    const colors = ['bg-c1', 'bg-c2', 'bg-c3', 'bg-c4', 'bg-c5'];
    const html = genres.map((g, index) => `
        <div class="genre-item" onclick="loadGrid('v1/api/the-loai/${g.slug}', 'Thể loại: ${g.name}')">
            <div class="rank-num" style="font-size:16px;">${index + 1}.</div>
            <i class="fas fa-arrow-trend-up genre-icon"></i>
            <div class="genre-pill ${colors[index]}">${g.name}</div>
        </div>
    `).join('');
    document.getElementById('hotGenresList').innerHTML = html;
}

async function renderCategoryRow(row) {
    try {
        const res = await fetch(`${API_BASE}/${row.endpoint}?limit=12`);
        const data = await res.json();
        const items = data.data?.items || data.items || [];
        if(items.length === 0) return;

        let cards = items.map(m => `
            <div class="movie-card-sm" onclick="fetchDetail('${m.slug}')">
                <div class="badge">${m.episode_current || 'HD'}</div>
                <img src="${getImg(m.thumb_url || m.poster_url)}" loading="lazy">
                <div class="card-info">
                    <div class="card-title">${m.name}</div>
                    <div class="card-sub">${m.year || ''} - ${m.lang || ''}</div>
                </div>
            </div>
        `).join('');

        const html = `
            <div class="category-row">
                <div class="row-header">
                    <h2 class="row-title">${row.title}</h2>
                    <div class="view-all" onclick="loadGrid('${row.endpoint}', '${row.title}')">Xem tất cả <i class="fas fa-angle-right"></i></div>
                </div>
                <div class="slider-wrapper">
                    <div class="movie-slider" id="slider-${row.title}">${cards}</div>
                    <button class="slider-btn" onclick="document.getElementById('slider-${row.title}').scrollBy({left: 800, behavior: 'smooth'})"><i class="fas fa-chevron-right"></i></button>
                </div>
            </div>
        `;
        document.getElementById('homepage-content').insertAdjacentHTML('beforeend', html);
    } catch(e) {}
}

function handleSearch() {
    const kw = document.getElementById('searchInput').value.trim();
    if (!kw) return;
    loadGrid(`v1/api/tim-kiem?keyword=${encodeURIComponent(kw)}`, `Kết quả tìm kiếm: "${kw}"`);
}

function loadGrid(urlPrefix, title) {
    gridState.urlPrefix = urlPrefix;
    gridState.page = 1;
    document.getElementById('gridTitle').innerText = title;
    fetchGridData();
}

function changePage(step) {
    gridState.page += step;
    fetchGridData();
}

async function fetchGridData() {
    switchView('grid');
    document.getElementById('movieGrid').innerHTML = '';
    
    const char = gridState.urlPrefix.includes('?') ? '&' : '?';
    try {
        const res = await fetch(`${API_BASE}/${gridState.urlPrefix}${char}limit=24&page=${gridState.page}`);
        const data = await res.json();
        let items = data.data?.items || data.items || [];
        let pageInfo = data.data?.params?.pagination || data.pagination;

        if (items.length > 0) {
            document.getElementById('movieGrid').innerHTML = items.map(m => `
                <div class="movie-card-lg" onclick="fetchDetail('${m.slug}')">
                    <div class="badge">${m.episode_current || 'HD'}</div>
                    <img src="${getImg(m.poster_url || m.thumb_url)}" loading="lazy">
                    <div class="card-info">
                        <div class="card-title">${m.name}</div>
                        <div style="font-size:12px; color:#aaa; margin-top:5px;">${m.year || ''} | ${m.lang || ''}</div>
                    </div>
                </div>
            `).join('');

            if(pageInfo) {
                gridState.totalPages = pageInfo.totalPages || 1;
                document.getElementById('currentPage').innerText = gridState.page;
                document.getElementById('totalPages').innerText = gridState.totalPages;
                document.getElementById('btnPrev').disabled = gridState.page <= 1;
                document.getElementById('btnNext').disabled = gridState.page >= gridState.totalPages;
            }
        }
    } catch (e) {}
}

async function fetchDetail(slug) {
    switchView('detail');
    document.getElementById('movieDetailContent').innerHTML = '';
    document.getElementById('episodeSection').innerHTML = '';

    try {
        const res = await fetch(`${API_BASE}/phim/${slug}`);
        const data = await res.json();
        if (data.status) {
            const m = data.movie;
            const content = m.content ? m.content.replace(/<[^>]*>?/gm, '') : '';
            
            document.getElementById('movieDetailContent').innerHTML = `
                <div class="detail-layout">
                    <img src="${getImg(m.poster_url)}" class="detail-poster">
                    <div class="detail-info">
                        <h1>${m.name}</h1>
                        <p style="color:var(--text-muted); font-size:18px;">${m.origin_name} (${m.year})</p>
                        <div class="detail-meta">
                            <span><i class="fas fa-video"></i> ${m.quality || 'HD'}</span>
                            <span><i class="fas fa-closed-captioning"></i> ${m.lang || 'Vietsub'}</span>
                            <span><i class="fas fa-clock"></i> ${m.time || 'N/A'}</span>
                            <span style="border-color:var(--primary-color); color:var(--primary-color)"><i class="fas fa-film"></i> ${m.episode_current || 'Đang cập nhật'}</span>
                        </div>
                        <p><strong>Thể loại:</strong> ${(m.category||[]).map(c=>c.name).join(', ')}</p>
                        <p><strong>Quốc gia:</strong> ${(m.country||[]).map(c=>c.name).join(', ')}</p>
                        <p><strong>Diễn viên:</strong> ${(m.actor||[]).join(', ')}</p>
                        <div class="detail-desc">${content}</div>
                    </div>
                </div>
            `;

            const servers = data.episodes;
            if (servers && servers.length > 0 && servers[0].server_data.length > 0) {
                document.getElementById('episodeSection').innerHTML = servers.map(sv => `
                    <div class="ep-server">
                        <h3 style="margin-bottom:10px; border-left:4px solid var(--primary-color); padding-left:10px;">Server: ${sv.server_name}</h3>
                        <div class="ep-list">
                            ${sv.server_data.map(ep => `<button class="ep-btn" onclick="playVideo('${ep.link_embed}', this)">${ep.name}</button>`).join('')}
                        </div>
                    </div>
                `).join('');
                
                // Tự động bấm tập 1
                document.querySelector('.ep-btn')?.click();
            }
        }
    } catch(e) {}
}

function playVideo(url, btn) {
    document.querySelectorAll('.ep-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    
    const container = document.querySelector('.player-container');
    const wrapper = document.getElementById('playerWrapper');
    
    wrapper.innerHTML = ''; 
    const iframe = document.createElement('iframe');
    
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.setAttribute('webkitallowfullscreen', 'true');
    iframe.setAttribute('mozallowfullscreen', 'true');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('frameborder', '0');
    
    iframe.src = url;
    
    wrapper.appendChild(iframe);
    container.style.display = 'block';
    
    setTimeout(() => {
        container.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

window.onload = initApp;
