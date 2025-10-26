import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';

// --- دوال الرسم المساعدة (من الكود القديم) ---
const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [ parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16) ] : [0, 0, 0];
};

const floodFill = (ctx, x, y, fillColor) => {
    const canvas = ctx.canvas;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const startPos = (y * canvas.width + x) * 4;
    const startR = data[startPos], startG = data[startPos+1], startB = data[startPos+2];
    const [fillR, fillG, fillB] = hexToRgb(fillColor);
    const tolerance = 30;
    if (Math.abs(startR - fillR) < tolerance && Math.abs(startG - fillG) < tolerance && Math.abs(startB - fillB) < tolerance) return;
    const pixelQueue = [[x, y]];
    while (pixelQueue.length) {
        const [currentX, currentY] = pixelQueue.shift();
        if (currentX < 0 || currentX >= canvas.width || currentY < 0 || currentY >= canvas.height) continue;
        const currentPos = (currentY * canvas.width + currentX) * 4;
        const currentR = data[currentPos], currentG = data[currentPos+1], currentB = data[currentPos+2];
        if (Math.abs(currentR - startR) < tolerance && Math.abs(currentG - startG) < tolerance && Math.abs(currentB - startB) < tolerance) {
            data[currentPos] = fillR; data[currentPos+1] = fillG; data[currentPos+2] = fillB; data[currentPos+3] = 255;
            pixelQueue.push([currentX + 1, currentY]); pixelQueue.push([currentX - 1, currentY]);
            pixelQueue.push([currentX, currentY + 1]); pixelQueue.push([currentX, currentY - 1]);
        }
    }
    ctx.putImageData(imageData, 0, 0);
};

const drawAction = (ctx, action) => {
    if (!ctx || !action) return;
    ctx.strokeStyle = action.color;
    ctx.lineWidth = action.size;
    ctx.lineCap = 'round';
    ctx.fillStyle = action.color;
    if(action.pattern) ctx.fillStyle = action.pattern;
    if(action.pattern) ctx.strokeStyle = action.pattern;
    switch (action.type) {
        case 'draw': ctx.beginPath(); ctx.moveTo(action.x0, action.y0); ctx.lineTo(action.x1, action.y1); ctx.stroke(); break;
        case 'rect': ctx.strokeRect(action.x, action.y, action.w, action.h); break;
        case 'circle': ctx.beginPath(); ctx.arc(action.x, action.y, action.radius, 0, 2 * Math.PI); ctx.stroke(); break;
        case 'fill': floodFill(ctx, action.x, action.y, action.color); break;
        case 'spray':
            const density = action.size * 2;
            for (let i = 0; i < density; i++) {
                const angle = Math.random() * 2 * Math.PI;
                const radius = Math.random() * action.size;
                const offsetX = Math.cos(angle) * radius; const offsetY = Math.sin(angle) * radius;
                ctx.fillRect(action.x + offsetX, action.y + offsetY, 1, 1);
            }
            break;
        case 'clear': ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); break;
        default: break;
    }
};
// --- نهاية دوال الرسم ---


