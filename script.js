// User Profile Data
let currentUser = {
    id: 1,
    displayName: "Alex Chen",
    username: "alexchen",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face",
    bio: "Computer Science student at TIGPS. Love coding and coffee! ☕",
    location: "TIGPS Campus"
};

// Sample data for demonstration (will be replaced by Google Drive data)
let posts = [];
let nextPostId = 1;
let nextCommentId = 1;
let currentPostId = null;
let selectedMedia = null;
let modalSelectedMedia = null;

// Google Drive integration
let googleDriveManager = null;

// Admin state
let isAdminLoggedIn = false;
const ADMIN_PASSWORD = "abc@12345"; // You can change this password

// GIF Search Modal Logic
let gifSearchTimeout = null;
let gifSearchResults = [];
let gifSearchTarget = null; // 'main' or 'modal'

// --- Google Drive Integration for Admin ---
let googleAuthInstance = null;
let googleDriveAccessToken = null;

async function loadGoogleApiClient() {
    return new Promise((resolve, reject) => {
        function checkGapi() {
            if (window.gapi && window.gapi.load) {
                console.log('[GAPI] gapi loaded');
                window.gapi.load('client:auth2', resolve);
            } else {
                setTimeout(checkGapi, 100);
            }
        }
        checkGapi();
    });
}

async function initGoogleAuth() {
    await loadGoogleApiClient();
    if (!googleAuthInstance) {
        if (!window.TIGPS_GOOGLE_CLIENT_ID) {
            console.error('[GAPI] Client ID not set');
            showNotification('Google Client ID not set.', 'error');
            throw new Error('Google Client ID not set');
        }
        console.log('[GAPI] Initializing Google Auth with client ID:', window.TIGPS_GOOGLE_CLIENT_ID);
        await window.gapi.client.init({
            clientId: window.TIGPS_GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.file',
        });
        googleAuthInstance = window.gapi.auth2.getAuthInstance();
        console.log('[GAPI] Google Auth instance initialized');
    }
}

// DOM Elements
const postsFeed = document.getElementById('postsFeed');
const postInput = document.getElementById('postInput');
const anonymousPost = document.getElementById('anonymousPost');
const modalPostInput = document.getElementById('modalPostInput');
const modalAnonymousPost = document.getElementById('modalAnonymousPost');
const postModal = document.getElementById('postModal');
const profileModal = document.getElementById('profileModal');
const adminModal = document.getElementById('adminModal');
const commentsModal = document.getElementById('commentsModal');
const commentsList = document.getElementById('commentsList');
const commentInput = document.getElementById('commentInput');
const charCount = document.getElementById('charCount');
const modalCharCount = document.getElementById('modalCharCount');
const postMediaPreview = document.getElementById('postMediaPreview');
const modalPostMediaPreview = document.getElementById('modalPostMediaPreview');
const settingsModal = document.getElementById('settingsModal');

// Initialize the app
document.addEventListener('DOMContentLoaded', async function() {
    await initializeGoogleDrive();
    renderPosts();
    setupEventListeners();
    updateProfileDisplay();
    showEmptyStateIfNeeded();
});

