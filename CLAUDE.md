# Project: 데이터 분석 웹 앱

## 개요
CSV / XLSX 파일을 업로드해 통계 분석·시각화하는 Next.js 웹 앱.

---

## 실행 / 빌드

```bash
npm run dev      # 개발 서버 (기본 포트 3000)
npm run build    # 프로덕션 빌드
npx tsc --noEmit # 타입 체크만
```

> WSL2 + `/mnt/d` 경로에서 Next.js 설치 시 경로 길이 제한 문제 발생 가능.
> node_modules를 Linux 파일시스템에 두고 심볼릭 링크 사용 중:
> `~/.npm-workspaces/dataAnalysis_01-2605 → ./node_modules`

---

## 기술 스택

| 역할 | 라이브러리 |
|------|-----------|
| 프레임워크 | Next.js 15 (App Router) + TypeScript |
| 스타일링 | Tailwind CSS 4 |
| 차트 | Recharts 3 |
| CSV 파싱 | PapaParse 5 |
| XLSX 파싱 | SheetJS (xlsx) |
| 전역 상태 | Zustand 5 |

---

## 폴더 구조 & 역할

```
app/
  layout.tsx          사이드바 + 헤더 포함 루트 레이아웃
  page.tsx            activeMenu 값으로 뷰 라우팅 (if/return 패턴)

components/layout/    Sidebar, Header (레이아웃 전용)
components/upload/    FileUpload
components/analysis/  SummaryCards, ColumnInfoTable, DataPreview
components/cleaning/  DataCleaning
components/visualization/ VisualizationView
components/correlation/   CorrelationView

lib/
  types.ts            모든 공유 타입 + STRATEGY_LABELS 상수
  utils.ts            순수 유틸 함수 (sampleArray 등)
  parsers.ts          CSV/XLSX → ParsedData 변환
  analysis.ts         타입 판별·통계 계산 (순수 함수)
  cleaning.ts         결측치·이상치 처리 (순수 함수)
  correlation.ts      Pearson 상관계수 계산 (순수 함수)

store/
  dataStore.ts        Zustand 전역 상태
```

---

## 핵심 규칙

### 메뉴 추가 방법
1. `components/layout/Sidebar.tsx`의 `menuItems` 배열에 항목 추가
2. `app/page.tsx`에 `if (activeMenu === "새ID") return <새뷰 />;` 추가
3. `requiresData: true`이면 파일 미업로드 시 자동 비활성화됨

### 분석 로직
- **반드시 `lib/` 파일에 순수 함수로 작성** — UI 컴포넌트 안에 계산 로직 넣지 않기
- 컴포넌트에서는 `useMemo`로 감싸서 호출
- 샘플링이 필요하면 `lib/utils.ts`의 `sampleArray` 사용 (새로 만들지 말 것)

### 전역 상태 구조
```ts
data: ParsedData | null           // 원본 (setData 시 cleanedData 자동 초기화)
cleanedData: ParsedData | null    // 정제본
activeDataSource: "original" | "cleaned"
activeMenu: string
```
- 시각화·상관관계 뷰는 `activeDataSource`에 따라 `data` 또는 `cleanedData` 사용
- 새 파일 업로드 시 `cleanedData`가 있으면 FileUpload에서 경고 먼저 표시

### 타입 정의
- 새 타입은 `lib/types.ts`에 추가
- 레이블 상수(예: `STRATEGY_LABELS`)도 `lib/types.ts`에 함께 둠

### 코드 스타일
- 컴포넌트 파일: `"use client"` 맨 위
- 차트 컴포넌트: Recharts `ResponsiveContainer` 필수 래핑
- 결측치 판별: `lib/cleaning.ts`의 `isMissing()` 함수 재사용
- 숫자 변환: `lib/cleaning.ts`의 `toNumber()` 함수 재사용

---

## 주의사항

- `alert()` / `confirm()` 사용 금지 — 인라인 배너나 상태 메시지 사용
- 컬럼 정보 표·미리보기에서 긴 텍스트는 `truncate` + `title` 속성으로 툴팁 제공
- 이상치 탐지(`detectOutliers`)는 값이 4개 미만인 컬럼에서 빈 결과 반환함 — UI에서 처리 필요
- `mode()` 동률 시 `localeCompare` 기준 알파벳순 첫 번째 값 반환 (결정론적)
