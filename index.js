// Referencias a elementos del DOM
const newsContainer = document.getElementById('news-container');
const newsLoading = document.getElementById('news-loading');
const goHome = document.getElementById('go-home');
const backButton = document.getElementById('back-button');
const backToList = document.getElementById('back-to-list');
const newsSection = document.getElementById('news-section');
const newsDetailSection = document.getElementById('news-detail-section');
const newsDetailLoading = document.getElementById('news-detail-loading');
const newsDetailContainer = document.getElementById('news-detail-container');
const newsDetailTitle = document.getElementById('news-detail-title');
const newsDetailCategory = document.getElementById('news-detail-category');
const newsDetailAuthor = document.getElementById('news-detail-author');
const newsDetailDate = document.getElementById('news-detail-date');
const newsDetailImage = document.getElementById('news-detail-image');
const newsDetailSummary = document.getElementById('news-detail-summary');
const newsDetailContent = document.getElementById('news-detail-content');
const shareNewsBtn = document.getElementById('share-news');
const categoryFilterSelect = document.getElementById('category-filter-select');
const filterStats = document.getElementById('filter-stats');

let currentNewsId = null;
let currentCategory = '';
let debounceTimer;

// Cargar noticias al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    loadNews();
    
    const urlParams = new URLSearchParams(window.location.search);
    const newsParam = urlParams.get('news');
    const categoryParam = urlParams.get('category');
    
    if (newsParam) {
        showNewsDetail(newsParam);
    }
    
    if (categoryParam) {
        categoryFilterSelect.value = categoryParam;
        currentCategory = categoryParam;
        loadNews(currentCategory);
    }

    if (categoryFilterSelect) {
        categoryFilterSelect.addEventListener('change', function() {
            // Clear previous timer
            clearTimeout(debounceTimer);
            
            // Set new timer
            debounceTimer = setTimeout(() => {
                currentCategory = this.value;
                loadNews(currentCategory);
                
                const urlParams = new URLSearchParams(window.location.search);
                if (currentCategory) {
                    urlParams.set('category', currentCategory);
                } else {
                    urlParams.delete('category');
                }
                const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
                window.history.pushState({ category: currentCategory }, '', newUrl);
            }, 300); // 300ms delay
        });
    }
});

