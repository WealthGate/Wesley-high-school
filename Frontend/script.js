const API_URL = 'http://localhost:3000';

const mainContent = document.getElementById('main-content');
const header = document.querySelector('.header');
const navLinks = document.querySelector('.nav-links');
const hamburger = document.querySelector('.hamburger');

const templates = {
    home: document.getElementById('home-template'),
    page: document.getElementById('page-template'),
    contact: document.getElementById('contact-us-template'),
    adminLogin: document.getElementById('admin-login-template'),
    adminDashboard: document.getElementById('admin-dashboard-template')
};

let authToken = localStorage.getItem('authToken');


/**
 * Handles the header's background and positioning based on scroll position.
 * On the home page, it makes the header solid after scrolling past the hero section.
 * On other pages, it ensures the header state is clean, relying on CSS for a solid background.
 */
function handleHeaderAppearance() {
    const heroSection = document.querySelector('.hero-section');

    if (heroSection) {
        // We are on the home page, which has a hero section.
        // The header should become solid only after the user scrolls past the entire hero section.
        const heroHeight = heroSection.offsetHeight;
        header.classList.toggle('scrolled', window.scrollY >= heroHeight);
    } else {
        // On any other page, the 'scrolled' class (used for home page transition) should be removed.
        // The solid background for other pages is handled by the CSS rule for `body:not(.home-page) .header`.
        header.classList.remove('scrolled');
    }
}


// --- EVENT LISTENERS ---
hamburger.addEventListener('click', () => navLinks.classList.toggle('active'));

// Listen for scroll events to dynamically change the header
window.addEventListener('scroll', handleHeaderAppearance);

// Handle SPA navigation for links
document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a');
    if (anchor && anchor.getAttribute('href')?.startsWith('#')) {
        e.preventDefault();
        loadPage(anchor.getAttribute('href'));
    }
});

// Handle browser back/forward buttons and initial page load
window.addEventListener('popstate', () => loadPage(window.location.hash || '#home'));
window.addEventListener('DOMContentLoaded', () => loadPage(window.location.hash || '#home'));


// --- PAGE ROUTING & RENDERING ---

async function loadPage(path) {
    // Close mobile menu on navigation
    if (navLinks.classList.contains('active')) navLinks.classList.remove('active');
    
    const [pageSlug, identifier] = (path.startsWith('#') ? path.substring(1) : 'home').split('/');
    history.pushState({}, '', path);
    mainContent.innerHTML = ''; 

    try {
        // By default, assume we are not on the home page.
        document.body.classList.remove('home-page');

        switch (pageSlug) {
            case 'home': 
                await renderHomePage(); 
                // Add the 'home-page' class to the body to enable transparent header styles
                document.body.classList.add('home-page'); 
                break;
            case 'admin': authToken ? renderAdminDashboard() : renderAdminLogin(); break;
            case 'contact-us': renderContactPage(); break;
            case 'news':
            case 'events':
            case 'blog':
                await (identifier ? renderSingleItemPage(pageSlug, identifier) : renderListPage(pageSlug));
                break;
            default: 
                await renderGenericPage(pageSlug);
                break;
        }
    } catch (error) {
        console.error('Error loading page:', error);
        mainContent.innerHTML = `<div class="page-wrapper"><section class="content-section"><h2>Page Not Found</h2><p>${error.message}</p></section></div>`;
        // Ensure home-page class is removed on error as well
        document.body.classList.remove('home-page');
    }

    // Scroll to the top of the new page
    window.scrollTo(0, 0); 
    // Set the correct initial header state without waiting for a scroll
    handleHeaderAppearance();
}

// --- PUBLIC PAGE RENDERERS ---

async function renderHomePage() {
    const data = await fetchData(`pages/home`);
    const templateContent = templates.home.content.cloneNode(true);
    templateContent.querySelector('.hero-title').textContent = data.title;
    templateContent.querySelector('.hero-subtitle').innerHTML = data.content;

    const videoElement = templateContent.querySelector('.hero-video');
    if (data.hero_video_url) {
        videoElement.src = data.hero_video_is_local ? `${API_URL}${data.hero_video_url}` : data.hero_video_url;
    } else {
        videoElement.parentElement.style.display = 'none'; // Hide video container if no video
    }
    mainContent.appendChild(templateContent);

    await Promise.all([
        fetchAndRenderSection('news', '.news-grid', 3),
        fetchAndRenderSection('events', '.events-grid', 3),
        fetchAndRenderSection('blog', '.blog-grid', 3)
    ]);
}

