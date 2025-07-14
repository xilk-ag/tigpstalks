// Mobile device detection and redirect to mobile.html
(function() {
  var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  var isOnMobilePage = window.location.pathname.endsWith('mobile.html');
  if (isMobile && !isOnMobilePage) {
    window.location.href = 'mobile.html';
  }
})();

// Emergency error handler - catch all errors
window.addEventListener('error', function(e) {
    console.error('EMERGENCY ERROR CAUGHT:', e.error);
});

// Emergency unhandled promise rejection handler
window.addEventListener('unhandledrejection', function(e) {
    console.error('EMERGENCY PROMISE ERROR:', e.reason);
});

console.log('=== MOBILE SCRIPT LOADING START ===');

// Define openTwitterProfile function immediately for global access
function openTwitterProfile() {
    const modal = document.getElementById('profileDashboardModal');
    if (modal) {
        modal.style.display = 'flex';
        loadTwitterProfileData();
        loadTwitterPosts();
    }
}

function closeTwitterProfile() {
    const modal = document.getElementById('profileDashboardModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Make functions globally available immediately
window.openTwitterProfile = openTwitterProfile;
window.closeTwitterProfile = closeTwitterProfile;

// Tenor API Configuration
const TENOR_API_KEY = 'LIVDSRZULELA'; // Tenor API demo key
const TENOR_BASE_URL = 'https://tenor.googleapis.com/v2'; // Updated to new Google API

// Global variables
let posts = [];
let nextPostId = 1;
let nextCommentId = 1;
let currentPostId = null;
let selectedMedia = null;
let selectedGif = null;
let modalSelectedMedia = null;
let modalSelectedGif = null;
let postCooldownActive = false;
let gifSearchResults = [];
let gifSearchTimeout = null;
let gifSearchTarget = 'main';
let isAdminLoggedIn = false;
const ADMIN_PASSWORD = "allmighty555";
const ADMIN_USERNAME = "alphatigps";

// User Profile Data
let currentUser = {
    id: 1,
    displayName: "user.tig",
    username: "user.tig",
    avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Ccircle cx='60' cy='60' r='60' fill='%2325D366'/%3E%3Cpath d='M60 70c-13.255 0-40 6.627-40 20v10h80v-10c0-13.373-26.745-20-40-20zm0-10c8.837 0 16-7.163 16-16s-7.163-16-16-16-16 7.163-16 16 7.163 16 16 16z' fill='%23fff'/%3E%3C/svg%3E",
    bio: "Computer Science student at TIGPS. Love coding and coffee! ☕",
    location: "TIGPS Campus"
};

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBMTZlitQGyqNx3LO0cNiITBpBHMec8rN8",
    authDomain: "xilk-tigps.firebaseapp.com",
    projectId: "xilk-tigps",
    storageBucket: "xilk-tigps.firebasestorage.app",
    messagingSenderId: "242470054512",
    appId: "1:242470054512:web:47b3aed365f6534c8aa2b5",
    measurementId: "G-LNH8BXWW83"
};

let db;

// Initialize Firebase
function initializeFirebase() {
    try {
        if (typeof window !== 'undefined' && window.firebase) {
            if (!window.firebase.apps.length) {
                window.firebase.initializeApp(firebaseConfig);
            }
            db = window.firebase.firestore();
            console.log('✓ Firebase initialized successfully');
            return true;
        } else {
            console.warn('Firebase not available in this environment');
            return false;
        }
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        return false;
    }
}

// Check admin state from localStorage
function checkAdminState() {
    const adminState = localStorage.getItem('isAdminLoggedIn');
    if (adminState === 'true') {
        isAdminLoggedIn = true;
        console.log('Admin state restored from localStorage');
    }
}

// Content protection functions
function setupContentProtection() {
    // Prevent right-click context menu
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showNotification('Right-click is disabled for content protection.', 'warning');
        return false;
    });

    // Prevent keyboard shortcuts for copying, saving, etc.
    document.addEventListener('keydown', function(e) {
        if (
            (e.ctrlKey && (e.key === 'c' || e.key === 'x' || e.key === 'a' || e.key === 's' || e.key === 'u')) ||
            (e.ctrlKey && e.shiftKey && e.key === 'J') ||
            (e.ctrlKey && e.shiftKey && e.key === 'C')
        ) {
            e.preventDefault();
            showNotification('This action is disabled for content protection.', 'warning');
            return false;
        }
    });

    // Prevent drag and drop
    document.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
    });

    // Prevent selection
    document.addEventListener('selectstart', function(e) {
        if (!e.target.matches('.post-input, .comment-input, .modal-post-input, input[type="text"], input[type="password"], textarea')) {
            e.preventDefault();
            return false;
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Post input event listeners
    const postInput = document.getElementById('postInput');
    if (postInput) {
        postInput.addEventListener('input', function() {
            autoResizeTextarea(this);
            updateCharCount(this, document.getElementById('charCount'));
        });
        
        postInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                // Don't call createPost() here to prevent double posting
                // The button click will handle posting
            }
        });
    }

    // Username modal event listeners
    const usernameSubmitBtn = document.getElementById('usernameSubmitBtn');
    if (usernameSubmitBtn) {
        usernameSubmitBtn.addEventListener('click', function() {
            const displayName = document.getElementById('displayNameInput').value.trim();
            const username = document.getElementById('usernameInput').value.trim();
            
            if (displayName && username) {
                setStoredUsername(username);
                currentUser.displayName = displayName;
                currentUser.username = username;
                hideUsernameModal();
                updateProfileDisplay();
                showNotification('Welcome, ' + displayName + '!', 'success');
            } else {
                showNotification('Please enter both name and username.', 'error');
            }
        });
    }

    // Beta modal event listeners
    const betaButton = document.getElementById('betaButton');
    if (betaButton) {
        betaButton.addEventListener('click', function() {
            document.getElementById('betaModal').style.display = 'flex';
        });
    }

    const closeBetaModal = document.getElementById('closeBetaModal');
    if (closeBetaModal) {
        closeBetaModal.addEventListener('click', function() {
            document.getElementById('betaModal').style.display = 'none';
        });
    }

    // Hamburger menu event listeners
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    if (hamburgerMenu) {
        hamburgerMenu.addEventListener('click', toggleHamburgerMenu);
    }

    const sidebarOverlay = document.getElementById('sidebarOverlay');
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', toggleHamburgerMenu);
    }

    // GIF search event listeners
    const gifSearchInput = document.getElementById('gifSearchInput');
    if (gifSearchInput) {
        gifSearchInput.addEventListener('input', function() {
            if (gifSearchTimeout) {
                clearTimeout(gifSearchTimeout);
            }
            gifSearchTimeout = setTimeout(() => {
                searchGifs();
            }, 500);
        });
    }
}

