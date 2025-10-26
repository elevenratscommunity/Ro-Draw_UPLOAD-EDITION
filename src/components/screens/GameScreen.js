import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useAuth } from '../../contexts/AuthContext';
import { useFirebase } from '../../contexts/FirebaseContext'; // Needed for GameTimer's db access
import { useUI } from '../../contexts/UIContext';
import PlayerList from '../game/PlayerList';
import Chat from '../game/Chat';
import Canvas from '../game/Canvas';
import Toolbar from '../game/Toolbar';

// Word Display Component
const WordDisplay = () => {
    const { roomData } = useGame();
    const { currentUser } = useAuth();

    if (!roomData?.gameState) return "انتظار بدء اللعبة..."; // Simplified check

    const { gameState } = roomData;
    const isDrawer = gameState.drawerUid === currentUser?.uid;

    // Word choice phase
    if (gameState.wordsToChoose?.length > 0) {
        return isDrawer ? "اختر كلمة لترسمها..." : `${gameState.drawerName || 'الرسام'} يختار كلمة...`;
    }
    // Drawing phase
    if (gameState.currentWord) {
        if (isDrawer) return gameState.currentWord;
        // Display underscores for non-drawers
        return gameState.currentWord.split('').map(char => (char === ' ' ? '\u00A0\u00A0' : '_ ')).join(''); // Use non-breaking space for spaces
    }
    // Waiting phase (or between rounds)
    return "انتظار بدء اللعبة...";
};

