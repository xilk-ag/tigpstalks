// Emergency error handler - catch all errors
window.addEventListener('error', function(e) {
    console.error('EMERGENCY ERROR CAUGHT:', e.error);
    // Show fallback content on critical errors
    const fallback = document.getElementById('fallbackContent');
    if (fallback) {
        fallback.style.display = 'block';
        fallback.innerHTML = `
            <h2>🚨 JavaScript Error Detected</h2>
            <p>Error: ${e.error ? e.error.message : 'Unknown error'}</p>
            <button onclick="location.reload()" style="background:#667eea; color:white; border:none; padding:10px 20px; border-radius:8px; margin:10px; cursor:pointer;">🔄 Reload Page</button>
            <button onclick="debugFixEverything()" style="background:#00ff00; color:black; border:none; padding:10px 20px; border-radius:8px; margin:10px; cursor:pointer; font-weight:bold;">🔧 DEBUG FIX</button>
        `;
    }
});

// Emergency unhandled promise rejection handler
window.addEventListener('unhandledrejection', function(e) {
    console.error('EMERGENCY PROMISE ERROR:', e.reason);
    // Show fallback content on critical errors
    const fallback = document.getElementById('fallbackContent');
    if (fallback) {
        fallback.style.display = 'block';
        fallback.innerHTML = `
            <h2>🚨 Promise Error Detected</h2>
            <p>Error: ${e.reason ? e.reason.message : 'Unknown promise error'}</p>
            <button onclick="location.reload()" style="background:#667eea; color:white; border:none; padding:10px 20px; border-radius:8px; margin:10px; cursor:pointer;">🔄 Reload Page</button>
            <button onclick="debugFixEverything()" style="background:#00ff00; color:black; border:none; padding:10px 20px; border-radius:8px; margin:10px; cursor:pointer; font-weight:bold;">🔧 DEBUG FIX</button>
        `;
    }
});

console.log('=== SCRIPT LOADING START ===');

// Global initialization flag to prevent multiple executions
let appInitialized = false;



// Tenor API Configuration
const TENOR_API_KEY = 'LIVDSRZULELA'; // Tenor API demo key
const TENOR_BASE_URL = 'https://tenor.googleapis.com/v2'; // Updated to new Google API

// GIF search variables
let gifSearchResults = [];
let gifSearchTimeout = null;
let gifSearchTarget = 'main'; // 'main' or 'modal'

// User Profile Data
let currentUser = {
    id: 1,
    displayName: "Alex Chen",
    username: "alexchen",
    avatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 120 120"%3E%3Ccircle cx="60" cy="60" r="60" fill="%2325D366"/%3E%3Cpath d="M60 70c-13.255 0-40 6.627-40 20v10h80v-10c0-13.373-26.745-20-40-20zm0-10c8.837 0 16-7.163 16-16s-7.163-16-16-16-16 7.163-16 16 7.163 16 16 16z" fill="%23fff"/%3E%3C/svg%3E',
    bio: "Computer Science student at TIGPS. Love coding and coffee! ☕",
    location: "TIGPS Campus"
};

// Sample data for demonstration (will be replaced by Google Drive data)
let posts = [];
let nextPostId = 1;
let nextCommentId = 1;
let currentPostId = null;
let selectedMedia = null;
let selectedGif = null;
let modalSelectedMedia = null;
let modalSelectedGif = null;
let postCooldownActive = false;

// Google Drive integration
let googleDriveManager = null;

// Admin state
let isAdminLoggedIn = false;
const ADMIN_PASSWORD = "allmighty555"; // You can change this password
const ADMIN_USERNAME = "alphatigps";

// Check admin state from localStorage on page load
function checkAdminState() {
    const adminState = localStorage.getItem('isAdminLoggedIn');
    if (adminState === 'true') {
        isAdminLoggedIn = true;
        console.log('Admin state restored from localStorage');
        console.log('isAdminLoggedIn:', isAdminLoggedIn);
    }
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOMContentLoaded START ===');
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
    console.log('=== DOMContentLoaded END ===');
});

// Content protection functions
function setupContentProtection() {
    // Prevent right-click context menu
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showNotification('Right-click is disabled for content protection.', 'warning');
        return false;
    });

    // Prevent keyboard shortcuts for copying, saving, etc. (but allow screenshots)
    document.addEventListener('keydown', function(e) {
        // Prevent Ctrl+C, Ctrl+X, Ctrl+A, Ctrl+S, Ctrl+U (but allow Ctrl+P for screenshots)
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

    // Prevent selection (less restrictive)
    document.addEventListener('selectstart', function(e) {
        if (!e.target.closest('.post-input, .comment-input, .modal-post-input, input[type="text"], input[type="password"], textarea, .post-content, .comment-text')) {
            e.preventDefault();
            return false;
        }
    });

    // Prevent copy events
    document.addEventListener('copy', function(e) {
        if (!e.target.matches('.post-input, .comment-input, .modal-post-input, input[type="text"], input[type="password"], textarea')) {
            e.preventDefault();
            showNotification('Copying content is disabled.', 'warning');
            return false;
        }
    });

    // Prevent cut events
    document.addEventListener('cut', function(e) {
        if (!e.target.matches('.post-input, .comment-input, .modal-post-input, input[type="text"], input[type="password"], textarea')) {
            e.preventDefault();
            return false;
        }
    });

    // Prevent paste events (except in input fields)
    document.addEventListener('paste', function(e) {
        if (!e.target.matches('.post-input, .comment-input, .modal-post-input, input[type="text"], input[type="password"], textarea')) {
            e.preventDefault();
            return false;
        }
    });

    // Allow developer tools for debugging (F12, Ctrl+Shift+I, etc.)
    // Removed restrictions to allow screenshots and screen recording

    // Additional protection for images
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            showNotification('Image right-click is disabled.', 'warning');
            return false;
        });
        
        img.addEventListener('dragstart', function(e) {
            e.preventDefault();
            return false;
        });
    });

    // Monitor for new images added dynamically
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) { // Element node
                    const newImages = node.querySelectorAll ? node.querySelectorAll('img') : [];
                    newImages.forEach(img => {
                        img.addEventListener('contextmenu', function(e) {
                            e.preventDefault();
                            showNotification('Image right-click is disabled.', 'warning');
                            return false;
                        });
                        
                        img.addEventListener('dragstart', function(e) {
                            e.preventDefault();
                            return false;
                        });
                    });
                }
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    console.log('Content protection enabled');
}

