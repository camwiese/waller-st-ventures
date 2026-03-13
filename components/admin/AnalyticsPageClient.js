"use client";

import AnalyticsTable from "./AnalyticsTable";
import { useAdminContext } from "./AdminContextProvider";

export default function AnalyticsPageClient({ initialData }) {
  const adminContext = useAdminContext();
  return (
    <AnalyticsTable
      summary={initialData.summary}
      investors={initialData.investors || []}
      totalInvestors={initialData.totalInvestors || 0}
      allowedEmails={[]}
      accessRequestsNew={[]}
      notificationRecipients={[]}
      initialShareTokens={initialData.shareTokens || []}
      actionGroups={
        initialData.actionGroups || {
          activeNow: [],
          followUpNow: [],
          heatingUpList: [],
          staleHighIntent: [],
        }
      }
      adminContext={adminContext}
    />
  );
}
