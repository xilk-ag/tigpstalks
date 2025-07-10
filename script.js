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
        tags: data.tags || []
      };
    });
    
    console.log('Final posts array (sorted by date):', postsArr);
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
    
    // If no posts exist, create a test post
    if (posts.length === 0) {
      console.log('No posts found, creating test post...');
      const testPost = {
        content: "Welcome to TIGPS Social! This is a test post to get things started. 🎉",
        author: "TIGPS Team",
        username: "tigps_team",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=48&h=48&fit=crop&crop=face",
        isAnonymous: false,
        media: null,
        timestamp: new Date().toISOString(),
        likes: 5,
        comments: [],
        isLiked: false,
        tags: ["welcome", "test"]
      };
      await savePostToFirestore(testPost);
      posts = await fetchPostsFromFirestore();
      console.log('Test post created, posts now:', posts.length);
    }
    
    renderPosts();
    
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

// Enhanced addPost to ensure all fields are saved
addPost = async function(content, isAnonymous, media) {
  const user = getCurrentUserForPost(isAnonymous);
  const timestamp = new Date().toISOString();
  const tags = extractTags(content);
  
  console.log('addPost called with:', {
    content: content,
    isAnonymous: isAnonymous,
    media: media ? 'has media' : 'no media',
    mediaType: typeof media,
    mediaLength: media ? media.length : 0
  });
  
  const post = {
    content,
    author: user.displayName,
    username: user.username,
    avatar: user.avatar,
    isAnonymous: isAnonymous,
    media: media || null,
    timestamp,
    likes: 0,
    comments: [],
    isLiked: false,
    tags: tags
  };
  
  console.log('Post object to save:', {
    ...post,
    media: post.media ? 'data URL present' : 'no media'
  });
  
  try {
    console.log('Saving post to Firestore...');
    await savePostToFirestore(post);
    console.log('Post saved to Firestore, fetching updated posts...');
    posts = await fetchPostsFromFirestore();
    console.log('Posts fetched, rendering...');
    renderPosts();
    showNotification('Post created!', 'success');
  } catch (e) {
    console.error('Error creating post:', e);
    showNotification('Failed to create post: ' + e.message, 'error');
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
    await initializeAppData();
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
    // Post action buttons event delegation
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('post-action-btn')) {
            const postId = parseInt(e.target.getAttribute('data-post-id'));
            const action = e.target.getAttribute('data-action');
            
            switch(action) {
                case 'like':
                    toggleLike(postId);
                    break;
                case 'comment':
                    showComments(postId);
                    break;
                case 'share':
                    sharePost(postId);
                    break;
            }
        }
    });

    // Character count updates
    const postInput = document.getElementById('postInput');
    const modalPostInput = document.getElementById('modalPostInput');
    const commentInput = document.getElementById('commentInput');
    
    if (postInput) {
        postInput.addEventListener('input', function(e) {
            updateCharCount(e.target, document.getElementById('charCount'));
            autoResizeTextarea(e);
            detectTags(e);
        });
    }
    
    if (modalPostInput) {
        modalPostInput.addEventListener('input', function(e) {
            updateCharCount(e.target, document.getElementById('modalCharCount'));
            autoResizeTextarea(e);
            detectTags(e);
        });
    }
    
    if (commentInput) {
        commentInput.addEventListener('input', function(e) {
            autoResizeTextarea(e);
        });
    }

    // Enter key handlers
    if (postInput) {
        postInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.ctrlKey) {
                createPost();
            }
        });
    }
    
    if (modalPostInput) {
        modalPostInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.ctrlKey) {
                createPostFromModal();
            }
        });
    }
    
    if (commentInput) {
        commentInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.ctrlKey) {
                addComment();
            }
        });
    }

    // Admin password enter key
    const adminPassword = document.getElementById('adminPassword');
    if (adminPassword) {
        adminPassword.addEventListener('keydown', handleAdminPasswordEnter);
    }
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
    
    console.log('createPost called with:', {
        content: content,
        isAnonymous: isAnonymous,
        selectedMedia: selectedMedia ? 'has media' : 'no media',
        mediaType: selectedMedia ? typeof selectedMedia : 'none'
    });
    
    if (!content) {
        showNotification('Please enter some content for your post!', 'error');
        return;
    }
    
    console.log('Creating post with content:', content, 'isAnonymous:', isAnonymous, 'media:', selectedMedia);
    
    // Use the async addPost function
    addPost(content, isAnonymous, selectedMedia).then(() => {
        console.log('Post created successfully, clearing form...');
        postInput.value = '';
        postInput.style.height = 'auto';
        anonymousPost.checked = false;
        selectedMedia = null;
        updateMediaPreview(postMediaPreview, null);
    }).catch((error) => {
        console.error('Error in createPost:', error);
        showNotification('Failed to create post. Please try again.', 'error');
    });
}

