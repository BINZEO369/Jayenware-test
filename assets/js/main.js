
const SUPABASE_URL = "https://ozuwazkqyrxiwwfjceth.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96dXdhemtxeXJ4aXd3ZmpjZXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MDc0MTAsImV4cCI6MjA4ODE4MzQxMH0.1Mn5bjENOsK88E2tDpY6xHg4quDnVXlU6eGtGBdK7Xw";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let userSession = null;
let cart = JSON.parse(localStorage.getItem('jayen_cart') || '[]');
let wishlist = JSON.parse(localStorage.getItem('jayen_wish') || '[]');
let currentData = { 
    products: [], categories: [], news: [], hero: [], 
    deliveryCharges: [], variants: [], reviews: [],
    seasons: [], seasonProducts: [], videos: [], orders: []
};
let currentSlide = 0, slideInterval, pendingOrderData = null;
let appliedPromo = null, selectedVariantObj = null;
let currentFilters = { cat: 'all', minPrice: null, maxPrice: null };
let videoData = [];

let currentVideoIndex = 0;
let videoAutoAdvanceTimer = null;
let isVideoSoundOn = false;
let isVideoPlaying = true;

const BASE_URL = 'https://www.jayenware.shop';

const VISITOR_CONFIG = {
    cookieName: 'jayenware_consent',
    sessionId: 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    trackingEndpoint: SUPABASE_URL + '/rest/v1/visitor_logs',
    apiKey: SUPABASE_KEY,
    denyInterval: 5000,
    botScoreThreshold: 0.7
};

tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                serif: ['Playfair Display', 'serif']
            },
            colors: {
                primary: '#1a1a1a',
                accent: '#c9a96e',
                soft: '#f8f6f3'
            }
        }
    }
};

const URL_MAP = {
    'home': '/', 'products': '/products', 'product-details': '/product/',
    'wishlist': '/wishlist', 'news': '/journal', 'account': '/account',
    'login': '/login', 'signup': '/signup', 'cart': '/cart',
    'checkout': '/checkout', 'order': '/order/', 'category': '/category/', 'search': '/search'
};

function navigate(pageId, params = null) {
    if(pageId === 'account' && !userSession) {
        openAuthModal('login');
        updateURL('/login', 'Login');
        return;
    }
    
    window.scrollTo({top: 0, behavior: 'instant'});
    
    let urlPath = URL_MAP[pageId] || '/' + pageId;
    
    if(pageId === 'product-details' && params) {
        const product = currentData.products.find(p => p.id == params);
        if(product) {
            urlPath = '/product/' + getProductSlug(product);
            updateURL(urlPath, product.title);
            updateProductSEO(product);
        }
        window.location.href = '/pages/product-details.html?product=' + params;
        return;
    }
    
    if(pageId === 'account' && params && params.orderId) {
        urlPath = '/order/' + params.orderId;
        updateURL(urlPath, 'Order #' + params.orderId);
    } else if(params && params.category) {
        urlPath = '/category/' + getCategorySlug(params.category);
        updateURL(urlPath, params.category);
    } else if(params && params.search) {
        urlPath = '/search?q=' + encodeURIComponent(params.search);
        updateURL(urlPath, 'Search: ' + params.search);
    } else {
        updateURL(urlPath);
    }
    
    const pageRoutes = {
        'home': '/index.html',
        'products': '/pages/products.html',
        'product-details': '/pages/product-details.html',
        'wishlist': '/pages/wishlist.html',
        'news': '/pages/journal.html',
        'account': '/pages/account.html',
        'cart': '/pages/cart.html'
    };
    
    const targetPath = pageRoutes[pageId];
    if(targetPath && window.location.pathname !== targetPath) {
        window.location.href = targetPath;
    }
}

function getProductSlug(product) {
    if (!product || !product.title) return '';
    return product.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 80);
}

function getCategorySlug(category) {
    if (!category) return '';
    return category.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '');
}

function updateURL(path, title = '') {
    const url = BASE_URL + path;
    window.history.pushState({ path: path }, title || 'JAYENWARE', path);
    document.title = title ? title + ' | JAYENWARE' : 'JAYENWARE SHOP';
    
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = url;
}

function updatePageSpecificSEO(path, title) {
    let robots = document.querySelector('meta[name="robots"]');
    
    if (path.startsWith('/cart') || path.startsWith('/checkout') || path.startsWith('/order')) {
        if (robots) robots.content = "noindex, nofollow";
    } else {
        if (robots) robots.content = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
    }
}

function updateProductSEO(product) {
    document.title = product.title + " | Buy Online at JAYENWARE";

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = "description";
        document.head.appendChild(metaDesc);
    }
    metaDesc.content = product.description?.substring(0, 155) + "...";

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
    }
    let slug = getProductSlug(product);
    canonical.href = BASE_URL + '/product/' + slug;

    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = product.title + " | JAYENWARE";

    let ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) ogImage.content = product.img;

    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.content = BASE_URL + '/product/' + slug;

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.content = product.description?.substring(0, 160) + "...";

    let twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.content = product.title + " | JAYENWARE";
    let twImage = document.querySelector('meta[name="twitter:image"]');
    if (twImage) twImage.content = product.img;
    let twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.content = product.description?.substring(0, 160) + "...";

    let existingProductSchema = document.getElementById('product-schema');
    if (existingProductSchema) existingProductSchema.remove();

    let script = document.createElement('script');
    script.id = 'product-schema';
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product.title,
        "image": product.img,
        "description": product.description,
        "sku": "JW-" + product.id,
        "brand": { "@type": "Brand", "name": "JAYENWARE" },
        "offers": {
            "@type": "Offer",
            "url": BASE_URL + '/product/' + slug,
            "priceCurrency": "BDT",
            "price": product.price,
            "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
        }
    });
    document.head.appendChild(script);
}

function showToast(text, type='success') {
    const toast = document.getElementById('toast');
    if(!toast) return;
    document.getElementById('toast-text').innerText = text;
    const icon = document.getElementById('toast-icon');
    if(type==='success'){icon.className='w-8 h-8 rounded-full flex items-center justify-center text-sm bg-green-100 text-green-600 shrink-0';icon.innerHTML='<i class="fa-solid fa-check"></i>';}
    else if(type==='error'){icon.className='w-8 h-8 rounded-full flex items-center justify-center text-sm bg-red-100 text-red-600 shrink-0';icon.innerHTML='<i class="fa-solid fa-exclamation"></i>';}
    else{icon.className='w-8 h-8 rounded-full flex items-center justify-center text-sm bg-blue-100 text-blue-600 shrink-0';icon.innerHTML='<i class="fa-solid fa-info"></i>';}
    toast.style.transform = 'translateX(0)';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(()=>{toast.style.transform='translateX(120%)';},3000);
}

function hideToast(){const t=document.getElementById('toast');if(t)t.style.transform='translateX(120%)';}

function showGlobalLoader(ms=1500){const l=document.getElementById('global-loader');if(!l)return;l.style.display='flex';l.style.opacity='1';setTimeout(()=>{l.style.opacity='0';setTimeout(()=>{l.style.display='none';},400);},ms);}

function showOrderLoader(ms=5000){const l=document.getElementById('order-loader-overlay');if(!l)return;l.style.display='flex';setTimeout(()=>{l.style.display='none';},ms);}

function toggleMobileMenu(){document.getElementById('mobile-menu')?.classList.toggle('hidden');}
function toggleMobileSearch(){document.getElementById('mobile-search-bar')?.classList.toggle('hidden');}

function toggleSortMenu(){document.getElementById('sort-dropdown')?.classList.toggle('hidden');}

function handleSorting(type,label){
    const labelEl = document.getElementById('current-sort-label');
    if(labelEl) labelEl.innerText=label;
    document.getElementById('sort-dropdown')?.classList.add('hidden');
    let sorted = [...getFilteredProducts()];
    if(type==='price-low') sorted.sort((a,b)=>a.price-b.price);
    else if(type==='price-high') sorted.sort((a,b)=>b.price-a.price);
    else sorted.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    renderProducts(sorted);
}

function getFilteredProducts(){
    let list = currentData.products;
    if(currentFilters.cat!=='all') list=list.filter(p=>p.category===currentFilters.cat);
    if(currentFilters.minPrice) list=list.filter(p=>p.price>=currentFilters.minPrice);
    if(currentFilters.maxPrice) list=list.filter(p=>p.price<=currentFilters.maxPrice);
    return list;
}

function filterByCategory(cat){
    currentFilters.cat=cat;
    renderProducts(getFilteredProducts());
    if(cat === 'all') updateURL('/products', 'All Products');
    else updateURL('/category/' + getCategorySlug(cat), cat);
}

function applyPriceFilter(){
    currentFilters.minPrice=parseFloat(document.getElementById('filter-min-price')?.value)||null;
    currentFilters.maxPrice=parseFloat(document.getElementById('filter-max-price')?.value)||null;
    renderProducts(getFilteredProducts());
}

