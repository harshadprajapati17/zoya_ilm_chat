import { AnalyticsAuthGate } from '@/components/dashboard/AnalyticsAuthGate';

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AnalyticsAuthGate>{children}</AnalyticsAuthGate>;
}
