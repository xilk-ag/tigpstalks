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
    displayName: "Alex Chen",
    username: "alexchen",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face",
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
                createPost();
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
            console.warn('Firestore not initialized, using localStorage fallback');
            const storedPosts = localStorage.getItem('tigpsPosts');
            return storedPosts ? JSON.parse(storedPosts) : [];
        }
        
        console.log('Starting fetchPostsFromFirestore...');
        const postsCol = db.collection("posts");
        console.log('Posts collection reference:', postsCol);
        
        const postSnapshot = await postsCol.orderBy("timestamp", "desc").get();
        console.log('Post snapshot:', postSnapshot);
        console.log('Snapshot empty:', postSnapshot.empty);
        console.log('Snapshot size:', postSnapshot.size);
        
        const postsArr = postSnapshot.docs.map(doc => {
            const data = doc.data();
            console.log('Document ID:', doc.id, 'Data:', data);
            // Ensure all required fields are present
            return {
                id: doc.id,
                content: data.content || '',
                author: data.author || 'Unknown',
                username: data.username || 'unknown',
                avatar: data.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=48&h=48&fit=crop&crop=face',
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
        
        console.log('Final posts array (sorted by date):', postsArr);
        return postsArr;
    } catch (error) {
        console.error('Error in fetchPostsFromFirestore:', error);
        // Fallback to localStorage
        const storedPosts = localStorage.getItem('tigpsPosts');
        return storedPosts ? JSON.parse(storedPosts) : [];
    }
}

async function savePostToFirestore(post) {
    try {
        if (!db) {
            console.warn('Firestore not initialized, using localStorage fallback');
            const storedPosts = localStorage.getItem('tigpsPosts');
            const posts = storedPosts ? JSON.parse(storedPosts) : [];
            post.id = Date.now().toString();
            posts.unshift(post);
            localStorage.setItem('tigpsPosts', JSON.stringify(posts));
            return true;
        }
        await db.collection("posts").add(post);
        console.log('✓ Post saved to Firestore');
        return true;
    } catch (error) {
        console.error('Error saving post to Firestore, using localStorage fallback:', error);
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
        showNotification('Please wait before posting again.', 'warning');
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
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face'
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
            <div class="post-actions">
                <button class="action-btn like-btn ${post.isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}')">
                    <span class="action-icon">❤️</span>
                    <span class="action-count">${post.likes}</span>
                </button>
                <button class="action-btn comment-btn" onclick="showComments('${post.id}')">
                    <span class="action-icon">💬</span>
                    <span class="action-count">${post.comments.length}</span>
                </button>
                <button class="action-btn share-btn" onclick="sharePost('${post.id}')">
                    <span class="action-icon">📤</span>
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
    const post = posts.find(p => p.id === postId);
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
    const post = posts.find(p => p.id === postId);
    if (post) {
        currentPostId = postId;
        showNotification('Comments feature coming soon!', 'info');
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
function triggerImageUpload() {
    const input = document.getElementById('imageUpload');
    if (input) {
        input.click();
    } else {
        // Fallback: create input if not found
        const newInput = document.createElement('input');
        newInput.type = 'file';
        newInput.accept = 'image/*';
        newInput.onchange = handleImageUpload;
        newInput.click();
    }
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        showNotification('Image size must be less than 5MB.', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        selectedMedia = e.target.result;
        updateMediaPreview(document.getElementById('mediaPreview'), selectedMedia);
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
            overlay.classList.remove('open');
        } else {
            sidebar.classList.add('open');
            overlay.classList.add('open');
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
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face",
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
        postButton.textContent = 'Posting...';
        
        setTimeout(() => {
            postCooldownActive = false;
            postButton.disabled = false;
            postButton.textContent = 'Post';
        }, 3000);
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
        console.log('✓ Posts loaded:', posts.length);
        
        // If no posts exist, create a test post
        if (posts.length === 0) {
            console.log('No posts found, creating test post...');
            const testPost = {
                content: "Welcome to TIGPS TALKS! This is a test post to get things started. 🎉",
                author: "TIGPS Team",
                username: "tigps_team",
                avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=48&h=48&fit=crop&crop=face",
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
            console.log('Test post created, posts now:', posts.length);
        }
        
        // Render posts
        renderPosts();
        console.log('✓ Posts rendered');
        
        // Update profile display
        updateProfileDisplay();
        console.log('✓ Profile display updated');
        
    } catch (error) {
        console.error('❌ Error initializing app data:', error);
        showNotification('Failed to initialize app: ' + error.message, 'error');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== MOBILE DOMContentLoaded START ===');
    try {
        // Initialize Firebase first
        console.log('🔄 Initializing Firebase...');
        const firebaseInitialized = initializeFirebase();
        console.log('✓ Firebase initialization:', firebaseInitialized ? 'success' : 'failed');
        
        checkAdminState();
        console.log('✓ Admin state checked');
        
        setupContentProtection();
        console.log('✓ Content protection setup');
        
        // Setup event listeners immediately
        console.log('🔄 Setting up event listeners...');
        setupEventListeners();
        console.log('✓ Event listeners setup completed');
        
        // Check username requirement
        console.log('🔄 Checking username requirement...');
        requireUsername();
        console.log('✓ Username requirement checked');
        
        // Initialize app data (loads posts)
        console.log('🔄 Starting initializeAppData...');
        initializeAppData().then(() => {
            console.log('✓ initializeAppData completed');
        }).catch(error => {
            console.error('❌ initializeAppData failed:', error);
            showNotification('App initialization failed: ' + error.message, 'error');
        });
        
        // Load posts after a short delay as backup
        setTimeout(async function() {
            console.log('🔄 Backup post loading...');
            try {
                posts = await fetchPostsFromFirestore();
                console.log('✓ Backup posts loaded:', posts.length);
                renderPosts();
                console.log('✓ Backup posts rendered');
            } catch (error) {
                console.error('❌ Backup post loading failed:', error);
                showNotification('Backup post loading failed: ' + error.message, 'error');
            }
        }, 2000);
        
        console.log('✓ DOMContentLoaded completed');
    } catch (error) {
        console.error('❌ DOMContentLoaded error:', error);
        showNotification('Page initialization failed: ' + error.message, 'error');
    }
    console.log('=== MOBILE DOMContentLoaded END ===');
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


console.log('=== MOBILE SCRIPT LOADING END ==='); 