import React, { useState } from 'react';
import { initializeApp } from 'firebase/app';
import { addDoc, collection, getFirestore, getDocs } from 'firebase/firestore';

// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyDSAIEVR_5wKhw2gumkpYXm2urtIY47pYI",
    authDomain: "study21.firebaseapp.com",
    projectId: "study21",
    storageBucket: "study21.appspot.com",
    messagingSenderId: "422619551959",
    appId: "1:422619551959:web:09862523b64bc6f9fdb892"
};

// 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function FirebaseTest() {
    const [status, setStatus] = useState("대기 중...");
    const [users, setUsers] = useState([]);

    // 데이터 추가 함수
    const handleAddData = async () => {
        setStatus("데이터 추가 중...");
        try {
            const docRef = await addDoc(collection(db, "users"), {
                first: "길동",
                last: "김",
                born: Math.floor(Math.random() * (2005 - 1950 + 1)) + 1950 // 랜덤 출생연도
            });
            setStatus(`성공! 추가된 문서 ID: ${docRef.id}`);
        } catch (e) {
            console.error("Error adding document: ", e);
            setStatus(`에러 발생: ${e.message}`);
        }
    };

    // 데이터 불러오기 함수 (잘 들어갔는지 확인용)
    const handleFetchData = async () => {
        setStatus("데이터 불러오는 중...");
        try {
            const querySnapshot = await getDocs(collection(db, "users"));
            const usersData = [];
            querySnapshot.forEach((doc) => {
                usersData.push({ id: doc.id, ...doc.data() });
            });
            setUsers(usersData);
            setStatus(`총 ${usersData.length}개의 데이터를 불러왔습니다.`);
        } catch (e) {
            console.error("Error fetching documents: ", e);
            setStatus(`에러 발생: ${e.message}`);
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>Firestore 테스트</h1>

            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={handleAddData}
                    style={{ padding: '10px 20px', marginRight: '10px', cursor: 'pointer' }}
                >
                    데이터 추가하기
                </button>
                <button
                    onClick={handleFetchData}
                    style={{ padding: '10px 20px', cursor: 'pointer' }}
                >
                    데이터 불러오기
                </button>
            </div>

            <div style={{
                padding: '15px',
                backgroundColor: '#f0f0f0',
                borderRadius: '8px',
                marginBottom: '20px'
            }}>
                <strong>상태:</strong> {status}
            </div>

            {users.length > 0 && (
                <div>
                    <h3>저장된 데이터 목록:</h3>
                    <ul>
                        {users.map((user) => (
                            <li key={user.id}>
                                ID: {user.id} - 이름: {user.last}{user.first} (출생: {user.born}년)
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default FirebaseTest;
