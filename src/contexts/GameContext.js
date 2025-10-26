import React, { createContext, useContext, useState, useEffect, useRef } from 'react'; // Removed useCallback as it wasn't strictly needed here
import { useFirebase } from './FirebaseContext';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';
import { WORD_LISTS } from '../data/constants';

const GameContext = createContext(null);
export const useGame = () => useContext(GameContext);

// --- Listener Hook ---
function useGameListeners(db, roomId, setRoomData, setPlayers, setMessages, setDrawingActions) {
    useEffect(() => {
        if (!roomId) return;
        const listeners = [];
        // Room Data Listener
        const roomRef = db.collection("rooms").doc(roomId);
        listeners.push(roomRef.onSnapshot(doc => setRoomData(doc.exists ? doc.data() : null),
          err => { console.error("Room listener error:", err); setRoomData(null); }
        ));
        // Players Listener
        const playersQuery = roomRef.collection("players").orderBy("score", "desc");
        listeners.push(playersQuery.onSnapshot(snap => setPlayers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
          err => { console.error("Players listener error:", err); setPlayers([]); }
        ));
        // Messages Listener
        const messagesQuery = roomRef.collection("messages").orderBy("timestamp", "desc").limit(50);
        listeners.push(messagesQuery.onSnapshot(snap => setMessages(snap.docs.map(doc => doc.data()).reverse()),
          err => { console.error("Messages listener error:", err); setMessages([]); }
        ));
        // Drawing Listener
        const drawingQuery = roomRef.collection("drawing");
        listeners.push(drawingQuery.onSnapshot(snap => {
            const actions = [];
            snap.docChanges().forEach(change => { if (change.type === "added") actions.push(change.doc.data()); });
            if (actions.length > 0) setDrawingActions(prev => [...prev, ...actions]);
        }, err => console.error("Drawing listener error:", err)));
        // Drawing Sync Listener (Undo/Redo)
        const drawingSyncRef = roomRef.collection("drawing_sync").doc("latest");
        listeners.push(drawingSyncRef.onSnapshot(doc => {
            if (doc.exists) setDrawingActions([{ type: 'redraw', history: doc.data().history, uid: doc.data().uid }]);
        }, err => console.error("Drawing sync listener error:", err)));
        // Cleanup
        return () => listeners.forEach(unsub => unsub());
    }, [roomId, db, setRoomData, setPlayers, setMessages, setDrawingActions]);
}

