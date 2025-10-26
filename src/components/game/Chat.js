import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useAuth } from '../../contexts/AuthContext';

// ده هيعرض الرسايل (شات أو تخمين)
const MessageBox = ({ messages, type }) => {
    const boxRef = useRef(null);

    useEffect(() => {
        if (boxRef.current) {
            boxRef.current.scrollTop = boxRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div id={type === 'chat' ? 'chat-box' : 'guesses-box'} ref={boxRef} className="flex-grow overflow-y-auto py-1">
            {messages.map((msg, index) => {
                let content = null;
                if (msg.type === 'system') {
                    content = <span className="italic text-gray-400">{msg.text}</span>;
                } else if (msg.type === 'guess') {
                    if (msg.isCorrect) {
                        content = <span className="font-bold text-green-600">{msg.displayName} خمّن الكلمة الصحيحة!</span>;
                    } else {
                        content = <><span className="font-bold">{msg.displayName}:</span> {msg.text}</>;
                    }
                } else if (msg.type === 'chat') {
                    content = <><span className="font-bold">{msg.displayName}:</span> {msg.text}</>;
                }

                if ((type === 'chat' && msg.type !== 'guess') || (type === 'guess' && msg.type !== 'chat')) {
                    return <p key={index} className="text-sm break-words mb-1">{content}</p>;
                }
                return null;
            })}
        </div>
    );
};

// ده هيعرض الفورم بتاعة الإرسال
const MessageForm = ({ onSend, placeholder, buttonText, btnClass }) => {
    const [text, setText] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!text) return;
        onSend(text);
        setText('');
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-2 pt-1 border-t-2">
            <input 
                type="text" 
                placeholder={placeholder} 
                className="flex-grow p-1 bg-gray-100 rounded-lg border focus:outline-none"
                value={text}
                onChange={(e) => setText(e.target.value)}
            />
            <button type="submit" className={`btn ${btnClass} px-3 py-1 text-sm`}>{buttonText}</button>
        </form>
    );
};

// ده المكون الرئيسي اللي بيجمعهم
export default function Chat() {
    const { messages, sendChatMessage, handleGuessSubmit, roomData } = useGame();
    const { currentUser } = useAuth();
    
    const isDrawer = roomData?.gameState?.drawerUid === currentUser?.uid;
    const isSpectator = useGame().playerRole !== 'player';

    return (
        <>
            {/* Chat Box */}
            <div className="game-module flex flex-col p-2 h-48 md:h-1/3">
                <h3 className="text-center font-bold border-b-2 pb-1 text-blue-800">الدردشة</h3>
                <MessageBox messages={messages} type="chat" />
                <MessageForm 
                    onSend={sendChatMessage}
                    placeholder="اكتب رسالة..."
                    buttonText="إرسال"
                    btnClass="btn-secondary"
                />
            </div>

            {/* Guess Box */}
            <div className="game-module flex flex-col p-2 h-40">
                <h3 className="text-center font-bold border-b-2 pb-1 text-blue-800">الإجابات والتخمينات</h3>
                <MessageBox messages={messages} type="guess" />
                {/* إخفاء الفورم لو أنا الرسام أو مشاهد */}
                {(!isDrawer && !isSpectator) && (
                    <MessageForm 
                        onSend={handleGuessSubmit}
                        placeholder="خمّن هنا..."
                        buttonText="إرسال"
                        btnClass="btn-play"
                    />
                )}
            </div>
        </>
    );
}