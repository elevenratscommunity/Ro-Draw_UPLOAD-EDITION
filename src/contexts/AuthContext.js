import React, { createContext, useContext, useState, useEffect } from 'react';
import { useFirebase } from './FirebaseContext';
import { useUI } from './UIContext';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const { auth, db, provider, firebase } = useFirebase();
    const { showNotification } = useUI();

    // دالة تسجيل الخروج
    const logout = () => auth.signOut();

    // دالة تسجيل الدخول كضيف
    const loginGuest = async (nickname) => {
        if (!nickname) nickname = `Guest-${Math.floor(1000 + Math.random() * 9000)}`;
        try {
            // هنحفظ الاسم المستعار مؤقتا عشان نستخدمه بعد ما onAuthStateChanged يشتغل
            localStorage.setItem('guestNickname', nickname);
            await auth.signInAnonymously();
        } catch (error) {
            console.error("Error signing in anonymously: ", error);
            showNotification("حدث خطأ أثناء تسجيل الدخول كضيف", false);
        }
    };
    
    // دالة تسجيل الدخول بجوجل
    const loginGoogle = () => auth.signInWithPopup(provider);

    // ده المراقب اللي بيعرفنا مين مسجل دخول
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                const userDocRef = db.collection("users").doc(user.uid);
                let userDoc = await userDocRef.get();
                let isNewUser = !userDoc.exists;

                if (isNewUser) {
                    // لو ضيف جديد، ناخد الاسم اللي حفظناه
                    let nickname = user.isAnonymous ? localStorage.getItem('guestNickname') : null;
                    if (user.isAnonymous && nickname) {
                        localStorage.removeItem('guestNickname'); // ننضفه بعد الاستخدام
                    }

                    const initialScore = !user.isAnonymous ? 250 : 0;
                    const initialCoins = !user.isAnonymous ? 100 : 0;
                    
                    const newUserProfile = {
                        uid: user.uid, 
                        displayName: user.displayName || nickname || `User-${user.uid.substring(0, 5)}`,
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
                    };

                    await userDocRef.set(newUserProfile);
                    
                    if (initialScore > 0) {
                        showNotification(`مرحباً بك! لقد حصلت على ${initialScore} نقطة و ${initialCoins} عملة كهدية تسجيل.`, true);
                    }
                    setCurrentUser(newUserProfile);
                } else {
                    setCurrentUser(userDoc.data());
                }
            } else { 
                setCurrentUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auth, db, provider, firebase]);

    // تطبيق الخلفية على الـ body
    useEffect(() => {
        if (currentUser && currentUser.equippedBackground) {
            document.body.className = currentUser.equippedBackground;
        } else {
            document.body.className = 'bg-classic';
        }
    }, [currentUser]);


    const value = {
        currentUser,
        setCurrentUser, // هنحتاجه لتحديث البروفايل
        loading,
        logout,
        loginGuest,
        loginGoogle
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};