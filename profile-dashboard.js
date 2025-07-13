// Profile Dashboard JavaScript
console.log('=== PROFILE DASHBOARD SCRIPT LOADING ===');

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

// Fetch posts from Firestore
async function fetchPostsFromFirestore() {
    try {
        if (!db) {
            console.warn('Firestore not initialized, using localStorage fallback');
            const storedPosts = localStorage.getItem('tigpsPosts');
            return storedPosts ? JSON.parse(storedPosts) : [];
        }
        
        const snapshot = await db.collection('posts').orderBy('timestamp', 'desc').get();
        const posts = [];
        snapshot.forEach(doc => {
            posts.push({ id: doc.id, ...doc.data() });
        });
        return posts;
    } catch (error) {
        console.error('Error fetching posts from Firestore:', error);
        // Fallback to localStorage
        const storedPosts = localStorage.getItem('tigpsPosts');
        return storedPosts ? JSON.parse(storedPosts) : [];
    }
}

// Global variables
let posts = [];
let currentUser = {
    id: 1,
    displayName: "Alex Chen",
    username: "alexchen",
    avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Ccircle cx='60' cy='60' r='60' fill='%2325D366'/%3E%3Cpath d='M60 70c-13.255 0-40 6.627-40 20v10h80v-10c0-13.373-26.745-20-40-20zm0-10c8.837 0 16-7.163 16-16s-7.163-16-16-16-16 7.163-16 16 7.163 16 16 16z' fill='%23fff'/%3E%3C/svg%3E",
    bio: "Computer Science student at TIGPS. Love coding and coffee! ☕",
    location: "TIGPS Campus",
    website: "example.com"
};

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== PROFILE DASHBOARD INITIALIZATION ===');
    
    // Initialize Firebase first
    console.log('🔄 Initializing Firebase...');
    const firebaseInitialized = initializeFirebase();
    console.log('✓ Firebase initialization:', firebaseInitialized ? 'success' : 'failed');
    
    // Load user profile and posts
    loadUserProfile();
    loadUserPosts();
    updateStats();
    
    console.log('✓ Profile dashboard initialization completed');
});

// Navigation functions
function goBack() {
    // Check if we came from mobile or PC
    if (window.innerWidth <= 768) {
        window.location.href = 'mobile.html';
    } else {
        window.location.href = 'index.html';
    }
}

function switchTab(tab) {
    // Update navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    const activeNavItem = document.querySelector(`.nav-item[onclick*="${tab}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    // Hide all containers
    const containers = [
        'postsContainer',
        'repliesContainer', 
        'mediaContainer',
        'likesContainer'
    ];
    
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = 'none';
        }
    });
    
    // Show selected container
    const selectedContainer = document.getElementById(`${tab}Container`);
    if (selectedContainer) {
        selectedContainer.style.display = 'block';
    }
    
    // Load content based on tab
    switch(tab) {
        case 'posts':
            loadUserPosts();
            break;
        case 'replies':
            loadUserReplies();
            break;
        case 'media':
            loadUserMedia();
            break;
        case 'likes':
            loadUserLikes();
            break;
    }
}