// Screenshot and screen recording detection (now allowed)
function setupScreenshotDetection() {
    // Allow all screenshot and screen recording methods
    console.log('Screenshots and screen recording are now allowed');
    
    // Optional: Log when users take screenshots (for analytics, not blocking)
    document.addEventListener('keydown', function(e) {
        if (e.key === 'PrintScreen' || (e.ctrlKey && e.key === 'p')) {
            console.log('Screenshot/print action detected - allowed');
        }
    });

    // Optional: Log window resize (for analytics, not blocking)
    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;
    
    window.addEventListener('resize', function() {
        const currentWidth = window.innerWidth;
        const currentHeight = window.innerHeight;
        
        // Log significant window size changes (for analytics)
        if (Math.abs(currentWidth - lastWidth) > 100 || Math.abs(currentHeight - lastHeight) > 100) {
            console.log('Significant window resize detected - allowed');
        }
        
        lastWidth = currentWidth;
        lastHeight = currentHeight;
    });

    // Optional: Log visibility changes (for analytics, not blocking)
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            console.log('User switched away from page - allowed');
        }
    });

    // Optional: Log fullscreen changes (for analytics, not blocking)
    document.addEventListener('fullscreenchange', function() {
        if (document.fullscreenElement) {
            console.log('Fullscreen mode activated - allowed');
        }
    });
}

// Call screenshot detection setup
setupScreenshotDetection();

// Mail button function
function openMail() {
    const email = 'xilk.tigps@gmail.com';
    const subject = 'TIGPS TALKS - Contact';
    const body = 'Hello TIGPS Team,\n\nI would like to get in touch regarding TIGPS TALKS.\n\nBest regards,';
    
    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Try to open default mail client
    window.location.href = mailtoLink;
    
    // Fallback: show email in notification
    setTimeout(() => {
        showNotification(`Email: ${email}`, 'info');
    }, 1000);
}

// GIF Search Modal Logic
// Variables already declared at the top

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

let db = null;

// Initialize Firebase safely
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

// Safe Firestore operations
function safeFirestoreOperation(operation) {
    if (!db) {
        console.error('Firestore is not initialized!');
        return null;
    }
    try {
        return operation();
    } catch (error) {
        console.error('Firestore operation failed:', error);
        return null;
    }
}

