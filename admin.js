// Referencias a elementos del DOM
const loginSection = document.getElementById('login-section');
const adminPanel = document.getElementById('admin-panel');
const userInfo = document.getElementById('user-info');
const userAvatar = document.getElementById('user-avatar');
const userEmail = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');
const submitLoginBtn = document.getElementById('submit-login');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginStatus = document.getElementById('login-status');
const newsForm = document.getElementById('news-form');
const publishStatus = document.getElementById('publish-status');
const adminNewsContainer = document.getElementById('admin-news-container');
const adminNewsLoading = document.getElementById('admin-news-loading');
const newsCount = document.getElementById('news-count');
const publishNewsBtn = document.getElementById('publish-news');
const previewNewsBtn = document.getElementById('preview-news');
const saveDraftBtn = document.getElementById('save-draft');
const resetFormBtn = document.getElementById('reset-form');
const refreshNewsBtn = document.getElementById('refresh-news');
const searchNewsInput = document.getElementById('search-news');
const previewModal = document.getElementById('preview-modal');
const closePreviewBtn = document.getElementById('close-preview');
const previewModalBody = document.getElementById('preview-modal-body');
const editFromPreviewBtn = document.getElementById('edit-from-preview');
const publishFromPreviewBtn = document.getElementById('publish-from-preview');
const summaryChars = document.getElementById('summary-chars');
const adminCategoryFilter = document.getElementById('admin-category-filter');
const forceReloadBtn = document.getElementById('force-reload');

// Variables globales
let isAdmin = false;
let ckeditor = null; // Instancia de CKEditor 5
let currentDraft = null;

// Inicializar CKEditor 5
function initCKEditor() {
    const editorElement = document.getElementById('news-content');
    if (!editorElement || typeof ClassicEditor === 'undefined') {
        console.warn('CKEditor no está disponible');
        editorElement.style.display = 'block';
        editorElement.style.minHeight = '400px';
        return;
    }
    
    ClassicEditor
        .create(editorElement, {
            toolbar: {
                items: [
                    'heading', '|',
                    'bold', 'italic', 'underline', '|',
                    'link', 'bulletedList', 'numberedList', '|',
                    'blockQuote', 'insertTable', '|',
                    'undo', 'redo'
                ]
            },
            language: 'es'
        })
        .then(editor => {
            console.log('CKEditor 5 cargado exitosamente');
            ckeditor = editor;
        })
        .catch(error => {
            console.error('Error al cargar CKEditor:', error);
            editorElement.style.display = 'block';
            editorElement.style.minHeight = '400px';
        });
}

// Contador de caracteres para resumen
function initSummaryCounter() {
    const summaryInput = document.getElementById('news-summary');
    if (summaryInput && summaryChars) {
        summaryInput.addEventListener('input', function() {
            const length = this.value.length;
            summaryChars.textContent = length;
            
            summaryChars.classList.remove('warning', 'error');
            if (length > 150) {
                summaryChars.classList.add('warning');
            }
            if (length > 200) {
                summaryChars.classList.add('error');
            }
        });
        
        // Inicializar contador
        summaryChars.textContent = summaryInput.value.length;
    }
}

// Estado de la aplicación
document.addEventListener('DOMContentLoaded', function() {
    auth.onAuthStateChanged(user => {
        if (user) {
            showAdminUI(user);
            loadAdminNews();
            initCKEditor();
            initSummaryCounter();
        } else {
            showLoginUI();
        }
    });

    // Configurar email predeterminado para desarrollo
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        loginEmailInput.value = 'admin@ejemplo.com';
        loginPasswordInput.value = 'admin123';
    }
    
    // Cargar borrador guardado
    loadDraft();
});

// Función para verificar y limpiar duplicados en Firebase
function checkForDuplicates() {
    db.collection('news').get()
        .then(querySnapshot => {
            const newsByTitle = {};
            const duplicates = [];
            
            querySnapshot.forEach(doc => {
                const news = doc.data();
                const title = news.title;
                
                if (newsByTitle[title]) {
                    duplicates.push({
                        id: doc.id,
                        title: title,
                        existingId: newsByTitle[title]
                    });
                } else {
                    newsByTitle[title] = doc.id;
                }
            });
            
            if (duplicates.length > 0) {
                console.warn('Se encontraron duplicados:', duplicates);
                showMessage(`Se encontraron ${duplicates.length} noticias duplicadas.`, 'warning');
            } else {
                console.log('No se encontraron duplicados.');
            }
        })
        .catch(error => {
            console.error('Error al verificar duplicados:', error);
        });
}