// Profile functions
function loadUserProfile() {
    console.log('🔄 Loading user profile...');
    
    // Load user data from localStorage or use default
    const savedProfile = localStorage.getItem('tigpsUserProfile');
    if (savedProfile) {
        currentUser = { ...currentUser, ...JSON.parse(savedProfile) };
        console.log('✓ Profile loaded from localStorage');
    } else {
        console.log('✓ Using default profile data');
    }
    
    console.log('Current user data:', currentUser);
    
    // Update UI elements
    const elements = {
        profileName: document.getElementById('profileName'),
        profileUsername: document.getElementById('profileUsername'),
        profileBio: document.getElementById('profileBio'),
        profileLocation: document.getElementById('profileLocation'),
        profileWebsite: document.getElementById('profileWebsite'),
        profileAvatar: document.getElementById('profileAvatar')
    };
    
    // Check if elements exist
    Object.entries(elements).forEach(([key, element]) => {
        if (!element) {
            console.error(`❌ Element not found: ${key}`);
        }
    });
    
    // Update profile info
    if (elements.profileName) {
        elements.profileName.textContent = currentUser.displayName || 'User';
    }
    if (elements.profileUsername) {
        elements.profileUsername.textContent = '@' + (currentUser.username || 'user');
    }
    if (elements.profileBio) {
        elements.profileBio.textContent = currentUser.bio || 'No bio yet.';
    }
    if (elements.profileLocation) {
        elements.profileLocation.textContent = currentUser.location ? '📍 ' + currentUser.location : '';
    }
    
    if (currentUser.website && elements.profileWebsite) {
        elements.profileWebsite.innerHTML = `<a href="https://${currentUser.website}" target="_blank">🌐 ${currentUser.website}</a>`;
    } else if (elements.profileWebsite) {
        elements.profileWebsite.style.display = 'none';
    }
    
    // Update avatar
    if (elements.profileAvatar) {
        elements.profileAvatar.src = currentUser.avatar || 'data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Ccircle cx='60' cy='60' r='60' fill='%2325D366'/%3E%3Cpath d='M60 70c-13.255 0-40 6.627-40 20v10h80v-10c0-13.373-26.745-20-40-20zm0-10c8.837 0 16-7.163 16-16s-7.163-16-16-16-16 7.163-16 16 7.163 16 16 16z' fill='%23fff'/%3E%3C/svg%3E';
    }
    
    console.log('✓ Profile UI updated');
}

function updateStats() {
    // Count user's posts
    const userPosts = posts.filter(post => post.username === currentUser.username);
    document.getElementById('postsCount').textContent = userPosts.length;
    
    // For now, set following/followers to 0 (can be implemented later)
    document.getElementById('followingCount').textContent = '0';
    document.getElementById('followersCount').textContent = '0';
}

// Posts functions
async function loadUserPosts() {
    try {
        console.log('🔄 Loading user posts...');
        console.log('Current user:', currentUser);
        
        // Load posts from Firestore or localStorage
        posts = await fetchPostsFromFirestore();
        console.log('✓ Posts loaded:', posts.length);
        
        const userPosts = posts.filter(post => post.username === currentUser.username);
        console.log('✓ User posts found:', userPosts.length);
        
        const container = document.getElementById('postsContainer');
        if (!container) {
            console.error('❌ postsContainer element not found');
            return;
        }
        
        if (userPosts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No posts yet</h3>
                    <p>When you post, it'll show up here.</p>
                </div>
            `;
            console.log('✓ Empty state displayed');
            return;
        }
        
        container.innerHTML = userPosts.map(post => createPostElement(post)).join('');
        updateStats();
        console.log('✓ Posts rendered successfully');
    } catch (error) {
        console.error('❌ Error loading posts:', error);
        const container = document.getElementById('postsContainer');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>Error loading posts</h3>
                    <p>Please try refreshing the page.</p>
                </div>
            `;
        }
    }
}

function loadUserReplies() {
    // This can be implemented later when reply functionality is added
    console.log('Replies functionality coming soon');
}

