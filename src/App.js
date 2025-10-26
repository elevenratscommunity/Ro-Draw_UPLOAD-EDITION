import React, { useState, useEffect } from 'react';
// --- تأكد إن السطر ده موجود وصح ---
import { AuthProvider, useAuth } from './contexts/AuthContext'; // <-- استدعاء AuthContext
// ------------------------------------
import { GameProvider, useGame } from './contexts/GameContext'; // <-- استدعاء GameContext
import { UIProvider } from './contexts/UIContext'; // <-- استدعاء UIContext
// import { FirebaseProvider } from './contexts/FirebaseContext'; // <-- لو هتستخدمه

// Components
import Notification from './components/ui/Notification';
import BackgroundEffects from './components/ui/BackgroundEffects';
import Modals from './components/ui/Modals';

// Screens
import HomeScreen from './components/screens/HomeScreen';
import MainMenuScreen from './components/screens/MainMenuScreen';
import LeaderboardScreen from './components/screens/LeaderboardScreen';
import StoreScreen from './components/screens/StoreScreen';
import ProfileScreen from './components/screens/ProfileScreen';
import LobbyScreen from './components/screens/LobbyScreen';
import CreateRoomScreen from './components/screens/CreateRoomScreen';
import FriendsScreen from './components/screens/FriendsScreen';
import GameScreen from './components/screens/GameScreen'; // <-- الشاشة الحقيقية

// ده المكون الوسيط عشان يعرف يجيب الـ currentRoomId ويستخدم showScreen
function AppContent() {
    const [activeScreen, setActiveScreen] = useState('home');
    const { currentUser, loading } = useAuth(); // <-- هنجيب دول من AuthContext
    // الـ Hook ده لازم يكون جوه مكون ابن لـ GameProvider
    const gameContext = useGame(); // <-- هنجيب ده من GameContext
    const currentRoomId = gameContext?.currentRoomId; // <-- نستخدم ? عشان نتأكد إنه موجود

    useEffect(() => {
        if (loading) return; // مستنيين نعرف مين مسجل

        // لو إحنا جوه لعبة، خليك جوه اللعبة حتى لو عملت ريفرش
        if (currentRoomId) {
            // Don't change screen if already in game and maybe just re-rendered
            if (activeScreen !== 'game') {
                setActiveScreen('game');
            }
            return;
        }

        // لو مش جوه لعبة، شوف مسجل دخول ولا لأ
        if (currentUser) {
            // Don't switch back to mainMenu if already there or on another non-game screen
            if (activeScreen === 'home' || activeScreen === 'game') {
                 setActiveScreen('mainMenu');
            }
        } else {
            // Logged out, force back to home
            setActiveScreen('home');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser, loading, currentRoomId]); // Monitor these states


    // دي الدالة اللي هتتنقل بين الشاشات (مبقاش ليها لازمة هنا، بس ممكن نسيبها لو مكون تاني احتاجها)
    const showScreen = (screenName) => {
        // Prevent navigating away from game screen manually if in a room? Or let leaveRoom handle it?
        // Let leaveRoom handle it for now.
        setActiveScreen(screenName);
    };

    // دالة اختيار الشاشة اللي هتظهر
    const renderScreen = () => {
        // Use a loading screen if auth is loading OR if we are entering a room but roomData isn't loaded yet
         if (loading || (currentRoomId && !gameContext?.roomData && activeScreen === 'game')) {
             return (
                 <div className="screen active justify-center items-center">
                     <h1 className="font-brand text-5xl text-white">Loading...</h1>
                 </div>
             );
         }

        switch (activeScreen) {
            case 'home':
                return <HomeScreen />;
            case 'mainMenu':
                return <MainMenuScreen showScreen={showScreen} />;
            case 'leaderboard':
                return <LeaderboardScreen showScreen={showScreen} />;
            case 'store':
                return <StoreScreen showScreen={showScreen} />;
            case 'profile':
                return <ProfileScreen showScreen={showScreen} />;
            case 'lobby':
                return <LobbyScreen showScreen={showScreen} />;
            case 'createRoom':
                return <CreateRoomScreen showScreen={showScreen} />;
            case 'friends':
                return <FriendsScreen showScreen={showScreen} />;
            case 'game':
                // Only render game screen if we have a room ID
                return currentRoomId ? <GameScreen /> : <MainMenuScreen showScreen={showScreen} />; // Fallback to main menu if no room id
            default:
                return <HomeScreen />;
        }
    };

    // شاشة التحميل الأولية (ممكن ندمجها مع اللي فوق)
    // if (loading) { ... } // Already handled above

    // ده الـ HTML الرئيسي للتطبيق كله
    return (
        <div id="app-container" className="w-full h-full max-w-screen-xl mx-auto relative">
            <BackgroundEffects /> {/* تأثيرات الخلفية */}
            <Notification />      {/* الإشعارات */}
            {/* Render Modals only if UIContext is available */}
            {gameContext && <Modals />}

            {renderScreen()}      {/* الشاشة النشطة */}
        </div>
    );
}


// --- المكون الرئيسي App ---
// وظيفته دلوقتي إنه يحط الـ Providers بالترتيب الصح
export default function App() {
    return (
      // 1. Firebase Provider (Optional if imported directly)
      // <FirebaseProvider>
        // 2. UI Provider
        <UIProvider>
          {/* 3. Auth Provider */}
          {/* --- تأكد إن السطر ده هو AuthProvider مش اسم تاني --- */}
          <AuthProvider>
            {/* 4. Game Provider */}
            <GameProvider> {/* showScreen اتشالت من هنا */}
              <AppContent /> {/* ده المكون اللي فيه اللوجيك */}
            </GameProvider>
          </AuthProvider>
          {/* ---------------------------------------------------- */}
        </UIProvider>
      // </FirebaseProvider>
    );
  }