// Initialize Google Drive
async function initializeGoogleDrive() {
    try {
        // Wait for Google Drive Manager to be available
        let attempts = 0;
        while (!window.googleDriveManager && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (window.googleDriveManager) {
            googleDriveManager = window.googleDriveManager;
            
            // Load posts from Google Drive
            const savedPosts = await googleDriveManager.loadPosts();
            if (savedPosts && savedPosts.length > 0) {
                posts = savedPosts;
                nextPostId = Math.max(...posts.map(p => p.id)) + 1;
                nextCommentId = Math.max(...posts.flatMap(p => p.comments.map(c => c.id))) + 1;
            } else {
                // Load sample data if no saved posts
                loadSampleData();
            }
            
            // Load user profile from Google Drive
            const savedProfile = await googleDriveManager.loadUserProfile();
            if (savedProfile) {
                currentUser = { ...currentUser, ...savedProfile };
            }
            
            // Load settings
            const settings = await googleDriveManager.loadSettings();
            if (settings) {
                // Apply any saved settings
                if (settings.theme) {
                    document.body.setAttribute('data-theme', settings.theme);
                }
            }
            
            showNotification('Google Drive integration ready!', 'success');
        } else {
            showNotification('Google Drive not available. Using local storage.', 'warning');
            loadSampleData();
        }
    } catch (error) {
        console.error('Error initializing Google Drive:', error);
        showNotification('Failed to initialize Google Drive. Using local storage.', 'warning');
        loadSampleData();
    }
}

// Load sample data for demonstration
function loadSampleData() {
    posts = [
        {
            id: 1,
            content: "Just finished my final project! The TIGPS community has been amazing this semester. Can't wait to see what everyone else has built! 🚀 #coding #TIGPS #finalproject",
            author: "Alex Chen",
            username: "alexchen",
            avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=48&h=48&fit=crop&crop=face",
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            likes: 24,
            comments: [
                {
                    id: 1,
                    author: "Sarah Johnson",
                    username: "sarahj",
                    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=32&h=32&fit=crop&crop=face",
                    content: "Amazing work! Can't wait to see it! 👏",
                    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000)
                },
                {
                    id: 2,
                    author: "Mike Rodriguez",
                    username: "mikerod",
                    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=32&h=32&fit=crop&crop=face",
                    content: "What tech stack did you use?",
                    timestamp: new Date(Date.now() - 30 * 60 * 1000)
                }
            ],
            isAnonymous: false,
            isLiked: false,
            media: null,
            tags: ["coding", "TIGPS", "finalproject"]
        },
        {
            id: 2,
            content: "Anonymous confession: I've been procrastinating on my assignments but somehow still getting good grades. Anyone else feel this way? 😅",
            author: "Anonymous",
            username: "anonymous",
            avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=48&h=48&fit=crop&crop=face",
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
            likes: 15,
            comments: [
                {
                    id: 3,
                    author: "Emma Wilson",
                    username: "emmaw",
                    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=32&h=32&fit=crop&crop=face",
                    content: "Literally me right now 😂",
                    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
                }
            ],
            isAnonymous: true,
            isLiked: true,
            media: null,
            tags: ["confession", "procrastination"]
        },
        {
            id: 3,
            content: "The new library study rooms are incredible! Perfect for group projects. Thanks to whoever suggested this to the administration! 📚",
            author: "Sarah Johnson",
            username: "sarahj",
            avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=48&h=48&fit=crop&crop=face",
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
            likes: 31,
            comments: [],
            isAnonymous: false,
            isLiked: false,
            media: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600&h=400&fit=crop",
            tags: ["library", "study", "TIGPS"]
        }
    ];
    nextPostId = 4;
    nextCommentId = 4;
}

// Setup event listeners
function setupEventListeners() {
    // Auto-resize textarea and character count
    postInput.addEventListener('input', function(e) {
        autoResizeTextarea(e);
        updateCharCount(e.target, charCount);
    });
    
    modalPostInput.addEventListener('input', function(e) {
        autoResizeTextarea(e);
        updateCharCount(e.target, modalCharCount);
    });
    
    // Close modals when clicking outside
    postModal.addEventListener('click', function(e) {
        if (e.target === postModal) {
            closePostModal();
        }
    });
    
    profileModal.addEventListener('click', function(e) {
        if (e.target === profileModal) {
            closeProfileModal();
        }
    });
    
    adminModal.addEventListener('click', function(e) {
        if (e.target === adminModal) {
            closeAdminModal();
        }
    });
    
    commentsModal.addEventListener('click', function(e) {
        if (e.target === commentsModal) {
            closeCommentsModal();
        }
    });
    
    settingsModal.addEventListener('click', function(e) {
        if (e.target === settingsModal) {
            closeSettingsModal();
        }
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (postModal.style.display === 'block') closePostModal();
            if (profileModal.style.display === 'block') closeProfileModal();
            if (adminModal.style.display === 'block') closeAdminModal();
            if (commentsModal.style.display === 'block') closeCommentsModal();
            if (settingsModal.style.display === 'block') closeSettingsModal();
        }
    });
    
    // Tag detection in post input
    postInput.addEventListener('input', detectTags);
    modalPostInput.addEventListener('input', detectTags);
}

