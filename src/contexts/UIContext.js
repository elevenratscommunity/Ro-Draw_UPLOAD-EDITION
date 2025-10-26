import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Tone from 'tone';

// --- App Sounds ---
// (من الكود القديم بتاعك)
const sounds = {
    click: new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.1 } }).toDestination(),
    success: new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.005, decay: 0.2, sustain: 0.1, release: 0.2 } }).toDestination(),
    error: new Tone.Synth({ oscillator: { type: "square" }, envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 } }).toDestination(),
    join: new Tone.Synth({ oscillator: { type: "sawtooth" }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.2 } }).toDestination(),
    leave: new Tone.Synth({ oscillator: { type: "square" }, envelope: { attack: 0.1, decay: 0.5, sustain: 0, release: 0.2 } }).toDestination(),
    message: new Tone.Synth({ oscillator: { type: "triangle8" }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.1 } }).toDestination(),
    roundStart: new Tone.Synth({ oscillator: { type: "fmsine", modulationIndex: 1.2 }, envelope: { attack: 0.01, decay: 0.5, sustain: 0.1, release: 0.5 } }).toDestination(),
    roundEnd: new Tone.Synth({ oscillator: { type: "amsquare", modulationIndex: 2 }, envelope: { attack: 0.1, decay: 0.3, sustain: 0, release: 0.3 } }).toDestination(),
    buy: new Tone.Synth({ oscillator: { type: "fmsquare", modulationIndex: 0.8 }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.2 } }).toDestination(),
};
function playSound(sound, note = "C5") { 
    if (Tone.context.state !== 'running') { Tone.start(); } 
    if (sounds[sound]) {
        try {
            sounds[sound].triggerAttackRelease(note, "8n", Tone.now()); 
        } catch(e) { /* Mute error */ }
    }
}


const UIContext = createContext(null);
export const useUI = () => useContext(UIContext);

export const UIProvider = ({ children }) => {
    const [notification, setNotification] = useState({ message: '', type: 'success', visible: false });
    const [activeModal, setActiveModal] = useState(null); // 'updates', 'info', 'codeEntry', etc.
    const [modalData, setModalData] = useState(null); // لإرسال بيانات للمودال زي كود الغرفة

    const showNotification = (message, isSuccess = true) => {
        playSound(isSuccess ? 'success' : 'error', isSuccess ? 'G5' : 'C3');
        setNotification({ message, type: isSuccess ? 'success' : 'error', visible: true });
        setTimeout(() => {
            setNotification(prev => ({ ...prev, visible: false }));
        }, 3000);
    };

    const showModal = (modalName, data = null) => {
        setModalData(data);
        setActiveModal(modalName);
    };

    const closeModal = () => {
        setActiveModal(null);
        setModalData(null);
    };

    const value = {
        notification,
        showNotification,
        activeModal,
        modalData,
        showModal,
        closeModal,
        playSound,
    };

    return (
        <UIContext.Provider value={value}>
            {children}
        </UIContext.Provider>
    );
};