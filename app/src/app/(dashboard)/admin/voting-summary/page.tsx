import { Metadata } from 'next';
import VotingSummaryManagement from '@/components/admin/VotingSummaryManagement';

export const metadata: Metadata = {
  title: 'Voting Summary Management | Arc Board Management',
  description: 'Manage voting summary emails, templates, and system settings',
};

export default function VotingSummaryPage() {
  return (
    <div className="container mx-auto py-6">
      <VotingSummaryManagement />
    </div>
  );
}