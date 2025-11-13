import { ReactNode } from "react";

export default function RFPLayout({
  children,
}: {
  children: ReactNode;
  params: { rfpId: string };
}) {
  return <>{children}</>;
}
