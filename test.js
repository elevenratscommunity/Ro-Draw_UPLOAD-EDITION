import React, { useEffect } from 'react';

function App() {

  useEffect(() => {
    // A- Ensure libraries are loaded before running the game logic
    if (!window.Tone || !window.firebase) {
        console.warn("Tone.js or Firebase not loaded yet.");
        return;
    }

    const Tone = window.Tone;
    const firebase = window.firebase;

    // --- Firebase Config ---
    const firebaseConfig = { apiKey: "AIzaSyAgBEHjWSbT2NeN1BCdzdnPrdEVNMrzLjo", authDomain: "ro-draw-8585e.firebaseapp.com", projectId: "ro-draw-8585e", storageBucket: "ro-draw-8585e.appspot.com", messagingSenderId: "524808125870", appId: "1:524808125870:web:7db5848797f3bc5f351c3f" };
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    const auth = firebase.auth();
    const db = firebase.firestore();
    const storage = firebase.storage ? firebase.storage() : null;
    const provider = new firebase.auth.GoogleAuthProvider();

    // --- App State & Sounds ---
    let currentUser = null, currentRoomId = null, currentRoomUnsubscribe = null, currentRoomData = null, gameListeners = [], selectedAvatarUrl = '', tempRoomId = null, roundTimerInterval = null, scoreboardTimeout = null, roundEndTimeout = null, wordChoiceTimeout = null, wordChoiceCountdownInterval = null, scoreboardCountdownInterval = null;
    let roomsUnsubscribe = null;
    let friendsUnsubscribe = null;
    let customAvatarFile = null;
    let playerRoleInCurrentRoom = null;
    const AVATAR_COUNT = 60;
    // --- FIX: Added many more words and new categories ---
    const WORD_LISTS = {
        'عام': ['سيارة', 'منزل', 'شجرة', 'شمس', 'قمر', 'كتاب', 'قلم', 'تفاحة', 'موز', 'قطة', 'كلب', 'جبل', 'نهر', 'كرسي', 'طاولة', 'هاتف', 'كمبيوتر', 'ساعة', 'نظارة', 'مفتاح', 'باب', 'نافذة', 'سرير', 'مصباح', 'دراجة', 'كرة', 'زهرة', 'سحابة', 'نجمة', 'طائرة'],
        'حيوانات': ['فيل', 'زرافة', 'تمساح', 'بطريق', 'كنغر', 'أخطبوط', 'دولفين', 'نمر', 'أسد', 'قرد', 'حصان', 'بقرة', 'خروف', 'أرنب', 'سلحفاة', 'ثعبان', 'عنكبوت', 'فراشة', 'نحلة', 'دب', 'ذئب', 'ثعلب', 'غزال', 'جمل', 'كسلان'],
        'طعام': ['بيتزا', 'برجر', 'بطاطس مقلية', 'سوشي', 'آيس كريم', 'كعكة', 'سلطة', 'قهوة', 'شاي', 'عصير', 'خبز', 'جبن', 'بيض', 'دجاج', 'سمك', 'أرز', 'معكرونة', 'شوربة', 'شوكولاتة', 'فشار', 'بطيخ', 'عنب', 'برتقال', 'فراولة', 'جزر'],
        'أفلام وشخصيات': ['تيتانيك', 'باتمان', 'سبايدرمان', 'أفاتار', 'هاري بوتر', 'الأسد الملك', 'علاء الدين', 'فروزن', 'جوكر', 'سوبرمان', 'كابتن أمريكا', 'هالك', 'شريك', 'كونغ فو باندا', 'ميكي ماوس', 'سبونج بوب', 'نيمو', 'باز يطير', 'دارث فيدر'],
        'وظائف': ['طبيب', 'مهندس', 'معلم', 'شرطي', 'رائد فضاء', 'طباخ', 'رسام', 'مزارع', 'طيار', 'إطفائي', 'نجار', 'ممرض', 'محامي', 'جندي', 'مغني', 'ممثل', 'صحفي', 'عامل بناء', 'سائق', 'ميكانيكي'],
        'أماكن ودول': ['مصر', 'السعودية', 'مدرسة', 'مستشفى', 'شاطئ', 'غابة', 'صحراء', 'الأهرامات', 'برج إيفل', 'اليابان', 'الصين', 'أمريكا', 'لندن', 'دبي', 'مكتبة', 'ملعب', 'مطار', 'محطة قطار', 'متحف', 'حديقة حيوان'],
        'أشياء': ['تلفزيون', 'راديو', 'ميكروفون', 'كاميرا', 'حقيبة', 'محفظة', 'مظلة', 'شوكة', 'ملعقة', 'سكين', 'صحن', 'كوب', 'فرشاة أسنان', 'مشط', 'مقص', 'غسالة', 'ثلاجة', 'مكيف', 'صاروخ', 'غواصة'],
        'أفعال': ['يقفز', 'يجري', 'يسبح', 'يطير', 'يأكل', 'يشرب', 'ينام', 'يقرأ', 'يكتب', 'يرسم', 'يضحك', 'يبكي', 'يغني', 'يرقص', 'يقود', 'يطبخ', 'يلعب', 'يفكر', 'يستمع', 'يشاهد']
    };
    
    const STORE_ITEMS = {
        // Frames
        'frame_gold': { name: 'الإطار الذهبي', price: 500, type: 'frame', style: 'gold-frame' },
        'frame_silver': { name: 'الإطار الفضي', price: 250, type: 'frame', style: 'silver-frame' },
        'frame_fire': { name: 'الإطار الناري', price: 1000, type: 'frame', style: 'fire-frame' },
        'frame_royal': { name: 'الإطار الملكي', price: 1200, type: 'frame', style: 'royal-frame' },
        'frame_water': { name: 'الإطار المائي', price: 750, type: 'frame', style: 'water-frame' },
        'frame_gem': { name: 'إطار الجوهرة', price: 1500, type: 'frame', style: 'gem-frame' },
        'frame_nature': { name: 'الإطار الطبيعي', price: 800, type: 'frame', style: 'nature-frame' },
        'frame_neon': { name: 'إطار النيون', price: 1100, type: 'frame', style: 'neon-frame' },
        
        // Backgrounds
        'bg_galaxy': { name: 'خلفية المجرة', price: 400, type: 'background', style: 'bg-galaxy' },
        'bg_sunset': { name: 'خلفية الغروب', price: 350, type: 'background', style: 'bg-sunset' },
        'bg_forest': { name: 'خلفية الغابة', price: 300, type: 'background', style: 'bg-forest' },
        'bg_sea': { name: 'خلفية البحر', price: 300, type: 'background', style: 'bg-sea' },
        'bg_night_city': { name: 'المدينة الليلية', price: 450, type: 'background', style: 'bg-night-city' },
        'bg_snow': { name: 'خلفية الثلج', price: 250, type: 'background', style: 'bg-snow' },

        // Drawing Tools
        'tool_spray': { name: 'أداة الرش', price: 600, type: 'tool', value: 'spray', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a6 6 0 0 0-6 6c0 2.5 1.5 4.6 3.6 5.5L6 17.6V22h2v-3h8v3h2V17.6l-3.6-4.1C16.5 12.6 18 10.5 18 8a6 6 0 0 0-6-6z"/><circle cx="12" cy="8" r="2"/></svg>` },
        'tool_pattern': { name: 'فرشاة النقش', price: 800, type: 'tool', value: 'pattern', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="24" fill="url(%23pattern-checker)"/><defs><pattern id="pattern-checker" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse"><rect x="0" y="0" width="4" height="4" fill="currentColor"/><rect x="4" y="4" width="4" height="4" fill="currentColor"/></pattern></defs></svg>` },
        'tool_line': { name: 'خط مستقيم', price: 400, type: 'tool', value: 'line', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 19L19 5"/></svg>` },
        'tool_rectangle': { name: 'مستطيل', price: 450, type: 'tool', value: 'rectangle', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/></svg>` },
        'tool_circle': { name: 'دائرة', price: 500, type: 'tool', value: 'circle', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/></svg>` },
        'tool_eyedropper': { name: 'قطارة الألوان', price: 700, type: 'tool', value: 'eyedropper', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z"/><path d="M12 12.69L2.69 3.34"/></svg>` },
        'tool_fill_bucket': { name: 'أداة التعبئة', price: 1000, type: 'tool', value: 'fill', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2z"/><path d="M12 2a4 4 0 0 0-4 4v.28c0 1.45.6 2.78 1.6 3.72L12 12l2.4-2.00c1-.94 1.6-2.27 1.6-3.72V6a4 4 0 0 0-4-4z"/><path d="m13.88 15.6 3.12 3.9a2 2 0 0 1-3.2 2.5l-2.8-3.5a2 2 0 0 1 .4-2.8Z"/><path d="m10.12 15.6-3.12 3.9a2 2 0 1 0 3.2 2.5l2.8-3.5a2 2 0 0 0-.4-2.8Z"/></svg>` },
        
        // Features
        'feature_custom_avatar': { name: 'صورة رمزية مخصصة', price: 2000, type: 'feature', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>` }
    };
    
    const sounds = {
        click: new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.1 } }).toDestination(),
        success: new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.005, decay: 0.2, sustain: 0.1, release: 0.2 } }).toDestination(),
        error: new Tone.Synth({ oscillator: { type: "square" }, envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 } }).toDestination(),
        join: new Tone.Synth({ oscillator: { type: "sawtooth" }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.2 } }).toDestination(),
        leave: new Tone.Synth({ oscillator: { type: "square" }, envelope: { attack: 0.1, decay: 0.5, sustain: 0, release: 0.2 } }).toDestination(),
        message: new Tone.Synth({ oscillator: { type: "triangle8" }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.1 } }).toDestination(),
        roundStart: new Tone.Synth({ oscillator: { type: "fmsine", modulationIndex: 1.2 }, envelope: { attack: 0.01, decay: 0.5, sustain: 0.1, release: 0.5 } }).toDestination(),
        roundEnd: new Tone.Synth({ oscillator: { type: "amsquare", modulationIndex: 2 }, envelope: { attack: 0.1, decay: 0.3, sustain: 0, release: 0.3 } }).toDestination(),
        buy: new Tone.Synth({ oscillator: { type: "fmsquare", modulationIndex: 0.8 }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.2 } }).toDestination(),
    };
    function playSound(sound, note = "C5") { 
        if (Tone.context.state !== 'running') { Tone.start(); } 
        if (sounds[sound]) {
            try {
                sounds[sound].triggerAttackRelease(note, "8n", Tone.now()); 
            } catch(e) { /* Mute error */ }
        }
    }

    // --- DOM Elements ---
    const screens = { home: document.getElementById('home-screen'), mainMenu: document.getElementById('main-menu-screen'), lobby: document.getElementById('lobby-screen'), createRoom: document.getElementById('create-room-screen'), game: document.getElementById('game-screen'), profile: document.getElementById('profile-screen'), leaderboard: document.getElementById('leaderboard-screen'), friends: document.getElementById('friends-screen'), store: document.getElementById('store-screen') };
    const notification = document.getElementById('notification');
    const modals = {
        updates: document.getElementById('updates-modal'),
        info: document.getElementById('info-modal'),
        codeEntry: document.getElementById('code-entry-modal'),
        passwordEntry: document.getElementById('password-entry-modal'),
        wordChoice: document.getElementById('word-choice-modal'),
        scoreboard: document.getElementById('scoreboard-modal')
    };

    // --- UI & Notifications ---
    function showScreen(screenName) { Object.values(screens).forEach(s => {if(s) s.classList.remove('active')}); if(screens[screenName]) screens[screenName].classList.add('active'); }
    function showNotification(message, isSuccess = true) {
        playSound(isSuccess ? 'success' : 'error', isSuccess ? 'G5' : 'C3');
        notification.textContent = message;
        notification.className = `fixed top-5 right-5 text-white py-2 px-4 rounded-lg shadow-lg z-50 ${isSuccess ? 'bg-green-500' : 'bg-red-500'}`;
        notification.classList.remove('hidden');
        setTimeout(() => notification.classList.add('hidden'), 3000);
    }
    function showModal(modalName, show = true) {
        if(modals[modalName]) modals[modalName].classList.toggle('active', show);
    }

    // --- Background Effects ---
    function updateBackgroundEffects(bgStyle) {
        const container = document.getElementById('background-effects');
        if (!container) return;
        container.innerHTML = ''; 

        if (bgStyle === 'bg-galaxy') {
            container.innerHTML = `<div class="stars-bg"></div><div class="twinkling-bg"></div>${Array.from({ length: 5 }, () => `<div class="shooting-star"></div>`).join('')}`;
        } else if (bgStyle === 'bg-sea') {
            container.innerHTML = `<div class="sea-plants"></div><div class="bubbles-wrapper">${Array.from({ length: 100 }, () => `<div class="bubble"></div>`).join('')}</div>`;
        } else if (bgStyle === 'bg-forest') {
            container.innerHTML = `
                <div class="sun"></div>
                <div class="cloud cloud-1"></div>
                <div class="cloud cloud-2"></div>
                <div class="mountain-range"></div>
                <div class="forest-tree tree-style-1 pos-1"></div>
                <div class="forest-tree tree-style-2 pos-2"></div>
                <div class="forest-tree tree-style-1 pos-3"></div>
                <div class="grass-layer"></div>
                <div class="leaves-wrapper">${Array.from({ length: 20 }, () => `<div class="leaf"></div>`).join('')}</div>
            `;
        } else if (bgStyle === 'bg-sunset') {
             container.innerHTML = `
                <div class="sunset-sun"></div>
                <div class="sunset-cloud c1"></div><div class="sunset-cloud c2"></div><div class="sunset-cloud c3"></div>
                <div class="sunset-mountain m1"></div>
                <div class="sunset-mountain m2"></div>
                <div class="sunset-mountain m3"></div>
            `;
        }
        else if (bgStyle === 'bg-snow') {
            container.innerHTML = `<div class="snow-wrapper">${Array.from({ length: 50 }, () => `<div class="snowflake"></div>`).join('')}</div>`;
        } else if (bgStyle === 'bg-night-city') {
            container.innerHTML = `<div class="city-bg"></div><div class="city-lights-wrapper">${Array.from({ length: 30 }, () => `<div class="city-light"></div>`).join('')}</div>`;
        }
    }

    // --- Event Delegation ---
    const eventHandler = e => {
        const target = e.target.closest('button, a, .menu-item, .avatar-pick, [data-action]');
        if (!target) return;
        
        const action = target.dataset.action;
        if (!action) playSound('click');
        
        const uid = target.dataset.uid;
        const friendshipId = target.dataset.friendshipId;
        const itemId = target.dataset.itemId;
        
        if (action) playSound('click');

        if (action === 'show-updates') { showModal('updates'); return; }
        if (action === 'show-info') { showModal('info'); return; }
        if (action === 'close-modal') { 
            if(wordChoiceCountdownInterval) clearInterval(wordChoiceCountdownInterval);
            Object.values(modals).forEach(m => m.classList.remove('active'));
            return;
        }
        if (target.classList.contains('tab-button')) {
            const tab = target.dataset.tab;
            const parent = target.closest('.tabs-container');
            if (!parent) return;
            parent.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            target.classList.add('active');
            parent.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            const tabContent = parent.querySelector(`.tab-content[data-tab="${tab}"]`);
            if (tabContent) {
                tabContent.classList.add('active');
            }
            
            if (parent.id === 'store-tabs') {
                renderStoreItems(tab);
            } else {
                 if (tab === 'all-players') loadAllPlayers();
            }
            return;
        }

        if (action === 'login-guest') auth.signInAnonymously();
        else if (action === 'login-google') auth.signInWithPopup(provider);
        else if (action === 'login-dummy') showNotification('هذه الميزة غير متوفرة حالياً', false);
        else if (action === 'change-guest-avatar') {
            const guestAvatar = document.getElementById('guest-avatar');
            if (guestAvatar) {
                const randomSeed = Math.floor(1 + Math.random() * 1000);
                guestAvatar.src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${randomSeed}`;
            }
        }
        
        else if (action === 'show-lobby') { setupLobbyUI(); showScreen('lobby'); }
        else if (action === 'show-leaderboard') { setupLeaderboardUI(); showScreen('leaderboard'); }
        else if (action === 'show-friends') { setupFriendsUI(); showScreen('friends'); }
        else if (action === 'show-code-entry') { showModal('codeEntry'); }
        else if (action === 'show-store') { setupStoreUI(); showScreen('store'); }
        else if (action === 'show-profile') { setupProfileUI(); showScreen('profile'); }
        
        else if (action === 'logout') auth.signOut();
        else if (action === 'create-room') { setupCreateRoomUI(); showScreen('createRoom'); }
        else if (action === 'join-room') handleJoinRoomClick(target);
        else if (action === 'spectate-room') handleJoinRoomClick(target, true);
        else if (action === 'queue-join-room') handleJoinRoomClick(target, false, true);
        else if (action === 'save-profile') saveProfile();
        else if (target.classList.contains('avatar-pick')) {
            document.querySelector('.avatar-pick.selected')?.classList.remove('selected');
            target.classList.add('selected');
            selectedAvatarUrl = target.src;
            customAvatarFile = null; // Clear custom file if a default one is picked
            const preview = document.getElementById('custom-avatar-preview');
            if (preview) {
                preview.src = 'https://api.dicebear.com/7.x/pixel-art/svg?seed=upload';
            }
            const input = document.getElementById('custom-avatar-input');
            if (input) {
                input.value = '';
            }
        }
        else if (action === 'confirm-create-room') createRoom();
        else if (action === 'back-to-main') showScreen('mainMenu');
        else if (action === 'send-friend-request') sendFriendRequest(uid);
        else if (action === 'accept-friend-request') acceptFriendRequest(friendshipId);
        else if (action === 'decline-friend-request') deleteFriendship(friendshipId);
        else if (action === 'remove-friend') deleteFriendship(friendshipId);
        else if (action === 'search-users') searchUsers();
        else if (action === 'copy-room-code') copyRoomCode();
        else if (action === 'start-game') checkForWaitingPlayersAndStartRound();
        else if (action === 'choose-word') chooseWord(target.dataset.word);
        else if (action === 'buy-item') buyItem(itemId);
        else if (action === 'equip-frame') equipFrame(itemId);
        else if (action === 'equip-background') equipBackground(itemId);
        else if (action === 'go-to-store') {
            setupStoreUI(); 
            showScreen('store');
            const storeTabs = document.getElementById('store-tabs');
            if(storeTabs) {
                storeTabs.querySelector('.tab-button.active')?.classList.remove('active');
                const featureTab = storeTabs.querySelector('.tab-button[data-tab="feature"]');
                if (featureTab) {
                    featureTab.classList.add('active');
                }
                renderStoreItems('feature');
            }
        }
    };
    document.body.addEventListener('click', eventHandler);
    
    document.getElementById('submit-code-btn')?.addEventListener('click', () => {
        const code = document.getElementById('code-input').value.trim();
        if (code) {
            showModal('codeEntry', false);
            joinRoom(code);
        } else {
            showNotification('الرجاء إدخال كود الغرفة', false);
        }
    });

    document.getElementById('submit-password-btn')?.addEventListener('click', async () => {
        const password = document.getElementById('password-input').value;
        if (!tempRoomId) return;
        if (!password) { return showNotification('الرجاء إدخال كلمة المرور', false); }

        const roomRef = db.collection("rooms").doc(tempRoomId);
        const roomDoc = await roomRef.get();
        if (roomDoc.exists && roomDoc.data().password === password) {
            showModal('passwordEntry', false);
            joinRoom(tempRoomId);
        } else {
            showNotification('كلمة المرور غير صحيحة', false);
        }
    });


    // --- Authentication ---
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const userDocRef = db.collection("users").doc(user.uid);
            let userDoc = await userDocRef.get();
            let isNewUser = !userDoc.exists;

            if (isNewUser) {
                let nickname = document.getElementById('nickname-input').value.trim();
                if (user.isAnonymous && !nickname) {
                    nickname = `Guest-${Math.floor(1000 + Math.random() * 9000)}`;
                }
                const initialScore = !user.isAnonymous ? 250 : 0;
                const initialCoins = !user.isAnonymous ? 100 : 0;
                
                await userDocRef.set({
                    uid: user.uid, 
                    displayName: user.displayName || nickname,
                    photoURL: user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.uid}`, 
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    stats: { 
                        totalMatches: 0, wins: 0, losses: 0, draws: 0, longestStreak: 0, 
                        currentStreak: 0, totalScore: initialScore, correctGuesses: 0,
                        coins: initialCoins
                    },
                    inventory: [],
                    equippedFrame: null,
                    equippedBackground: 'bg-classic'
                });
                if (initialScore > 0) {
                    showNotification(`مرحباً بك! لقد حصلت على ${initialScore} نقطة و ${initialCoins} عملة كهدية تسجيل.`, true);
                }
                userDoc = await userDocRef.get();
            }
            currentUser = userDoc.data();
            
            document.body.className = currentUser.equippedBackground || 'bg-classic';
            updateBackgroundEffects(currentUser.equippedBackground || 'bg-classic');
            
            setupMainMenuUI();
            showScreen('mainMenu');
        } else { 
            currentUser = null; 
            document.body.className = 'bg-classic';
            updateBackgroundEffects('bg-classic');
            if(roomsUnsubscribe) roomsUnsubscribe();
            if(friendsUnsubscribe) friendsUnsubscribe();
            if(currentRoomUnsubscribe) currentRoomUnsubscribe();
            showScreen('home'); 
        }
    });
    
    // --- Main Menu UI ---
    async function setupMainMenuUI() {
        const userStats = currentUser.stats || {};
        let requestsCount = 0;
        try {
            const q = db.collection("friendships")
                .where("users", "array-contains", currentUser.uid)
                .where("status", "==", "pending");
            
            const snapshot = await q.get();
            snapshot.forEach(doc => {
                if (doc.data().requestedBy !== currentUser.uid) {
                    requestsCount++;
                }
            });
        } catch (e) {
            console.error("Could not fetch friend requests count", e);
        }

        screens.mainMenu.innerHTML = `
            <header class="absolute top-4 left-4 right-4 flex justify-between items-center text-white">
                <button data-action="logout" class="btn btn-secondary">تسجيل الخروج</button>
                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2 bg-black/20 p-2 rounded-full">
                         <span class="font-bold text-yellow-300 text-lg">${userStats.coins || 0}</span>
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="text-yellow-400"><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"></path><path d="M13 12.586 14.707 14l-1.414 1.414-2.293-2.293a1 1 0 0 1 0-1.414l2.293-2.293L14.707 10 13 11.707V8h-2v4.586L9.293 14l-1.414 1.414L10 17.707a.999.999 0 0 1 0 1.414L7.707 21.414 9.121 22.828 11 21l2-2 2 2 1.414-1.414-2.293-2.293a1 1 0 0 1 0-1.414z"></path></svg>
                    </div>
                    <div data-action="show-profile" class="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-black/20 transition-colors">
                        <span class="font-bold hidden sm:block">${currentUser.displayName}</span>
                        <div class="avatar-wrapper ${currentUser.equippedFrame || ''}">
                           <img class="w-12 h-12 rounded-full" src="${currentUser.photoURL}">
                        </div>
                    </div>
                </div>
            </header>
            <div class="glass-effect w-full max-w-4xl p-8 rounded-2xl">
                <h2 class="font-brand text-4xl text-center mb-6">القائمة الرئيسية</h2>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div class="menu-item" data-action="show-lobby"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto mb-2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg><p class="font-bold">الغرف</p></div>
                    <div class="menu-item relative" data-action="show-friends">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto mb-2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        <p class="font-bold">الأصدقاء</p>
                        ${requestsCount > 0 ? `<span class="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white text-sm font-bold rounded-full flex items-center justify-center">${requestsCount}</span>` : ''}
                    </div>
                    <div class="menu-item" data-action="show-leaderboard"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg><p class="font-bold">المتصدرين</p></div>
                    <div class="menu-item" data-action="show-store"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto mb-2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg><p class="font-bold">المتجر</p></div>
                    <div class="menu-item col-span-2 md:col-span-1" onclick="window.open('https://www.google.com', '_blank')"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto mb-2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></svg><p class="font-bold">موقعنا الرسمي</p></div>
                    <div class="menu-item col-span-2 md:col-span-1" data-action="show-code-entry"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto mb-2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg><p class="font-bold">إدخال كود</p></div>
                </div>
            </div>`;
    }

    // --- Lobby UI ---
    function setupLobbyUI() {
        screens.lobby.innerHTML = `
            <header class="flex justify-between items-center mb-4">
                <button data-action="back-to-main" class="btn btn-secondary">القائمة الرئيسية</button>
                <h2 class="font-brand text-4xl text-center text-blue-800">الغرف المتاحة</h2>
                <div class="w-40"></div>
            </header>
            <div id="rooms-list" class="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto p-4 bg-blue-100/80 rounded-lg"></div>
            <footer class="mt-4 flex justify-center">
                <button data-action="create-room" class="btn btn-play text-xl">إنشاء غرفة جديدة</button>
            </footer>`;
        listenForRooms();
    }
    function listenForRooms() {
        if (roomsUnsubscribe) roomsUnsubscribe();
        const q = db.collection("rooms").where("status", "in", ["waiting", "playing"]).limit(50);
        
        // --- FIX: Add icons for room themes ---
        const themeIcons = {
            'عام': '🌍',
            'حيوانات': '🐾',
            'طعام': '🍕',
            'أفلام وشخصيات': '🎬',
            'وظائف': '🧑‍💼',
            'أماكن ودول': '🏛️',
            'أشياء': '📦',
            'أفعال': '🏃'
        };

        roomsUnsubscribe = q.onSnapshot((snapshot) => {
            const roomsList = document.getElementById('rooms-list');
            if(!roomsList) return;

            const visibleRooms = snapshot.docs.filter(doc => doc.data().privacy !== 'private');

            roomsList.innerHTML = visibleRooms.length > 0 ? '' : `<p class="col-span-full text-center text-gray-500 text-xl mt-8">لا توجد غرف متاحة. قم بإنشاء واحدة!</p>`;
            
            visibleRooms.forEach(doc => {
                const room = doc.data();
                const isPasswordProtected = room.privacy === 'password';
                const isPlaying = room.status === 'playing';
                const card = document.createElement('div');
                card.className = `room-card ${isPlaying ? 'playing' : 'waiting'}`;
                
                const buttonsHTML = isPlaying ? `
                    <div class="flex gap-2">
                        <button data-action="queue-join-room" data-room-id="${doc.id}" data-room-privacy="${room.privacy}" class="btn btn-play px-4 text-sm">انتظار</button>
                        <button data-action="spectate-room" data-room-id="${doc.id}" data-room-privacy="${room.privacy}" class="btn btn-secondary px-4 text-sm">مشاهدة</button>
                    </div>
                ` : `<button data-action="join-room" data-room-id="${doc.id}" data-room-privacy="${room.privacy}" class="btn btn-play px-6">انضم</button>`;

                card.innerHTML = `
                    <div>
                        <div class="flex justify-between items-center">
                            <h3 class="font-bold text-xl text-blue-800 truncate">${room.name}</h3>
                             <div class="flex items-center gap-2">
                                ${isPasswordProtected ? '<span class="text-yellow-500 text-xl" title="محمية بكلمة مرور">🔒</span>' : ''}
                                ${isPlaying ? '<span class="text-white bg-red-500 text-xs font-bold px-2 py-1 rounded-full animate-pulse">تلعب الآن</span>' : ''}
                            </div>
                        </div>
                        <p class="text-gray-600 flex items-center gap-2">${themeIcons[room.theme] || '⭐'} ${room.theme}</p>
                    </div>
                    <div class="flex justify-between items-center mt-4">
                        <span class="text-gray-500 font-bold">${room.playerCount||0} / ${room.maxPlayers} لاعب</span>
                        ${buttonsHTML}
                    </div>`;
                roomsList.appendChild(card);
            });
        }, (error) => {
            console.error("Error listening for rooms:", error);
            const roomsList = document.getElementById('rooms-list');
            if (roomsList) roomsList.innerHTML = `<p class="col-span-full text-center text-red-500 text-xl mt-8">خطأ في تحميل الغرف.</p>`;
        });
    }
    
    // --- Leaderboard & Friends UI ---
    async function setupLeaderboardUI() {
        screens.leaderboard.innerHTML = `
            <header class="flex justify-between items-center mb-4">
                <button data-action="back-to-main" class="btn btn-secondary">القائمة الرئيسية</button>
                <h2 class="font-brand text-4xl text-center text-blue-800">قائمة المتصدرين</h2>
                <div class="w-40"></div>
            </header>
            <div id="leaderboard-list" class="flex-grow overflow-y-auto p-4 bg-blue-100/80 rounded-lg"><p class="text-center">يتم التحميل...</p></div>`;
        
        try {
            const q = db.collection("users").orderBy("stats.totalScore", "desc").limit(50);
            const querySnapshot = await q.get();
            const leaderboardList = document.getElementById('leaderboard-list');
            leaderboardList.innerHTML = '';
            let rank = 1;
            querySnapshot.forEach((doc) => {
                const user = doc.data();
                const rankColor = rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-gray-500' : rank === 3 ? 'text-yellow-700' : 'text-blue-800';
                const userElement = document.createElement('div');
                userElement.className = 'flex items-center bg-white p-3 rounded-lg mb-2 shadow-sm';
                userElement.innerHTML = `
                    <span class="font-bold text-2xl w-12 text-center ${rankColor}">#${rank}</span>
                    <div class="avatar-wrapper ${user.equippedFrame || ''} mx-4">
                       <img src="${user.photoURL}" class="w-12 h-12 rounded-full">
                    </div>
                    <p class="flex-grow font-bold text-lg text-gray-800">${user.displayName}</p>
                    <p class="font-bold text-xl text-blue-600">${user.stats.totalScore || 0} نقطة</p>
                `;
                leaderboardList.appendChild(userElement);
                rank++;
            });
             if (querySnapshot.empty) {
                leaderboardList.innerHTML = '<p class="text-center text-gray-500">لا يوجد لاعبون في القائمة بعد.</p>';
            }
        } catch (error) {
            console.error("Error fetching leaderboard: ", error);
            document.getElementById('leaderboard-list').innerHTML = '<p class="text-center text-red-500">حدث خطأ أثناء تحميل القائمة.</p>';
        }
    }
    function setupFriendsUI() {
        screens.friends.innerHTML = `
            <header class="flex justify-between items-center mb-4">
                <button data-action="back-to-main" class="btn btn-secondary">القائمة الرئيسية</button>
                <h2 class="font-brand text-4xl text-center text-blue-800">الأصدقاء</h2>
                <div class="w-40"></div>
            </header>
            <div class="flex flex-col w-full flex-grow tabs-container">
                <div class="flex justify-center border-b-2 mb-4">
                    <button class="tab-button active" data-tab="my-friends">أصدقائي</button>
                    <button class="tab-button" data-tab="add-friend">إضافة صديق</button>
                    <button class="tab-button" data-tab="all-players">كل اللاعبين</button>
                </div>
                <div class="flex-grow overflow-y-auto relative">
                    <div class="tab-content active" data-tab="my-friends">
                         <div class="flex flex-col md:flex-row gap-4 h-full w-full">
                            <div class="w-full md:w-1/2 bg-blue-100/80 p-3 rounded-lg flex-grow flex flex-col">
                                <h3 class="font-bold text-lg text-center mb-2">قائمة الأصدقاء</h3>
                                <div id="friends-list" class="flex-grow overflow-y-auto space-y-2"></div>
                            </div>
                            <div class="w-full md:w-1/2 bg-yellow-100/80 p-3 rounded-lg flex-grow flex flex-col">
                                <h3 class="font-bold text-lg text-center mb-2">طلبات الصداقة</h3>
                                <div id="friend-requests-list" class="flex-grow overflow-y-auto space-y-2"></div>
                            </div>
                        </div>
                    </div>
                    <div class="tab-content flex-col w-full" data-tab="add-friend">
                         <div class="bg-blue-100/80 p-3 rounded-lg flex flex-col">
                            <h3 class="font-bold text-lg text-center mb-2">البحث عن لاعب</h3>
                            <div class="flex gap-2 mb-3">
                                <input type="text" id="search-user-input" placeholder="ابحث بالاسم..." class="input-field flex-grow">
                                <button data-action="search-users" class="btn btn-play">بحث</button>
                            </div>
                            <div id="search-results" class="flex-grow overflow-y-auto space-y-2">
                               <p class="text-center text-gray-500 mt-4">ابحث عن لاعبين لإضافتهم كأصدقاء.</p>
                            </div>
                        </div>
                    </div>
                    <div class="tab-content flex-col w-full" data-tab="all-players">
                        <div id="all-players-list" class="bg-blue-100/80 p-3 rounded-lg flex-grow overflow-y-auto space-y-2">
                            <p class="text-center text-gray-500 mt-4">يتم تحميل اللاعبين...</p>
                        </div>
                    </div>
                </div>
            </div>`;
        listenForFriends();
    }
    function listenForFriends() {
        if (friendsUnsubscribe) friendsUnsubscribe();
        const q = db.collection("friendships").where("users", "array-contains", currentUser.uid);
        
        friendsUnsubscribe = q.onSnapshot((snapshot) => {
            const friendsList = document.getElementById('friends-list');
            const requestsList = document.getElementById('friend-requests-list');
            if (!friendsList || !requestsList) return;

            friendsList.innerHTML = '';
            requestsList.innerHTML = '';
            
            let hasFriends = false;
            let hasRequests = false;

            snapshot.forEach(doc => {
                const friendship = doc.data();
                const friendUid = friendship.users.find(uid => uid !== currentUser.uid);
                
                db.collection('users').doc(friendUid).get().then(userDoc => {
                    if (!userDoc.exists) return;
                    const friendData = userDoc.data();

                    if (friendship.status === 'accepted') {
                        if (!hasFriends) friendsList.innerHTML = '';
                        hasFriends = true;
                        friendsList.innerHTML += `
                            <div class="bg-white p-2 rounded-lg flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <div class="avatar-wrapper ${friendData.equippedFrame || ''}">
                                       <img src="${friendData.photoURL}" class="w-10 h-10 rounded-full">
                                    </div>
                                    <span class="font-bold">${friendData.displayName}</span>
                                </div>
                                <button data-action="remove-friend" data-friendship-id="${doc.id}" class="btn btn-secondary text-red-500 px-2 py-1 text-xs">إزالة</button>
                            </div>`;
                    } else if (friendship.status === 'pending' && friendship.requestedBy !== currentUser.uid) {
                        if (!hasRequests) requestsList.innerHTML = '';
                        hasRequests = true;
                        requestsList.innerHTML += `
                            <div class="bg-white p-2 rounded-lg flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <div class="avatar-wrapper ${friendData.equippedFrame || ''}">
                                       <img src="${friendData.photoURL}" class="w-10 h-10 rounded-full">
                                    </div>
                                    <span class="font-bold">${friendData.displayName}</span>
                                </div>
                                <div class="flex gap-1">
                                    <button data-action="accept-friend-request" data-friendship-id="${doc.id}" class="btn btn-play bg-green-500 text-white px-2 py-1 text-xs">قبول</button>
                                    <button data-action="decline-friend-request" data-friendship-id="${doc.id}" class="btn btn-secondary px-2 py-1 text-xs">رفض</button>
                                </div>
                            </div>`;
                    }

                    if (!hasFriends) friendsList.innerHTML = `<p class="text-center text-gray-500 mt-4">ليس لديك أصدقاء بعد.</p>`;
                    if (!hasRequests) requestsList.innerHTML = `<p class="text-center text-gray-500 mt-4">لا توجد طلبات صداقة.</p>`;
                });
            });
            
            if (snapshot.empty) {
                friendsList.innerHTML = `<p class="text-center text-gray-500 mt-4">ليس لديك أصدقاء بعد.</p>`;
                requestsList.innerHTML = `<p class="text-center text-gray-500 mt-4">لا توجد طلبات صداقة.</p>`;
            }

        }, (error) => {
             console.error("Error listening for friends:", error);
        });
    }
    async function searchUsers() {
        const searchInput = document.getElementById('search-user-input').value.trim();
        const resultsDiv = document.getElementById('search-results');
        if (!searchInput) {
            resultsDiv.innerHTML = `<p class="text-center text-gray-500 mt-4">الرجاء إدخال اسم للبحث.</p>`;
            return;
        }
        resultsDiv.innerHTML = `<p class="text-center text-gray-500 mt-4">جاري البحث...</p>`;
        await renderPlayerList(resultsDiv, db.collection("users").where("displayName", ">=", searchInput).where("displayName", "<=", searchInput + '\uf8ff').limit(10));
    }
    async function loadAllPlayers() {
        const allPlayersDiv = document.getElementById('all-players-list');
        allPlayersDiv.innerHTML = `<p class="text-center text-gray-500 mt-4">جاري تحميل اللاعبين...</p>`;
        await renderPlayerList(allPlayersDiv, db.collection("users").orderBy("displayName").limit(50));
    }
    async function renderPlayerList(container, queryToRun) {
         try {
            const querySnapshot = await queryToRun.get();
            if (querySnapshot.empty) {
                container.innerHTML = `<p class="text-center text-gray-500 mt-4">لم يتم العثور على لاعبين.</p>`;
                return;
            }

            const friendshipsQuery = db.collection("friendships").where("users", "array-contains", currentUser.uid);
            const friendshipsSnapshot = await friendshipsQuery.get();
            const friendshipStatuses = {};
            friendshipsSnapshot.forEach(doc => {
                const friendship = doc.data();
                const friendUid = friendship.users.find(uid => uid !== currentUser.uid);
                friendshipStatuses[friendUid] = friendship.status;
            });
            
            container.innerHTML = '';
            querySnapshot.forEach(doc => {
                const user = doc.data();
                if (user.uid === currentUser.uid) return;

                let buttonHtml = `<button data-action="send-friend-request" data-uid="${user.uid}" class="btn btn-play px-3 py-1 text-sm">إضافة</button>`;
                const friendStatus = friendshipStatuses[user.uid];
                if (friendStatus) {
                    if (friendStatus === 'accepted') buttonHtml = `<span class="text-green-500 font-bold">صديق</span>`;
                    else if (friendStatus === 'pending') buttonHtml = `<span class="text-gray-500">تم الإرسال</span>`;
                }

                container.innerHTML += `
                    <div class="bg-white p-2 rounded-lg flex items-center justify-between">
                        <div class="flex items-center gap-2">
                             <div class="avatar-wrapper ${user.equippedFrame || ''}">
                               <img src="${user.photoURL}" class="w-10 h-10 rounded-full">
                            </div>
                            <span class="font-bold">${user.displayName}</span>
                        </div>
                        ${buttonHtml}
                    </div>`;
            });
        } catch(error) {
            console.error("Error rendering player list:", error);
            container.innerHTML = `<p class="text-center text-red-500 mt-4">حدث خطأ.</p>`;
        }
    }
    async function sendFriendRequest(targetUid) {
        if (currentUser.uid === targetUid) return;
        try {
            const targetUserDocRef = db.collection("users").doc(targetUid);
            const targetUserDoc = await targetUserDocRef.get();
            if (!targetUserDoc.exists) throw new Error("User not found");
            const targetUserData = targetUserDoc.data();

            const friendshipId = [currentUser.uid, targetUid].sort().join('_');
            const friendshipRef = db.collection("friendships").doc(friendshipId);

            await friendshipRef.set({
                users: [currentUser.uid, targetUid],
                status: 'pending',
                requestedBy: currentUser.uid,
                [currentUser.uid]: { displayName: currentUser.displayName, photoURL: currentUser.photoURL },
                [targetUid]: { displayName: targetUserData.displayName, photoURL: targetUserData.photoURL }
            });
            
            showNotification("تم إرسال طلب الصداقة بنجاح!");
            const activeTab = document.querySelector('.tab-content.active').dataset.tab;
            if (activeTab === 'add-friend') searchUsers();
            if (activeTab === 'all-players') loadAllPlayers();

        } catch (error) {
            console.error("Error sending friend request:", error);
            showNotification("حدث خطأ أثناء إرسال الطلب.", false);
        }
    }
    async function acceptFriendRequest(friendshipId) {
        const friendshipRef = db.collection("friendships").doc(friendshipId);
        await friendshipRef.update({ status: 'accepted' });
        showNotification("تم قبول طلب الصداقة!");
    }
    async function deleteFriendship(friendshipId) {
        const friendshipRef = db.collection("friendships").doc(friendshipId);
        await friendshipRef.delete();
        showNotification("تم تحديث العلاقة.");
    }

    function setupProfileUI() {
        const stats = currentUser.stats || {};
        const inventory = currentUser.inventory || [];
        const hasCustomAvatarFeature = inventory.includes('feature_custom_avatar');


        screens.profile.innerHTML = `
            <div class="main-container w-full max-w-6xl p-4 sm:p-8 relative">
                <button data-action="back-to-main" class="btn btn-secondary absolute top-4 left-4">رجوع</button>
                <h2 class="font-brand text-4xl text-center mb-6 text-blue-800">الملف الشخصي</h2>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="space-y-4">
                        <input type="text" id="profile-name-input" class="w-full p-3 text-center input-field text-xl" value="${currentUser.displayName}">
                        
                        <div class="bg-gray-100/80 p-4 rounded-lg text-center">
                            <h3 class="font-bold text-lg mb-2">الصورة الرمزية</h3>
                            <div id="custom-avatar-uploader"></div>
                        </div>

                        <div class="grid grid-cols-2 gap-3 text-center">
                             <div class="bg-blue-50/80 p-3 rounded-lg"><p class="text-2xl font-bold text-blue-800">${stats.totalMatches || 0}</p><p class="text-gray-500 text-sm">إجمالي المباريات</p></div>
                            <div class="bg-green-50/80 p-3 rounded-lg"><p class="text-2xl font-bold text-green-800">${stats.wins || 0}</p><p class="text-gray-500 text-sm">مرات الفوز</p></div>
                        </div>
                         <button data-action="save-profile" id="save-profile-btn" class="btn btn-play w-full py-3 text-xl mt-4">حفظ التغييرات</button>
                         <div id="upload-spinner" class="hidden w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                    <div class="lg:col-span-2">
                         <div class="tabs-container flex flex-col w-full">
                            <div class="flex justify-center border-b-2 mb-4">
                                <button class="tab-button active" data-tab="avatars">الصور الرمزية</button>
                                <button class="tab-button" data-tab="frames">الإطارات</button>
                                <button class="tab-button" data-tab="backgrounds">الخلفيات</button>
                            </div>
                            <div class="flex-grow overflow-y-auto relative bg-gray-100/80 p-4 rounded-lg min-h-[400px]">
                                <div class="tab-content active" data-tab="avatars">
                                    <div id="avatar-selection" class="grid grid-cols-5 sm:grid-cols-7 gap-3"></div>
                                </div>
                                <div class="tab-content" data-tab="frames">
                                     <div id="frame-inventory" class="grid grid-cols-3 sm:grid-cols-4 gap-3"></div>
                                </div>
                                 <div class="tab-content" data-tab="backgrounds">
                                     <div id="background-inventory" class="grid grid-cols-2 sm:grid-cols-3 gap-3"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        
        const avatarSelection = document.getElementById('avatar-selection');
        avatarSelection.innerHTML = '';
        selectedAvatarUrl = currentUser.photoURL;
        for(let i = 1; i <= AVATAR_COUNT; i++) {
            const avatarUrl = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${i}`;
            const img = document.createElement('img');
            img.src = avatarUrl;
            img.className = `w-16 h-16 cursor-pointer avatar-pick bg-white rounded-full border-4 border-transparent transition-all duration-200`;
            if (avatarUrl === selectedAvatarUrl) {
                img.classList.add('selected');
            }
            avatarSelection.appendChild(img);
        }

        const customAvatarUploader = document.getElementById('custom-avatar-uploader');
        if(hasCustomAvatarFeature && storage) {
            customAvatarUploader.innerHTML = `
                <img id="custom-avatar-preview" src="${currentUser.photoURL}" class="w-24 h-24 rounded-full border-4 border-gray-200 mb-2 mx-auto bg-white object-cover">
                <input type="file" id="custom-avatar-input" accept="image/*" class="hidden">
                <label for="custom-avatar-input" class="btn btn-secondary cursor-pointer">اختر صورة</label>
                <p class="text-xs text-gray-500 mt-1">الحجم الأقصى: 1 ميجابايت</p>
            `;
            document.getElementById('custom-avatar-input').addEventListener('change', handleAvatarFileSelect);
        } else if (hasCustomAvatarFeature && !storage) {
             customAvatarUploader.innerHTML = `<p class="text-red-500 text-sm">ميزة رفع الصور معطلة. يجب على المطور إضافة مكتبة Firebase Storage.</p>`;
        }
        else {
            customAvatarUploader.innerHTML = `
                <p class="text-gray-600 mb-3">افتح ميزة رفع صورتك الخاصة من المتجر!</p>
                <button data-action="go-to-store" class="btn btn-play">اذهب للمتجر</button>
            `;
        }
        
        renderInventory('frame', 'frame-inventory');
        renderInventory('background', 'background-inventory');

        document.querySelector(`.equip-item[data-item-id="${currentUser.equippedFrame || 'null'}"]`)?.classList.add('selected');
        document.querySelector(`.equip-item[data-item-id="${currentUser.equippedBackground || 'bg-classic'}"]`)?.classList.add('selected');
    }

    function renderInventory(type, containerId) {
        const container = document.getElementById(containerId);
        const userInventory = currentUser.inventory || [];
        let defaultItemHTML = '';
        if (type === 'frame') {
            defaultItemHTML = `
                <div class="equip-item" data-action="equip-frame" data-item-id="null">
                    <div class="avatar-wrapper no-frame w-20 h-20 flex items-center justify-center bg-gray-200 rounded-full text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                    </div>
                    <p>بلا إطار</p>
                </div>`;
        } else if (type === 'background') {
            defaultItemHTML = `
                <div class="equip-item" data-action="equip-background" data-item-id="bg-classic">
                    <div class="w-full h-16 rounded-lg bg-classic border-2"></div>
                    <p>الأساسية</p>
                </div>`;
        }
        container.innerHTML = defaultItemHTML;

        Object.keys(STORE_ITEMS).forEach(itemId => {
            const item = STORE_ITEMS[itemId];
            if (item.type === type && userInventory.includes(itemId)) {
                let previewHTML = '';
                if(type === 'frame') {
                    previewHTML = `<div class="avatar-wrapper ${item.style} w-20 h-20 flex items-center justify-center rounded-full"><img src="${currentUser.photoURL}" class="w-16 h-16 rounded-full"></div>`;
                } else if (type === 'background') {
                    previewHTML = `<div class="w-full h-16 rounded-lg ${item.style} border-2 relative overflow-hidden"></div>`;
                }
                container.innerHTML += `<div class="equip-item" data-action="equip-${type}" data-item-id="${item.style}">${previewHTML}<p>${item.name}</p></div>`;
            }
        });
    }

    function handleAvatarFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            return showNotification("الرجاء اختيار ملف صورة صالح.", false);
        }
        if (file.size > 1 * 1024 * 1024) { // 1MB limit
            return showNotification("حجم الصورة كبير جداً. الحد الأقصى 1 ميجابايت.", false);
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById('custom-avatar-preview').src = event.target.result;
            customAvatarFile = file;
            selectedAvatarUrl = 'custom'; // Mark that a custom file is chosen
            document.querySelector('.avatar-pick.selected')?.classList.remove('selected');
        };
        reader.readAsDataURL(file);
    }
    
    async function saveProfile() {
        const saveButton = document.getElementById('save-profile-btn');
        const spinner = document.getElementById('upload-spinner');
        saveButton.classList.add('hidden');
        spinner.classList.remove('hidden');

        try {
            const newName = document.getElementById('profile-name-input').value.trim();
            if(!newName) {
                throw new Error("الاسم لا يمكن أن يكون فارغًا");
            }

            let finalPhotoURL = currentUser.photoURL;
            if (selectedAvatarUrl && selectedAvatarUrl !== 'custom') {
                finalPhotoURL = selectedAvatarUrl;
            }

            // If a new custom avatar is selected, upload it
            if (customAvatarFile && storage) {
                const storageRef = storage.ref(`avatars/${currentUser.uid}/${customAvatarFile.name}`);
                const uploadTask = await storageRef.put(customAvatarFile);
                finalPhotoURL = await uploadTask.ref.getDownloadURL();
                customAvatarFile = null; // Reset after upload
            }

            const userDocRef = db.collection("users").doc(currentUser.uid);
            await userDocRef.update({ displayName: newName, photoURL: finalPhotoURL });
            
            currentUser.displayName = newName;
            currentUser.photoURL = finalPhotoURL;
            
            showNotification("تم تحديث الملف الشخصي بنجاح!");
            setupMainMenuUI();
            showScreen('mainMenu');

        } catch (error) {
            console.error("Error saving profile:", error);
            showNotification(error.message, false);
        } finally {
            saveButton.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    }
    
    // --- Store Functions ---
    async function setupStoreUI() {
        const userStats = currentUser.stats || {};
        screens.store.innerHTML = `
            <header class="flex justify-between items-center mb-4">
                <button data-action="back-to-main" class="btn btn-secondary">القائمة الرئيسية</button>
                <h2 class="font-brand text-4xl text-center text-blue-800">المتجر</h2>
                <div class="flex items-center gap-2 bg-blue-100/80 p-2 rounded-full text-blue-800">
                    <span id="user-coins-display" class="font-bold text-lg">${userStats.coins || 0}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="text-yellow-400"><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"></path><path d="M13 12.586 14.707 14l-1.414 1.414-2.293-2.293a1 1 0 0 1 0-1.414l2.293-2.293L14.707 10 13 11.707V8h-2v4.586L9.293 14l-1.414 1.414L10 17.707a.999.999 0 0 1 0 1.414L7.707 21.414 9.121 22.828 11 21l2-2 2 2 1.414-1.414-2.293-2.293a1 1 0 0 1 0-1.414z"></path></svg>
                </div>
            </header>
            <div id="store-tabs" class="tabs-container flex-grow flex flex-col">
                <div class="flex justify-center border-b-2 mb-4">
                    <button class="tab-button active" data-tab="frame">الإطارات</button>
                    <button class="tab-button" data-tab="background">الخلفيات</button>
                    <button class="tab-button" data-tab="tool">الأدوات</button>
                    <button class="tab-button" data-tab="feature">مميزات</button>
                </div>
                <div class="flex-grow overflow-y-auto p-4 bg-blue-100/80 rounded-lg">
                    <div id="store-items-list" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"></div>
                </div>
            </div>
            `;
        renderStoreItems('frame'); // Render initial tab
    }
    
    function renderStoreItems(category) {
        const storeList = document.getElementById('store-items-list');
        if (!storeList) return;
        storeList.innerHTML = '';
        const userInventory = currentUser.inventory || [];

        Object.keys(STORE_ITEMS).forEach(itemId => {
            const item = STORE_ITEMS[itemId];
            if (item.type !== category) return;

            const alreadyOwned = userInventory.includes(itemId);
            const card = document.createElement('div');
            card.className = `bg-white p-4 rounded-lg flex flex-col items-center justify-between text-center transition-transform hover:scale-105 shadow-md`;
            
            let previewHTML = '';
            if (item.type === 'frame') {
                 previewHTML = `<div class="avatar-wrapper ${item.style} w-24 h-24 flex items-center justify-center rounded-full mb-3">
                    <img src="${currentUser.photoURL}" class="w-20 h-20 rounded-full">
                </div>`;
            } else if (item.type === 'background') {
                previewHTML = `<div class="w-full h-24 rounded-lg ${item.style} mb-3 border-2 border-white shadow-inner relative overflow-hidden"></div>`;
            } else if (item.type === 'tool' || item.type === 'feature') {
                 previewHTML = `<div class="w-24 h-24 flex items-center justify-center text-5xl bg-gray-100 rounded-full mb-3">${item.icon}</div>`
            }

            card.innerHTML = `
                ${previewHTML}
                <h3 class="font-bold text-lg text-blue-800">${item.name}</h3>
                <div class="flex items-center gap-2 my-3">
                    <span class="font-bold text-xl text-yellow-500">${item.price}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="text-yellow-400"><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"></path><path d="M13 12.586 14.707 14l-1.414 1.414-2.293-2.293a1 1 0 0 1 0-1.414l2.293-2.293L14.707 10 13 11.707V8h-2v4.586L9.293 14l-1.414 1.414L10 17.707a.999.999 0 0 1 0 1.414L7.707 21.414 9.121 22.828 11 21l2-2 2 2 1.414-1.414-2.293-2.293a1 1 0 0 1 0-1.414z"></path></svg>
                </div>
                <button data-action="buy-item" data-item-id="${itemId}" class="btn ${alreadyOwned ? 'btn-secondary' : 'btn-play'} w-full" ${alreadyOwned ? 'disabled' : ''}>
                    ${alreadyOwned ? 'تم الشراء' : 'شراء'}
                </button>
            `;
            storeList.appendChild(card);
        });
    }

    async function buyItem(itemId) {
        const item = STORE_ITEMS[itemId];
        if (!item) return showNotification("منتج غير موجود", false);
        
        playSound('buy', 'E5');
        const userDocRef = db.collection("users").doc(currentUser.uid);

        try {
            await db.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userDocRef);
                if (!userDoc.exists) throw new Error("المستخدم غير موجود");

                const userData = userDoc.data();
                const userCoins = userData.stats.coins || 0;
                const userInventory = userData.inventory || [];

                if (userCoins < item.price) throw new Error("ليس لديك عملات كافية!");
                if (userInventory.includes(itemId)) throw new Error("أنت تمتلك هذا المنتج بالفعل!");

                transaction.update(userDocRef, {
                    'stats.coins': firebase.firestore.FieldValue.increment(-item.price),
                    inventory: firebase.firestore.FieldValue.arrayUnion(itemId)
                });
            });

            currentUser.stats.coins -= item.price;
            currentUser.inventory.push(itemId);

            showNotification(`تم شراء "${item.name}" بنجاح!`, true);
            document.getElementById('user-coins-display').textContent = currentUser.stats.coins;
            const button = document.querySelector(`button[data-item-id="${itemId}"]`);
            if (button) {
                button.disabled = true;
                button.textContent = 'تم الشراء';
                button.classList.remove('btn-play');
                button.classList.add('btn-secondary');
            }
        } catch (error) {
            console.error("Error buying item: ", error);
            showNotification(error.message, false);
        }
    }
    
    async function equipFrame(frameStyle) {
        if (frameStyle === 'null') frameStyle = null;
        const userDocRef = db.collection("users").doc(currentUser.uid);
        try {
            await userDocRef.update({ equippedFrame: frameStyle });
            currentUser.equippedFrame = frameStyle;
            showNotification("تم تجهيز الإطار بنجاح!", true);
            
            document.querySelectorAll('#frame-inventory .equip-item.selected').forEach(el => el.classList.remove('selected'));
            document.querySelector(`#frame-inventory .equip-item[data-item-id="${frameStyle || 'null'}"]`)?.classList.add('selected');

        } catch (error) {
            console.error("Error equipping frame: ", error);
            showNotification("حدث خطأ أثناء تجهيز الإطار", false);
        }
    }

     async function equipBackground(bgStyle) {
        if (bgStyle === 'null') bgStyle = 'bg-classic';
        const userDocRef = db.collection("users").doc(currentUser.uid);
        try {
            await userDocRef.update({ equippedBackground: bgStyle });
            currentUser.equippedBackground = bgStyle;
            
            document.body.className = bgStyle;
            updateBackgroundEffects(bgStyle);
            
            showNotification("تم تجهيز الخلفية بنجاح!", true);
            
            document.querySelectorAll('#background-inventory .equip-item.selected').forEach(el => el.classList.remove('selected'));
            document.querySelector(`#background-inventory .equip-item[data-item-id="${bgStyle}"]`)?.classList.add('selected');

        } catch (error) {
            console.error("Error equipping background: ", error);
            showNotification("حدث خطأ أثناء تجهيز الخلفية", false);
        }
    }

    // --- Game Room UI ---
    function setupCreateRoomUI() {
        screens.createRoom.innerHTML = `
            <div class="main-container w-full max-w-lg p-8 relative">
                <button data-action="back-to-main" class="btn btn-secondary absolute top-4 left-4">رجوع</button>
                <h2 class="font-brand text-4xl text-center mb-6 text-blue-800">إنشاء غرفة جديدة</h2>
                <div class="space-y-4">
                    <div><label class="font-bold">اسم الغرفة</label><input type="text" id="room-name-input" class="w-full input-field mt-1" placeholder="غرفة الأصدقاء..."></div>
                    <div><label class="font-bold">موضوع الرسم</label><select id="room-theme-select" class="w-full input-field mt-1">${Object.keys(WORD_LISTS).map(theme => `<option value="${theme}">${theme}</option>`).join('')}</select></div>
                    <div><label class="font-bold">مدة الجولة (بالثواني)</label><select id="room-time-select" class="w-full input-field mt-1"><option value="60">60</option><option value="80" selected>80</option><option value="100">100</option><option value="120">120</option></select></div>
                    <div><label class="font-bold">النقاط المطلوبة للفوز</label><select id="room-score-select" class="w-full input-field mt-1"><option value="120">120</option><option value="150" selected>150</option><option value="200">200</option></select></div>
                    <div><label class="font-bold">عدد اللاعبين</label><select id="room-players-select" class="w-full input-field mt-1"><option value="4">4</option> <option value="6">6</option> <option value="8" selected>8</option> <option value="10">10</option></select></div>
                    <div><label class="font-bold">خصوصية الغرفة</label><select id="room-privacy-select" class="w-full input-field mt-1"><option value="public">عامة</option><option value="password">بكلمة مرور</option><option value="private">خاصة</option></select></div>
                    <div id="password-container" class="hidden"><label class="font-bold">كلمة المرور</label><input type="password" id="room-password-input" class="w-full input-field mt-1"></div>
                    <button data-action="confirm-create-room" class="btn btn-play w-full py-3 text-xl mt-4">إنشاء الغرفة</button>
                </div>
            </div>`;
        
        document.getElementById('room-privacy-select').addEventListener('change', (e) => {
            document.getElementById('password-container').classList.toggle('hidden', e.target.value !== 'password');
        });
    }

    function setupGameUI() {
        screens.game.innerHTML = `
        <div class="game-ui-container w-full h-full p-2 flex flex-col md:flex-row gap-2">
            <!-- Player List & Chat -->
            <div class="w-full md:w-1/4 flex flex-col gap-2">
                <div id="player-list" class="game-module flex-grow p-2 overflow-y-auto space-y-2"></div>
                <div class="game-module flex flex-col p-2 h-48 md:h-1/3">
                    <h3 class="text-center font-bold border-b-2 pb-1 text-blue-800">الدردشة</h3>
                    <div id="chat-box" class="flex-grow overflow-y-auto py-1"></div>
                    <form id="chat-form" class="flex gap-2 pt-1 border-t-2"><input type="text" placeholder="اكتب رسالة..." class="flex-grow p-1 bg-gray-100 rounded-lg border focus:outline-none"><button type="submit" class="btn btn-secondary px-3 py-1 text-sm">إرسال</button></form>
                </div>
            </div>
            
            <!-- Main Area: Canvas & Guesses -->
            <div class="flex-grow flex flex-col gap-2">
                 <div id="game-top-bar" class="game-module p-2 flex justify-between items-center text-xl font-bold text-blue-800 relative">
                    <div class="absolute top-1/2 -translate-y-1/2 left-2 flex gap-2 z-10">
                         <button id="leave-room-btn" class="btn btn-secondary text-sm px-3 py-1">الخروج</button>
                         <button data-action="copy-room-code" class="btn btn-secondary text-sm px-3 py-1">نسخ الكود</button>
                    </div>
                    <div id="game-timer" class="w-24 text-center text-2xl font-mono">0:00</div>
                    <div id="word-display" class="flex-grow text-center tracking-widest">انتظار بدء اللعبة...</div>
                    <div class="w-24 text-center" id="round-counter">الجولة 0</div>
                </div>
                <div id="canvas-container" class="game-module flex-grow relative p-1">
                     <canvas id="drawing-canvas" class="w-full h-full bg-white rounded-md absolute top-0 left-0"></canvas>
                     <canvas id="preview-canvas" class="w-full h-full rounded-md absolute top-0 left-0 pointer-events-none"></canvas>
                     <div id="spectator-banner" class="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/70 to-transparent text-center text-white font-bold text-xl rounded-t-md hidden pointer-events-none">
                        <span id="spectator-main-text"></span>
                        <span id="spectator-sub-text" class="block text-sm font-normal mt-1"></span>
                     </div>
                     <div class="absolute top-2 right-2 flex gap-2">
                        <button id="start-game-btn" data-action="start-game" class="btn btn-play text-xs px-2 py-1 hidden">ابدأ اللعبة</button>
                     </div>
                </div>
                <div class="game-module flex flex-col p-2 h-40">
                    <h3 class="text-center font-bold border-b-2 pb-1 text-blue-800">الإجابات والتخمينات</h3>
                    <div id="guesses-box" class="flex-grow overflow-y-auto py-1"></div>
                    <form id="guess-form" class="flex gap-2 pt-1 border-t-2"><input id="guess-input" type="text" placeholder="خمّن هنا..." class="flex-grow p-1 bg-gray-100 rounded-lg border focus:outline-none"><button type="submit" class="btn btn-play px-3 py-1 text-sm">إرسال</button></form>
                </div>
            </div>

            <!-- Toolbar -->
            <div id="vertical-toolbar" class="bg-white rounded-xl p-2 flex flex-col items-center space-y-2 border-l-4 border-blue-200 overflow-y-auto">
                <!-- Standard Tools -->
                <div class="tool-icon active" data-tool="brush" title="فرشاة"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></div>
                <div class="tool-icon" data-tool="eraser" title="ممحاة"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21H7Z"/></svg></div>
                
                <div class="w-full h-px bg-gray-300 my-1"></div>
                 <!-- Purchased Tools will be injected here -->
                <div id="purchased-tools-container" class="flex flex-col items-center space-y-2"></div>
                <div class="w-full h-px bg-gray-300 my-1"></div>
                
                <div class="tool-icon" data-tool="clear" title="مسح الكل"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></div>
                <div id="undo-redo-container" class="flex gap-2">
                    <button id="undo-btn" class="tool-icon disabled" title="تراجع" disabled><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 4H5v10"/><path d="m9 9.5 10 9.5" transform="scale(-1, 1) translate(-24, 0)"/></svg></button>
                    <button id="redo-btn" class="tool-icon disabled" title="تقدم" disabled><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 4h10v10"/><path d="m9 9.5 10 9.5"/></svg></button>
                </div>

                <div class="w-full h-px bg-gray-300 my-1"></div>
                <div id="brush-sizes" class="flex flex-col gap-2">
                    <div class="tool-icon" data-size="2"><div class="w-1 h-1 bg-black rounded-full"></div></div>
                    <div class="tool-icon active" data-size="5"><div class="w-2 h-2 bg-black rounded-full"></div></div>
                    <div class="tool-icon" data-size="10"><div class="w-3 h-3 bg-black rounded-full"></div></div>
                    <div class="tool-icon" data-size="20"><div class="w-4 h-4 bg-black rounded-full"></div></div>
                </div>
                <div class="w-full h-px bg-gray-300 my-1"></div>
                <div id="color-palette" class="grid grid-cols-2 gap-1.5"></div>
                <input type="color" id="custom-color-picker" class="w-8 h-8 mt-2 cursor-pointer" title="اختيار لون">
            </div>
        </div>`;
        
        const purchasedToolsContainer = document.getElementById('purchased-tools-container');
        const userInventory = currentUser.inventory || [];
        
        const purchasedToolsHtml = Object.keys(STORE_ITEMS).map(itemId => {
            const item = STORE_ITEMS[itemId];
            if (item.type === 'tool' && userInventory.includes(itemId)) {
                return `<div class="tool-icon" data-tool="${item.value}" title="${item.name}">${item.icon}</div>`;
            }
            return '';
        }).join('');
        
        purchasedToolsContainer.innerHTML = purchasedToolsHtml;

        const colors = ['#000000', '#FFFFFF', '#C2C2C2', '#606060', '#FF0000', '#FF7400', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#9B00FF', '#654321', '#FFC0CB'];
        const colorPalette = document.getElementById('color-palette');
        colors.forEach((c, i) => {
            colorPalette.innerHTML += `<div class="color-swatch ${i === 0 ? 'active' : ''}" style="background-color: ${c}" data-color="${c}"></div>`;
        });
        
        document.getElementById('leave-room-btn').onclick = leaveRoom;
        initCanvas();
    }
    
    // --- Room Management ---
    async function createRoom(){
        const name = document.getElementById('room-name-input').value.trim();
        const theme = document.getElementById('room-theme-select').value;
        const roundTime = parseInt(document.getElementById('room-time-select').value, 10);
        const maxScore = parseInt(document.getElementById('room-score-select').value, 10);
        const maxPlayers = parseInt(document.getElementById('room-players-select').value, 10);
        const privacy = document.getElementById('room-privacy-select').value;
        const password = document.getElementById('room-password-input').value;

        if (!name) { return showNotification("الرجاء إدخال اسم للغرفة.", false); }
        if (privacy === 'password' && !password) { return showNotification("الرجاء إدخال كلمة مرور للغرفة.", false); }

        try {
            const roomData = { 
                name, theme, maxPlayers, privacy, playerCount: 0, spectatorCount: 0,
                status: 'waiting', createdAt: firebase.firestore.FieldValue.serverTimestamp(), host: currentUser.uid,
                settings: { roundTime, maxScore },
                gameState: { round: 0, drawerUid: null, drawerName: null, currentWord: '', wordsToChoose: [], correctGuessers: [], lastDrawerUid: null },
                waitingPlayers: []
             };
            if (privacy === 'password') roomData.password = password;

            const roomRef = await db.collection("rooms").add(roomData);
            showNotification("تم إنشاء الغرفة بنجاح!", true);
            joinRoom(roomRef.id);
        } catch (error) {
            console.error("Error creating room: ", error);
            showNotification("حدث خطأ أثناء إنشاء الغرفة.", false);
        }
    }

    function handleJoinRoomClick(target, isSpectating = false, isQueued = false) {
        const roomId = target.dataset.roomId;
        const privacy = target.dataset.roomPrivacy;
        
        const action = () => {
            if(isSpectating) {
                spectateRoom(roomId);
            } else if (isQueued) {
                queueToJoinRoom(roomId);
            } else {
                joinRoom(roomId);
            }
        };

        if (privacy === 'password') {
            tempRoomId = roomId;
            document.getElementById('password-input').value = '';
            showModal('passwordEntry');
            // The actual join logic will be called from the password modal's submit button
            document.getElementById('submit-password-btn').onclick = async () => {
                const password = document.getElementById('password-input').value;
                if (!password) { return showNotification('الرجاء إدخال كلمة المرور', false); }
                
                const roomRef = db.collection("rooms").doc(roomId);
                const roomDoc = await roomRef.get();
                if (roomDoc.exists && roomDoc.data().password === password) {
                    showModal('passwordEntry', false);
                    action();
                } else {
                    showNotification('كلمة المرور غير صحيحة', false);
                }
            };
        } else {
            action();
        }
    }

    async function enterRoom(roomId, role) {
        if (!currentUser) return showNotification("يجب عليك تسجيل الدخول أولاً", false);
        playerRoleInCurrentRoom = role;
        const roomRef = db.collection("rooms").doc(roomId);
        const playerRef = roomRef.collection("players").doc(currentUser.uid);

        try {
            await db.runTransaction(async (transaction) => {
                const roomDoc = await transaction.get(roomRef);
                if (!roomDoc.exists) throw new Error("الغرفة غير موجودة!");
                const roomData = roomDoc.data();

                const isAlreadyInRoom = (await transaction.get(playerRef)).exists;
                if (isAlreadyInRoom) {
                    console.warn("Player is already in the room, proceeding.");
                    return; 
                }

                if (role === 'player' && roomData.playerCount >= roomData.maxPlayers) {
                     throw new Error("الغرفة ممتلئة!");
                }
                
                const playerData = { 
                    uid: currentUser.uid, 
                    displayName: currentUser.displayName, 
                    photoURL: currentUser.photoURL, 
                    equippedFrame: currentUser.equippedFrame || null,
                    score: 0, 
                    roundScore: 0, 
                    hasGuessed: false,
                    role: role 
                };
                
                transaction.set(playerRef, playerData);
                
                if (role === 'player') {
                    transaction.update(roomRef, { playerCount: firebase.firestore.FieldValue.increment(1) });
                } else if (role === 'spectator') {
                    transaction.update(roomRef, { spectatorCount: firebase.firestore.FieldValue.increment(1) });
                } else if (role === 'waiting') {
                     transaction.update(roomRef, { 
                        spectatorCount: firebase.firestore.FieldValue.increment(1),
                        waitingPlayers: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
                    });
                }
            });
            
            currentRoomId = roomId;
            showScreen('game');
            setupGameUI();
            setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
            setupGameListeners(roomId);
            await sendMessage(null, 'system', `${currentUser.displayName} انضم إلى الغرفة.`);
            
        } catch(error) {
             console.error("Error entering room: ", error);
             showNotification(error.message, false);
             playerRoleInCurrentRoom = null;
        }
    }

    async function joinRoom(roomId) {
        return enterRoom(roomId, 'player');
    }
    
    async function spectateRoom(roomId) {
        return enterRoom(roomId, 'spectator');
    }
    
    async function queueToJoinRoom(roomId) {
        return enterRoom(roomId, 'waiting');
    }


    async function leaveRoom(){
        if (!currentRoomId || !currentUser) return;
        const roomId = currentRoomId; 
        const userRole = playerRoleInCurrentRoom;

        await sendMessage(null, 'system', `${currentUser.displayName} غادر الغرفة.`);

        // Detach listeners first
        gameListeners.forEach(unsub => unsub());
        gameListeners = [];
        if (currentRoomUnsubscribe) currentRoomUnsubscribe();
        currentRoomId = null;
        currentRoomData = null;
        playerRoleInCurrentRoom = null;
        if(roundTimerInterval) clearInterval(roundTimerInterval);
        if(scoreboardTimeout) clearTimeout(scoreboardTimeout);
        if(roundEndTimeout) clearTimeout(roundEndTimeout);
        if(scoreboardCountdownInterval) clearInterval(scoreboardCountdownInterval);
        
        const roomRef = db.collection("rooms").doc(roomId);
        const playerRef = roomRef.collection("players").doc(currentUser.uid);

        try {
            await db.runTransaction(async (transaction) => {
                const roomDoc = await transaction.get(roomRef);
                if (roomDoc.exists) {
                    const currentData = roomDoc.data();
                    let updates = {};
                    
                    if(userRole === 'player') {
                        updates.playerCount = firebase.firestore.FieldValue.increment(-1);
                    } else if (userRole === 'spectator' || userRole === 'waiting') {
                        updates.spectatorCount = firebase.firestore.FieldValue.increment(-1);
                    }
                    if(userRole === 'waiting') {
                         updates.waitingPlayers = firebase.firestore.FieldValue.arrayRemove(currentUser.uid);
                    }
                    
                    const newTotalOccupants = (currentData.playerCount || 0) + (currentData.spectatorCount || 0) - 1;

                    if (newTotalOccupants > 0) {
                         if (currentData.host === currentUser.uid) {
                            const playersSnap = await roomRef.collection("players").where('role', '==', 'player').where(firebase.firestore.FieldPath.documentId(), '!=', currentUser.uid).limit(1).get();
                            if (!playersSnap.empty) {
                                updates.host = playersSnap.docs[0].id;
                            }
                        }
                       transaction.update(roomRef, updates);
                    } else {
                       transaction.delete(roomRef); // Delete room if empty
                    }
                }
                transaction.delete(playerRef);
            });
            showScreen('mainMenu');
            showNotification("لقد خرجت من الغرفة.", true);
        } catch (error) {
            console.error("Error leaving room: ", error);
            showNotification("حدث خطأ أثناء الخروج.", false);
            showScreen('mainMenu'); // Go back to main menu anyway
        }
    }
    
    // --- Game Logic ---
     async function checkForWaitingPlayersAndStartRound() {
        if (!currentRoomData || currentUser.uid !== currentRoomData.host) return;

        const roomRef = db.collection("rooms").doc(currentRoomId);
        const waitingPlayers = currentRoomData.waitingPlayers || [];
        const maxPlayers = currentRoomData.maxPlayers;
        const currentPlayers = currentRoomData.playerCount;

        if (waitingPlayers.length > 0) {
            const batch = db.batch();
            const slotsAvailable = maxPlayers - currentPlayers;
            const playersToJoin = waitingPlayers.slice(0, slotsAvailable);

            playersToJoin.forEach(uid => {
                const playerRef = roomRef.collection("players").doc(uid);
                batch.update(playerRef, { role: 'player' });
            });

            const remainingWaiting = waitingPlayers.slice(slotsAvailable);
            batch.update(roomRef, {
                playerCount: firebase.firestore.FieldValue.increment(playersToJoin.length),
                spectatorCount: firebase.firestore.FieldValue.increment(-playersToJoin.length),
                waitingPlayers: remainingWaiting
            });

            await batch.commit();
        }
        
        // Short delay to allow state to propagate before starting the round
        setTimeout(startNewRound, 500);
    }
    
    async function startNewRound() {
        if(wordChoiceTimeout) clearTimeout(wordChoiceTimeout);
        if(wordChoiceCountdownInterval) clearInterval(wordChoiceCountdownInterval);
        if (!currentRoomId || !currentRoomData || currentUser.uid !== currentRoomData.host) return;
        
        const roomRef = db.collection("rooms").doc(currentRoomId);
        
        const playersRef = roomRef.collection("players").where('role', '==', 'player');
        const playersSnap = await playersRef.get();
        if(playersSnap.docs.length < 2) {
             showNotification("تحتاج إلى لاعبين على الأقل لبدء جولة جديدة.", false);
             await roomRef.update({ status: 'waiting' });
             return;
        }

        const playersList = playersSnap.docs.map(doc => ({ id: doc.id, data: doc.data() }));
        const playerIds = playersList.map(p => p.id);

        const batch = db.batch();
        playersSnap.forEach(playerDoc => {
            batch.update(playerDoc.ref, { hasGuessed: false, roundScore: 0 });
        });
        await batch.commit();

        let possibleDrawers = playerIds.filter(id => id !== currentRoomData.gameState.lastDrawerUid);
        if (possibleDrawers.length === 0) {
            possibleDrawers = playerIds;
        }
        const drawerId = possibleDrawers[Math.floor(Math.random() * possibleDrawers.length)];

        const drawer = playersList.find(p => p.id === drawerId);
        const drawerName = drawer ? drawer.data.displayName : 'الرسام';

        const wordList = WORD_LISTS[currentRoomData.theme] || WORD_LISTS['عام'];
        const words = new Set();
        while (words.size < 3) {
            words.add(wordList[Math.floor(Math.random() * wordList.length)]);
        }
        
        const drawingSnap = await roomRef.collection('drawing').get();
        const deleteBatch = db.batch();
        drawingSnap.docs.forEach(doc => deleteBatch.delete(doc.ref));
        await deleteBatch.commit();
        
        await roomRef.update({
            status: 'playing',
            'gameState.round': firebase.firestore.FieldValue.increment(1),
            'gameState.drawerUid': drawerId,
            'gameState.drawerName': drawerName,
            'gameState.lastDrawerUid': drawerId,
            'gameState.wordsToChoose': Array.from(words),
            'gameState.currentWord': '',
            'gameState.roundStartTime': null,
            'gameState.correctGuessers': [],
        });
        
        await sendMessage(null, 'system', `جولة جديدة على وشك البدء!`);
    }

    async function chooseWord(word) {
        if(wordChoiceTimeout) clearTimeout(wordChoiceTimeout);
        if(wordChoiceCountdownInterval) clearInterval(wordChoiceCountdownInterval);
        if(!currentRoomId || !word) return;
        showModal('wordChoice', false);
        await db.collection("rooms").doc(currentRoomId).update({
            'gameState.currentWord': word,
            'gameState.wordsToChoose': [],
            'gameState.roundStartTime': firebase.firestore.FieldValue.serverTimestamp(),
        });
        await sendMessage(null, 'system', `${currentUser.displayName} اختار كلمة وبدأ الرسم!`);
    }

    // --- FIX: Logic for round timer and round end timeout ---
    function updateRoundTimer() {
        if(roundTimerInterval) clearInterval(roundTimerInterval);
        if(roundEndTimeout) clearTimeout(roundEndTimeout); 

        const timerEl = document.getElementById('game-timer');
        if (!timerEl || !currentRoomData?.gameState?.roundStartTime) {
            if(timerEl) timerEl.textContent = `0:00`;
            return;
        }

        const startMs = currentRoomData.gameState.roundStartTime.toMillis();
        const durationMs = (currentRoomData.settings.roundTime || 80) * 1000;
        const endTime = startMs + durationMs;

        const drawTick = () => {
            const now = Date.now();
            const rawLeft = (endTime - now) / 1000;
            const timeLeft = Math.max(0, Math.ceil(rawLeft));
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            if(timerEl) timerEl.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
            
            if (timeLeft <= 10) {
                if(timerEl) timerEl.classList.add('text-red-500', 'animate-pulse');
            } else {
                if(timerEl) timerEl.classList.remove('text-red-500', 'animate-pulse');
            }
        };

        drawTick(); // Initial call
        roundTimerInterval = setInterval(drawTick, 500);

        if (currentRoomData && currentUser.uid === currentRoomData.host) {
            const timeoutDuration = durationMs + 1000; // 1 second buffer
            roundEndTimeout = setTimeout(() => {
                // Double check the state before ending the round
                db.collection("rooms").doc(currentRoomId).get().then(doc => {
                    if (doc.exists) {
                        const latestRoomData = doc.data();
                        // Only end if we are still in the same round and the scoreboard isn't showing
                        if (latestRoomData.gameState.roundStartTime?.toMillis() === startMs && !latestRoomData.gameState.showingScoreboard && latestRoomData.gameState.currentWord) {
                            endRound('الوقت انتهى!');
                        }
                    }
                });
            }, timeoutDuration);
        }
    }
    
    async function endRound(reason) {
        if (!currentRoomData || currentUser.uid !== currentRoomData.host || currentRoomData.gameState.showingScoreboard || !currentRoomData.gameState.currentWord || !currentRoomData.gameState.roundStartTime) return;
        
        playSound('roundEnd', 'C4');
        const roomRef = db.collection("rooms").doc(currentRoomId);
        const currentRoomIdForTimeout = currentRoomId;

        // Make sure to stop timers immediately to prevent race conditions
        if(roundTimerInterval) clearInterval(roundTimerInterval);
        if(roundEndTimeout) clearTimeout(roundEndTimeout);

        const playersSnap = await roomRef.collection("players").get();
        const playersData = playersSnap.docs.map(doc => doc.data());

        await roomRef.update({
            'gameState.showingScoreboard': true,
            'gameState.scoreboardData': {
                reason: reason,
                word: currentRoomData.gameState.currentWord,
                players: playersData.filter(p => p.role === 'player')
            }
        });
        
        const winner = playersData.find(p => p.role === 'player' && p.score >= currentRoomData.settings.maxScore);
        
        if(scoreboardTimeout) clearTimeout(scoreboardTimeout);
        scoreboardTimeout = setTimeout(() => {
            if (currentRoomId !== currentRoomIdForTimeout) return;
            
            if (winner) {
                endGame(winner);
            } else {
                roomRef.update({ 'gameState.showingScoreboard': false }).then(() => {
                    // Refetch room data to ensure host status is current before starting new round
                    db.collection("rooms").doc(currentRoomIdForTimeout).get().then(doc => {
                        if (doc.exists && doc.data().host === currentUser.uid) {
                            checkForWaitingPlayersAndStartRound();
                        }
                    });
                });
            }
        }, 5000);
    }
    
    async function endGame(winner) {
        if (!currentRoomData || currentUser.uid !== currentRoomData.host) return;

        const winnerRef = db.collection("users").doc(winner.uid);
        winnerRef.update({ 'stats.coins': firebase.firestore.FieldValue.increment(50) });

        await db.collection("rooms").doc(currentRoomId).update({
            status: 'ended',
            'gameState.winner': winner
        });
        await sendMessage(null, 'system', `انتهت اللعبة! الفائز هو ${winner.displayName} برصيد ${winner.score} نقطة! 🏆`);
    }


    function setupGameListeners(roomId){
        gameListeners.forEach(unsub => unsub());
        gameListeners = [];
        if (currentRoomUnsubscribe) currentRoomUnsubscribe();
        let isInitialMessagesLoad = true;
        
        currentRoomUnsubscribe = db.collection("rooms").doc(roomId).onSnapshot(doc => {
            if (!doc.exists) {
                showNotification("تم إغلاق الغرفة.", false);
                if(currentRoomId === roomId) leaveRoom();
                return;
            }
            const oldData = currentRoomData;
            currentRoomData = doc.data();
            handleGameStateUpdate(currentRoomData, oldData);
        });

        const playersQuery = db.collection("rooms").doc(roomId).collection("players").orderBy("score", "desc");
        gameListeners.push(playersQuery.onSnapshot((snap) => {
            const list = document.getElementById('player-list');
            if (!list) return;

            const players = [];
            const waiting = [];
            const spectators = [];

            snap.forEach(doc => {
                const p = doc.data();
                if(p.role === 'player') players.push(p);
                else if(p.role === 'waiting') waiting.push(p);
                else spectators.push(p);
            });
            
            const renderPlayer = (p, icon = '') => {
                 const isDrawer = currentRoomData?.gameState?.drawerUid === p.uid;
                 const hasGuessed = p.hasGuessed;
                 return `<div class="flex items-center bg-blue-50/80 p-2 rounded-lg justify-between">
                    <div class="flex items-center gap-2">
                        <div class="avatar-wrapper ${p.equippedFrame || ''}">
                           <img src="${p.photoURL}" class="w-10 h-10 rounded-full">
                        </div>
                        <p class="font-bold text-sm">${p.displayName}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        ${icon}
                        ${isDrawer ? '<span title="الرسام">✏️</span>' : ''}
                        ${hasGuessed ? '<span class="text-green-500 font-bold" title="خمّن الكلمة">✔️</span>' : ''}
                        <span class="font-bold text-lg text-yellow-500">${p.score}</span>
                    </div>
                </div>`;
            }

            list.innerHTML = `
                ${players.map(p => renderPlayer(p)).join('')}
                ${waiting.length > 0 ? `<h4 class="font-bold text-center text-gray-500 pt-2">في الانتظار</h4>` : ''}
                ${waiting.map(p => renderPlayer(p, '⏳')).join('')}
                ${spectators.length > 0 ? `<h4 class="font-bold text-center text-gray-500 pt-2">مشاهدون</h4>` : ''}
                ${spectators.map(p => renderPlayer(p, '👀')).join('')}
            `;

            // Update local player role state
            const myData = snap.docs.find(d => d.id === currentUser.uid)?.data();
            if(myData) playerRoleInCurrentRoom = myData.role;

        }));

        const messagesQuery = db.collection("rooms").doc(roomId).collection("messages").orderBy("timestamp", "desc").limit(50);
        gameListeners.push(messagesQuery.onSnapshot((snap) => {
            const chatBox = document.getElementById('chat-box');
            const guessBox = document.getElementById('guesses-box');
            if (!chatBox || !guessBox) return;
            
            chatBox.innerHTML = '';
            guessBox.innerHTML = '';

            snap.docs.reverse().forEach(doc => {
                const msg = doc.data();
                const p = document.createElement('p');
                p.className = 'text-sm break-words mb-1';
                
                if (msg.type === 'system') {
                    p.innerHTML = `<span class="italic text-gray-400">${msg.text}</span>`;
                    chatBox.appendChild(p);
                    guessBox.appendChild(p.cloneNode(true));
                } else if (msg.type === 'guess') {
                    if (msg.isCorrect) {
                         p.innerHTML = `<span class="font-bold text-green-600">${msg.displayName} خمّن الكلمة الصحيحة!</span>`;
                    } else {
                         p.innerHTML = `<span class="font-bold">${msg.displayName}:</span> ${msg.text}`;
                    }
                    guessBox.appendChild(p);
                } else { // Assumes 'chat'
                    p.innerHTML = `<span class="font-bold">${msg.displayName}:</span> ${msg.text}`;
                    chatBox.appendChild(p);
                }
            });

            if (!isInitialMessagesLoad && snap.docChanges().some(c => c.type === 'added' && c.doc.data().uid !== currentUser.uid)) {
                playSound('message', 'A5');
            }
            isInitialMessagesLoad = false;

            chatBox.scrollTop = chatBox.scrollHeight;
            guessBox.scrollTop = guessBox.scrollHeight;
        }));
        
        // This is where remote drawing data is handled
        const drawingQuery = db.collection("rooms").doc(roomId).collection("drawing");
        gameListeners.push(drawingQuery.onSnapshot((snap) => {
            const canvas = document.getElementById('drawing-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');

            snap.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    if (data.uid && data.uid === currentUser.uid) return;
                    
                    if (data.type === 'clear') {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                    } else if (data.type === 'redraw') {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        data.history.forEach(action => drawAction(ctx, action));
                    }
                    else {
                         drawAction(ctx, data);
                    }
                }
            });
        }));

        document.getElementById('chat-form').onsubmit = e => { e.preventDefault(); sendMessage(e.target, 'chat'); };
        document.getElementById('guess-form').onsubmit = e => { e.preventDefault(); handleGuessSubmit(e.target); };
    }
    
    function handleGameStateUpdate(roomData, oldData) {
        if (!roomData || !currentUser) return;
        const { gameState, status, host } = roomData;
        const isHost = host === currentUser.uid;
        const isDrawer = gameState.drawerUid === currentUser.uid;
        
        const startGameBtn = document.getElementById('start-game-btn');
        if (startGameBtn) startGameBtn.classList.toggle('hidden', !isHost || status !== 'waiting' || roomData.playerCount < 2);
        
        if (status === 'ended' && gameState.winner) {
             showScoreboard(gameState.scoreboardData, `الفائز هو ${gameState.winner.displayName}! 🏆`);
             if(roundTimerInterval) clearInterval(roundTimerInterval);
             return;
        }
        
        if (gameState.showingScoreboard) {
            showScoreboard(gameState.scoreboardData, `انتهت الجولة! الكلمة كانت: ${gameState.scoreboardData.word}`);
            return;
        } else {
            if(scoreboardCountdownInterval) clearInterval(scoreboardCountdownInterval);
            showModal('scoreboard', false);
        }

        const wordDisplay = document.getElementById('word-display');
        const guessInput = document.getElementById('guess-input');
        const guessForm = document.getElementById('guess-form');
        const roundCounter = document.getElementById('round-counter');
        const spectatorBanner = document.getElementById('spectator-banner');
        const spectatorMainText = document.getElementById('spectator-main-text');
        const spectatorSubText = document.getElementById('spectator-sub-text');
        const toolbar = document.getElementById('vertical-toolbar');
        
        if (!wordDisplay || !guessInput || !roundCounter || !spectatorBanner || !toolbar || !guessForm) return;

        const isPlayer = playerRoleInCurrentRoom === 'player';
        
        // UI updates based on player role
        if (!isPlayer) {
            spectatorBanner.classList.remove('hidden');
            spectatorMainText.textContent = "👀 أنت تشاهد فقط";
            if (playerRoleInCurrentRoom === 'waiting') {
                spectatorSubText.textContent = "ستنضم في الجولة القادمة!";
            } else {
                spectatorSubText.textContent = "";
            }
        } else {
            spectatorBanner.classList.add('hidden');
        }

        guessForm.classList.toggle('hidden', !isPlayer || isDrawer);
        toolbar.classList.toggle('opacity-50', !isDrawer || !isPlayer);
        toolbar.classList.toggle('pointer-events-none', !isDrawer || !isPlayer);
        
        roundCounter.textContent = `الجولة ${gameState.round}`;
        const justStartedRound = !oldData || oldData.gameState.round !== gameState.round;

        // Word choice logic
        if (isDrawer && gameState.wordsToChoose?.length > 0 && justStartedRound) {
            playSound('roundStart', 'C6');
            const words = gameState.wordsToChoose;
            modals.wordChoice.querySelector('#word-options').innerHTML = words.map(word => 
                `<button data-action="choose-word" data-word="${word}" class="btn btn-play">${word}</button>`
            ).join('');
            
            if (wordChoiceCountdownInterval) clearInterval(wordChoiceCountdownInterval);
            let timeLeft = 10;
            const timerEl = document.getElementById('word-choice-timer');
            if(timerEl) timerEl.textContent = timeLeft;
            
            wordChoiceCountdownInterval = setInterval(() => {
                timeLeft--;
                if(timerEl) timerEl.textContent = timeLeft;
                if (timeLeft <= 0) {
                    clearInterval(wordChoiceCountdownInterval);
                }
            }, 1000);

            showModal('wordChoice');
            wordDisplay.textContent = "اختر كلمة لترسمها...";
            
             // --- FIX: Logic to auto-skip turn if word not chosen ---
            if (wordChoiceTimeout) clearTimeout(wordChoiceTimeout);
            const drawerForTimeout = gameState.drawerUid;
            const roundForTimeout = gameState.round;
            wordChoiceTimeout = setTimeout(() => {
                db.collection("rooms").doc(currentRoomId).get().then(doc => {
                    if (doc.exists) {
                        const latestGameState = doc.data().gameState;
                        // Check if it's still the same drawer's turn in the same round and a word hasn't been picked
                        if (latestGameState.drawerUid === drawerForTimeout && latestGameState.round === roundForTimeout && latestGameState.wordsToChoose.length > 0) {
                            showModal('wordChoice', false);
                            if (currentUser.uid === doc.data().host) {
                                sendMessage(null, 'system', `${latestGameState.drawerName} لم يختر كلمة، تم تخطي الدور.`);
                                startNewRound();
                            }
                        }
                    }
                });
            }, 10000);

        } else {
            if (modals.wordChoice.classList.contains('active')) {
                showModal('wordChoice', false);
            }
            if (wordChoiceCountdownInterval) clearInterval(wordChoiceCountdownInterval);
            
            if (gameState.currentWord) {
                if(isDrawer || !isPlayer) {
                    wordDisplay.textContent = gameState.currentWord;
                } else {
                    wordDisplay.textContent = gameState.currentWord.split('').map(char => char === ' ' ? ' ' : '_').join(' ');
                }
                
                const roundStartTimeChanged = !oldData || oldData.gameState.roundStartTime?.toMillis() !== gameState.roundStartTime?.toMillis();
                if(roundStartTimeChanged) {
                    updateRoundTimer();
                }
            } else {
                wordDisplay.textContent = gameState.drawerName ? `${gameState.drawerName} يختار كلمة...` : "انتظار بدء اللعبة...";
                if(roundTimerInterval) clearInterval(roundTimerInterval);
                const timerEl = document.getElementById('game-timer');
                if(timerEl) timerEl.textContent = "0:00";
            }
        }
    }

    // --- FIX: Prevent multiple guesses and ensure points are awarded correctly ---
    async function handleGuessSubmit(form) {
        if (playerRoleInCurrentRoom !== 'player' || !currentRoomData || currentRoomData.gameState.drawerUid === currentUser.uid) return;

        // Prevent guessing if already guessed correctly in this round
        if (currentRoomData.gameState.correctGuessers.includes(currentUser.uid)) {
            showNotification("لقد خمنت الكلمة الصحيحة بالفعل!", false);
            return;
        }

        const input = form.querySelector('input');
        const text = input.value.trim();
        if (!text || !currentRoomData.gameState.currentWord) return;
        
        const isCorrect = text.toLowerCase() === currentRoomData.gameState.currentWord.toLowerCase();
        
        // Always send the message regardless of correctness
        await db.collection("rooms").doc(currentRoomId).collection("messages").add({
            uid: currentUser.uid, displayName: currentUser.displayName, text, type: 'guess', isCorrect,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        input.value = ''; // Clear input after sending message

        if (isCorrect) {
            const roomRef = db.collection('rooms').doc(currentRoomId);
            const playerRef = roomRef.collection('players').doc(currentUser.uid);
            
            try {
                await db.runTransaction(async (transaction) => {
                    const roomDoc = await transaction.get(roomRef);
                    const playerDoc = await transaction.get(playerRef);

                    if (!roomDoc.exists || !playerDoc.exists) throw new Error("Room or player not found");
                    const roomData = roomDoc.data();
                    const playerData = playerDoc.data();

                    // Double-check inside transaction to prevent race conditions
                    if (playerData.hasGuessed) return;

                    const pointsLadder = [100, 80, 60, 50, 40, 30, 20];
                    const guesserCount = roomData.gameState.correctGuessers.length;
                    const pointsForGuesser = pointsLadder[guesserCount] || 20;
                    const pointsForDrawer = 25; 
                    const coinsForGuesser = Math.ceil(pointsForGuesser / 10);
                    const coinsForDrawer = 5;

                    // Update guesser
                    transaction.update(playerRef, {
                        hasGuessed: true,
                        score: firebase.firestore.FieldValue.increment(pointsForGuesser),
                        roundScore: firebase.firestore.FieldValue.increment(pointsForGuesser)
                    });
                    const guesserUserRef = db.collection('users').doc(currentUser.uid);
                    transaction.update(guesserUserRef, { 'stats.coins': firebase.firestore.FieldValue.increment(coinsForGuesser) });
                    
                    // Update drawer
                    const drawerRef = roomRef.collection('players').doc(roomData.gameState.drawerUid);
                    transaction.update(drawerRef, {
                        score: firebase.firestore.FieldValue.increment(pointsForDrawer),
                        roundScore: firebase.firestore.FieldValue.increment(pointsForDrawer)
                    });
                    const drawerUserRef = db.collection('users').doc(roomData.gameState.drawerUid);
                    transaction.update(drawerUserRef, { 'stats.coins': firebase.firestore.FieldValue.increment(coinsForDrawer) });

                    // Update room state
                    transaction.update(roomRef, {
                        'gameState.correctGuessers': firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
                    });
                });
                
                playSound('success', 'A5');

                // Check if round should end after successful guess
                const updatedRoomSnap = await roomRef.get();
                const updatedRoomData = updatedRoomSnap.data();
                const allPlayersGuessed = updatedRoomData.gameState.correctGuessers.length >= updatedRoomData.playerCount - 1;
                
                if (allPlayersGuessed && updatedRoomData.host === currentUser.uid) {
                    endRound('الجميع خمّن الكلمة!');
                }

            } catch(error) {
                console.error("Transaction failed during guess submission: ", error);
            }
        }
    }

    function showScoreboard(data, title) {
        if (!data) return;
        const { players } = data;
        const scoreboardBody = modals.scoreboard.querySelector('#scoreboard-body');
        
        modals.scoreboard.querySelector('#scoreboard-title').textContent = title;
        
        players.sort((a,b) => b.score - a.score);

        scoreboardBody.innerHTML = players.map(p => `
            <div class="flex items-center justify-between p-2 bg-white rounded-lg">
                <div class="flex items-center gap-3">
                    <div class="avatar-wrapper ${p.equippedFrame || ''}">
                       <img src="${p.photoURL}" class="w-10 h-10 rounded-full"/>
                    </div>
                    <span class="font-bold">${p.displayName}</span>
                </div>
                <div class="flex items-center gap-4">
                    <span class="font-bold text-green-500 text-lg">+${p.roundScore || 0}</span>
                    <span class="font-bold text-blue-800 text-xl">${p.score || 0}</span>
                </div>
            </div>
        `).join('');
        showModal('scoreboard');

        if (scoreboardCountdownInterval) clearInterval(scoreboardCountdownInterval);
        let timeLeft = 5;
        const timerEl = modals.scoreboard.querySelector('#scoreboard-timer');

        if (timerEl) {
            timerEl.textContent = `الجولة التالية في ${timeLeft}...`;
            scoreboardCountdownInterval = setInterval(() => {
                timeLeft--;
                if (timeLeft >= 0) {
                    timerEl.textContent = `الجولة التالية في ${timeLeft}...`;
                } else {
                    clearInterval(scoreboardCountdownInterval);
                }
            }, 1000);
        }
    }

    async function sendMessage(form, type, systemText = ''){
        let text = systemText;
        if (!systemText) {
            const input = form.querySelector('input');
            text = input.value.trim();
            if (!text) return;
            input.value = '';
        }
        if (!currentRoomId || !currentUser) return;

        await db.collection("rooms").doc(currentRoomId).collection("messages").add({
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            text: text, type, isCorrect: false,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
    
    // --- CANVAS HELPERS ---
    const hexToRgb = (hex) => {
        let r = 0, g = 0, b = 0;
        // 3 digits
        if (hex.length == 4) {
            r = "0x" + hex[1] + hex[1];
            g = "0x" + hex[2] + hex[2];
            b = "0x" + hex[3] + hex[3];
        // 6 digits
        } else if (hex.length == 7) {
            r = "0x" + hex[1] + hex[2];
            g = "0x" + hex[3] + hex[4];
            b = "0x" + hex[5] + hex[6];
        }
        return [+r, +g, +b];
    };
    
    // --- FIX: Flood fill tool logic ---
    const floodFill = (ctx, startX, startY, fillColor) => {
        const canvas = ctx.canvas;
        const { width, height } = canvas;
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const startPos = (startY * width + startX) * 4;
        const startR = data[startPos];
        const startG = data[startPos + 1];
        const startB = data[startPos + 2];
        const [fillR, fillG, fillB] = hexToRgb(fillColor);
    
        if (startR === fillR && startG === fillG && startB === fillB) {
            return; // Clicked on a color that is already the fill color
        }
    
        const pixelStack = [[startX, startY]];
    
        while (pixelStack.length) {
            const newPos = pixelStack.pop();
            const x = newPos[0];
            let y = newPos[1];
    
            let pixelPos = (y * width + x) * 4;
            while (y-- >= 0 && (data[pixelPos] === startR && data[pixelPos+1] === startG && data[pixelPos+2] === startB)) {
                pixelPos -= width * 4;
            }
            pixelPos += width * 4;
            ++y;
    
            let reachLeft = false;
            let reachRight = false;
            while (y++ < height - 1 && (data[pixelPos] === startR && data[pixelPos+1] === startG && data[pixelPos+2] === startB)) {
                data[pixelPos] = fillR;
                data[pixelPos + 1] = fillG;
                data[pixelPos + 2] = fillB;
                data[pixelPos + 3] = 255;
    
                if (x > 0) {
                    if (data[pixelPos - 4] === startR && data[pixelPos - 3] === startG && data[pixelPos - 2] === startB) {
                        if (!reachLeft) {
                            pixelStack.push([x - 1, y]);
                            reachLeft = true;
                        }
                    } else if (reachLeft) {
                        reachLeft = false;
                    }
                }
    
                if (x < width - 1) {
                    if (data[pixelPos + 4] === startR && data[pixelPos + 5] === startG && data[pixelPos + 6] === startB) {
                        if (!reachRight) {
                            pixelStack.push([x + 1, y]);
                            reachRight = true;
                        }
                    } else if (reachRight) {
                        reachRight = false;
                    }
                }
                pixelPos += width * 4;
            }
        }
        ctx.putImageData(imageData, 0, 0);
    };
    
    const drawAction = (ctx, action) => {
        if (!ctx || !action) return;
        ctx.strokeStyle = action.color;
        ctx.lineWidth = action.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.fillStyle = action.color;
        
        // --- FIX: Added pattern brush logic ---
        if(action.tool === 'pattern') {
             const patternCanvas = document.createElement('canvas');
             const patternCtx = patternCanvas.getContext('2d');
             patternCanvas.width = 10;
             patternCanvas.height = 10;
             patternCtx.fillStyle = action.color; 
             patternCtx.fillRect(0,0,10,10);
             patternCtx.strokeStyle = '#FFFFFF55';
             patternCtx.beginPath();
             patternCtx.moveTo(0, 10);
             patternCtx.lineTo(10, 0);
             patternCtx.stroke();
             ctx.strokeStyle = ctx.createPattern(patternCanvas, 'repeat');
        }

        switch (action.type) {
            case 'draw':
                ctx.beginPath(); ctx.moveTo(action.x0, action.y0); ctx.lineTo(action.x1, action.y1); ctx.stroke();
                break;
            case 'rect':
                ctx.strokeRect(action.x, action.y, action.w, action.h);
                break;
            case 'circle':
                ctx.beginPath(); ctx.arc(action.x, action.y, action.radius, 0, 2 * Math.PI); ctx.stroke();
                break;
            case 'fill':
                floodFill(ctx, Math.round(action.x), Math.round(action.y), action.color);
                break;
            case 'spray':
                const density = action.size * 2;
                for (let i = 0; i < density; i++) {
                    const angle = Math.random() * 2 * Math.PI;
                    const radius = Math.random() * action.size;
                    const offsetX = Math.cos(angle) * radius;
                    const offsetY = Math.sin(angle) * radius;
                    ctx.fillRect(action.x + offsetX, action.y + offsetY, 1, 1);
                }
                break;
        }
    };


    function initCanvas(){
        const canvas = document.getElementById('drawing-canvas');
        const previewCanvas = document.getElementById('preview-canvas');
        if (!canvas || !previewCanvas) return;
        const ctx = canvas.getContext('2d');
        const previewCtx = previewCanvas.getContext('2d');
        
        let drawing = false;
        let lastX = 0, lastY = 0;
        let startX = 0, startY = 0;
        let color = '#000000';
        let size = 5;
        let currentTool = 'brush';

        let drawingHistory = [];
        let redoStack = [];

        function redrawFromHistory() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawingHistory.forEach(action => drawAction(ctx, action));
        }

        function pushToHistory(action) {
            drawingHistory.push(action);
            redoStack = []; // Clear redo stack on new action
            updateUndoRedoButtons();
        }

        // --- FIX: Undo/Redo button state management ---
        function updateUndoRedoButtons() {
            const undoBtn = document.getElementById('undo-btn');
            const redoBtn = document.getElementById('redo-btn');
            if (!undoBtn || !redoBtn) return;

            undoBtn.disabled = drawingHistory.length === 0;
            redoBtn.disabled = redoStack.length === 0;

            undoBtn.classList.toggle('disabled', undoBtn.disabled);
            redoBtn.classList.toggle('disabled', redoBtn.disabled);
        }

        async function syncCanvasState() {
            if (currentUser.uid !== currentRoomData?.gameState?.drawerUid) return;
            // To reduce Firestore writes, we can debounce this or send larger chunks.
            // For now, sending the full history ensures consistency.
            await sendDrawData({ type: 'redraw', history: drawingHistory });
        }
        
        // --- FIX: Undo/Redo functionality ---
        document.getElementById('undo-btn')?.addEventListener('click', () => {
             if (currentUser.uid !== currentRoomData?.gameState?.drawerUid || drawingHistory.length === 0) return;
             redoStack.push(drawingHistory.pop());
             redrawFromHistory();
             updateUndoRedoButtons();
             syncCanvasState(); // Sync after change
        });
        document.getElementById('redo-btn')?.addEventListener('click', () => {
             if (currentUser.uid !== currentRoomData?.gameState?.drawerUid || redoStack.length === 0) return;
             drawingHistory.push(redoStack.pop());
             redrawFromHistory();
             updateUndoRedoButtons();
             syncCanvasState(); // Sync after change
        });


        function resizeCanvas() {
            const container = document.getElementById('canvas-container');
            if (!container) return;
        
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            previewCanvas.width = container.clientWidth;
            previewCanvas.height = container.clientHeight;
        
            redrawFromHistory();
        }

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        function getPos(evt) {
            const rect = canvas.getBoundingClientRect();
            const clientX = evt.clientX || evt.touches[0].clientX;
            const clientY = evt.clientY || evt.touches[0].clientY;
            return { x: clientX - rect.left, y: clientY - rect.top };
        }

        async function sendDrawData(data) {
             if (!currentRoomId || !currentRoomData || currentUser.uid !== currentRoomData.gameState.drawerUid) return;
             const payload = { ...data, uid: currentUser.uid };
             await db.collection("rooms").doc(currentRoomId).collection("drawing").add(payload);
        }

        const startDrawing = (e) => {
            e.preventDefault();
            if (currentUser.uid !== currentRoomData?.gameState?.drawerUid || playerRoleInCurrentRoom !== 'player') return;
            
            const pos = getPos(e);
            
             if (currentTool === 'eyedropper') {
                const pixelData = ctx.getImageData(pos.x, pos.y, 1, 1).data;
                color = `rgba(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]}, ${pixelData[3] / 255})`;
                function rgbToHex(r, g, b) {
                    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
                }
                document.getElementById('custom-color-picker').value = rgbToHex(pixelData[0], pixelData[1], pixelData[2]);
                document.querySelector('.tool-icon.active[data-tool]')?.classList.remove('active');
                document.querySelector('.tool-icon[data-tool="brush"]')?.classList.add('active');
                currentTool = 'brush';
                showNotification(`تم اختيار اللون: ${color}`, true);
                return;
            }
            if (currentTool === 'fill') {
                const action = { type: 'fill', x: pos.x, y: pos.y, color };
                drawAction(ctx, action);
                pushToHistory(action);
                sendDrawData(action);
                return;
            }
            
            drawing = true;
            [lastX, lastY] = [pos.x, pos.y];
            [startX, startY] = [pos.x, pos.y];
        };

        const keepDrawing = (e) => {
            e.preventDefault();
            if (!drawing || currentUser.uid !== currentRoomData?.gameState?.drawerUid || playerRoleInCurrentRoom !== 'player') return;
            const pos = getPos(e);
            previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

            const toolActions = {
                'brush': () => {
                    const action = { type: 'draw', x0: lastX, y0: lastY, x1: pos.x, y1: pos.y, color, size, tool: 'brush' };
                    drawAction(ctx, action);
                    pushToHistory(action);
                    sendDrawData(action);
                },
                'pattern': () => {
                    const action = { type: 'draw', x0: lastX, y0: lastY, x1: pos.x, y1: pos.y, color, size, tool: 'pattern' };
                    drawAction(ctx, action);
                    pushToHistory(action);
                    sendDrawData(action);
                },
                'eraser': () => {
                     const action = { type: 'draw', x0: lastX, y0: lastY, x1: pos.x, y1: pos.y, color: '#FFFFFF', size, tool: 'eraser' };
                     drawAction(ctx, action);
                     pushToHistory(action);
                     sendDrawData(action);
                },
                'spray': () => {
                     const action = { type: 'spray', x: pos.x, y: pos.y, color, size };
                     drawAction(ctx, action);
                     pushToHistory(action);
                     sendDrawData(action);
                },
                'line': () => drawAction(previewCtx, { type: 'draw', x0: startX, y0: startY, x1: pos.x, y1: pos.y, color, size, tool: 'brush' }),
                'rectangle': () => drawAction(previewCtx, { type: 'rect', x: startX, y: startY, w: pos.x - startX, h: pos.y - startY, color, size }),
                'circle': () => {
                    const radius = Math.sqrt(Math.pow(pos.x - startX, 2) + Math.pow(pos.y - startY, 2));
                    drawAction(previewCtx, { type: 'circle', x: startX, y: startY, radius, color, size });
                }
            };
            
            if(toolActions[currentTool]) toolActions[currentTool]();
            [lastX, lastY] = [pos.x, pos.y];
        };

        const stopDrawing = (e) => {
            if (!drawing || playerRoleInCurrentRoom !== 'player') return;
            drawing = false;
            previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            const pos = getPos(e);

            let action;
            if (currentTool === 'line') {
                action = { type: 'draw', x0: startX, y0: startY, x1: pos.x, y1: pos.y, color, size, tool: 'brush' };
            } else if (currentTool === 'rectangle') {
                action = { type: 'rect', x: startX, y: startY, w: pos.x - startX, h: pos.y - startY, color, size };
            } else if (currentTool === 'circle') {
                const radius = Math.sqrt(Math.pow(pos.x - startX, 2) + Math.pow(pos.y - startY, 2));
                action = { type: 'circle', x: startX, y: startY, radius, color, size };
            }
            if (action) {
                drawAction(ctx, action);
                pushToHistory(action);
                sendDrawData(action);
            }
        };

        const canvasContainer = document.getElementById('canvas-container');
        canvasContainer.addEventListener('mousedown', startDrawing);
        canvasContainer.addEventListener('mousemove', keepDrawing);
        canvasContainer.addEventListener('mouseup', stopDrawing);
        canvasContainer.addEventListener('mouseout', stopDrawing);
        canvasContainer.addEventListener('touchstart', startDrawing);
        canvasContainer.addEventListener('touchmove', keepDrawing);
        canvasContainer.addEventListener('touchend', stopDrawing);
        
        const toolbar = document.getElementById('vertical-toolbar');
        toolbar.addEventListener('click', e => {
            if (playerRoleInCurrentRoom !== 'player' || (currentRoomData && currentUser.uid !== currentRoomData.gameState.drawerUid) ) return;
            
            const target = e.target.closest('.tool-icon, .color-swatch');
            if (!target || target.classList.contains('disabled')) return;
            
            canvas.style.cursor = 'crosshair';

            if (target.dataset.tool) {
                 if (currentTool === 'clear' && target.dataset.tool === 'clear') return; // Prevent multiple clears

                document.querySelector('.tool-icon.active[data-tool]')?.classList.remove('active');
                target.classList.add('active');
                currentTool = target.dataset.tool;

                if (currentTool === 'eyedropper' || currentTool === 'fill') canvas.style.cursor = 'copy';
                
                // --- FIX: "Clear All" logic for the drawer ---
                if (currentTool === 'clear') { 
                    const action = { type: 'clear' };
                    // Clear local canvas immediately
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    drawingHistory = [];
                    redoStack = [];
                    updateUndoRedoButtons();
                    // Send clear event to others
                    sendDrawData(action); 
                    // Revert to brush tool after clearing
                    setTimeout(() => {
                        target.classList.remove('active');
                        const brush = document.querySelector('.tool-icon[data-tool="brush"]');
                        if (brush) brush.classList.add('active');
                        currentTool = 'brush';
                        canvas.style.cursor = 'crosshair';
                    }, 100);
                }
            }
            if (target.dataset.color) {
                document.querySelector('.color-swatch.active')?.classList.remove('active');
                target.classList.add('active');
                color = target.dataset.color;
                document.getElementById('custom-color-picker').value = color;
            }
            if (target.dataset.size) {
                document.querySelector('#brush-sizes .tool-icon.active')?.classList.remove('active');
                target.classList.add('active');
                size = parseInt(target.dataset.size, 10);
            }
        });
        document.getElementById('custom-color-picker').addEventListener('input', e => {
            if (currentUser.uid !== currentRoomData?.gameState?.drawerUid || playerRoleInCurrentRoom !== 'player') return;
            color = e.target.value;
        });

        updateUndoRedoButtons(); // Initial state
    }
    function copyRoomCode() {
        if (!currentRoomId) return;
        navigator.clipboard.writeText(currentRoomId)
          .then(() => showNotification('تم نسخ كود الغرفة بنجاح!', true))
          .catch(() => showNotification('فشل نسخ الكود', false));
    }
    
    // --- Initial Load ---
    showScreen('home');

    return () => {
        document.body.removeEventListener('click', eventHandler);
        if (roomsUnsubscribe) roomsUnsubscribe();
        if (friendsUnsubscribe) friendsUnsubscribe();
        if (currentRoomUnsubscribe) currentRoomUnsubscribe();
        if (roundTimerInterval) clearInterval(roundTimerInterval);
        if (scoreboardTimeout) clearTimeout(scoreboardTimeout);
        if(roundEndTimeout) clearTimeout(roundEndTimeout);
        if(wordChoiceCountdownInterval) clearInterval(wordChoiceCountdownInterval);
        if(scoreboardCountdownInterval) clearInterval(scoreboardCountdownInterval);
        gameListeners.forEach(unsub => unsub());
    };

  }, []);

  return (
    <>
    <style>{`
      /* --- GLOBAL & BACKGROUNDS --- */
      html, body {
        height: 100%;
        margin: 0;
        padding: 0;
        width: 100%;
        overflow: hidden;
      }
      body {
        background-size: cover;
        background-position: center;
        background-attachment: fixed;
        transition: background-image 0.5s ease-in-out, background-color 0.5s ease-in-out;
      }
      #app-container { direction: rtl; }
      #background-effects {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        pointer-events: none; z-index: -1;
      }
      .main-container {
        max-height: 90vh;
        overflow-y: auto;
      }

      .bg-classic { 
        background-color: #3b82f6;
        background-image: 
            repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0, 0, 0, 0.05) 5px, rgba(0, 0, 0, 0.05) 10px),
            repeating-linear-gradient(-45deg, transparent, transparent 5px, rgba(0, 0, 0, 0.05) 5px, rgba(0, 0, 0, 0.05) 10px);
       }
      
      /* --- ENHANCED BACKGROUNDS --- */
      .bg-sunset { animation: sunset-sky-animation 60s linear infinite; }
      @keyframes sunset-sky-animation { 0% { background: linear-gradient(to top, #ff7e5f, #feb47b); } 50% { background: linear-gradient(to top, #483D8B, #d66d75); } 100% { background: linear-gradient(to top, #ff7e5f, #feb47b); } }
      .sunset-sun { position: absolute; left: 50%; transform: translateX(-50%); width: 100px; height: 100px; background: radial-gradient(circle, #fff700, #ffc300); border-radius: 50%; box-shadow: 0 0 50px #fff700; animation: sun-move 60s linear infinite; }
      @keyframes sun-move { 0% { top: 15%; } 50% { top: 65%; opacity: 1; } 51% { opacity: 0; } 100% { top: 15%; } }
      .sunset-mountain { position: absolute; bottom: 0; left: 0; width: 100%; height: 40%; background-repeat: repeat-x; }
      .sunset-mountain.m1 { background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 100"><path d="M0 100 L 150 20 L 300 80 L 450 30 L 600 90 L 800 40 L 800 100 Z" fill="%232c2541"/></svg>'); background-size: 800px 100%; z-index: 3; animation: parallax 60s linear infinite; }
      .sunset-mountain.m2 { height: 30%; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 100"><path d="M0 100 L 200 40 L 400 90 L 550 50 L 700 80 L 800 60 L 800 100 Z" fill="%233b3251"/></svg>'); background-size: 800px 100%; z-index: 2; animation: parallax 40s linear infinite; }
      .sunset-mountain.m3 { height: 20%; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 100"><path d="M0 100 L 250 60 L 500 90 L 750 70 L 800 80 L 800 100 Z" fill="%23493e61"/></svg>'); background-size: 800px 100%; z-index: 1; animation: parallax 20s linear infinite; }
      @keyframes parallax { from { background-position-x: 0; } to { background-position-x: -800px; } }
      .sunset-cloud { position: absolute; background: linear-gradient(to bottom, rgba(255,255,255,0.7), rgba(255,255,255,0.3)); border-radius: 50%; animation: move-clouds 50s linear infinite; }
      .sunset-cloud.c1 { width: 200px; height: 30px; top: 20%; left: 10%; animation-duration: 70s; }
      .sunset-cloud.c2 { width: 300px; height: 40px; top: 25%; left: 50%; animation-duration: 90s; }
      .sunset-cloud.c3 { width: 150px; height: 25px; top: 18%; left: 80%; animation-duration: 60s; }

      .bg-galaxy { background-color: #000; background-image: radial-gradient(circle, #0a0a23 1px, transparent 1px), radial-gradient(circle, #1a1a3e 1px, transparent 1px); background-size: 30px 30px, 60px 60px; }
      @keyframes move-twinkle-stars { from { transform: translateY(0); } to { transform: translateY(-100vh); } }
      .stars-bg, .twinkling-bg { position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 200%; display: block; }
      .stars-bg { background: transparent url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 1000'%3E%3Ccircle cx='100' cy='100' r='1.5' fill='%23fff'/%3E%3Ccircle cx='200' cy='400' r='1' fill='%23fff'/%3E%3Ccircle cx='800' cy='300' r='1.2' fill='%23fff'/%3E%3Ccircle cx='500' cy='700' r='1.5' fill='%23fff'/%3E%3Ccircle cx='900' cy='650' r='1' fill='%23fff'/%3E%3Ccircle cx='450' cy='200' r='1.1' fill='%23fff'/%3E%3C/svg%3E") repeat top center; }
      .twinkling-bg { background: transparent url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 1000'%3E%3Ccircle cx='300' cy='250' r='1.5' fill='%23fff'/%3E%3Ccircle cx='700' cy='500' r='1' fill='%23fff'/%3E%3Ccircle cx='150' cy='800' r='1.2' fill='%23fff'/%3E%3Ccircle cx='600' cy='900' r='1.5' fill='%23fff'/%3E%3Ccircle cx='850' cy='150' r='1' fill='%23fff'/%3E%3C/svg%3E") repeat top center; animation: move-twinkle-stars 200s linear infinite; }
      .shooting-star { position: absolute; top: 50%; left: 50%; height: 2px; background: linear-gradient(-45deg, rgba(147, 112, 219, 1), rgba(0, 0, 255, 0)); border-radius: 999px; filter: drop-shadow(0 0 6px rgba(105, 155, 255, 0.5)); animation: tail 4s ease-in-out infinite, shooting 4s ease-in-out infinite; }
      .shooting-star::before, .shooting-star::after { content: ''; position: absolute; top: calc(50% - 1px); right: 0; height: 2px; background: linear-gradient(-45deg, rgba(0, 0, 255, 0), rgba(147, 112, 219, 1), rgba(0, 0, 255, 0)); transform: translateX(50%) rotateZ(45deg); border-radius: 100%; animation: shining 4s ease-in-out infinite; }
      .shooting-star::after { transform: translateX(50%) rotateZ(-45deg); }
      .shooting-star:nth-child(1) { top: 10%; left: 40%; animation-delay: 1.2s; } .shooting-star:nth-child(2) { top: 30%; left: 80%; animation-delay: 2.5s; } .shooting-star:nth-child(3) { top: 80%; left: 20%; animation-delay: 0.5s; } .shooting-star:nth-child(4) { top: 50%; left: 10%; animation-delay: 3.1s; } .shooting-star:nth-child(5) { top: 90%; left: 90%; animation-delay: 4s; }
      @keyframes tail { 0% { width: 0; } 30% { width: 100px; } 100% { width: 0; } }
      @keyframes shining { 0% { width: 0; } 50% { width: 30px; } 100% { width: 0; } }
      @keyframes shooting { 0% { transform: translateX(0); } 100% { transform: translateX(400px); } }
      
      .bg-sea { background: linear-gradient(to top, #0575e6, #021b79); }
      .bubble { position: absolute; background: rgba(255,255,255,0.2); border-radius: 50%; animation: bubbles 15s infinite; border: 1px solid rgba(255,255,255,0.3); }
      .bubble::before { content: ''; position: absolute; top: 10%; left: 10%; width: 20%; height: 20%; background: radial-gradient(circle, rgba(255,255,255,0.5), transparent 70%); border-radius: 50%; }
      @keyframes bubbles { 0% { transform: translateY(0); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(-100vh); opacity: 0; } }
      .sea-plants { position: absolute; bottom: 0; left: 0; width: 100%; height: 15%; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='M10 100 C 20 60, 20 60, 30 100' stroke='%23004d00' stroke-width='2' fill='none'/%3E%3Cpath d='M50 100 C 60 40, 60 40, 70 100' stroke='%23006400' stroke-width='3' fill='none'/%3E%3Cpath d='M80 100 C 90 50, 90 50, 100 100' stroke='%23005500' stroke-width='2' fill='none'/%3E%3C/svg%3E") repeat-x; background-size: 150px; }
      .bubbles-wrapper .bubble:nth-child(even) { animation-direction: reverse; }
     
      .bg-forest { background: linear-gradient(to bottom, #87ceeb 0%, #a8e063 100%); }
      .sun { position: absolute; top: 10%; right: 10%; width: 100px; height: 100px; background: radial-gradient(circle, #fff700, #ffc300); border-radius: 50%; box-shadow: 0 0 50px #fff700; animation: sun-glow 5s infinite alternate; }
      @keyframes sun-glow { from { transform: scale(1); } to { transform: scale(1.1); } }
      .cloud { position: absolute; background: white; border-radius: 100px; filter: opacity(0.8); }
      .cloud::before, .cloud::after { content: ''; position: absolute; background: white; border-radius: 50%; }
      .cloud-1 { width: 200px; height: 60px; top: 15%; animation: move-clouds 65s linear infinite; }
      .cloud-1::before { width: 100px; height: 100px; top: -50px; left: 30px; }
      .cloud-1::after { width: 120px; height: 120px; top: -60px; right: 20px; }
      .cloud-2 { width: 150px; height: 45px; top: 25%; animation: move-clouds 75s linear infinite 5s; }
      .cloud-2::before { width: 80px; height: 80px; top: -40px; left: 20px; }
      .cloud-2::after { width: 90px; height: 90px; top: -45px; right: 15px; }
      @keyframes move-clouds { from { transform: translateX(-250px); } to { transform: translateX(100vw); } }
      .grass-layer { position: absolute; bottom: 0; left: 0; width: 100%; height: 50px; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 50'%3E%3Cpath d='M0 50 Q 10 20, 20 50 T 40 50 T 60 50 T 80 50 T 100 50' fill='%23348C31'/%3E%3C/svg%3E") repeat-x; background-size: 100px 50px; z-index: 10; }
      .mountain-range { position: absolute; bottom: 40px; left: 0; width: 100%; height: 40%; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 100"><path d="M0 100 L 150 20 L 300 80 L 450 30 L 600 90 L 800 40 L 800 100 Z" fill="%236B8E23"/></svg>') repeat-x; z-index: 1; opacity: 0.5; }
      .forest-tree { position: absolute; bottom: 20px; width: 20px; transform-origin: bottom center; animation: sway 8s ease-in-out infinite alternate; }
      .forest-tree::before { content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 100%; background: #654321; border-radius: 10px 10px 0 0; }
      .forest-tree::after { content: ''; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: #228B22; border-radius: 50%; }
      .tree-style-1 { height: 120px; } .tree-style-1::after { width: 120px; height: 120px; background: #006400; }
      .tree-style-2 { height: 80px; animation-delay: -3s; } .tree-style-2::after { width: 90px; height: 90px; background: #556B2F; border-radius: 60% 40% 50% 50% / 60% 50% 50% 40%; }
      .pos-1 { left: 10%; z-index: 5; } .pos-2 { left: 70%; z-index: 4; } .pos-3 { left: 40%; }
      @keyframes sway { from { transform: rotate(-1deg); } to { transform: rotate(1deg); } }
      .leaf { position: absolute; width: 15px; height: 10px; background: #6B8E23; border-radius: 0 100% 0 100%; animation: fall 10s linear infinite; }
      @keyframes fall { 0% { transform: translateY(-20px) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }

      .bg-snow { background: linear-gradient(to bottom, #e6e9f0 0%, #eef1f5 100%); }
      .snowflake { position: absolute; width: 10px; height: 10px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M12 2l2.5 4h-5L12 2zm0 20l-2.5-4h5L12 22zM2 12l4-2.5v5L2 12zm20 0l-4 2.5v-5L22 12zM6.2 6.2l1.4-1.4 2.8 2.8-1.4 1.4-2.8-2.8zm11.6 11.6l-1.4 1.4-2.8-2.8 1.4-1.4 2.8 2.8zm-11.6 0l2.8-2.8 1.4 1.4-2.8 2.8-1.4-1.4zm11.6-11.6l-2.8 2.8-1.4-1.4 2.8-2.8 1.4 1.4z'/%3E%3C/svg%3E"); background-size: contain; animation: snow-fall 10s linear infinite; }
      @keyframes snow-fall { 0% { transform: translateY(-10vh) translateX(0px); } 100% { transform: translateY(110vh) translateX(20px); } }

      .bg-night-city { background: linear-gradient(to top, #243949 0%, #1d2b38 100%); }
      .city-bg { position: absolute; bottom: 0; left: 0; width: 100%; height: 40%; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect x='5' y='50' width='15' height='50' fill='%23111'/%3E%3Crect x='25' y='30' width='20' height='70' fill='%23181818'/%3E%3Crect x='50' y='60' width='10' height='40' fill='%23101010'/%3E%3Crect x='65' y='20' width='30' height='80' fill='%23151515'/%3E%3C/svg%3E") repeat-x; background-size: 200px; }
      .city-light { position: absolute; background: #ffd700; border-radius: 50%; animation: flicker 3s infinite; }
      @keyframes flicker { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }


      /* --- AVATAR FRAMES --- */
      .avatar-wrapper { position: relative; padding: 4px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; }
      .avatar-wrapper img { display: block; border-radius: 50%; background: #fff; }
      
      .gold-frame { background: linear-gradient(145deg, #a17d23, #f2df77, #a17d23); box-shadow: 0 0 10px rgba(255, 215, 0, 0.8), inset 0 0 8px rgba(0,0,0,0.5); border: 2px solid #8c6c1d; }
      .silver-frame { background: linear-gradient(145deg, #9e9e9e, #ffffff, #9e9e9e); box-shadow: 0 0 8px rgba(192, 192, 192, 0.7), inset 0 0 8px rgba(0,0,0,0.5); border: 2px solid #8e8e8e; }
      
      /* --- ENHANCED FRAMES --- */
      .royal-frame { border: 2px solid #4a2c0f; background: linear-gradient(135deg, #7a5a2a 0%, #b89a49 50%, #7a5a2a 100%); box-shadow: 0 2px 4px rgba(0,0,0,0.5), inset 0 0 5px #fff8d7; }
      .royal-frame::after { content: ''; position: absolute; top: -10px; left: 50%; transform: translateX(-50%); width: 35px; height: 35px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' fill='%23FFD700'%3E%3Cpath d='M448 192L320 320l-64-64-64 64L64 192l64-128 64 64 64-64 64 64 64-64L448 192zM64 384h384v64H64v-64z' stroke='%23B8860B' stroke-width='10'/%3E%3C/svg%3E"); background-size: contain; background-repeat: no-repeat; filter: drop-shadow(0 3px 3px rgba(0,0,0,0.6)); }

      .nature-frame { border: 4px solid #556B2F; background: linear-gradient(135deg, #d2b48c, #8FBC8F); box-shadow: inset 0 0 8px rgba(0,0,0,0.4); }
      .nature-frame::before, .nature-frame::after { content: ''; position: absolute; width: 40px; height: 40px; background-repeat: no-repeat; background-size: contain; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='M50,95 C60,80 70,70 75,50 C80,30 70,20 60,5' stroke='%23556B2F' stroke-width='5' fill='none'/%3E%3Cpath d='M75,50 C85,55 95,65 95,75' stroke='%23556B2F' stroke-width='4' fill='none'/%3E%3Cpath d='M60,5 C55,15 45,25 40,30' stroke='%23556B2F' stroke-width='4' fill='none'/%3E%3Ccircle cx='95' cy='75' r='5' fill='%23228B22'/%3E%3Ccircle cx='40' cy='30' r='4' fill='%23228B22'/%3E%3C/svg%3E"); }
      .nature-frame::before { top: -16px; left: -12px; transform: rotate(-30deg); }
      .nature-frame::after { bottom: -16px; right: -12px; transform: rotate(150deg) scaleX(-1); }

      .fire-frame { border: 3px solid transparent; border-radius: 50%; background: radial-gradient(ellipse at center, #ff8c00 0%, #d32f2f 60%, #8B0000 100%); box-shadow: 0 0 5px rgba(255, 140, 0, 0.8), 0 0 10px rgba(255, 69, 0, 0.7), 0 0 20px rgba(220, 20, 60, 0.6), inset 0 0 10px rgba(255, 255, 0, 0.5); animation: fire-flicker 1.5s ease-in-out infinite; }
      .fire-frame::before { content: ''; position: absolute; top: -5%; right: -5%; bottom: -5%; left: -5%; border-radius: 50%; background: radial-gradient(circle, transparent 60%, #ff4500); animation: fire-sparks 1s linear infinite; opacity: 0.5; z-index: -1; }
      @keyframes fire-flicker { 0%, 100% { transform: scale(1); box-shadow: 0 0 5px rgba(255, 140, 0, 0.8), 0 0 10px rgba(255, 69, 0, 0.7), 0 0 20px rgba(220, 20, 60, 0.6), inset 0 0 10px rgba(255, 255, 0, 0.5); } 50% { transform: scale(1.05); box-shadow: 0 0 10px rgba(255, 140, 0, 1), 0 0 20px rgba(255, 69, 0, 0.9), 0 0 35px rgba(220, 20, 60, 0.8), inset 0 0 15px rgba(255, 255, 100, 0.7); } }
      @keyframes fire-sparks { from { transform: rotate(0deg); opacity: 0.7; } to { transform: rotate(360deg); opacity: 0.4; } }
      
      @keyframes gem-glow { 0% { border-color: #00ffff; box-shadow: 0 0 10px #0ff, 0 0 20px #00f, inset 0 0 5px #fff; } 25% { border-color: #ff00ff; box-shadow: 0 0 10px #f0f, 0 0 20px #f00, inset 0 0 5px #fff; } 50% { border-color: #ffff00; box-shadow: 0 0 10px #ff0, 0 0 20px #f80, inset 0 0 5px #fff; } 75% { border-color: #00ff00; box-shadow: 0 0 10px #0f0, 0 0 20px #080, inset 0 0 5px #fff; } 100% { border-color: #00ffff; box-shadow: 0 0 10px #0ff, 0 0 20px #00f, inset 0 0 5px #fff; } }
      .gem-frame { background: radial-gradient(circle, #4e54c8, #8f94fb); border: 4px solid; animation: gem-glow 3s linear infinite; }

      .water-frame { background: linear-gradient(45deg, #1e90ff, #87ceeb, #1e90ff); background-size: 200% 200%; box-shadow: inset 0 0 10px rgba(255,255,255,0.7); animation: wave-animation 3s ease infinite; }
      @keyframes wave-animation { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
      .neon-frame { border: 3px solid #0ff; box-shadow: 0 0 5px #0ff, 0 0 10px #0ff, 0 0 15px #00f, inset 0 0 5px #0ff; animation: neon-flicker 2s infinite alternate; }
      @keyframes neon-flicker { from { opacity: 1; } to { opacity: 0.8; } }

      /* --- Lobby UI --- */
      .room-card { background: white; padding: 1rem; border-radius: 0.75rem; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s ease-in-out; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border-width: 4px; border-style: solid; }
      .room-card:hover { transform: translateY(-5px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); }
      .room-card.waiting { border-color: #3b82f6; box-shadow: 0 0 15px rgba(59, 130, 246, 0.4); }
      .room-card.playing { border-color: #ef4444; box-shadow: 0 0 15px rgba(239, 68, 68, 0.4); }
      
      /* --- PROFILE & STORE UI --- */
      .equip-item { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 8px; border-radius: 8px; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; }
      .equip-item p { font-size: 12px; font-weight: bold; color: #333; }
      .equip-item.selected { background-color: #dbeafe; border-color: #3b82f6; }
      .btn-twitter { background-color: #1DA1F2; color: white; } .btn-twitter:hover { background-color: #0c85d0; }
      .btn-discord { background-color: #5865F2; color: white; } .btn-discord:hover { background-color: #4752c4; }
      .gift-badge { position: absolute; top: -10px; right: -10px; background: linear-gradient(135deg, #f59e0b, #ef4444); color: white; padding: 4px 8px; border-radius: 9999px; font-size: 10px; font-weight: bold; transform: rotate(15deg); display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); pointer-events: none; }
      .tool-icon.disabled { cursor: not-allowed; opacity: 0.4; }
    `}</style>
    <div id="app-container" className="w-full h-full max-w-screen-xl mx-auto relative">
        <div id="background-effects"></div>
        <div id="notification" className="hidden fixed top-5 left-5 text-white py-2 px-4 rounded-lg shadow-lg z-50"></div>

        {/* Screens */}
        <div id="home-screen" className="screen active w-full h-full flex-col items-center justify-center text-center p-4">
            <header className="absolute top-4 right-4 left-4 flex justify-between items-center">
                <div className="flex gap-2">
                    <button data-action="show-updates" className="btn btn-secondary text-sm py-1 px-3">آخر التحديثات</button>
                    <button data-action="show-info" className="btn btn-secondary text-sm py-1 px-3">معلومات</button>
                </div>
            </header>
            <h1 className="font-brand text-7xl md:text-8xl text-white" style={{textShadow: '3px 3px 0 #1E3A8A'}}>Gartic.io</h1>
            <p className="text-2xl font-bold text-yellow-300 -mt-2" style={{textShadow: '2px 2px 0 #1E3A8A'}}>ارسم، خمّن، فُز</p>
            <div className="main-container w-full max-w-3xl p-6 mt-6 grid md:grid-cols-2 gap-6 items-center">
                <div className="flex flex-col items-center">
                    <h2 className="font-bold text-xl mb-4">لعب سريع</h2>
                    <div className="relative w-24 h-24 mb-4">
                        <img id="guest-avatar" src="https://api.dicebear.com/7.x/pixel-art/svg?seed=1" className="w-full h-full rounded-full border-4 border-gray-200" alt="avatar"/>
                        <button data-action="change-guest-avatar" className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-1.5 hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300" title="تغيير الصورة الرمزية">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/></svg>
                        </button>
                    </div>
                    <input type="text" id="nickname-input" placeholder="أدخل اسمك المستعار..." maxLength="20" className="w-full text-center input-field"/>
                    <button data-action="login-guest" className="btn btn-play w-full py-3 mt-4 text-xl">العب!</button>
                </div>
                <div className="flex flex-col items-center border-t-2 md:border-t-0 md:border-r-2 border-gray-200 pt-6 md:pt-0 md:pr-6">
                     <h2 className="font-bold text-xl mb-4">سجل الدخول</h2>
                     <p className="text-gray-600 text-center mb-4">للوصول إلى مزايا حصرية والاحتفاظ بإحصائياتك.</p>
                     <div className="w-full space-y-3">
                        <div className="relative">
                            <button data-action="login-google" className="btn btn-secondary w-full">
                                <span className="flex items-center justify-center">
                                    <svg className="w-5 h-5 ml-2" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
                                    <span>Google</span>
                                </span>
                            </button>
                            <div className="gift-badge">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                <span>هدية!</span>
                            </div>
                        </div>
                        <button data-action="login-dummy" className="btn btn-twitter w-full">Twitter</button>
                        <button data-action="login-dummy" className="btn btn-discord w-full">Discord</button>
                     </div>
                </div>
            </div>
        </div>
        
        <div id="main-menu-screen" className="screen w-full h-full flex-col items-center justify-center p-4"></div>
        <div id="lobby-screen" className="screen w-full h-full flex-col p-4 md:p-6 main-container"></div>
        <div id="leaderboard-screen" className="screen w-full h-full flex-col p-4 md:p-6 main-container"></div>
        <div id="friends-screen" className="screen w-full h-full flex-col p-4 md:p-6 main-container"></div>
        <div id="store-screen" className="screen w-full h-full flex-col p-4 md:p-6 main-container"></div>
        <div id="create-room-screen" className="screen w-full h-full flex-col items-center justify-center p-4"></div>
        <div id="profile-screen" className="screen w-full h-full flex-col items-center justify-center p-4"></div>
        <div id="game-screen" className="screen w-full h-full p-2 lg:p-4 gap-4 relative"></div>
    
        {/* Modals */}
        <div id="updates-modal" className="modal fixed inset-0 z-50 items-center justify-center"><div className="main-container w-full max-w-lg p-6 relative"><button data-action="close-modal" className="absolute top-2 right-3 text-2xl font-bold">&times;</button><h2 className="font-brand text-3xl text-center mb-4">آخر التحديثات</h2><p className="text-center">تحديث كبير! تم إضافة خلفيات جديدة للعبة، إطارات متحركة ومميزة، وأدوات رسم جديدة يمكنك شراؤها من المتجر!</p></div></div>
        <div id="info-modal" className="modal fixed inset-0 z-50 items-center justify-center"><div className="main-container w-full max-w-lg p-6 relative"><button data-action="close-modal" className="absolute top-2 right-3 text-2xl font-bold">&times;</button><h2 className="font-brand text-3xl text-center mb-4">معلومات عنا</h2><p className="text-center">هذه اللعبة هي نسخة مستوحاة من لعبة Gartic الشهيرة، تم تطويرها لأغراض تعليمية وتطبيقية باستخدام React, Firebase, و Tailwind CSS.</p></div></div>
        <div id="code-entry-modal" className="modal fixed inset-0 z-50 items-center justify-center p-4">
            <div className="main-container w-full max-w-md p-6 relative" style={{borderWidth: '6px'}}>
                <button data-action="close-modal" className="absolute top-2 right-3 text-2xl font-bold">&times;</button>
                <h2 className="font-brand text-3xl text-center mb-4 text-blue-800">الانضمام لغرفة خاصة</h2>
                <input type="text" id="code-input" placeholder="أدخل كود الغرفة..." className="w-full text-center tracking-widest text-xl p-3 input-field mb-4"/>
                <button id="submit-code-btn" className="btn btn-play text-xl w-full">انضم</button>
            </div>
        </div>
        <div id="password-entry-modal" className="modal fixed inset-0 z-50 items-center justify-center p-4">
            <div className="main-container w-full max-w-md p-6 relative" style={{borderWidth: '6px'}}>
                <button data-action="close-modal" className="absolute top-2 right-3 text-2xl font-bold">&times;</button>
                <h2 className="font-brand text-3xl text-center mb-4 text-blue-800">غرفة محمية بكلمة مرور</h2>
                <input type="password" id="password-input" placeholder="أدخل كلمة المرور..." className="w-full text-center text-xl p-3 input-field mb-4"/>
                <button id="submit-password-btn" className="btn btn-play text-xl w-full">دخول</button>
            </div>
        </div>
        <div id="word-choice-modal" className="modal fixed inset-0 z-50 items-center justify-center p-4">
            <div className="main-container w-full max-w-md p-8 text-center">
                <h2 className="font-brand text-3xl text-center mb-4 text-blue-800">اختر كلمة لترسمها</h2>
                <div id="word-options" className="flex justify-center gap-4"></div>
                <div id="word-choice-timer" className="font-bold text-2xl text-red-500 my-3">10</div>
                <p className="text-gray-500 mt-2">سيتم تخطي دورك تلقائيًا إذا لم تختر.</p>
            </div>
        </div>
        <div id="scoreboard-modal" className="modal fixed inset-0 z-50 items-center justify-center p-4">
            <div className="main-container w-full max-w-lg p-6 relative">
                 <h2 id="scoreboard-title" className="font-brand text-3xl text-center mb-4 text-blue-800">انتهت الجولة!</h2>
                 <div id="scoreboard-body" className="space-y-2 max-h-80 overflow-y-auto"></div>
                 <div id="scoreboard-timer" className="text-center font-bold text-xl mt-4 text-gray-600"></div>
            </div>
        </div>
    </div>
    </>
  );
}

export default App;