function loadUserMedia() {
    const userPosts = posts.filter(post => post.username === currentUser.username && (post.media || post.gif));
    const container = document.getElementById('mediaContainer');
    
    if (userPosts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No media yet</h3>
                <p>When you post media, it'll show up here.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = userPosts.map(post => createPostElement(post)).join('');
}

function loadUserLikes() {
    const likedPosts = posts.filter(post => post.likedBy && post.likedBy.includes(currentUser.username));
    const container = document.getElementById('likesContainer');
    
    if (likedPosts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No likes yet</h3>
                <p>Posts you like will show up here.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = likedPosts.map(post => createPostElement(post)).join('');
}

function createPostElement(post) {
    const timeAgo = getTimeAgo(post.timestamp);
    const mediaHtml = post.media ? `
        <div class="post-media">
            <img src="${post.media}" alt="Post media">
        </div>
    ` : '';
    
    return `
        <div class="post" data-post-id="${post.id}">
            <div class="post-header">
                <img src="${post.avatar || 'data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Ccircle cx='60' cy='60' r='60' fill='%2325D366'/%3E%3Cpath d='M60 70c-13.255 0-40 6.627-40 20v10h80v-10c0-13.373-26.745-20-40-20zm0-10c8.837 0 16-7.163 16-16s-7.163-16-16-16-16 7.163-16 16 7.163 16 16 16z' fill='%23fff'/%3E%3C/svg%3E';
    }" alt="Profile" class="post-avatar">
                <div class="post-info">
                    <div class="post-author">${post.isAnonymous ? 'Anonymous' : post.author}</div>
                    <div class="post-username">@${post.username}</div>
                    <span class="post-time">${timeAgo}</span>
                </div>
            </div>
            <div class="post-content">${escapeHtml(post.content)}</div>
            ${mediaHtml}
            <div class="post-actions">
                <div class="post-action comment" onclick="showComments('${post.id}')">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.96-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"/>
                    </svg>
                    <span>${post.comments ? post.comments.length : 0}</span>
                </div>
                <div class="post-action like ${post.isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}')">
                    <svg viewBox="0 0 24 24" fill="${post.isLiked ? '#f91880' : 'currentColor'}">
                        <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"/>
                    </svg>
                    <span>${post.likes || 0}</span>
                </div>
                <div class="post-action share" onclick="sharePost('${post.id}')">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z"/>
                    </svg>
                </div>
            </div>
        </div>
    `;
}

// Edit profile functions
function openProfileEdit() {
    const modal = document.getElementById('profileEditModal');
    if (modal) {
        // Populate form with current data
        document.getElementById('editName').value = currentUser.displayName || '';
        document.getElementById('editUsername').value = currentUser.username || '';
        document.getElementById('editBio').value = currentUser.bio || '';
        document.getElementById('editLocation').value = currentUser.location || '';
        document.getElementById('editWebsite').value = currentUser.website || '';
        
        modal.style.display = 'flex';
    }
}

function closeProfileEdit() {
    const modal = document.getElementById('profileEditModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function saveProfile() {
    const name = document.getElementById('editName').value.trim();
    const username = document.getElementById('editUsername').value.trim();
    const bio = document.getElementById('editBio').value.trim();
    const location = document.getElementById('editLocation').value.trim();
    const website = document.getElementById('editWebsite').value.trim();
    
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
        // Save to localStorage
        localStorage.setItem('tigpsUserProfile', JSON.stringify(currentUser));
        
        // Update UI
        loadUserProfile();
        closeProfileEdit();
        showNotification('Profile updated successfully!', 'success');
    } catch (error) {
        console.error('Error saving profile:', error);
        showNotification('Failed to update profile.', 'error');
    }
}

// Upload functions
function triggerAvatarUpload() {
    document.getElementById('avatarUpload').click();
}

function triggerCoverUpload() {
    document.getElementById('coverUpload').click();
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
        document.getElementById('profileAvatar').src = e.target.result;
        localStorage.setItem('tigpsUserProfile', JSON.stringify(currentUser));
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
        document.getElementById('coverImage').src = e.target.result;
        showNotification('Cover image updated!', 'success');
    };
    reader.readAsDataURL(file);
}

// Utility functions
function getTimeAgo(date) {
    const now = new Date();
    const postDate = new Date(date);
    const diffInSeconds = Math.floor((now - postDate) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return Math.floor(diffInSeconds / 60) + 'm';
    if (diffInSeconds < 86400) return Math.floor(diffInSeconds / 3600) + 'h';
    if (diffInSeconds < 2592000) return Math.floor(diffInSeconds / 86400) + 'd';
    return Math.floor(diffInSeconds / 2592000) + 'mo';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    // Simple notification function
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 10000;
        font-family: Inter, sans-serif;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Post interaction functions (placeholder implementations)
function showComments(postId) {
    showNotification('Comments functionality coming soon!', 'info');
}

function toggleLike(postId) {
    showNotification('Like functionality coming soon!', 'info');
}

function sharePost(postId) {
    showNotification('Share functionality coming soon!', 'info');
}

// Make functions globally available
window.goBack = goBack;
window.switchTab = switchTab;
window.openProfileEdit = openProfileEdit;
window.closeProfileEdit = closeProfileEdit;
window.saveProfile = saveProfile;
window.triggerAvatarUpload = triggerAvatarUpload;
window.triggerCoverUpload = triggerCoverUpload;
window.handleAvatarUpload = handleAvatarUpload;
window.handleCoverUpload = handleCoverUpload;
window.showComments = showComments;
window.toggleLike = toggleLike;
window.sharePost = sharePost; 