function toggleMobileFilters(){
    const modal = document.getElementById('mobile-filter-modal');
    if(!modal) return;
    if(modal.classList.contains('hidden')){
        const catDiv = document.getElementById('mobile-filter-categories');
        if(catDiv) {
            catDiv.innerHTML = `<button onclick="filterByCategory('all');highlightMobileCat(this)" class="block w-full text-left py-2 px-3 rounded-lg text-sm font-bold ${currentFilters.cat==='all'?'bg-primary text-white':''}">All</button>` +
                currentData.categories.map(c=>`<button onclick="filterByCategory('${c.name}');highlightMobileCat(this)" class="block w-full text-left py-2 px-3 rounded-lg text-sm font-bold ${currentFilters.cat===c.name?'bg-primary text-white':''}">${c.name}</button>`).join('');
        }
        const minPrice = document.getElementById('m-filter-min-price');
        const maxPrice = document.getElementById('m-filter-max-price');
        if(minPrice) minPrice.value = currentFilters.minPrice||'';
        if(maxPrice) maxPrice.value = currentFilters.maxPrice||'';
    }
    modal.classList.toggle('hidden');
}

function highlightMobileCat(btn){
    document.querySelectorAll('#mobile-filter-categories button').forEach(b=>b.classList.remove('bg-primary','text-white'));
    btn.classList.add('bg-primary','text-white');
}

function applyMobileFilters(){
    currentFilters.minPrice = parseFloat(document.getElementById('m-filter-min-price')?.value)||null;
    currentFilters.maxPrice = parseFloat(document.getElementById('m-filter-max-price')?.value)||null;
    renderProducts(getFilteredProducts());
}

async function loadData(){
    const[{data:hero},{data:cats},{data:vars},{data:prods},{data:newsData},{data:delivery},{data:reviews},{data:seasons},{data:seasonProds},{data:videos}]=await Promise.all([
        _supabase.from('hero').select('*').order('created_at',{ascending:true}),
        _supabase.from('categories').select('*'),
        _supabase.from('product_variants').select('*'),
        _supabase.from('products').select('*').order('created_at',{ascending:false}),
        _supabase.from('news').select('*').order('created_at',{ascending:false}),
        _supabase.from('delivery_settings').select('*'),
        _supabase.from('product_reviews').select('*'),
        _supabase.from('seasons').select('*').eq('is_active', true).order('created_at',{ascending:false}),
        _supabase.from('season_products').select('*'),
        _supabase.from('videos').select('*').eq('is_active', true).order('display_order',{ascending:true})
    ]);
    if(hero) currentData.hero=hero;
    if(cats) currentData.categories=cats;
    if(vars) currentData.variants=vars;
    if(prods) currentData.products=prods;
    if(newsData) currentData.news=newsData;
    if(delivery) currentData.deliveryCharges=delivery;
    if(reviews) currentData.reviews=reviews;
    if(seasons) currentData.seasons=seasons;
    if(seasonProds) currentData.seasonProducts=seasonProds;
    if(videos) currentData.videos=videos;
    
    const currentPath = window.location.pathname;
    
    if(currentPath === '/' || currentPath === '/index.html' || currentPath === '') {
        renderHero();
        renderHomeFeatured(currentData.products);
        renderDynamicHomeSections();
        renderRecentlyViewed();
        renderVideoSection();
    }
    
    if(currentPath.includes('/pages/products.html') || currentPath === '/products' || currentPath.startsWith('/search') || currentPath.startsWith('/category')) {
        renderCategories();
        renderProducts(currentData.products);
        
        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('q');
        if(searchQuery) {
            renderProducts(currentData.products.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase())));
        }
    }
    
    if(currentPath.includes('/pages/product-details.html') || currentPath.startsWith('/product/')) {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('product');
        if(productId) {
            openProductDetails(parseInt(productId));
        }
    }
    
    if(currentPath.includes('/pages/wishlist.html') || currentPath === '/wishlist') {
        renderWishlist();
    }
    
    if(currentPath.includes('/pages/journal.html') || currentPath === '/journal') {
        renderNews();
    }
    
    if(currentPath.includes('/pages/account.html') || currentPath === '/account') {
        if(userSession) loadUserOrders();
    }
    
    if(currentPath.includes('/pages/cart.html') || currentPath === '/cart' || currentPath === '/checkout') {
        renderCartPageItems();
    }
    
    renderMegaMenu();
    
    if(userSession) loadUserOrders();
    updateCounts();
}

function handleInitialRoute() {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    
    if(path.startsWith('/product/')) {
        const slug = path.replace('/product/', '');
        const product = currentData.products.find(p => getProductSlug(p) === slug);
        if(product) window.location.href = '/pages/product-details.html?product=' + product.id;
        return;
    }
    
    if(path.startsWith('/category/')) {
        const slug = path.replace('/category/', '');
        const category = currentData.categories.find(c => getCategorySlug(c.name) === slug);
        if(category) {
            window.location.href = '/pages/products.html';
            currentFilters.cat = category.name;
        }
        return;
    }
    
    if(path.startsWith('/order/')) {
        const orderId = path.replace('/order/', '');
        if(userSession && orderId) {
            window.location.href = '/pages/account.html';
            setTimeout(() => viewOrderDetails(parseInt(orderId)), 500);
        }
        return;
    }
    
    if(path === '/search' && searchParams.get('q')) {
        window.location.href = '/pages/products.html?q=' + encodeURIComponent(searchParams.get('q'));
        return;
    }
    
    const pageRoutes = {
        '/': '/index.html', '/index.html': '/index.html',
        '/products': '/pages/products.html', '/wishlist': '/pages/wishlist.html',
        '/journal': '/pages/journal.html', '/account': '/pages/account.html',
        '/login': '/index.html', '/signup': '/index.html', '/cart': '/pages/cart.html',
        '/checkout': '/pages/cart.html'
    };
    
    if(pageRoutes[path] && pageRoutes[path] !== path) {
        if(path === '/login' || path === '/signup') {
            openAuthModal(path === '/login' ? 'login' : 'signup');
        }
    }
}

function renderHero(){
    const c=document.getElementById('hero-banner-slides'),list=currentData.hero;
    if(!c||!list.length){if(c)c.innerHTML='<div class="w-full h-full bg-primary"></div>';return;}
    c.innerHTML=list.map((h,i)=>`<div class="hero-slide absolute inset-0 transition-opacity duration-1000 ${i===0?'':'opacity-0'}"><img src="${h.img}" alt="${h.title||'JAYENWARE Hero Banner'}" class="w-full h-full object-cover" loading="${i===0?'eager':'lazy'}"></div>`).join('');
    updateHeroText(0);clearInterval(slideInterval);
    if(list.length>1) slideInterval=setInterval(()=>{currentSlide=(currentSlide+1)%list.length;updateHeroSlide();},5000);
}

function updateHeroSlide(){document.querySelectorAll('.hero-slide').forEach((s,i)=>s.classList.toggle('opacity-0',i!==currentSlide));updateHeroText(currentSlide);}

function updateHeroText(i){const d=currentData.hero[i];if(d){const title=document.getElementById('hero-title');const subtitle=document.getElementById('hero-subtitle');if(title)title.innerText=d.title||'JAYENWARE';if(subtitle)subtitle.innerText=d.subtitle||'';}}

function renderCategories(){
    const sidebar = document.getElementById('sidebar-categories');
    if(sidebar) {
        sidebar.innerHTML=`<a href="/pages/products.html" onclick="event.preventDefault();filterByCategory('all')" class="block w-full text-left py-2 px-3 rounded-lg text-[10px] sm:text-xs font-bold hover:bg-gray-100 transition no-underline text-primary ${currentFilters.cat==='all'?'bg-primary text-white':''}" aria-label="All Categories">All</a>`+currentData.categories.map(c=>`<a href="/category/${getCategorySlug(c.name)}" onclick="event.preventDefault();filterByCategory('${c.name}')" class="block w-full text-left py-2 px-3 rounded-lg text-[10px] sm:text-xs font-bold hover:bg-gray-100 transition no-underline text-primary ${currentFilters.cat===c.name?'bg-primary text-white':''}" aria-label="${c.name} Category">${c.name}</a>`).join('');
    }
    const mobileCats = document.getElementById('mobile-category-links');
    if(mobileCats) {
        mobileCats.innerHTML=currentData.categories.map(c=>`<a href="/category/${getCategorySlug(c.name)}" onclick="event.preventDefault();navigate('products');filterByCategory('${c.name}');toggleMobileMenu()" class="text-left text-sm py-1.5 no-underline text-primary block">${c.name}</a>`).join('');
    }
}

function renderMegaMenu(){
    const menu = document.getElementById('mega-menu-content');
    if(!menu) return;
    menu.innerHTML=currentData.categories.map(c=>{
        const prods=currentData.products.filter(p=>p.category===c.name).slice(0,4);
        return `<div>
            <h4 class="font-bold text-xs uppercase tracking-wider mb-3">
                <a href="/category/${getCategorySlug(c.name)}" onclick="event.preventDefault();navigate('products');filterByCategory('${c.name}')" class="no-underline text-primary hover:text-accent">${c.name}</a>
            </h4>
            <div class="space-y-2">${prods.map(p=>`<a href="/product/${getProductSlug(p)}" onclick="event.preventDefault();openProductDetails(${p.id})" class="flex gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition no-underline"><img src="${p.img}" class="w-10 h-10 lg:w-12 lg:h-12 object-cover rounded-lg" alt="${p.title}" loading="lazy"><div class="min-w-0"><p class="text-[10px] font-bold text-primary truncate">${p.title}</p><p class="text-[10px] font-black text-primary">৳${p.price}</p></div></a>`).join('')}</div>
        </div>`;
    }).join('');
}

function renderProducts(list){
    const grid = document.getElementById('products-grid');
    if(!grid) return;
    grid.innerHTML=list.length?list.map(p=>productCard(p)).join(''):'<div class="col-span-full text-center py-16 sm:py-20"><p class="text-gray-400 text-base sm:text-lg">No products found</p></div>';
}