// Auto-resize textarea
function autoResizeTextarea(e) {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

// Update character count
function updateCharCount(textarea, countElement) {
    const count = textarea.value.length;
    countElement.textContent = `${count}/500`;
    
    if (count > 450) {
        countElement.style.color = '#ff6b6b';
    } else if (count > 400) {
        countElement.style.color = '#ffa726';
    } else {
        countElement.style.color = '#999';
    }
}

// Detect tags in text
function detectTags(e) {
    const text = e.target.value;
    const tagRegex = /#(\w+)/g;
    const tags = text.match(tagRegex);
    
    if (tags) {
        // Highlight tags in the text (you could add visual feedback here)
        console.log('Tags detected:', tags);
    }
}

// Create post from main input
function createPost() {
    const content = postInput.value.trim();
    const isAnonymous = anonymousPost.checked;
    
    if (!content) {
        showNotification('Please enter some content for your post!', 'error');
        return;
    }
    
    addPost(content, isAnonymous, selectedMedia);
    postInput.value = '';
    postInput.style.height = 'auto';
    anonymousPost.checked = false;
    selectedMedia = null;
    updateMediaPreview(postMediaPreview, null);
    
    showNotification('Post created successfully!', 'success');
}

// Create post from modal
function createPostFromModal() {
    const content = modalPostInput.value.trim();
    const isAnonymous = modalAnonymousPost.checked;
    
    if (!content) {
        showNotification('Please enter some content for your post!', 'error');
        return;
    }
    
    addPost(content, isAnonymous, modalSelectedMedia);
    modalPostInput.value = '';
    modalPostInput.style.height = 'auto';
    modalAnonymousPost.checked = false;
    modalSelectedMedia = null;
    updateMediaPreview(modalPostMediaPreview, null);
    closePostModal();
    
    showNotification('Post created successfully!', 'success');
}

// Add new post
async function addPost(content, isAnonymous, media) {
    const tags = extractTags(content);
    const post = {
        id: nextPostId++,
        content: content,
        author: isAnonymous ? 'Anonymous' : currentUser.displayName,
        username: isAnonymous ? 'anonymous' : currentUser.username,
        avatar: isAnonymous ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=48&h=48&fit=crop&crop=face' : currentUser.avatar,
        timestamp: new Date(),
        likes: 0,
        comments: [],
        isAnonymous: isAnonymous,
        isLiked: false,
        media: media,
        tags: tags
    };
    
    posts.unshift(post);
    renderPosts();
    showEmptyStateIfNeeded();
    
    // Save to Google Drive if admin is logged in
    if (isAdminLoggedIn && googleDriveManager) {
        await googleDriveManager.savePosts(posts);
        updateAdminStats();
    }
}

// Extract tags from content
function extractTags(content) {
    const tagRegex = /#(\w+)/g;
    const matches = content.match(tagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
}

// Render all posts
function renderPosts() {
    postsFeed.innerHTML = '';
    
    if (posts.length === 0) {
        postsFeed.innerHTML = `
            <div class="empty-state">
                <h3>No posts yet</h3>
                <p>Be the first to share what's happening at TIGPS!</p>
                <button class="btn-primary" onclick="openPostModal()">Create First Post</button>
            </div>
        `;
        return;
    }
    
    posts.forEach((post, index) => {
        const postElement = createPostElement(post, index);
        postsFeed.appendChild(postElement);
    });
}

// Create individual post element
function createPostElement(post, index) {
    const postDiv = document.createElement('div');
    postDiv.className = 'post';
    postDiv.style.animationDelay = `${index * 0.1}s`;
    
    const timeAgo = getTimeAgo(post.timestamp);
    const mediaHtml = post.media ? `
        <div class="post-media">
            ${post.media.includes('video') ? 
                `<video src="${post.media}" controls></video>` : 
                `<img src="${post.media}" alt="Post media">`
            }
        </div>
    ` : '';
    
    const tagsHtml = post.tags.length > 0 ? `
        <div class="post-tags">
            ${post.tags.map(tag => `<span class="post-tag" onclick="searchTag('${tag}')">#${tag}</span>`).join('')}
        </div>
    ` : '';
    
    postDiv.innerHTML = `
        <div class="post-header">
            <img src="${post.avatar}" alt="${post.author}" class="post-avatar">
            <div class="post-info">
                ${post.isAnonymous ? 
                    '<div class="post-anonymous">Anonymous</div>' : 
                    `<div class="post-author">${post.author}</div>
                     <div class="post-username">@${post.username}</div>`
                }
                <div class="post-time">${timeAgo}</div>
            </div>
        </div>
        <div class="post-content">${formatContent(post.content)}</div>
        ${mediaHtml}
        ${tagsHtml}
        <div class="post-actions-bar">
            <div class="post-stats">
                <span>${post.likes} likes</span>
                <span>${post.comments.length} comments</span>
            </div>
            <div class="post-actions">
                <button class="post-action-btn ${post.isLiked ? 'liked' : ''}" onclick="toggleLike(${post.id})">
                    ${post.isLiked ? '❤️' : '🤍'} Like
                </button>
                <button class="post-action-btn" onclick="showComments(${post.id})">
                    💬 Comment
                </button>
                <button class="post-action-btn" onclick="sharePost(${post.id})">
                    📤 Share
                </button>
            </div>
        </div>
    `;
    
    return postDiv;
}

// Format content with clickable tags
function formatContent(content) {
    return content.replace(/#(\w+)/g, '<span class="post-tag" onclick="searchTag(\'$1\')">#$1</span>');
}

// Toggle like on post
async function toggleLike(postId) {
    const post = posts.find(p => p.id === postId);
    if (post) {
        post.isLiked = !post.isLiked;
        post.likes += post.isLiked ? 1 : -1;
        renderPosts();
        
        // Add heart animation
        const likeBtn = document.querySelector(`[onclick="toggleLike(${postId})"]`);
        if (likeBtn) {
            likeBtn.style.transform = 'scale(1.3)';
            setTimeout(() => {
                likeBtn.style.transform = 'scale(1)';
            }, 200);
        }
        
        // Save to Google Drive if admin is logged in
        if (isAdminLoggedIn && googleDriveManager) {
            await googleDriveManager.savePosts(posts);
        }
    }
}

// Show comments modal
function showComments(postId) {
    currentPostId = postId;
    const post = posts.find(p => p.id === postId);
    if (post) {
        renderComments(post.comments);
        commentsModal.style.display = 'block';
        commentInput.focus();
        document.body.style.overflow = 'hidden';
    }
}

// Render comments
function renderComments(comments) {
    commentsList.innerHTML = '';
    
    if (comments.length === 0) {
        commentsList.innerHTML = '<div class="empty-state"><p>No comments yet. Be the first to comment!</p></div>';
        return;
    }
    
    comments.forEach(comment => {
        const commentElement = createCommentElement(comment);
        commentsList.appendChild(commentElement);
    });
}

// Create comment element
function createCommentElement(comment) {
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment';
    
    const timeAgo = getTimeAgo(comment.timestamp);
    
    commentDiv.innerHTML = `
        <img src="${comment.avatar}" alt="${comment.author}" class="comment-avatar">
        <div class="comment-content">
            <div class="comment-header">
                <span class="comment-author">${comment.author}</span>
                <span class="comment-username">@${comment.username}</span>
                <span class="comment-time">${timeAgo}</span>
            </div>
            <div class="comment-text">${comment.content}</div>
        </div>
    `;
    
    return commentDiv;
}

// Add comment
async function addComment() {
    const content = commentInput.value.trim();
    
    if (!content) {
        showNotification('Please enter a comment!', 'error');
        return;
    }
    
    const post = posts.find(p => p.id === currentPostId);
    if (post) {
        const comment = {
            id: nextCommentId++,
            author: currentUser.displayName,
            username: currentUser.username,
            avatar: currentUser.avatar,
            content: content,
            timestamp: new Date()
        };
        
        post.comments.push(comment);
        renderComments(post.comments);
        commentInput.value = '';
        
        // Save to Google Drive if admin is logged in
        if (isAdminLoggedIn && googleDriveManager) {
            await googleDriveManager.savePosts(posts);
            updateAdminStats();
        }
        
        showNotification('Comment added!', 'success');
    }
}

// Share post
function sharePost(postId) {
    const post = posts.find(p => p.id === postId);
    if (post && navigator.share) {
        navigator.share({
            title: 'TIGPS Social',
            text: post.content,
            url: window.location.href
        });
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(post.content).then(() => {
            showNotification('Post copied to clipboard!', 'success');
        });
    }
}

// Search by tag
function searchTag(tag) {
    showNotification(`Searching for #${tag}...`, 'info');
    // You could implement actual search functionality here
}

// GIF Search Modal Logic
function openGifSearchModal(target = 'main') {
    gifSearchTarget = target;
    document.getElementById('gifSearchModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    document.getElementById('gifSearchInput').value = '';
    document.getElementById('gifResultsGrid').innerHTML = '';
    document.getElementById('gifSearchInput').focus();
}

function closeGifSearchModal() {
    document.getElementById('gifSearchModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    gifSearchResults = [];
    gifSearchTarget = null;
}

document.addEventListener('DOMContentLoaded', function() {
    const gifInput = document.getElementById('gifSearchInput');
    if (gifInput) {
        gifInput.addEventListener('input', function(e) {
            if (gifSearchTimeout) clearTimeout(gifSearchTimeout);
            const query = e.target.value.trim();
            if (query.length < 2) {
                document.getElementById('gifResultsGrid').innerHTML = '';
                return;
            }
            gifSearchTimeout = setTimeout(() => searchGiphy(query), 400);
        });
    }
});

async function searchGiphy(query) {
    const apiKey = 'dc6zaTOxFJmzC'; // Public beta key
    const url = `https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(query)}&api_key=${apiKey}&limit=24&rating=pg`;
    document.getElementById('gifResultsGrid').innerHTML = '<div style="grid-column: 1/-1; text-align:center;">Searching...</div>';
    try {
        const res = await fetch(url);
        const data = await res.json();
        gifSearchResults = data.data;
        renderGifResults();
    } catch (e) {
        document.getElementById('gifResultsGrid').innerHTML = '<div style="grid-column: 1/-1; text-align:center; color:#ff6b6b;">Failed to load GIFs.</div>';
    }
}

function renderGifResults() {
    const grid = document.getElementById('gifResultsGrid');
    if (!gifSearchResults.length) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center;">No GIFs found.</div>';
        return;
    }
    grid.innerHTML = gifSearchResults.map(gif =>
        `<img src="${gif.images.fixed_width.url}" alt="GIF" style="width:100%;border-radius:12px;cursor:pointer;box-shadow:0 2px 8px #0006;transition:box-shadow 0.2s;" onclick="selectGifForPost('${gif.images.original.url.replace(/'/g, '\'')}', event)">`
    ).join('');
}

function selectGifForPost(gifUrl, event) {
    if (gifSearchTarget === 'main') {
        selectedMedia = gifUrl;
        updateMediaPreview(postMediaPreview, selectedMedia);
    } else if (gifSearchTarget === 'modal') {
        modalSelectedMedia = gifUrl;
        updateMediaPreview(modalPostMediaPreview, modalSelectedMedia);
    }
    closeGifSearchModal();
}

// Update image upload logic to only accept images
function triggerImageUpload() {
    document.getElementById('imageUpload').click();
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            if (gifSearchTarget === 'modal') {
                modalSelectedMedia = e.target.result;
                updateMediaPreview(modalPostMediaPreview, modalSelectedMedia);
            } else {
                selectedMedia = e.target.result;
                updateMediaPreview(postMediaPreview, selectedMedia);
            }
        };
        reader.readAsDataURL(file);
    }
}

// For modal post creator, add GIF button logic
function triggerModalImageUpload() {
    document.getElementById('modalImageUpload').click();
}
function openModalGifSearch() {
    openGifSearchModal('modal');
}

function handleProfilePicUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentUser.avatar = e.target.result;
            updateProfileDisplay();
            document.getElementById('profileEditPic').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function updateMediaPreview(previewElement, media) {
    if (media) {
        previewElement.innerHTML = `
            <div class="media-preview">
                ${media.includes('data:video') ? 
                    `<video src="${media}" controls></video>` : 
                    `<img src="${media}" alt="Preview">`
                }
                <button class="remove-media-btn" onclick="removeMedia('${previewElement.id}')">×</button>
            </div>
        `;
        previewElement.classList.add('has-media');
    } else {
        previewElement.innerHTML = '';
        previewElement.classList.remove('has-media');
    }
}

function removeMedia(previewId) {
    if (previewId === 'postMediaPreview') {
        selectedMedia = null;
        updateMediaPreview(postMediaPreview, null);
    } else if (previewId === 'modalPostMediaPreview') {
        modalSelectedMedia = null;
        updateMediaPreview(modalPostMediaPreview, null);
    }
}

// Profile management
function toggleProfileMenu() {
    const menu = document.getElementById('profileMenu');
    menu.classList.toggle('show');
}

function openProfileModal() {
    document.getElementById('profileDisplayName').value = currentUser.displayName;
    document.getElementById('profileUsername').value = currentUser.username;
    document.getElementById('profileBio').value = currentUser.bio;
    document.getElementById('profileLocation').value = currentUser.location;
    document.getElementById('profileEditPic').src = currentUser.avatar;
    
    profileModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeProfileModal() {
    profileModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

async function saveProfile() {
    currentUser.displayName = document.getElementById('profileDisplayName').value;
    currentUser.username = document.getElementById('profileUsername').value;
    currentUser.bio = document.getElementById('profileBio').value;
    currentUser.location = document.getElementById('profileLocation').value;
    
    updateProfileDisplay();
    closeProfileModal();
    
    // Save to Google Drive if admin is logged in
    if (isAdminLoggedIn && googleDriveManager) {
        await googleDriveManager.saveUserProfile(currentUser);
    }
    
    showNotification('Profile updated successfully!', 'success');
}

function updateProfileDisplay() {
    // Update header profile pic
    document.getElementById('headerProfilePic').src = currentUser.avatar;
    
    // Update post creator info
    document.getElementById('postCreatorAvatar').src = currentUser.avatar;
    document.getElementById('postCreatorName').textContent = `@${currentUser.username}`;
    document.getElementById('postCreatorDisplayName').textContent = currentUser.displayName;
    
    // Update modal post creator info
    document.getElementById('modalPostCreatorAvatar').src = currentUser.avatar;
    document.getElementById('modalPostCreatorName').textContent = `@${currentUser.username}`;
    document.getElementById('modalPostCreatorDisplayName').textContent = currentUser.displayName;
    
    // Update comment creator avatar
    document.getElementById('commentCreatorAvatar').src = currentUser.avatar;
}

// Admin functions
function openAdminModal() {
    adminModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Reset admin state
    isAdminLoggedIn = false;
    document.getElementById('adminLoginSection').style.display = 'block';
    document.getElementById('adminDashboardSection').style.display = 'none';
    document.getElementById('adminPassword').value = '';
}

function closeAdminModal() {
    adminModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    isAdminLoggedIn = false;
}

function handleAdminPasswordEnter(event) {
    if (event.key === 'Enter') {
        loginAdmin();
    }
}

function loginAdmin() {
    const password = document.getElementById('adminPassword').value;
    
    if (password === ADMIN_PASSWORD) {
        isAdminLoggedIn = true;
        document.getElementById('adminLoginSection').style.display = 'none';
        document.getElementById('adminDashboardSection').style.display = 'block';
        
        updateAdminStats();
        updateAdminDriveStatus();
        
        showNotification('Admin access granted! Welcome to the admin panel.', 'success');
    } else {
        showNotification('Invalid admin password!', 'error');
        document.getElementById('adminPassword').value = '';
    }
}

function logoutAdmin() {
    isAdminLoggedIn = false;
    document.getElementById('adminLoginSection').style.display = 'block';
    document.getElementById('adminDashboardSection').style.display = 'none';
    document.getElementById('adminPassword').value = '';
    
    showNotification('Logged out from admin panel.', 'info');
}

function updateAdminStats() {
    const totalPosts = posts.length;
    const totalComments = posts.reduce((sum, post) => sum + post.comments.length, 0);
    const totalMedia = posts.filter(post => post.media).length;
    const uniqueUsers = new Set(posts.map(post => post.username)).size;
    
    document.getElementById('adminTotalPosts').textContent = totalPosts;
    document.getElementById('adminTotalComments').textContent = totalComments;
    document.getElementById('adminTotalMedia').textContent = totalMedia;
    document.getElementById('adminTotalUsers').textContent = uniqueUsers;
}

function updateAdminDriveStatus() {
    const statusIndicator = document.getElementById('adminStatusIndicator');
    const statusText = document.getElementById('adminStatusText');
    const signInBtn = document.getElementById('adminSignInBtn');
    const signOutBtn = document.getElementById('adminSignOutBtn');
    
    if (googleDriveAccessToken) {
        statusIndicator.style.color = '#4CAF50';
        statusText.textContent = 'Connected to Google Drive';
        signInBtn.style.display = 'none';
        signOutBtn.style.display = 'inline-block';
    } else {
        statusIndicator.style.color = '#FF9800';
        statusText.textContent = 'Not connected to Google Drive';
        signInBtn.style.display = 'inline-block';
        signOutBtn.style.display = 'none';
    }
}

// Admin Google Drive functions
async function adminSignInToGoogleDrive() {
    try {
        console.log('[GAPI] Starting sign-in flow');
        await initGoogleAuth();
        const user = await googleAuthInstance.signIn();
        const authResponse = user.getAuthResponse();
        googleDriveAccessToken = authResponse.access_token;
        console.log('[GAPI] Sign-in successful, access token:', googleDriveAccessToken);
        updateAdminDriveStatus();
        showNotification('Google Drive connected successfully!', 'success');
    } catch (e) {
        console.error('[GAPI] Sign-in failed:', e);
        showNotification('Google Drive sign-in failed.', 'error');
    }
}

async function adminSignOutFromGoogleDrive() {
    if (googleAuthInstance) {
        await googleAuthInstance.signOut();
        googleDriveAccessToken = null;
        updateAdminDriveStatus();
        showNotification('Google Drive disconnected.', 'info');
    }
}

async function adminSyncData() {
    if (googleDriveManager && isAdminLoggedIn) {
        try {
            await googleDriveManager.savePosts(posts);
            await googleDriveManager.saveUserProfile(currentUser);
            
            document.getElementById('adminLastSyncTime').textContent = new Date().toLocaleString();
            showNotification('Data synced to Google Drive successfully!', 'success');
        } catch (error) {
            showNotification('Failed to sync data to Google Drive.', 'error');
        }
    } else {
        showNotification('Google Drive not available or admin not logged in.', 'error');
    }
}

async function adminExportData() {
    if (isAdminLoggedIn) {
        const data = {
            posts: posts,
            users: [currentUser],
            settings: {
                lastExport: new Date().toISOString()
            }
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tigps-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showNotification('Data exported successfully!', 'success');
    }
}

function adminImportData() {
    if (isAdminLoggedIn) {
        document.getElementById('adminImportFile').click();
    }
}

async function handleAdminImportFile(event) {
    const file = event.target.files[0];
    if (file && isAdminLoggedIn) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.posts) {
                posts = data.posts;
                nextPostId = Math.max(...posts.map(p => p.id)) + 1;
                nextCommentId = Math.max(...posts.flatMap(p => p.comments.map(c => c.id))) + 1;
                renderPosts();
            }
            
            if (data.users && data.users.length > 0) {
                currentUser = { ...currentUser, ...data.users[0] };
                updateProfileDisplay();
            }
            
            updateAdminStats();
            showNotification('Data imported successfully!', 'success');
        } catch (error) {
            showNotification('Failed to import data. Invalid file format.', 'error');
        }
    }
    event.target.value = '';
}

// Modal functions
function openPostModal() {
    postModal.style.display = 'block';
    modalPostInput.focus();
    document.body.style.overflow = 'hidden';
}

function closePostModal() {
    postModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function closeCommentsModal() {
    commentsModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentPostId = null;
}

function openSettingsModal() {
    settingsModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    updateDriveStatus();
}

function closeSettingsModal() {
    settingsModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Google Drive control functions (for regular users)
async function signInToGoogleDrive() {
    if (googleDriveManager) {
        await googleDriveManager.signIn();
        updateDriveStatus();
    } else {
        showNotification('Google Drive not available.', 'error');
    }
}

async function signOutFromGoogleDrive() {
    if (googleDriveManager) {
        await googleDriveManager.signOut();
        updateDriveStatus();
    }
}

async function syncData() {
    if (googleDriveManager) {
        await googleDriveManager.syncData();
        updateDriveStatus();
    }
}

async function exportData() {
    if (googleDriveManager) {
        await googleDriveManager.exportAllData();
    } else {
        showNotification('Google Drive not available for export.', 'error');
    }
}

function importData() {
    document.getElementById('importFile').click();
}

async function handleImportFile(event) {
    const file = event.target.files[0];
    if (file && googleDriveManager) {
        const success = await googleDriveManager.importData(file);
        if (success) {
            // Reload data
            const savedPosts = await googleDriveManager.loadPosts();
            if (savedPosts && savedPosts.length > 0) {
                posts = savedPosts;
                nextPostId = Math.max(...posts.map(p => p.id)) + 1;
                nextCommentId = Math.max(...posts.flatMap(p => p.comments.map(c => c.id))) + 1;
                renderPosts();
            }
            
            const savedProfile = await googleDriveManager.loadUserProfile();
            if (savedProfile) {
                currentUser = { ...currentUser, ...savedProfile };
                updateProfileDisplay();
            }
        }
    }
    event.target.value = ''; // Reset file input
}

function updateDriveStatus() {
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const signInBtn = document.getElementById('signInBtn');
    const signOutBtn = document.getElementById('signOutBtn');
    const syncBtn = document.getElementById('syncBtn');
    
    if (googleDriveManager) {
        const authStatus = googleDriveManager.getAuthStatus();
        
        if (authStatus.isAuthenticated) {
            statusIndicator.style.color = '#4CAF50';
            statusText.textContent = 'Connected to Google Drive';
            signInBtn.style.display = 'none';
            signOutBtn.style.display = 'inline-block';
            syncBtn.style.display = 'inline-block';
        } else {
            statusIndicator.style.color = '#FF9800';
            statusText.textContent = 'Not connected to Google Drive';
            signInBtn.style.display = 'inline-block';
            signOutBtn.style.display = 'none';
            syncBtn.style.display = 'none';
        }
    } else {
        statusIndicator.style.color = '#F44336';
        statusText.textContent = 'Google Drive not available';
        signInBtn.style.display = 'none';
        signOutBtn.style.display = 'none';
        syncBtn.style.display = 'none';
    }
}

function logout() {
    showNotification('Logout feature coming soon!', 'info');
}

// Utility functions
function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
}

function showEmptyStateIfNeeded() {
    if (posts.length === 0) {
        renderPosts();
    }
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }
    }, 3000);
}

// Add some interactive effects
document.addEventListener('DOMContentLoaded', function() {
    // Add hover effects to posts
    document.addEventListener('mouseover', function(e) {
        if (e.target.closest('.post')) {
            e.target.closest('.post').style.transform = 'translateY(-5px)';
        }
    });
    
    document.addEventListener('mouseout', function(e) {
        if (e.target.closest('.post')) {
            e.target.closest('.post').style.transform = 'translateY(0)';
        }
    });
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Enter to post
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            if (document.activeElement === postInput) {
                createPost();
            } else if (document.activeElement === modalPostInput) {
                createPostFromModal();
            } else if (document.activeElement === commentInput) {
                addComment();
            }
        }
    });
    
    // Close profile menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.user-menu')) {
            document.getElementById('profileMenu').classList.remove('show');
        }
    });
}); 