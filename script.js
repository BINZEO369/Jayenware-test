// Tailwind Configuration
tailwind.config = {
    theme: {
        extend: {
            fontFamily: { sans: ['Inter', 'sans-serif'] },
            colors: { primary: '#0071e3', dark: '#1d1d1f' }
        }
    }
}

// Global Variables and Constants
const SUPABASE_URL = "https://ozuwazkqyrxiwwfjceth.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96dXdhemtxeXJ4aXd3ZmpjZXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MDc0MTAsImV4cCI6MjA4ODE4MzQxMH0.1Mn5bjENOsK88E2tDpY6xHg4quDnVXlU6eGtGBdK7Xw";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let userSession = null;
let cart = JSON.parse(localStorage.getItem('jayen_cart') || '[]');
let wishlist = JSON.parse(localStorage.getItem('jayen_wish') || '[]');
let recentlyViewed = JSON.parse(localStorage.getItem('jayen_recent') || '[]');
let currentData = { products: [], categories: [], news: [], hero: [], deliveryCharges: [], variants: [], orders: [] };
let currentSlide = 0;
let slideInterval;
let pendingOrderData = null;
let appliedPromo = null;
let selectedVariantObj = null;

// Functions
function updateSEO(title, description, image, productId) {
    document.title = `${title} | JAYENWARE SHOP`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", description.slice(0, 160));
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", description.slice(0, 100));
    const ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg) ogImg.setAttribute("content", image);
    let schema = document.getElementById('product-schema');
    if (schema) schema.remove();
    const product = currentData.products.find(p => p.id == productId);
    if (product) {
        const script = document.createElement('script');
        script.id = 'product-schema';
        script.type = 'application/ld+json';
        script.text = JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": title,
            "image": image,
            "description": description,
            "offers": {
                "@type": "Offer",
                "url": window.location.href,
                "priceCurrency": "BDT",
                "price": product.price,
                "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
            }
        });
        document.head.appendChild(script);
    }
}

function showMsg(text, type = 'success') {
    const modal = document.getElementById('msg-modal');
    const box = document.getElementById('msg-box');
    const icon = document.getElementById('msg-icon');
    const msgText = document.getElementById('msg-text');
    msgText.innerText = text;
    if (type === 'success') {
        icon.className = "w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full text-2xl bg-green-100 text-green-600";
        icon.innerHTML = '<i class="fa-solid fa-check"></i>';
    } else if (type === 'error') {
        icon.className = "w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full text-2xl bg-red-100 text-red-600";
        icon.innerHTML = '<i class="fa-solid fa-exclamation"></i>';
    } else {
        icon.className = "w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full text-2xl bg-blue-100 text-blue-600";
        icon.innerHTML = '<i class="fa-solid fa-info"></i>';
    }
    modal.classList.remove('hidden');
    setTimeout(() => box.classList.remove('scale-90'), 10);
}

function closeMsg() {
    const box = document.getElementById('msg-box');
    box.classList.add('scale-90');
    setTimeout(() => document.getElementById('msg-modal').classList.add('hidden'), 200);
}

function triggerLoader(ms = 1500) {
    const loader = document.getElementById('global-loader');
    loader.style.display = 'flex';
    loader.style.opacity = '1';
    setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => { loader.style.display = 'none'; }, 500);
    }, ms);
}

function triggerOrderLoader(ms = 5000) {
    const loader = document.getElementById('order-loader-overlay');
    loader.style.display = 'flex';
    setTimeout(() => { loader.style.display = 'none'; }, ms);
}

document.getElementById('main-search-input').addEventListener('input', function(e) {
    const query = e.target.value.toLowerCase().trim();
    const suggestionBox = document.getElementById('search-suggestions');
    if (query.length < 2) {
        suggestionBox.innerHTML = '';
        suggestionBox.classList.add('hidden');
        return;
    }
    const filtered = currentData.products.filter(p => p.title.toLowerCase().includes(query)).slice(0, 8);
    if (filtered.length > 0) {
        suggestionBox.innerHTML = filtered.map(p => ` <div onclick="openProductDetails(${p.id}); document.getElementById('search-suggestions').classList.add('hidden')" class="flex items-center gap-3 p-3 hover:bg-primary/5 cursor-pointer border-b border-gray-50 last:border-0 transition"> <img src="${p.img}" class="w-10 h-10 object-cover rounded-lg"> <div class="flex-grow"> <p class="text-[11px] font-bold text-dark truncate max-w-[200px]">${p.title}</p> <p class="text-[10px] font-black text-primary uppercase tracking-tighter">৳ ${p.price}</p> </div> <i class="fa-solid fa-arrow-right text-gray-300 text-[10px]"></i> </div> `).join('');
        suggestionBox.classList.remove('hidden');
    } else {
        suggestionBox.innerHTML = `<div class="p-4 text-center text-gray-400 text-[10px] font-bold italic">No match found</div>`;
        suggestionBox.classList.remove('hidden');
    }
});

window.addEventListener('click', function(e) {
    if (!e.target.closest('#main-search-input')) {
        document.getElementById('search-suggestions').classList.add('hidden');
    }
});

function handleMainSearch() {
    const query = document.getElementById('main-search-input').value.toLowerCase().trim();
    document.getElementById('search-suggestions').classList.add('hidden');
    if (!query) return;
    triggerLoader(1000);
    const filtered = currentData.products.filter(p => p.title.toLowerCase().includes(query));
    renderProducts(filtered);
    navigate('products');
}

