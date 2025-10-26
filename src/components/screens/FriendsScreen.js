import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFirebase } from '../../contexts/FirebaseContext';
import { useUI } from '../../contexts/UIContext';

export default function FriendsScreen({ showScreen }) {
    const { currentUser } = useAuth();
    const { db, firebase } = useFirebase();
    const { showNotification } = useUI();

    // States
    const [activeTab, setActiveTab] = useState('my-friends');
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loadingFriends, setLoadingFriends] = useState(true);
    const [searchInput, setSearchInput] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [allPlayers, setAllPlayers] = useState([]);
    const [loadingAllPlayers, setLoadingAllPlayers] = useState(false);

    // Listener للأصدقاء والطلبات
    useEffect(() => {
        if (!currentUser) return;
        setLoadingFriends(true);

        const q = db.collection("friendships").where("users", "array-contains", currentUser.uid);
        
        const unsubscribe = q.onSnapshot(async (snapshot) => {
            const friendsList = [];
            const requestsList = [];
            
            // عشان نجيب بيانات اليوزر المقابل
            const promises = snapshot.docs.map(async (doc) => {
                const friendship = doc.data();
                const friendUid = friendship.users.find(uid => uid !== currentUser.uid);
                
                try {
                    const userDoc = await db.collection('users').doc(friendUid).get();
                    if (!userDoc.exists) return;
                    
                    const friendData = userDoc.data();
                    const friendshipData = { id: doc.id, ...friendData };

                    if (friendship.status === 'accepted') {
                        friendsList.push(friendshipData);
                    } else if (friendship.status === 'pending' && friendship.requestedBy !== currentUser.uid) {
                        requestsList.push(friendshipData);
                    }
                } catch (e) {
                    console.error("Error fetching friend data:", e);
                }
            });

            await Promise.all(promises); // نستنى كل بيانات الأصدقاء تتحمل
            
            setFriends(friendsList);
            setRequests(requestsList);
            setLoadingFriends(false);
        });

        return () => unsubscribe();
    }, [currentUser, db]);

    // دالة البحث عن لاعبين
    const searchUsers = async () => {
        if (!searchInput) {
            setSearchResults([]);
            return;
        }
        setLoadingSearch(true);
        await renderPlayerList(
            db.collection("users").where("displayName", ">=", searchInput).where("displayName", "<=", searchInput + '\uf8ff').limit(10),
            setSearchResults
        );
        setLoadingSearch(false);
    };
    
    // دالة تحميل كل اللاعبين
    const loadAllPlayers = async () => {
        setLoadingAllPlayers(true);
        await renderPlayerList(
            db.collection("users").orderBy("displayName").limit(50),
            setAllPlayers
        );
        setLoadingAllPlayers(false);
    };

    // دالة مساعدة لعرض قوايم اللاعبين (بحث أو كل اللاعبين)
    const renderPlayerList = async (query, stateSetter) => {
        try {
            const querySnapshot = await query.get();
            
            // 1. نجيب كل علاقاتنا مرة واحدة
            const friendshipsQuery = db.collection("friendships").where("users", "array-contains", currentUser.uid);
            const friendshipsSnapshot = await friendshipsQuery.get();
            const friendshipStatuses = {};
            friendshipsSnapshot.forEach(doc => {
                const friendship = doc.data();
                const friendUid = friendship.users.find(uid => uid !== currentUser.uid);
                friendshipStatuses[friendUid] = friendship.status;
            });

            // 2. نجهز قايمة اللاعبين
            const players = querySnapshot.docs
                .map(doc => doc.data())
                .filter(user => user.uid !== currentUser.uid) // نشيل نفسنا
                .map(user => ({
                    ...user,
                    friendStatus: friendshipStatuses[user.uid] // نضيف حالة الصداقة
                }));

            stateSetter(players);
        } catch (error) {
            console.error("Error rendering player list:", error);
            showNotification("حدث خطأ أثناء تحميل اللاعبين", false);
        }
    };
    
    // دوال التعامل مع الصداقة
    const sendFriendRequest = async (targetUid) => {
        try {
            const friendshipId = [currentUser.uid, targetUid].sort().join('_');
            const friendshipRef = db.collection("friendships").doc(friendshipId);

            await friendshipRef.set({
                users: [currentUser.uid, targetUid],
                status: 'pending',
                requestedBy: currentUser.uid,
            });
            
            showNotification("تم إرسال طلب الصداقة بنجاح!");
            // نحدث القوايم
            if (activeTab === 'add-friend') searchUsers();
            if (activeTab === 'all-players') loadAllPlayers();

        } catch (error) {
            console.error("Error sending friend request:", error);
            showNotification("حدث خطأ أثناء إرسال الطلب.", false);
        }
    };

    const acceptFriendRequest = async (friendshipId) => {
        const friendshipRef = db.collection("friendships").doc(friendshipId);
        await friendshipRef.update({ status: 'accepted' });
        showNotification("تم قبول طلب الصداقة!");
    };

    const deleteFriendship = async (friendshipId) => {
        const friendshipRef = db.collection("friendships").doc(friendshipId);
        await friendshipRef.delete();
        showNotification("تم تحديث العلاقة.");
    };

    // --- دوال العرض (Render Functions) ---

    const renderPlayerItem = (user, context) => {
        let buttonHtml = null;
        if (context === 'search' || context === 'all-players') {
            const { friendStatus } = user;
            if (friendStatus === 'accepted') {
                buttonHtml = <span className="text-green-500 font-bold">صديق</span>;
            } else if (friendStatus === 'pending') {
                buttonHtml = <span className="text-gray-500">تم الإرسال</span>;
            } else {
                buttonHtml = <button onClick={() => sendFriendRequest(user.uid)} className="btn btn-play px-3 py-1 text-sm">إضافة</button>;
            }
        } else if (context === 'friend') {
            buttonHtml = <button onClick={() => deleteFriendship(user.id)} className="btn btn-secondary text-red-500 px-2 py-1 text-xs">إزالة</button>;
        } else if (context === 'request') {
            buttonHtml = (
                <div className="flex gap-1">
                    <button onClick={() => acceptFriendRequest(user.id)} className="btn btn-play bg-green-500 text-white px-2 py-1 text-xs">قبول</button>
                    <button onClick={() => deleteFriendship(user.id)} className="btn btn-secondary px-2 py-1 text-xs">رفض</button>
                </div>
            );
        }

        return (
            <div key={user.uid} className="bg-white p-2 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                     <div className={`avatar-wrapper ${user.equippedFrame || ''}`}>
                       <img src={user.photoURL} className="w-10 h-10 rounded-full" alt="avatar"/>
                    </div>
                    <span className="font-bold">{user.displayName}</span>
                </div>
                {buttonHtml}
            </div>
        );
    };

    return (
        <div id="friends-screen" className="screen active w-full h-full flex-col p-4 md:p-6 main-container">
            <header className="flex justify-between items-center mb-4">
                <button onClick={() => showScreen('mainMenu')} className="btn btn-secondary">القائمة الرئيسية</button>
                <h2 className="font-brand text-4xl text-center text-blue-800">الأصدقاء</h2>
                <div className="w-40"></div>
            </header>
            
            <div className="flex flex-col w-full flex-grow tabs-container">
                <div className="flex justify-center border-b-2 mb-4">
                    <button className={`tab-button ${activeTab === 'my-friends' ? 'active' : ''}`} onClick={() => setActiveTab('my-friends')}>أصدقائي</button>
                    <button className={`tab-button ${activeTab === 'add-friend' ? 'active' : ''}`} onClick={() => setActiveTab('add-friend')}>إضافة صديق</button>
                    <button className={`tab-button ${activeTab === 'all-players' ? 'active' : ''}`} onClick={() => { setActiveTab('all-players'); loadAllPlayers(); }}>كل اللاعبين</button>
                </div>
                
                <div className="flex-grow overflow-y-auto relative">
                    {/* Tab 1: My Friends */}
                    <div className={`tab-content ${activeTab === 'my-friends' ? 'active' : ''} flex-col md:flex-row gap-4 h-full w-full`}>
                        <div className="w-full md:w-1/2 bg-blue-100/80 p-3 rounded-lg flex-grow flex flex-col">
                            <h3 className="font-bold text-lg text-center mb-2">قائمة الأصدقاء</h3>
                            <div id="friends-list" className="flex-grow overflow-y-auto space-y-2">
                                {loadingFriends ? <p>التحميل...</p> : (friends.length === 0 ? <p className="text-center text-gray-500 mt-4">ليس لديك أصدقاء بعد.</p> : friends.map(user => renderPlayerItem(user, 'friend')))}
                            </div>
                        </div>
                        <div className="w-full md:w-1/2 bg-yellow-100/80 p-3 rounded-lg flex-grow flex flex-col">
                            <h3 className="font-bold text-lg text-center mb-2">طلبات الصداقة</h3>
                            <div id="friend-requests-list" className="flex-grow overflow-y-auto space-y-2">
                                {loadingFriends ? <p>التحميل...</p> : (requests.length === 0 ? <p className="text-center text-gray-500 mt-4">لا توجد طلبات صداقة.</p> : requests.map(user => renderPlayerItem(user, 'request')))}
                            </div>
                        </div>
                    </div>

                    {/* Tab 2: Add Friend (Search) */}
                    <div className={`tab-content ${activeTab === 'add-friend' ? 'active' : ''} flex-col w-full`}>
                         <div className="bg-blue-100/80 p-3 rounded-lg flex flex-col">
                            <h3 className="font-bold text-lg text-center mb-2">البحث عن لاعب</h3>
                            <div className="flex gap-2 mb-3">
                                <input 
                                    type="text" 
                                    id="search-user-input" 
                                    placeholder="ابحث بالاسم..." 
                                    className="input-field flex-grow"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                />
                                <button onClick={searchUsers} className="btn btn-play" disabled={loadingSearch}>
                                    {loadingSearch ? '...' : 'بحث'}
                                </button>
                            </div>
                            <div id="search-results" className="flex-grow overflow-y-auto space-y-2">
                               {loadingSearch ? <p>جاري البحث...</p> : (searchResults.length === 0 ? <p className="text-center text-gray-500 mt-4">ابحث عن لاعبين لإضافتهم كأصدقاء.</p> : searchResults.map(user => renderPlayerItem(user, 'search')))}
                            </div>
                        </div>
                    </div>

                    {/* Tab 3: All Players */}
                    <div className={`tab-content ${activeTab === 'all-players' ? 'active' : ''} flex-col w-full`}>
                        <div id="all-players-list" className="bg-blue-100/80 p-3 rounded-lg flex-grow overflow-y-auto space-y-2">
                            {loadingAllPlayers ? <p className="text-center text-gray-500 mt-4">يتم تحميل اللاعبين...</p> : (allPlayers.length === 0 ? <p className="text-center text-gray-500 mt-4">لم يتم العثور على لاعبين.</p> : allPlayers.map(user => renderPlayerItem(user, 'all-players')))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}