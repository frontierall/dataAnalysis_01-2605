# 데이터 분석 웹 앱

CSV / XLSX 파일을 업로드해서 분석하는 Next.js 기반 웹 애플리케이션입니다.

**GitHub** → https://github.com/frontierall/dataAnalysis_01-2605

---

## 기술 스택

| 역할 | 라이브러리 |
|------|-----------|
| 프레임워크 | Next.js 15 (App Router) + TypeScript |
| 스타일링 | Tailwind CSS 4 |
| 차트 | Recharts 3 |
| CSV 파싱 | PapaParse 5 |
| XLSX 파싱 | SheetJS (xlsx) 0.18 |
| 전역 상태 | Zustand 5 |

---

## 로컬 실행

```bash
npm install
npm run dev        # http://localhost:3000
```

> **WSL2 + Windows 드라이브(/mnt/d) 환경 주의**
> `node_modules` 설치 시 경로 길이 제한 문제가 발생할 수 있습니다.
> 해결책: Linux 파일시스템에 `node_modules` 디렉토리를 만들고 심볼릭 링크를 사용하세요.
> ```bash
> mkdir -p ~/.npm-workspaces/<프로젝트명>
> rm -rf node_modules
> ln -s ~/.npm-workspaces/<프로젝트명> node_modules
> npm install
> ```

---

## 폴더 구조

```
.
├── app/
│   ├── layout.tsx          # 루트 레이아웃 (사이드바 + 헤더 + 메인)
│   ├── page.tsx            # 활성 메뉴에 따라 뷰 라우팅
│   └── globals.css         # Tailwind 임포트
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx     # 좌측 사이드바 (접기/펼치기, menuItems 배열)
│   │   └── Header.tsx      # 상단 파일명 · 행/열 수 표시
│   ├── upload/
│   │   └── FileUpload.tsx  # 드래그앤드롭 업로드 UI
│   ├── analysis/
│   │   ├── SummaryCards.tsx    # 데이터셋 요약 카드 4종
│   │   ├── ColumnInfoTable.tsx # 컬럼별 타입·결측치·범위 표
│   │   └── DataPreview.tsx     # 상위 10행 미리보기 테이블
│   ├── cleaning/
│   │   └── DataCleaning.tsx    # 결측치 처리 + 이상치 탐지 UI
│   ├── visualization/
│   │   └── VisualizationView.tsx   # 히스토그램·바차트·라인차트·산점도
│   └── correlation/
│       └── CorrelationView.tsx     # Pearson 상관계수 히트맵 + 산점도
│
├── lib/
│   ├── types.ts        # 공통 TypeScript 타입 정의
│   ├── parsers.ts      # CSV / XLSX 파싱 함수
│   ├── analysis.ts     # 타입 판별·통계 계산 순수 함수
│   ├── cleaning.ts     # 결측치 대체·이상치 탐지·CSV 다운로드 함수
│   └── correlation.ts  # Pearson 상관계수 계산·색상 매핑 함수
│
└── store/
    └── dataStore.ts    # Zustand 전역 상태 (원본·정제 데이터, 활성 메뉴)
```

---

## 메뉴 구성

사이드바의 메뉴는 `components/layout/Sidebar.tsx` 안의 `menuItems` 배열로 관리합니다.
새 메뉴를 추가하려면 배열에 항목을 추가하고, `app/page.tsx`에 뷰 분기를 추가하면 됩니다.

```ts
// Sidebar.tsx
const menuItems: MenuItem[] = [
  { id: "upload",        label: "파일 업로드",    requiresData: false },
  { id: "analysis",      label: "기본 데이터 분석", requiresData: true },
  { id: "cleaning",      label: "데이터 정제",     requiresData: true },
  { id: "visualization", label: "시각화",          requiresData: true },
  { id: "correlation",   label: "상관관계 분석",    requiresData: true },
];
```

`requiresData: true`인 메뉴는 파일이 업로드되기 전까지 비활성화됩니다.

---

## 주요 기능