// دالة إنشاء كود عشوائي (حروف كبيرة وأرقام)
function generateRoomCode(length = 5) {
    const characters = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; // شيلنا حروف شبه بعض زي O و 0
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// --- Game Provider Component ---
export const GameProvider = ({ children }) => {
    const { db, firebase } = useFirebase();
    const { currentUser } = useAuth();
    const { showNotification, showModal, closeModal, playSound } = useUI();

    // States
    const [currentRoomId, setCurrentRoomId] = useState(null);
    const [playerRole, setPlayerRole] = useState(null);
    const [tempRoomId, setTempRoomId] = useState(null); // For password modal context
    const [roomData, setRoomData] = useState(null);
    const [players, setPlayers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [drawingActions, setDrawingActions] = useState([]);
    const [isCreatingRoom, setIsCreatingRoom] = useState(false); // Prevent double creation

    // Activate Listeners using the custom hook
    useGameListeners(db, currentRoomId, setRoomData, setPlayers, setMessages, setDrawingActions);

    // --- Auto-Skip Turn Logic (Host Only) ---
    const wordChoiceTimeoutRef = useRef(null);

    useEffect(() => {
        if (wordChoiceTimeoutRef.current) {
            clearTimeout(wordChoiceTimeoutRef.current);
            wordChoiceTimeoutRef.current = null;
        }

        const shouldStartTimer = roomData &&
                                 currentUser?.uid === roomData.host &&
                                 roomData.gameState?.wordsToChoose?.length > 0 &&
                                 !roomData.gameState?.currentWord &&
                                 roomData.status === 'playing'; // Ensure game is playing

        if (shouldStartTimer) {
            console.log(`Host (${currentUser.uid}): Starting word choice timeout (10.5s) for drawer ${roomData.gameState.drawerUid} in round ${roomData.gameState.round}`);
            const drawerForTimeout = roomData.gameState.drawerUid;
            const roundForTimeout = roomData.gameState.round;

            wordChoiceTimeoutRef.current = setTimeout(() => {
                console.log(`Host (${currentUser.uid}): Word choice timeout FIRED for round ${roundForTimeout}!`);
                if (currentRoomId) {
                     db.collection("rooms").doc(currentRoomId).get().then(doc => {
                        if (doc.exists) {
                            const latestData = doc.data();
                            // Check if state is still the same: still host, same drawer, same round, still words to choose
                            if (latestData.host === currentUser?.uid &&
                                latestData.gameState?.drawerUid === drawerForTimeout &&
                                latestData.gameState?.round === roundForTimeout &&
                                latestData.gameState?.wordsToChoose?.length > 0)
                            {
                                console.log(`Host (${currentUser.uid}): Skipping turn for drawer ${drawerForTimeout}...`);
                                sendMessage(currentRoomId, 'system', `${latestData.gameState.drawerName || 'الرسام'} لم يختر كلمة، تم تخطي الدور.`);
                                startNewRound(); // Skip turn and start a new one
                            } else {
                                console.log(`Host (${currentUser.uid}): Timeout fired, but state changed (Host: ${latestData.host}, Drawer: ${latestData.gameState?.drawerUid}, Round: ${latestData.gameState?.round}, Words: ${latestData.gameState?.wordsToChoose?.length}). No skip needed.`);
                            }
                        }
                     }).catch(err => console.error("Error checking room state in skip timeout:", err));
                }
                wordChoiceTimeoutRef.current = null;
            }, 10500); // 10.5 seconds
        }

        // Cleanup function
        return () => {
            if (wordChoiceTimeoutRef.current) {
                clearTimeout(wordChoiceTimeoutRef.current);
                wordChoiceTimeoutRef.current = null;
                // console.log("Host: Word choice timeout cleared."); // Optional: Log clearing
            }
        };
    // Re-run when critical game state pieces change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomData?.host, roomData?.gameState?.wordsToChoose, roomData?.gameState?.currentWord, roomData?.gameState?.drawerUid, roomData?.gameState?.round, currentUser?.uid, currentRoomId, db]);


    // --- Room Actions ---
    const createRoom = async (roomDetails) => {
        if (isCreatingRoom) return; // Prevent double click
        const { name, theme, roundTime, maxScore, maxPlayers, privacy, password } = roomDetails;
        if (!name) return showNotification("الرجاء إدخال اسم للغرفة.", false);
        if (privacy === 'password' && !password) return showNotification("الرجاء إدخال كلمة مرور للغرفة.", false);

        setIsCreatingRoom(true);
        let newRoomCode = '';
        let attempts = 0;
        const maxAttempts = 5;

        try {
            while (attempts < maxAttempts) {
                newRoomCode = generateRoomCode(5);
                const roomRefCheck = db.collection("rooms").doc(newRoomCode);
                const docSnap = await roomRefCheck.get();
                if (!docSnap.exists) break;
                attempts++;
                console.warn(`Room code ${newRoomCode} already exists. Attempt ${attempts}`);
            }
            if (attempts >= maxAttempts) throw new Error("لم نتمكن من إنشاء كود فريد للغرفة. حاول مرة أخرى.");

            const roomDataObj = { name, theme, maxPlayers: Number(maxPlayers), privacy, playerCount: 0, spectatorCount: 0, status: 'waiting', createdAt: firebase.firestore.FieldValue.serverTimestamp(), host: currentUser.uid, settings: { roundTime: Number(roundTime), maxScore: Number(maxScore) }, gameState: { round: 0, drawerUid: null, drawerName: null, currentWord: '', wordsToChoose: [], correctGuessers: [], lastDrawerUid: null }, waitingPlayers: [] };
            if (privacy === 'password') roomDataObj.password = password;

            const roomRef = db.collection("rooms").doc(newRoomCode);
            await roomRef.set(roomDataObj);

            showNotification(`تم إنشاء الغرفة ${newRoomCode} بنجاح!`, true);
            joinRoom(newRoomCode); // Automatically join using the new code

        } catch (error) {
            console.error("Error creating room: ", error);
            showNotification(error.message || "حدث خطأ أثناء إنشاء الغرفة.", false);
        } finally {
             setIsCreatingRoom(false);
        }
    };


    const enterRoom = async (roomId, role) => {
        if (!currentUser) return showNotification("يجب عليك تسجيل الدخول أولاً", false);
        // Normalize room ID to uppercase for consistency if using generated codes
        const normalizedRoomId = roomId.toUpperCase();
        const roomRef = db.collection("rooms").doc(normalizedRoomId);
        const playerRef = roomRef.collection("players").doc(currentUser.uid);
        try {
            let playerAlreadyExisted = false;
            await db.runTransaction(async (transaction) => {
                const roomDoc = await transaction.get(roomRef);
                if (!roomDoc.exists) throw new Error(`الغرفة بالكود ${normalizedRoomId} غير موجودة!`);
                const rData = roomDoc.data();
                const existingPlayerDoc = await transaction.get(playerRef);

                if (existingPlayerDoc.exists) {
                    console.warn("Player already in room, skipping transaction updates.");
                    playerAlreadyExisted = true;
                     // If player exists, but maybe role needs update (e.g., from waiting)?
                     if (existingPlayerDoc.data().role !== role) {
                          console.log(`Updating player role from ${existingPlayerDoc.data().role} to ${role}`);
                          transaction.update(playerRef, { role: role });
                          // Adjust counts if role changes between player/spectator/waiting
                          // This logic needs careful consideration based on transitions allowed
                     }
                    return;
                }

                // Check player count only if joining as 'player'
                const maxP = rData.maxPlayers || 8; // Default max players
                const currentPC = rData.playerCount || 0;
                if (role === 'player' && currentPC >= maxP) {
                     // Option: Automatically queue if full? For now, throw error.
                     // throw new Error(`الغرفة ممتلئة (${currentPC}/${maxP})!`);
                     // Let's queue them instead
                     console.log(`Room full (${currentPC}/${maxP}), queuing player.`);
                     role = 'waiting'; // Change role to waiting
                     // Need to update UI message if queuing automatically
                     showNotification("الغرفة ممتلئة! تم وضعك في الانتظار.", true);

                }


                const playerData = { uid: currentUser.uid, displayName: currentUser.displayName, photoURL: currentUser.photoURL, equippedFrame: currentUser.equippedFrame || null, score: 0, roundScore: 0, hasGuessed: false, role: role };
                transaction.set(playerRef, playerData);

                let updates = {};
                // Increment counts based on the *final* role
                if (role === 'player') updates.playerCount = firebase.firestore.FieldValue.increment(1);
                else updates.spectatorCount = firebase.firestore.FieldValue.increment(1); // Spectator or Waiting
                if (role === 'waiting') updates.waitingPlayers = firebase.firestore.FieldValue.arrayUnion(currentUser.uid);

                // Add player name to room data for easier access? (Optional)
                // updates[`playersMap.${currentUser.uid}`] = { displayName: currentUser.displayName, photoURL: currentUser.photoURL };

                transaction.update(roomRef, updates);
            });

             if (!playerAlreadyExisted) {
                 await sendMessage(normalizedRoomId, 'system', `${currentUser.displayName} انضم إلى الغرفة.`);
             }

            setCurrentRoomId(normalizedRoomId);
            setPlayerRole(role); // Set the potentially modified role (e.g., 'waiting')

        } catch(error) {
             console.error("Error entering room: ", error);
             showNotification(error.message || "خطأ في الانضمام للغرفة.", false);
             // Clear room ID only if entry truly failed
             const checkPlayer = await playerRef.get();
             if (!checkPlayer.exists) {
                 setCurrentRoomId(null);
                 setPlayerRole(null);
             } else {
                  // If player exists maybe role was set, update local state
                  setPlayerRole(checkPlayer.data().role);
             }
        }
    };


    const joinRoom = (roomId) => enterRoom(roomId, 'player');
    const spectateRoom = (roomId) => enterRoom(roomId, 'spectator');
    const queueToJoinRoom = (roomId) => enterRoom(roomId, 'waiting');

    const handleJoinRoomClick = (roomId, privacy, isSpectating = false, isQueued = false) => {
         const normalizedRoomId = roomId.toUpperCase(); // Normalize ID
        const action = () => { if(isSpectating) spectateRoom(normalizedRoomId); else if (isQueued) queueToJoinRoom(normalizedRoomId); else joinRoom(normalizedRoomId); };
        if (privacy === 'password') {
             setTempRoomId(normalizedRoomId); // Store normalized ID
             showModal('passwordEntry', { onPasswordSubmit: (password) => handlePasswordSubmit(password, action) });
        }
        else { action(); }
    };

    // Password submit function (fixed tempRoomId clearing)
    const handlePasswordSubmit = async (password, successAction) => {
        console.log("Attempting password submit for room:", tempRoomId);
        if (!tempRoomId) { console.error("tempRoomId is null!"); return; }
        if (!password) return showNotification('الرجاء إدخال كلمة المرور', false);
        const roomRef = db.collection("rooms").doc(tempRoomId);
        const currentTempId = tempRoomId; // Store for logging/cleanup

        try {
            const roomDoc = await roomRef.get();
            if (roomDoc.exists) {
                const roomPassword = roomDoc.data().password;
                console.log("Entered Password:", password, "Stored Room Password:", roomPassword);
                if (String(roomPassword) === String(password)) {
                    console.log("Password CORRECT! Closing modal and calling successAction.");
                    closeModal();
                    setTempRoomId(null); // Clear AFTER success, BEFORE action
                    setTimeout(successAction, 50); // Short delay after modal close
                } else {
                    console.log("Password INCORRECT.");
                    showNotification('كلمة المرور غير صحيحة', false);
                    setTempRoomId(null); // Clear on failure
                }
            } else {
                 console.log("Room not found:", currentTempId);
                 showNotification('الغرفة غير موجودة!', false);
                 setTempRoomId(null); // Clear if room not found
            }
        } catch (error) {
            console.error("Error checking password:", error);
            showNotification('حدث خطأ أثناء التحقق.', false);
            setTempRoomId(null); // Clear on error
        }
    };


    // --- Leave Room ---
    const leaveRoom = async () => {
        if (!currentRoomId || !currentUser) return;
        const roomId = currentRoomId; // Capture room ID before clearing state
        const userRole = playerRole;

        // Optimistically clear state first
        setCurrentRoomId(null);
        setPlayerRole(null);
        setRoomData(null);
        setPlayers([]);
        setMessages([]);
        setDrawingActions([]);

        await sendMessage(roomId, 'system', `${currentUser.displayName} غادر الغرفة.`);

        // Firestore cleanup
        const roomRef = db.collection("rooms").doc(roomId);
        const playerRef = roomRef.collection("players").doc(currentUser.uid);
        try {
            await db.runTransaction(async (transaction) => {
                const roomDoc = await transaction.get(roomRef);
                const playerDoc = await transaction.get(playerRef);

                 if (playerDoc.exists) {
                     transaction.delete(playerRef);

                     if (roomDoc.exists) {
                         const currentData = roomDoc.data(); let updates = {};
                         let currentPC = currentData.playerCount || 0;
                         let currentSC = currentData.spectatorCount || 0;

                         // --- FIX IS HERE (with curly braces) ---
                         if (userRole === 'player') {
                             updates.playerCount = firebase.firestore.FieldValue.increment(-1);
                             currentPC--;
                         } else if (userRole === 'spectator' || userRole === 'waiting') {
                             updates.spectatorCount = firebase.firestore.FieldValue.increment(-1);
                             currentSC--;
                         }
                         // --- END FIX ---

                         if(userRole === 'waiting') updates.waitingPlayers = firebase.firestore.FieldValue.arrayRemove(currentUser.uid);

                         const newTotalOccupants = currentPC + currentSC;

                         if (newTotalOccupants > 0) {
                             if (currentData.host === currentUser.uid) {
                                 // Assign new host
                                 const remainingPlayersSnap = await transaction.get(roomRef.collection("players")); // Get remaining players within transaction
                                 const remainingPlayers = remainingPlayersSnap.docs.filter(doc => doc.id !== currentUser.uid);

                                 if (remainingPlayers.length > 0) {
                                     const nextPlayerHost = remainingPlayers.find(p => p.data().role === 'player');
                                     updates.host = nextPlayerHost ? nextPlayerHost.id : remainingPlayers[0].id; // Prefer player, else anyone
                                      console.log("Host left. New host assigned:", updates.host);
                                 } else {
                                     console.warn("Host left, but no other players found in transaction. Deleting room.");
                                     transaction.delete(roomRef); // Delete room if no one else is found
                                     return; // Stop transaction update if deleting
                                 }
                             }
                            transaction.update(roomRef, updates);
                         } else {
                              console.log("Last player left, deleting room:", roomId);
                              transaction.delete(roomRef);
                         }
                     }
                 } else {
                     console.warn("Attempted leave, but player doc missing:", currentUser.uid, roomId);
                     // If player missing, check if room is empty and delete?
                      if (roomDoc.exists && (roomDoc.data().playerCount || 0) + (roomDoc.data().spectatorCount || 0) <= 0) {
                           console.log("Player doc missing, room looks empty, deleting:", roomId);
                           transaction.delete(roomRef);
                      }
                 }
            });
            showNotification("لقد خرجت من الغرفة.", true);
        } catch (error) { console.error("Error leaving room transaction: ", error); showNotification("حدث خطأ أثناء الخروج.", false); }
    };


    // --- Game Actions ---
    const sendMessage = async (roomIdOverride, type, text, options = {}) => {
        const rId = roomIdOverride || currentRoomId;
        if (!rId || !currentUser || !text) return;
        const messageData = { uid: currentUser.uid, displayName: currentUser.displayName, text: text, type, timestamp: firebase.firestore.FieldValue.serverTimestamp(), ...options };
        try { await db.collection("rooms").doc(rId).collection("messages").add(messageData); } catch (e) { console.error("Error sending message:", e)}
    };
    const sendChatMessage = (text) => sendMessage(currentRoomId, 'chat', text);
    const sendDrawData = async (data) => {
        if (!currentRoomId || !roomData || currentUser?.uid !== roomData?.gameState?.drawerUid) return;
        const payload = { ...data, uid: currentUser.uid };
        try {
            if (data.type === 'redraw') {
                const syncRef = db.collection("rooms").doc(currentRoomId).collection("drawing_sync").doc("latest");
                await syncRef.set({ ...payload, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
            } else await db.collection("rooms").doc(currentRoomId).collection("drawing").add(payload);
        } catch (e) { console.error("Error sending draw data:", e); }
    };
    const handleGuessSubmit = async (text) => {
        if (playerRole !== 'player' || !roomData || roomData?.gameState?.drawerUid === currentUser?.uid || !text || !roomData?.gameState?.currentWord) return;
        const normalizedGuess = text.trim().toLowerCase(); // Normalize guess
        const normalizedWord = roomData.gameState.currentWord.toLowerCase();
        const isCorrect = normalizedGuess === normalizedWord;
        await sendMessage(currentRoomId, 'guess', `${currentUser.displayName}: ${text.trim()}`, { isCorrect }); // Send original text
        if (!isCorrect) return;
        playSound('success', 'A5'); const roomRef = db.collection('rooms').doc(currentRoomId);
        try {
            await db.runTransaction(async (transaction) => {
                // Get fresh room data inside transaction
                const roomDoc = await transaction.get(roomRef); if (!roomDoc.exists) throw new Error("Room no longer exists.");
                const rData = roomDoc.data();
                // Check if already guessed *inside* transaction using latest data
                const playerRef = roomRef.collection('players').doc(currentUser.uid);
                const playerDoc = await transaction.get(playerRef); if (!playerDoc.exists || playerDoc.data().hasGuessed) { console.log("Already guessed, skipping score update."); return; } // Already guessed this round

                const drawerUid = rData.gameState.drawerUid;
                const drawerRef = roomRef.collection('players').doc(drawerUid); const drawerDoc = await transaction.get(drawerRef); const drawerExists = drawerDoc.exists;
                const pointsLadder = [100, 80, 60, 40, 20]; const guesserCount = rData.gameState.correctGuessers?.length || 0;
                const pointsForGuesser = pointsLadder[guesserCount] || 20; const pointsForDrawer = 50; const coinsForGuesser = 10; const coinsForDrawer = 5;
                transaction.update(playerRef, { hasGuessed: true, roundScore: firebase.firestore.FieldValue.increment(pointsForGuesser) });
                if (drawerExists) transaction.update(drawerRef, { roundScore: firebase.firestore.FieldValue.increment(pointsForDrawer) });
                transaction.update(roomRef, { 'gameState.correctGuessers': firebase.firestore.FieldValue.arrayUnion(currentUser.uid) });
                const guesserUserRef = db.collection('users').doc(currentUser.uid); transaction.update(guesserUserRef, { 'stats.coins': firebase.firestore.FieldValue.increment(coinsForGuesser) });
                if (drawerExists) { const drawerUserRef = db.collection('users').doc(drawerUid); transaction.update(drawerUserRef, { 'stats.coins': firebase.firestore.FieldValue.increment(coinsForDrawer) }); }
            });

             // Check if round should end *after* transaction commits, using fresh data
             const latestRoomData = (await roomRef.get()).data();
             if (latestRoomData && currentUser?.uid === latestRoomData.host) {
                 const activePlayers = latestRoomData.playerCount || 0;
                 const correctGuessers = latestRoomData.gameState?.correctGuessers || [];
                 const allHaveGuessed = activePlayers > 1 && correctGuessers.length >= activePlayers - 1;
                 if (allHaveGuessed && !latestRoomData.gameState?.showingScoreboard) { // Ensure not already ending
                     console.log("Host detected all players guessed.");
                     endRound('الجميع خمّن الكلمة!');
                 }
             }
        } catch(error) { console.error("Scoring transaction failed: ", error); showNotification("حدث خطأ أثناء تسجيل النقاط.", false); }
    };

    const chooseWord = async (word) => {
        if(!currentRoomId || !word || currentUser?.uid !== roomData?.gameState?.drawerUid) return;
        closeModal(); // Close word choice modal immediately
        try {
            // Clear drawing actions from previous round before setting new word
            const drawingSnap = await db.collection("rooms").doc(currentRoomId).collection("drawing").get();
            const syncRef = db.collection("rooms").doc(currentRoomId).collection("drawing_sync").doc("latest");
            const batch = db.batch();
            drawingSnap.docs.forEach(doc => batch.delete(doc.ref));
            batch.delete(syncRef);
            // Update game state
            batch.update(db.collection("rooms").doc(currentRoomId), {
                 'gameState.currentWord': word,
                 'gameState.wordsToChoose': [],
                 'gameState.roundStartTime': firebase.firestore.FieldValue.serverTimestamp()
            });
            await batch.commit();

            await sendMessage(currentRoomId, 'system', `${currentUser.displayName} اختار كلمة وبدأ الرسم!`);
        } catch (e) { console.error("Error choosing word:", e); showNotification("خطأ في اختيار الكلمة", false);}
    };
    const endRound = async (reason) => {
        if (!currentRoomId || !roomData || currentUser?.uid !== roomData?.host || roomData?.gameState?.showingScoreboard || !roomData?.gameState?.currentWord) return;
        console.log(`Host (${currentUser.uid}) ending round. Reason: ${reason}`); // Log end round trigger
        playSound('roundEnd', 'C4'); const roomRef = db.collection("rooms").doc(currentRoomId);
        try {
            const playersSnap = await roomRef.collection("players").get(); const batch = db.batch(); const playersDataForScoreboard = [];
            playersSnap.forEach(doc => { const playerData = doc.data(); if ((playerData.roundScore || 0) > 0) batch.update(doc.ref, { score: firebase.firestore.FieldValue.increment(playerData.roundScore || 0), roundScore: 0 }); playersDataForScoreboard.push({ ...playerData, score: (playerData.score || 0) + (playerData.roundScore || 0), roundScore: 0 /* Show 0 round score on board */ }); });
            // Also reset roundScore for players who didn't score (redundant but safe)
            playersSnap.forEach(doc => batch.update(doc.ref, { roundScore: 0, hasGuessed: false }));

            // Get current word *before* scoreboard update potentially clears it if new round starts too fast
             const wordForScoreboard = roomData.gameState.currentWord;

            batch.update(roomRef, {
                 'gameState.showingScoreboard': true,
                 'gameState.currentWord': '', // Clear current word when showing scoreboard
                 'gameState.roundStartTime': null, // Clear start time
                 'gameState.correctGuessers': [], // Clear guessers
                 'gameState.wordsToChoose': [], // Clear word choices
                 'gameState.scoreboardData': {
                      reason: reason,
                      word: wordForScoreboard, // Use the captured word
                      players: playersDataForScoreboard.filter(p => p.role === 'player')
                 }
             });

            await batch.commit(); // Commit score resets and scoreboard flag together


            // Get latest room data *after* committing scoreboard state
            const latestRoomDoc = await roomRef.get();
            if (!latestRoomDoc.exists) return;
            const latestRoomData = latestRoomDoc.data();

             const scoreToWin = latestRoomData.settings?.maxScore || 150;
             // Check winner based on the updated scores *from the scoreboard data*
             const winner = playersDataForScoreboard.find(p => p.role === 'player' && p.score >= scoreToWin);


            // Timeout to start next round/end game
            const timeoutId = setTimeout(async () => {
                 if (!currentRoomId) return; // User left
                 try {
                     const currentDoc = await db.collection("rooms").doc(currentRoomId).get();
                     if (currentDoc.exists) {
                         const currentData = currentDoc.data();
                         // Check if still showing scoreboard AND user is still host
                         if (currentData.gameState?.showingScoreboard && currentUser?.uid === currentData.host) {
                              if (winner) await endGame(winner);
                              else await startNewRound();
                         }
                     }
                 } catch(err) { console.error("Error in scoreboard timeout check:", err)}
            }, 8000);
             // TODO: Store timeoutId and clear it in leaveRoom or useEffect cleanup
        } catch (error) { console.error("Error finalizing round scores:", error); showNotification("خطأ في تحديث النتائج", false);
             // Attempt to reset state if error occurs?
             try { await roomRef.update({'gameState.showingScoreboard': false}); } catch (e) {}
        }
    };


    const endGame = async (winner) => {
        if (!currentRoomId || !roomData || currentUser?.uid !== roomData?.host || !winner) return;
        console.log(`Host (${currentUser.uid}) ending game. Winner: ${winner.displayName}`);
        try {
            const winnerRef = db.collection("users").doc(winner.uid);
            await winnerRef.update({ 'stats.coins': firebase.firestore.FieldValue.increment(50) });
            await db.collection("rooms").doc(currentRoomId).update({
                 status: 'ended',
                 // Store minimal winner info for display, ensure scores are numbers
                 'gameState.winner': { uid: winner.uid, displayName: winner.displayName, score: Number(winner.score || 0) },
                 'gameState.showingScoreboard': true // Keep scoreboard shown after game ends
            });
            await sendMessage(currentRoomId, 'system', `انتهت اللعبة! الفائز هو ${winner.displayName} برصيد ${winner.score || 0} نقطة! 🏆`);
        } catch (e) { console.error("Error ending game:", e); showNotification("خطأ في إنهاء اللعبة", false);}
    };
    const startNewRound = async () => {
        if (!currentRoomId || !roomData || currentUser?.uid !== roomData?.host) return;
        console.log(`Host (${currentUser.uid}) starting new round.`);
        const roomRef = db.collection("rooms").doc(currentRoomId); const batch = db.batch();
        try {
             const currentRoomDoc = await roomRef.get();
             if (!currentRoomDoc.exists) { console.error("Cannot start new round, room deleted."); return; }
             const currentRoomData = currentRoomDoc.data();

             // Ensure game isn't already ended
             if (currentRoomData.status === 'ended') {
                  console.warn("Attempted to start new round in an ended game.");
                  return;
             }

            // 1. Admit waiting players
            const waitingPlayers = currentRoomData.waitingPlayers || [];
            const slotsAvailable = (currentRoomData.maxPlayers || 8) - (currentRoomData.playerCount || 0);
            const playersToJoin = waitingPlayers.slice(0, slotsAvailable);
            if (playersToJoin.length > 0) {
                console.log("Admitting waiting players:", playersToJoin);
                playersToJoin.forEach(uid => batch.update(roomRef.collection("players").doc(uid), { role: 'player' }));
                const remainingWaiting = waitingPlayers.slice(slotsAvailable);
                batch.update(roomRef, { playerCount: firebase.firestore.FieldValue.increment(playersToJoin.length), spectatorCount: firebase.firestore.FieldValue.increment(-playersToJoin.length), waitingPlayers: remainingWaiting });
            }

            // Calculate expected player count *after* potential joiners have been batched
            const expectedPlayerCount = (currentRoomData.playerCount || 0) + playersToJoin.length;

            if (expectedPlayerCount < 2) {
                 console.log("Not enough players to start new round.");
                showNotification("تحتاج إلى لاعبين على الأقل لبدء جولة.", false);
                // Ensure scoreboard is hidden and status is waiting
                batch.update(roomRef, { status: 'waiting', 'gameState.showingScoreboard': false });
                await batch.commit(); return;
            }

             // 3. Reset round stats for *all* players (including newly joined)
             const playersSnap = await roomRef.collection("players").get();
             // Reset only those who are players or joining now
             const playerDocsForReset = playersSnap.docs.filter(doc => doc.data().role === 'player' || playersToJoin.includes(doc.id));
             playerDocsForReset.forEach(playerDoc => batch.update(playerDoc.ref, { hasGuessed: false, roundScore: 0 }));

             // 4. Select new drawer
             const playerListForDrawer = playerDocsForReset.map(doc => ({ id: doc.id, data: doc.data() }));
             const playerIds = playerListForDrawer.map(p => p.id);
            let possibleDrawers = playerIds.filter(id => id !== currentRoomData.gameState?.lastDrawerUid);
            if (possibleDrawers.length === 0) possibleDrawers = playerIds;
             if (possibleDrawers.length === 0) {
                  console.error("Cannot select drawer, no possible drawers found even after including all.");
                  batch.update(roomRef, { status: 'waiting', 'gameState.showingScoreboard': false });
                  await batch.commit(); return;
             }
            const drawerId = possibleDrawers[Math.floor(Math.random() * possibleDrawers.length)];
            const drawer = playerListForDrawer.find(p => p.id === drawerId);
            const drawerName = drawer ? drawer.data?.displayName : 'الرسام'; // Use optional chaining
             console.log("New drawer selected:", drawerName, `(${drawerId})`);

            // 5. Choose words
            const wordList = WORD_LISTS[currentRoomData.theme] || WORD_LISTS['عام']; const words = new Set();
            while (words.size < 3 && words.size < wordList.length) words.add(wordList[Math.floor(Math.random() * wordList.length)]);
             console.log("Words chosen:", Array.from(words));

            // 6. Clear drawings
            const drawingSnap = await roomRef.collection('drawing').get(); drawingSnap.docs.forEach(doc => batch.delete(doc.ref));
            const drawingSyncRef = roomRef.collection('drawing_sync').doc('latest'); batch.delete(drawingSyncRef);

            // 7. Update game state
            batch.update(roomRef, {
                status: 'playing', 'gameState.round': firebase.firestore.FieldValue.increment(1), 'gameState.drawerUid': drawerId,
                'gameState.drawerName': drawerName, 'gameState.lastDrawerUid': drawerId,
                'gameState.wordsToChoose': Array.from(words), 'gameState.currentWord': '', 'gameState.roundStartTime': null,
                'gameState.correctGuessers': [], 'gameState.showingScoreboard': false, // Ensure scoreboard is hidden
            });

            await batch.commit(); // Commit all updates together
            await sendMessage(currentRoomId, 'system', `جولة جديدة (${currentRoomData.gameState.round + 1}) بدأت! ${drawerName} هو الرسام.`); // Updated message

        } catch (e) { console.error("Error starting new round:", e); showNotification("خطأ في بدء جولة جديدة", false);
             // Attempt to reset state if error occurs?
             try { await roomRef.update({status: 'waiting', 'gameState.showingScoreboard': false}); } catch (resetErr) {}
        }
    };


    const handleStartGame = () => { if (currentUser?.uid === roomData?.host) startNewRound(); };

    // --- Value Exported by Context ---
    const value = { currentRoomId, playerRole, roomData, players, messages, drawingActions, handleJoinRoomClick, joinRoom, createRoom, leaveRoom, sendChatMessage, handleGuessSubmit, sendDrawData, chooseWord, handleStartGame, endRound };

    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    );
};