function handleRouting() {
    const fullPath = window.location.pathname.toLowerCase();
    const path = fullPath.replace(/^\//, '');
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('product') || urlParams.get('p');
    const orderId = urlParams.get('order') || urlParams.get('o');
    if (productId) {
        openProductDetails(productId);
        return;
    }
    if (orderId) {
        if (userSession) {
            navigate('account');
            viewOrderDetails(orderId);
        } else {
            showMsg("Please login to view order details", "info");
            openAuthModal();
        }
        return;
    }
    if (path === 'account' && !userSession) {
        navigate('home');
        openAuthModal('login');
        return;
    }
    if ((path === 'login' || path === 'signup') && userSession) {
        navigate('account');
        return;
    }
    if (path === 'login') {
        navigate('home');
        openAuthModal('login');
        return;
    }
    if (path === 'signup') {
        navigate('home');
        openAuthModal('signup');
        return;
    }
    const pages = ['home', 'products', 'wishlist', 'account', 'news'];
    if (pages.includes(path)) {
        navigate(path);
        return;
    }
    const matchedCat = currentData.categories.find(c => c.name.toLowerCase().replace(/\s+/g, '-') === path);
    if (matchedCat) {
        navigate('products');
        filterProducts(matchedCat.name, false);
    } else {
        navigate('home');
    }
}

function navigate(pageId) {
    if (pageId === 'account' && !userSession) {
        openAuthModal('login');
        return;
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (pageId !== 'product-details') {
        document.title = "Jayenware Shop Clothing, Perfume & Tech Collection";
    }
    const sections = document.querySelectorAll('.page-section');
    sections.forEach(s => {
        s.classList.remove('active-page', 'fade-in');
        s.style.display = 'none';
    });
    const target = document.getElementById(pageId);
    if (!target) return;
    target.style.display = 'block';
    const path = window.location.pathname.replace('/', '');
    const isSpecial = productIdFromUrl() || orderIdFromUrl() || path === 'login' || path === 'signup';
    if (!isSpecial) {
        window.history.pushState({ page: pageId }, '', '/' + (pageId === 'home' ? '' : pageId));
    }
    const featured = document.getElementById('home-featured-sections');
    if (pageId === 'home') {
        featured.style.display = 'block';
        renderRecentlyViewed();
    } else featured.style.display = 'none';
    if (pageId === 'wishlist') renderWishlist();
    if (pageId === 'account' && userSession) loadUserOrders();
    setTimeout(() => { target.classList.add('active-page', 'fade-in'); }, 50);
}

function productIdFromUrl() { return new URLSearchParams(window.location.search).get('product'); }
function orderIdFromUrl() { return new URLSearchParams(window.location.search).get('order'); }
window.onpopstate = function(event) { handleRouting(); };

async function loadData() {
    const { data: heroData } = await _supabase.from('hero').select('*').order('created_at', { ascending: true });
    if (heroData) {
        currentData.hero = heroData;
        renderHero();
    }
    const { data: catData } = await _supabase.from('categories').select('*');
    if (catData) {
        currentData.categories = catData;
        renderCategories();
    }
    const { data: varData } = await _supabase.from('product_variants').select('*');
    if (varData) currentData.variants = varData;
    const { data: prodData } = await _supabase.from('products').select('*').order('created_at', { ascending: false });
    if (prodData) {
        currentData.products = prodData;
        renderProducts(prodData);
        renderHomeFeatured(prodData);
        renderRecentlyViewed();
    }
    const { data: newsData } = await _supabase.from('news').select('*').order('created_at', { ascending: false });
    if (newsData) renderNews(newsData);
    const { data: deliveryData } = await _supabase.from('delivery_settings').select('*');
    if (deliveryData) currentData.deliveryCharges = deliveryData;
    if (userSession) await loadUserOrders();
    handleRouting();
    updateCounts();
}

function toggleSortMenu() { document.getElementById('sort-dropdown').classList.toggle('hidden'); }

function handleSorting(type, label) {
    document.getElementById('current-sort-label').innerText = label;
    document.getElementById('sort-dropdown').classList.add('hidden');
    applySorting(type);
}

function openProductDetails(productId) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const product = currentData.products.find(p => p.id == productId);
    if (!product) return;
    updateSEO(product.title, product.description, product.img, product.id);
    let currentRecent = JSON.parse(localStorage.getItem('jayen_recent') || '[]');
    let updatedRecent = [productId.toString(), ...currentRecent.filter(id => id.toString() !== productId.toString())];
    recentlyViewed = updatedRecent.slice(0, 8);
    localStorage.setItem('jayen_recent', JSON.stringify(recentlyViewed));
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('product', productId);
    window.history.pushState({}, '', url);
    const container = document.getElementById('product-detail-content');
    const variants = currentData.variants.filter(v => v.product_id == productId);
    const isOutOfStock = product.stock <= 0;
    const allImages = product.images ? product.images.split(',') : [product.img];
    const isWished = wishlist.includes(product.id);
    container.innerHTML = ` <div class="grid grid-cols-1 md:grid-cols-2 gap-12"> <div> <div class="rounded-[3rem] overflow-hidden shadow-2xl bg-gray-100 mb-4 h-[400px]"> <img id="main-detail-img" src="${allImages[0]}" class="w-full h-full object-cover"> </div> <div class="flex gap-2 overflow-x-auto pb-2 no-scrollbar"> ${allImages.map(img => `<img src="${img}" onclick="document.getElementById('main-detail-img').src='${img}'" class="w-20 h-20 object-cover rounded-2xl cursor-pointer border-2 border-transparent hover:border-primary transition">`).join('')} </div> </div> <div class="flex flex-col justify-center"> <div class="flex justify-between items-start mb-4"> <span class="px-4 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest">${product.category}</span> <div class="flex gap-2"> <button onclick="toggleWishlist(${product.id})" class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center ${isWished ? 'text-red-500' : 'text-gray-400'} hover:bg-red-50 transition"> <i class="fa-${isWished ? 'solid' : 'regular'} fa-heart"></i> </button> <button onclick="shareProduct(${product.id})" class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-primary hover:text-white transition"> <i class="fa-solid fa-share-nodes"></i> </button> </div> </div> <h1 class="text-4xl md:text-5xl font-black mb-6 leading-tight">${product.title}</h1> <div class="mb-4"> <span class="text-3xl font-black text-primary">৳ ${product.price}</span> ${product.old_price ? `<span class="ml-3 text-lg text-gray-400 line-through">৳ ${product.old_price}</span>` : ''} </div> <div class="mb-8 flex items-center gap-2"> <span class="w-2 h-2 rounded-full ${isOutOfStock ? 'bg-red-500' : 'bg-green-500'}"></span> <span class="text-xs font-bold ${isOutOfStock ? 'text-red-500' : 'text-green-600'}"> ${isOutOfStock ? 'Out of Stock' : `In Stock: ${product.stock}`} </span> </div> ${variants.length > 0 ? ` <div class="mb-8"> <p class="text-[10px] font-black uppercase text-gray-400 mb-3 tracking-widest">Select Variant</p> <div class="flex flex-wrap gap-2" id="variant-container"> ${variants.map(v => ` <button onclick='selectVariant(this, ${JSON.stringify(v)})' class="variant-btn px-6 py-3 border-2 rounded-2xl text-xs font-bold transition hover:border-primary"> ${v.name} - ৳${v.price} </button> `).join('')} </div> </div>` : ''} <div class="grid grid-cols-1 sm:grid-cols-2 gap-4"> <button onclick="addToCart(${product.id}, false, true)" ${isOutOfStock ? 'disabled' : ''} class="py-5 ${isOutOfStock ? 'bg-gray-300' : 'bg-dark hover:bg-black'} text-white rounded-3xl font-bold shadow-xl transition">Add to Bag</button> <button onclick="addToCart(${product.id}, true, true)" ${isOutOfStock ? 'disabled' : ''} class="py-5 ${isOutOfStock ? 'bg-gray-200' : 'bg-primary hover:scale-105'} text-white rounded-3xl font-bold shadow-xl transition">Buy Now</button> </div> <p class="text-gray-500 mt-8 leading-relaxed">${product.description}</p> </div> </div> `;
    selectedVariantObj = null;
    renderRelatedProducts(product.category, product.id);
    navigate('product-details');
}

function selectVariant(btn, vObj) {
    document.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedVariantObj = vObj;
}

function shareProduct(id) {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('product', id);
    const product = currentData.products.find(p => p.id == id);
    const shareData = { title: product.title, text: `Check out ${product.title} on JAYENWARE!`, url: url.toString() };
    if (navigator.share) { navigator.share(shareData); } else {
        navigator.clipboard.writeText(url.toString());
        showMsg("Link copied to clipboard!", "info");
    }
}

function renderHomeFeatured(list) {
    const hotList = list.filter(p => p.is_hot === true);
    const bestList = list.filter(p => p.is_best === true);
    const hotContainer = document.getElementById('hot-products-section');
    const bestContainer = document.getElementById('best-products-section');
    const hotGrid = document.getElementById('hot-products-grid');
    const bestGrid = document.getElementById('best-products-grid');
    if (hotList.length > 0) {
        hotContainer.classList.remove('hidden');
        hotGrid.innerHTML = generateMiniProductCards(hotList);
    }
    if (bestList.length > 0) {
        bestContainer.classList.remove('hidden');
        bestGrid.innerHTML = generateMiniProductCards(bestList);
    }
}

function generateMiniProductCards(list) {
    return list.map(j => ` <div class="bg-white rounded-2xl p-2 md:p-4 shadow-sm border border-gray-100 hover:shadow-lg transition group cursor-pointer" onclick="openProductDetails(${j.id})"> <div class="relative h-32 md:h-48 overflow-hidden rounded-xl mb-3"> <img src="${j.img}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500"> <button onclick="event.stopPropagation(); toggleWishlist(${j.id})" class="absolute top-2 right-2 w-6 h-6 bg-white/80 rounded-full flex items-center justify-center text-[10px] ${wishlist.includes(j.id) ? 'text-red-500' : 'text-gray-400'}"><i class="fa-solid fa-heart"></i></button> ${j.stock <= 0 ? '<div class="absolute inset-0 bg-black/40 flex items-center justify-center"><span class="bg-white text-[8px] font-black px-2 py-1 rounded">OUT OF STOCK</span></div>' : ''} </div> <h4 class="font-bold text-[11px] md:text-sm truncate">${j.title}</h4> <div class="mt-2"> <div class="flex justify-between items-center"> <span class="font-black text-primary text-xs md:text-sm">৳ ${j.price}</span> <button onclick="event.stopPropagation(); addToCart(${j.id})" ${j.stock <= 0 ? 'disabled' : ''} class="w-7 h-7 ${j.stock <= 0 ? 'bg-gray-200' : 'bg-dark'} text-white rounded-full flex items-center justify-center text-[10px]"><i class="fa-solid fa-plus"></i></button> </div> ${j.old_price ? `<span class="text-[9px] text-gray-400 line-through">৳ ${j.old_price}</span>` : ''} </div> </div> `).join('');
}

function renderHero() {
    const container = document.getElementById('hero-banner-container');
    const list = currentData.hero;
    if (list.length === 0) {
        container.innerHTML = `<div class="w-full h-full bg-dark"></div>`;
        return;
    }
    container.innerHTML = list.map((h, i) => ` <div class="hero-slider-img ${i === 0 ? 'active' : ''}" data-index="${i}"> <img src="${h.img}" class="w-full h-full object-cover"> </div> `).join('');
    updateHeroText(0);
    clearInterval(slideInterval);
    if (list.length > 1) {
        slideInterval = setInterval(() => {
            let next = (currentSlide + 1) % list.length;
            showSlide(next);
        }, 5000);
    }
}

function showSlide(index) {
    const slides = document.querySelectorAll('.hero-slider-img');
    slides.forEach(s => s.classList.remove('active'));
    if (slides[index]) slides[index].classList.add('active');
    currentSlide = index;
    updateHeroText(index);
}

function updateHeroText(index) {
    const data = currentData.hero[index];
    if (data) {
        document.getElementById('hero-title').innerText = data.title || 'JAYENWARE';
        document.getElementById('hero-subtitle').innerText = data.subtitle || '';
    }
}

function renderCategories() {
    const filterBar = document.getElementById('category-filter-bar');
    const filterHtml = currentData.categories.map(c => ` <button onclick="filterProducts('${c.name}')" class="cat-filter-btn whitespace-nowrap px-6 py-2 rounded-full bg-white border border-gray-200 text-xs font-bold hover:bg-primary hover:text-white transition shadow-sm">${c.name}</button> `).join('');
    filterBar.innerHTML = `<button onclick="filterProducts('all')" class="cat-filter-btn px-6 py-2 rounded-full bg-dark text-white text-xs font-bold shadow-md">All</button>` + filterHtml;
    const desktopNav = document.getElementById('desktop-category-nav');
    const desktopCatsHtml = currentData.categories.map(c => `<button onclick="navigate('products'); filterProducts('${c.name}')" class="hover:text-primary transition">${c.name}</button>`).join('');
    desktopNav.innerHTML = desktopCatsHtml;
    const mobileLinks = currentData.categories.map(c => `<button onclick="navigate('products'); filterProducts('${c.name}'); toggleMobileMenu()">${c.name}</button>`).join('');
    document.getElementById('mobile-category-links').innerHTML = mobileLinks;
}

function filterProducts(cat, updateUrl = true) {
    const filtered = cat === 'all' ? currentData.products : currentData.products.filter(p => p.category === cat);
    renderProducts(filtered);
    if (document.getElementById('home').classList.contains('active-page')) navigate('products');
    if (updateUrl) {
        const path = cat === 'all' ? '/products' : '/' + cat.toLowerCase().replace(/\s+/g, '-');
        window.history.pushState({ category: cat }, '', path);
    }
}

function renderProducts(list) {
    const grid = document.getElementById('projects-grid');
    grid.innerHTML = list.map(j => {
        const isOutOfStock = j.stock <= 0;
        const isWished = wishlist.includes(j.id);
        return ` <div class="glass-card rounded-[1.5rem] md:rounded-[3rem] overflow-hidden shadow-xl group flex flex-col h-full cursor-pointer" onclick="openProductDetails(${j.id})"> <div class="relative h-40 md:h-72 overflow-hidden"> <img src="${j.img}" class="w-full h-full object-cover group-hover:scale-110 transition duration-700"> <button onclick="event.stopPropagation(); toggleWishlist(${j.id})" class="absolute top-2 right-2 md:top-4 md:right-4 w-8 h-8 md:w-10 md:h-10 bg-white/90 rounded-full flex items-center justify-center ${isWished ? 'text-red-500' : 'text-gray-400'} shadow-lg hover:scale-110 transition"> <i class="fa-${isWished ? 'solid' : 'regular'} fa-heart text-xs md:text-base"></i> </button> <div class="absolute top-2 left-2 md:top-4 md:left-4 flex flex-col gap-1 md:gap-2"> <div class="bg-white/90 px-2 md:px-4 py-1 rounded-full text-[8px] md:text-[10px] font-bold uppercase text-primary w-fit">${j.category}</div> ${j.is_hot ? '<div class="bg-red-500 text-white px-2 md:px-3 py-1 rounded-full text-[8px] md:text-[10px] font-bold uppercase w-fit"><i class="fa-solid fa-fire mr-1"></i>HOT</div>' : ''} ${isOutOfStock ? '<div class="bg-dark text-white px-2 md:px-3 py-1 rounded-full text-[8px] md:text-[10px] font-bold uppercase w-fit">OUT</div>' : ''} </div> </div> <div class="p-4 md:p-8 flex flex-col flex-grow"> <h3 class="text-sm md:text-2xl font-black mb-1 md:mb-4 truncate">${j.title}</h3> <div class="mb-2 md:mb-4"> <p class="text-xs md:text-xl font-black text-primary inline-block">৳ ${j.price}</p> ${j.old_price ? `<p class="ml-1 md:ml-2 text-[8px] md:text-sm text-gray-400 line-through inline-block">৳ ${j.old_price}</p>` : ''} </div> <div class="mt-auto grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3"> <button onclick="event.stopPropagation(); addToCart(${j.id})" ${isOutOfStock ? 'disabled' : ''} class="py-2 md:py-3 px-2 md:px-4 ${isOutOfStock ? 'bg-gray-100 text-gray-400' : 'bg-gray-100 text-dark hover:bg-gray-200'} rounded-xl md:rounded-2xl font-bold text-[10px] md:text-xs">Add</button> <button onclick="event.stopPropagation(); openProductDetails(${j.id})" class="py-2 md:py-3 px-2 md:px-4 bg-primary text-white rounded-xl md:rounded-2xl font-bold text-[10px] md:text-xs text-center">Details</button> </div> </div> </div>`;
    }).join('');
}

function renderNews(list) {
    const grid = document.getElementById('news-grid');
    grid.innerHTML = list.map(n => ` <div class="glass-card rounded-3xl overflow-hidden shadow-lg p-4"> <img src="${n.img}" class="w-full h-48 object-cover rounded-2xl mb-4"> <h3 class="font-bold text-lg mb-2">${n.title}</h3> <p class="text-xs text-gray-500 line-clamp-3">${n.description}</p> </div>`).join('');
}

function toggleCart() {
    document.getElementById('cart-drawer').classList.toggle('open');
    renderCartItems();
}

function addToCart(productId, buyNow = false, isDetail = false) {
    const product = currentData.products.find(p => p.id === productId);
    const inCartCount = cart.filter(item => item.product_id === productId).length;
    if (inCartCount >= product.stock) {
        showMsg(`Sorry, only ${product.stock} units available.`, "error");
        return;
    }
    let finalPrice = product.price;
    let selectedVariantName = null;
    let vId = null;
    const hasVariants = currentData.variants.some(v => v.product_id == productId);
    if (isDetail && hasVariants) {
        if (!selectedVariantObj) {
            showMsg("Please select a variant first!", "error");
            return;
        }
        vId = selectedVariantObj.id;
        selectedVariantName = selectedVariantObj.name;
        finalPrice = selectedVariantObj.price;
    } else if (!isDetail && hasVariants) {
        openProductDetails(productId);
        return;
    }
    cart.push({ id: Date.now(), product_id: product.id, variant_id: vId, title: product.title, price: finalPrice, img: product.img, variant: selectedVariantName, quantity: 1 });
    saveCart();
    if (buyNow) { toggleCart(); } else { showMsg("Added to Bag!", "success"); }
}

async function applyPromo() {
    const code = document.getElementById('promo-input').value.toUpperCase();
    const msg = document.getElementById('promo-msg');
    if (!code) return;
    const { data, error } = await _supabase.from('promo_codes').select('*').eq('code', code).eq('is_active', true).single();
    if (error || !data) {
        msg.innerText = "Invalid or expired promo code.";
        msg.className = "text-[10px] mt-1 font-bold text-red-500";
        appliedPromo = null;
    } else {
        appliedPromo = data;
        msg.innerText = "Promo code applied!";
        msg.className = "text-[10px] mt-1 font-bold text-green-500";
    }
    renderCartItems();
}

function saveCart() {
    localStorage.setItem('jayen_cart', JSON.stringify(cart));
    updateCounts();
}

function renderCartItems() {
    const container = document.getElementById('cart-items');
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');
    const promoRow = document.getElementById('promo-row');
    const discountEl = document.getElementById('cart-discount');
    if (cart.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-400 italic py-10">Empty Bag</p>`;
        subtotalEl.innerText = "৳ 0.00";
        totalEl.innerText = "৳ 0.00";
        promoRow.classList.add('hidden');
        return;
    }
    let subtotal = 0;
    container.innerHTML = cart.map((item, idx) => {
        subtotal += item.price;
        return ` <div class="flex gap-4 p-3 bg-white border rounded-2xl shadow-sm"> <img src="${item.img}" class="w-16 h-16 object-cover rounded-xl"> <div class="flex-grow"> <h4 class="text-sm font-bold">${item.title}</h4> <p class="text-[10px] text-gray-400">${item.variant || ''}</p> <p class="text-sm font-black text-primary">৳ ${item.price}</p> </div> <button onclick="removeFromCart(${idx})" class="text-red-400 p-2"><i class="fa-solid fa-trash"></i></button> </div>`;
    }).join('');
    let discount = 0;
    if (appliedPromo && subtotal >= appliedPromo.min_order) {
        discount = appliedPromo.type === 'percent' ? (subtotal * appliedPromo.value / 100) : appliedPromo.value;
        promoRow.classList.remove('hidden');
        discountEl.innerText = `- ৳ ${discount.toFixed(2)}`;
    } else { promoRow.classList.add('hidden'); }
    subtotalEl.innerText = `৳ ${subtotal.toFixed(2)}`;
    totalEl.innerText = `৳ ${(subtotal - discount).toFixed(2)}`;
}

function removeFromCart(idx) {
    cart.splice(idx, 1);
    saveCart();
    renderCartItems();
}

function showCheckoutOptions() {
    if (!userSession) {
        showMsg("Please login first.", "info");
        openAuthModal();
        return;
    }
    if (cart.length === 0) return;
    const meta = userSession.user_metadata;
    const fullAddr = `${meta.address}, ${meta.subdistrict}, ${meta.district}, ${meta.country} (PH: ${meta.phone})`;
    document.getElementById('checkout-profile-addr').innerText = fullAddr;
    document.getElementById('checkout-modal').classList.remove('hidden');
}

function prepareOrderReview(type) {
    const meta = userSession.user_metadata;
    let shippingInfo = {};
    let targetDistrict = "";
    let targetUpazila = "";
    if (type === 'profile') {
        targetDistrict = meta.district || "";
        targetUpazila = meta.subdistrict || "";
        shippingInfo = { phone: meta.phone, district: targetDistrict, upazila: targetUpazila, address: `${meta.address}, ${meta.subdistrict}, ${meta.district}, ${meta.country}` };
    } else {
        const phone = document.getElementById('new-phone').value;
        const address = document.getElementById('new-address').value;
        targetDistrict = document.getElementById('new-district').value;
        targetUpazila = document.getElementById('new-upazila').value;
        if (!phone || !address || !targetDistrict || !targetUpazila) {
            return showMsg("Please fill all details", "error");
        }
        shippingInfo = { phone, district: targetDistrict, upazila: targetUpazila, address };
    }
    let deliveryCharge = 0;
    const matchUpazila = currentData.deliveryCharges.find(d => d.upazila?.toLowerCase() === targetUpazila.toLowerCase());
    const matchDistrict = currentData.deliveryCharges.find(d => d.district?.toLowerCase() === targetDistrict.toLowerCase());
    const matchDefault = currentData.deliveryCharges.find(d => d.location_name?.toLowerCase() === 'default');
    if (matchUpazila) deliveryCharge = matchUpazila.charge;
    else if (matchDistrict) deliveryCharge = matchDistrict.charge;
    else deliveryCharge = matchDefault ? matchDefault.charge : 0;
    let subTotal = 0;
    cart.forEach(item => subTotal += item.price);
    let discount = 0;
    if (appliedPromo && subTotal >= appliedPromo.min_order) {
        discount = appliedPromo.type === 'percent' ? (subTotal * appliedPromo.value / 100) : appliedPromo.value;
    }
    const finalTotal = (subTotal - discount) + parseFloat(deliveryCharge);
    pendingOrderData = { member_name: meta.full_name, member_email: userSession.email, project_title: "Store Order", member_info: { shipping: shippingInfo, subtotal: subTotal, discount: discount, promo_code: appliedPromo ? appliedPromo.code : null, delivery_charge: parseFloat(deliveryCharge), total: `৳ ${finalTotal.toFixed(2)}`, items: cart.map(item => ({ id: item.product_id, variant_id: item.variant_id, title: item.title, variant: item.variant, qty: item.quantity, price: item.price })) } };
    renderReviewModal();
    document.getElementById('checkout-modal').classList.add('hidden');
    document.getElementById('review-modal').classList.remove('hidden');
}

function renderReviewModal() {
    const body = document.getElementById('order-review-body');
    const data = pendingOrderData;
    const isFirstTime = currentData.orders.length === 0;
    body.innerHTML = ` <div class="grid grid-cols-1 md:grid-cols-2 gap-6"> <div class="space-y-4"> <p><strong>Name:</strong> ${data.member_name}</p> <p><strong>Shipping:</strong> ${data.member_info.shipping.address}</p> <div class="p-4 bg-primary/5 rounded-2xl border border-primary/10"> <div class="flex items-center gap-2 text-primary font-bold mb-1"> <i class="fa-solid fa-truck-fast"></i> <span class="text-xs uppercase">Payment Method</span> </div> <p class="text-sm font-black flex items-center gap-2"> COD (Cash on Delivery) <i class="fa-solid fa-hand-holding-dollar text-green-600"></i> </p> </div> <p><strong>Items:</strong></p> <div class="space-y-1"> ${data.member_info.items.map(i => `<p class="text-[11px]">• ${i.title} (${i.variant || 'Default'}) x${i.qty}</p>`).join('')} </div> </div> <div class="space-y-4"> <h3 class="font-bold">Order Summary</h3> <div class="bg-gray-50 p-4 rounded-xl"> <p>Subtotal: ৳ ${data.member_info.subtotal}</p> ${data.member_info.discount > 0 ? `<p class="text-green-600">Discount: -৳ ${data.member_info.discount}</p>` : ''} <p>Delivery: ৳ ${data.member_info.delivery_charge}</p> <p class="font-black text-primary text-lg mt-2">Total: ${data.member_info.total}</p> </div> <div class="p-4 rounded-2xl border-2 ${isFirstTime ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}"> <p class="text-[10px] font-bold ${isFirstTime ? 'text-orange-600' : 'text-green-600'} uppercase mb-1">Notice</p> <p class="text-[11px] leading-relaxed italic ${isFirstTime ? 'text-orange-900' : 'text-green-900'}"> ${isFirstTime ? 'Once the order is confirmed, our representative will contact you.' : 'Welcome back to Jayenware. Thank you for choosing our collection once again. Your trust inspires us to deliver superior quality and comfort every time. With every order, we ensure a perfect blend of style and craftsmanship. Once the order is confirmed, our representative will contact you.'} </p> </div> <p class="text-[9px] text-gray-400 mt-2">* Final price will be verified and calculated by our secure server.</p> </div> </div> `;
}

async function confirmFinalCheckout() {
    if (!pendingOrderData) return;
    document.getElementById('review-modal').classList.add('hidden');
    triggerOrderLoader(5000);
    const { error } = await _supabase.rpc('secure_checkout', { p_member_name: pendingOrderData.member_name, p_member_email: pendingOrderData.member_email, p_project_title: pendingOrderData.project_title, p_member_info: pendingOrderData.member_info });
    setTimeout(() => {
        if (!error) {
            showMsg("Order Placed Successfully!", "success");
            cart = [];
            saveCart();
            setTimeout(() => location.reload(), 2000);
        } else { showMsg("Checkout Failed: " + error.message, "error"); }
    }, 5000);
}

async function loadUserOrders() {
    const { data } = await _supabase.from('orders').select('*').eq('member_email', userSession.email).order('created_at', { ascending: false });
    const container = document.getElementById('user-order-list');
    if (!data || data.length === 0) {
        container.innerHTML = `<p class="text-xs italic text-gray-400">No orders.</p>`;
        return;
    }
    currentData.orders = data;
    container.innerHTML = data.map(o => ` <div class="p-4 bg-gray-50 rounded-2xl border mb-2 flex justify-between items-center cursor-pointer hover:border-primary transition" onclick="viewOrderDetails(${o.id})"> <div> <p class="text-[10px] font-black text-gray-400 uppercase">Order #${o.id}</p> <p class="font-black text-sm text-dark">${o.member_info?.total}</p> </div> <div class="text-right"> <span class="text-[10px] uppercase font-bold text-primary bg-primary/10 px-2 py-1 rounded">${o.status || 'Pending'}</span> <p class="text-[9px] text-gray-400 mt-1">${new Date(o.created_at).toLocaleDateString()}</p> </div> </div>`).join('');
}

function viewOrderDetails(orderId) {
    const order = currentData.orders.find(o => o.id == orderId);
    if (!order) return;
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('order', orderId);
    window.history.pushState({}, '', url);
    const body = document.getElementById('order-details-body');
    const info = order.member_info;
    body.innerHTML = ` <div class="space-y-4"> <div class="p-4 bg-gray-50 rounded-2xl"> <p class="text-[10px] font-bold text-gray-400 uppercase mb-2">Order Items</p> ${info.items.map(item => ` <div class="flex justify-between items-center py-1 border-b border-dashed last:border-0"> <p class="text-xs font-medium">${item.title} ${item.variant ? '(' + item.variant + ')' : ''} x${item.qty}</p> <p class="text-xs font-bold">৳ ${item.price}</p> </div> `).join('')} </div> <div class="p-4 bg-primary/5 rounded-2xl"> <p class="text-[10px] font-bold text-primary uppercase mb-2">Shipping To</p> <p class="text-xs font-bold text-dark">${order.member_name}</p> <p class="text-xs text-gray-500">${info.shipping.phone}</p> <p class="text-xs text-gray-500 mt-1">${info.shipping.address}</p> </div> <div class="p-4 border border-gray-100 rounded-2xl"> <p class="text-[10px] font-bold text-gray-400 uppercase mb-2">Payment Breakdown</p> <div class="flex justify-between text-xs mb-1"><span>Subtotal</span><span>৳ ${info.subtotal}</span></div> ${info.discount > 0 ? `<div class="flex justify-between text-xs mb-1 text-green-600"><span>Discount</span><span>- ৳ ${info.discount}</span></div>` : ''} <div class="flex justify-between text-xs mb-1"><span>Delivery</span><span>৳ ${info.delivery_charge}</span></div> <div class="flex justify-between text-sm font-black text-primary border-t pt-2 mt-2"><span>Total</span><span>${info.total}</span></div> </div> </div> `;
    document.getElementById('od-title').innerText = `Order #${orderId}`;
    document.getElementById('order-details-modal').classList.remove('hidden');
}

function closeOrderDetails() {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.delete('order');
    window.history.pushState({}, '', url);
    document.getElementById('order-details-modal').classList.add('hidden');
}

function openEditProfile() {
    const meta = userSession.user_metadata;
    document.getElementById('edit-name').value = meta.full_name || '';
    document.getElementById('edit-phone').value = meta.phone || '';
    document.getElementById('edit-district').value = meta.district || '';
    document.getElementById('edit-subdistrict').value = meta.subdistrict || '';
    document.getElementById('edit-address').value = meta.address || '';
    document.getElementById('edit-profile-modal').classList.remove('hidden');
}

async function handleUpdateProfile() {
    triggerLoader(2000);
    const updates = { full_name: document.getElementById('edit-name').value, phone: document.getElementById('edit-phone').value, district: document.getElementById('edit-district').value, subdistrict: document.getElementById('edit-subdistrict').value, address: document.getElementById('edit-address').value };
    const { error } = await _supabase.auth.updateUser({ data: updates });
    if (error) { showMsg(error.message, "error"); } else {
        showMsg("Profile updated successfully!", "success");
        setTimeout(() => location.reload(), 1500);
    }
}

function toggleWishlist(id) {
    if (wishlist.includes(id)) wishlist = wishlist.filter(x => x !== id);
    else wishlist.push(id);
    localStorage.setItem('jayen_wish', JSON.stringify(wishlist));
    updateCounts();
    if (document.getElementById('products').classList.contains('active-page')) renderProducts(currentData.products);
    if (document.getElementById('wishlist').classList.contains('active-page')) renderWishlist();
    showMsg("Wishlist Updated", "info");
}

function updateCounts() {
    document.getElementById('cart-count').innerText = cart.length;
    document.getElementById('wish-count').innerText = wishlist.length;
}

function renderWishlist() {
    const grid = document.getElementById('wishlist-grid');
    const empty = document.getElementById('wishlist-empty');
    const list = currentData.products.filter(p => wishlist.includes(p.id));
    if (list.length === 0) {
        grid.innerHTML = '';
        empty.classList.remove('hidden');
    } else {
        empty.classList.add('hidden');
        grid.innerHTML = generateMiniProductCards(list);
    }
}

function applySorting(type) {
    let sorted = [...currentData.products];
    if (type === 'price-low') sorted.sort((a, b) => a.price - b.price);
    else if (type === 'price-high') sorted.sort((a, b) => b.price - a.price);
    else sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    renderProducts(sorted);
}

function renderRelatedProducts(cat, excludeId) {
    const list = currentData.products.filter(p => p.category === cat && p.id !== excludeId).slice(0, 4);
    document.getElementById('related-products-grid').innerHTML = generateMiniProductCards(list);
}

function renderRecentlyViewed() {
    const recentIds = JSON.parse(localStorage.getItem('jayen_recent') || '[]');
    const list = currentData.products.filter(p => recentIds.includes(p.id.toString()));
    list.sort((a, b) => recentIds.indexOf(a.id.toString()) - recentIds.indexOf(b.id.toString()));
    const section = document.getElementById('recent-products-section');
    if (list.length > 0) {
        section.classList.remove('hidden');
        document.getElementById('recent-products-grid').innerHTML = generateMiniProductCards(list);
    } else section.classList.add('hidden');
}

function toggleMobileMenu() { document.getElementById('mobile-menu').classList.toggle('hidden'); }

function openAuthModal(mode = 'login') {
    document.getElementById('auth-modal').classList.remove('hidden');
    toggleAuth(mode);
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
    if (!userSession) window.history.pushState({ page: 'home' }, '', '/');
}

function toggleAuth(mode) {
    const isLogin = mode === 'login';
    document.getElementById('signup-fields').classList.toggle('hidden', isLogin);
    document.getElementById('t-login').className = isLogin ? 'pb-2 font-bold text-primary border-b-2 border-primary' : 'pb-2 font-bold text-gray-400';
    document.getElementById('t-signup').className = !isLogin ? 'pb-2 font-bold text-primary border-b-2 border-primary' : 'pb-2 font-bold text-gray-400';
    window.history.pushState({ page: mode }, '', '/' + mode);
}

document.getElementById('auth-form').onsubmit = async (e) => {
    e.preventDefault();
    triggerLoader(3000);
    const email = document.getElementById('auth-email').value,
        pass = document.getElementById('auth-pass').value;
    const isSignup = !document.getElementById('signup-fields').classList.contains('hidden');
    let res;
    if (isSignup) {
        res = await _supabase.auth.signUp({
            email,
            password: pass,
            options: {
                data: {
                    full_name: document.getElementById('auth-name').value,
                    phone: document.getElementById('auth-phone').value,
                    country: document.getElementById('auth-country').value,
                    district: document.getElementById('auth-district').value,
                    subdistrict: document.getElementById('auth-subdistrict').value,
                    address: document.getElementById('auth-address').value
                }
            }
        });
    } else res = await _supabase.auth.signInWithPassword({ email, password: pass });
    if (res.error) showMsg(res.error.message, "error");
    else {
        window.history.pushState({}, '', '/account');
        location.reload();
    }
}

async function handleLogout() {
    await _supabase.auth.signOut();
    location.reload();
}

function openPolicy(type) {
    const title = document.getElementById('policy-title'),
        content = document.getElementById('policy-content');
    const policies = {
        privacy: { t: 'Privacy Policy', c: "<p>We collect your name, phone and address strictly for orders. Data is encrypted via Supabase.</p>" },
        terms: { t: 'Order Policy', c: "<p>Orders are subject to confirmation calls. JAYENWARE can cancel orders based on stock.</p>" },
        cookies: { t: 'Return Policy', c: "<p>Claims must be filed within 3 days. Item must be unused with tags.</p>" },
        shipping: { t: 'Shipping Info', c: "<p>Inside Dhaka: 2-3 days. Outside Dhaka: 5-7 days.</p>" }
    };
    title.innerText = policies[type].t;
    content.innerHTML = policies[type].c;
    document.getElementById('policy-modal').classList.remove('hidden');
}

window.onclick = function(event) {
    if (!event.target.closest('#custom-sort-container')) {
        document.getElementById('sort-dropdown').classList.add('hidden');
    }
}

// Window Load event
window.onload = async () => {
    document.getElementById('display-year').innerText = new Date().getFullYear();
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
        userSession = session.user;
        const meta = userSession.user_metadata;
        document.getElementById('auth-nav-area').innerHTML = `<button onclick="navigate('account')" class="px-5 py-2 border border-primary text-primary rounded-full text-xs font-bold">Account</button>`;
        document.getElementById('mobile-auth-area').innerHTML = `<button onclick="navigate('account'); toggleMobileMenu()" class="text-primary font-bold">Account</button>`;
        document.getElementById('profile-name').innerText = meta.full_name;
        document.getElementById('profile-email').innerText = userSession.email;
        document.getElementById('profile-address-full').innerHTML = `<p>${meta.phone || ''}</p><p>${meta.address || ''}, ${meta.subdistrict || ''}, ${meta.district || ''}</p>`;
    } else {
        document.getElementById('mobile-auth-area').innerHTML = `<button onclick="openAuthModal('login'); toggleMobileMenu()" class="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm shadow-lg">Sign In / Sign Up</button>`;
    }
    loadData();
    triggerLoader(2000);
}