export default function Canvas({ 
    tool, color, size, 
    onUndo, onRedo, onClear, 
    onColorChange // هنحتاجها للـ eyedropper
}) {
    const canvasRef = useRef(null);
    const previewCanvasRef = useRef(null);
    const { drawingActions, sendDrawData, roomData, playerRole } = useGame();
    const { currentUser } = useAuth();
    const { showNotification } = useUI();
    
    // state خاصة بالرسم بس
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
    
    // state لتاريخ الرسم (لـ undo/redo)
    const historyRef = useRef([]);
    const redoStackRef = useRef([]);

    const isDrawer = roomData?.gameState?.drawerUid === currentUser?.uid && playerRole === 'player';

    // دالة إعادة رسم الكانفاس من الهيستوري
    const redrawFromHistory = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        historyRef.current.forEach(action => drawAction(ctx, action));
    }, []);

    // دالة إضافة أكشن جديد (للرسم أو للإرسال)
    const pushAction = (action, broadcast = false) => {
        historyRef.current.push(action);
        redoStackRef.current = []; // Clear redo stack
        if (broadcast) {
            sendDrawData(action);
        }
    };
    
    // --- ربط الـ Toolbar بالكانفاس ---
    useEffect(() => {
        // ده اللي بينفذ الأوامر اللي جاية من التولبار
        onUndo.current = () => {
            if (!isDrawer || historyRef.current.length === 0) return;
            redoStackRef.current.push(historyRef.current.pop());
            redrawFromHistory();
            sendDrawData({ type: 'redraw', history: historyRef.current }); // Sync all
        };
        onRedo.current = () => {
            if (!isDrawer || redoStackRef.current.length === 0) return;
            historyRef.current.push(redoStackRef.current.pop());
            redrawFromHistory();
            sendDrawData({ type: 'redraw', history: historyRef.current }); // Sync all
        };
        onClear.current = () => {
            if (!isDrawer || historyRef.current.length === 0) return;
            const action = { type: 'clear' };
            drawAction(canvasRef.current.getContext('2d'), action);
            pushAction(action, true);
        };
    }, [isDrawer, redrawFromHistory, sendDrawData, onUndo, onRedo, onClear]);
    

    // --- استقبال أوامر الرسم من بره ---
    useEffect(() => {
        if (!drawingActions || drawingActions.length === 0) return;
        
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        drawingActions.forEach(action => {
            // لو الأمر ده مني، متنفذهوش (لأنه اتنفذ خلاص)
            if (action.uid === currentUser?.uid) return;
            
            if (action.type === 'redraw') {
                // مزامنة كاملة (حد عمل undo)
                historyRef.current = action.history;
                redrawFromHistory();
            } else if (action.type === 'clear') {
                historyRef.current = [action]; // الهيستوري بقى فيه الأمر ده بس
                drawAction(ctx, action);
            }
            else {
                historyRef.current.push(action);
                drawAction(ctx, action);
            }
        });

    }, [drawingActions, currentUser?.uid, redrawFromHistory]);

    // --- ظبط حجم الكانفاس ---
    useEffect(() => {
        const canvas = canvasRef.current;
        const previewCanvas = previewCanvasRef.current;
        const container = canvas.parentElement;

        const resizeCanvas = () => {
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            previewCanvas.width = container.clientWidth;
            previewCanvas.height = container.clientHeight;
            redrawFromHistory(); // ارسم الهيستوري تاني بالحجم الجديد
        };
        
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas(); // ارسمه أول مرة

        return () => window.removeEventListener('resize', resizeCanvas);
    }, [redrawFromHistory]);
    
    // --- دوال الماوس ---
    const getPos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const createPattern = (ctx) => {
        const patternCanvas = document.createElement('canvas');
        const pCtx = patternCanvas.getContext('2d');
        patternCanvas.width = 10; patternCanvas.height = 10;
        pCtx.fillStyle = color; pCtx.fillRect(0,0,10, 10);
        pCtx.strokeStyle = 'rgba(255,255,255,0.5)'; pCtx.lineWidth = 1;
        pCtx.beginPath(); pCtx.moveTo(0, 10); pCtx.lineTo(10, 0); pCtx.stroke();
        return ctx.createPattern(patternCanvas, 'repeat');
    };

    const startDrawing = (e) => {
        e.preventDefault();
        if (!isDrawer) return;
        const pos = getPos(e);
        const ctx = canvasRef.current.getContext('2d');
        
        if (tool === 'eyedropper') {
            const pixelData = ctx.getImageData(pos.x, pos.y, 1, 1).data;
            const hexColor = "#" + ("000000" + ((pixelData[0] << 16) | (pixelData[1] << 8) | pixelData[2]).toString(16)).slice(-6);
            onColorChange(hexColor); // حدث اللون في التولبار
            showNotification(`تم اختيار اللون: ${hexColor}`, true);
            return;
        }
        if (tool === 'fill') {
            const action = { type: 'fill', x: pos.x, y: pos.y, color };
            drawAction(ctx, action);
            pushAction(action, true);
            return;
        }

        setIsDrawing(true);
        setStartPos(pos);
        setLastPos(pos);
    };

    const keepDrawing = (e) => {
        e.preventDefault();
        if (!isDrawing || !isDrawer) return;
        
        const pos = getPos(e);
        const ctx = canvasRef.current.getContext('2d');
        const previewCtx = previewCanvasRef.current.getContext('2d');
        previewCtx.clearRect(0, 0, previewCtx.canvas.width, previewCtx.canvas.height);

        let action;
        switch (tool) {
            case 'brush':
            case 'eraser':
                action = { type: 'draw', x0: lastPos.x, y0: lastPos.y, x1: pos.x, y1: pos.y, color: tool === 'eraser' ? '#FFFFFF' : color, size };
                drawAction(ctx, action); pushAction(action, true);
                break;
            case 'pattern':
                action = { type: 'draw', x0: lastPos.x, y0: lastPos.y, x1: pos.x, y1: pos.y, color, size, pattern: createPattern(ctx) };
                drawAction(ctx, action); pushAction(action, true);
                break;
            case 'spray':
                 action = { type: 'spray', x: pos.x, y: pos.y, color, size };
                 drawAction(ctx, action); pushAction(action, true);
                break;
            case 'line':
                drawAction(previewCtx, { type: 'draw', x0: startPos.x, y0: startPos.y, x1: pos.x, y1: pos.y, color, size });
                break;
            case 'rectangle':
                drawAction(previewCtx, { type: 'rect', x: startPos.x, y: startPos.y, w: pos.x - startPos.x, h: pos.y - startPos.y, color, size });
                break;
            case 'circle':
                const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
                drawAction(previewCtx, { type: 'circle', x: startPos.x, y: startPos.y, radius, color, size });
                break;
            default: break;
        }
        
        setLastPos(pos);
    };
    
    const stopDrawing = (e) => {
        if (!isDrawing || !isDrawer) return;
        setIsDrawing(false);
        
        const ctx = canvasRef.current.getContext('2d');
        const previewCtx = previewCanvasRef.current.getContext('2d');
        previewCtx.clearRect(0, 0, previewCtx.canvas.width, previewCtx.canvas.height);
        
        const pos = getPos(e);
        let action;
        
        if (tool === 'line') action = { type: 'draw', x0: startPos.x, y0: startPos.y, x1: pos.x, y1: pos.y, color, size };
        else if (tool === 'rectangle') action = { type: 'rect', x: startPos.x, y: startPos.y, w: pos.x - startPos.x, h: pos.y - startPos.y, color, size };
        else if (tool === 'circle') {
            const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
            action = { type: 'circle', x: startPos.x, y: startPos.y, radius, color, size };
        }
        
        if (action) {
            drawAction(ctx, action);
            pushAction(action, true);
        }
    };

    return (
        <div 
            id="canvas-container" 
            className="game-module flex-grow relative p-1"
            style={{ cursor: tool === 'eyedropper' || tool === 'fill' ? 'crosshair' : 'default' }}
            // تفعيل دوال الماوس
            onMouseDown={startDrawing}
            onMouseMove={keepDrawing}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={keepDrawing}
            onTouchEnd={stopDrawing}
        >
             <canvas ref={canvasRef} id="drawing-canvas" className="w-full h-full bg-white rounded-md absolute top-0 left-0"></canvas>
             <canvas ref={previewCanvasRef} id="preview-canvas" className="w-full h-full rounded-md absolute top-0 left-0 pointer-events-none"></canvas>
        </div>
    );
}