function productCard(p){
    const isOut=p.stock<=0,wished=wishlist.includes(p.id);
    const productUrl = '/product/' + getProductSlug(p);
    return `<a href="${productUrl}" onclick="event.preventDefault();openProductDetails(${p.id})" class="product-card bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-50 cursor-pointer group no-underline block">
        <div class="product-img-container" style="aspect-ratio:3/4;">
            <img src="${p.img}" alt="${p.title}" class="product-image w-full h-full object-cover" loading="lazy">
            <button onclick="event.preventDefault();event.stopPropagation();toggleWishlist(${p.id})" class="absolute top-2 right-2 sm:top-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 bg-white/90 rounded-full flex items-center justify-center ${wished?'text-red-500':'text-gray-400'} shadow-lg active:scale-95 transition" aria-label="Wishlist"><i class="fa-${wished?'solid':'regular'} fa-heart text-[10px] sm:text-xs"></i></button>
            ${isOut?'<div class="absolute inset-0 bg-black/40 flex items-center justify-center"><span class="bg-white text-[8px] sm:text-[10px] font-black px-2 sm:px-3 py-1 rounded-full uppercase">Sold Out</span></div>':''}
            ${p.is_hot&&!isOut?'<div class="absolute top-2 left-2 sm:top-3 sm:left-3 bg-red-500 text-white text-[7px] sm:text-[8px] font-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full uppercase">Hot</div>':''}
        </div>
        <div class="p-2.5 sm:p-4">
            <p class="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase mb-0.5 sm:mb-1">${p.category}</p>
            <h3 class="font-bold text-xs sm:text-sm lg:text-base text-primary truncate mb-1.5 sm:mb-2">${p.title}</h3>
            <div class="flex justify-between items-end">
                <div><span class="font-black text-xs sm:text-sm text-primary">৳ ${p.price}</span>${p.old_price?`<span class="text-[9px] sm:text-[10px] text-gray-400 line-through ml-1">৳${p.old_price}</span>`:''}</div>
                <button onclick="event.preventDefault();event.stopPropagation();addToCart(${p.id})" ${isOut?'disabled':''} class="w-7 h-7 sm:w-8 sm:h-8 ${isOut?'bg-gray-100':'bg-primary hover:bg-accent'} text-white rounded-full flex items-center justify-center text-[10px] sm:text-xs transition active:scale-90" aria-label="Add to cart"><i class="fa-solid fa-plus"></i></button>
            </div>
        </div>
    </a>`;
}

function renderHomeFeatured(list){
    const hot=list.filter(p=>p.is_hot);
    const section = document.getElementById('hot-products-section');
    const grid = document.getElementById('hot-products-grid');
    if(hot.length && section && grid){
        section.classList.remove('hidden');
        grid.innerHTML=hot.map(p=>productCard(p)).join('');
    }
}

function renderRecentlyViewed(){
    const ids=JSON.parse(localStorage.getItem('jayen_recent')||'[]'),list=currentData.products.filter(p=>ids.includes(p.id.toString()));
    const sec=document.getElementById('recent-products-section');
    const grid=document.getElementById('recent-products-grid');
    if(list.length && sec && grid){
        sec.classList.remove('hidden');
        grid.innerHTML=list.map(p=>productCard(p)).join('');
    }
    else if(sec) sec.classList.add('hidden');
}

function renderDynamicHomeSections(){
    const container = document.getElementById('dynamic-home-sections');
    if(!container) return;
    
    const seasons = currentData.seasons || [];
    let html = '';
    
    if(seasons.length > 0) {
        html += buildSeasonHTML(seasons[0]);
    }
    
    const bestProducts = currentData.products.filter(p => p.is_best);
    if(bestProducts.length > 0) {
        html += buildBestSellingHTML(bestProducts);
    }
    
    for(let i = 1; i < seasons.length; i++) {
        html += buildSeasonHTML(seasons[i]);
    }
    
    container.innerHTML = html;
}

function buildSeasonHTML(season) {
    const seasonProductIds = (currentData.seasonProducts || [])
        .filter(sp => sp.season_id === season.id)
        .sort((a,b) => (a.display_order || 0) - (b.display_order || 0))
        .map(sp => sp.product_id);
    
    const seasonProducts = seasonProductIds
        .map(id => currentData.products.find(p => p.id === id))
        .filter(p => p)
        .slice(0, 4);
    
    if(seasonProducts.length === 0) return '';
    
    const bannerHTML = season.banner_img ? `
    <div class="mb-8 sm:mb-10">
        <div class="season-banner rounded-3xl shadow-xl" style="aspect-ratio: 21/9; max-height: 400px;">
            <img src="${season.banner_img}" alt="${season.name} Collection Banner" class="w-full h-full object-cover rounded-3xl" loading="lazy">
        </div>
    </div>` : '';
    
    const productsHTML = seasonProducts.map(p => {
        const isOut = p.stock <= 0;
        const wished = wishlist.includes(p.id);
        const productUrl = '/product/' + getProductSlug(p);
        
        return `
        <a href="${productUrl}" onclick="event.preventDefault();openProductDetails(${p.id})" class="product-card bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-50 cursor-pointer group no-underline block relative">
            <div class="product-img-container" style="aspect-ratio:3/4;">
                <img src="${p.img}" alt="${p.title}" class="product-image w-full h-full object-cover" loading="lazy">
                <div class="absolute top-2 left-2 sm:top-3 sm:left-3 z-10">
                    <span class="bg-accent text-white text-[7px] sm:text-[8px] font-black px-2 sm:px-3 py-0.5 sm:py-1 rounded-full uppercase shadow-lg flex items-center gap-1">
                        <i class="fa-solid fa-calendar-star"></i> ${season.name}
                    </span>
                </div>
                <button onclick="event.preventDefault();event.stopPropagation();toggleWishlist(${p.id})" class="absolute top-2 right-2 sm:top-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 bg-white/90 rounded-full flex items-center justify-center ${wished?'text-red-500':'text-gray-400'} shadow-lg active:scale-95 transition z-10" aria-label="Wishlist"><i class="fa-${wished?'solid':'regular'} fa-heart text-[10px] sm:text-xs"></i></button>
                ${isOut?'<div class="absolute inset-0 bg-black/40 flex items-center justify-center z-10"><span class="bg-white text-[8px] sm:text-[10px] font-black px-2 sm:px-3 py-1 rounded-full uppercase">Sold Out</span></div>':''}
                ${p.is_hot&&!isOut?`<div class="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 z-10"><span class="bg-red-500 text-white text-[7px] sm:text-[8px] font-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full uppercase">Hot</span></div>`:''}
            </div>
            <div class="p-2.5 sm:p-4">
                <p class="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase mb-0.5 sm:mb-1">${p.category}</p>
                <h3 class="font-bold text-xs sm:text-sm lg:text-base text-primary truncate mb-1.5 sm:mb-2">${p.title}</h3>
                <div class="flex justify-between items-end">
                    <div><span class="font-black text-xs sm:text-sm text-primary">৳ ${p.price}</span>${p.old_price?`<span class="text-[9px] sm:text-[10px] text-gray-400 line-through ml-1">৳${p.old_price}</span>`:''}</div>
                    <button onclick="event.preventDefault();event.stopPropagation();addToCart(${p.id})" ${isOut?'disabled':''} class="w-7 h-7 sm:w-8 sm:h-8 ${isOut?'bg-gray-100':'bg-primary hover:bg-accent'} text-white rounded-full flex items-center justify-center text-[10px] sm:text-xs transition active:scale-90" aria-label="Add to cart"><i class="fa-solid fa-plus"></i></button>
                </div>
            </div>
        </a>`;
    }).join('');
    
    return `
    <div class="max-w-7xl mx-auto px-4 py-12 sm:py-16 lg:py-24">
        <div class="text-center mb-8 sm:mb-12">
            <p class="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] text-accent mb-2 sm:mb-3">${season.subtitle || 'New Season'}</p>
            <h2 class="text-2xl sm:text-3xl lg:text-5xl font-black font-serif">${season.name}</h2>
        </div>
        ${bannerHTML}
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            ${productsHTML}
        </div>
        <div class="text-center mt-8 sm:mt-10">
            <a href="/pages/products.html" onclick="event.preventDefault();navigate('products')" class="px-8 sm:px-10 py-3 sm:py-4 border-2 border-primary text-primary rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider hover:bg-primary hover:text-white transition-all no-underline inline-block">View All Collection</a>
        </div>
    </div>`;
}

function buildBestSellingHTML(bestProducts) {
    return `
    <section class="py-10 sm:py-14 lg:py-20 bg-soft">
        <div class="max-w-7xl mx-auto px-4">
            <div class="flex items-center justify-between mb-6 sm:mb-8">
                <div class="flex items-center gap-2 sm:gap-3">
                    <span class="w-8 h-8 sm:w-10 sm:h-10 bg-accent text-white flex items-center justify-center rounded-full text-base sm:text-lg"><i class="fa-solid fa-crown"></i></span>
                    <h2 class="text-xl sm:text-2xl lg:text-3xl font-black font-serif">Best Sellers</h2>
                </div>
                <a href="/pages/products.html" onclick="event.preventDefault();navigate('products')" class="text-[10px] sm:text-xs font-bold text-primary hover:text-accent transition no-underline">View All <i class="fa-solid fa-arrow-right ml-1"></i></a>
            </div>
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                ${bestProducts.slice(0, 4).map(p => productCard(p)).join('')}
            </div>
        </div>
    </section>`;
}