// Create post from modal
function createPostFromModal() {
    const content = modalPostInput.value.trim();
    const isAnonymous = modalAnonymousPost.checked;
    
    if (!content) {
        showNotification('Please enter some content for your post!', 'error');
        return;
    }
    
    console.log('Creating modal post with content:', content, 'isAnonymous:', isAnonymous, 'media:', modalSelectedMedia);
    
    // Use the async addPost function
    addPost(content, isAnonymous, modalSelectedMedia).then(() => {
        modalPostInput.value = '';
        modalPostInput.style.height = 'auto';
        modalAnonymousPost.checked = false;
        modalSelectedMedia = null;
        updateMediaPreview(modalPostMediaPreview, null);
        closePostModal();
    }).catch((error) => {
        console.error('Error in createPostFromModal:', error);
        showNotification('Failed to create post. Please try again.', 'error');
    });
}

// Add new post
// This function is replaced by the Firestore version below

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
    
    // Ensure all required fields exist
    const safePost = {
        id: post.id || index,
        content: post.content || '',
        author: post.author || 'Unknown',
        username: post.username || 'unknown',
        avatar: post.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=48&h=48&fit=crop&crop=face',
        timestamp: post.timestamp || new Date().toISOString(),
        likes: post.likes || 0,
        comments: post.comments || [],
        isAnonymous: post.isAnonymous || false,
        isLiked: post.isLiked || false,
        media: post.media || null,
        tags: post.tags || []
    };
    
    const timeAgo = getTimeAgo(safePost.timestamp);
    const mediaHtml = safePost.media ? `
        <div class="post-media">
            ${safePost.media.includes('video') ? 
                `<video src="${safePost.media}" controls></video>` : 
                `<img src="${safePost.media}" alt="Post media">`
            }
        </div>
    ` : '';
    
    const tagsHtml = safePost.tags && safePost.tags.length > 0 ? `
        <div class="post-tags">
            ${safePost.tags.map(tag => `<span class="post-tag" onclick="searchTag('${tag}')">#${tag}</span>`).join('')}
        </div>
    ` : '';
    
    postDiv.innerHTML = `
        <div class="post-header">
            <img src="${safePost.avatar}" alt="${safePost.author}" class="post-avatar">
            <div class="post-info">
                ${safePost.isAnonymous ? 
                    '<div class="post-anonymous">Anonymous</div>' : 
                    `<div class="post-author">${safePost.author}</div>
                     <div class="post-username">@${safePost.username}</div>`
                }
                <div class="post-time">${timeAgo}</div>
            </div>
        </div>
        <div class="post-content">${formatContent(safePost.content)}</div>
        ${mediaHtml}
        ${tagsHtml}
        <div class="post-actions-bar">
            <div class="post-stats">
                <span>${safePost.likes} likes</span>
                <span>${safePost.comments.length} comments</span>
            </div>
            <div class="post-actions">
                <button class="post-action-btn ${safePost.isLiked ? 'liked' : ''}" data-post-id="${safePost.id}" data-action="like">
                    ${safePost.isLiked ? '❤️' : '🤍'} Like
                </button>
                <button class="post-action-btn" data-post-id="${safePost.id}" data-action="comment">
                    💬 Comment
                </button>
                <button class="post-action-btn" data-post-id="${safePost.id}" data-action="share">
                    📤 Share
                </button>
                ${isAdminLoggedIn ? `
                    <button class="post-action-btn" onclick="deletePost(${safePost.id})">
                        🗑️ Delete
                    </button>
                ` : ''}
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
    console.log('File selected:', file);
    
    if (!file) {
        showNotification('No file selected.', 'error');
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        showNotification('Please select a valid image file.', 'error');
        return;
    }
    
    // No file size limit - compression will handle any size
    console.log('File size:', file.size, 'bytes');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            // Compress the image before storing - no size limits, compression handles everything
            compressImage(e.target.result).then(compressedData => {
                selectedMedia = compressedData;
                console.log('Image compressed and uploaded for main post');
                updateMediaPreview(postMediaPreview, selectedMedia);
                showNotification('Image attached successfully!', 'success');
            }).catch(error => {
                console.error('Error compressing image:', error);
                showNotification('Error processing image: ' + error.message, 'error');
            });
        } catch (error) {
            console.error('Error processing image:', error);
            showNotification('Error processing image.', 'error');
        }
    };
    
    reader.onerror = function() {
        console.error('Error reading file:', reader.error);
        showNotification('Error reading image file.', 'error');
    };
    
    reader.readAsDataURL(file);
}

