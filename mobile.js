// Mobile device detection and redirect to mobile.html
(function() {
  var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  var isOnMobilePage = window.location.pathname.endsWith('mobile.html');
  if (isMobile && !isOnMobilePage) {
    window.location.href = 'mobile.html';
  }
})(); 