import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFirebase } from '../../contexts/FirebaseContext';
import { useUI } from '../../contexts/UIContext';
import { STORE_ITEMS, AVATAR_COUNT } from '../../data/constants';

export default function ProfileScreen({ showScreen }) {
    const { currentUser, setCurrentUser } = useAuth();
    const { db, storage } = useFirebase();
    const { showNotification } = useUI();

    // States
    const [activeTab, setActiveTab] = useState('avatars');
    const [displayName, setDisplayName] = useState(currentUser.displayName);
    const [selectedAvatarUrl, setSelectedAvatarUrl] = useState(currentUser.photoURL);
    const [customAvatarFile, setCustomAvatarFile] = useState(null);
    const [customAvatarPreview, setCustomAvatarPreview] = useState(currentUser.photoURL);
    const [isLoading, setIsLoading] = useState(false);

    const userStats = currentUser.stats || {};
    const inventory = currentUser.inventory || [];
    const hasCustomAvatarFeature = inventory.includes('feature_custom_avatar');

    // Handle default avatar pick
    const selectDefaultAvatar = (url) => {
        setSelectedAvatarUrl(url);
        setCustomAvatarFile(null); // Clear custom file
        setCustomAvatarPreview(url); // Update preview
    };

    // Handle custom avatar file selection
    const handleAvatarFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            return showNotification("الرجاء اختيار ملف صورة صالح.", false);
        }
        if (file.size > 1 * 1024 * 1024) { // 1MB limit
            return showNotification("حجم الصورة كبير جداً. الحد الأقصى 1 ميجابايت.", false);
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setCustomAvatarPreview(event.target.result);
            setCustomAvatarFile(file);
            setSelectedAvatarUrl('custom'); // Mark as custom
        };
        reader.readAsDataURL(file);
    };

    // Generic function to equip items
    const equipItem = async (type, style) => {
        if (isLoading) return;

        const fieldToUpdate = type === 'frame' ? 'equippedFrame' : 'equippedBackground';
        const valueToSet = (style === 'null' || style === 'bg-classic') ? (type === 'frame' ? null : 'bg-classic') : style;
        
        const userDocRef = db.collection("users").doc(currentUser.uid);

        try {
            await userDocRef.update({ [fieldToUpdate]: valueToSet });
            
            // Update context state
            setCurrentUser(prevUser => ({
                ...prevUser,
                [fieldToUpdate]: valueToSet
            }));

            showNotification(`تم تجهيز ${type === 'frame' ? 'الإطار' : 'الخلفية'} بنجاح!`, true);
        } catch (error) {
            console.error(`Error equipping ${type}: `, error);
            showNotification(`حدث خطأ أثناء تجهيز ${type}`, false);
        }
    };
    
    // Save all profile changes
    const saveProfile = async () => {
        if (isLoading) return;
        setIsLoading(true);

        try {
            const newName = displayName.trim();
            if(!newName) {
                throw new Error("الاسم لا يمكن أن يكون فارغًا");
            }

            let finalPhotoURL = currentUser.photoURL;

            // 1. If a new default avatar was selected
            if (selectedAvatarUrl && selectedAvatarUrl !== 'custom' && selectedAvatarUrl !== currentUser.photoURL) {
                finalPhotoURL = selectedAvatarUrl;
            }

            // 2. If a new custom avatar is to be uploaded
            if (customAvatarFile && storage) {
                const storageRef = storage.ref(`avatars/${currentUser.uid}/${customAvatarFile.name}`);
                const uploadTask = await storageRef.put(customAvatarFile);
                finalPhotoURL = await uploadTask.ref.getDownloadURL();
                setCustomAvatarFile(null); // Reset after upload
            }

            // 3. Update Firestore
            const userDocRef = db.collection("users").doc(currentUser.uid);
            await userDocRef.update({ 
                displayName: newName, 
                photoURL: finalPhotoURL 
            });
            
            // 4. Update Auth Context
            setCurrentUser(prevUser => ({
                ...prevUser,
                displayName: newName,
                photoURL: finalPhotoURL
            }));
            
            showNotification("تم تحديث الملف الشخصي بنجاح!");
            showScreen('mainMenu');

        } catch (error) {
            console.error("Error saving profile:", error);
            showNotification(error.message, false);
        } finally {
            setIsLoading(false);
        }
    };


    // Helper to render inventory items
    const renderInventory = (type) => {
        const userInventory = currentUser.inventory || [];
        let defaultItemHTML, defaultItemId;

        if (type === 'frame') {
            defaultItemId = null; // Firestore uses 'null'
            defaultItemHTML = (
                <div
                    className={`equip-item ${currentUser.equippedFrame === null ? 'selected' : ''}`}
                    onClick={() => equipItem('frame', 'null')}
                >
                    {/* ... (كود عرض الإطار الافتراضي زي ما هو) ... */}
                     <div className="avatar-wrapper no-frame w-20 h-20 flex items-center justify-center bg-gray-200 rounded-full text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                    </div>
                    <p>بلا إطار</p>
                </div>
            );
        } else if (type === 'background') {
            defaultItemId = 'bg-classic';
            defaultItemHTML = (
                <div
                    className={`equip-item ${currentUser.equippedBackground === 'bg-classic' ? 'selected' : ''}`}
                    onClick={() => equipItem('background', 'bg-classic')}
                >
                    {/* --- FIX IS HERE (For Default Background) --- */}
                    {/* نستخدم className مباشرة */}
                    <div className="w-full h-16 rounded-lg bg-classic border-2 border-gray-300 shadow-inner"></div>
                    {/* --- END FIX --- */}
                    <p>الأساسية</p>
                </div>
            );
        }

        const items = Object.keys(STORE_ITEMS).map(itemId => {
            const item = STORE_ITEMS[itemId];
            if (item.type !== type || !userInventory.includes(itemId)) return null;

            let previewElement = null; // هنستخدم متغير لعنصر الـ preview

            if(type === 'frame') {
                previewElement = ( // JSX مباشرة للإطارات
                    <div className={`avatar-wrapper ${item.style} w-20 h-20 flex items-center justify-center rounded-full`}>
                        <img src={currentUser.photoURL} className="w-16 h-16 rounded-full" alt="avatar preview"/>
                    </div>
                );
            } else if (type === 'background') {
                 // --- FIX IS HERE (For Purchased Backgrounds) ---
                 // نستخدم className مباشرة بدل dangerouslySetInnerHTML
                 previewElement = (
                     <div className={`w-full h-16 rounded-lg ${item.style} border-2 border-gray-300 shadow-inner relative overflow-hidden bg-cover bg-center`}>
                         {/* ممكن نضيف عناصر داخلية لو الخلفية بتحتاجها */}
                     </div>
                 );
                 // --- END FIX ---
            }

            return (
                <div
                    key={item.style} // Use item.style or itemId as key
                    className={`equip-item ${currentUser[type === 'frame' ? 'equippedFrame' : 'equippedBackground'] === item.style ? 'selected' : ''}`}
                    onClick={() => equipItem(type, item.style)}
                >
                    {previewElement} {/* نعرض عنصر الـ preview هنا */}
                    <p>{item.name}</p>
                </div>
            );
        }).filter(Boolean); // Filter out nulls

        return (
            <>
                {defaultItemHTML}
                {items}
            </>
        );
    };

    // Helper to render avatar uploader
    const renderCustomAvatarUploader = () => {
        if (hasCustomAvatarFeature && storage) {
            return (
                <>
                    <img id="custom-avatar-preview" src={customAvatarPreview} className="w-24 h-24 rounded-full border-4 border-gray-200 mb-2 mx-auto bg-white object-cover" alt="Custom Avatar Preview" />
                    <input type="file" id="custom-avatar-input" accept="image/*" className="hidden" onChange={handleAvatarFileSelect} />
                    <label htmlFor="custom-avatar-input" className="btn btn-secondary cursor-pointer">اختر صورة</label>
                    <p className="text-xs text-gray-500 mt-1">الحجم الأقصى: 1 ميجابايت</p>
                </>
            );
        } else if (hasCustomAvatarFeature && !storage) {
             return <p className="text-red-500 text-sm">ميزة رفع الصور معطلة. يجب على المطور إضافة مكتبة Firebase Storage.</p>;
        } else {
            return (
                <>
                    <p className="text-gray-600 mb-3">افتح ميزة رفع صورتك الخاصة من المتجر!</p>
                    <button onClick={() => showScreen('store')} className="btn btn-play">اذهب للمتجر</button>
                </>
            );
        }
    };

    return (
        <div id="profile-screen" className="screen active w-full h-full flex-col items-center justify-center p-4">
            <div className="main-container w-full max-w-6xl p-4 sm:p-8 relative">
                <button onClick={() => showScreen('mainMenu')} className="btn btn-secondary absolute top-4 left-4">رجوع</button>
                <h2 className="font-brand text-4xl text-center mb-6 text-blue-800">الملف الشخصي</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Info, Stats, Save */}
                    <div className="space-y-4">
                        <input 
                            type="text" 
                            id="profile-name-input" 
                            className="w-full p-3 text-center input-field text-xl" 
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                        />
                        
                        <div className="bg-gray-100/80 p-4 rounded-lg text-center">
                            <h3 className="font-bold text-lg mb-2">الصورة الرمزية</h3>
                            {renderCustomAvatarUploader()}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-center">
     <div className="bg-blue-50/80 p-3 rounded-lg"><p className="text-2xl font-bold text-blue-800">{userStats.totalMatches || 0}</p><p className="text-gray-500 text-sm">إجمالي المباريات</p></div>
    <div className="bg-green-50/80 p-3 rounded-lg"><p className="text-2xl font-bold text-green-800">{userStats.wins || 0}</p><p className="text-gray-500 text-sm">مرات الفوز</p></div>