// For modal post creator, add GIF button logic
function triggerModalImageUpload() {
    document.getElementById('modalImageUpload').click();
}

function handleModalImageUpload(event) {
    const file = event.target.files[0];
    console.log('Modal file selected:', file);
    
    if (!file) {
        showNotification('No file selected.', 'error');
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        showNotification('Please select a valid image file.', 'error');
        return;
    }
    
    // No file size limit - compression will handle any size
    console.log('Modal file size:', file.size, 'bytes');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            // Compress the image before storing - no size limits, compression handles everything
            compressImage(e.target.result).then(compressedData => {
                modalSelectedMedia = compressedData;
                console.log('Image compressed and uploaded for modal post');
                updateMediaPreview(modalPostMediaPreview, modalSelectedMedia);
                showNotification('Image attached successfully!', 'success');
            }).catch(error => {
                console.error('Error compressing image:', error);
                showNotification('Error processing image: ' + error.message, 'error');
            });
        } catch (error) {
            console.error('Error processing image:', error);
            showNotification('Error processing image.', 'error');
        }
    };
    
    reader.onerror = function() {
        console.error('Error reading file:', reader.error);
        showNotification('Error reading image file.', 'error');
    };
    
    reader.readAsDataURL(file);
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
    console.log('updateMediaPreview called with:', {
        previewElement: previewElement ? previewElement.id : 'null',
        media: media ? 'has media' : 'no media',
        mediaType: typeof media
    });
    
    if (!previewElement) {
        console.error('Preview element not found');
        return;
    }
    
    if (media) {
        try {
            previewElement.innerHTML = `
                <div class="media-preview">
                    ${media.includes('data:video') ? 
                        `<video src="${media}" controls></video>` : 
                        `<img src="${media}" alt="Preview" style="max-width: 100%; max-height: 200px;">`
                    }
                    <button class="remove-media-btn" onclick="removeMedia('${previewElement.id}')">×</button>
                </div>
            `;
            previewElement.classList.add('has-media');
            console.log('Media preview updated successfully');
        } catch (error) {
            console.error('Error updating media preview:', error);
        }
    } else {
        previewElement.innerHTML = '';
        previewElement.classList.remove('has-media');
        console.log('Media preview cleared');
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
  console.log('toggleProfileMenu called');
  const menu = document.getElementById('profileMenu');
  const userMenu = document.querySelector('.user-menu');
  const hamburgerMenu = document.querySelector('.hamburger-menu');
  
  console.log('Elements found:', {
    menu: !!menu,
    userMenu: !!userMenu,
    hamburgerMenu: !!hamburgerMenu
  });
  
  if (menu.classList.contains('show')) {
    menu.classList.remove('show');
    userMenu.classList.remove('active');
    hamburgerMenu.classList.remove('active');
    console.log('Profile menu closed');
  } else {
    menu.classList.add('show');
    userMenu.classList.add('active');
    hamburgerMenu.classList.add('active');
    console.log('Profile menu opened');
  }
}

// Hamburger menu management
function toggleHamburgerMenu() {
  console.log('toggleHamburgerMenu called');
  const sidebar = document.getElementById('sidebarMenu');
  const overlay = document.getElementById('sidebarOverlay');
  const hamburgerMenu = document.getElementById('hamburgerMenu');
  
  console.log('Sidebar elements found:', {
    sidebar: !!sidebar,
    overlay: !!overlay,
    hamburgerMenu: !!hamburgerMenu
  });
  
  if (sidebar.classList.contains('open')) {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
    hamburgerMenu.classList.remove('active');
    console.log('Sidebar closed');
  } else {
    sidebar.classList.add('open');
    overlay.classList.add('show');
    hamburgerMenu.classList.add('active');
    console.log('Sidebar opened');
  }
}

