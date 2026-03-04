export function getFirebaseConfig() {
  // ✅ 가장 쉬운 방법(추천): 아래에 Firebase Web App Config를 그대로 붙여넣기
  // Firebase Console → Project settings → Your apps(Web) → config

  const hardcoded = {
    // apiKey: "AIzaSy....",
    // authDomain: "xxxx.firebaseapp.com",
    // projectId: "xxxx",
    // storageBucket: "xxxx.appspot.com",
    // messagingSenderId: "1234567890",
    // appId: "1:1234567890:web:abcdef",
  }

  // ✅ (선택) 환경변수 방식: .env.local 또는 GitHub Actions env로 주입
  const envCfg = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  }

  const cfg = (hardcoded.apiKey ? hardcoded : envCfg)

  const missing = Object.entries(cfg).filter(([_, v]) => !v).map(([k]) => k)
  if (missing.length) {
    console.warn(
      "[Firebase] 설정이 비어 있습니다. src/firebaseConfig.js에 붙여넣거나(.env.local 사용) 값을 채워주세요. 누락:",
      missing.join(", ")
    )
  }
  return cfg
}