async function renderGenericPage(slug) {
    const data = await fetchData(`pages/${slug}`);
    const templateContent = templates.page.content.cloneNode(true);
    templateContent.querySelector('.page-title').textContent = data.title;
    templateContent.querySelector('.page-body').innerHTML = data.content;
    mainContent.appendChild(templateContent);
}

async function renderListPage(type) {
    const data = await fetchData(type);
    const templateContent = templates.page.content.cloneNode(true);
    templateContent.querySelector('.page-title').textContent = type.charAt(0).toUpperCase() + type.slice(1);
    
    const pageBody = templateContent.querySelector('.page-body');
    pageBody.innerHTML = (data.length > 0) ? data.map(item => `
        <div class="card" style="margin-bottom: 2rem; text-align: left;">
            ${item.image_url ? `<a href="#${type}/${item.slug || item.id}"><img src="${API_URL}${item.image_url}" alt="${item.title}"></a>` : ''}
            <div class="card-content">
                <h3><a href="#${type}/${item.slug || item.id}">${item.title}</a></h3>
                ${type === 'events' ? `<p><strong>Date:</strong> ${new Date(item.date).toLocaleString()}</p><p><strong>Location:</strong> ${item.location}</p>` : ''}
                <p>${item.content.substring(0, 200)}...</p>
                <a href="#${type}/${item.slug || item.id}" class="button-secondary" style="align-self: flex-start; margin-top: 1rem;">Read More</a>
            </div>
        </div>
    `).join('') : '<p>No content available for this section yet.</p>';
    mainContent.appendChild(templateContent);
}

async function renderSingleItemPage(type, identifier) {
    const item = await fetchData(`${type}/${identifier}`);
    const templateContent = templates.page.content.cloneNode(true);
    templateContent.querySelector('.page-title').textContent = item.title;
    
    let contentHtml = (item.image_url) ? `<img src="${API_URL}${item.image_url}" alt="${item.title}" style="width:100%; max-height: 400px; object-fit: cover; border-radius: 8px; margin-bottom: 2rem;">` : '';
    
    if (type === 'events') contentHtml += `<p><strong>Date:</strong> ${new Date(item.date).toLocaleString()}</p><p><strong>Location:</strong> ${item.location}</p>`;
    if (type === 'blog') contentHtml += `<p><em>By ${item.author} on ${new Date(item.date).toLocaleDateString()}</em></p>`;
    
    contentHtml += `<div style="margin-top: 1.5rem; text-align: left;">${item.content}</div>`;
    templateContent.querySelector('.page-body').innerHTML = contentHtml;
    mainContent.appendChild(templateContent);
}

function renderContactPage() {
    mainContent.appendChild(templates.contact.content.cloneNode(true));
    document.getElementById('contact-form').addEventListener('submit', handleContactSubmit);
}

async function handleContactSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const messageBox = document.getElementById('contact-message');
    try {
        await fetchData('contact', false, 'POST', {
            name: form.querySelector('#name').value,
            email: form.querySelector('#email').value,
            subject: form.querySelector('#subject').value,
            message: form.querySelector('#message').value,
        });
        showMessage(messageBox, 'Thank you! Your message has been sent.', 'success');
        form.reset();
    } catch (error) {
        showMessage(messageBox, `Error: ${error.message}`, 'error');
    }
}

async function fetchAndRenderSection(section, containerSelector, limit) {
    const data = await fetchData(section);
    const container = mainContent.querySelector(containerSelector);
    if (!container) return;
    container.innerHTML = (data.length > 0) ? data.slice(0, limit).map(item => `
        <div class="card">
            ${item.image_url ? `<a href="#${section}/${item.slug || item.id}" class="card-image-link"><img src="${API_URL}${item.image_url}" alt="${item.title}"></a>` : ''}
            <div class="card-content">
                <h3><a href="#${section}/${item.slug || item.id}">${item.title}</a></h3>
                <p>${item.content.substring(0, 100)}...</p>
            </div>
        </div>
    `).join('') : `<p>No recent ${section} to display.</p>`;
}

// --- ADMIN FUNCTIONALITY ---

function renderAdminLogin() {
    mainContent.appendChild(templates.adminLogin.content.cloneNode(true));
    document.getElementById('admin-login-form').addEventListener('submit', handleAdminLogin);
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const messageBox = document.getElementById('login-message');
    try {
        const { token } = await fetchData('admin/login', false, 'POST', {
            email: document.getElementById('admin-email').value,
            password: document.getElementById('admin-password').value
        });
        authToken = token;
        localStorage.setItem('authToken', authToken);
        renderAdminDashboard();
    } catch (error) {
        showMessage(messageBox, `Login failed: ${error.message}`, 'error');
    }
}

