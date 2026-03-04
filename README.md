# ISO 45001 시스템 스튜디오 (GitHub Pages 배포용)

## 1) 내 PC에서 한 번 실행(테스트)
1. Node.js 설치 (LTS)
2. 터미널에서:
   - `npm install`
   - `npm run dev`

## 2) Firebase 설정 넣기
- `.env.example`을 복사해서 `.env.local` 파일 생성 후 값 채우기
- 예: `VITE_FIREBASE_PROJECT_ID=...`

## 3) GitHub Pages 자동 배포(가장 쉬움)
1. 이 폴더를 GitHub 새 저장소에 업로드(또는 push)
2. GitHub 저장소 → **Settings → Pages**
3. **Build and deployment → Source** 를 **GitHub Actions** 로 선택
4. main 브랜치에 push 하면 자동 배포됩니다.

배포 주소:
`https://<github-username>.github.io/<repo-name>/`