function renderNews(list){
    const grid = document.getElementById('news-grid');
    if(!grid) return;
    const newsList = list || currentData.news;
    grid.innerHTML=newsList.map(n=>`<div class="bg-white rounded-2xl overflow-hidden shadow-sm group cursor-pointer"><div class="product-img-container" style="aspect-ratio:16/10;"><img src="${n.img}" alt="${n.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy"></div><div class="p-4 sm:p-6"><p class="text-[9px] sm:text-[10px] font-bold text-accent uppercase mb-1 sm:mb-2">Style</p><h3 class="font-bold text-base sm:text-lg mb-1.5 sm:mb-2">${n.title}</h3><p class="text-[10px] sm:text-xs text-gray-500 line-clamp-3">${n.description}</p></div></div>`).join('');
}

function openProductDetails(productId){
    const product = currentData.products.find(p=>p.id==productId);
    if(!product) {
        window.location.href = '/pages/product-details.html?product=' + productId;
        return;
    }
    
    let recent=JSON.parse(localStorage.getItem('jayen_recent')||'[]');
    recent=[productId.toString(),...recent.filter(id=>id!==productId.toString())].slice(0,8);
    localStorage.setItem('jayen_recent',JSON.stringify(recent));
    
    const variants=currentData.variants.filter(v=>v.product_id==productId);
    const allImages=product.images?product.images.split(','):[product.img];
    const prodReviews=currentData.reviews.filter(r=>r.product_id==productId);
    const isOut=product.stock<=0;
    selectedVariantObj=null;
    
    const detailContent = document.getElementById('product-detail-content');
    if(!detailContent) return;
    
    const reviewsHTML = prodReviews.length ? prodReviews.map(r => `
        <div class="bg-white p-3 sm:p-4 rounded-xl border border-gray-100">
            <div class="flex items-center gap-2 mb-1">
                <span class="text-accent text-sm">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span>
                <span class="text-[10px] sm:text-xs font-bold">${r.user_name||'Anonymous'}</span>
                <span class="text-[8px] sm:text-[9px] text-gray-400 ml-auto">${new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            <p class="text-[10px] sm:text-xs text-gray-600">${r.review_text}</p>
        </div>
    `).join('') : '<p class="text-gray-400 text-xs sm:text-sm italic">No reviews yet. Be the first to review!</p>';

    const reviewFormHTML = userSession ? `
        <div class="bg-soft p-4 sm:p-5 rounded-2xl">
            <h4 class="font-bold text-[10px] sm:text-xs uppercase mb-3">Write a Review</h4>
            <div class="star-rating mb-3" id="inline-review-stars-${productId}">
                <input type="radio" id="star5-${productId}" name="rating-${productId}" value="5"><label for="star5-${productId}"><i class="fa-solid fa-star"></i></label>
                <input type="radio" id="star4-${productId}" name="rating-${productId}" value="4"><label for="star4-${productId}"><i class="fa-solid fa-star"></i></label>
                <input type="radio" id="star3-${productId}" name="rating-${productId}" value="3"><label for="star3-${productId}"><i class="fa-solid fa-star"></i></label>
                <input type="radio" id="star2-${productId}" name="rating-${productId}" value="2"><label for="star2-${productId}"><i class="fa-solid fa-star"></i></label>
                <input type="radio" id="star1-${productId}" name="rating-${productId}" value="1"><label for="star1-${productId}"><i class="fa-solid fa-star"></i></label>
            </div>
            <textarea id="inline-review-text-${productId}" placeholder="Share your experience..." class="w-full p-3 border rounded-xl text-xs h-20 mb-3 outline-none"></textarea>
            <button onclick="submitInlineReview(${productId})" class="px-6 py-2.5 bg-primary text-white rounded-full text-[10px] font-bold uppercase hover:bg-accent transition">Submit Review</button>
        </div>
    ` : `
        <div class="bg-soft p-4 sm:p-5 rounded-2xl text-center">
            <p class="text-[10px] sm:text-xs text-gray-500 mb-2">Login to write a review</p>
            <button onclick="openAuthModal('login')" class="px-5 py-2 bg-primary text-white rounded-full text-[10px] font-bold uppercase hover:bg-accent transition">Sign In</button>
        </div>
    `;

    detailContent.innerHTML=`
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 xl:gap-16 mb-8 sm:mb-10">
        <div>
            <div id="product-zoom-container" class="rounded-3xl overflow-hidden shadow-2xl bg-gray-100" style="aspect-ratio:3/4;max-height:70vh;" onmousemove="zoomImage(event)" onmouseleave="resetZoom()" ontouchmove="zoomImage(event)" ontouchend="resetZoom()">
                <img id="product-zoom-image" src="${allImages[0]}" alt="${product.title}" class="w-full h-full object-cover">
            </div>
            <div class="flex gap-1.5 sm:gap-2 mt-3 sm:mt-4 overflow-x-auto no-scrollbar pb-1">
                ${allImages.map(img=>`<img src="${img}" onclick="document.getElementById('product-zoom-image').src='${img}';resetZoom()" class="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 object-cover rounded-xl cursor-pointer border-2 border-transparent hover:border-primary transition shrink-0" loading="lazy" alt="${product.title} - Image">`).join('')}
            </div>
        </div>
        <div class="flex flex-col">
            <span class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-accent">${product.category}</span>
            <h1 class="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black font-serif mt-1 sm:mt-2 mb-4 sm:mb-6">${product.title}</h1>
            <div class="mb-4 sm:mb-6"><span class="text-2xl sm:text-3xl font-black">৳ ${product.price}</span>${product.old_price?`<span class="ml-2 sm:ml-3 text-base sm:text-lg text-gray-400 line-through">৳${product.old_price}</span>`:''}</div>
            <div class="flex items-center gap-2 mb-4 sm:mb-6">
                <span class="w-2 h-2 rounded-full ${isOut?'bg-red-500':'bg-green-500'}"></span>
                <span class="text-[10px] sm:text-xs font-bold ${isOut?'text-red-500':'text-green-600'}">${isOut?'Out of Stock':`In Stock: ${product.stock}`}</span>
                ${prodReviews.length ? `<span class="text-[10px] sm:text-xs text-gray-400 ml-2"><i class="fa-solid fa-star text-accent text-[9px]"></i> ${(prodReviews.reduce((sum,r)=>sum+r.rating,0)/prodReviews.length).toFixed(1)} (${prodReviews.length} reviews)</span>` : ''}
            </div>
            ${variants.length?`<div class="mb-6 sm:mb-8"><p class="text-[9px] sm:text-[10px] font-black uppercase text-gray-400 mb-2 sm:mb-3">Select Variant</p><div class="flex flex-wrap gap-1.5 sm:gap-2" id="detail-variant-container">${variants.map((v,i)=>`<button onclick="selectVariant(this,'${v.id}','${v.name}',${v.price})" class="variant-btn px-4 sm:px-5 py-2.5 sm:py-3 border-2 rounded-2xl text-[10px] sm:text-xs font-bold transition ${i===0?'selected':''}" data-vid="${v.id}">${v.name} - ৳${v.price}</button>`).join('')}</div></div>`:''}
            <div class="grid grid-cols-2 gap-2 sm:gap-3 mb-6 sm:mb-8">
                <button onclick="addToCart(${product.id},false,true)" ${isOut?'disabled':''} class="py-3 sm:py-4 ${isOut?'bg-gray-200':'bg-primary hover:bg-accent'} text-white rounded-2xl font-bold text-[10px] sm:text-xs uppercase tracking-wider transition">Add to Bag</button>
                <button onclick="addToCart(${product.id},true,true)" ${isOut?'disabled':''} class="py-3 sm:py-4 ${isOut?'bg-gray-100':'bg-white border-2 border-primary hover:bg-primary hover:text-white'} rounded-2xl font-bold text-[10px] sm:text-xs uppercase tracking-wider transition">Buy Now</button>
            </div>
            <div class="bg-soft p-4 sm:p-6 rounded-2xl mb-6">
                <h3 class="font-bold text-[10px] sm:text-xs uppercase mb-2">Description</h3>
                <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">${product.description}</p>
            </div>
            <div class="flex flex-wrap gap-1.5 sm:gap-2 mt-auto">
                <div class="flex items-center gap-1 bg-green-50 px-2.5 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px]"><i class="fa-solid fa-shield-halved text-green-600"></i> 100% Authentic</div>
                <div class="flex items-center gap-1 bg-blue-50 px-2.5 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px]"><i class="fa-solid fa-truck-fast text-blue-600"></i> Fast Delivery</div>
            </div>
        </div>
    </div>
    
    <div class="border-t pt-8 sm:pt-10">
        <div class="flex items-center gap-3 mb-6">
            <h3 class="text-xl sm:text-2xl font-black font-serif">Customer Reviews</h3>
            <span class="text-xs sm:text-sm text-gray-400 font-bold">(${prodReviews.length})</span>
        </div>
        <div class="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
            ${reviewsHTML}
        </div>
        ${reviewFormHTML}
    </div>`;
    
    if(variants.length>0){selectedVariantObj={id:variants[0].id,name:variants[0].name,price:variants[0].price};}
    
    const related=currentData.products.filter(p=>p.category===product.category&&p.id!==productId).slice(0,4);
    const ctl=document.getElementById('complete-the-look-section');
    const ctlGrid=document.getElementById('complete-the-look-grid');
    if(related.length && ctl && ctlGrid){
        ctl.classList.remove('hidden');
        ctlGrid.innerHTML=related.map(p=>productCard(p)).join('');
    }
    else if(ctl) ctl.classList.add('hidden');
    
    navigate('product-details', product.id);
    updateProductSEO(product);
}

