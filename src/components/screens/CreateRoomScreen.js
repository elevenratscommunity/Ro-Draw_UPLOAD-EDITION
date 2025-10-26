import React, { useState } from 'react';
import { useGame } from '../../contexts/GameContext';
import { WORD_LISTS } from '../../data/constants';

export default function CreateRoomScreen({ showScreen }) {
    const { createRoom } = useGame();
    
    // State لإدارة الفورم
    const [name, setName] = useState('');
    const [theme, setTheme] = useState('عام');
    const [roundTime, setRoundTime] = useState(80);
    const [maxScore, setMaxScore] = useState(150);
    const [maxPlayers, setMaxPlayers] = useState(8);
    const [privacy, setPrivacy] = useState('public');
    const [password, setPassword] = useState('');

    const handleConfirmCreate = () => {
        createRoom({
            name, theme, roundTime, maxScore, maxPlayers, privacy, password
        });
        // مش محتاجين نعمل showScreen('game') هنا، لأن دالة createRoom هتعمل joinRoom وهي اللي هتنقلنا
    };

    return (
        <div id="create-room-screen" className="screen active w-full h-full flex-col items-center justify-center p-4">
            <div className="main-container w-full max-w-lg p-8 relative">
                <button onClick={() => showScreen('lobby')} className="btn btn-secondary absolute top-4 left-4">رجوع</button>
                <h2 className="font-brand text-4xl text-center mb-6 text-blue-800">إنشاء غرفة جديدة</h2>
                <div className="space-y-4">
                    <div>
                        <label className="font-bold">اسم الغرفة</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full input-field mt-1" placeholder="غرفة الأصدقاء..."/>
                    </div>
                    <div>
                        <label className="font-bold">موضوع الرسم</label>
                        <select value={theme} onChange={(e) => setTheme(e.target.value)} className="w-full input-field mt-1">
                            {Object.keys(WORD_LISTS).map(themeName => (
                                <option key={themeName} value={themeName}>{themeName}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="font-bold">مدة الجولة (بالثواني)</label>
                        <select value={roundTime} onChange={(e) => setRoundTime(parseInt(e.target.value, 10))} className="w-full input-field mt-1">
                            <option value="60">60</option>
                            <option value="80">80</option>
                            <option value="100">100</option>
                        </select>
                    </div>
                    <div>
                        <label className="font-bold">النقاط المطلوبة للفوز</label>
                        <select value={maxScore} onChange={(e) => setMaxScore(parseInt(e.target.value, 10))} className="w-full input-field mt-1">
                            <option value="120">120</option>
                            <option value="150">150</option>
                            <option value="200">200</option>
                        </select>
                    </div>
                    <div>
                        <label className="font-bold">عدد اللاعبين</label>
                        <select value={maxPlayers} onChange={(e) => setMaxPlayers(parseInt(e.target.value, 10))} className="w-full input-field mt-1">
                            <option value="4">4</option>
                            <option value="6">6</option>
                            <option value="8">8</option>
                            <option value="10">10</option>
                        </select>
                    </div>
                    <div>
                        <label className="font-bold">خصوصية الغرفة</label>
                        <select value={privacy} onChange={(e) => setPrivacy(e.target.value)} className="w-full input-field mt-1">
                            <option value="public">عامة</option>
                            <option value="password">بكلمة مرور</option>
                            <option value="private">خاصة</option>
                        </select>
                    </div>
                    
                    {/* إظهار خانة الباسورد لو الغرفة محمية */}
                    {privacy === 'password' && (
                        <div id="password-container">
                            <label className="font-bold">كلمة المرور</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full input-field mt-1"/>
                        </div>
                    )}

                    <button onClick={handleConfirmCreate} className="btn btn-play w-full py-3 text-xl mt-4">إنشاء الغرفة</button>
                </div>
            </div>
        </div>
    );
}