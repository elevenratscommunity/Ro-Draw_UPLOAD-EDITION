import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFirebase } from '../../contexts/FirebaseContext';
import { useUI } from '../../contexts/UIContext';

export default function MainMenuScreen({ showScreen }) {
    const { currentUser, logout } = useAuth();
    const { db } = useFirebase();
    const { showModal } = useUI();
    const [requestsCount, setRequestsCount] = useState(0);

    // --- FIX IS HERE ---
    // 1. useEffect MUST be called before any conditional return
    useEffect(() => {
        // 2. Add the check for currentUser *inside* the useEffect now
        if (!currentUser) {
            setRequestsCount(0); // Reset count if user logs out
            return; // Exit effect if no user
        }

        const q = db.collection("friendships")
            .where("users", "array-contains", currentUser.uid)
            .where("status", "==", "pending");

        const unsubscribe = q.onSnapshot(snapshot => {
            let count = 0;
            snapshot.forEach(doc => {
                if (doc.data().requestedBy !== currentUser.uid) {
                    count++;
                }
            });
            setRequestsCount(count);
        }, error => {
             console.error("Error listening to friend requests:", error);
             setRequestsCount(0);
        });

        return () => unsubscribe();

    }, [currentUser, db]); // Depend on the whole currentUser object now

    // 3. Move the conditional return *after* all Hook calls
    if (!currentUser) {
        console.warn("MainMenuScreen rendered with null currentUser (should navigate away).");
        return null; // Return null if no user, App.js will handle navigation
    }
    // --- END FIX ---

    // Safely access stats
    const userStats = currentUser.stats || {};

    // The rest of the component remains the same...
    return (
        <div id="main-menu-screen" className="screen active w-full h-full flex-col items-center justify-center p-4">
            <header className="absolute top-4 left-4 right-4 flex justify-between items-center text-white">
                <button onClick={logout} className="btn btn-secondary">تسجيل الخروج</button>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-black/20 p-2 rounded-full">
                         <span className="font-bold text-yellow-300 text-lg">{userStats.coins || 0}</span>
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400"><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"></path><path d="M13 12.586 14.707 14l-1.414 1.414-2.293-2.293a1 1 0 0 1 0-1.414l2.293-2.293L14.707 10 13 11.707V8h-2v4.586L9.293 14l-1.414 1.414L10 17.707a.999.999 0 0 1 0 1.414L7.707 21.414 9.121 22.828 11 21l2-2 2 2 1.414-1.414-2.293-2.293a1 1 0 0 1 0-1.414z"></path></svg>
                    </div>
                    <div onClick={() => showScreen('profile')} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-black/20 transition-colors">
                        <span className="font-bold hidden sm:block">{currentUser.displayName}</span>
                        <div className={`avatar-wrapper ${currentUser.equippedFrame || ''}`}>
                           <img className="w-12 h-12 rounded-full" src={currentUser.photoURL} alt="Avatar" />
                        </div>
                    </div>
                </div>
            </header>
            <div className="glass-effect w-full max-w-4xl p-8 rounded-2xl">
                <h2 className="font-brand text-4xl text-center mb-6">القائمة الرئيسية</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

                    <div className="menu-item" onClick={() => showScreen('lobby')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto mb-2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                        <p className="font-bold">الغرف</p>
                    </div>

                    <div className="menu-item relative" onClick={() => showScreen('friends')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto mb-2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        <p className="font-bold">الأصدقاء</p>
                        {requestsCount > 0 && (
                            <span className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white text-sm font-bold rounded-full flex items-center justify-center">
                                {requestsCount}
                            </span>
                        )}
                    </div>

                    <div className="menu-item" onClick={() => showScreen('leaderboard')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                        <p className="font-bold">المتصدرين</p>
                    </div>

                    <div className="menu-item" onClick={() => showScreen('store')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto mb-2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                        <p className="font-bold">المتجر</p>
                    </div>

                    <div className="menu-item col-span-2 md:col-span-1" onClick={() => window.open('https://www.google.com', '_blank')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto mb-2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></svg>
                        <p className="font-bold">موقعنا الرسمي</p>
                    </div>

                    <div className="menu-item col-span-2 md:col-span-1" onClick={() => showModal('codeEntry')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto mb-2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                        <p className="font-bold">إدخال كود</p>
                    </div>
                </div>
            </div>
        </div>
    );
}