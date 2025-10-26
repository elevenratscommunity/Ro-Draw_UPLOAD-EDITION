import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';

export default function HomeScreen() {
    const { loginGuest, loginGoogle } = useAuth();
    const { showModal, showNotification } = useUI();
    const [nickname, setNickname] = useState('');
    const [avatarSeed, setAvatarSeed] = useState(1);

    const handleLoginGuest = () => {
        loginGuest(nickname);
    };

    const handleLoginDummy = () => {
        showNotification('هذه الميزة غير متوفرة حالياً', false);
    };

    const changeGuestAvatar = () => {
        setAvatarSeed(Math.floor(1 + Math.random() * 1000));
    };

    return (
        <div id="home-screen" className="screen active w-full h-full flex-col items-center justify-center text-center p-4">
            <header className="absolute top-4 left-4 right-4 flex justify-between items-center">
                <div className="flex gap-2">
                    <button onClick={() => showModal('updates')} className="btn btn-secondary text-sm py-1 px-3">آخر التحديثات</button>
                    <button onClick={() => showModal('info')} className="btn btn-secondary text-sm py-1 px-3">معلومات</button>
                </div>
            </header>
            <h1 className="font-brand text-7xl md:text-8xl text-white" style={{textShadow: '3px 3px 0 #1E3A8A'}}>Ro-Drew.io</h1>
            <p className="text-2xl font-bold text-yellow-300 -mt-2" style={{textShadow: '2px 2px 0 #1E3A8A'}}>ارسم، خمّن، فُز</p>
            
            <div className="main-container w-full max-w-3xl p-6 mt-6 grid md:grid-cols-2 gap-6 items-center">
                {/* Guest Login */}
                <div className="flex flex-col items-center">
                    <h2 className="font-bold text-xl mb-4">لعب سريع</h2>
                    <div className="relative w-24 h-24 mb-4">
                        <img 
                            id="guest-avatar" 
                            src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${avatarSeed}`} 
                            className="w-full h-full rounded-full border-4 border-gray-200" 
                            alt="avatar"
                        />
                        <button onClick={changeGuestAvatar} className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-1.5 hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300" title="تغيير الصورة الرمزية">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/></svg>
                        </button>
                    </div>
                    <input 
                        type="text" 
                        id="nickname-input" 
                        placeholder="أدخل اسمك المستعار..." 
                        maxLength="20" 
                        className="w-full text-center input-field"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                    />
                    <button onClick={handleLoginGuest} className="btn btn-play w-full py-3 mt-4 text-xl">العب!</button>
                </div>

                {/* Provider Login */}
                <div className="flex flex-col items-center border-t-2 md:border-t-0 md:border-r-2 border-gray-200 pt-6 md:pt-0 md:pr-6">
                     <h2 className="font-bold text-xl mb-4">سجل الدخول</h2>
                     <p className="text-gray-600 text-center mb-4">للوصول إلى مزايا حصرية والاحتفاظ بإحصائياتك.</p>
                     <div className="w-full space-y-3">
                        <div className="relative">
                            <button onClick={loginGoogle} className="btn btn-secondary w-full">
                                <span className="flex items-center justify-center">
                                    <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
                                    <span>Google</span>
                                </span>
                            </button>
                            <div className="gift-badge">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                <span>هدية!</span>
                            </div>
                        </div>
                        <button onClick={handleLoginDummy} className="btn btn-twitter w-full">Twitter</button>
                        <button onClick={handleLoginDummy} className="btn btn-discord w-full">Discord</button>
                     </div>
                </div>
            </div>
        </div>
    );
}