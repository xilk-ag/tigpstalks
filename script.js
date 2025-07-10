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
let gapiReady = false;

// Firebase config and Firestore initialization
const firebaseConfig = {
  apiKey: "AIzaSyBMTZlitQGyqNx3LO0cNiITBpBHMec8rN8",
  authDomain: "xilk-tigps.firebaseapp.com",
  projectId: "xilk-tigps",
  storageBucket: "xilk-tigps.firebasestorage.app",
  messagingSenderId: "242470054512",
  appId: "1:242470054512:web:47b3aed365f6534c8aa2b5",
  measurementId: "G-LNH8BXWW83"
};
if (!window.firebase.apps.length) {
  window.firebase.initializeApp(firebaseConfig);
}
const db = window.firebase.firestore();

// Firestore CRUD for posts
async function fetchPostsFromFirestore() {
  try {
    console.log('Starting fetchPostsFromFirestore...');
    const postsCol = db.collection("posts");
    console.log('Posts collection reference:', postsCol);
    
    const postSnapshot = await postsCol.get();
    console.log('Post snapshot:', postSnapshot);
    console.log('Snapshot empty:', postSnapshot.empty);
    console.log('Snapshot size:', postSnapshot.size);
    
    const postsArr = postSnapshot.docs.map(doc => {
      const data = doc.data();
      console.log('Document ID:', doc.id, 'Data:', data);
      return { id: doc.id, ...data };
    });
    
    console.log('Final posts array:', postsArr);
    return postsArr;
  } catch (error) {
    console.error('Error in fetchPostsFromFirestore:', error);
    return [];
  }
}
async function savePostToFirestore(post) {
  await db.collection("posts").add(post);
}
// Firestore CRUD for profiles
async function fetchProfileFromFirestore(username) {
  const profileRef = db.collection("profiles").doc(username);
  const profileSnap = await profileRef.get();
  return profileSnap.exists ? profileSnap.data() : null;
}
async function saveProfileToFirestore(profile) {
  await db.collection("profiles").doc(profile.username).set(profile);
}
// Firestore CRUD for comments
async function fetchCommentsFromFirestore(postId) {
  const commentsCol = db.collection("posts").doc(postId).collection("comments");
  const commentSnapshot = await commentsCol.orderBy("timestamp", "asc").get();
  return commentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
async function saveCommentToFirestore(postId, comment) {
  await db.collection("posts").doc(postId).collection("comments").add(comment);
}

// Initialize app with Firestore
async function initializeAppData() {
  try {
    console.log('Initializing app with Firestore...');
    posts = await fetchPostsFromFirestore();
    console.log('Posts loaded from Firestore:', posts.length, posts);
    renderPosts();
    addDebugPanel(); // Add debug panel
    
    // Load user profile if logged in
    const user = localStorage.getItem('tigpsUser');
    if (user) {
      const { username } = JSON.parse(user);
      const profile = await fetchProfileFromFirestore(username);
      if (profile) {
        currentUser = { ...currentUser, ...profile };
        updateProfileDisplay();
      }
    }
    console.log('App initialization complete');
  } catch (e) {
    console.error('App initialization error:', e);
    showNotification('Failed to load data from Firestore. ' + e.message, 'error');
  }
}

// Add post using Firestore
addPost = async function(content, isAnonymous, media) {
  const user = getCurrentUserForPost(isAnonymous);
  const timestamp = new Date().toISOString();
  const post = {
    content,
    author: user.displayName,
    username: user.username,
    avatar: user.avatar,
    isAnonymous: isAnonymous ? 1 : 0,
    media,
    timestamp
  };
  try {
    await savePostToFirestore(post);
    posts = await fetchPostsFromFirestore();
    renderPosts();
    showNotification('Post created!', 'success');
  } catch (e) {
    showNotification('Failed to create post.', 'error');
  }
};

// Save profile using Firestore
saveProfile = async function() {
  const displayName = document.getElementById('profileDisplayName').value.trim();
  const username = document.getElementById('profileUsername').value.trim();
  const bio = document.getElementById('profileBio').value.trim();
  const location = document.getElementById('profileLocation').value.trim();
  const avatar = currentUser.avatar;
  const profile = { displayName, username, bio, location, avatar };
  try {
    await saveProfileToFirestore(profile);
    currentUser = { ...currentUser, ...profile };
    localStorage.setItem('tigpsUser', JSON.stringify(currentUser));
    updateProfileDisplay();
    closeProfileModal();
    showNotification('Profile saved!', 'success');
  } catch (e) {
    showNotification('Failed to save profile.', 'error');
  }
};

// Show comments using Firestore
showComments = async function(postId) {
  currentPostId = postId;
  try {
    const comments = await fetchCommentsFromFirestore(postId);
    renderComments(comments);
    commentsModal.style.display = 'block';
  } catch (e) {
    showNotification('Failed to load comments.', 'error');
  }
};

// Add comment using Firestore
addComment = async function() {
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
    await saveCommentToFirestore(currentPostId, comment);
    const comments = await fetchCommentsFromFirestore(currentPostId);
    renderComments(comments);
    commentInput.value = '';
  } catch (e) {
    showNotification('Failed to add comment.', 'error');
  }
};