### 파일 업로드
- 드래그앤드롭 또는 파일 선택 버튼
- `.csv` → PapaParse, `.xlsx` / `.xls` → SheetJS 자동 분기
- 파싱 결과는 `{ columns: string[], rows: Record<string, unknown>[] }` 형태로 정규화
- 업로드 성공 시 자동으로 "기본 데이터 분석" 화면으로 이동

### 기본 데이터 분석

| 영역 | 내용 |
|------|------|
| 데이터셋 요약 카드 | 총 행·열 수, 결측치 개수·비율 |
| 컬럼 정보 표 | 타입(연속형/범주형/날짜형), 고유값 수, 결측치 수·비율, 범위/예시 |
| 데이터 미리보기 | 상위 10행 (가로 스크롤 지원) |

**컬럼 타입 판별 로직** (`lib/analysis.ts > inferColumnType`):
- 비-결측 샘플의 90% 이상이 숫자 변환 가능 → `연속형(numeric)`
- 비-결측 샘플의 80% 이상이 날짜 패턴 매칭 → `날짜형(datetime)`
- 고유값 20개 이하 또는 전체의 50% 미만 → `범주형(categorical)`

### 데이터 정제

| 기능 | 내용 |
|------|------|
| 결측치 처리 | 컬럼별로 처리 안 함 / 행 삭제 / 평균·중앙·최빈값 대체 선택 |
| 이상치 탐지 | IQR 방식(기본 1.5배) 또는 Z-score 방식, 임계값 직접 입력 |
| 이상치 제거 | 탐지 결과에서 체크박스로 이상치 행 삭제 여부 결정 |
| 결과 저장 | 정제 데이터를 Zustand에 `cleanedData`로 별도 저장 |
| CSV 다운로드 | 원본 또는 정제 데이터를 UTF-8 BOM CSV로 다운로드 |

- 정제 데이터는 원본과 별도로 보관되며, 다른 화면에서 **원본 / 정제본 토글**로 선택 가능

### 시각화

| 조건 | 차트 종류 |
|------|----------|
| 연속형 컬럼 1개 | 히스토그램 (20 구간) |
| 날짜형 컬럼 1개 | 월별 빈도 라인차트 |
| 범주형 컬럼 1개 | 상위 25개 범주 가로 바차트 |
| 수치형 컬럼 2개 | 산점도 (최대 2,000점 샘플링) |

### 상관관계 분석
- 수치형 컬럼 중 분석 대상을 토글 버튼으로 선택
- Pearson 상관계수 계산 (pairwise deletion — 컬럼 쌍마다 유효 행만 사용)
- 히트맵: 양의 상관 → 빨간색, 음의 상관 → 파란색 그라디언트
- 히트맵 셀 클릭 → 해당 두 컬럼 산점도 팝업 (최대 1,500점 샘플링)

---

## 전역 상태 구조 (`store/dataStore.ts`)

```ts
{
  data: ParsedData | null;            // 원본 파싱 데이터
  cleanedData: ParsedData | null;     // 정제 후 데이터
  activeDataSource: "original" | "cleaned";  // 시각화·상관관계에서 사용할 데이터
  activeMenu: string;                 // 현재 활성 메뉴 ID
}
```

---

## 분석 로직 (`lib/`)

모든 계산 함수는 UI와 분리된 순수 함수로 작성되어 단위 테스트가 가능합니다.

| 파일 | 주요 공개 함수 |
|------|--------------|
| `analysis.ts` | `inferColumnType`, `computeColumnStats`, `computeDatasetSummary` |
| `cleaning.ts` | `applyMissingStrategies`, `detectOutliers`, `removeOutlierRows`, `downloadAsCSV` |
| `correlation.ts` | `computeCorrelationMatrix`, `corrColor` |
| `parsers.ts` | `parseCSV`, `parseXLSX`, `parseFile` |

---

## 데이터 흐름

```
파일 선택
  └─ parseFile() [lib/parsers.ts]
       └─ ParsedData → Zustand store.data
            ├─ analysis.ts → 컬럼 통계, 타입 판별
            ├─ cleaning.ts → 결측치 대체, 이상치 제거 → store.cleanedData
            ├─ VisualizationView → Recharts 차트
            └─ CorrelationView → 히트맵 + 산점도
```