function showAdminUI(user) {
    isAdmin = true;
    userInfo.classList.remove('hidden');
    loginSection.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    
    userEmail.textContent = user.email;
    userAvatar.textContent = user.email.charAt(0).toUpperCase();
    
    // Verificar duplicados (solo en desarrollo)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        setTimeout(checkForDuplicates, 1000);
    }
}

// Mostrar interfaz de login
function showLoginUI() {
    isAdmin = false;
    userInfo.classList.add('hidden');
    loginSection.classList.remove('hidden');
    adminPanel.classList.add('hidden');
}

// Cargar noticias para el administrador - VERSIÓN DEFINITIVA
function loadAdminNews(searchTerm = '', category = '') {
    console.log('Cargando noticias con filtros:', { searchTerm, category });
    
    // LIMPIAR COMPLETAMENTE antes de cargar
    adminNewsContainer.innerHTML = '';
    adminNewsLoading.classList.remove('hidden');
    
    // Array para rastrear IDs y evitar duplicados
    const loadedNewsIds = new Set();
    
    let query = db.collection('news').orderBy('timestamp', 'desc');
    
    query.get()
        .then(querySnapshot => {
            adminNewsLoading.classList.add('hidden');
            
            let totalCount = querySnapshot.size;
            let filteredCount = 0;
            
            if (querySnapshot.empty) {
                adminNewsContainer.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:30px; color:#666;">No hay noticias publicadas.</p>';
                newsCount.textContent = '(0)';
                return;
            }
            
            // Primero, procesar y filtrar
            const newsToDisplay = [];
            
            querySnapshot.forEach(doc => {
                const news = doc.data();
                news.id = doc.id;
                
                // Verificar que tenga ID válido
                if (!news.id) {
                    console.warn('Noticia sin ID válido:', news);
                    return;
                }
                
                // Evitar duplicados por ID
                if (loadedNewsIds.has(news.id)) {
                    console.warn('Noticia duplicada ignorada:', news.id);
                    return;
                }
                
                loadedNewsIds.add(news.id);
                
                // FILTRO POR CATEGORÍA - COMPARACIÓN ESTRICTA
                if (category && category !== '') {
                    if (!news.category || news.category.trim() !== category.trim()) {
                        return;
                    }
                }
                
                // FILTRO POR BÚSQUEDA
                if (searchTerm) {
                    const searchLower = searchTerm.toLowerCase().trim();
                    const titleMatch = news.title ? news.title.toLowerCase().includes(searchLower) : false;
                    const summaryMatch = news.summary ? news.summary.toLowerCase().includes(searchLower) : false;
                    const tagsMatch = news.tags ? news.tags.toLowerCase().includes(searchLower) : false;
                    
                    if (!titleMatch && !summaryMatch && !tagsMatch) {
                        return;
                    }
                }
                
                filteredCount++;
                newsToDisplay.push(news);
            });
            
            // Ahora mostrar las noticias
            if (newsToDisplay.length === 0) {
                let message = 'No se encontraron noticias';
                if (category) message += ` en la categoría "${category}"`;
                if (searchTerm) message += ` con el término "${searchTerm}"`;
                
                adminNewsContainer.innerHTML = `
                    <div style="grid-column:1/-1; text-align:center; padding:30px; color:#666;">
                        <p>${message}</p>
                        <button id="clear-all-filters" class="back-button" style="margin-top: 15px;">
                            <i class="fas fa-times"></i> Limpiar todos los filtros
                        </button>
                    </div>
                `;
                
                document.getElementById('clear-all-filters').addEventListener('click', () => {
                    searchNewsInput.value = '';
                    if (adminCategoryFilter) adminCategoryFilter.value = '';
                    loadAdminNews();
                });
            } else {
                // Ordenar por fecha más reciente
                newsToDisplay.sort((a, b) => {
                    const dateA = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp)) : new Date(0);
                    const dateB = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp)) : new Date(0);
                    return dateB - dateA;
                });
                
                // Mostrar cada noticia
                newsToDisplay.forEach(news => {
                    const newsCard = createAdminNewsCard(news);
                    adminNewsContainer.appendChild(newsCard);
                });
            }
            
            // Actualizar contador
            let countText = `(${filteredCount}`;
            if (filteredCount !== totalCount) {
                countText += ` de ${totalCount}`;
            }
            countText += ')';
            newsCount.textContent = countText;
            
            console.log('Noticias cargadas:', filteredCount, 'de', totalCount);
        })
        .catch(error => {
            adminNewsLoading.classList.add('hidden');
            console.error('Error al cargar noticias:', error);
            showMessage('Error al cargar las noticias', 'error');
        });
}           

