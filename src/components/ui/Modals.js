import React, { useState, useEffect } from 'react';
import { useUI } from '../../contexts/UIContext';
import { useGame } from '../../contexts/GameContext';
import { useAuth } from '../../contexts/AuthContext';
import { useFirebase } from '../../contexts/FirebaseContext'; // Import useFirebase

export default function Modals() {
    // --- FIX: Ensure showNotification is destructured ---
    const { activeModal, closeModal, modalData, playSound, showModal, showNotification } = useUI();
    // --- END FIX ---
    const { currentUser } = useAuth();
    const game = useGame(); // Optional chaining not needed if Modals is always inside GameProvider
    const { db } = useFirebase(); // Destructure db from useFirebase

    const [codeInput, setCodeInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');

    // Timers
    const [wordChoiceTime, setWordChoiceTime] = useState(10);
    const [scoreboardTime, setScoreboardTime] = useState(8);

    // Game Logic Handling
    const roomData = game?.roomData;
    const isDrawer = roomData?.gameState?.drawerUid === currentUser?.uid;

    // Effect for Word Choice Modal
    useEffect(() => {
        if (showModal && game && roomData && isDrawer && roomData.gameState?.wordsToChoose?.length > 0 && activeModal !== 'wordChoice' && roomData.status === 'playing') {
             console.log("Opening Word Choice Modal");
            playSound('roundStart', 'C6');
            setWordChoiceTime(10);
            showModal('wordChoice');
        } else if (activeModal === 'wordChoice' && (!isDrawer || roomData?.gameState?.wordsToChoose?.length === 0 || roomData?.status !== 'playing')) {
            console.log("Closing Word Choice Modal due to state change");
            closeModal();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game, roomData?.gameState?.wordsToChoose, roomData?.status, isDrawer, activeModal, playSound, showModal, closeModal]); // Refined dependencies

    // Word Choice Timer
    useEffect(() => {
        if (activeModal !== 'wordChoice') return;
        let intervalId = null;
        intervalId = setInterval(() => {
            setWordChoiceTime(prev => {
                if (prev <= 1) { clearInterval(intervalId); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => { if (intervalId) clearInterval(intervalId); };
    }, [activeModal]);

    // Effect for Scoreboard Modal
    useEffect(() => {
        if (showModal && game && roomData?.gameState?.showingScoreboard && activeModal !== 'scoreboard') {
             console.log("Opening Scoreboard Modal");
            setScoreboardTime(8);
            showModal('scoreboard');
        } else if (activeModal === 'scoreboard' && !roomData?.gameState?.showingScoreboard) {
            console.log("Closing Scoreboard Modal due to state change");
            closeModal();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game, roomData?.gameState?.showingScoreboard, activeModal, showModal, closeModal]); // Refined dependencies

    // Scoreboard Timer
    useEffect(() => {
        if (activeModal !== 'scoreboard') return;
        let intervalId = null;
        intervalId = setInterval(() => {
            setScoreboardTime(prev => {
                if (prev <= 1) { clearInterval(intervalId); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => { if (intervalId) clearInterval(intervalId); };
    }, [activeModal]);

    // --- Handlers ---
    const handleSubmitCode = async () => { // Made async
        if (!codeInput || !game || !db) return;
        const potentialRoomId = codeInput.trim().toUpperCase(); // Normalize input
        setCodeInput('');
        closeModal();

        try {
            const roomRef = db.collection("rooms").doc(potentialRoomId);
            const roomDoc = await roomRef.get();

            if (roomDoc.exists) {
                const room = roomDoc.data();
                // Use handleJoinRoomClick to correctly handle password or public rooms
                console.log(`Joining room ${potentialRoomId} with privacy ${room.privacy}`);
                game.handleJoinRoomClick(potentialRoomId, room.privacy);
            } else {
                 console.log(`Room code ${potentialRoomId} not found.`);
                if (showNotification) showNotification("الغرفة غير موجودة أو الكود غير صحيح.", false); // Check if showNotification exists
            }
        } catch (error) {
            console.error("Error fetching room by code:", error);
             if (showNotification) showNotification("حدث خطأ أثناء البحث عن الغرفة.", false);
        }
    };


    const handleSubmitPassword = () => {
        if (game && modalData && typeof modalData.onPasswordSubmit === 'function') {
            modalData.onPasswordSubmit(passwordInput);
            setPasswordInput('');
        } else console.error("Password submit handler not found in modalData");
    };

    const handleChooseWord = (word) => { if (game) game.chooseWord(word); };

    const handleCloseModal = () => {
        setCodeInput('');
        setPasswordInput('');
        // Maybe clear tempRoomId in GameContext if password modal is closed manually?
        if (activeModal === 'passwordEntry' && game?.setTempRoomId) {
             // game.setTempRoomId(null); // Requires exposing setTempRoomId from context
        }
        closeModal();
    };

    // --- Render Functions ---
    const renderScoreboard = () => {
        if (!roomData?.gameState?.scoreboardData) return null;
        const { reason, word, players } = roomData.gameState.scoreboardData;
        let title = `انتهت الجولة! الكلمة كانت: ${word || '???'}`; // Default word
        if (roomData.status === 'ended' && roomData.gameState?.winner) title = `الفائز هو ${roomData.gameState.winner.displayName}! 🏆`;
        const sortedPlayers = players ? [...players].sort((a,b) => (b.score || 0) - (a.score || 0)) : [];

        return (
            <div className="main-container w-full max-w-lg p-6 relative">
                 <button onClick={handleCloseModal} className="absolute top-2 left-3 text-2xl font-bold">&times;</button>
                 <h2 id="scoreboard-title" className="font-brand text-3xl text-center mb-4 text-blue-800">{title}</h2>
                 <div id="scoreboard-body" className="space-y-2 max-h-80 overflow-y-auto"> { /* Scoreboard content */ }
                    {sortedPlayers.map(p => ( <div key={p.uid} className="flex items-center justify-between p-2 bg-white rounded-lg"><div className="flex items-center gap-3"><div className={`avatar-wrapper ${p.equippedFrame || ''}`}><img src={p.photoURL} className="w-10 h-10 rounded-full" alt={`${p.displayName}'s avatar`}/></div><span className="font-bold">{p.displayName}</span></div><div className="flex items-center gap-4"><span className="font-bold text-green-500 text-lg">+{p.roundScore || 0}</span><span className="font-bold text-blue-800 text-xl">{p.score || 0}</span></div></div> ))}
                 </div>
                 <div id="scoreboard-timer" className="text-center font-bold text-xl mt-4 text-gray-600">{roomData.status !== 'ended' ? `الجولة التالية في ${scoreboardTime}...` : 'اللعبة انتهت!'}</div>
            </div>
        );
    };

    // Main return
    return (
        <>
            {/* Updates Modal */}
            <div id="updates-modal" className={`modal ${activeModal === 'updates' ? 'active' : ''}`}> <div className="main-container w-full max-w-lg p-6 relative"><button onClick={handleCloseModal} className="absolute top-2 left-3 text-2xl font-bold">&times;</button><h2 className="font-brand text-3xl text-center mb-4">آخر التحديثات</h2><p className="text-center">تحديث كبير! تم إضافة خلفيات جديدة للعبة، إطارات متحركة ومميزة، وأدوات رسم جديدة يمكنك شراؤها من المتجر!</p></div></div>
            {/* Info Modal */}
            <div id="info-modal" className={`modal ${activeModal === 'info' ? 'active' : ''}`}> <div className="main-container w-full max-w-lg p-6 relative"><button onClick={handleCloseModal} className="absolute top-2 left-3 text-2xl font-bold">&times;</button><h2 className="font-brand text-3xl text-center mb-4">معلومات عنا</h2><p className="text-center">هذه اللعبة هي نسخة مستوحاة من لعبة Gartic الشهيرة، تم تطويرها لأغراض تعليمية وتطبيقية باستخدام React, Firebase, و Tailwind CSS.</p></div></div>
            {/* Code Entry Modal (Uses new handler) */}
            <div id="code-entry-modal" className={`modal ${activeModal === 'codeEntry' ? 'active' : ''}`}> <div className="main-container w-full max-w-md p-6 relative" style={{borderWidth: '6px'}}><button onClick={handleCloseModal} className="absolute top-2 left-3 text-2xl font-bold">&times;</button><h2 className="font-brand text-3xl text-center mb-4 text-blue-800">الانضمام بكود</h2><input type="text" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} placeholder="أدخل كود الغرفة..." className="w-full text-center tracking-widest text-xl p-3 input-field mb-4 uppercase" maxLength="5"/> {/* Added uppercase and maxLength */} <button onClick={handleSubmitCode} className="btn btn-play text-xl w-full">انضم</button></div></div>
            {/* Password Entry Modal */}
            <div id="password-entry-modal" className={`modal ${activeModal === 'passwordEntry' ? 'active' : ''}`}> <div className="main-container w-full max-w-md p-6 relative" style={{borderWidth: '6px'}}><button onClick={handleCloseModal} className="absolute top-2 left-3 text-2xl font-bold">&times;</button><h2 className="font-brand text-3xl text-center mb-4 text-blue-800">غرفة محمية بكلمة مرور</h2><input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="أدخل كلمة المرور..." className="w-full text-center text-xl p-3 input-field mb-4"/> <button onClick={handleSubmitPassword} className="btn btn-play text-xl w-full">دخول</button></div></div>
            {/* Word Choice Modal */}
            <div id="word-choice-modal" className={`modal ${activeModal === 'wordChoice' ? 'active' : ''}`}> <div className="main-container w-full max-w-md p-8 text-center"><h2 className="font-brand text-3xl text-center mb-4 text-blue-800">اختر كلمة لترسمها</h2><div id="word-options" className="flex justify-center gap-4">{roomData?.gameState?.wordsToChoose?.map(word => ( <button key={word} onClick={() => handleChooseWord(word)} className="btn btn-play">{word}</button> )) }</div><div id="word-choice-timer" className="font-bold text-2xl text-red-500 my-3">{wordChoiceTime}</div><p className="text-gray-500 mt-2">سيتم تخطي دورك تلقائيًا.</p></div></div>
            {/* Scoreboard Modal */}
            <div id="scoreboard-modal" className={`modal ${activeModal === 'scoreboard' ? 'active' : ''}`}> {renderScoreboard()} </div>
        </>
    );
}