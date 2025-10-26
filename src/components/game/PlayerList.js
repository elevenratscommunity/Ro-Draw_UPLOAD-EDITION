import React from 'react';
import { useGame } from '../../contexts/GameContext';

export default function PlayerList() {
    const { players, roomData } = useGame();

    const renderPlayer = (p, icon = '') => {
        const isDrawer = roomData?.gameState?.drawerUid === p.uid;
        const hasGuessed = p.hasGuessed;
        // النتيجة الحالية + اللي كسبه في الجولة دي
        const newTotalScore = (p.score || 0) + (p.roundScore || 0); 
        
        return (
            <div key={p.uid} className="flex items-center bg-blue-50/80 p-2 rounded-lg justify-between">
               <div className="flex items-center gap-2">
                   <div className={`avatar-wrapper ${p.equippedFrame || ''}`}>
                      <img src={p.photoURL} className="w-10 h-10 rounded-full" alt="avatar"/>
                   </div>
                   <p className="font-bold text-sm">{p.displayName}</p>
               </div>
               <div className="flex items-center gap-2">
                   {icon}
                   {isDrawer ? <span title="الرسام">✏️</span> : ''}
                   {hasGuessed ? <span title="خمّن الكلمة">✔️</span> : ''}
                   <span className="font-bold text-lg text-yellow-500">{newTotalScore}</span>
               </div>
           </div>
        );
    }

    const pPlaying = players.filter(p => p.role === 'player');
    const pWaiting = players.filter(p => p.role === 'waiting');
    const pSpectating = players.filter(p => p.role === 'spectator');

    return (
        <div id="player-list" className="game-module flex-grow p-2 overflow-y-auto space-y-2">
            {pPlaying.map(p => renderPlayer(p))}
            {pWaiting.length > 0 && <h4 className="font-bold text-center text-gray-500 pt-2">في الانتظار</h4>}
            {pWaiting.map(p => renderPlayer(p, '⏳'))}
            {pSpectating.length > 0 && <h4 className="font-bold text-center text-gray-500 pt-2">مشاهدون</h4>}
            {pSpectating.map(p => renderPlayer(p, '👀'))}
        </div>
    );
}