// Crear tarjeta de noticia para el administrador
function createAdminNewsCard(news) {
    const card = document.createElement('div');
    card.className = 'news-card';
    card.dataset.id = news.id;
    
    const formattedDate = formatShortDate(news.timestamp);
    const imageUrl = news.imageUrl || DEFAULT_IMAGE;
    
    // HTML COMPLETO con botones de administración
    card.innerHTML = `
        <div class="news-image ${news.videoUrl ? 'has-video' : ''}" 
            style="background-image: url('${imageUrl}')">
        </div>
        <div class="news-content">
            <div class="news-card-header">
                <span class="news-category">${news.category || 'General'}</span>
                <div class="news-card-actions">
                    <button class="edit-news" data-id="${news.id}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="delete-news" data-id="${news.id}">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
            <h3 class="news-title">${news.title}</h3>
            <div class="news-date">
                <i class="far fa-calendar-alt"></i>
                ${formattedDate}
                ${news.videoUrl ? ' <i class="fas fa-video" style="margin-left:10px;color:#ff0000;"></i>' : ''}
            </div>
            <p class="news-summary">${news.summary}</p>
            <div class="read-more">Leer más <i class="fas fa-arrow-right"></i></div>
        </div>
    `;
    
    // Agregar event listeners
    const deleteBtn = card.querySelector('.delete-news');
    deleteBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const newsId = this.getAttribute('data-id');
        deleteNews(newsId);
    });
    
    const editBtn = card.querySelector('.edit-news');
    editBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const newsId = this.getAttribute('data-id');
        editNews(newsId);
    });
    
    return card;
}

// Eliminar una noticia
function deleteNews(newsId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta noticia? Esta acción no se puede deshacer.')) {
        return;
    }
    
    db.collection('news').doc(newsId).delete()
        .then(() => {
            showMessage('Noticia eliminada exitosamente', 'success');
            loadAdminNews();
        })
        .catch(error => {
            console.error('Error al eliminar noticia:', error);
            showMessage('Error al eliminar la noticia', 'error');
        });
}

// Editar una noticia
function editNews(newsId) {
    db.collection('news').doc(newsId).get()
        .then(doc => {
            if (doc.exists) {
                const news = doc.data();
                
                // Rellenar formulario con datos existentes
                document.getElementById('news-title').value = news.title || '';
                document.getElementById('news-category').value = news.category || '';
                document.getElementById('news-image').value = news.imageUrl || '';
                document.getElementById('news-summary').value = news.summary || '';
                document.getElementById('news-tags').value = news.tags || '';
                document.getElementById('news-video').value = news.videoUrl || '';
                
                // Actualizar CKEditor
                if (ckeditor) {
                    ckeditor.setData(news.content || '');
                } else {
                    document.getElementById('news-content').value = news.content || '';
                }
                
                // Actualizar contador de caracteres
                if (summaryChars) {
                    summaryChars.textContent = news.summary ? news.summary.length : 0;
                }
                
                // Guardar ID para actualizar en lugar de crear nuevo
                newsForm.dataset.editingId = newsId;
                publishNewsBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar Noticia';
                
                // Desplazarse al formulario
                document.getElementById('news-title').scrollIntoView({ behavior: 'smooth' });
                
                showMessage('Modo edición activado. Los cambios se guardarán sobre la noticia existente.', 'success');
            }
        })
        .catch(error => {
            console.error('Error al cargar noticia para editar:', error);
            showMessage('Error al cargar la noticia para editar', 'error');
        });
}