function selectVariant(btn,vId,vName,vPrice){
    document.querySelectorAll('#detail-variant-container .variant-btn').forEach(b=>b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedVariantObj={id:vId,name:vName,price:vPrice};
}

function zoomImage(e){
    const container=document.getElementById('product-zoom-container'),img=document.getElementById('product-zoom-image');
    if(!container||!img)return;
    const rect=container.getBoundingClientRect();
    const clientX=e.touches?e.touches[0].clientX:e.clientX;
    const clientY=e.touches?e.touches[0].clientY:e.clientY;
    const x=(clientX-rect.left)/rect.width,y=(clientY-rect.top)/rect.height;
    img.style.transformOrigin=`${x*100}% ${y*100}%`;
    img.style.transform='scale(2)';
}

function resetZoom(){const img=document.getElementById('product-zoom-image');if(img)img.style.transform='scale(1)';}

async function submitInlineReview(productId) {
    const text = document.getElementById('inline-review-text-' + productId)?.value;
    const stars = document.querySelector('input[name="rating-' + productId + '"]:checked');
    if (!text || !stars || !productId) return showToast('Complete all fields', 'error');
    const { error } = await _supabase.from('product_reviews').insert([{
        product_id: productId,
        user_id: userSession.id,
        user_name: userSession.user_metadata.full_name,
        rating: parseInt(stars.value),
        review_text: text
    }]);
    error ? showToast(error.message, 'error') : (showToast('Review submitted!'), setTimeout(() => location.reload(), 1500));
}

function toggleWishlist(id){
    wishlist.includes(id)?wishlist=wishlist.filter(x=>x!==id):wishlist.push(id);
    localStorage.setItem('jayen_wish',JSON.stringify(wishlist));updateCounts();
    showToast('Wishlist Updated','info');
    renderWishlist();
}

function renderWishlist(){
    const list=currentData.products.filter(p=>wishlist.includes(p.id));
    const grid=document.getElementById('wishlist-grid');
    const empty=document.getElementById('wishlist-empty');
    if(grid) grid.innerHTML=list.length?list.map(p=>productCard(p)).join(''):'';
    if(empty) empty.classList.toggle('hidden',list.length>0);
}

function updateCounts(){
    const cartCount=document.getElementById('cart-count');
    const wishCount=document.getElementById('wish-count');
    if(cartCount) cartCount.innerText=cart.length;
    if(wishCount) wishCount.innerText=wishlist.length;
}

function toggleCart(){
    document.getElementById('cart-drawer')?.classList.toggle('open');
    renderCartItems();
}

function addToCart(productId,buyNow=false,isDetail=false){
    const product=currentData.products.find(p=>p.id===productId);
    if(!product) return;
    if(cart.filter(i=>i.product_id===productId).length>=product.stock)return showToast('Stock limit reached','error');
    let finalPrice=product.price,vId=null,vName=null;
    const hasVariants=currentData.variants.some(v=>v.product_id==productId);
    if(isDetail&&hasVariants){
        if(!selectedVariantObj)return showToast('Select a variant','error');
        vId=selectedVariantObj.id;vName=selectedVariantObj.name;finalPrice=selectedVariantObj.price;
    }else if(!isDetail&&hasVariants){openProductDetails(productId);return;}
    cart.push({id:Date.now(),product_id:product.id,variant_id:vId,title:product.title,price:finalPrice,img:product.img,variant:vName,quantity:1});
    saveCart();buyNow?toggleCart():showToast('Added to Bag!');
}

function saveCart(){localStorage.setItem('jayen_cart',JSON.stringify(cart));updateCounts();renderCartItems();renderCartPageItems();}

function removeFromCart(idx){cart.splice(idx,1);saveCart();}

function renderCartItems(){
    const c=document.getElementById('cart-items'),s=document.getElementById('cart-subtotal'),t=document.getElementById('cart-total'),pr=document.getElementById('promo-row'),d=document.getElementById('cart-discount');
    if(!c) return;
    if(!cart.length){c.innerHTML='<p class="text-center text-gray-400 py-10 text-sm">Your bag is empty</p>';if(s)s.innerText='৳ 0.00';if(t)t.innerText='৳ 0.00';if(pr)pr.classList.add('hidden');renderCartPageItems();return;}
    let sub=0;
    c.innerHTML=cart.map((item,idx)=>{sub+=item.price;return`<div class="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-soft rounded-2xl"><img src="${item.img}" class="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-xl shrink-0" alt="${item.title}"><div class="flex-grow min-w-0"><h4 class="text-xs sm:text-sm font-bold truncate">${item.title}</h4><p class="text-[9px] sm:text-[10px] text-gray-400">${item.variant||''}</p><p class="text-xs sm:text-sm font-black">৳${item.price}</p></div><button onclick="removeFromCart(${idx})" class="text-red-400 hover:text-red-600 p-1.5 shrink-0" aria-label="Remove item"><i class="fa-solid fa-trash text-xs sm:text-sm"></i></button></div>`;}).join('');
    let disc=0;
    if(appliedPromo&&sub>=appliedPromo.min_order){disc=appliedPromo.type==='percent'?sub*appliedPromo.value/100:appliedPromo.value;if(pr)pr.classList.remove('hidden');if(d)d.innerText=`- ৳${disc.toFixed(2)}`;}else if(pr)pr.classList.add('hidden');
    if(s)s.innerText=`৳${sub.toFixed(2)}`;if(t)t.innerText=`৳${(sub-disc).toFixed(2)}`;
    renderCartPageItems();
}

function renderCartPageItems(){
    const items=document.getElementById('cart-page-items');
    const subEl=document.getElementById('cart-page-subtotal');
    const totalEl=document.getElementById('cart-page-total');
    const discRow=document.getElementById('promo-row-page');
    const discEl=document.getElementById('cart-page-discount');
    
    if(!items||!subEl||!totalEl) return;
    
    if(!cart.length){
        items.innerHTML='<p class="text-center text-gray-400 py-10 text-sm">Your bag is empty</p>';
        subEl.innerText='৳ 0.00';totalEl.innerText='৳ 0.00';
        if(discRow)discRow.classList.add('hidden');
        return;
    }
    
    let sub=0;
    items.innerHTML=cart.map((item,idx)=>{
        sub+=item.price;
        return`<div class="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-soft rounded-2xl"><img src="${item.img}" class="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-xl shrink-0" alt="${item.title}"><div class="flex-grow min-w-0"><h4 class="text-xs sm:text-sm font-bold truncate">${item.title}</h4><p class="text-[9px] sm:text-[10px] text-gray-400">${item.variant||''}</p><p class="text-xs sm:text-sm font-black">৳${item.price}</p></div><button onclick="removeFromCart(${idx})" class="text-red-400 hover:text-red-600 p-1.5 shrink-0" aria-label="Remove item"><i class="fa-solid fa-trash text-xs sm:text-sm"></i></button></div>`;
    }).join('');
    
    let disc=0;
    if(appliedPromo&&sub>=appliedPromo.min_order){
        disc=appliedPromo.type==='percent'?sub*appliedPromo.value/100:appliedPromo.value;
        if(discRow)discRow.classList.remove('hidden');
        if(discEl)discEl.innerText=`- ৳${disc.toFixed(2)}`;
    }else if(discRow)discRow.classList.add('hidden');
    
    subEl.innerText=`৳${sub.toFixed(2)}`;totalEl.innerText=`৳${(sub-disc).toFixed(2)}`;
}

async function applyPromo(){
    const code=document.getElementById('promo-input')?.value.toUpperCase(),msg=document.getElementById('promo-msg');
    if(!code||!msg)return;
    const{data,error}=await _supabase.from('promo_codes').select('*').eq('code',code).eq('is_active',true).single();
    error||!data?(msg.innerText='Invalid code',msg.className='text-[9px] sm:text-[10px] mt-1 font-bold text-red-500',appliedPromo=null):(appliedPromo=data,msg.innerText='Applied!',msg.className='text-[9px] sm:text-[10px] mt-1 font-bold text-green-500');
    renderCartItems();
}

function applyPromoPage(){
    const code=document.getElementById('promo-input-page')?.value.toUpperCase(),msg=document.getElementById('promo-msg-page');
    if(!code||!msg)return;
    applyPromo();
}

function showCheckoutOptions(){
    if(!userSession)return showToast('Please login','info'),openAuthModal();
    if(!cart.length)return;
    const m=userSession.user_metadata;
    const addr=document.getElementById('checkout-profile-addr');
    if(addr) addr.innerText=`${m.address}, ${m.subdistrict}, ${m.district} (${m.phone})`;
    document.getElementById('checkout-modal')?.classList.remove('hidden');
}

function prepareOrderReview(type){
    const m=userSession.user_metadata;let info={},tD='',tU='';
    if(type==='profile'){tD=m.district||'';tU=m.subdistrict||'';info={phone:m.phone,district:tD,upazila:tU,address:`${m.address}, ${m.subdistrict}, ${m.district}`};}
    else{
        const p=document.getElementById('new-phone')?.value,a=document.getElementById('new-address')?.value;
        tD=document.getElementById('new-district')?.value;tU=document.getElementById('new-upazila')?.value;
        if(!p||!a||!tD||!tU)return showToast('Fill all fields','error');
        info={phone:p,district:tD,upazila:tU,address:a};
    }
    let del=0;const u=currentData.deliveryCharges.find(d=>d.upazila?.toLowerCase()===tU.toLowerCase()),dd=currentData.deliveryCharges.find(d=>d.district?.toLowerCase()===tD.toLowerCase()),def=currentData.deliveryCharges.find(d=>d.location_name?.toLowerCase()==='default');
    del=u?u.charge:dd?dd.charge:def?def.charge:0;
    let sub=0;cart.forEach(i=>sub+=i.price);
    let disc=0;if(appliedPromo&&sub>=appliedPromo.min_order)disc=appliedPromo.type==='percent'?sub*appliedPromo.value/100:appliedPromo.value;
    pendingOrderData={member_name:m.full_name,member_email:userSession.email,project_title:'Store Order',member_info:{shipping:info,subtotal:sub,discount:disc,delivery_charge:del,total:`৳${(sub-disc+del).toFixed(2)}`,items:cart.map(i=>({id:i.product_id,variant_id:i.variant_id,title:i.title,variant:i.variant,qty:i.quantity,price:i.price}))}};
    const reviewBody=document.getElementById('order-review-body');
    if(reviewBody) reviewBody.innerHTML=`<p><strong>Name:</strong> ${pendingOrderData.member_name}</p><p><strong>Shipping:</strong> ${pendingOrderData.member_info.shipping.address}</p><p><strong>Items:</strong> ${pendingOrderData.member_info.items.map(i=>`${i.title} x${i.qty}`).join(', ')}</p><div class="bg-soft p-4 rounded-xl"><p>Subtotal: ৳${pendingOrderData.member_info.subtotal}</p>${pendingOrderData.member_info.discount>0?`<p class="text-green-600">Discount: -৳${pendingOrderData.member_info.discount}</p>`:''}<p>Delivery: ৳${pendingOrderData.member_info.delivery_charge}</p><p class="font-black text-lg">Total: ${pendingOrderData.member_info.total}</p></div>`;
    document.getElementById('checkout-modal')?.classList.add('hidden');document.getElementById('review-modal')?.classList.remove('hidden');
}

async function confirmFinalCheckout(){
    if(!pendingOrderData)return;
    document.getElementById('review-modal')?.classList.add('hidden');showOrderLoader(5000);
    const{error}=await _supabase.rpc('secure_checkout',{p_member_name:pendingOrderData.member_name,p_member_email:pendingOrderData.member_email,p_project_title:pendingOrderData.project_title,p_member_info:pendingOrderData.member_info});
    setTimeout(()=>{error?showToast('Failed: '+error.message,'error'):(showToast('Order Placed!'),cart=[],saveCart(),navigate('account'));},5000);
}

async function loadUserOrders(){
    const{data}=await _supabase.from('orders').select('*').eq('member_email',userSession.email).order('created_at',{ascending:false});
    const list=document.getElementById('user-order-list');
    if(!list)return;
    if(!data||!data.length){list.innerHTML='<p class="text-[10px] sm:text-xs text-gray-400">No orders yet</p>';return;}
    currentData.orders=data;
    list.innerHTML=data.map(o=>`<a href="/order/${o.id}" onclick="event.preventDefault();viewOrderDetails(${o.id})" class="p-3 sm:p-4 bg-soft rounded-2xl flex justify-between items-center cursor-pointer hover:shadow transition no-underline block"><div><p class="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase">#${o.id}</p><p class="font-black text-sm text-primary">${o.member_info?.total}</p></div><div class="text-right"><span class="text-[9px] sm:text-[10px] font-bold uppercase text-primary bg-primary/10 px-2 py-1 rounded">${o.status||'Pending'}</span><p class="text-[8px] sm:text-[9px] text-gray-400 mt-1">${new Date(o.created_at).toLocaleDateString()}</p></div></a>`).join('');
}

function viewOrderDetails(id){
    const order=currentData.orders.find(o=>o.id==id);if(!order)return;
    const info=order.member_info;
    const body=document.getElementById('order-details-body');
    const title=document.getElementById('od-title');
    if(body) body.innerHTML=`<p><strong>Items:</strong> ${info.items.map(i=>`${i.title} x${i.qty}`).join(', ')}</p><p><strong>Shipping:</strong> ${info.shipping.address}</p><p><strong>Phone:</strong> ${info.shipping.phone}</p><div class="bg-soft p-4 rounded-xl"><p>Subtotal: ৳${info.subtotal}</p>${info.discount>0?`<p class="text-green-600">Discount: -৳${info.discount}</p>`:''}<p>Delivery: ৳${info.delivery_charge}</p><p class="font-black text-lg">Total: ${info.total}</p></div>`;
    if(title) title.innerText=`Order #${id}`;
    document.getElementById('order-details-modal')?.classList.remove('hidden');
}

function closeOrderDetails(){document.getElementById('order-details-modal')?.classList.add('hidden');}

function openAuthModal(mode='login'){
    document.getElementById('auth-modal')?.classList.remove('hidden');
    toggleAuth(mode);
}

function closeAuthModal(){document.getElementById('auth-modal')?.classList.add('hidden');}

function toggleAuth(mode){
    const isLogin=mode==='login';
    const signupFields=document.getElementById('signup-fields');
    const tLogin=document.getElementById('t-login');
    const tSignup=document.getElementById('t-signup');
    if(signupFields) signupFields.classList.toggle('hidden',isLogin);
    if(tLogin) tLogin.className=`pb-2 sm:pb-3 font-bold uppercase text-[10px] sm:text-xs tracking-wider ${isLogin?'text-primary border-b-2 border-primary':'text-gray-400'}`;
    if(tSignup) tSignup.className=`pb-2 sm:pb-3 font-bold uppercase text-[10px] sm:text-xs tracking-wider ${!isLogin?'text-primary border-b-2 border-primary':'text-gray-400'}`;
}

document.addEventListener('DOMContentLoaded', function() {
    const authForm = document.getElementById('auth-form');
    if(authForm) {
        authForm.onsubmit=async(e)=>{
            e.preventDefault();showGlobalLoader(3000);
            const email=document.getElementById('auth-email')?.value,pass=document.getElementById('auth-pass')?.value;
            const isSignup=!document.getElementById('signup-fields')?.classList.contains('hidden');
            let res=isSignup?await _supabase.auth.signUp({email,password:pass,options:{data:{full_name:document.getElementById('auth-name')?.value,phone:document.getElementById('auth-phone')?.value,district:document.getElementById('auth-district')?.value,subdistrict:document.getElementById('auth-subdistrict')?.value,address:document.getElementById('auth-address')?.value}}}):await _supabase.auth.signInWithPassword({email,password:pass});
            res.error?showToast(res.error.message,'error'):location.reload();
        };
    }

    const mainSearch = document.getElementById('main-search-input');
    if(mainSearch) {
        mainSearch.addEventListener('input',function(e){
            const q=e.target.value.toLowerCase().trim(),box=document.getElementById('search-suggestions');
            if(!box)return;
            if(q.length<2){box.classList.add('hidden');return;}
            const filtered=currentData.products.filter(p=>p.title.toLowerCase().includes(q)).slice(0,6);
            box.innerHTML=filtered.length?filtered.map(p=>`<a href="/product/${getProductSlug(p)}" onclick="event.preventDefault();openProductDetails(${p.id});box.classList.add('hidden')" class="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer no-underline"><img src="${p.img}" class="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover shrink-0" alt="${p.title}"><div class="min-w-0"><p class="text-[10px] sm:text-xs font-bold text-primary truncate">${p.title}</p><p class="text-[9px] sm:text-[10px] font-black text-primary">৳${p.price}</p></div></a>`).join(''):'<p class="p-3 sm:p-4 text-gray-400 text-[10px] sm:text-xs text-center">No results</p>';
            box.classList.remove('hidden');
        });
    }

    const mobileSearch = document.getElementById('mobile-search-input');
    if(mobileSearch) {
        mobileSearch.addEventListener('input',function(e){
            const q=e.target.value.toLowerCase().trim();
            if(q.length>1){currentFilters={cat:'all',minPrice:null,maxPrice:null};renderProducts(currentData.products.filter(p=>p.title.toLowerCase().includes(q)));}
        });
    }
});

document.addEventListener('click',e=>{if(!e.target.closest('#main-search-input')&&!e.target.closest('#search-suggestions'))document.getElementById('search-suggestions')?.classList.add('hidden');});
document.addEventListener('click',e=>{if(!e.target.closest('#sort-container'))document.getElementById('sort-dropdown')?.classList.add('hidden');});

function handleMainSearch(){
    const q=document.getElementById('main-search-input')?.value.toLowerCase().trim();
    const box=document.getElementById('search-suggestions');
    if(box) box.classList.add('hidden');
    if(!q)return;
    window.location.href = '/pages/products.html?q=' + encodeURIComponent(q);
}

async function handleLogout(){await _supabase.auth.signOut();location.href='/';}

function openEditProfile(){
    const m=userSession.user_metadata;
    const name=document.getElementById('edit-name');
    const phone=document.getElementById('edit-phone');
    const district=document.getElementById('edit-district');
    const subdistrict=document.getElementById('edit-subdistrict');
    const address=document.getElementById('edit-address');
    if(name) name.value=m.full_name||'';
    if(phone) phone.value=m.phone||'';
    if(district) district.value=m.district||'';
    if(subdistrict) subdistrict.value=m.subdistrict||'';
    if(address) address.value=m.address||'';
    document.getElementById('edit-profile-modal')?.classList.remove('hidden');
}

async function handleUpdateProfile(){
    showGlobalLoader(2000);
    const u={full_name:document.getElementById('edit-name')?.value,phone:document.getElementById('edit-phone')?.value,district:document.getElementById('edit-district')?.value,subdistrict:document.getElementById('edit-subdistrict')?.value,address:document.getElementById('edit-address')?.value};
    const{error}=await _supabase.auth.updateUser({data:u});
    error?showToast(error.message,'error'):(showToast('Profile updated!'),setTimeout(()=>location.reload(),1500));
}

function openPolicy(type){
    const p={privacy:{t:'Privacy Policy',c:'<p>We collect your name, phone and address strictly for order processing. Data is encrypted via Supabase. For visitor tracking, we collect IP address, location data (with your consent), device information, and browsing behavior to improve your experience.</p><p>You can withdraw consent at any time. All data is stored securely in Supabase.</p>'},terms:{t:'Order Policy',c:'<p>Orders are confirmed via phone call. We reserve the right to cancel orders based on stock availability.</p>'},cookies:{t:'Return Policy',c:'<p>Claims must be filed within 3 days of delivery. Items must be unused with original tags.</p>'},shipping:{t:'Shipping Info',c:'<p>Inside Dhaka: 2-3 days. Outside Dhaka: 5-7 days. Delivery charges vary by location.</p>'}};
    const policyTitle=document.getElementById('policy-title');
    const policyContent=document.getElementById('policy-content');
    if(policyTitle) policyTitle.innerText=p[type].t;
    if(policyContent) policyContent.innerHTML=p[type].c;
    document.getElementById('policy-modal')?.classList.remove('hidden');
}

function renderVideoSection() {
    const section = document.getElementById('video-showcase-section');
    if (currentData.videos && currentData.videos.length) {
        videoData = currentData.videos;
        if(section) section.classList.remove('hidden');
        initializeFullScreenVideoCarousel();
    } else {
        if(section) section.classList.add('hidden');
    }
}

function initializeFullScreenVideoCarousel() {
    const carousel = document.getElementById('video-carousel');
    const indicators = document.getElementById('video-slide-indicators');
    
    if (!videoData.length || !carousel) return;
    
    carousel.innerHTML = videoData.map((video, index) => `
        <div class="video-slide ${index === 0 ? 'active' : ''}" data-index="${index}">
            <video 
                id="main-video-${index}"
                src="${video.video_url}" 
                muted
                playsinline
                loop
                preload="metadata"
                ontimeupdate="updateProgressBar(${index})"
                onended="advanceVideoSlide()"
                onloadedmetadata="if(${index} === 0) playVideoSlide(0)"
                aria-label="${video.title || 'Video ' + (index + 1)}">
            </video>
            <div class="video-overlay"></div>
            <div class="video-info-liquid">
                ${video.brand_name ? `<div class="brand-name">${video.brand_name}</div>` : ''}
                <h2 class="video-main-title">${video.title}</h2>
                ${video.subtitle ? `<p class="video-sub-title">${video.subtitle}</p>` : ''}
            </div>
        </div>
    `).join('');
    
    if(indicators) {
        indicators.innerHTML = videoData.map((_, index) => `
            <div class="indicator ${index === 0 ? 'active' : ''}" 
                 onclick="jumpToVideoSlide(${index})"
                 role="button"
                 tabindex="0"
                 aria-label="Go to slide ${index + 1}"></div>
        `).join('');
    }
    
    setTimeout(() => playVideoSlide(0), 300);
}

function playVideoSlide(index) {
    if (index >= videoData.length) index = 0;
    
    currentVideoIndex = index;
    isVideoPlaying = true;
    
    document.querySelectorAll('.video-slide video').forEach(v => {
        v.pause();
        v.currentTime = 0;
    });
    
    document.querySelectorAll('.video-slide').forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
    });
    
    document.querySelectorAll('.indicator').forEach((ind, i) => {
        ind.classList.toggle('active', i === index);
    });
    
    const video = document.getElementById(`main-video-${index}`);
    if (video) {
        video.currentTime = 0;
        video.muted = true;
        isVideoSoundOn = false;
        
        const btn = document.getElementById('sound-toggle');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
        
        const pauseBtn = document.getElementById('video-pause-btn');
        if (pauseBtn) pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.catch(err => {
                console.log('Autoplay blocked:', err);
            });
        }
    }
    
    const progressBar = document.getElementById('video-progress-bar');
    if(progressBar) progressBar.style.width = '0%';
    
    if (videoAutoAdvanceTimer) clearTimeout(videoAutoAdvanceTimer);
    const duration = video?.duration || 10;
    videoAutoAdvanceTimer = setTimeout(() => advanceVideoSlide(), (duration * 1000) + 2000);
}