</div>
                         <button onClick={saveProfile} id="save-profile-btn" className={`btn btn-play w-full py-3 text-xl mt-4 ${isLoading ? 'hidden' : ''}`}>
                            حفظ التغييرات
                         </button>
                         <div id="upload-spinner" className={`w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto ${!isLoading ? 'hidden' : ''}`}></div>
                    </div>
                    
                    {/* Right Column: Tabs (Avatars, Frames, Backgrounds) */}
                    <div className="lg:col-span-2">
                         <div className="tabs-container flex flex-col w-full">
                            <div className="flex justify-center border-b-2 mb-4">
                                <button className={`tab-button ${activeTab === 'avatars' ? 'active' : ''}`} onClick={() => setActiveTab('avatars')}>الصور الرمزية</button>
                                <button className={`tab-button ${activeTab === 'frames' ? 'active' : ''}`} onClick={() => setActiveTab('frames')}>الإطارات</button>
                                <button className={`tab-button ${activeTab === 'backgrounds' ? 'active' : ''}`} onClick={() => setActiveTab('backgrounds')}>الخلفيات</button>
                            </div>
                            <div className="flex-grow overflow-y-auto relative bg-gray-100/80 p-4 rounded-lg min-h-[400px]">
                                <div className={`tab-content ${activeTab === 'avatars' ? 'active' : ''}`}>
                                    <div id="avatar-selection" className="grid grid-cols-5 sm:grid-cols-7 gap-3">
                                        {Array.from({ length: AVATAR_COUNT }, (_, i) => {
                                            const avatarUrl = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${i + 1}`;
                                            return (
                                                <img
                                                    key={i}
                                                    src={avatarUrl}
                                                    alt={`Avatar ${i+1}`}
                                                    className={`w-16 h-16 cursor-pointer avatar-pick bg-white rounded-full border-4 border-transparent transition-all duration-200 ${selectedAvatarUrl === avatarUrl ? 'selected' : ''}`}
                                                    onClick={() => selectDefaultAvatar(avatarUrl)}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className={`tab-content ${activeTab === 'frames' ? 'active' : ''}`}>
                                     <div id="frame-inventory" className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                        {renderInventory('frame')}
                                     </div>
                                </div>
                                 <div className={`tab-content ${activeTab === 'backgrounds' ? 'active' : ''}`}>
                                     <div id="background-inventory" className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {renderInventory('background')}
                                     </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}