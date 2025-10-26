import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFirebase } from '../../contexts/FirebaseContext';
import { useUI } from '../../contexts/UIContext';
import { STORE_ITEMS } from '../../data/constants'; // <-- هنجيب الأغراض من هنا

export default function StoreScreen({ showScreen }) {
    const { currentUser, setCurrentUser } = useAuth(); // جبنا setCurrentUser عشان نحدث الفلوس
    const { db, firebase } = useFirebase(); // جبنا firebase عشان الـ FieldValue
    const { showNotification, playSound } = useUI();
    const [activeTab, setActiveTab] = useState('frame'); // الحالة دي خاصة بالمتجر بس

    const userStats = currentUser.stats || {};
    const userInventory = currentUser.inventory || [];

    // دي دالة شراء الأغراض (نفس اللوجيك القديم بس بـ Context)
    const buyItem = async (itemId) => {
        const item = STORE_ITEMS[itemId];
        if (!item) return showNotification("منتج غير موجود", false);
        
        playSound('buy', 'E5');
        const userDocRef = db.collection("users").doc(currentUser.uid);

        try {
            await db.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userDocRef);
                if (!userDoc.exists) throw new Error("المستخدم غير موجود");

                const userData = userDoc.data();
                const userCoins = userData.stats.coins || 0;
                const inventory = userData.inventory || [];

                if (userCoins < item.price) throw new Error("ليس لديك عملات كافية!");
                if (inventory.includes(itemId)) throw new Error("أنت تمتلك هذا المنتج بالفعل!");

                transaction.update(userDocRef, {
                    'stats.coins': firebase.firestore.FieldValue.increment(-item.price),
                    inventory: firebase.firestore.FieldValue.arrayUnion(itemId)
                });
            });

            // لو النجاح، حدث بيانات اللاعب في التطبيق فوراً
            setCurrentUser(prevUser => ({
                ...prevUser,
                stats: {
                    ...prevUser.stats,
                    coins: prevUser.stats.coins - item.price
                },
                inventory: [...prevUser.inventory, itemId]
            }));

            showNotification(`تم شراء "${item.name}" بنجاح!`, true);
            // تحديث الفلوس المعروضة هيحصل لوحده عشان الـ state اتغير
        } catch (error) {
            console.error("Error buying item: ", error);
            showNotification(error.message, false);
        }
    };


    const renderStoreItems = () => {
        const itemsToRender = Object.keys(STORE_ITEMS).filter(
            (itemId) => STORE_ITEMS[itemId].type === activeTab
        );

        if (itemsToRender.length === 0) {
            return <p className="text-center text-gray-500 col-span-full">لا توجد أغراض في هذا القسم.</p>;
        }

        return itemsToRender.map(itemId => {
            const item = STORE_ITEMS[itemId];
            const alreadyOwned = userInventory.includes(itemId);

            let previewElement = null; // هنستخدم متغير لعنصر الـ preview

            if (item.type === 'frame') {
                 previewElement = ( // هنرجع JSX مباشرةً
                    <div className={`avatar-wrapper ${item.style} w-24 h-24 flex items-center justify-center rounded-full mb-3`}>
                        <img src={currentUser.photoURL} className="w-20 h-20 rounded-full" alt="avatar preview"/>
                    </div>
                 );
            } else if (item.type === 'background') {
                 // --- FIX IS HERE ---
                 // نستخدم className بدل dangerouslySetInnerHTML للخلفيات
                 previewElement = (
                     <div className={`w-full h-24 rounded-lg ${item.style} mb-3 border-2 border-white shadow-inner relative overflow-hidden bg-cover bg-center`}>
                         {/* ممكن نضيف هنا أي عناصر داخلية لو الخلفية بتحتاجها */}
                     </div>
                 );
                 // --- END FIX ---
            } else if (item.type === 'tool' || item.type === 'feature') {
                  // هنا dangerouslySetInnerHTML صح عشان الأيقونة SVG string
                 previewElement = (
                     <div className="w-24 h-24 flex items-center justify-center text-5xl bg-gray-100 rounded-full mb-3"
                          dangerouslySetInnerHTML={{ __html: item.icon }}>
                     </div>
                 );
            }

            return (
                <div key={itemId} className="bg-white p-4 rounded-lg flex flex-col items-center justify-between text-center transition-transform hover:scale-105 shadow-md">
                    {/* نعرض عنصر الـ preview هنا */}
                    {previewElement}

                    <h3 className="font-bold text-lg text-blue-800">{item.name}</h3>
                    <div className="flex items-center gap-2 my-3">
                        <span className="font-bold text-xl text-yellow-500">${item.price}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400"><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"></path><path d="M13 12.586 14.707 14l-1.414 1.414-2.293-2.293a1 1 0 0 1 0-1.414l2.293-2.293L14.707 10 13 11.707V8h-2v4.586L9.293 14l-1.414 1.414L10 17.707a.999.999 0 0 1 0 1.414L7.707 21.414 9.121 22.828 11 21l2-2 2 2 1.414-1.414-2.293-2.293a1 1 0 0 1 0-1.414z"></path></svg>
                    </div>
                    <button
                        onClick={() => buyItem(itemId)}
                        className={`btn ${alreadyOwned ? 'btn-secondary' : 'btn-play'} w-full`}
                        disabled={alreadyOwned}
                    >
                        {alreadyOwned ? 'تم الشراء' : 'شراء'}
                    </button>
                </div>
            );
        });
    };

    return (
        <div id="store-screen" className="screen active w-full h-full flex-col p-4 md:p-6 main-container">
            <header className="flex justify-between items-center mb-4">
                <button onClick={() => showScreen('mainMenu')} className="btn btn-secondary">القائمة الرئيسية</button>
                <h2 className="font-brand text-4xl text-center text-blue-800">المتجر</h2>
                <div className="flex items-center gap-2 bg-blue-100/80 p-2 rounded-full text-blue-800">
                    <span id="user-coins-display" className="font-bold text-lg">{userStats.coins || 0}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400"><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"></path><path d="M13 12.586 14.707 14l-1.414 1.414-2.293-2.293a1 1 0 0 1 0-1.414l2.293-2.293L14.707 10 13 11.707V8h-2v4.586L9.293 14l-1.414 1.414L10 17.707a.999.999 0 0 1 0 1.414L7.707 21.414 9.121 22.828 11 21l2-2 2 2 1.414-1.414-2.293-2.293a1 1 0 0 1 0-1.414z"></path></svg>
                </div>
            </header>
            <div id="store-tabs" className="tabs-container flex-grow flex flex-col">
                <div className="flex justify-center border-b-2 mb-4">
                    <button className={`tab-button ${activeTab === 'frame' ? 'active' : ''}`} onClick={() => setActiveTab('frame')}>الإطارات</button>
                    <button className={`tab-button ${activeTab === 'background' ? 'active' : ''}`} onClick={() => setActiveTab('background')}>الخلفيات</button>
                    <button className={`tab-button ${activeTab === 'tool' ? 'active' : ''}`} onClick={() => setActiveTab('tool')}>الأدوات</button>
                    <button className={`tab-button ${activeTab === 'feature' ? 'active' : ''}`} onClick={() => setActiveTab('feature')}>مميزات</button>
                </div>
                <div className="flex-grow overflow-y-auto p-4 bg-blue-100/80 rounded-lg">
                    <div id="store-items-list" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {renderStoreItems()}
                    </div>
                </div>
            </div>
        </div>
    );
}