importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAGQkydckA02nsu-EswJLxREvy3ZbL5lXQ',
  authDomain: 'message-app-40a70.firebaseapp.com',
  projectId: 'message-app-40a70',
  storageBucket: 'message-app-40a70.firebasestorage.app',
  messagingSenderId: '444759734135',
  appId: '1:444759734135:web:5e1c88fd8e66670b7a1372',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icon-192.png',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