// Game Timer Component (Corrected Version)
// دي الدالة اللي بتعرض التايمر (النسخة المُصلحة للمرة التالتة)
const GameTimer = () => {
    const { roomData, endRound, currentRoomId } = useGame();
    const { currentUser } = useAuth();
    const { db } = useFirebase();
    const [timeLeft, setTimeLeft] = useState("--:--");
    const timerIntervalRef = useRef(null);
    const roundEndTimeoutRef = useRef(null);

    // --- Logging State ---
    const [logCounter, setLogCounter] = useState(0); // To limit logs

    const roundStartTimeStamp = roomData?.gameState?.roundStartTime;
    const roundDurationSeconds = roomData?.settings?.roundTime || 80;
    const isHost = roomData?.host === currentUser?.uid;
    const currentRound = roomData?.gameState?.round;
    const isShowingScoreboard = roomData?.gameState?.showingScoreboard; // Track scoreboard state

    useEffect(() => {
        // Cleanup previous timers on re-render
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (roundEndTimeoutRef.current) clearTimeout(roundEndTimeoutRef.current);
        timerIntervalRef.current = null;
        roundEndTimeoutRef.current = null;

        // Reset display if showing scoreboard or no valid start time
        if (isShowingScoreboard || !roundStartTimeStamp || typeof roundStartTimeStamp.toMillis !== 'function') {
            setTimeLeft("--:--");
             // Reset log counter when round effectively ends or hasn't started
             setLogCounter(0);
            return;
        }

        const startTimeMs = roundStartTimeStamp.toMillis();
        const endTimeMs = startTimeMs + roundDurationSeconds * 1000;
        const nowMsInitial = Date.now();
        const initialRemainingMs = endTimeMs - nowMsInitial;

        // Log initial calculation details (limit logs)
        if (logCounter < 3) { // Log only first few times per round start
             console.log(`[Round ${currentRound}] Timer Init: Start=${startTimeMs}, End=${endTimeMs}, Now=${nowMsInitial}, Remaining=${initialRemainingMs}ms, Duration=${roundDurationSeconds}s`);
             setLogCounter(prev => prev + 1);
        }

        // --- Timer Update Logic ---
        const updateDisplay = () => {
            const nowMs = Date.now();
            const remainingSeconds = Math.max(0, Math.ceil((endTimeMs - nowMs) / 1000));
            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;
            setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);

            if (remainingSeconds <= 0 && timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
                 console.log(`[Round ${currentRound}] Display timer interval cleared (time reached 0).`);
            }
        };

        // Check if time is already up *before* starting interval
        if (initialRemainingMs <= 0) {
            setTimeLeft("0:00");
             console.warn(`[Round ${currentRound}] Timer init found time already expired (${initialRemainingMs}ms).`);
             // If host, trigger endRound immediately if appropriate
             if (isHost && currentRoomId && roomData?.status === 'playing' && !isShowingScoreboard) {
                  console.log(`Host (${currentUser?.uid}): Ending round immediately as time was already up.`);
                  // Use a microtask to avoid potential state update loops
                  queueMicrotask(() => endRound('الوقت انتهى!'));
             }
            return; // Don't start interval if time is already up
        }

        // Start interval timer if time remaining > 0
        updateDisplay(); // Initial display
        timerIntervalRef.current = setInterval(updateDisplay, 250);

        // --- Host End Round Timeout ---
        if (isHost && currentRoomId) {
            // Calculate delay accurately based on initial remaining time
            const hostTimeoutDelay = initialRemainingMs + 500; // Add buffer

            console.log(`Host (${currentUser?.uid}): Setting endRound timeout for round ${currentRound} in ${hostTimeoutDelay}ms`);

            roundEndTimeoutRef.current = setTimeout(() => {
                console.log(`Host (${currentUser?.uid}): EndRound timeout FIRED for round ${currentRound}. Checking state...`);
                // Double-check state inside timeout
                db.collection("rooms").doc(currentRoomId).get().then(doc => {
                    if (doc.exists) {
                        const latestData = doc.data();
                        // Check: Is it still the same round? Did start time match? Is scoreboard NOT showing? Is game playing?
                        if (latestData?.gameState?.round === currentRound &&
                            latestData?.gameState?.roundStartTime?.toMillis() === startTimeMs &&
                            !latestData?.gameState?.showingScoreboard &&
                            latestData?.status === 'playing')
                        {
                            console.log(`Host (${currentUser?.uid}): Conditions met. Calling endRound.`);
                            endRound('الوقت انتهى!');
                        } else {
                             console.log(`Host (${currentUser?.uid}): Conditions NOT met. Won't call endRound. Current State: Round=${latestData?.gameState?.round}, Start=${latestData?.gameState?.roundStartTime?.toMillis()}, Scoreboard=${latestData?.gameState?.showingScoreboard}, Status=${latestData?.status}`);
                        }
                    } else {
                         console.log(`Host (${currentUser?.uid}): Room ${currentRoomId} not found in timeout check.`);
                    }
                }).catch(err => console.error("Error checking room state in timer:", err));
             }, hostTimeoutDelay); // Use calculated delay
        }

        // --- Cleanup ---
        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                 // console.log(`[Round ${currentRound}] Display timer interval cleaned up.`);
                timerIntervalRef.current = null;
            }
            if (roundEndTimeoutRef.current) {
                clearTimeout(roundEndTimeoutRef.current);
                 // console.log(`Host (${currentUser?.uid}): EndRound timeout cleaned up for round ${currentRound}.`);
                roundEndTimeoutRef.current = null;
            }
        };
    // Dependencies: Re-run when these core properties change.
    // Use toMillis() for timestamp comparison reliability.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roundStartTimeStamp?.toMillis(), roundDurationSeconds, isHost, currentRoomId, db, currentRound, isShowingScoreboard]); // Added isShowingScoreboard

    return <div id="game-timer" className="w-16 text-center tabular-nums">{timeLeft}</div>;
};

