import LeadManagementDashboard from '@/components/chat/LeadManagementDashboard';

export default function DashboardPage() {
  // In a real app, these would come from authentication
  const managerId = 'manager-123';
  const managerName = 'Support Manager';

  return (
    <LeadManagementDashboard
      managerId={managerId}
      managerName={managerName}
    />
  );
}
