# 랜딩 페이지 디자인 스펙

**목표:** 사이트 접속 시 보이는 서비스 소개 메인 페이지

## 구조

- 상단 네비: FactoryCare 로고(텍스트) + 로그인 버튼
- 히어로 영역: 서비스명 + 한 줄 설명 + "시작하기" CTA 버튼
- 특징 카드 3개: 설비 관리 / 점검 관리 / AI 분석

## 라우팅

- `/` → LandingPage (현재 DashboardPage 대신)
- 로그인 버튼 / 시작하기 버튼 → `/login`
- App.tsx 제거 → router가 직접 페이지 렌더링

## 스타일

- Tailwind CSS
- 배경: `slate-900` (다크)
- 포인트: `blue-500`
- 전체 화면 높이 (`min-h-screen`), 스크롤 없음

## 파일

- `frontend/src/pages/LandingPage.tsx` — 신규 생성
- `frontend/src/router/index.tsx` — `/` 경로를 LandingPage로 변경
- `frontend/src/App.tsx` — Vite 기본 템플릿 내용 제거, router outlet으로 교체