function advanceVideoSlide() {
    const nextIndex = (currentVideoIndex + 1) % videoData.length;
    playVideoSlide(nextIndex);
}

function jumpToVideoSlide(index) {
    if (videoAutoAdvanceTimer) clearTimeout(videoAutoAdvanceTimer);
    playVideoSlide(index);
}

function updateProgressBar(index) {
    if (index !== currentVideoIndex) return;
    
    const video = document.getElementById(`main-video-${index}`);
    if (!video || !video.duration) return;
    
    const progress = (video.currentTime / video.duration) * 100;
    const progressBar = document.getElementById('video-progress-bar');
    if(progressBar) progressBar.style.width = `${progress}%`;
}

function toggleVideoSound() {
    isVideoSoundOn = !isVideoSoundOn;
    
    const video = document.getElementById(`main-video-${currentVideoIndex}`);
    if (video) {
        video.muted = !isVideoSoundOn;
    }
    
    const btn = document.getElementById('sound-toggle');
    if (btn) {
        btn.innerHTML = isVideoSoundOn 
            ? '<i class="fa-solid fa-volume-high"></i>' 
            : '<i class="fa-solid fa-volume-xmark"></i>';
    }
}

function toggleVideoPlayPause() {
    isVideoPlaying = !isVideoPlaying;
    const video = document.getElementById(`main-video-${currentVideoIndex}`);
    const btn = document.getElementById('video-pause-btn');
    
    if (video) {
        if (isVideoPlaying) {
            video.play();
            if (btn) btn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        } else {
            video.pause();
            if (btn) btn.innerHTML = '<i class="fa-solid fa-play"></i>';
        }
    }
}