// --- GameScreen Main Component ---
export default function GameScreen() {
    const { currentRoomId, roomData, playerRole, leaveRoom, handleStartGame, players } = useGame(); // Added players
    const { currentUser } = useAuth();
    const { showNotification } = useUI();

    // Toolbar state
    const [tool, setTool] = useState('brush');
    const [color, setColor] = useState('#000000');
    const [size, setSize] = useState(5);

    // Canvas action refs
    const undoRef = useRef(() => {});
    const redoRef = useRef(() => {});
    const clearRef = useRef(() => {});

     // Clear drawing actions state when room data changes (e.g., new round starts)
     // This prevents actions from a previous round bleeding into the canvas state briefly
     useEffect(() => {
        // Potentially clear drawingActions state here if needed,
        // but Canvas component handles redraw based on history, which should be cleared by startNewRound
     }, [roomData?.gameState?.round]); // Trigger on round change

    // Loading state
    if (!roomData || !currentUser || !players) { // Added players check
        // Check if we have a room ID but no data yet
        if (currentRoomId && !roomData) {
             return (
                 <div className="screen active justify-center items-center">
                     <h1 className="font-brand text-5xl text-white">جاري الانضمام للغرفة...</h1>
                     {/* Optional: Add a cancel/leave button here? */}
                 </div>
             );
        }
         // Fallback loading or redirect if something is wrong
         console.warn("GameScreen rendered without sufficient data:", { roomData, currentUser, players, currentRoomId });
        return (
            <div className="screen active justify-center items-center">
                <h1 className="font-brand text-5xl text-white">جاري التحميل...</h1>
            </div>
        );
    }

    // Derived states
    const { gameState, status } = roomData;
    const isHost = roomData.host === currentUser.uid;
    const isDrawer = gameState?.drawerUid === currentUser.uid; // Optional chaining
    const isSpectator = playerRole !== null && playerRole !== 'player'; // Correct spectator check

    // Copy room code function
    const copyRoomCode = () => {
        if (!currentRoomId) return;
        navigator.clipboard.writeText(currentRoomId)
          .then(() => showNotification('تم نسخ كود الغرفة بنجاح!', true))
          .catch(() => showNotification('فشل نسخ الكود', false));
    };

    // Render logic
    return (
        <div id="game-screen" className="screen active w-full h-full p-2 lg:p-4 gap-4 relative">
             <div className="game-ui-container w-full h-full p-2 flex flex-col md:flex-row gap-2">
                {/* --- Column 1: Player List & Chat --- */}
                <div className="w-full md:w-1/4 flex flex-col gap-2 min-h-0"> {/* Added min-h-0 for flex control */}
                    <PlayerList />
                    <Chat /> {/* Renders both chat and guess boxes */}
                </div>

                {/* --- Column 2: Canvas & Info --- */}
                <div className="flex-grow flex flex-col gap-2 relative min-h-0"> {/* Added min-h-0 */}
                    {/* Top Bar */}
                    <div id="game-top-bar" className="game-module p-2 flex justify-between items-center text-xl font-bold text-blue-800 relative shrink-0"> {/* Added shrink-0 */}
                        <div className="absolute top-1/2 -translate-y-1/2 left-2 flex gap-2 z-10">
                             <button onClick={leaveRoom} className="btn btn-secondary text-sm px-3 py-1">الخروج</button>
                             <button onClick={copyRoomCode} className="btn btn-secondary text-sm px-3 py-1">نسخ الكود</button>
                        </div>
                        <GameTimer />
                        <div id="word-display" className="flex-grow text-center tracking-widest px-2 truncate"> {/* Added padding and truncate */}
                            <WordDisplay />
                        </div>
                        <div className="w-16 text-center shrink-0" id="round-counter">الجولة {gameState?.round || 0}</div> {/* Optional chaining */}
                    </div>

                    {/* Canvas - ensure it grows */}
                    <Canvas
                        tool={tool} color={color} size={size}
                        onUndo={undoRef} onRedo={redoRef} onClear={clearRef}
                        onColorChange={setColor}
                    />

                    {/* Spectator Banner */}
                    {isSpectator && (
                        // Position relative to the parent flex container (Column 2)
                        <div className="absolute top-[60px] left-0 right-0 p-3 bg-gradient-to-b from-black/70 to-transparent text-center text-white font-bold text-xl rounded-t-md pointer-events-none z-10"> {/* Adjusted top */}
                            <span id="spectator-main-text">👀 أنت تشاهد فقط</span>
                            {playerRole === 'waiting' && <span id="spectator-sub-text" className="block text-sm font-normal mt-1">ستنضم في الجولة القادمة!</span>}
                        </div>
                    )}

                    {/* Start Game Button */}
                     {/* Position relative to the parent flex container (Column 2) */}
                    <div className="absolute top-[68px] right-2 z-10"> {/* Adjusted top */}
                        {isHost && status === 'waiting' && players.filter(p=>p.role === 'player').length >= 2 && (
                            <button onClick={handleStartGame} className="btn btn-play text-xs px-2 py-1">ابدأ اللعبة</button>
                        )}
                    </div>

                </div> {/* End Column 2 */}

                {/* --- Column 3: Toolbar --- */}
                <div className={`transition-opacity shrink-0 ${(!isDrawer || isSpectator) ? 'opacity-50 pointer-events-none' : ''}`}> {/* Added shrink-0 */}
                    <Toolbar
                        currentTool={tool} onToolChange={setTool}
                        currentColor={color} onColorChange={setColor}
                        currentSize={size} onSizeChange={setSize}
                        onUndo={() => undoRef.current()}
                        onRedo={() => redoRef.current()}
                        onClear={() => clearRef.current()}
                    />
                </div>
            </div> {/* End game-ui-container */}
        </div> // End game-screen
    );
}