// Guardar borrador en localStorage
function saveDraft() {
    const draft = {
        title: document.getElementById('news-title').value.trim(),
        category: document.getElementById('news-category').value,
        imageUrl: document.getElementById('news-image').value.trim(),
        summary: document.getElementById('news-summary').value.trim(),
        content: ckeditor ? ckeditor.getData() : document.getElementById('news-content').value.trim(),
        tags: document.getElementById('news-tags').value.trim(),
        videoUrl: document.getElementById('news-video').value.trim(),
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('newsDraft', JSON.stringify(draft));
    currentDraft = draft;
    
    showMessage('Borrador guardado localmente', 'success');
}

// Cargar borrador desde localStorage
function loadDraft() {
    const draftStr = localStorage.getItem('newsDraft');
    if (draftStr) {
        try {
            currentDraft = JSON.parse(draftStr);
            
            // Mostrar opción para restaurar
            const restoreBtn = document.createElement('button');
            restoreBtn.className = 'back-button';
            restoreBtn.innerHTML = '<i class="fas fa-history"></i> Restaurar Borrador';
            restoreBtn.style.marginTop = '10px';
            restoreBtn.addEventListener('click', restoreDraft);
            
            document.getElementById('news-form').appendChild(restoreBtn);
            
            showMessage('Tienes un borrador guardado. Puedes restaurarlo con el botón "Restaurar Borrador".', 'warning');
        } catch (e) {
            console.error('Error al cargar borrador:', e);
        }
    }
}

// Restaurar borrador
function restoreDraft() {
    if (!currentDraft || !confirm('¿Restaurar el borrador guardado? Esto sobrescribirá los datos actuales del formulario.')) {
        return;
    }
    
    document.getElementById('news-title').value = currentDraft.title || '';
    document.getElementById('news-category').value = currentDraft.category || '';
    document.getElementById('news-image').value = currentDraft.imageUrl || '';
    document.getElementById('news-summary').value = currentDraft.summary || '';
    document.getElementById('news-tags').value = currentDraft.tags || '';
    document.getElementById('news-video').value = currentDraft.videoUrl || '';
    
    if (ckeditor) {
        ckeditor.setData(currentDraft.content || '');
    } else {
        document.getElementById('news-content').value = currentDraft.content || '';
    }
    
    if (summaryChars) {
        summaryChars.textContent = currentDraft.summary ? currentDraft.summary.length : 0;
    }
    
    showMessage('Borrador restaurado', 'success');
}

// Publicar nueva noticia
function publishNews(event) {
    event.preventDefault();
    
    const title = document.getElementById('news-title').value.trim();
    const category = document.getElementById('news-category').value;
    const imageUrl = document.getElementById('news-image').value.trim();
    const summary = document.getElementById('news-summary').value.trim();
    const content = ckeditor ? ckeditor.getData() : document.getElementById('news-content').value.trim();
    const tags = document.getElementById('news-tags').value.trim();
    const videoUrl = document.getElementById('news-video').value.trim();
    const isEditing = newsForm.dataset.editingId;
    
    // Validación
    if (!title || !category || !summary || !content) {
        showMessage('Por favor, completa todos los campos obligatorios', 'error');
        return;
    }
    
    // Crear objeto de noticia
    const newsItem = {
        title,
        category,
        imageUrl: imageUrl || DEFAULT_IMAGE,
        summary,
        content,
        tags,
        videoUrl,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        author: auth.currentUser.email,
        authorId: auth.currentUser.uid,
        lastModified: new Date().toISOString()
    };
    
    // Mostrar estado de carga
    publishNewsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando...';
    publishNewsBtn.disabled = true;
    
    let promise;
    
    if (isEditing) {
        // Actualizar noticia existente
        promise = db.collection('news').doc(isEditing).update(newsItem);
    } else {
        // Crear nueva noticia
        promise = db.collection('news').add(newsItem);
    }
    
    promise
        .then((result) => {
            // Limpiar formulario
            newsForm.reset();
            if (ckeditor) {
                ckeditor.setData('');
            } else {
                document.getElementById('news-content').value = '';
            }
            
            // Limpiar modo edición
            delete newsForm.dataset.editingId;
            publishNewsBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publicar Noticia';
            
            // Limpiar borrador
            localStorage.removeItem('newsDraft');
            currentDraft = null;
            
            // Mostrar mensaje de éxito
            const message = isEditing ? 
                '¡Noticia actualizada exitosamente!' : 
                '¡Noticia publicada exitosamente!';
            showMessage(message, 'success');
            
            // Recargar lista de noticias
            loadAdminNews();
            
            // Cerrar modal de vista previa si está abierto
            previewModal.classList.add('hidden');
        })
        .catch(error => {
            console.error('Error al publicar noticia:', error);
            showMessage('Error: ' + error.message, 'error');
        })
        .finally(() => {
            // Restaurar botón
            publishNewsBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publicar Noticia';
            publishNewsBtn.disabled = false;
        });
}

// Vista previa completa de la noticia
function previewNews() {
    const title = document.getElementById('news-title').value.trim();
    const category = document.getElementById('news-category').value;
    const imageUrl = document.getElementById('news-image').value.trim();
    const summary = document.getElementById('news-summary').value.trim();
    const content = ckeditor ? ckeditor.getData() : document.getElementById('news-content').value.trim();
    const tags = document.getElementById('news-tags').value.trim();
    const videoUrl = document.getElementById('news-video').value.trim();
    
    // Validación básica
    if (!title || !category || !summary || !content) {
        showMessage('Completa todos los campos obligatorios para ver la vista previa', 'warning');
        return;
    }
    
    const imageToUse = imageUrl || DEFAULT_IMAGE;
    const tagsArray = tags ? tags.split(',').map(tag => tag.trim()) : [];
    
    // Crear vista previa en el modal
    previewModalBody.innerHTML = `
        <div class="news-detail-container">
            <div class="news-detail-header">
                <div class="news-detail-meta">
                    <span class="news-category news-detail-category">${category || 'General'}</span>
                    <span class="news-detail-author">Por: ${auth.currentUser ? auth.currentUser.email : 'Administrador'}</span>
                </div>
                <h1 class="news-detail-title">${title}</h1>
                <div class="news-date">
                    <i class="far fa-calendar-alt"></i>
                    <span>${new Date().toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}</span>
                </div>
            </div>
            
            <div class="news-detail-image" style="background-image: url('${imageToUse}')"></div>
            
            <div class="news-detail-body">
                <h3 class="news-summary-large">${summary}</h3>
                
                ${videoUrl ? `
                    <div class="video-container">
                        ${getVideoEmbedCode(videoUrl)}
                    </div>
                ` : ''}
                
                <div class="news-detail-content">
                    ${content}
                </div>
                
                ${tagsArray.length > 0 ? `
                    <div class="news-tags" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <strong>Etiquetas:</strong>
                        ${tagsArray.map(tag => `<span style="display: inline-block; background: #eef2ff; color: #4a6fc1; padding: 5px 10px; border-radius: 15px; font-size: 0.9rem; margin-right: 8px; margin-bottom: 8px;">#${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
            
            <div class="news-detail-footer">
                <span>Portal de Noticias - Vista Previa</span>
                <span style="color: #f39c12;"><i class="fas fa-eye"></i> Vista previa - No publicado</span>
            </div>
        </div>
    `;
    
    previewModal.classList.remove('hidden');
}

// Obtener código de inserción para videos
function getVideoEmbedCode(videoUrl) {
    if (!videoUrl || typeof videoUrl !== 'string') return '';
    
    // Limpiar la URL
    let url = videoUrl.trim();
    
    // YouTube - varios formatos
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let videoId = '';
        
        // Formato: https://www.youtube.com/watch?v=VIDEO_ID
        if (url.includes('youtube.com/watch?v=')) {
            const match = url.match(/v=([a-zA-Z0-9_-]+)/);
            videoId = match ? match[1] : '';
        }
        // Formato: https://youtu.be/VIDEO_ID
        else if (url.includes('youtu.be/')) {
            const parts = url.split('youtu.be/');
            videoId = parts[1] ? parts[1].split(/[?&#]/)[0] : '';
        }
        // Formato: https://www.youtube.com/embed/VIDEO_ID
        else if (url.includes('youtube.com/embed/')) {
            const parts = url.split('embed/');
            videoId = parts[1] ? parts[1].split(/[?&#]/)[0] : '';
        }
        
        if (videoId) {
            return `<div class="video-embed">
                <iframe 
                    width="100%" 
                    height="400" 
                    src="https://www.youtube.com/embed/${videoId}" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                </iframe>
                <p class="video-note"><i class="fas fa-video"></i> Video de YouTube</p>
            </div>`;
        }
    }
    
    // Vimeo
    if (url.includes('vimeo.com')) {
        const match = url.match(/vimeo\.com\/(\d+)/);
        if (match && match[1]) {
            return `<div class="video-embed">
                <iframe 
                    width="100%" 
                    height="400" 
                    src="https://player.vimeo.com/video/${match[1]}" 
                    frameborder="0" 
                    allow="autoplay; fullscreen; picture-in-picture" 
                    allowfullscreen>
                </iframe>
                <p class="video-note"><i class="fas fa-video"></i> Video de Vimeo</p>
            </div>`;
        }
    }
    
    // Si no es YouTube ni Vimeo, mostrar enlace
    return `<div class="video-link">
        <p><i class="fas fa-external-link-alt"></i> Enlace de video: 
        <a href="${url}" target="_blank">${url}</a></p>
    </div>`;
}

// **FUNCIÓN LOGIN CORREGIDA - SIN VALIDACIONES EXTRA**
function login() {
    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value;
    
    if (!email || !password) {
        showMessage('Por favor, ingresa correo y contraseña', 'error');
        return;
    }
    
    submitLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando sesión...';
    submitLoginBtn.disabled = true;
    
    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            // Éxito - mostrará el panel automáticamente por onAuthStateChanged
            submitLoginBtn.innerHTML = 'Acceder';
            submitLoginBtn.disabled = false;
        })
        .catch(error => {
            console.error('Error de autenticación:', error);
            
            let errorMessage = 'Error al iniciar sesión';
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'Usuario no encontrado';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Contraseña incorrecta';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Correo electrónico inválido';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Demasiados intentos fallidos. Intenta más tarde';
            }
            
            showMessage(errorMessage, 'error');
            
            submitLoginBtn.innerHTML = 'Acceder';
            submitLoginBtn.disabled = false;
        });
}

// Cerrar sesión
function logout() {
    auth.signOut()
        .then(() => {
            showMessage('Sesión cerrada exitosamente', 'success');
        })
        .catch(error => {
            console.error('Error al cerrar sesión:', error);
            showMessage('Error al cerrar sesión', 'error');
        });
}

// Mostrar mensaje
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

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Función para forzar recarga completa
function forceReloadNews() {
    console.log('Forzando recarga completa...');
    
    // Limpiar caché de IDs
    if (typeof loadedNewsIds !== 'undefined') {
        loadedNewsIds.clear();
    }
    
    // Limpiar completamente
    adminNewsContainer.innerHTML = '';
    
    // Recargar
    loadAdminNews(searchNewsInput.value, adminCategoryFilter ? adminCategoryFilter.value : '');
    
    showMessage('Recarga forzada completada', 'success');
}

// Event Listeners
if (submitLoginBtn) submitLoginBtn.addEventListener('click', login);
if (logoutBtn) logoutBtn.addEventListener('click', logout);
if (newsForm) newsForm.addEventListener('submit', publishNews);
if (previewNewsBtn) previewNewsBtn.addEventListener('click', previewNews);
if (saveDraftBtn) saveDraftBtn.addEventListener('click', saveDraft);
if (resetFormBtn) resetFormBtn.addEventListener('click', () => {
    if (confirm('¿Estás seguro de que quieres limpiar el formulario? Se perderán los cambios no guardados.')) {
        newsForm.reset();
        if (ckeditor) {
            ckeditor.setData('');
        } else {
            document.getElementById('news-content').value = '';
        }
        delete newsForm.dataset.editingId;
        publishNewsBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publicar Noticia';
        if (summaryChars) {
            summaryChars.textContent = '0';
        }
        showMessage('Formulario limpiado', 'success');
    }
});

if (closePreviewBtn) closePreviewBtn.addEventListener('click', () => {
    previewModal.classList.add('hidden');
});
if (editFromPreviewBtn) editFromPreviewBtn.addEventListener('click', () => {
    previewModal.classList.add('hidden');
});
if (publishFromPreviewBtn) publishFromPreviewBtn.addEventListener('click', () => {
    publishNewsBtn.click();
    previewModal.classList.add('hidden');
});

// Permitir enviar el formulario con Enter en los campos de login
if (loginPasswordInput) {
    loginPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            login();
        }
    });
}

// REEMPLAZAR los event listeners con versiones debounced:
if (refreshNewsBtn) {
    refreshNewsBtn.addEventListener('click', () => {
        loadAdminNews(searchNewsInput.value, adminCategoryFilter ? adminCategoryFilter.value : '');
        showMessage('Lista actualizada', 'success');
    });
}

if (searchNewsInput) {
    // Usar debounce para evitar múltiples llamadas durante escritura
    const debouncedSearch = debounce((e) => {
        loadAdminNews(e.target.value, adminCategoryFilter ? adminCategoryFilter.value : '');
    }, 300);
    
    searchNewsInput.addEventListener('input', debouncedSearch);
}

// AGREGAR event listener para filtro de categoría con debounce
if (adminCategoryFilter) {
    const debouncedCategoryFilter = debounce(function() {
        loadAdminNews(searchNewsInput.value, this.value);
    }, 300);
    
    adminCategoryFilter.addEventListener('change', debouncedCategoryFilter);
}

if (forceReloadBtn) {
    forceReloadBtn.addEventListener('click', forceReloadNews);
}

// Cerrar modal al hacer clic fuera
previewModal.addEventListener('click', (e) => {
    if (e.target === previewModal) {
        previewModal.classList.add('hidden');
    }
});