// Cargar noticias desde Firestore - VERSIÓN DEFINITIVA
function loadNews(category = '') {
    console.log('Cargando noticias con categoría:', category);
    
    // Limpiar completamente
    newsContainer.innerHTML = '';
    newsLoading.classList.remove('hidden');
    
    // Set para evitar duplicados
    const loadedNewsIds = new Set();
    
    let query = db.collection('news').orderBy('timestamp', 'desc');
    
    query.get()
        .then(querySnapshot => {
            newsLoading.classList.add('hidden');
            
            if (querySnapshot.empty) {
                newsContainer.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:30px; color:#666;">No hay noticias publicadas aún.</p>';
                updateFilterStats(0, 0, category);
                return;
            }
            
            let totalNews = 0;
            let filteredNews = 0;
            const newsToDisplay = [];
            
            querySnapshot.forEach(doc => {
                totalNews++;
                const news = doc.data();
                news.id = doc.id;
                
                // Verificar ID único
                if (!news.id || loadedNewsIds.has(news.id)) {
                    console.warn('Noticia sin ID o duplicada:', news.id);
                    return;
                }
                
                loadedNewsIds.add(news.id);
                
                // FILTRO POR CATEGORÍA - COMPARACIÓN ESTRICTA
                if (category && category !== '') {
                    if (!news.category || news.category.trim() !== category.trim()) {
                        return;
                    }
                }
                
                filteredNews++;
                newsToDisplay.push(news);
            });
            
            // Ordenar por fecha
            newsToDisplay.sort((a, b) => {
                const dateA = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp)) : new Date(0);
                const dateB = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp)) : new Date(0);
                return dateB - dateA;
            });
            
            // Mostrar noticias
            newsToDisplay.forEach(news => {
                const newsCard = createNewsCard(news);
                newsContainer.appendChild(newsCard);
            });
            
            updateFilterStats(totalNews, filteredNews, category);
            
            if (filteredNews === 0 && category) {
                newsContainer.innerHTML = `
                    <div style="grid-column:1/-1; text-align:center; padding:30px; color:#666;">
                        <p>No hay noticias en la categoría "${category}"</p>
                        <button id="clear-category-filter" class="back-button" style="margin-top: 15px;">
                            <i class="fas fa-times"></i> Mostrar todas las categorías
                        </button>
                    </div>
                `;
                
                document.getElementById('clear-category-filter').addEventListener('click', () => {
                    categoryFilterSelect.value = '';
                    currentCategory = '';
                    loadNews();
                });
            }
            
            console.log('Noticias mostradas:', filteredNews, 'de', totalNews);
        })
        .catch(error => {
            newsLoading.classList.add('hidden');
            console.error('Error detallado al cargar noticias:', error);
            newsContainer.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:30px; color:#c0392b;">
                    <h3>Error al cargar las noticias</h3>
                    <p>${error.message}</p>
                </div>
            `;
        });
}

// Crear tarjeta de noticia
function createNewsCard(news) {
    const card = document.createElement('div');
    card.className = 'news-card';
    card.dataset.id = news.id;
    card.dataset.category = news.category || 'General';
    
    const formattedDate = formatShortDate(news.timestamp);
    const imageUrl = news.imageUrl || DEFAULT_IMAGE;
    
    card.innerHTML = `
        <div class="news-image" style="background-image: url('${imageUrl}')">
            <div class="news-card-category">${news.category || 'General'}</div>
        </div>
        <div class="news-content">
            <span class="news-category">${news.category || 'General'}</span>
            <h3 class="news-title">${news.title}</h3>
            <div class="news-date">
                <i class="far fa-calendar-alt"></i>
                ${formattedDate}
            </div>
            <p class="news-summary">${news.summary}</p>
            <div class="read-more">Leer más <i class="fas fa-arrow-right"></i></div>
        </div>
    `;
    
    card.addEventListener('click', () => {
        showNewsDetail(news.id);
    });
    
    return card;
}

// Actualizar estadísticas del filtro
function updateFilterStats(total, filtered, category) {
    if (!filterStats) return;
    
    if (category && category !== '') {
        filterStats.innerHTML = `
            <span class="filter-info">
                <i class="fas fa-filter"></i> 
                Mostrando ${filtered} de ${total} noticias en <strong>${category}</strong>
                <button id="clear-filter-btn" class="clear-filter-btn">
                    <i class="fas fa-times"></i> Limpiar filtro
                </button>
            </span>
        `;
        
        const clearBtn = document.getElementById('clear-filter-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                categoryFilterSelect.value = '';
                currentCategory = '';
                loadNews();
                filterStats.innerHTML = '';
            });
        }
    } else {
        filterStats.innerHTML = `
            <span class="filter-info">
                <i class="fas fa-newspaper"></i> 
                Mostrando todas las noticias (${total})
            </span>
        `;
    }
}

// Mostrar vista detallada de una noticia
function showNewsDetail(newsId) {
    currentNewsId = newsId;
    
    newsSection.classList.add('hidden');
    newsDetailSection.classList.remove('hidden');
    backToList.classList.remove('hidden');
    
    newsDetailContainer.classList.add('hidden');
    newsDetailLoading.classList.remove('hidden');
    
    const newUrl = window.location.origin + window.location.pathname + '?news=' + newsId;
    window.history.pushState({ newsId }, '', newUrl);
    
    db.collection('news').doc(newsId).get()
        .then(doc => {
            if (doc.exists) {
                const news = doc.data();
                displayNewsDetail(news);
            } else {
                showMessage('Noticia no encontrada', 'error');
                setTimeout(() => showNewsList(), 2000);
            }
        })
        .catch(error => {
            console.error('Error al cargar noticia:', error);
            showMessage('Error al cargar la noticia', 'error');
            setTimeout(() => showNewsList(), 2000);
        });
}

function displayNewsDetail(news) {
    newsDetailLoading.classList.add('hidden');
    newsDetailContainer.classList.remove('hidden');

    const formattedDate = formatDate(news.timestamp);
    const imageUrl = news.imageUrl || DEFAULT_IMAGE;
    const tags = news.tags ? news.tags.split(',').map(tag => tag.trim()) : [];

    newsDetailTitle.textContent = news.title;
    newsDetailCategory.textContent = news.category || 'General';
    newsDetailAuthor.textContent = `Por: ${news.author || 'Administrador'}`;
    newsDetailDate.textContent = formattedDate;
    newsDetailImage.style.backgroundImage = `url('${imageUrl}')`;
    newsDetailSummary.textContent = news.summary;

    let contentHTML = news.content || '';

    if (news.videoUrl) {
        const videoEmbed = getVideoEmbedCode(news.videoUrl);
        contentHTML = videoEmbed + contentHTML;
    }

    newsDetailContent.innerHTML = contentHTML;

    if (tags.length > 0) {
        const tagsHTML = tags.map(tag =>
            `<span style="display: inline-block; background: #eef2ff; color: #4a6fc1; padding: 5px 10px; border-radius: 15px; font-size: 0.9rem; margin-right: 8px; margin-bottom: 8px;">#${tag}</span>`
        ).join('');

        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'news-tags';
        tagsContainer.style.marginTop = '30px';
        tagsContainer.style.paddingTop = '20px';
        tagsContainer.style.borderTop = '1px solid #eee';
        tagsContainer.innerHTML = `<strong>Etiquetas:</strong><br>${tagsHTML}`;

        newsDetailContent.appendChild(tagsContainer);
    }

    document.title = `${news.title} - Portal de Noticias`;
}