function renderAdminDashboard() {
    mainContent.innerHTML = '';
    mainContent.appendChild(templates.adminDashboard.content.cloneNode(true));
    document.getElementById('admin-logout-button').addEventListener('click', () => {
        localStorage.removeItem('authToken');
        authToken = null;
        loadPage('#home');
    });

    const tabs = document.querySelectorAll('.tab-button');
    tabs.forEach(tab => tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');
        const tabId = e.target.dataset.tab;
        document.getElementById(`tab-${tabId}`).classList.add('active');
        loadAdminTabData(tabId);
    }));

    loadAdminTabData('pages');
}

function loadAdminTabData(tabId) {
    switch (tabId) {
        case 'pages': loadAdminPages(); break;
        case 'news':
        case 'events':
        case 'blog':
            renderCrudUi(tabId);
            break;
        case 'inquiries': loadAdminInquiries(); break;
    }
}

async function loadAdminPages() {
    const pagesList = document.getElementById('pages-list');
    pagesList.innerHTML = 'Loading pages...';
    try {
        const pages = await fetchData('pages', true);
        pagesList.innerHTML = pages.map(page => `
            <div class="list-item">
                <span>Page: <strong>${page.title}</strong></span>
                <button class="button-secondary" onclick="editPage('${page.slug}')">Edit</button>
            </div>
        `).join('');
    } catch (error) {
        pagesList.innerHTML = `<p class="message-box error">Error loading pages: ${error.message}</p>`;
    }
}

async function editPage(slug) {
    const pageData = await fetchData(`pages/${slug}`, true);
    const editor = document.getElementById('page-editor');
    document.getElementById('pages-list').style.display = 'none';
    editor.style.display = 'block';

    document.getElementById('page-slug').value = slug;
    document.getElementById('page-title').value = pageData.title;
    document.getElementById('page-content').value = pageData.content || '';
    document.getElementById('hero-video-url').value = !pageData.hero_video_is_local ? pageData.hero_video_url || '' : '';
    
    document.querySelectorAll('.hero-video-fields').forEach(el => {
        el.style.display = (slug === 'home') ? 'block' : 'none';
    });

    document.getElementById('page-edit-form').onsubmit = handlePageUpdate;
    document.getElementById('cancel-edit').onclick = () => {
        editor.style.display = 'none';
        document.getElementById('pages-list').style.display = 'block';
    };
}

