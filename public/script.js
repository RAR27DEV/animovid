// ===================================
// ANIMOVID - Main Application Script
// SPA with Hash Routing + Supabase Auth & Comments
// ===================================

(function () {
    'use strict';

    // --- Supabase Config ---
    const SUPABASE_URL = 'https://jgmkfvcjjkbwijjlbouo.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_JA03v9UE9oyOR5sasc3S-g_oBpJIAT7';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- State ---
    let allMovies = [];
    let filteredMovies = [];
    let currentGenre = 'all';
    let searchQuery = '';
    let currentView = 'home';
    let slideshowInterval = null;
    let currentSlide = 0;
    let currentUser = null;
    let currentMovieId = null;

    // --- DOM Shortcuts ---
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // Home page elements
    const homePage = $('#homePage');
    const movieGrid = $('#movieGrid');
    const emptyState = $('#emptyState');
    const noResults = $('#noResults');
    const searchInput = $('#searchInput');
    const searchClear = $('#searchClear');
    const searchToggle = $('#searchToggle');
    const searchContainer = $('#searchContainer');
    const genreFilters = $('#genreFilters');
    const movieCountEl = $('.count-number');
    const totalMoviesEl = $('#totalMovies');
    const navbar = $('#navbar');
    const toast = $('#toast');
    const logoLink = $('#logoLink');
    const footer = $('#footer');

    // Detail page elements
    const detailPage = $('#detailPage');
    const detailBackdrop = $('#detailBackdrop');
    const detailPosterImg = $('#detailPosterImg');
    const detailPosterPlaceholder = $('#detailPosterPlaceholder');
    const detailTitle = $('#detailTitle');
    const detailBadges = $('#detailBadges');
    const detailRating = $('#detailRating');
    const detailYear = $('#detailYear');
    const detailDuration = $('#detailDuration');
    const detailFormat = $('#detailFormat');
    const detailSynopsis = $('#detailSynopsis');
    const detailDirector = $('#detailDirector');
    const detailStudio = $('#detailStudio');
    const detailFormatInfo = $('#detailFormatInfo');
    const detailSize = $('#detailSize');
    const detailPlayBtn = $('#detailPlayBtn');
    const detailDownloadBtn = $('#detailDownloadBtn');
    const detailPlayerSection = $('#detailPlayerSection');
    const detailPlayerClose = $('#detailPlayerClose');
    const backBtn = $('#backBtn');

    // Auth elements
    const loginBtn = $('#loginBtn');
    const userMenu = $('#userMenu');
    const userAvatarBtn = $('#userAvatarBtn');
    const userAvatar = $('#userAvatar');
    const userName = $('#userName');
    const userDropdown = $('#userDropdown');
    const dropdownEmail = $('#dropdownEmail');
    const logoutBtn = $('#logoutBtn');
    const authOverlay = $('#authOverlay');
    const authClose = $('#authClose');
    const tabLogin = $('#tabLogin');
    const tabRegister = $('#tabRegister');
    const loginForm = $('#loginForm');
    const registerForm = $('#registerForm');
    const loginError = $('#loginError');
    const registerError = $('#registerError');

    // Comment elements
    const commentSection = $('#commentSection');
    const commentForm = $('#commentForm');
    const commentLoginPrompt = $('#commentLoginPrompt');
    const commentInput = $('#commentInput');
    const commentCharCount = $('#commentCharCount');
    const commentSubmitBtn = $('#commentSubmitBtn');
    const commentList = $('#commentList');
    const commentLoading = $('#commentLoading');
    const commentEmpty = $('#commentEmpty');
    const commentAvatar = $('#commentAvatar');
    const commentFormName = $('#commentFormName');
    const commentLoginLink = $('#commentLoginLink');

    // --- Anime Emoji Collection ---
    const movieEmojis = [
        '⚔️', '🐉', '🌸', '🔮', '🎌', '🗡️', '🌙', '✨',
        '🎭', '🏯', '🦊', '🌊', '💎', '🔥', '🌟', '👻',
        '🤖', '🚀', '💫', '🎪', '🦸', '🧙', '🎯', '🌺'
    ];

    const hueValues = [260, 330, 200, 280, 350, 170, 300, 220, 310, 190];

    // ============================================================
    // INITIALIZE
    // ============================================================
    async function init() {
        showSkeletons();
        await checkAuth();
        await fetchMovies();
        setupEventListeners();
        setupScrollEffects();
        initHeroSlideshow();
        handleRoute();
    }

    // ============================================================
    // AUTH SYSTEM
    // ============================================================
    async function checkAuth() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUser(session.user);
            }
        } catch (e) {
            console.warn('Auth check failed:', e);
        }

        // Listen for auth state changes
        supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
                setUser(session.user);
            } else {
                clearUser();
            }
        });
    }

    function setUser(user) {
        currentUser = user;
        const displayName = user.user_metadata?.display_name || user.email.split('@')[0];
        const initial = displayName.charAt(0).toUpperCase();

        // Update navbar
        loginBtn.style.display = 'none';
        userMenu.style.display = '';
        userAvatar.textContent = initial;
        userName.textContent = displayName;
        dropdownEmail.textContent = user.email;

        // Update comment form
        commentForm.style.display = '';
        commentLoginPrompt.style.display = 'none';
        commentAvatar.textContent = initial;
        commentFormName.textContent = displayName;
    }

    function clearUser() {
        currentUser = null;
        loginBtn.style.display = '';
        userMenu.style.display = 'none';
        commentForm.style.display = 'none';
        commentLoginPrompt.style.display = '';
    }

    function openAuthModal(tab = 'login') {
        authOverlay.classList.add('active');
        switchAuthTab(tab);
        document.body.style.overflow = 'hidden';
    }

    function closeAuthModal() {
        authOverlay.classList.remove('active');
        document.body.style.overflow = '';
        loginError.textContent = '';
        registerError.textContent = '';
    }

    function switchAuthTab(tab) {
        if (tab === 'login') {
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            loginForm.style.display = '';
            registerForm.style.display = 'none';
            $('#authTitle').textContent = 'Login';
            $('#authSubtitle').textContent = 'Masuk ke akunmu untuk download dan komentar';
        } else {
            tabRegister.classList.add('active');
            tabLogin.classList.remove('active');
            registerForm.style.display = '';
            loginForm.style.display = 'none';
            $('#authTitle').textContent = 'Register';
            $('#authSubtitle').textContent = 'Buat akun baru untuk akses penuh';
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        const email = $('#loginEmail').value.trim();
        const password = $('#loginPassword').value;
        const btn = $('#loginSubmit');

        btn.disabled = true;
        btn.textContent = 'Loading...';
        loginError.textContent = '';

        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            closeAuthModal();
            showToast('✅', 'Berhasil login!');
            loginForm.reset();
        } catch (err) {
            loginError.textContent = translateError(err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Login';
        }
    }

    async function handleRegister(e) {
        e.preventDefault();
        const name = $('#registerName').value.trim();
        const email = $('#registerEmail').value.trim();
        const password = $('#registerPassword').value;
        const btn = $('#registerSubmit');

        btn.disabled = true;
        btn.textContent = 'Loading...';
        registerError.textContent = '';

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { display_name: name }
                }
            });
            if (error) throw error;

            // Check if email confirmation is required
            if (data.user && !data.session) {
                closeAuthModal();
                showToast('📧', 'Cek email kamu untuk konfirmasi akun!');
            } else {
                closeAuthModal();
                showToast('✅', `Selamat datang, ${name}!`);
            }
            registerForm.reset();
        } catch (err) {
            registerError.textContent = translateError(err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Buat Akun';
        }
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        userDropdown.classList.remove('active');
        showToast('👋', 'Berhasil logout');
    }

    function translateError(msg) {
        const map = {
            'Invalid login credentials': 'Email atau password salah',
            'Email not confirmed': 'Email belum dikonfirmasi. Cek inbox kamu',
            'User already registered': 'Email sudah terdaftar. Silakan login',
            'Password should be at least 6 characters': 'Password minimal 6 karakter',
            'Unable to validate email address: invalid format': 'Format email tidak valid',
            'Signup requires a valid password': 'Password wajib diisi',
        };
        return map[msg] || msg;
    }

    // ============================================================
    // COMMENTS SYSTEM
    // ============================================================
    async function loadComments(movieId) {
        currentMovieId = movieId;
        commentLoading.style.display = '';
        commentEmpty.style.display = 'none';
        commentList.innerHTML = '';
        commentList.appendChild(commentLoading);

        try {
            const { data, error } = await supabase
                .from('comments')
                .select('*')
                .eq('movie_id', movieId)
                .order('created_at', { ascending: false });

            commentLoading.style.display = 'none';

            if (error) throw error;

            if (!data || data.length === 0) {
                commentEmpty.style.display = '';
                return;
            }

            commentEmpty.style.display = 'none';
            data.forEach(comment => {
                commentList.appendChild(createCommentEl(comment));
            });
        } catch (err) {
            commentLoading.style.display = 'none';
            commentEmpty.style.display = '';
            commentEmpty.querySelector('p').textContent = 'Gagal memuat komentar';
            console.error('Load comments error:', err);
        }
    }

    function createCommentEl(comment) {
        const div = document.createElement('div');
        div.className = 'comment-item';
        const initial = (comment.user_name || 'U').charAt(0).toUpperCase();
        const timeAgo = getTimeAgo(new Date(comment.created_at));

        div.innerHTML = `
            <div class="comment-item-avatar">${initial}</div>
            <div class="comment-item-body">
                <div class="comment-item-header">
                    <span class="comment-item-name">${escapeHtml(comment.user_name)}</span>
                    <span class="comment-item-time">${timeAgo}</span>
                </div>
                <p class="comment-item-text">${escapeHtml(comment.content)}</p>
            </div>
        `;
        return div;
    }

    async function postComment() {
        if (!currentUser || !currentMovieId) return;
        const content = commentInput.value.trim();
        if (!content || content.length > 500) return;

        commentSubmitBtn.disabled = true;
        commentSubmitBtn.textContent = 'Mengirim...';

        const displayName = currentUser.user_metadata?.display_name || currentUser.email.split('@')[0];

        try {
            const { data, error } = await supabase
                .from('comments')
                .insert([{
                    movie_id: currentMovieId,
                    user_id: currentUser.id,
                    user_name: displayName,
                    content: content
                }])
                .select();

            if (error) throw error;

            // Add comment to top of list
            commentEmpty.style.display = 'none';
            if (data && data[0]) {
                const el = createCommentEl(data[0]);
                commentList.prepend(el);
            }

            commentInput.value = '';
            commentCharCount.textContent = '0/500';
            showToast('💬', 'Komentar berhasil dikirim!');
        } catch (err) {
            showToast('❌', 'Gagal mengirim komentar');
            console.error('Post comment error:', err);
        } finally {
            commentSubmitBtn.disabled = false;
            commentSubmitBtn.textContent = 'Kirim Komentar';
        }
    }

    function getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return 'Baru saja';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} menit lalu`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} jam lalu`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days} hari lalu`;
        const months = Math.floor(days / 30);
        return `${months} bulan lalu`;
    }

    // ============================================================
    // ROUTING
    // ============================================================
    function handleRoute() {
        const hash = window.location.hash;

        if (hash.startsWith('#/movie/')) {
            const movieId = parseInt(hash.replace('#/movie/', ''));
            const movie = allMovies.find(m => m.id === movieId);
            if (movie) {
                showDetailPage(movie);
                return;
            }
        }

        showHomePage();
    }

    function navigateTo(path) {
        window.location.hash = path;
    }

    function showHomePage() {
        currentView = 'home';
        homePage.style.display = '';
        detailPage.style.display = 'none';
        footer.style.display = '';

        // Stop video if playing (iframe)
        $('#drivePlayer').src = '';
        detailPlayerSection.style.display = 'none';

        // Show search
        searchContainer.style.removeProperty('visibility');

        document.title = 'Animovid — Anime Movie Streaming';
    }

    function showDetailPage(movie) {
        currentView = 'detail';
        homePage.style.display = 'none';
        detailPage.style.display = '';
        footer.style.display = '';

        // Hide search on detail
        searchContainer.style.visibility = 'hidden';

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'instant' });

        renderDetailPage(movie);
        loadComments(movie.id);
        document.title = `${movie.title} — Animovid`;
    }

    // ============================================================
    // FETCH & RENDER
    // ============================================================
    async function fetchMovies() {
        try {
            const response = await fetch('/api/movies');
            const data = await response.json();
            if (data.success) {
                allMovies = data.movies;
                filteredMovies = [...allMovies];
                updateMovieCount();
                renderMovies();
            } else {
                showToast('❌', 'Gagal memuat daftar movie');
            }
        } catch (error) {
            console.error('Error fetching movies:', error);
            showToast('❌', 'Server tidak dapat dihubungi');
            renderMovies();
        }
    }

    function renderMovies() {
        movieGrid.innerHTML = '';

        if (allMovies.length === 0) {
            emptyState.style.display = 'block';
            noResults.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';

        if (filteredMovies.length === 0) {
            noResults.style.display = 'block';
            return;
        }

        noResults.style.display = 'none';

        filteredMovies.forEach((movie, index) => {
            const card = createMovieCard(movie, index);
            movieGrid.appendChild(card);
        });
    }

    function createMovieCard(movie, index) {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.style.animationDelay = `${index * 0.06}s`;
        card.style.setProperty('--card-hue', hueValues[index % hueValues.length]);

        const emoji = movieEmojis[index % movieEmojis.length];
        const hasPoster = movie.poster && movie.poster.length > 0;

        card.innerHTML = `
      <div class="card-poster">
        ${hasPoster
                ? `<img src="${escapeAttr(movie.poster)}" alt="${escapeAttr(movie.title)}" loading="lazy">`
                : `<div class="card-poster-placeholder">${emoji}</div>`
            }
        <div class="card-play-overlay">
          <div class="play-btn-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </div>
        </div>
        <span class="card-rating-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#facc15" stroke="none">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          ${escapeHtml(String(movie.rating))}
        </span>
        <span class="card-format-badge">${movie.format}</span>
      </div>
      <div class="card-body">
        <h3 class="card-title">${escapeHtml(movie.title)}</h3>
        <span class="card-genre">${escapeHtml(movie.genre)}</span>
        <div class="card-year">${movie.year}</div>
      </div>
    `;

        card.addEventListener('click', () => {
            navigateTo(`/movie/${movie.id}`);
        });

        return card;
    }

    // --- Render Detail Page ---
    function renderDetailPage(movie) {
        const hasPoster = movie.poster && movie.poster.length > 0;

        if (hasPoster) {
            detailPosterImg.src = movie.poster;
            detailPosterImg.alt = movie.title;
            detailPosterImg.style.display = '';
            detailPosterPlaceholder.style.display = 'none';
            detailBackdrop.style.backgroundImage = `url(${movie.poster})`;
        } else {
            detailPosterImg.style.display = 'none';
            detailPosterPlaceholder.style.display = '';
            detailPosterPlaceholder.textContent = movieEmojis[(movie.id - 1) % movieEmojis.length];
            detailBackdrop.style.backgroundImage = '';
        }

        detailTitle.textContent = movie.title;

        const genres = movie.genres || [movie.genre];
        detailBadges.innerHTML = genres.map(g =>
            `<span class="detail-genre-badge">${escapeHtml(g)}</span>`
        ).join('');

        detailRating.querySelector('.rating-value').textContent = movie.rating;
        detailYear.textContent = movie.year;
        detailDuration.textContent = movie.duration;
        detailFormat.textContent = movie.format;
        detailSynopsis.textContent = movie.synopsis;
        detailDirector.textContent = movie.director;
        detailStudio.textContent = movie.studio;
        detailFormatInfo.textContent = movie.format;
        detailSize.textContent = '☁️ Google Drive';

        // Google Drive URLs
        const drivePreviewUrl = `https://drive.google.com/file/d/${movie.driveId}/preview`;
        const driveDownloadUrl = `https://drive.google.com/uc?export=download&id=${movie.driveId}`;

        // Play button
        detailPlayBtn.onclick = () => {
            detailPlayerSection.style.display = '';
            const iframe = $('#drivePlayer');
            iframe.src = drivePreviewUrl;
            setTimeout(() => {
                detailPlayerSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        };

        // Download button — requires login
        detailDownloadBtn.onclick = (e) => {
            if (!currentUser) {
                e.preventDefault();
                showToast('🔒', 'Login dulu untuk download!');
                openAuthModal('login');
                return false;
            }
            // If logged in, allow download
            window.open(driveDownloadUrl, '_blank');
        };
        detailDownloadBtn.href = '#';
        detailDownloadBtn.removeAttribute('download');

        // Reset player
        detailPlayerSection.style.display = 'none';
        $('#drivePlayer').src = '';
    }

    // --- Show Loading Skeletons ---
    function showSkeletons() {
        movieGrid.innerHTML = '';
        for (let i = 0; i < 8; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton-card';
            skeleton.innerHTML = `
        <div class="skeleton-poster"></div>
        <div class="skeleton-body">
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
        </div>
      `;
            movieGrid.appendChild(skeleton);
        }
    }

    // --- Hero Background Slideshow ---
    async function initHeroSlideshow() {
        const slideshow = $('#heroSlideshow');
        let imageUrls = [];
        try {
            const response = await fetch('/api/images');
            const data = await response.json();
            if (data.success && data.images.length > 0) {
                imageUrls = data.images;
            }
        } catch (e) {
            console.warn('Could not load slideshow images:', e);
        }

        if (imageUrls.length === 0) return;

        const slides = [];
        imageUrls.forEach((url, i) => {
            const slide = document.createElement('div');
            slide.className = 'hero-slide';
            slide.style.backgroundImage = `url(${url})`;
            slide.style.animationDelay = `${-i * 4}s`;
            if (i === 0) slide.classList.add('active');
            slideshow.appendChild(slide);
            slides.push(slide);
        });

        if (slides.length > 1) {
            currentSlide = 0;
            slideshowInterval = setInterval(() => {
                slides[currentSlide].classList.remove('active');
                currentSlide = (currentSlide + 1) % slides.length;
                slides[currentSlide].classList.add('active');
            }, 6000);
        }
    }

    // --- Filter Movies ---
    function filterMovies() {
        filteredMovies = allMovies.filter(movie => {
            const matchGenre = currentGenre === 'all' ||
                movie.genre.toLowerCase().includes(currentGenre) ||
                (movie.genres && movie.genres.some(g => g.toLowerCase().includes(currentGenre)));
            const matchSearch = !searchQuery ||
                movie.title.toLowerCase().includes(searchQuery) ||
                movie.synopsis.toLowerCase().includes(searchQuery) ||
                movie.genre.toLowerCase().includes(searchQuery);
            return matchGenre && matchSearch;
        });
        renderMovies();
    }

    // ============================================================
    // EVENT LISTENERS
    // ============================================================
    function setupEventListeners() {
        // Hash routing
        window.addEventListener('hashchange', handleRoute);

        // Search
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim().toLowerCase();
            searchClear.classList.toggle('visible', searchQuery.length > 0);
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => filterMovies(), 200);
        });

        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            searchQuery = '';
            searchClear.classList.remove('visible');
            filterMovies();
            searchInput.focus();
        });

        searchToggle.addEventListener('click', () => {
            searchContainer.classList.toggle('mobile-active');
            if (searchContainer.classList.contains('mobile-active')) {
                setTimeout(() => searchInput.focus(), 100);
            }
        });

        // Genre filters
        genreFilters.addEventListener('click', (e) => {
            const btn = e.target.closest('.genre-btn');
            if (!btn) return;
            $$('.genre-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentGenre = btn.dataset.genre;
            filterMovies();
        });

        // Logo → home
        logoLink.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('/');
        });

        // Back button
        backBtn.addEventListener('click', () => {
            navigateTo('/');
        });

        // Detail player close
        detailPlayerClose.addEventListener('click', () => {
            $('#drivePlayer').src = '';
            detailPlayerSection.style.display = 'none';
        });

        // Close mobile search on outside click
        document.addEventListener('click', (e) => {
            if (searchContainer.classList.contains('mobile-active') &&
                !searchContainer.contains(e.target) &&
                !searchToggle.contains(e.target)) {
                searchContainer.classList.remove('mobile-active');
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (authOverlay.classList.contains('active')) {
                    closeAuthModal();
                } else if (detailPlayerSection.style.display !== 'none') {
                    $('#drivePlayer').src = '';
                    detailPlayerSection.style.display = 'none';
                }
            }
        });

        // --- Auth Event Listeners ---
        loginBtn.addEventListener('click', () => openAuthModal('login'));
        authClose.addEventListener('click', closeAuthModal);
        authOverlay.addEventListener('click', (e) => {
            if (e.target === authOverlay) closeAuthModal();
        });

        tabLogin.addEventListener('click', () => switchAuthTab('login'));
        tabRegister.addEventListener('click', () => switchAuthTab('register'));

        loginForm.addEventListener('submit', handleLogin);
        registerForm.addEventListener('submit', handleRegister);
        logoutBtn.addEventListener('click', handleLogout);

        // User dropdown toggle
        userAvatarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!userMenu.contains(e.target)) {
                userDropdown.classList.remove('active');
            }
        });

        // --- Comment Event Listeners ---
        commentInput.addEventListener('input', () => {
            const len = commentInput.value.length;
            commentCharCount.textContent = `${len}/500`;
            commentSubmitBtn.disabled = len === 0 || len > 500;
        });

        commentSubmitBtn.addEventListener('click', postComment);

        commentLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            openAuthModal('login');
        });
    }

    // --- Scroll Effects ---
    function setupScrollEffects() {
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    navbar.classList.toggle('scrolled', window.scrollY > 50);
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    // --- Update Movie Count ---
    function updateMovieCount() {
        const count = allMovies.length;
        movieCountEl.textContent = count;
        totalMoviesEl.textContent = count;
    }

    // --- Toast ---
    function showToast(icon, message) {
        toast.querySelector('.toast-icon').textContent = icon;
        toast.querySelector('.toast-message').textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // --- Utilities ---
    function escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    function escapeAttr(text) {
        return text.replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    // --- Start ---
    document.addEventListener('DOMContentLoaded', init);
})();
