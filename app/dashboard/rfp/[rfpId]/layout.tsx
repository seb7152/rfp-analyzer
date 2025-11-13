import { ReactNode } from "react";

export default function RFPLayout({
  children,
  params: _params,
}: {
  children: ReactNode;
  params: { rfpId: string };
}) {
  return <>{children}</>;
}