function cleanupVideoCarousel() {
    if (videoAutoAdvanceTimer) {
        clearTimeout(videoAutoAdvanceTimer);
        videoAutoAdvanceTimer = null;
    }
    
    document.querySelectorAll('.video-slide video').forEach(v => {
        v.pause();
        v.currentTime = 0;
    });
}

class BotDetector {
    constructor() {
        this.signals = [];
        this.botScore = 0;
    }

    checkUserAgent() {
        const ua = navigator.userAgent.toLowerCase();
        const botPatterns = [
            'bot', 'crawler', 'spider', 'scraper', 'headless',
            'phantom', 'selenium', 'puppeteer', 'playwright',
            'googlebot', 'bingbot', 'yandexbot', 'duckduckbot',
            'baiduspider', 'facebookexternalhit', 'twitterbot',
            'whatsapp', 'telegrambot', 'slackbot', 'discordbot',
            'python', 'curl', 'wget', 'postman', 'insomnia',
            'axios', 'node-fetch', 'got', 'request',
            'chrome-lighthouse', 'pagespeed', 'gtmetrix'
        ];
        
        for (const pattern of botPatterns) {
            if (ua.includes(pattern)) {
                this.signals.push('bot_ua:' + pattern);
                this.botScore += 0.4;
                return true;
            }
        }
        return false;
    }

    checkBrowserProperties() {
        let score = 0;
        if (navigator.webdriver) { this.signals.push('webdriver_detected'); score += 0.3; }
        if (window.chrome && window.chrome.runtime === undefined) { this.signals.push('chrome_runtime_missing'); score += 0.1; }
        if (!navigator.plugins || navigator.plugins.length === 0) { this.signals.push('no_plugins'); score += 0.05; }
        if (!navigator.languages || navigator.languages.length === 0) { this.signals.push('no_languages'); score += 0.05; }
        if (screen.width === 0 || screen.height === 0) { this.signals.push('headless_screen'); score += 0.2; }
        this.botScore += score;
        return score > 0.3;
    }

    checkHumanBehavior() {
        return new Promise((resolve) => {
            let humanDetected = false;
            let timeoutId;
            
            const detectHuman = () => {
                humanDetected = true;
                clearTimeout(timeoutId);
                cleanup();
                resolve(true);
            };
            
            const detectActivity = (e) => { if (e.isTrusted) { detectHuman(); } };
            
            const cleanup = () => {
                document.removeEventListener('mousemove', detectActivity);
                document.removeEventListener('keydown', detectActivity);
                document.removeEventListener('scroll', detectActivity);
                document.removeEventListener('touchstart', detectActivity);
            };
            
            document.addEventListener('mousemove', detectActivity, { once: true });
            document.addEventListener('keydown', detectActivity, { once: true });
            document.addEventListener('scroll', detectActivity, { once: true });
            document.addEventListener('touchstart', detectActivity, { once: true });
            
            timeoutId = setTimeout(() => {
                if (!humanDetected) { this.signals.push('no_human_activity'); this.botScore += 0.1; cleanup(); resolve(false); }
            }, 2000);
        });
    }

