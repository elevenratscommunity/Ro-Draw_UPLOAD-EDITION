import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { STORE_ITEMS } from '../../data/constants';

// ده مجرد واجهة، اللوجيك كله هيجيله من Canvas
export default function Toolbar({
    currentTool, onToolChange,
    currentColor, onColorChange,
    currentSize, onSizeChange,
    onUndo, onRedo, onClear
}) {
    const { currentUser } = useAuth();
    const inventory = currentUser.inventory || [];

    const colors = ['#000000', '#FFFFFF', '#C2C2C2', '#606060', '#FF0000', '#FF7400', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#9B00FF'];
    const sizes = [2, 5, 10, 20];

    const purchasedTools = Object.keys(STORE_ITEMS).map(itemId => {
        const item = STORE_ITEMS[itemId];
        if (item.type === 'tool' && inventory.includes(itemId)) {
            return (
                <div 
                    key={item.value}
                    className={`tool-icon ${currentTool === item.value ? 'active' : ''}`} 
                    title={item.name}
                    onClick={() => onToolChange(item.value)}
                    dangerouslySetInnerHTML={{ __html: item.icon }}
                ></div>
            );
        }
        return null;
    }).filter(Boolean);

    return (
        <div id="vertical-toolbar" className="bg-white rounded-xl p-2 flex flex-col items-center space-y-2 border-l-4 border-blue-200 overflow-y-auto">
            {/* Standard Tools */}
            <div className={`tool-icon ${currentTool === 'brush' ? 'active' : ''}`} onClick={() => onToolChange('brush')} title="فرشاة"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></div>
            <div className={`tool-icon ${currentTool === 'eraser' ? 'active' : ''}`} onClick={() => onToolChange('eraser')} title="ممحاة"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21H7Z"/></svg></div>
            
            <div className="w-full h-px bg-gray-300 my-1"></div>
            
            {/* Purchased Tools */}
            {purchasedTools}
            
            <div className="w-full h-px bg-gray-300 my-1"></div>
            
            <div className="tool-icon" onClick={onClear} title="مسح الكل"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></div>
            
            <div id="undo-redo-container" className="flex gap-2">
                <button id="undo-btn" onClick={onUndo} className="tool-icon" title="تراجع"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" transform="scale(-1, 1)"><path d="M15 4H5v10"/><path d="m9 9.5 10 9.5"/></svg></button>
                <button id="redo-btn" onClick={onRedo} className="tool-icon" title="تقدم"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 4h10v10"/><path d="m9 9.5 10 9.5"/></svg></button>
            </div>

            <div className="w-full h-px bg-gray-300 my-1"></div>
            
            {/* Brush Sizes */}
            <div id="brush-sizes" className="flex flex-col gap-2">
                {sizes.map(size => (
                    <div 
                        key={size}
                        className={`tool-icon ${currentSize === size ? 'active' : ''}`}
                        onClick={() => onSizeChange(size)}
                    >
                        <div className={`bg-black rounded-full`} style={{ width: `${size/1.5}px`, height: `${size/1.5}px`}}></div>
                    </div>
                ))}
            </div>
            
            <div className="w-full h-px bg-gray-300 my-1"></div>
            
            {/* Color Palette */}
            <div id="color-palette" className="grid grid-cols-2 gap-1.5">
                {colors.map(color => (
                    <div 
                        key={color}
                        className={`color-swatch ${currentColor === color ? 'active' : ''}`} 
                        style={{ backgroundColor: color }} 
                        onClick={() => onColorChange(color)}
                    ></div>
                ))}
            </div>
            <input 
                type="color" 
                id="custom-color-picker" 
                className="w-8 h-8 mt-2 cursor-pointer" 
                title="اختيار لون"
                value={currentColor}
                onChange={(e) => onColorChange(e.target.value)}
            />
        </div>
    );
}