// Firestore CRUD for posts
async function fetchPostsFromFirestore() {
  try {
    if (!db) {
      console.warn('Firestore not initialized, using localStorage fallback');
      const storedPosts = localStorage.getItem('tigpsPosts');
      return storedPosts ? JSON.parse(storedPosts) : [];
    }
    
    console.log('Starting fetchPostsFromFirestore...');
    const postsCol = safeFirestoreOperation(() => db.collection("posts"));
    if (!postsCol) return [];
    
    console.log('Posts collection reference:', postsCol);
    
    const postSnapshot = await safeFirestoreOperation(() => 
      postsCol.orderBy("timestamp", "desc").get()
    );
    if (!postSnapshot) return [];
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
        avatar: data.avatar || 'stevejobs.jpeg',
        timestamp: data.timestamp || new Date().toISOString(),
        likes: data.likes || 0,
        comments: data.comments || [],
        isAnonymous: data.isAnonymous || false,
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
      return;
    }
    const result = await safeFirestoreOperation(() => db.collection("posts").add(post));
    if (!result) {
      throw new Error('Failed to save post to Firestore');
    }
  } catch (error) {
    console.error('Error saving post to Firestore, using localStorage fallback:', error);
    const storedPosts = localStorage.getItem('tigpsPosts');
    const posts = storedPosts ? JSON.parse(storedPosts) : [];
    post.id = Date.now().toString();
    posts.unshift(post);
    localStorage.setItem('tigpsPosts', JSON.stringify(posts));
  }
}
// Firestore CRUD for profiles
async function fetchProfileFromFirestore(username) {
  try {
    if (!db) return null;
    const profileRef = safeFirestoreOperation(() => db.collection("profiles").doc(username));
    if (!profileRef) return null;
    const profileSnap = await safeFirestoreOperation(() => profileRef.get());
    return profileSnap && profileSnap.exists ? profileSnap.data() : null;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

async function saveProfileToFirestore(profile) {
  try {
    if (!db) return;
    const result = await safeFirestoreOperation(() => 
      db.collection("profiles").doc(profile.username).set(profile)
    );
    if (!result) {
      throw new Error('Failed to save profile to Firestore');
    }
  } catch (error) {
    console.error('Error saving profile:', error);
    throw error;
  }
}
// Firestore CRUD for comments
async function fetchCommentsFromFirestore(postId) {
  try {
    if (!db) return [];
    const commentsCol = safeFirestoreOperation(() => 
      db.collection("posts").doc(postId).collection("comments")
    );
    if (!commentsCol) return [];
    const commentSnapshot = await safeFirestoreOperation(() => 
      commentsCol.orderBy("timestamp", "asc").get()
    );
    return commentSnapshot ? commentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [];
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}

async function saveCommentToFirestore(postId, comment) {
  try {
    if (!db) return;
    const result = await safeFirestoreOperation(() => 
      db.collection("posts").doc(postId).collection("comments").add(comment)
    );
    if (!result) {
      throw new Error('Failed to save comment to Firestore');
    }
  } catch (error) {
    console.error('Error saving comment:', error);
    throw error;
  }
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
        content: "Welcome to TIGPS TALKS! This is a test post to get things started. 🎉",
        author: "TIGPS Team",
        username: "tigps_team",
        avatar: "stevejobs.jpeg",
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
    try {
      const user = localStorage.getItem('tigpsUser');
      if (user) {
        const userData = JSON.parse(user);
        const { username } = userData;
        const profile = await fetchProfileFromFirestore(username);
        if (profile) {
          currentUser = { ...currentUser, ...profile };
          updateProfileDisplay();
        }
      }
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
      localStorage.removeItem('tigpsUser');
    }
    console.log('App initialization complete');
  } catch (e) {
    console.error('App initialization error:', e);
    showNotification('Failed to load data from Firestore. ' + e.message, 'error');
  }
}

// Enhanced addPost to ensure all fields are saved
addPost = async function(content, isAnonymous, media, gif) {
  const user = getCurrentUserForPost(isAnonymous);
  const timestamp = new Date().toISOString();
  const tags = extractTags(content);
  
  console.log('addPost called with:', {
    content: content,
    isAnonymous: isAnonymous,
    media: media ? 'has media' : 'no media',
    gif: gif ? 'has gif' : 'no gif',
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
    gif: gif || null,
    timestamp,
    likes: 0,
    comments: [],
    isLiked: false,
    tags: tags
  };
  
  console.log('Post object to save:', {
    ...post,
    media: post.media ? 'data URL present' : 'no media',
    gif: post.gif ? 'gif object present' : 'no gif'
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
    const commentsModal = document.getElementById('commentsModal');
    if (commentsModal) {
      commentsModal.style.display = 'block';
    } else {
      console.error('Comments modal not found');
      showNotification('Comments modal not available.', 'error');
    }
  } catch (e) {
    showNotification('Failed to load comments.', 'error');
  }
};

// Add comment using Firestore
addComment = async function() {
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

// Single DOMContentLoaded listener to prevent conflicts
document.addEventListener('DOMContentLoaded', async function() {
    if (appInitialized) {
        console.log('App already initialized, skipping...');
        return;
    }
    appInitialized = true;
    
    console.log('=== DOMContentLoaded START ===');
    try {
        // Show app immediately
        const app = document.querySelector('.app');
        if (app) {
            app.style.display = 'block';
            console.log('✓ App element shown');
        }
        
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
    console.log('=== DOMContentLoaded END ===');
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
            avatar: "stevejobs.jpeg",
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
    console.log('🔄 Setting up event listeners...');
    
    // Main post button
    const postButton = document.getElementById('postButton');
    if (postButton) {
        console.log('✓ Found post button, adding click listener');
        postButton.addEventListener('click', createPost);
    } else {
        console.error('❌ Post button not found!');
    }
    
    // Modal post button
    const modalPostButton = document.getElementById('modalPostButton');
    if (modalPostButton) {
        console.log('✓ Found modal post button, adding click listener');
        modalPostButton.addEventListener('click', createPostFromModal);
    } else {
        console.error('❌ Modal post button not found!');
    }
    

    
    // Instagram-style comment input event listeners
    const instagramCommentInput = document.getElementById('instagramCommentInput');
    if (instagramCommentInput) {
        instagramCommentInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addInstagramComment();
            }
        });
        
        instagramCommentInput.addEventListener('input', function(e) {
            autoResizeTextarea(e);
        });
    }

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
    
    // Username modal functionality
    const usernameModal = document.getElementById('usernameModal');
    const usernameInput = document.getElementById('usernameInput');
    const usernameSubmitBtn = document.getElementById('usernameSubmitBtn');
    
    if (usernameSubmitBtn) {
        console.log('✓ Found username submit button, adding click listener');
        usernameSubmitBtn.addEventListener('click', function() {
            const username = usernameInput.value.trim();
            if (username) {
                setStoredUsername(username);
                hideUsernameModal();
                showNotification('Username set successfully!', 'success');
            } else {
                showNotification('Please enter a username!', 'error');
            }
        });
    } else {
        console.error('❌ Username submit button not found!');
    }
    
    if (usernameInput) {
        usernameInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                usernameSubmitBtn.click();
            }
        });
    }
    
    // GIF input event listener
    const gifInput = document.getElementById('gifSearchInput');
    if (gifInput) {
        console.log('✓ Found GIF input, adding event listener');
        gifInput.addEventListener('input', function(e) {
            if (gifSearchTimeout) clearTimeout(gifSearchTimeout);
            const query = e.target.value.trim();
            if (query.length < 2) {
                const gifResults = document.getElementById('gifResults');
                if (gifResults) {
                    gifResults.innerHTML = '<div class="gif-loading">Search for GIFs to get started!</div>';
                }
                return;
            }
            gifSearchTimeout = setTimeout(() => searchTenorGifs(query), 400);
        });
    } else {
        console.log('⚠️ GIF input not found (may not be on this page)');
    }
    
    console.log('✓ Event listeners setup completed');
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
async function createPost() {
    // Check cooldown first
    if (postCooldownActive) {
        showNotification('Please wait 15 seconds before posting again.', 'error');
        return;
    }
    
    // Check username requirement
    const username = getStoredUsername();
    if (!username) {
        showNotification('Please enter your username before posting.', 'error');
        showUsernameModal();
        return;
    }
    
    const postInput = document.getElementById('postInput');
    const content = postInput.value.trim();
    const isAnonymous = document.getElementById('anonymousPost').checked;
    
    if (!content && !selectedMedia && !selectedGif) {
        showNotification('Please enter some content or add media for your post!', 'error');
        return;
    }
    
    try {
        const user = getCurrentUserForPost(isAnonymous);
        const tags = extractTags(content);
        
        const post = {
            content: content,
            author: user.displayName,
            username: user.username,
            avatar: user.avatar,
            timestamp: new Date().toISOString(),
            likes: 0,
            comments: [],
            isAnonymous: isAnonymous,
            isLiked: false,
            media: selectedMedia,
            gif: selectedGif,
            tags: tags,
            likedBy: []
        };
        
        await savePostToFirestore(post);
        
        // Update local posts array
        posts.unshift(post);
        renderPosts();
        
        // Clear form
        postInput.value = '';
        postInput.style.height = 'auto';
        document.getElementById('anonymousPost').checked = false;
        selectedMedia = null;
        selectedGif = null;
        const postMediaPreview = document.getElementById('postMediaPreview');
        if (postMediaPreview) {
            postMediaPreview.innerHTML = '';
        }
        
        // Start cooldown
        startPostCooldown();
        
        showNotification('Post created successfully!', 'success');
    } catch (error) {
        console.error('Error in createPost:', error);
        showNotification('Failed to create post. Please try again.', 'error');
    }
}

// Create post from modal
async function createPostFromModal() {
    if (postCooldownActive) {
        showNotification('Please wait before posting again.', 'error');
        return;
    }
    
    const postInput = document.getElementById('modalPostInput');
    const content = postInput.value.trim();
    const isAnonymous = document.getElementById('modalAnonymousPost').checked;
    
    if (!content && !modalSelectedMedia && !modalSelectedGif) {
        showNotification('Please enter some content or add media for your post!', 'error');
        return;
    }
    
    try {
        const user = getCurrentUserForPost(isAnonymous);
        const tags = extractTags(content);
        
        const post = {
            content: content,
            author: user.displayName,
            username: user.username,
            avatar: user.avatar,
            timestamp: new Date().toISOString(),
            likes: 0,
            comments: [],
            isAnonymous: isAnonymous,
            isLiked: false,
            media: modalSelectedMedia,
            gif: modalSelectedGif,
            tags: tags,
            likedBy: []
        };
        
        await savePostToFirestore(post);
        
        // Update local posts array
        posts.unshift(post);
        renderPosts();
        
        postInput.value = '';
        postInput.style.height = 'auto';
        document.getElementById('modalAnonymousPost').checked = false;
        modalSelectedMedia = null;
        modalSelectedGif = null;
        const modalPostMediaPreview = document.getElementById('modalPostMediaPreview');
        if (modalPostMediaPreview) {
            modalPostMediaPreview.innerHTML = '';
        }
        
        closePostModal();
        showNotification('Post created successfully!', 'success');
        startPostCooldown();
    } catch (error) {
        console.error('Error in createPostFromModal:', error);
        showNotification('Failed to create post. Please try again.', 'error');
    }
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
        avatar: post.avatar || 'stevejobs.jpeg',
        timestamp: post.timestamp || new Date().toISOString(),
        likes: post.likes || 0,
        comments: post.comments || [],
        isAnonymous: post.isAnonymous || false,
        isLiked: post.isLiked || false,
        media: post.media || null,
        gif: post.gif || null,
        tags: post.tags || [],
        likedBy: post.likedBy || []
    };
    
    // Check if current user has liked this post
    const hasLiked = currentUser && currentUser.username && safePost.likedBy && safePost.likedBy.includes(currentUser.username);
    
    const timeAgo = getTimeAgo(safePost.timestamp);
    const mediaHtml = safePost.media ? `
        <div class="post-media">
            ${safePost.media.includes('video') ? 
                `<video src="${safePost.media}" controls></video>` : 
                `<img src="${safePost.media}" alt="Post media">`
            }
        </div>
    ` : '';
    
    const gifHtml = safePost.gif ? `
        <div class="post-media">
            <img src="${safePost.gif.preview}" alt="${safePost.gif.title}" onclick="openGifModal('${safePost.gif.url}')" style="cursor: pointer;">
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
            <!-- Temporarily removed three-dot menu
            ${isAdminLoggedIn ? `
            <div class="post-menu">
                <button class="post-menu-btn" onclick="togglePostMenu('${safePost.id}')">⋯</button>
                <div class="post-menu-dropdown" id="post-menu-${safePost.id}">
                    <div class="post-menu-item" onclick="deletePost('${safePost.id}')">🗑️ Delete Post</div>
                </div>
            </div>
            ` : '<!-- Admin not logged in, no menu shown -->'}
            -->
        </div>
        <div class="post-content">${formatContent(safePost.content)}</div>
        ${mediaHtml}
        ${gifHtml}
        ${tagsHtml}
        <!-- Instagram-style Actions -->
        <div class="instagram-actions">
            <button class="instagram-action-btn ${hasLiked ? 'liked' : ''}" onclick="instagramLike('${safePost.id}')">
                <svg viewBox="0 0 24 24" fill="${hasLiked ? '#e31b23' : 'currentColor'}">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
            </button>
            <button class="instagram-action-btn" onclick="instagramComment('${safePost.id}')">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21.99 4c0-1.1-.89-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                </svg>
            </button>
            <button class="instagram-action-btn" onclick="instagramShare('${safePost.id}')">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
                </svg>
            </button>
        </div>
        <div class="instagram-stats">
            <span>${safePost.likedBy.length} likes</span>
            <span>${safePost.comments.length} comments</span>
        </div>
    `;
    
    return postDiv;
}

// Format content with clickable tags
function formatContent(content) {
    return content.replace(/#(\w+)/g, '<span class="post-tag" onclick="searchTag(\'$1\')">#$1</span>');
}

// --- Like Functionality ---
async function toggleLike(postId) {
  try {
    console.log('toggleLike called with postId:', postId);
    
    // Ensure we have a current user
    if (!currentUser || !currentUser.username) {
      showNotification('Please log in to like posts.', 'error');
      return;
    }
    
    // Find the post in the local posts array first
    const postIndex = posts.findIndex(p => p.id === postId || p.id === postId.toString());
    if (postIndex === -1) {
      console.error('Post not found in local array:', postId);
      console.log('Available posts:', posts.map(p => ({ id: p.id, type: typeof p.id })));
      showNotification('Post not found.', 'error');
      return;
    }
    
    let post = posts[postIndex];
    if (!post.likes) post.likes = 0;
    if (!post.likedBy) post.likedBy = [];
    
    const user = currentUser.username;
    const hasLiked = post.likedBy.includes(user);
    
    if (hasLiked) {
      // Unlike
      post.likes -= 1;
      post.likedBy = post.likedBy.filter(u => u !== user);
      showNotification('Post unliked!', 'info');
    } else {
      // Like
      post.likes += 1;
      post.likedBy.push(user);
      showNotification('Post liked!', 'success');
    }
    
    // Update the post in Firestore
    try {
      const postRef = window.firebase.firestore().collection('posts').doc(post.id.toString());
      await postRef.update({ likes: post.likes, likedBy: post.likedBy });
    } catch (firestoreError) {
      console.error('Error updating Firestore:', firestoreError);
      // Continue with local update even if Firestore fails
    }
    
    // Update local posts array
    posts[postIndex] = post;
    
    // Re-render posts to show updated like count
    renderPosts();
    
  } catch (e) {
    console.error('Error toggling like:', e);
    showNotification('Failed to like post.', 'error');
  }
}

// --- Comment Functionality ---
async function showComments(postId) {
  currentPostId = postId;
  try {
    console.log('Loading comments for post:', postId);
    const comments = await fetchCommentsFromFirestore(postId.toString());
    console.log('Comments loaded:', comments);
    renderComments(comments);
    document.getElementById('commentsModal').style.display = 'block';
  } catch (e) {
    console.error('Error loading comments:', e);
    showNotification('Failed to load comments.', 'error');
  }
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

// --- Share Functionality ---
function sharePost(postId) {
  const url = window.location.origin + '/?post=' + postId;
  if (navigator.share) {
    navigator.share({
              title: 'Check out this post on TIGPS TALKS!',
      url
    });
  } else {
    navigator.clipboard.writeText(url).then(() => {
      showNotification('Post link copied to clipboard!', 'success');
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
    document.getElementById('gifSearchModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.getElementById('gifSearchInput').value = '';
    document.getElementById('gifResults').innerHTML = '<div class="gif-loading">Search for GIFs to get started!</div>';
    document.getElementById('gifSearchInput').focus();
}

function closeGifSearchModal() {
    document.getElementById('gifSearchModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    gifSearchResults = [];
    gifSearchTarget = null;
}

// Alias for compatibility
function closeGifSearch() {
    closeGifSearchModal();
}

// Alias for openGifSearch
function openGifSearch() {
    openGifSearchModal('main');
}

// Make functions globally available
window.openGifSearchModal = openGifSearchModal;
window.closeGifSearchModal = closeGifSearchModal;
window.closeGifSearch = closeGifSearch;
window.searchGifs = searchGifs;
window.selectGifFromSearch = selectGifFromSearch;
window.toggleLike = toggleLike;
window.showComments = showComments;
window.addComment = addComment;

// GIF input event listener (moved to setupEventListeners)

// Tenor GIF Search Functions
async function searchTenorGifs(query) {
    const resultsContainer = document.getElementById('gifResults');
    resultsContainer.innerHTML = '<div class="gif-loading">Searching...</div>';
    
    try {
        const response = await fetch(`${TENOR_BASE_URL}/search?key=${TENOR_API_KEY}&q=${encodeURIComponent(query)}&limit=8&media_filter=tinygif`);
        const data = await response.json();
        
        // Handle both old and new API response structures
        let results = [];
        if (data.results && data.results.length > 0) {
            results = data.results;
        } else if (data.data && data.data.length > 0) {
            results = data.data;
        }
        
        if (results.length > 0) {
            gifSearchResults = results;
            displayGifResults(results);
        } else {
            resultsContainer.innerHTML = '<div class="gif-loading">No GIFs found. Try a different search term!</div>';
        }
    } catch (error) {
        console.error('Error searching Tenor GIFs:', error);
        resultsContainer.innerHTML = '<div class="gif-loading">Error loading GIFs. Please try again.</div>';
    }
}

// Alias for searchGifs function
function searchGifs(event) {
    if (event && event.key === 'Enter') {
        const query = event.target.value.trim();
        if (query) {
            searchTenorGifs(query);
        }
    } else if (!event) {
        const query = document.getElementById('gifSearchInput').value.trim();
        if (query) {
            searchTenorGifs(query);
        }
    }
}

function displayGifResults(gifs) {
    const resultsContainer = document.getElementById('gifResults');
    resultsContainer.innerHTML = '';
    
    gifs.forEach(gif => {
        const gifItem = document.createElement('div');
        gifItem.className = 'gif-item';
        
        // Use Tenor's tinygif format for faster loading
        const mediaUrl = gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url;
        const previewUrl = gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url;
        
        gifItem.innerHTML = `
            <img src="${previewUrl}" 
                 alt="${gif.title || 'GIF'}" 
                 data-original="${mediaUrl}"
                 data-preview="${previewUrl}"
                 onclick="selectGifFromSearch('${gif.id}')">
        `;
        
        resultsContainer.appendChild(gifItem);
    });
}

function selectGifFromSearch(gifId) {
    const gif = gifSearchResults.find(g => g.id === gifId);
    if (!gif) {
        showNotification('GIF not found.', 'error');
        return;
    }
    
    // Use Tenor's tinygif format for faster loading
    const mediaUrl = gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url;
    const previewUrl = gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url;
    
    const gifData = {
        url: mediaUrl,
        preview: previewUrl,
        title: gif.title || 'GIF',
        id: gif.id
    };
    
    if (gifSearchTarget === 'main') {
        selectedGif = gifData;
        const postMediaPreview = document.getElementById('postMediaPreview');
        postMediaPreview.innerHTML = `
            <div class="selected-gif">
                <img src="${selectedGif.preview}" alt="${selectedGif.title}">
                <button class="remove-gif-btn" onclick="removeSelectedGif()">×</button>
            </div>
        `;
    } else if (gifSearchTarget === 'modal') {
        modalSelectedGif = gifData;
        const modalPostMediaPreview = document.getElementById('modalPostMediaPreview');
        modalPostMediaPreview.innerHTML = `
            <div class="selected-gif">
                <img src="${modalSelectedGif.preview}" alt="${modalSelectedGif.title}">
                <button class="remove-gif-btn" onclick="removeModalSelectedGif()">×</button>
            </div>
        `;
    }
    
    closeGifSearch();
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

// Sidebar hamburger menu logic
function toggleHamburgerMenu() {
    const sidebar = document.getElementById('sidebarMenu');
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
    } else {
        sidebar.classList.add('open');
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
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        isAdminLoggedIn = true;
        // Save admin state to localStorage
        localStorage.setItem('isAdminLoggedIn', 'true');
        // Hide login, show dashboard (if present)
        showNotification('Admin login successful!', 'success');
        closeAdminModal();
        // Refresh posts to show admin controls
        renderPosts();
        // Optionally, show admin dashboard section if you have one
        // document.getElementById('adminDashboardSection').style.display = 'block';
    } else {
        showNotification('Invalid admin username or password.', 'error');
    }
}

function logoutAdmin() {
    isAdminLoggedIn = false;
    // Clear admin state from localStorage
    localStorage.removeItem('isAdminLoggedIn');
    document.getElementById('adminLoginSection').style.display = 'block';
    document.getElementById('adminDashboardSection').style.display = 'none';
    document.getElementById('adminPassword').value = '';
    
    showNotification('Logged out from admin panel.', 'info');
    // Refresh posts to hide admin controls
    renderPosts();
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
    var loginModal = document.getElementById('loginModal');
    if (loginModal) loginModal.style.display = 'block';
    var appDiv = document.querySelector('.app');
    if (appDiv) appDiv.style.display = 'none';
}
function hideLoginModal() {
    var loginModal = document.getElementById('loginModal');
    if (loginModal) loginModal.style.display = 'none';
    var appDiv = document.querySelector('.app');
    if (appDiv) appDiv.style.display = '';
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
            avatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 120 120"%3E%3Ccircle cx="60" cy="60" r="60" fill="%2325D366"/%3E%3Cpath d="M60 70c-13.255 0-40 6.627-40 20v10h80v-10c0-13.373-26.745-20-40-20zm0-10c8.837 0 16-7.163 16-16s-7.163-16-16-16-16 7.163-16 16 7.163 16 16 16z" fill="%23fff"/%3E%3C/svg%3E',
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
            avatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 120 120"%3E%3Ccircle cx="60" cy="60" r="60" fill="%2325D366"/%3E%3Cpath d="M60 70c-13.255 0-40 6.627-40 20v10h80v-10c0-13.373-26.745-20-40-20zm0-10c8.837 0 16-7.163 16-16s-7.163-16-16-16-16 7.163-16 16 7.163 16 16 16z" fill="%23fff"/%3E%3C/svg%3E',
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
saveProfile = async function() {
    const displayName = document.getElementById('profileDisplayName').value;
    const username = document.getElementById('profileUsername').value;
    const bio = document.getElementById('profileBio').value;
    const location = document.getElementById('profileLocation').value;
    
    currentUser = { ...currentUser, displayName, username, bio, location };
    updateProfileDisplay();
    closeProfileModal();
    
    // Save to localStorage
    localStorage.setItem('tigpsUser', JSON.stringify(currentUser));
    
    // Save to Google Drive if admin is logged in
    if (isAdminLoggedIn && googleDriveManager) {
        await googleDriveManager.saveUserProfile(currentUser);
    }
    
    showNotification('Profile updated successfully!', 'success');
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
            const profileMenu = document.getElementById('profileMenu');
            if (profileMenu) profileMenu.classList.remove('show');
        }
    });

    // Debug/Test Firestore button
    const debugBtn = document.getElementById('debugFirestoreBtn');
    if (debugBtn) {
        debugBtn.addEventListener('click', async function() {
            try {
                console.log('DEBUG: Fetching posts from Firestore...');
                const postsCol = db.collection("posts");
                const postSnapshot = await postsCol.orderBy("timestamp", "desc").get();
                if (postSnapshot.empty) {
                    console.log('DEBUG: No posts found in Firestore.');
                    alert('No posts found in Firestore.');
                } else {
                    const postsArr = postSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    console.log('DEBUG: Posts fetched:', postsArr);
                    alert('Fetched ' + postsArr.length + ' posts from Firestore. Check the console for details.');
                }
            } catch (err) {
                console.error('DEBUG: Error fetching posts from Firestore:', err);
                alert('Error fetching posts from Firestore: ' + err.message);
            }
        });
    }
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
    console.log('deletePost called with postId:', postId, 'type:', typeof postId);
    console.log('isAdminLoggedIn:', isAdminLoggedIn);
    
    if (!isAdminLoggedIn) {
        showNotification('Only admins can delete posts!', 'error');
        return;
    }
    
    // Handle both string and number postIds
    const post = posts.find(p => p.id == postId || p.id === postId);
    if (!post) {
        console.log('Post not found. Available posts:', posts.map(p => ({ id: p.id, type: typeof p.id })));
        showNotification('Post not found!', 'error');
        return;
    }
    
    if (confirm(`Are you sure you want to delete this post by @${post.username}?`)) {
        const postIndex = posts.findIndex(p => p.id == postId || p.id === postId);
        if (postIndex !== -1) {
            posts.splice(postIndex, 1);
            renderPosts();
            
            // Save to Firestore
            try {
                await db.collection('posts').doc(postId.toString()).delete();
                showNotification('Post deleted successfully!', 'success');
            } catch (error) {
                console.error('Error deleting post from Firestore:', error);
                showNotification('Error deleting post from database!', 'error');
            }
        }
    }
} 

// --- Instagram-style Profile Modal Logic ---
function openProfileModal() {
  const modal = document.getElementById('profileModal');
  if (!modal) return;
  // Load current user info
  document.getElementById('profilePicLarge').src = currentUser.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face';
  document.getElementById('profileNameInput').value = currentUser.displayName || '';
  document.getElementById('profileUsernameInput').value = currentUser.username || '';
  document.getElementById('profileBioInput').value = currentUser.bio || '';
  // Load user's posts
  renderProfilePosts();
  modal.style.display = 'flex';
}

function closeProfileModal() {
  const modal = document.getElementById('profileModal');
  if (modal) modal.style.display = 'none';
}

function triggerProfilePicUpload() {
  document.getElementById('profilePicUpload').click();
}

function handleProfilePicUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('profilePicLarge').src = e.target.result;
    currentUser.avatar = e.target.result;
  };
  reader.readAsDataURL(file);
}



function renderProfilePosts() {
  const list = document.getElementById('profilePostsList');
  if (!list) return;
  list.innerHTML = '';
  const userPosts = posts.filter(p => p.username === currentUser.username);
  if (userPosts.length === 0) {
    list.innerHTML = '<div style="color:#888;text-align:center;">No posts yet.</div>';
    return;
  }
  userPosts.forEach(post => {
    const div = document.createElement('div');
    div.className = 'profile-post-item';
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:1rem;">
        <div style="flex:1;">
          <div style="font-weight:600;">${post.content.substring(0, 40)}${post.content.length > 40 ? '...' : ''}</div>
          <div style="font-size:0.85em;color:#888;">${new Date(post.timestamp).toLocaleString()}</div>
        </div>
        <button onclick="deleteProfilePost('${post.id}')" style="background:#ff4444;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;">Delete</button>
      </div>
    `;
    list.appendChild(div);
  });
}

function deleteProfilePost(postId) {
  if (!confirm('Delete this post?')) return;
  db.collection('posts').doc(postId).delete().then(() => {
    showNotification('Post deleted!', 'success');
    // Remove from local posts array and re-render
    posts = posts.filter(p => p.id !== postId);
    renderProfilePosts();
    renderPosts && renderPosts();
  }).catch(err => {
    showNotification('Error deleting post: ' + err.message, 'error');
  });
}

 

// --- Post Cooldown Logic ---

function startPostCooldown() {
  postCooldownActive = true;
  const postBtn = document.getElementById('postButton');
  if (postBtn) postBtn.disabled = true;
  const modalPostBtn = document.getElementById('modalPostButton');
  if (modalPostBtn) modalPostBtn.disabled = true;
  setTimeout(() => {
    postCooldownActive = false;
    if (postBtn) postBtn.disabled = false;
    if (modalPostBtn) modalPostBtn.disabled = false;
  }, 15000); // 15 seconds cooldown
}



// Add cooldown to file/image attachment
let fileAttachCooldownActive = false;
function startFileAttachCooldown() {
  fileAttachCooldownActive = true;
  setTimeout(() => {
    fileAttachCooldownActive = false;
  }, 15000); // 15 seconds cooldown
}

const originalHandleImageUpload = handleImageUpload;
handleImageUpload = function(event) {
  if (fileAttachCooldownActive) {
    showNotification('Please wait before attaching another file.', 'error');
    return;
  }
  startFileAttachCooldown();
  originalHandleImageUpload(event);
}

const originalHandleModalImageUpload = handleModalImageUpload;
handleModalImageUpload = function(event) {
  if (fileAttachCooldownActive) {
    showNotification('Please wait before attaching another file.', 'error');
    return;
  }
  startFileAttachCooldown();
  originalHandleModalImageUpload(event);
}

// Make all functions globally available
window.toggleLike = toggleLike;
window.showComments = showComments;
window.sharePost = sharePost;
window.addComment = addComment;
window.createPost = createPost;
window.openGifSearch = openGifSearch;
window.closeGifSearch = closeGifSearch;
window.searchGifs = searchGifs;
window.selectGifFromSearch = selectGifFromSearch;
window.removeSelectedGif = removeSelectedGif;
window.removeModalSelectedGif = removeModalSelectedGif;
window.openModalGifSearch = openModalGifSearch;
window.openGifModal = openGifModal;
window.togglePostMenu = togglePostMenu;
window.deletePost = deletePost;

window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;
window.triggerProfilePicUpload = triggerProfilePicUpload;
window.handleProfilePicUpload = handleProfilePicUpload;
window.saveProfile = saveProfile;
window.deleteProfilePost = deleteProfilePost; 









// Open GIF in modal for full view
function openGifModal(gifUrl) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.onclick = () => modal.remove();
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px; text-align: center;">
            <img src="${gifUrl}" style="max-width: 100%; max-height: 80vh; border-radius: 12px;">
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Remove selected GIF functions
function removeSelectedGif() {
    selectedGif = null;
    const postMediaPreview = document.getElementById('postMediaPreview');
    if (postMediaPreview) {
        postMediaPreview.innerHTML = '';
    }
}

function removeModalSelectedGif() {
    modalSelectedGif = null;
    const modalPostMediaPreview = document.getElementById('modalPostMediaPreview');
    if (modalPostMediaPreview) {
        modalPostMediaPreview.innerHTML = '';
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
} 

// Post menu functionality
function togglePostMenu(postId) {
    const menuId = `post-menu-${postId}`;
    const menu = document.getElementById(menuId);
    
    // Close all other menus first
    const allMenus = document.querySelectorAll('.post-menu-dropdown');
    allMenus.forEach(m => {
        if (m.id !== menuId) {
            m.classList.remove('show');
        }
    });
    
    // Toggle current menu
    if (menu) {
        menu.classList.toggle('show');
    }
}

// Close post menus when clicking outside
document.addEventListener('click', function(event) {
    if (!event.target.closest('.post-menu')) {
        const allMenus = document.querySelectorAll('.post-menu-dropdown');
        allMenus.forEach(menu => {
            menu.classList.remove('show');
        });
    }
});

// Render comments in the modal
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
            <img src="${comment.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face'}" alt="Profile" class="comment-avatar">
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

// Utility function to clean up duplicate posts
async function cleanupDuplicatePosts() {
  try {
    console.log('Starting duplicate post cleanup...');
    
    // Fetch all posts from Firestore
    const allPosts = await fetchPostsFromFirestore();
    console.log('Total posts found:', allPosts.length);
    
    // Group posts by content to find duplicates
    const contentGroups = {};
    allPosts.forEach(post => {
      const content = post.content.toLowerCase().trim();
      if (!contentGroups[content]) {
        contentGroups[content] = [];
      }
      contentGroups[content].push(post);
    });
    
    // Find duplicates for "hello" and "jaddu"
    const duplicatesToRemove = [];
    const targetContents = ['hello', 'jaddu'];
    
    targetContents.forEach(targetContent => {
      const posts = contentGroups[targetContent] || [];
      if (posts.length > 1) {
        console.log(`Found ${posts.length} posts with content "${targetContent}"`);
        
        // Keep the first post (most recent due to desc order), remove the rest
        const postsToRemove = posts.slice(1);
        duplicatesToRemove.push(...postsToRemove);
        
        console.log(`Keeping post ID: ${posts[0].id}, removing ${postsToRemove.length} duplicates`);
      }
    });
    
    // Remove duplicate posts
    if (duplicatesToRemove.length > 0) {
      console.log(`Removing ${duplicatesToRemove.length} duplicate posts...`);
      
      for (const post of duplicatesToRemove) {
        try {
          await db.collection('posts').doc(post.id).delete();
          console.log(`Deleted duplicate post ID: ${post.id}`);
        } catch (error) {
          console.error(`Error deleting post ${post.id}:`, error);
        }
      }
      
      // Refresh posts after cleanup
      posts = await fetchPostsFromFirestore();
      renderPosts();
      
      showNotification(`Successfully removed ${duplicatesToRemove.length} duplicate posts!`, 'success');
    } else {
      console.log('No duplicate posts found for "hello" or "jaddu"');
      showNotification('No duplicate posts found for "hello" or "jaddu"', 'info');
    }
    
  } catch (error) {
    console.error('Error during duplicate cleanup:', error);
    showNotification('Error cleaning up duplicate posts: ' + error.message, 'error');
  }
}

// Make cleanup function globally available
window.cleanupDuplicatePosts = cleanupDuplicatePosts;

// Username Modal Logic (robust)
function showUsernameModal() {
  const modal = document.getElementById('usernameModal');
  if (modal) modal.style.display = 'flex';
  const input = document.getElementById('usernameInput');
  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 100);
  }
}
function hideUsernameModal() {
  const modal = document.getElementById('usernameModal');
  if (modal) modal.style.display = 'none';
}
function getStoredUsername() {
  return localStorage.getItem('tigps_username') || '';
}
function setStoredUsername(username) {
  localStorage.setItem('tigps_username', username);
}
function requireUsername() {
  let username = getStoredUsername();
  if (!username) {
    showUsernameModal();
  } else {
    window.tigpsUsername = username;
    currentUser.username = username;
    currentUser.displayName = username;
    // Update post creator UI
    const postCreatorName = document.getElementById('postCreatorName');
    const postCreatorDisplayName = document.getElementById('postCreatorDisplayName');
    if (postCreatorName) postCreatorName.textContent = '@' + username;
    if (postCreatorDisplayName) postCreatorDisplayName.textContent = username;
  }
}
document.addEventListener('DOMContentLoaded', function() {
  requireUsername();
  const usernameInput = document.getElementById('usernameInput');
  const usernameBtn = document.getElementById('usernameSubmitBtn');
  if (usernameBtn && usernameInput) {
    usernameBtn.onclick = function() {
      const val = usernameInput.value.trim();
      if (val.length > 0) {
        setStoredUsername(val);
        window.tigpsUsername = val;
        currentUser.username = val;
        currentUser.displayName = val;
        // Update post creator UI
        const postCreatorName = document.getElementById('postCreatorName');
        const postCreatorDisplayName = document.getElementById('postCreatorDisplayName');
        if (postCreatorName) postCreatorName.textContent = '@' + val;
        if (postCreatorDisplayName) postCreatorDisplayName.textContent = val;
        hideUsernameModal();
      } else {
        usernameInput.focus();
        usernameInput.style.borderColor = '#e74c3c';
      }
    };
    usernameInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') usernameBtn.click();
    });
  }
  // Fallback: if username is still not set, show modal
  setTimeout(() => {
    if (!getStoredUsername()) showUsernameModal();
  }, 1000);

  // --- Post Button Enable/Disable Logic ---
  const postInput = document.getElementById('postInput');
  const postBtn = document.getElementById('postBtn');
  if (postInput && postBtn) {
    postInput.addEventListener('input', function() {
      postBtn.disabled = postInput.value.trim().length === 0;
    });
    // Initial state
    postBtn.disabled = postInput.value.trim().length === 0;
  }
});


// ... existing code ...



// Instagram-style functionality
let currentInstagramPostId = null;

// Instagram-style like function
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

// Instagram-style comment function
function instagramComment(postId) {
    currentInstagramPostId = postId;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    // Populate the Instagram comment modal
    const modal = document.getElementById('instagramCommentModal');
    const postContainer = document.getElementById('instagramCommentPost');
    
    postContainer.innerHTML = `
        <div class="instagram-comment-post-header">
            <img src="${post.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face'}" alt="Profile" class="instagram-comment-post-avatar">
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

// Load Instagram comments
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
                <img src="${comment.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face'}" alt="Profile" class="instagram-comment-avatar">
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

// Add Instagram comment
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

// Close Instagram comment modal
function closeInstagramCommentModal() {
    document.getElementById('instagramCommentModal').style.display = 'none';
    currentInstagramPostId = null;
    document.getElementById('instagramCommentInput').value = '';
}

// Instagram share function
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

// Update post in Firestore
async function updatePostInFirestore(post) {
    try {
        if (db) {
            await db.collection("posts").doc(post.id).update({
                likedBy: post.likedBy || [],
                comments: post.comments || []
            });
        }
    } catch (error) {
        console.error('Error updating post in Firestore:', error);
    }
}

// ===== GLOBAL FUNCTION EXPORTS =====
// Make functions available to onclick handlers in HTML
window.createPost = createPost;
window.openMail = openMail;
window.toggleHamburgerMenu = toggleHamburgerMenu;
window.toggleProfileMenu = toggleProfileMenu;
window.openAccountDashboard = openAccountDashboard;
window.openProfileModal = openProfileModal;
window.openSettingsModal = openSettingsModal;
window.openAdminModal = openAdminModal;
window.openPostModal = openPostModal;
window.closePostModal = closePostModal;
window.closeCommentsModal = closeCommentsModal;
window.closeSettingsModal = closeSettingsModal;
window.closeAccountDashboard = closeAccountDashboard;
window.closeProfileModal = closeProfileModal;
window.closeAdminModal = closeAdminModal;
window.saveProfile = saveProfile;
window.saveDashboardProfile = saveDashboardProfile;
window.loginAdmin = loginAdmin;
window.logoutAdmin = logoutAdmin;
window.logout = logout;
window.addComment = addComment;
window.toggleLike = toggleLike;
window.sharePost = sharePost;
window.searchTag = searchTag;
window.openGifSearchModal = openGifSearchModal;
window.closeGifSearchModal = closeGifSearchModal;
window.closeGifSearch = closeGifSearch;
window.openGifSearch = openGifSearch;
window.searchGifs = searchGifs;
window.selectGifFromSearch = selectGifFromSearch;
window.triggerImageUpload = triggerImageUpload;
window.handleImageUpload = handleImageUpload;
window.triggerModalImageUpload = triggerModalImageUpload;
window.handleModalImageUpload = handleModalImageUpload;
window.openModalGifSearch = openModalGifSearch;
window.handleProfilePicUpload = handleProfilePicUpload;
window.removeMedia = removeMedia;
window.removeSelectedGif = removeSelectedGif;
window.removeModalSelectedGif = removeModalSelectedGif;
window.togglePostMenu = togglePostMenu;
window.showComments = showComments;
window.deletePost = deletePost;
window.deleteProfilePost = deleteProfilePost;
window.cleanupDuplicatePosts = cleanupDuplicatePosts;
window.exportData = exportData;
window.importData = importData;
window.handleImportFile = handleImportFile;
window.signInToGoogleDrive = signInToGoogleDrive;
window.signOutFromGoogleDrive = signOutFromGoogleDrive;
window.syncData = syncData;
window.triggerDashboardProfilePicUpload = triggerDashboardProfilePicUpload;
window.handleDashboardProfilePicUpload = handleDashboardProfilePicUpload;
window.instagramLike = instagramLike;
window.instagramComment = instagramComment;
window.instagramShare = instagramShare;
window.addInstagramComment = addInstagramComment;
window.closeInstagramCommentModal = closeInstagramCommentModal;

console.log('=== GLOBAL FUNCTIONS EXPORTED ===');
console.log('✓ All functions are now available to HTML onclick handlers');

// Twitter/X-style Profile Dashboard Functions
function openTwitterProfile() {
    console.log('openTwitterProfile called');
    const modal = document.getElementById('profileDashboardModal');
    console.log('Modal element:', modal);
    if (modal) {
        modal.style.display = 'flex';
        loadTwitterProfileData();
        loadTwitterPosts();
    } else {
        console.error('Profile dashboard modal not found!');
    }
}

function closeTwitterProfile() {
    const modal = document.getElementById('profileDashboardModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

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
        avatar.src = currentUser.avatar || 'stevejobs.jpeg';
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
                <img src="${post.avatar || 'stevejobs.jpeg'}" alt="Profile" class="twitter-post-avatar">
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
        // Save to Firestore
        await saveProfileToFirestore(currentUser);
        
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

