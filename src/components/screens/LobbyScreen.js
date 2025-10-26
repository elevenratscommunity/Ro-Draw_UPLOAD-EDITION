import React, { useState, useEffect } from 'react';
import { useFirebase } from '../../contexts/FirebaseContext';
import { useGame } from '../../contexts/GameContext'; // <-- العقل بتاعنا

// أيقونات الغرف (من الكود القديم)
const themeIcons = {
    'عام': '🌍',
    'حيوانات': '🐾',
    'طعام': '🍔',
    'أفلام وشخصيات': '🎬',
    'أماكن ومعالم': '🏛️',
    'أفعال وأنشطة': '🏃‍♂️'
};

export default function LobbyScreen({ showScreen }) {
    const { db } = useFirebase();
    const { handleJoinRoomClick } = useGame(); // <-- الدالة السحرية للانضمام
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);

    // useEffect ده بيراقب الغرف المتاحة
    useEffect(() => {
        const q = db.collection("rooms").where("status", "in", ["waiting", "playing"]).limit(50);
        
        const unsubscribe = q.onSnapshot((snapshot) => {
            const visibleRooms = [];
            snapshot.forEach(doc => {
                if (doc.data().privacy !== 'private') {
                    visibleRooms.push({ id: doc.id, ...doc.data() });
                }
            });
            setRooms(visibleRooms);
            setLoading(false);
        }, (error) => {
            console.error("Error listening for rooms:", error);
            setLoading(false);
        });

        // دالة التنضيف: بتقفل المراقبة لما نطلع من الشاشة
        return () => unsubscribe();
    }, [db]);

    // دالة رسم كروت الغرف (النسخة المحدثة)
    const renderRoomList = () => {
        if (loading) {
            return <p className="col-span-full text-center text-gray-500 text-xl mt-8">جاري تحميل الغرف...</p>;
        }
        if (rooms.length === 0) {
            return <p className="col-span-full text-center text-gray-500 text-xl mt-8">لا توجد غرف متاحة. قم بإنشاء واحدة!</p>;
        }

        return rooms.map(room => {
            const isPasswordProtected = room.privacy === 'password';
            const isPlaying = room.status === 'playing';

            // الأزرار بقت بتستخدم الـ classes الجديدة
            const buttonsHTML = isPlaying ? (
                <div className="flex gap-2">
                    <button 
                        onClick={() => handleJoinRoomClick(room.id, room.privacy, false, true)} 
                        className="btn-lobby btn-lobby-queue" // <-- تعديل
                    >
                        انتظار
                    </button>
                    <button 
                        onClick={() => handleJoinRoomClick(room.id, room.privacy, true, false)} 
                        className="btn-lobby btn-lobby-spectate" // <-- تعديل
                    >
                        مشاهدة
                    </button>
                </div>
            ) : (
                <button 
                    onClick={() => handleJoinRoomClick(room.id, room.privacy, false, false)} 
                    className="btn-lobby btn-lobby-join" // <-- تعديل
                >
                    انضم
                </button>
            );

            return (
                <div key={room.id} className={`room-card ${isPlaying ? 'playing' : 'waiting'}`}>
                    <div>
                        <div className="flex justify-between items-start">
                            <h3 className="font-bold text-xl text-blue-800 truncate pr-2">{room.name}</h3>
                             <div className="flex items-center gap-2 flex-shrink-0">
                                {isPasswordProtected && <span className="text-yellow-500 text-xl" title="محمية بكلمة مرور">🔒</span>}
                                {isPlaying && <span className="text-white bg-red-500 text-xs font-bold px-2 py-1 rounded-full animate-pulse">تلعب الآن</span>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 mt-1">
                            <span className="text-2xl">{themeIcons[room.theme] || '❓'}</span>
                            <span>{room.theme}</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                        <span className="text-gray-500 font-bold">{room.playerCount||0} / {room.maxPlayers} لاعب</span>
                        {buttonsHTML}
                    </div>
                </div>
            );
        });
    };
    return (
        <div id="lobby-screen" className="screen active w-full h-full flex-col p-4 md:p-6 main-container">
            <header className="flex justify-between items-center mb-4">
                <button onClick={() => showScreen('mainMenu')} className="btn btn-secondary">القائمة الرئيسية</button>
                <h2 className="font-brand text-4xl text-center text-blue-800">الغرف المتاحة</h2>
                {/* هنغير الزرار ده عشان يودي لشاشة إنشاء غرفة */}
                <button onClick={() => showScreen('createRoom')} className="btn btn-play w-40">إنشاء غرفة</button>
            </header>
            
            <div id="rooms-list" className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto p-4 bg-blue-100/80 rounded-lg">
                {renderRoomList()}
            </div>
            
            <footer className="mt-4 flex justify-center">
                <button onClick={() => showScreen('createRoom')} className="btn btn-play text-xl">إنشاء غرفة جديدة</button>
            </footer>
        </div>
    );
}