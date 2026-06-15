import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Save } from 'lucide-react';

function Toggle({ label, description, defaultChecked = false }: { label: string; description: string; defaultChecked?: boolean }) {
  const [enabled, setEnabled] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => setEnabled(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function InputField({ label, defaultValue, type = 'text' }: { label: string; defaultValue: string; type?: string }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <input
        type={type}
        defaultValue={defaultValue}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
      />
    </div>
  );
}

export function Settings() {
  return (
    <div>
      <PageHeader
        title="Settings"
        action={
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            <Save size={15} />
            Save Changes
          </button>
        }
      />

      <div className="max-w-2xl">
        <SectionCard title="Platform Settings">
          <Toggle label="User Registration" description="Allow new users to sign up on the platform" defaultChecked />
          <Toggle label="Creator Onboarding" description="Enable creator onboarding flow for new users" defaultChecked />
          <Toggle label="Business Onboarding" description="Enable business registration and onboarding" defaultChecked />
          <Toggle label="Campaign Auto-Approval" description="Automatically approve campaigns that meet all criteria" />
          <Toggle label="Payment Escrow" description="Hold payments in escrow until campaign completion" defaultChecked />
        </SectionCard>

        <SectionCard title="Notification Settings">
          <Toggle label="Email Notifications" description="Send email alerts for reports and user flags" defaultChecked />
          <Toggle label="New Report Alerts" description="Notify admins immediately when a new report is filed" defaultChecked />
          <Toggle label="Payment Failure Alerts" description="Alert admin team when a payment fails" defaultChecked />
          <Toggle label="Weekly Summary Email" description="Send a weekly digest of platform activity" />
        </SectionCard>

        <SectionCard title="Platform Information">
          <InputField label="Platform Name" defaultValue="CreatorHub" />
          <InputField label="Support Email" defaultValue="support@creatorhub.com" type="email" />
          <InputField label="Platform Commission (%)" defaultValue="12" type="number" />
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Platform Description</label>
            <textarea
              rows={3}
              defaultValue="CreatorHub connects brands with top creators for authentic campaigns."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
            />
          </div>
        </SectionCard>

        <SectionCard title="Security">
          <Toggle label="Two-Factor Authentication" description="Require 2FA for all admin accounts" defaultChecked />
          <Toggle label="IP Allowlisting" description="Restrict admin access to approved IP addresses" />
          <Toggle label="Audit Logging" description="Log all admin actions for compliance" defaultChecked />
          <Toggle label="Session Timeout" description="Automatically log out inactive sessions after 30 minutes" defaultChecked />
        </SectionCard>
      </div>
    </div>
  );
}