async function handlePageUpdate(e) {
    e.preventDefault();
    const slug = document.getElementById('page-slug').value;
    
    let content = document.getElementById('page-content').value;
    const pageMediaFile = document.getElementById('page-media-file').files[0];
    if (pageMediaFile) {
        const mediaPath = await uploadMedia(pageMediaFile);
        const tag = pageMediaFile.type.startsWith('image/')
            ? `<img src="${API_URL}${mediaPath}" alt="Uploaded Image" style="max-width: 100%;">`
            : `<video src="${API_URL}${mediaPath}" controls style="max-width: 100%;"></video>`;
        content += `\n${tag}\n`;
    }
    document.getElementById('page-media-file').value = '';

    const heroVideoFile = document.getElementById('hero-video-file').files[0];
    let finalHeroVideoUrl = document.getElementById('hero-video-url').value;
    let isLocal = !!finalHeroVideoUrl && !heroVideoFile;
    if (heroVideoFile) {
        finalHeroVideoUrl = await uploadMedia(heroVideoFile);
        isLocal = true;
    }

    try {
        await fetchData(`pages/${slug}`, true, 'PUT', {
            title: document.getElementById('page-title').value,
            content: content,
            heroVideoUrl: finalHeroVideoUrl,
            heroVideoIsLocal: isLocal
        });
        alert('Page updated successfully!');
        document.getElementById('page-editor').style.display = 'none';
        document.getElementById('pages-list').style.display = 'block';
        loadAdminPages();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function renderCrudUi(type) {
    const container = document.getElementById(`tab-${type}`);
    container.innerHTML = `
        <h3>Manage ${type.charAt(0).toUpperCase() + type.slice(1)}</h3>
        <button class="button" id="add-new-${type}">Add New</button>
        <div id="form-container-${type}" class="item-form" style="display:none;"></div>
        <div id="list-container-${type}"></div>
    `;
    
    document.getElementById(`add-new-${type}`).addEventListener('click', () => showCrudForm(type));
    loadCrudList(type);
}

async function loadCrudList(type) {
    const listContainer = document.getElementById(`list-container-${type}`);
    listContainer.innerHTML = 'Loading...';
    try {
        const items = await fetchData(type, true);
        listContainer.innerHTML = items.map(item => `
            <div class="list-item">
                <span>${item.title}</span>
                <div class="actions">
                    <button class="button-secondary" onclick="showCrudForm('${type}', ${item.id})">Edit</button>
                    <button class="button-secondary" onclick="deleteCrudItem('${type}', ${item.id})">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        listContainer.innerHTML = `<p class="message-box error">Error: ${error.message}</p>`;
    }
}

async function showCrudForm(type, id = null) {
    const item = id ? await fetchData(`${type}/${id}`, true) : {};
    const formContainer = document.getElementById(`form-container-${type}`);
    formContainer.style.display = 'block';
    
    let extraFields = '';
    if (type === 'events') extraFields = `<div class="form-group"><label for="item-location">Location:</label><input type="text" id="item-location" value="${item.location || ''}"></div>`;
    if (type === 'blog') extraFields = `
        <div class="form-group"><label for="item-author">Author:</label><input type="text" id="item-author" value="${item.author || ''}"></div>
        <div class="form-group"><label for="item-slug">Slug (e.g., my-first-post):</label><input type="text" id="item-slug" value="${item.slug || ''}"></div>
    `;
    
    formContainer.innerHTML = `
        <form id="crud-form">
            <h4>${id ? 'Edit' : 'Add'} ${type}</h4>
            <div class="form-group"><label for="item-title">Title:</label><input type="text" id="item-title" value="${item.title || ''}" required></div>
            <div class="form-group"><label for="item-content">Content:</label><textarea id="item-content" rows="10">${item.content || ''}</textarea></div>
            <div class="form-group"><label for="item-date">Date:</label><input type="date" id="item-date" value="${item.date ? new Date(item.date).toISOString().split('T')[0] : ''}" required></div>
            ${(type !== 'events') ? `<div class="form-group"><label for="item-image">Image:</label><input type="file" id="item-image"></div>` : ''}
            ${extraFields}
            <button type="submit" class="button">Save</button>
            <button type="button" class="button-secondary" id="cancel-crud">Cancel</button>
        </form>
    `;

    document.getElementById('cancel-crud').addEventListener('click', () => formContainer.style.display = 'none');
    document.getElementById('crud-form').addEventListener('submit', (e) => handleCrudSubmit(e, type, id));
}

async function handleCrudSubmit(e, type, id) {
    e.preventDefault();
    const imageFile = document.getElementById('item-image')?.files[0];
    let imageUrl = null;
    if (imageFile) {
        imageUrl = await uploadMedia(imageFile);
    }

    const payload = {
        title: document.getElementById('item-title').value,
        content: document.getElementById('item-content').value,
        date: document.getElementById('item-date').value,
    };
    if (imageUrl) payload.image_url = imageUrl;
    if (type === 'events') payload.location = document.getElementById('item-location').value;
    if (type === 'blog') {
        payload.author = document.getElementById('item-author').value;
        payload.slug = document.getElementById('item-slug').value;
    }
    
    try {
        await fetchData(type + (id ? `/${id}` : ''), true, id ? 'PUT' : 'POST', payload);
        alert('Success!');
        document.getElementById(`form-container-${type}`).style.display = 'none';
        loadCrudList(type);
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function deleteCrudItem(type, id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
        await fetchData(`${type}/${id}`, true, 'DELETE');
        alert('Item deleted.');
        loadCrudList(type);
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function loadAdminInquiries() {
    const list = document.getElementById('inquiries-list');
    list.innerHTML = 'Loading...';
    try {
        const inquiries = await fetchData('contact', true);
        list.innerHTML = (inquiries.length > 0) ? inquiries.map(i => `
            <div class="list-item" style="flex-direction: column; align-items: flex-start;">
                <p><strong>From:</strong> ${i.name} (${i.email})</p>
                <p><strong>Subject:</strong> ${i.subject}</p>
                <p>${i.message}</p>
                <small>${new Date(i.created_at).toLocaleString()}</small>
            </div>
        `).join('') : '<p>No inquiries found.</p>';
    } catch(e){
        list.innerHTML = `<p class="message-box error">Error: ${e.message}</p>`;
    }
}

// --- UTILITY ---
async function fetchData(endpoint, auth = false, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && authToken) headers['Authorization'] = `Bearer ${authToken}`;
    
    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    const response = await fetch(`${API_URL}/api/${endpoint}`, config);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
        throw new Error(errorData.message);
    }
    return response.status === 204 ? null : response.json();
}

async function uploadMedia(file) {
    const formData = new FormData();
    formData.append('media', file);
    
    const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data.filePath;
}

function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `message-box ${type}`;
    element.style.display = 'block';
}
