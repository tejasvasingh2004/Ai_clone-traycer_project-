import { useEffect } from 'react';
import { User, Palette, ChevronRight } from 'lucide-react';
import { useApp } from '../../store/AppContext';

const sections = [
  {
    id: 'account',
    label: 'Account Settings (Mock)',
    icon: User,
    description: 'Manage mock user profile details',
    items: [
      { label: 'Profile Information', description: 'Illustrative user details' },
      { label: 'Email Preferences', description: 'Manage custom configurations' },
    ],
  },
  {
    id: 'appearance',
    label: 'Appearance (Mock)',
    icon: Palette,
    description: 'Customize layout options',
    items: [
      { label: 'Editor Theme', description: 'Sleek dark mode preset' },
      { label: 'Font Options', description: 'Consolas, 14px' },
    ],
  },
];

export function Settings() {
  const { plans, repositories, fetchPlans, fetchRepositories } = useApp();

  useEffect(() => {
    fetchPlans();
    fetchRepositories();
  }, [fetchPlans, fetchRepositories]);

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-white mb-2">Settings</h1>
        <p className="text-gray-400">View application information and configuration.</p>
      </div>

      {/* Profile Card */}
      <div className="p-6 rounded-xl glass border border-white/5">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">JD</span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-white">Developer User</h2>
            <p className="text-gray-400">developer@workspace.local</p>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/20">
            <span className="text-sm text-blue-400 font-medium">Standard Workspace</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-4 rounded-lg bg-white/5 border border-white/5">
            <p className="text-gray-400 mb-1">Workspaces / Plans</p>
            <p className="text-xl font-semibold text-white">{plans.length}</p>
          </div>
          <div className="p-4 rounded-lg bg-white/5 border border-white/5">
            <p className="text-gray-400 mb-1">Imported Repositories</p>
            <p className="text-xl font-semibold text-white">{repositories.length}</p>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.id} className="rounded-xl glass border border-white/5 overflow-hidden">
              <div className="flex items-center gap-4 p-4 border-b border-white/5">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-white">{section.label}</h3>
                  <p className="text-sm text-gray-500">{section.description}</p>
                </div>
              </div>

              <div className="divide-y divide-white/5">
                {section.items.map((item, index) => (
                  <button
                    key={index}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors cursor-not-allowed"
                    disabled
                  >
                    <div className="text-left">
                      <p className="text-sm text-white">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
