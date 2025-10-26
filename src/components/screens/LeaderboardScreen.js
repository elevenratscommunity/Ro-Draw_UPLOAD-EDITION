import React, { useState, useEffect } from 'react';
import { useFirebase } from '../../contexts/FirebaseContext';

// المكون ده مسئول عن عرض قائمة المتصدرين
export default function LeaderboardScreen({ showScreen }) {
    const { db } = useFirebase(); // بنجيب الـ database من الـ Context
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);

    // useEffect ده بيشتغل مرة واحدة بس لما المكون يظهر على الشاشة
    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                // نفس الكود بتاعك اللي كان بيجيب المتصدرين
                const q = db.collection("users").orderBy("stats.totalScore", "desc").limit(50);
                const querySnapshot = await q.get();
                
                const usersList = [];
                querySnapshot.forEach((doc) => {
                    usersList.push(doc.data());
                });

                setLeaderboard(usersList);
            } catch (error) {
                console.error("Error fetching leaderboard: ", error);
                // ممكن هنا تستخدم showNotification لو عايز تعرض رسالة خطأ
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [db]); // الـ dependency array فيه db عشان نضمن إنه موجود قبل ما الكود يشتغل

    // ده اللي هيظهر لو الداتا لسه بتحمل
    const renderLoading = () => (
        <div id="leaderboard-list" className="flex-grow overflow-y-auto p-4 bg-blue-100/80 rounded-lg">
            <p className="text-center">يتم التحميل...</p>
        </div>
    );

    // ده اللي هيظهر لو التحميل خلص
    const renderLeaderboard = () => (
        <div id="leaderboard-list" className="flex-grow overflow-y-auto p-4 bg-blue-100/80 rounded-lg">
            {leaderboard.length === 0 ? (
                <p className="text-center text-gray-500">لا يوجد لاعبون في القائمة بعد.</p>
            ) : (
                leaderboard.map((user, index) => {
                    const rank = index + 1;
                    const rankMedal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
                    return (
                        <div key={user.uid} className="flex items-center bg-white p-3 rounded-lg mb-2 shadow-sm">
                            <span className="font-bold text-2xl w-12 text-center">{rankMedal}</span>
                            <div className={`avatar-wrapper ${user.equippedFrame || ''} mx-4`}>
                               <img src={user.photoURL} className="w-12 h-12 rounded-full" alt={`${user.displayName}'s avatar`} />
                            </div>
                            <p className="flex-grow font-bold text-lg text-gray-800">{user.displayName}</p>
                            <p className="font-bold text-xl text-blue-600">{user.stats.totalScore || 0} نقطة</p>
                        </div>
                    );
                })
            )}
        </div>
    );

    return (
        <div id="leaderboard-screen" className="screen active w-full h-full flex-col p-4 md:p-6 main-container">
            <header className="flex justify-between items-center mb-4">
                <button onClick={() => showScreen('mainMenu')} className="btn btn-secondary">القائمة الرئيسية</button>
                <h2 className="font-brand text-4xl text-center text-blue-800">قائمة المتصدرين</h2>
                <div className="w-40"></div>
            </header>
            
            {loading ? renderLoading() : renderLeaderboard()}
        </div>
    );
}