// Obtener código de inserción para videos
function getVideoEmbedCode(videoUrl) {
    if (!videoUrl) return '';

    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        let videoId = '';

        if (videoUrl.includes('youtube.com/watch?v=')) {
            videoId = videoUrl.split('v=')[1];
            const ampersandPosition = videoId.indexOf('&');
            if (ampersandPosition !== -1) {
                videoId = videoId.substring(0, ampersandPosition);
            }
        } else if (videoUrl.includes('youtu.be/')) {
            videoId = videoUrl.split('youtu.be/')[1];
        }

        if (videoId) {
            return `
                <div class="video-container">
                    <iframe 
                        width="100%" 
                        height="400" 
                        src="https://www.youtube.com/embed/${videoId}" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                </div>
            `;
        }
    }

    if (videoUrl.includes('vimeo.com')) {
        const videoId = videoUrl.split('vimeo.com/')[1];
        if (videoId) {
            return `
                <div class="video-container">
                    <iframe 
                        width="100%" 
                        height="400" 
                        src="https://player.vimeo.com/video/${videoId}" 
                        frameborder="0" 
                        allow="autoplay; fullscreen; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                </div>
            `;
        }
    }

    return `<p><a href="${videoUrl}" target="_blank">Ver video</a></p>`;
}

// Volver a la lista de noticias
function showNewsList() {
    newsSection.classList.remove('hidden');
    newsDetailSection.classList.add('hidden');
    backToList.classList.add('hidden');
    
    loadNews(currentCategory);
    
    const urlParams = new URLSearchParams();
    if (currentCategory) {
        urlParams.set('category', currentCategory);
    }
    const newUrl = window.location.origin + window.location.pathname + 
                  (urlParams.toString() ? '?' + urlParams.toString() : '');
    window.history.pushState({ category: currentCategory }, '', newUrl);
    
    document.title = 'Portal de Noticias' + 
                    (currentCategory ? ` - ${currentCategory}` : '');
}

// Compartir noticia
function shareNews() {
    if (!currentNewsId) return;
    
    const shareUrl = `${window.location.origin}${window.location.pathname}?news=${currentNewsId}`;
    const shareTitle = newsDetailTitle.textContent;
    const shareText = newsDetailSummary.textContent;
    
    if (navigator.share) {
        navigator.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl
        })
        .catch(error => console.log('Error al compartir:', error));
    } else {
        navigator.clipboard.writeText(shareUrl)
            .then(() => {
                showMessage('Enlace copiado al portapapeles', 'success');
            })
            .catch(err => {
                console.error('Error al copiar al portapapeles: ', err);
                showMessage('Error al copiar el enlace', 'error');
            });
    }
}

// Mostrar mensaje temporal
function showMessage(message, type) {
    const messageEl = document.createElement('div');
    messageEl.className = `status-message ${type}`;
    messageEl.textContent = message;
    messageEl.style.position = 'fixed';
    messageEl.style.top = '80px';
    messageEl.style.right = '20px';
    messageEl.style.zIndex = '1000';
    messageEl.style.maxWidth = '300px';
    
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
        messageEl.remove();
    }, 3000);
}

// Manejar navegación del historial
window.addEventListener('popstate', function(event) {
    const urlParams = new URLSearchParams(window.location.search);
    const newsParam = urlParams.get('news');
    const categoryParam = urlParams.get('category');
    
    if (newsParam) {
        showNewsDetail(newsParam);
    } else {
        if (categoryParam) {
            currentCategory = categoryParam;
            categoryFilterSelect.value = categoryParam;
            loadNews(currentCategory);
        } else {
            currentCategory = '';
            categoryFilterSelect.value = '';
            loadNews();
        }
        showNewsList();
    }
});

// Event Listeners
if (backButton) backButton.addEventListener('click', showNewsList);
if (backToList) backToList.addEventListener('click', showNewsList);
if (goHome) goHome.addEventListener('click', showNewsList);
if (shareNewsBtn) shareNewsBtn.addEventListener('click', shareNews);