// Save dashboard profile using Firestore
async function saveDashboardProfile() {
  const displayName = document.getElementById('dashboardDisplayName').value.trim();
  const username = document.getElementById('dashboardUsername').value.trim();
  const bio = document.getElementById('dashboardBio').value.trim();
  const location = document.getElementById('dashboardLocation').value.trim();
  const avatar = document.getElementById('dashboardProfilePic').src;
  const profile = { displayName, username, bio, location, avatar };
  try {
    await saveProfileToFirestore(profile);
    currentUser = { ...currentUser, ...profile };
    localStorage.setItem('tigpsUser', JSON.stringify(currentUser));
    updateProfileDisplay();
    closeAccountDashboard();
    showNotification('Profile saved!', 'success');
  } catch (e) {
    showNotification('Failed to save profile.', 'error');
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
                nextPostId = Math.max(...posts.map(p => p.id || 0), 0) + 1;
                nextCommentId = Math.max(...posts.flatMap(p => (p.comments || []).map(c => c.id || 0)), 0) + 1;
            } else {
                // Load sample data if no saved posts
                // loadSampleData(); // Removed sample data loading
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
            // showNotification('Google Drive not available. Using local storage.', 'warning'); // Removed Google Drive error popup
            // loadSampleData(); // Removed sample data loading
        }
    } catch (error) {
        console.error('Error initializing Google Drive:', error);
        // showNotification('Failed to initialize Google Drive. Using local storage.', 'warning'); // Removed Google Drive error popup
        // loadSampleData(); // Removed sample data loading
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
    const user = getCurrentUserForPost(isAnonymous);
    const post = {
        id: nextPostId++,
        content: content,
        author: user.displayName,
        username: user.username,
        avatar: user.avatar,
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
    const postsFeed = document.getElementById('postsFeed');
    if (!postsFeed) {
        console.error('postsFeed element not found');
        return;
    }
    
    console.log('Rendering posts:', posts.length, posts);
    
    postsFeed.innerHTML = '';
    
    if (!Array.isArray(posts) || posts.length === 0) {
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
        if (!post || typeof post !== 'object') {
            console.warn('Skipping invalid post:', post);
            return;
        }
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
    if (!file) {
        showNotification('No file selected.', 'error');
        return;
    }
    if (!file.type.startsWith('image/')) {
        showNotification('Please select a valid image file.', 'error');
        return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showNotification('Image is too large (max 5MB).', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        if (!e.target.result) {
            showNotification('Failed to read image file.', 'error');
            return;
        }
        currentUser.avatar = e.target.result;
        updateProfileDisplay();
        const profilePic = document.getElementById('profileEditPic');
        if (profilePic) profilePic.src = e.target.result;
    };
    reader.onerror = function() {
        showNotification('Error reading image file.', 'error');
    };
    reader.readAsDataURL(file);
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
  const userMenu = document.querySelector('.user-menu');
  const hamburgerMenu = document.querySelector('.hamburger-menu');
  
  if (menu.style.display === 'block') {
    menu.style.display = 'none';
    userMenu.classList.remove('active');
    hamburgerMenu.classList.remove('active');
  } else {
    menu.style.display = 'block';
    userMenu.classList.add('active');
    hamburgerMenu.classList.add('active');
  }
}

// Close menu when clicking outside
window.addEventListener('click', function(e) {
  const menu = document.getElementById('profileMenu');
  const userMenu = document.querySelector('.user-menu');
  const hamburgerMenu = document.querySelector('.hamburger-menu');
  
  if (!userMenu.contains(e.target) && !hamburgerMenu.contains(e.target)) {
    menu.style.display = 'none';
    userMenu.classList.remove('active');
    hamburgerMenu.classList.remove('active');
  }
});

// Fix profile modal opening
function openProfileModal() {
    console.log('Opening profile modal...');
    const displayNameInput = document.getElementById('profileDisplayName');
    const usernameInput = document.getElementById('profileUsername');
    const bioInput = document.getElementById('profileBio');
    const locationInput = document.getElementById('profileLocation');
    const profilePic = document.getElementById('profileEditPic');
    const profileModal = document.getElementById('profileModal');
    
    if (!displayNameInput || !usernameInput || !bioInput || !locationInput || !profilePic || !profileModal) {
        console.error('Profile modal elements not found:', {
            displayNameInput: !!displayNameInput,
            usernameInput: !!usernameInput,
            bioInput: !!bioInput,
            locationInput: !!locationInput,
            profilePic: !!profilePic,
            profileModal: !!profileModal
        });
        showNotification('Profile modal error: missing fields.', 'error');
        return;
    }
    
    displayNameInput.value = currentUser.displayName || '';
    usernameInput.value = currentUser.username || '';
    bioInput.value = currentUser.bio || '';
    locationInput.value = currentUser.location || '';
    profilePic.src = currentUser.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face';
    
    profileModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    console.log('Profile modal opened successfully');
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
    const headerPic = document.getElementById('headerProfilePic');
    const postCreatorAvatar = document.getElementById('postCreatorAvatar');
    const postCreatorName = document.getElementById('postCreatorName');
    const postCreatorDisplayName = document.getElementById('postCreatorDisplayName');
    const modalPostCreatorAvatar = document.getElementById('modalPostCreatorAvatar');
    const modalPostCreatorName = document.getElementById('modalPostCreatorName');
    const modalPostCreatorDisplayName = document.getElementById('modalPostCreatorDisplayName');
    const commentCreatorAvatar = document.getElementById('commentCreatorAvatar');
    if (headerPic) headerPic.src = currentUser.avatar || headerPic.src;
    if (postCreatorAvatar) postCreatorAvatar.src = currentUser.avatar || postCreatorAvatar.src;
    if (postCreatorName) postCreatorName.textContent = `@${currentUser.username || ''}`;
    if (postCreatorDisplayName) postCreatorDisplayName.textContent = currentUser.displayName || '';
    if (modalPostCreatorAvatar) modalPostCreatorAvatar.src = currentUser.avatar || modalPostCreatorAvatar.src;
    if (modalPostCreatorName) modalPostCreatorName.textContent = `@${currentUser.username || ''}`;
    if (modalPostCreatorDisplayName) modalPostCreatorDisplayName.textContent = currentUser.displayName || '';
    if (commentCreatorAvatar) commentCreatorAvatar.src = currentUser.avatar || commentCreatorAvatar.src;
}

// Admin functions
function openAdminModal() {
  const adminModal = document.getElementById('adminModal');
  if (adminModal) {
    adminModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    updateAdminStats();
    updateAdminDriveStatus();
  }
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
    if (!gapiReady) {
        showNotification('Google API not loaded yet. Please wait and try again.', 'error');
        return;
    }
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
        if (e && e.error === 'popup_blocked_by_browser') {
            showNotification('Popup blocked! Please allow popups for Google sign-in.', 'error');
        } else {
            showNotification('Google Drive sign-in failed.', 'error');
        }
        console.error('[GAPI] Sign-in failed:', e);
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
  const settingsModal = document.getElementById('settingsModal');
  if (settingsModal) {
    settingsModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }
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

// --- Simple Username Login Logic ---
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
    document.querySelector('.app').style.display = 'none';
}
function hideLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
    document.querySelector('.app').style.display = '';
}
function loginUser() {
    const displayName = document.getElementById('loginDisplayName').value.trim();
    const username = document.getElementById('loginUsername').value.trim();
    if (!displayName || !username) {
        showNotification('Please enter both display name and username.', 'error');
        return;
    }
    const avatar = currentUser.avatar; // Use default avatar
    const bio = currentUser.bio || '';
    const location = currentUser.location || '';
    const user = { displayName, username, avatar, bio, location };
    localStorage.setItem('tigpsUser', JSON.stringify(user));
    currentUser = { ...currentUser, ...user };
    updateProfileDisplay();
    hideLoginModal();
    showNotification('Logged in as ' + displayName, 'success');
}
function checkLogin() {
    const user = localStorage.getItem('tigpsUser');
    if (user) {
        currentUser = { ...currentUser, ...JSON.parse(user) };
        updateProfileDisplay();
        hideLoginModal();
    } else {
        showLoginModal();
    }
}
function logout() {
  localStorage.removeItem('tigpsUser');
  currentUser = {
    id: 1,
    displayName: "Alex Chen",
    username: "alexchen",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face",
    bio: "Computer Science student at TIGPS. Love coding and coffee! ☕",
    location: "TIGPS Campus"
  };
  updateProfileDisplay();
  showNotification('Logged out successfully!', 'success');
}
// Call checkLogin on DOMContentLoaded
const oldDOMContentLoaded = document.onreadystatechange;
document.addEventListener('DOMContentLoaded', function() {
    checkLogin();
    if (typeof oldDOMContentLoaded === 'function') oldDOMContentLoaded();
});
// Update post/profile creation to use currentUser
function getCurrentUserForPost(isAnonymous) {
    if (isAnonymous) {
        return {
            displayName: 'Anonymous',
            username: 'anonymous',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=48&h=48&fit=crop&crop=face',
        };
    }
    return {
        displayName: currentUser.displayName,
        username: currentUser.username,
        avatar: currentUser.avatar,
    };
}
// Patch addPost to use getCurrentUserForPost
const originalAddPost = addPost;
addPost = async function(content, isAnonymous, media) {
    const user = getCurrentUserForPost(isAnonymous);
    return originalAddPost.call(this, content, isAnonymous, media, user);
};
// Patch saveProfile to update localStorage
const originalSaveProfile = saveProfile;
saveProfile = async function() {
    await originalSaveProfile.apply(this, arguments);
    localStorage.setItem('tigpsUser', JSON.stringify(currentUser));
};

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

// Account Dashboard Modal logic
function openAccountDashboard(event) {
  event?.stopPropagation();
  // Fill fields with current user info
  document.getElementById('dashboardProfilePic').src = currentUser.avatar || '';
  document.getElementById('dashboardDisplayName').value = currentUser.displayName || '';
  document.getElementById('dashboardUsername').value = currentUser.username || '';
  document.getElementById('dashboardBio').value = currentUser.bio || '';
  document.getElementById('dashboardLocation').value = currentUser.location || '';
  // List user's own posts
  renderDashboardPosts();
  document.getElementById('accountDashboardModal').style.display = 'block';
  document.body.style.overflow = 'hidden';
}
function closeAccountDashboard() {
  document.getElementById('accountDashboardModal').style.display = 'none';
  document.body.style.overflow = 'auto';
}
function triggerDashboardProfilePicUpload() {
  document.getElementById('dashboardProfilePicUpload').click();
}
function handleDashboardProfilePicUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('dashboardProfilePic').src = e.target.result;
    currentUser.avatar = e.target.result;
  };
  reader.readAsDataURL(file);
}
async function saveDashboardProfile() {
  const displayName = document.getElementById('dashboardDisplayName').value.trim();
  const username = document.getElementById('dashboardUsername').value.trim();
  const bio = document.getElementById('dashboardBio').value.trim();
  const location = document.getElementById('dashboardLocation').value.trim();
  const avatar = document.getElementById('dashboardProfilePic').src;
  const profile = { displayName, username, bio, location, avatar };
  try {
    await saveProfileToFirestore({ ...profile, username });
    currentUser = { ...currentUser, ...profile };
    localStorage.setItem('tigpsUser', JSON.stringify(currentUser));
    updateProfileDisplay();
    closeAccountDashboard();
    showNotification('Profile saved!', 'success');
  } catch (e) {
    showNotification('Failed to save profile.', 'error');
  }
}
function renderDashboardPosts() {
  const dashboardPostsList = document.getElementById('dashboardPostsList');
  if (!dashboardPostsList) return;
  const userPosts = posts.filter(p => p.username === currentUser.username);
  if (userPosts.length === 0) {
    dashboardPostsList.innerHTML = '<div class="empty-state"><p>No posts yet.</p></div>';
    return;
  }
  dashboardPostsList.innerHTML = '';
  userPosts.forEach(post => {
    const div = document.createElement('div');
    div.className = 'post';
    div.style.marginBottom = '1rem';
    div.innerHTML = `
      <div class="post-content">${formatContent(post.content)}</div>
      <div class="post-time" style="font-size:0.85rem;color:#aaa;">${post.timestamp ? new Date(post.timestamp).toLocaleString() : ''}</div>
    `;
    dashboardPostsList.appendChild(div);
  });
} 

// Add debug panel to homepage
function addDebugPanel() {
  const postsFeed = document.getElementById('postsFeed');
  if (postsFeed) {
    const debugDiv = document.createElement('div');
    debugDiv.style.cssText = 'background: #f0f0f0; padding: 10px; margin: 10px 0; border: 1px solid #ccc; font-family: monospace; font-size: 12px;';
    debugDiv.innerHTML = `
      <strong>DEBUG INFO:</strong><br>
      Posts array length: ${posts ? posts.length : 'undefined'}<br>
      Posts array: ${JSON.stringify(posts, null, 2)}<br>
      <button onclick="refreshPosts()" style="margin-top: 5px;">Refresh Posts</button>
    `;
    postsFeed.appendChild(debugDiv);
  }
}

// Function to manually refresh posts
async function refreshPosts() {
  console.log('Manual refresh triggered...');
  posts = await fetchPostsFromFirestore();
  renderPosts();
  addDebugPanel();
} 