// Close menu when clicking outside
window.addEventListener('click', function(e) {
  const menu = document.getElementById('profileMenu');
  const userMenu = document.querySelector('.user-menu');
  const hamburgerMenu = document.querySelector('.hamburger-menu');
  const sidebar = document.getElementById('sidebarMenu');
  const sidebarHamburger = document.getElementById('hamburgerMenu');
  
  // Close profile menu if clicking outside
  if (!userMenu.contains(e.target) && !hamburgerMenu.contains(e.target)) {
    menu.classList.remove('show');
    userMenu.classList.remove('active');
    hamburgerMenu.classList.remove('active');
  }
  
  // Close sidebar if clicking outside (but not on the hamburger menu itself)
  if (sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !sidebarHamburger.contains(e.target)) {
    toggleHamburgerMenu();
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

// Set admin by username
function setAdminByUsername(username) {
    if (!username) {
        showNotification('Please provide a username!', 'error');
        return;
    }
    
    // Remove @ if present
    const cleanUsername = username.replace('@', '');
    
    // Check if user exists in posts
    const userExists = posts.some(post => post.username === cleanUsername);
    
    if (!userExists) {
        showNotification(`User @${cleanUsername} not found in posts!`, 'error');
        return;
    }
    
    // Set admin
    currentUser.username = cleanUsername;
    isAdminLoggedIn = true;
    
    // Show admin dashboard
    document.getElementById('adminLoginSection').style.display = 'none';
    document.getElementById('adminDashboardSection').style.display = 'block';
    
    // Update UI
    updateProfileDisplay();
    showNotification(`Admin access granted to @${cleanUsername}!`, 'success');
    
    // Update admin stats
    updateAdminStats();
    updateAdminDriveStatus();
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

function handleAdminUsernameEnter(event) {
    if (event.key === 'Enter') {
        setAdminByUsername(document.getElementById('adminUsername').value);
    }
}

function handleAdminPasswordEnter(event) {
    if (event.key === 'Enter') {
        loginAdmin();
    }
}

function loginAdmin() {
    const username = document.getElementById('adminUsername').value;
    setAdminByUsername(username);
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
// addPost function is already defined with Firestore integration above
// Patch saveProfile to update localStorage
const originalSaveProfile = saveProfile;
saveProfile = async function() {
    await originalSaveProfile.apply(this, arguments);
    localStorage.setItem('tigpsUser', JSON.stringify(currentUser));
};

// Utility functions
function compressImage(dataUrl, maxWidth = 1200, maxHeight = 800) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Calculate new dimensions
            let { width, height } = img;
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw image
            ctx.drawImage(img, 0, 0, width, height);
            
            // Smart compression: start with high quality and reduce until it fits
            let quality = 0.9;
            let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            
            // Firestore document size limit is ~1MB, so we aim for ~800KB to be safe
            const maxSize = 800 * 1024; // 800KB
            
            console.log('Initial compression:', {
                originalSize: dataUrl.length,
                compressedSize: compressedDataUrl.length,
                quality: quality
            });
            
            // If still too large, reduce quality progressively
            while (compressedDataUrl.length > maxSize && quality > 0.1) {
                quality -= 0.1;
                compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                console.log('Reducing quality to', quality, 'Size:', compressedDataUrl.length);
            }
            
            // If still too large, reduce dimensions
            if (compressedDataUrl.length > maxSize) {
                console.log('Still too large, reducing dimensions...');
                let scaleFactor = 0.8;
                while (compressedDataUrl.length > maxSize && scaleFactor > 0.3) {
                    const newWidth = Math.floor(width * scaleFactor);
                    const newHeight = Math.floor(height * scaleFactor);
                    
                    canvas.width = newWidth;
                    canvas.height = newHeight;
                    ctx.drawImage(img, 0, 0, newWidth, newHeight);
                    
                    compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    console.log('Reduced dimensions to', newWidth, 'x', newHeight, 'Size:', compressedDataUrl.length);
                    scaleFactor -= 0.1;
                }
            }
            
            console.log('Final compression result:', {
                originalSize: dataUrl.length,
                finalSize: compressedDataUrl.length,
                compressionRatio: Math.round((1 - compressedDataUrl.length / dataUrl.length) * 100) + '%'
            });
            
            if (compressedDataUrl.length > maxSize) {
                reject(new Error('Image too large even after maximum compression'));
            } else {
                resolve(compressedDataUrl);
            }
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
}

function getTimeAgo(date) {
    // Convert string to Date object if needed
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now - dateObj) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return dateObj.toLocaleDateString();
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

// Delete post (admin only)
async function deletePost(postId) {
    if (!isAdminLoggedIn) {
        showNotification('Only admins can delete posts!', 'error');
        return;
    }
    
    const post = posts.find(p => p.id === postId);
    if (!post) {
        showNotification('Post not found!', 'error');
        return;
    }
    
    if (confirm(`Are you sure you want to delete this post by @${post.username}?`)) {
        const postIndex = posts.findIndex(p => p.id === postId);
        if (postIndex !== -1) {
            posts.splice(postIndex, 1);
            renderPosts();
            
            // Save to Firestore
            try {
                const db = firebase.firestore();
                await db.collection('posts').doc(postId.toString()).delete();
                showNotification('Post deleted successfully!', 'success');
            } catch (error) {
                console.error('Error deleting post from Firestore:', error);
                showNotification('Error deleting post from database!', 'error');
            }
        }
    }
} 