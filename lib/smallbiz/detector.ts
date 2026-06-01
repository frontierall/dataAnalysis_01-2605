import type { SmallBizColumnMap } from "./types";

const REQUIRED_SIGNALS = ["구분", "회원", "이용타입", "금액", "발생일시"];

export function detectSmallBizData(columns: string[]): boolean {
  const matched = REQUIRED_SIGNALS.filter((sig) =>
    columns.some((col) => col.includes(sig))
  );
  return matched.length >= 4;
}

function findCol(columns: string[], ...candidates: string[]): string | null {
  for (const c of candidates) {
    const found = columns.find((col) => col.includes(c));
    if (found) return found;
  }
  return null;
}

export function mapSmallBizColumns(columns: string[]): SmallBizColumnMap | null {
  const datetime = findCol(columns, "발생일시", "일시", "날짜", "거래일");
  const memberName = findCol(columns, "회원", "이름", "고객");
  const txType = findCol(columns, "구분", "거래구분");
  const usageType = findCol(columns, "이용타입", "상품유형", "타입");
  const productName = findCol(columns, "상품명", "상품이름", "상품");
  const amount = findCol(columns, "금액", "결제금액", "매출");
  const payMethod = findCol(columns, "지불방법", "결제방법", "결제수단");
  const coupon = findCol(columns, "쿠폰");

  if (!datetime || !memberName || !txType || !amount) return null;

  return {
    datetime,
    memberName,
    txType,
    usageType: usageType ?? "",
    productName: productName ?? "",
    amount,
    payMethod: payMethod ?? "",
    coupon,
  };
}