// Auto-resize textarea
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

// Update character count
function updateCharCount(textarea, countElement) {
    const maxLength = 280;
    const currentLength = textarea.value.length;
    const remaining = maxLength - currentLength;
    
    if (countElement) {
        countElement.textContent = remaining;
        
        if (remaining < 20) {
            countElement.style.color = '#ff4444';
        } else if (remaining < 50) {
            countElement.style.color = '#ffaa00';
        } else {
            countElement.style.color = '#666';
        }
    }
}

// Username management
function getStoredUsername() {
    return localStorage.getItem('tigpsUsername');
}

function setStoredUsername(username) {
    localStorage.setItem('tigpsUsername', username);
}

function showUsernameModal() {
    const modal = document.getElementById('usernameModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('displayNameInput').focus();
    }
}

function hideUsernameModal() {
    const modal = document.getElementById('usernameModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function requireUsername() {
    const storedUsername = getStoredUsername();
    if (!storedUsername) {
        showUsernameModal();
        return false;
    }
    
    // Update current user with stored data
    currentUser.username = storedUsername;
    currentUser.displayName = localStorage.getItem('tigpsDisplayName') || storedUsername;
    updateProfileDisplay();
    return true;
}

// Profile display update
function updateProfileDisplay() {
    const postCreatorName = document.getElementById('postCreatorName');
    const postCreatorDisplayName = document.getElementById('postCreatorDisplayName');
    const postCreatorAvatar = document.getElementById('postCreatorAvatar');
    
    if (postCreatorName) {
        postCreatorName.textContent = currentUser.displayName;
    }
    if (postCreatorDisplayName) {
        postCreatorDisplayName.textContent = '@' + currentUser.username;
    }
    if (postCreatorAvatar) {
        postCreatorAvatar.src = currentUser.avatar;
    }
}

// Firebase functions
async function fetchPostsFromFirestore() {
    try {
        if (!db) {
            const storedPosts = localStorage.getItem('tigpsPosts');
            return storedPosts ? JSON.parse(storedPosts) : [];
        }
        
        const postsCol = db.collection("posts");
        const postSnapshot = await postsCol.orderBy("timestamp", "desc").get();
        
        const postsArr = postSnapshot.docs.map(doc => {
            const data = doc.data();
            // Ensure all required fields are present
            return {
                id: doc.id,
                content: data.content || '',
                author: data.author || 'Unknown',
                username: data.username || 'unknown',
                avatar: data.avatar || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 120 120'%3E%3Ccircle cx='60' cy='60' r='60' fill='%2325D366'/%3E%3Cpath d='M60 70c-13.255 0-40 6.627-40 20v10h80v-10c0-13.373-26.745-20-40-20zm0-10c8.837 0 16-7.163 16-16s-7.163-16-16-16-16 7.163-16 16 7.163 16 16 16z' fill='%23fff'/%3E%3C/svg%3E",
                timestamp: data.timestamp || new Date().toISOString(),
                likes: data.likes || 0,
                comments: data.comments || [],
                isAnonymous: data.isAnonymous || false,
                isLiked: data.isLiked || false,
                media: data.media || null,
                tags: data.tags || [],
                likedBy: data.likedBy || [],
                isLiked: currentUser && currentUser.username && data.likedBy && data.likedBy.includes(currentUser.username)
            };
        });
        
        return postsArr;
    } catch (error) {
        // Fallback to localStorage
        const storedPosts = localStorage.getItem('tigpsPosts');
        return storedPosts ? JSON.parse(storedPosts) : [];
    }
}

async function savePostToFirestore(post) {
    try {
        if (!db) {
            const storedPosts = localStorage.getItem('tigpsPosts');
            const posts = storedPosts ? JSON.parse(storedPosts) : [];
            post.id = Date.now().toString();
            posts.unshift(post);
            localStorage.setItem('tigpsPosts', JSON.stringify(posts));
            return true;
        }
        await db.collection("posts").add(post);
        return true;
    } catch (error) {
        const storedPosts = localStorage.getItem('tigpsPosts');
        const posts = storedPosts ? JSON.parse(storedPosts) : [];
        post.id = Date.now().toString();
        posts.unshift(post);
        localStorage.setItem('tigpsPosts', JSON.stringify(posts));
        return true;
    }
}

// Post creation
async function createPost() {
    if (postCooldownActive) {
        showNotification('Please wait 15 seconds before posting again.', 'warning');
        return;
    }
    
    const postInput = document.getElementById('postInput');
    const content = postInput.value.trim();
    
    if (!content) {
        showNotification('Please enter some content to post.', 'error');
        return;
    }
    
    if (!requireUsername()) {
        return;
    }
    
    const anonymousCheck = document.getElementById('anonymousCheck');
    const isAnonymous = anonymousCheck ? anonymousCheck.checked : false;
    
    const user = getCurrentUserForPost(isAnonymous);
    
    const post = {
        content: content,
        author: user.displayName,
        username: user.username,
        avatar: user.avatar,
        isAnonymous: isAnonymous,
        media: selectedMedia || null,
        gif: selectedGif || null,
        timestamp: new Date().toISOString(),
        likes: 0,
        comments: [],
        isLiked: false,
        tags: extractTags(content),
        likedBy: []
    };
    
    try {
        // Save to Firestore
        const saved = await savePostToFirestore(post);
        if (saved) {
            // Add to local posts array
            posts.unshift(post);
            renderPosts();
            
            // Clear input and media
            postInput.value = '';
            postInput.style.height = 'auto';
            selectedMedia = null;
            selectedGif = null;
            
            // Update character count
            updateCharCount(postInput, document.getElementById('charCount'));
            
            // Clear media preview
            const mediaPreview = document.getElementById('mediaPreview');
            if (mediaPreview) {
                mediaPreview.innerHTML = '';
            }
            
            // Start cooldown
            startPostCooldown();
            
            showNotification('Post created successfully!', 'success');
        } else {
            showNotification('Failed to save post. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error creating post:', error);
        showNotification('Error creating post: ' + error.message, 'error');
    }
}

function getCurrentUserForPost(isAnonymous) {
    if (isAnonymous) {
        return {
            id: 'anonymous',
            displayName: 'Anonymous',
            username: 'anonymous',
            avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Ccircle cx='60' cy='60' r='60' fill='%2325D366'/%3E%3Cpath d='M60 70c-13.255 0-40 6.627-40 20v10h80v-10c0-13.373-26.745-20-40-20zm0-10c8.837 0 16-7.163 16-16s-7.163-16-16-16-16 7.163-16 16 7.163 16 16 16z' fill='%23fff'/%3E%3C/svg%3E"
        };
    }
    
    return {
        id: currentUser.id,
        displayName: currentUser.displayName,
        username: currentUser.username,
        avatar: currentUser.avatar
    };
}

function extractTags(content) {
    const tagRegex = /#(\w+)/g;
    const matches = content.match(tagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
}

// Post rendering
function renderPosts() {
    const postsFeed = document.getElementById('postsFeed');
    if (!postsFeed) return;
    
    if (posts.length === 0) {
        postsFeed.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <h3>No posts yet</h3>
                <p>Be the first to share something!</p>
            </div>
        `;
        return;
    }
    
    postsFeed.innerHTML = posts.map((post, index) => createPostElement(post, index)).join('');
}

function createPostElement(post, index) {
    const timeAgo = getTimeAgo(post.timestamp);
    const mediaHtml = post.media ? `<img src="${post.media}" alt="Post media" class="post-media">` : '';
    const gifHtml = post.gif ? `<img src="${post.gif}" alt="Post GIF" class="post-gif">` : '';
    const tagsHtml = post.tags && post.tags.length > 0 ? 
        post.tags.map(tag => `<span class="tag" onclick="searchTag('${tag}')">#${tag}</span>`).join(' ') : '';
    
    return `
        <div class="post" data-post-id="${post.id}">
            <div class="post-header">
                <img src="${post.avatar}" alt="Profile" class="post-avatar">
                <div class="post-info">
                    <div class="post-author">${escapeHtml(post.author)}</div>
                    <div class="post-username">@${escapeHtml(post.username)}</div>
                    <div class="post-time">${timeAgo}</div>
                </div>
            </div>
            <div class="post-content">
                <p>${formatContent(post.content)}</p>
                ${tagsHtml ? `<div class="post-tags">${tagsHtml}</div>` : ''}
                ${mediaHtml}
                ${gifHtml}
            </div>
            <div class="instagram-actions">
                <button class="instagram-action-btn ${post.isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}')" title="Like">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="${post.isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 21C12 21 4 13.36 4 8.5C4 5.42 6.42 3 9.5 3C11.24 3 12.91 3.81 14 5.08C15.09 3.81 16.76 3 18.5 3C21.58 3 24 5.42 24 8.5C24 13.36 16 21 16 21H12Z"/>
                    </svg>
                    <span class="action-count">${post.likes}</span>
                </button>
                <button class="instagram-action-btn" onclick="instagramComment('${post.id}')" title="Comment">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <span class="action-count">${post.comments.length}</span>
                </button>
                <button class="instagram-action-btn" onclick="instagramShare('${post.id}')" title="Share">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="18" cy="5" r="3"/>
                        <circle cx="6" cy="12" r="3"/>
                        <circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
}

function formatContent(content) {
    return escapeHtml(content).replace(/#(\w+)/g, '<span class="tag" onclick="searchTag(\'$1\')">#$1</span>');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getTimeAgo(date) {
    let dateObj;
    
    // Handle different timestamp formats
    if (typeof date === 'string') {
        dateObj = new Date(date);
    } else if (date && date.toDate) {
        // Firestore timestamp
        dateObj = date.toDate();
    } else if (date instanceof Date) {
        dateObj = date;
    } else {
        dateObj = new Date();
    }
    
    const now = new Date();
    const diff = now - dateObj;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

// Post interactions
async function toggleLike(postId) {
    const post = posts.find(p => p.id === postId || p.id === postId.toString());
    if (post) {
        const currentUsername = currentUser.username;
        
        if (!post.likedBy) {
            post.likedBy = [];
        }
        
        const isCurrentlyLiked = post.likedBy.includes(currentUsername);
        
        if (isCurrentlyLiked) {
            // Unlike
            post.likedBy = post.likedBy.filter(username => username !== currentUsername);
            post.likes = Math.max(0, post.likes - 1);
            post.isLiked = false;
        } else {
            // Like
            post.likedBy.push(currentUsername);
            post.likes += 1;
            post.isLiked = true;
        }
        
        renderPosts();
        
        // Update in Firestore
        try {
            await updatePostInFirestore(post);
        } catch (error) {
            console.error('Error updating like in Firestore:', error);
        }
    }
}

async function showComments(postId) {
    currentPostId = postId;
    try {
        console.log('Loading comments for post:', postId);
        const comments = await fetchCommentsFromFirestore(postId.toString());
        console.log('Comments loaded:', comments);
        renderComments(comments);
        document.getElementById('commentsModal').style.display = 'flex';
    } catch (e) {
        console.error('Error loading comments:', e);
        showNotification('Failed to load comments.', 'error');
    }
}

function sharePost(postId) {
    const post = posts.find(p => p.id === postId);
    if (post && navigator.share) {
        navigator.share({
            title: 'Check out this post on TIGPS TALKS',
            text: post.content.substring(0, 100) + '...',
            url: window.location.href
        });
    } else {
        showNotification('Sharing feature coming soon!', 'info');
    }
}

function searchTag(tag) {
    showNotification(`Searching for #${tag}...`, 'info');
}

// Media handling
// Robust triggerImageUpload for mobile
function triggerImageUpload() {
    let input = document.getElementById('imageUpload');
    if (!input) {
        input = document.createElement('input');
        input.type = 'file';
        input.id = 'imageUpload';
        input.accept = 'image/*,video/*';
        input.style.display = 'none';
        input.onchange = handleImageUpload;
        document.body.appendChild(input);
    }
    input.value = '';
    input.click();
}

// Robust handleImageUpload for mobile
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        showNotification('Please select a valid image or video file.', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        selectedMedia = e.target.result;
        let preview = document.getElementById('mediaPreview');
        if (!preview) {
            console.error('No preview element found for image upload!');
            showNotification('Error: No preview area found for image.', 'error');
            return;
        }
        if (file.type.startsWith('image/')) {
            preview.innerHTML = `<img src='${selectedMedia}' alt='Preview' style='max-width:100%;max-height:200px;border-radius:8px;margin-top:8px;'>`;
        } else {
            preview.innerHTML = `<video src='${selectedMedia}' controls style='max-width:100%;max-height:200px;border-radius:8px;margin-top:8px;'></video>`;
        }
        preview.classList.add('has-media');
    };
    reader.readAsDataURL(file);
}

function updateMediaPreview(previewElement, media) {
    if (!previewElement) return;
    
    previewElement.innerHTML = `
        <img src="${media}" alt="Selected media" style="max-width: 100%; max-height: 200px; border-radius: 8px;">
    `;
}

function removeSelectedMedia() {
    selectedMedia = null;
    const mediaPreview = document.getElementById('mediaPreview');
    if (mediaPreview) {
        mediaPreview.innerHTML = '';
    }
}

// GIF handling
function openGifModal() {
    const modal = document.getElementById('gifModal');
    if (modal) {
        modal.style.display = 'flex';
        searchGifs();
    }
}

function closeGifModal() {
    const modal = document.getElementById('gifModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function searchGifs() {
    const searchInput = document.getElementById('gifSearchInput');
    const query = searchInput ? searchInput.value.trim() : '';
    
    if (!query) {
        showNotification('Please enter a search term.', 'error');
        return;
    }
    
    try {
        const gifs = await searchTenorGifs(query);
        displayGifResults(gifs);
    } catch (error) {
        console.error('Error searching GIFs:', error);
        showNotification('Error searching GIFs. Please try again.', 'error');
    }
}

async function searchTenorGifs(query) {
    try {
        const response = await fetch(`${TENOR_BASE_URL}/search?key=${TENOR_API_KEY}&q=${encodeURIComponent(query)}&limit=8&media_filter=tinygif`);
        const data = await response.json();
        // Handle new Google API response structure
        if (data.results) {
            return data.results || [];
        } else if (data.data) {
            // New Google API structure
            return data.data || [];
        }
        return [];
    } catch (error) {
        console.error('Error fetching GIFs:', error);
        return [];
    }
}

function displayGifResults(gifs) {
    const resultsContainer = document.getElementById('gifResults');
    if (!resultsContainer) return;
    
    if (!Array.isArray(gifs) || gifs.length === 0) {
        resultsContainer.innerHTML = '<p>No GIFs found. Try a different search term.</p>';
        return;
    }
    
    resultsContainer.innerHTML = gifs.map(gif => {
        // Validate GIF object structure
        if (!gif || !gif.media_formats || !gif.media_formats.tinygif || !gif.media_formats.tinygif.url) {
            console.warn('Invalid GIF object structure:', gif);
            return '';
        }
        
        return `
            <div class="gif-item" onclick="selectGif('${gif.media_formats.tinygif.url}')">
                <img src="${gif.media_formats.tinygif.url}" alt="GIF" loading="lazy">
            </div>
        `;
    }).filter(html => html !== '').join('');
}

function selectGif(gifUrl) {
    selectedGif = gifUrl;
    const selectedGifContainer = document.getElementById('selectedGif');
    const selectedGifImg = document.getElementById('selectedGifImg');
    
    if (selectedGifContainer && selectedGifImg) {
        selectedGifImg.src = gifUrl;
        selectedGifContainer.style.display = 'block';
    }
    
    closeGifModal();
}

function removeSelectedGif() {
    selectedGif = null;
    const selectedGifContainer = document.getElementById('selectedGif');
    if (selectedGifContainer) {
        selectedGifContainer.style.display = 'none';
    }
}

// UI functions
function toggleHamburgerMenu() {
    const sidebar = document.getElementById('sidebarMenu');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar && overlay) {
        const isOpen = sidebar.classList.contains('open');
        
        if (isOpen) {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
            document.body.style.overflow = '';
        } else {
            sidebar.classList.add('open');
            overlay.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }
}

function openProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.style.display = 'flex';
        
        // Populate fields with current user data
        const profileName = document.getElementById('profileName');
        const profileUsername = document.getElementById('profileUsername');
        const profileBio = document.getElementById('profileBio');
        
        if (profileName) profileName.value = currentUser.displayName;
        if (profileUsername) profileUsername.value = currentUser.username;
        if (profileBio) profileBio.value = currentUser.bio || '';
    }
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function saveProfile() {
    const profileName = document.getElementById('profileName');
    const profileUsername = document.getElementById('profileUsername');
    const profileBio = document.getElementById('profileBio');
    
    if (profileName && profileUsername) {
        currentUser.displayName = profileName.value.trim();
        currentUser.username = profileUsername.value.trim();
        currentUser.bio = profileBio ? profileBio.value.trim() : '';
        
        // Save to localStorage
        setStoredUsername(currentUser.username);
        localStorage.setItem('tigpsDisplayName', currentUser.displayName);
        localStorage.setItem('tigpsBio', currentUser.bio);
        
        updateProfileDisplay();
        closeProfileModal();
        showNotification('Profile updated successfully!', 'success');
    }
}

function openAdminModal() {
    showNotification('Admin features coming soon!', 'info');
}

function openSettingsModal() {
    showNotification('Settings coming soon!', 'info');
}

function openAccountDashboard(event) {
    showNotification('Account dashboard coming soon!', 'info');
}

function logout() {
    localStorage.removeItem('tigpsUsername');
    localStorage.removeItem('tigpsDisplayName');
    localStorage.removeItem('tigpsBio');
    localStorage.removeItem('isAdminLoggedIn');
    
    currentUser = {
        id: 1,
        displayName: "Alex Chen",
        username: "alexchen",
        avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Ccircle cx='60' cy='60' r='60' fill='%2325D366'/%3E%3Cpath d='M60 70c-13.255 0-40 6.627-40 20v10h80v-10c0-13.373-26.745-20-40-20zm0-10c8.837 0 16-7.163 16-16s-7.163-16-16-16-16 7.163-16 16 7.163 16 16 16z' fill='%23fff'/%3E%3C/svg%3E",
        bio: "Computer Science student at TIGPS. Love coding and coffee! ☕",
        location: "TIGPS Campus"
    };
    
    updateProfileDisplay();
    showUsernameModal();
    showNotification('Logged out successfully!', 'success');
}

function openMail() {
    const subject = encodeURIComponent('TIGPS TALKS - Contact');
    const body = encodeURIComponent('Hello TIGPS TALKS team,\n\nI would like to contact you regarding...');
    window.open(`mailto:contact@tigps.com?subject=${subject}&body=${body}`);
}

// Cooldown functions
function startPostCooldown() {
    postCooldownActive = true;
    const postButton = document.getElementById('postButton');
    
    if (postButton) {
        postButton.disabled = true;
        
        // Create countdown timer
        let timeLeft = 15;
        const updateCountdown = () => {
            if (timeLeft > 0) {
                postButton.textContent = `Please wait ${timeLeft}s...`;
                timeLeft--;
                setTimeout(updateCountdown, 1000);
            } else {
                postCooldownActive = false;
                postButton.disabled = false;
                postButton.textContent = 'Post';
            }
        };
        
        updateCountdown();
    }
}

// Notification system
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196F3'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 300px;
        font-size: 14px;
        animation: slideIn 0.3s ease-out;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Firestore update function
async function updatePostInFirestore(post) {
    try {
        if (!db) {
            console.warn('Firestore not initialized, using localStorage fallback');
            const storedPosts = localStorage.getItem('tigpsPosts');
            const posts = storedPosts ? JSON.parse(storedPosts) : [];
            const postIndex = posts.findIndex(p => p.id === post.id);
            if (postIndex !== -1) {
                posts[postIndex] = { ...posts[postIndex], ...post };
                localStorage.setItem('tigpsPosts', JSON.stringify(posts));
            }
            return true;
        }
        
        await db.collection('posts').doc(post.id).update({
            likes: post.likes,
            comments: post.comments,
            likedBy: post.likedBy || []
        });
        
        return true;
    } catch (error) {
        console.error('Error updating post in Firestore:', error);
        return false;
    }
}

// Initialize app data
async function initializeAppData() {
    try {
        console.log('🔄 Initializing app data...');
        
        // Load posts from Firestore
        posts = await fetchPostsFromFirestore();
        
        // If no posts exist, create a test post
        if (posts.length === 0) {
            const testPost = {
                content: "Welcome to TIGPS TALKS! This is a test post to get things started. 🎉",
                author: "TIGPS Team",
                username: "tigps_team",
                avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 120 120'%3E%3Ccircle cx='60' cy='60' r='60' fill='%2325D366'/%3E%3Cpath d='M60 70c-13.255 0-40 6.627-40 20v10h80v-10c0-13.373-26.745-20-40-20zm0-10c8.837 0 16-7.163 16-16s-7.163-16-16-16-16 7.163-16 16 7.163 16 16 16z' fill='%23fff'/%3E%3C/svg%3E",
                isAnonymous: false,
                media: null,
                timestamp: new Date().toISOString(),
                likes: 5,
                comments: [],
                isLiked: false,
                tags: ["welcome", "test"],
                likedBy: []
            };
            await savePostToFirestore(testPost);
            posts = await fetchPostsFromFirestore();
        }
        
        // Render posts
        renderPosts();
        
        // Update profile display
        updateProfileDisplay();
        
    } catch (error) {
        showNotification('Failed to initialize app: ' + error.message, 'error');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Initialize Firebase first
        const firebaseInitialized = initializeFirebase();
        
        checkAdminState();
        setupContentProtection();
        setupEventListeners();
        requireUsername();
        
        // Initialize app data (loads posts)
        initializeAppData().then(() => {
            // Posts loaded successfully
        }).catch(error => {
            showNotification('App initialization failed: ' + error.message, 'error');
        });
        
        // Load posts after a short delay as backup
        setTimeout(async function() {
            try {
                posts = await fetchPostsFromFirestore();
                renderPosts();
            } catch (error) {
                showNotification('Backup post loading failed: ' + error.message, 'error');
                
                // Final fallback: create a test post in localStorage
                const fallbackPost = {
                    id: Date.now().toString(),
                    content: "Welcome to TIGPS TALKS! This is a fallback test post. 🎉",
                    author: "TIGPS Team",
                    username: "tigps_team",
                    avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 120 120'%3E%3Ccircle cx='60' cy='60' r='60' fill='%2325D366'/%3E%3Cpath d='M60 70c-13.255 0-40 6.627-40 20v10h80v-10c0-13.373-26.745-20-40-20zm0-10c8.837 0 16-7.163 16-16s-7.163-16-16-16-16 7.163-16 16 7.163 16 16 16z' fill='%23fff'/%3E%3C/svg%3E",
                    isAnonymous: false,
                    media: null,
                    timestamp: new Date().toISOString(),
                    likes: 5,
                    comments: [],
                    isLiked: false,
                    tags: ["welcome", "test", "fallback"],
                    likedBy: []
                };
                
                posts = [fallbackPost];
                localStorage.setItem('tigpsPosts', JSON.stringify(posts));
                renderPosts();
            }
        }, 2000);
        
    } catch (error) {
        showNotification('Page initialization failed: ' + error.message, 'error');
    }
});

// Missing functions that are called from HTML
function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function closeCommentsModal() {
    const modal = document.getElementById('commentsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function closeAccountDashboard() {
    const modal = document.getElementById('accountDashboardModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function closeInstagramCommentModal() {
    const modal = document.getElementById('instagramCommentModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function syncDrive() {
    showNotification('Drive sync feature coming soon!', 'info');
}

function backupData() {
    showNotification('Backup feature coming soon!', 'info');
}

function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
        localStorage.clear();
        posts = [];
        renderPosts();
        showNotification('All data cleared successfully!', 'success');
    }
}

function adminSyncDrive() {
    showNotification('Admin drive sync feature coming soon!', 'info');
}

function adminBackupData() {
    showNotification('Admin backup feature coming soon!', 'info');
}

function exportData() {
    showNotification('Export feature coming soon!', 'info');
}

function importData() {
    showNotification('Import feature coming soon!', 'info');
}

function addComment() {
    showNotification('Comment feature coming soon!', 'info');
}

function saveDashboardProfile() {
    showNotification('Dashboard profile save feature coming soon!', 'info');
}

function addInstagramComment() {
    showNotification('Instagram comment feature coming soon!', 'info');
}

// Navigation functions for X-style bottom nav
function focusPostInput() {
    const postInput = document.getElementById('postInput');
    if (postInput) {
        postInput.focus();
        postInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function navigateToHome() {
    // Scroll to top of the page
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Update active state if needed
    const navItems = document.querySelectorAll('.x-nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    // Find home button and make it active
    const homeButton = document.querySelector('.x-nav-item:nth-child(2)');
    if (homeButton) {
        homeButton.classList.add('active');
    }
}


// Make functions globally available
window.openGifModal = openGifModal;
window.closeGifModal = closeGifModal;
window.searchGifs = searchGifs;
window.selectGif = selectGif;
window.removeSelectedGif = removeSelectedGif;
window.toggleLike = toggleLike;
window.showComments = showComments;
window.addComment = addComment;
window.sharePost = sharePost;
window.createPost = createPost;
window.searchTag = searchTag;
window.triggerImageUpload = triggerImageUpload;
window.handleImageUpload = handleImageUpload;
window.removeSelectedMedia = removeSelectedMedia;
window.toggleHamburgerMenu = toggleHamburgerMenu;
window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;
window.saveProfile = saveProfile;
window.openAdminModal = openAdminModal;
window.openSettingsModal = openSettingsModal;
window.openAccountDashboard = openAccountDashboard;
window.logout = logout;
window.openMail = openMail;
window.closeSettingsModal = closeSettingsModal;
window.closeCommentsModal = closeCommentsModal;
window.closeAccountDashboard = closeAccountDashboard;
window.closeInstagramCommentModal = closeInstagramCommentModal;
window.syncDrive = syncDrive;
window.backupData = backupData;
window.clearAllData = clearAllData;
window.adminSyncDrive = adminSyncDrive;
window.adminBackupData = adminBackupData;
window.exportData = exportData;
window.importData = importData;
window.saveDashboardProfile = saveDashboardProfile;
window.addInstagramComment = addInstagramComment;
window.focusPostInput = focusPostInput;
window.navigateToHome = navigateToHome;
window.showComments = showComments;
window.addComment = addComment;
window.renderComments = renderComments;
window.instagramComment = instagramComment;
window.addInstagramComment = addInstagramComment;
window.closeInstagramCommentModal = closeInstagramCommentModal;
window.instagramLike = instagramLike;
window.instagramShare = instagramShare;

// Twitter Profile Functions
window.openTwitterProfile = openTwitterProfile;
window.closeTwitterProfile = closeTwitterProfile;
window.switchTwitterTab = switchTwitterTab;
window.openTwitterProfileEdit = openTwitterProfileEdit;
window.closeTwitterProfileEdit = closeTwitterProfileEdit;
window.saveTwitterProfile = saveTwitterProfile;
window.triggerAvatarUpload = triggerAvatarUpload;
window.triggerCoverUpload = triggerCoverUpload;


console.log('=== MOBILE SCRIPT LOADING END ==='); 

// Comment functions (exactly like PC version)
function renderComments(comments) {
    const commentsList = document.getElementById('commentsList');
    if (!commentsList) {
        console.error('Comments list element not found');
        return;
    }
    
    if (!comments || comments.length === 0) {
        commentsList.innerHTML = '<div class="empty-comments">No comments yet. Be the first to comment!</div>';
        return;
    }
    
    commentsList.innerHTML = comments.map(comment => `
        <div class="comment">
            <img src="${comment.avatar || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 120 120'%3E%3Ccircle cx='60' cy='60' r='60' fill='%2325D366'/%3E%3Cpath d='M60 70c-13.255 0-40 6.627-40 20v10h80v-10c0-13.373-26.745-20-40-20zm0-10c8.837 0 16-7.163 16-16s-7.163-16-16-16-16 7.163-16 16 7.163 16 16 16z' fill='%23fff'/%3E%3C/svg%3E"}" alt="Profile" class="comment-avatar">
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author">${comment.author}</span>
                    <span class="comment-username">@${comment.username}</span>
                    <span class="comment-time">${getTimeAgo(comment.timestamp)}</span>
                </div>
                <div class="comment-text">${escapeHtml(comment.content)}</div>
            </div>
        </div>
    `).join('');
}

async function addComment() {
    const commentInput = document.getElementById('commentInput');
    const content = commentInput.value.trim();
    if (!content) return;
    
    const user = getCurrentUserForPost(false);
    const comment = {
        author: user.displayName,
        username: user.username,
        avatar: user.avatar,
        content,
        timestamp: new Date().toISOString()
    };
    
    try {
        await saveCommentToFirestore(currentPostId.toString(), comment);
        const comments = await fetchCommentsFromFirestore(currentPostId.toString());
        renderComments(comments);
        commentInput.value = '';
        showNotification('Comment added!', 'success');
    } catch (e) {
        console.error('Error adding comment:', e);
        showNotification('Failed to add comment.', 'error');
    }
}

async function fetchCommentsFromFirestore(postId) {
    try {
        if (!db) {
            console.warn('Firestore not initialized');
            return [];
        }
        
        const commentsSnapshot = await db.collection("posts").doc(postId).collection("comments").orderBy("timestamp", "desc").get();
        const comments = [];
        
        commentsSnapshot.forEach(doc => {
            comments.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return comments;
    } catch (error) {
        console.error('Error fetching comments from Firestore:', error);
        return [];
    }
}

async function saveCommentToFirestore(postId, comment) {
    try {
        if (!db) {
            console.warn('Firestore not initialized');
            return;
        }
        
        await db.collection("posts").doc(postId).collection("comments").add(comment);
        console.log('Comment saved to Firestore');
    } catch (error) {
        console.error('Error saving comment to Firestore:', error);
        throw error;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Instagram-style comment functions
let currentInstagramPostId = null;

function instagramComment(postId) {
    currentInstagramPostId = postId;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    // Populate the Instagram comment modal
    const modal = document.getElementById('instagramCommentModal');
    const postContainer = document.getElementById('instagramCommentPost');
    
    postContainer.innerHTML = `
        <div class="instagram-comment-post-header">
                            <img src="${post.avatar || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 120 120'%3E%3Ccircle cx='60' cy='60' r='60' fill='%2325D366'/%3E%3Cpath d='M60 70c-13.255 0-40 6.627-40 20v10h80v-10c0-13.373-26.745-20-40-20zm0-10c8.837 0 16-7.163 16-16s-7.163-16-16-16-16 7.163-16 16 7.163 16 16 16z' fill='%23fff'/%3E%3C/svg%3E"}" alt="Profile" class="instagram-comment-post-avatar">
            <div class="instagram-comment-post-author">${post.isAnonymous ? 'Anonymous' : post.author}</div>
        </div>
        <div class="instagram-comment-post-content">${post.content}</div>
        ${post.media ? `<div class="instagram-comment-post-media"><img src="${post.media}" alt="Post media" style="max-width: 100%; border-radius: 8px;"></div>` : ''}
        <div class="instagram-comment-post-actions">
            <button class="instagram-action-btn ${post.isLiked ? 'liked' : ''}" onclick="instagramLike('${post.id}')">
                <svg viewBox="0 0 24 24" fill="${post.isLiked ? '#e31b23' : 'currentColor'}">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
            </button>
            <button class="instagram-action-btn" onclick="instagramComment('${post.id}')">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21.99 4c0-1.1-.89-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                </svg>
            </button>
            <button class="instagram-action-btn" onclick="instagramShare('${post.id}')">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
                </svg>
            </button>
        </div>
    `;
    
    // Load comments
    loadInstagramComments(postId);
    
    // Show modal
    modal.style.display = 'flex';
}

async function loadInstagramComments(postId) {
    try {
        const comments = await fetchCommentsFromFirestore(postId);
        const commentsList = document.getElementById('instagramCommentsList');
        
        if (comments.length === 0) {
            commentsList.innerHTML = '<div style="text-align: center; color: #8e8e93; padding: 20px;">No comments yet. Be the first to comment!</div>';
            return;
        }
        
        commentsList.innerHTML = comments.map(comment => `
            <div class="instagram-comment-item">
                <img src="${comment.avatar || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 120 120'%3E%3Ccircle cx='60' cy='60' r='60' fill='%2325D366'/%3E%3Cpath d='M60 70c-13.255 0-40 6.627-40 20v10h80v-10c0-13.373-26.745-20-40-20zm0-10c8.837 0 16-7.163 16-16s-7.163-16-16-16-16 7.163-16 16 7.163 16 16 16z' fill='%23fff'/%3E%3C/svg%3E"}" alt="Profile" class="instagram-comment-avatar">
                <div class="instagram-comment-content">
                    <div class="instagram-comment-author">${comment.author}</div>
                    <div class="instagram-comment-text">${comment.content}</div>
                    <div class="instagram-comment-time">${getTimeAgo(comment.timestamp)}</div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading Instagram comments:', error);
        document.getElementById('instagramCommentsList').innerHTML = '<div style="text-align: center; color: #8e8e93; padding: 20px;">Error loading comments</div>';
    }
}

async function addInstagramComment() {
    const input = document.getElementById('instagramCommentInput');
    const content = input.value.trim();
    
    if (!content || !currentInstagramPostId) return;
    
    const comment = {
        content: content,
        author: currentUser.displayName || 'Anonymous',
        username: currentUser.username || 'anonymous',
        avatar: currentUser.avatar,
        timestamp: new Date().toISOString()
    };
    
    try {
        // Save to Firestore
        await db.collection("posts").doc(currentInstagramPostId).collection("comments").add(comment);
        
        // Clear input
        input.value = '';
        
        // Reload comments
        await loadInstagramComments(currentInstagramPostId);
        
        // Update post comment count
        const post = posts.find(p => p.id === currentInstagramPostId);
        if (post) {
            if (!post.comments) post.comments = [];
            post.comments.push(comment);
            await updatePostInFirestore(post);
            renderPosts();
        }
        
        showNotification('Comment added!', 'success');
    } catch (error) {
        console.error('Error adding comment:', error);
        showNotification('Failed to add comment', 'error');
    }
}

function closeInstagramCommentModal() {
    document.getElementById('instagramCommentModal').style.display = 'none';
    currentInstagramPostId = null;
    document.getElementById('instagramCommentInput').value = '';
}

function instagramLike(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post || !currentUser || !currentUser.username) return;
    if (!post.likedBy) post.likedBy = [];
    const userIndex = post.likedBy.indexOf(currentUser.username);
    if (userIndex !== -1) {
        // Unlike
        post.likedBy.splice(userIndex, 1);
    } else {
        // Like
        post.likedBy.push(currentUser.username);
    }
    // Update in Firestore
    updatePostInFirestore(post);
    // Re-render posts
    renderPosts();
}

function instagramShare(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    const shareText = `${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}`;
    const shareUrl = window.location.href;
    
    if (navigator.share) {
        navigator.share({
            title: 'TIGPS TALKS',
            text: shareText,
            url: shareUrl
        });
    } else {
        // Fallback: copy to clipboard
        const textToCopy = `${shareText}\n\n${shareUrl}`;
        navigator.clipboard.writeText(textToCopy).then(() => {
            showNotification('Link copied to clipboard!', 'success');
        }).catch(() => {
            showNotification('Failed to copy link', 'error');
        });
    }
} 

// Twitter/X-style Profile Dashboard Functions
// Functions are now defined at the top of the file for immediate global access

function loadTwitterProfileData() {
    console.log('loadTwitterProfileData called');
    console.log('currentUser:', currentUser);
    
    // Load user profile data
    const nameElement = document.getElementById('twitterProfileName');
    const usernameElement = document.getElementById('twitterProfileUsername');
    const bioElement = document.getElementById('twitterProfileBio');
    
    console.log('Elements found:', { nameElement, usernameElement, bioElement });
    
    if (nameElement) nameElement.textContent = currentUser.displayName || 'User';
    if (usernameElement) usernameElement.textContent = '@' + (currentUser.username || 'user');
    if (bioElement) bioElement.textContent = currentUser.bio || 'No bio yet.';
    
    // Update avatar
    const avatar = document.getElementById('twitterProfileAvatar');
    if (avatar) {
        avatar.src = currentUser.avatar || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"%3E%3Ccircle cx="60" cy="60" r="60" fill="%2325D366"/%3E%3Cpath d="M60 70c-13.255 0-40 6.627-40 20v10h80v-10c0-13.373-26.745-20-40-20zm0-10c8.837 0 16-7.163 16-16s-7.163-16-16-16-16 7.163-16 16 7.163 16 16 16z" fill="%23fff"/%3E%3C/svg%3E';
    }
    
    // Update stats
    updateTwitterStats();
}

function updateTwitterStats() {
    // Count user's posts
    const userPosts = posts.filter(post => post.username === currentUser.username);
    document.getElementById('twitterPostsCount').textContent = userPosts.length;
    
    // For now, set following/followers to 0 (can be implemented later)
    document.getElementById('twitterFollowingCount').textContent = '0';
    document.getElementById('twitterFollowersCount').textContent = '0';
}

function loadTwitterPosts() {
    const container = document.getElementById('twitterPostsContainer');
    const userPosts = posts.filter(post => post.username === currentUser.username);
    
    if (userPosts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No posts yet</h3>
                <p>When you post, it'll show up here.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = userPosts.map(post => createTwitterPostElement(post)).join('');
}

function createTwitterPostElement(post) {
    const timeAgo = getTimeAgo(post.timestamp);
    const mediaHtml = post.media ? `
        <div class="twitter-post-media">
            <img src="${post.media}" alt="Post media">
        </div>
    ` : '';
    
    return `
        <div class="twitter-post" data-post-id="${post.id}">
            <div class="twitter-post-header">
                <img src="${post.avatar || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"%3E%3Ccircle cx="60" cy="60" r="60" fill="%2325D366"/%3E%3Cpath d="M60 70c-13.255 0-40 6.627-40 20v10h80v-10c0-13.373-26.745-20-40-20zm0-10c8.837 0 16-7.163 16-16s-7.163-16-16-16-16 7.163-16 16 7.163 16 16 16z" fill="%23fff"/%3E%3C/svg%3E'}" alt="Profile" class="twitter-post-avatar">
                <div class="twitter-post-info">
                    <div class="twitter-post-author">${post.isAnonymous ? 'Anonymous' : post.author}</div>
                    <div class="twitter-post-username">@${post.username}</div>
                    <span class="twitter-post-time">${timeAgo}</span>
                </div>
            </div>
            <div class="twitter-post-content">${escapeHtml(post.content)}</div>
            ${mediaHtml}
            <div class="twitter-post-actions">
                <div class="twitter-post-action comment" onclick="instagramComment('${post.id}')">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.96-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"/>
                    </svg>
                    <span>${post.comments ? post.comments.length : 0}</span>
                </div>
                <div class="twitter-post-action retweet">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46L19 15.55V8c0-1.1-.896-2-2-2z"/>
                    </svg>
                    <span>0</span>
                </div>
                <div class="twitter-post-action like ${post.isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}')">
                    <svg viewBox="0 0 24 24" fill="${post.isLiked ? '#f91880' : 'currentColor'}">
                        <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"/>
                    </svg>
                    <span>${post.likes || 0}</span>
                </div>
                <div class="twitter-post-action share" onclick="instagramShare('${post.id}')">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z"/>
                    </svg>
                </div>
            </div>
        </div>
    `;
}

function switchTwitterTab(tab) {
    // Update navigation
    const navItems = document.querySelectorAll('.twitter-nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    const activeNavItem = document.querySelector(`.twitter-nav-item[onclick*="${tab}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    // Hide all containers
    const containers = [
        'twitterPostsContainer',
        'twitterRepliesContainer', 
        'twitterMediaContainer',
        'twitterLikesContainer'
    ];
    
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = 'none';
        }
    });
    
    // Show selected container
    const selectedContainer = document.getElementById(`twitter${tab.charAt(0).toUpperCase() + tab.slice(1)}Container`);
    if (selectedContainer) {
        selectedContainer.style.display = 'block';
    }
    
    // Load content based on tab
    switch(tab) {
        case 'posts':
            loadTwitterPosts();
            break;
        case 'replies':
            // Load replies (can be implemented later)
            break;
        case 'media':
            loadTwitterMedia();
            break;
        case 'likes':
            loadTwitterLikes();
            break;
    }
}

function loadTwitterMedia() {
    const container = document.getElementById('twitterMediaContainer');
    const userPosts = posts.filter(post => post.username === currentUser.username && (post.media || post.gif));
    
    if (userPosts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No media yet</h3>
                <p>When you post media, it'll show up here.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = userPosts.map(post => createTwitterPostElement(post)).join('');
}

function loadTwitterLikes() {
    const container = document.getElementById('twitterLikesContainer');
    const likedPosts = posts.filter(post => post.likedBy && post.likedBy.includes(currentUser.username));
    
    if (likedPosts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No likes yet</h3>
                <p>Posts you like will show up here.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = likedPosts.map(post => createTwitterPostElement(post)).join('');
}

// Profile Edit Functions
function openTwitterProfileEdit() {
    const modal = document.getElementById('twitterProfileEditModal');
    if (modal) {
        // Populate form with current data
        document.getElementById('twitterEditName').value = currentUser.displayName || '';
        document.getElementById('twitterEditUsername').value = currentUser.username || '';
        document.getElementById('twitterEditBio').value = currentUser.bio || '';
        document.getElementById('twitterEditLocation').value = currentUser.location || '';
        document.getElementById('twitterEditWebsite').value = currentUser.website || '';
        
        modal.style.display = 'flex';
    }
}

function closeTwitterProfileEdit() {
    const modal = document.getElementById('twitterProfileEditModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function saveTwitterProfile() {
    const name = document.getElementById('twitterEditName').value.trim();
    const username = document.getElementById('twitterEditUsername').value.trim();
    const bio = document.getElementById('twitterEditBio').value.trim();
    const location = document.getElementById('twitterEditLocation').value.trim();
    const website = document.getElementById('twitterEditWebsite').value.trim();
    
    if (!name || !username) {
        showNotification('Name and username are required.', 'error');
        return;
    }
    
    // Update current user
    currentUser.displayName = name;
    currentUser.username = username;
    currentUser.bio = bio;
    currentUser.location = location;
    currentUser.website = website;
    
    try {
        // Save to Firestore if available
        if (typeof saveProfileToFirestore === 'function') {
            await saveProfileToFirestore(currentUser);
        } else {
            // Fallback: save to localStorage
            localStorage.setItem('tigpsUserProfile', JSON.stringify(currentUser));
        }
        
        // Update UI
        loadTwitterProfileData();
        closeTwitterProfileEdit();
        showNotification('Profile updated successfully!', 'success');
    } catch (error) {
        console.error('Error saving profile:', error);
        showNotification('Failed to update profile.', 'error');
    }
}

// Upload Functions
function triggerAvatarUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = handleAvatarUpload;
    input.click();
}

function triggerCoverUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = handleCoverUpload;
    input.click();
}

function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        showNotification('Image size must be less than 5MB.', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        currentUser.avatar = e.target.result;
        document.getElementById('twitterProfileAvatar').src = e.target.result;
        showNotification('Avatar updated!', 'success');
    };
    reader.readAsDataURL(file);
}

function handleCoverUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        showNotification('Image size must be less than 5MB.', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('twitterCoverImage').src = e.target.result;
        showNotification('Cover image updated!', 'success');
    };
    reader.readAsDataURL(file);
} 

// Make Twitter Profile functions globally available
window.openTwitterProfile = openTwitterProfile;
window.closeTwitterProfile = closeTwitterProfile;
window.switchTwitterTab = switchTwitterTab;
window.openTwitterProfileEdit = openTwitterProfileEdit;
window.closeTwitterProfileEdit = closeTwitterProfileEdit;
window.saveTwitterProfile = saveTwitterProfile;
window.triggerAvatarUpload = triggerAvatarUpload;
window.triggerCoverUpload = triggerCoverUpload;
window.handleAvatarUpload = handleAvatarUpload;
window.handleCoverUpload = handleCoverUpload; 

// --- Profile Feature Coming Soon Popup (Mobile) ---
function showProfileComingSoon() {
    alert('Profile feature coming soon.');
}

document.addEventListener('DOMContentLoaded', function() {
    // Sidebar profile item
    const sidebarProfile = document.querySelector('.sidebar-item[onclick*="profile-dashboard.html"]');
    if (sidebarProfile) {
        sidebarProfile.onclick = function(e) {
            e.stopPropagation();
            showProfileComingSoon();
            return false;
        };
    }
    // Bottom nav profile icon
    const navItems = document.querySelectorAll('.x-bottom-nav .x-nav-item');
    navItems.forEach(item => {
        // Look for SVG or avatar inside
        if (item.innerHTML.includes('profile-dashboard.html')) {
            item.onclick = function(e) {
                e.stopPropagation();
                showProfileComingSoon();
                return false;
            };
        }
    });
});

// Fix anonymous checkbox toggle (mobile)
document.addEventListener('DOMContentLoaded', function() {
    const anonCheck = document.getElementById('anonymousCheck');
    if (anonCheck) {
        anonCheck.onclick = function(e) {
            anonCheck.checked = !anonCheck.checked;
        };
    }
});