    async detect() {
        this.checkUserAgent();
        this.checkBrowserProperties();
        await this.checkHumanBehavior();
        return { isBot: this.botScore > VISITOR_CONFIG.botScoreThreshold, score: this.botScore, signals: this.signals };
    }
}

class LocationService {
    async getExactLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return; }
            navigator.geolocation.getCurrentPosition(
                (position) => { resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }); },
                (error) => { reject(error); },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }

    async getLocation(ip) {
        let locationInfo = { type: 'ip_based', source: 'ip_lookup', consent: false };
        try {
            const gpsData = await this.getExactLocation();
            locationInfo = { ...locationInfo, ...gpsData, type: 'exact_gps', source: 'browser_geolocation', consent: true };
        } catch (gpsError) {}
        return locationInfo;
    }
}

class DeviceInfoCollector {
    async getIP() {
        try { const response = await fetch('https://api.ipify.org?format=json'); const data = await response.json(); return data.ip; } 
        catch (e) { return 'unknown'; }
    }

    getDeviceType() {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
        return 'desktop';
    }

    collect() {
        return {
            browser: { userAgent: navigator.userAgent, language: navigator.language },
            device: { screenResolution: `${screen.width}x${screen.height}`, deviceType: this.getDeviceType() },
            network: { connectionType: navigator.connection?.effectiveType || 'unknown' },
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timestamp: new Date().toISOString()
        };
    }
}

class VisitorTracker {
    constructor() {
        this.botDetector = new BotDetector();
        this.locationService = new LocationService();
        this.deviceCollector = new DeviceInfoCollector();
        this.ip = null;
        this.consentGranted = false;
        this.trackingInterval = null;
        this.visitCount = 1;
        this.isFirstVisit = true;
    }

    async init() {
        const botResult = await this.botDetector.detect();
        if (botResult.isBot) { console.warn('Bot detected! Skipping tracking.', botResult); return; }
        this.ip = await this.deviceCollector.getIP();
        this.checkPreviousVisits();
        this.showCookieConsent();
        this.trackPageVisit();
        this.startTimeTracking();
    }

    checkPreviousVisits() {
        const visitData = JSON.parse(localStorage.getItem('jayen_visit_history') || '{}');
        if (visitData.lastIP === this.ip) { this.visitCount = (visitData.count || 0) + 1; this.isFirstVisit = false; }
        localStorage.setItem('jayen_visit_history', JSON.stringify({ lastIP: this.ip, count: this.visitCount, lastVisit: new Date().toISOString() }));
    }

    showCookieConsent() {
        const consentGiven = localStorage.getItem(VISITOR_CONFIG.cookieName);
        if (consentGiven === 'accepted') { this.consentGranted = true; this.startFullTracking(); } 
        else if (consentGiven === 'declined') { this.consentGranted = false; this.startLimitedTracking(); } 
        else { setTimeout(() => this.showBanner(), 1000); }
    }

    showBanner() {
        const banner = document.getElementById('cookieConsent');
        if (banner) { banner.classList.add('show'); }
    }

    hideBanner() {
        const banner = document.getElementById('cookieConsent');
        if (banner) { banner.classList.remove('show'); }
    }

    handleCookieAccept() {
        this.consentGranted = true;
        localStorage.setItem(VISITOR_CONFIG.cookieName, 'accepted');
        this.hideBanner();
        if (this.trackingInterval) clearInterval(this.trackingInterval);
        this.startFullTracking();
        showToast('Cookies accepted!', 'success');
    }

    handleCookieDecline() {
        this.consentGranted = false;
        localStorage.setItem(VISITOR_CONFIG.cookieName, 'declined');
        this.hideBanner();
        this.startLimitedTracking();
        showToast('Only essential cookies used', 'info');
        this.trackingInterval = setInterval(() => { this.showBanner(); }, VISITOR_CONFIG.denyInterval);
    }

    async startFullTracking() {
        try {
            const locationData = await this.locationService.getLocation(this.ip);
            const deviceInfo = this.deviceCollector.collect();
            await this.sendToDatabase({
                ip_address: this.ip,
                location_info: locationData,
                browser_info: navigator.userAgent,
                device_info: deviceInfo.device.deviceType,
                page_visited: window.location.pathname,
                referrer: document.referrer,
                visit_duration: 0,
                session_id: VISITOR_CONFIG.sessionId,
                is_unique_visit: this.isFirstVisit,
                visit_count: this.visitCount,
                user_agent: navigator.userAgent,
                screen_resolution: deviceInfo.device.screenResolution,
                language: navigator.language,
                timezone: deviceInfo.timezone,
                consent_given: true
            });
        } catch (error) { console.error('Full tracking error:', error); }
    }

    async startLimitedTracking() {
        try {
            await this.sendToDatabase({
                ip_address: this.ip,
                location_info: { ip: this.ip, type: 'limited' },
                browser_info: navigator.userAgent,
                device_info: 'unknown',
                page_visited: window.location.pathname,
                session_id: VISITOR_CONFIG.sessionId,
                is_unique_visit: this.isFirstVisit,
                visit_count: this.visitCount,
                consent_given: false
            });
        } catch (error) {}
    }

    async sendToDatabase(data) {
        if (this.botDetector.botScore > VISITOR_CONFIG.botScoreThreshold) { return; }
        try {
            await fetch(VISITOR_CONFIG.trackingEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': VISITOR_CONFIG.apiKey, 'Authorization': 'Bearer ' + VISITOR_CONFIG.apiKey, 'Prefer': 'return=minimal' },
                body: JSON.stringify(data)
            });
        } catch (error) { console.error('Tracking error:', error); }
    }

    trackPageVisit() {
        window.addEventListener('popstate', () => { this.sendToDatabase({ ip_address: this.ip, page_visited: window.location.pathname, session_id: VISITOR_CONFIG.sessionId, visit_count: this.visitCount }); });
    }

    startTimeTracking() {
        const startTime = Date.now();
        window.addEventListener('beforeunload', () => { const duration = Math.round((Date.now() - startTime) / 1000); this.sendToDatabase({ ip_address: this.ip, visit_duration: duration, session_id: VISITOR_CONFIG.sessionId }); });
    }
}

window.handleCookieAccept = function() { if (window.visitorTracker) { window.visitorTracker.handleCookieAccept(); } };
window.handleCookieDecline = function() { if (window.visitorTracker) { window.visitorTracker.handleCookieDecline(); } };
window.visitorTracker = new VisitorTracker();

async function loadComponents() {
    try {
        const headerResponse = await fetch('/components/header.html');
        const headerHTML = await headerResponse.text();
        document.getElementById('header-container').innerHTML = headerHTML;
        
        const footerResponse = await fetch('/components/footer.html');
        const footerHTML = await footerResponse.text();
        document.getElementById('footer-container').innerHTML = footerHTML;
        
        const cartResponse = await fetch('/components/cart-drawer.html');
        const cartHTML = await cartResponse.text();
        document.getElementById('cart-drawer-container').innerHTML = cartHTML;
        
        const modalsResponse = await fetch('/components/modals.html');
        const modalsHTML = await modalsResponse.text();
        document.getElementById('modals-container').innerHTML = modalsHTML;
        
        document.getElementById('display-year').innerText = new Date().getFullYear();
        
        const{data:{session}}=await _supabase.auth.getSession();
        if(session){
            userSession=session.user;const m=userSession.user_metadata;
            const authNav=document.getElementById('auth-nav-area');
            const mobileAuth=document.getElementById('mobile-auth-area');
            if(authNav) authNav.innerHTML=`<a href="/pages/account.html" onclick="event.preventDefault();navigate('account')" class="px-4 py-2 border-2 border-primary text-primary rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-primary hover:text-white transition no-underline inline-block">Account</a>`;
            if(mobileAuth) mobileAuth.innerHTML=`<a href="/pages/account.html" onclick="event.preventDefault();navigate('account');toggleMobileMenu()" class="text-primary font-bold text-sm no-underline">My Account</a>`;
            const profileName=document.getElementById('profile-name');
            const profileEmail=document.getElementById('profile-email');
            const profileAddress=document.getElementById('profile-address-full');
            if(profileName) profileName.innerText=m.full_name;
            if(profileEmail) profileEmail.innerText=userSession.email;
            if(profileAddress) profileAddress.innerHTML=`<p>${m.phone||''}</p><p>${m.address||''}, ${m.subdistrict||''}, ${m.district||''}</p>`;
        }else{
            const mobileAuth=document.getElementById('mobile-auth-area');
            if(mobileAuth) mobileAuth.innerHTML=`<a href="#" onclick="event.preventDefault();openAuthModal('login');toggleMobileMenu()" class="w-full py-3 bg-primary text-white rounded-2xl font-bold text-sm no-underline text-center block">Sign In / Sign Up</a>`;
        }
        showGlobalLoader(2000);
        await loadData();
        await window.visitorTracker.init();
    } catch (error) {
        console.error('Error loading components:', error);
    }
}

window.addEventListener('load', loadComponents);
window.addEventListener('scroll',()=>{document.getElementById('main-nav')?.classList.toggle('scrolled',window.scrollY>10);});
window.addEventListener('popstate', function(event) { handleInitialRoute(); });
