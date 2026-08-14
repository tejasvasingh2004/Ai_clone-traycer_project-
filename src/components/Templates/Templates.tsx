import { useState } from 'react';
import {
  Search,
  Star,
  Clock,
  Users,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../../store/AppContext';

const templateCategories = [
  { id: 'all', label: 'All Templates' },
  { id: 'frontend', label: 'Frontend' },
  { id: 'backend', label: 'Backend' },
  { id: 'fullstack', label: 'Full Stack' },
  { id: 'mobile', label: 'Mobile' },
  { id: 'ai', label: 'AI/ML' },
];

const templates = [
  {
    id: '1',
    name: 'React + TypeScript',
    description: 'Modern React application with Vite, TypeScript, and Tailwind CSS',
    category: 'frontend',
    icon: '⚛️',
    stars: 2453,
    uses: 12453,
    lastUpdated: '2 days ago',
    technologies: ['React', 'TypeScript', 'Vite', 'Tailwind'],
    accent: 'from-blue-500 to-cyan-500',
  },
  {
    id: '2',
    name: 'Next.js Full Stack',
    description: 'Full-stack application with Next.js 14, Prisma, and PostgreSQL',
    category: 'fullstack',
    icon: '▲',
    stars: 1876,
    uses: 8932,
    lastUpdated: '5 hours ago',
    technologies: ['Next.js', 'Prisma', 'PostgreSQL', 'Tailwind'],
    accent: 'from-gray-700 to-gray-900',
  },
  {
    id: '3',
    name: 'Python FastAPI',
    description: 'High-performance Python backend with FastAPI and SQLAlchemy',
    category: 'backend',
    icon: '🐍',
    stars: 1523,
    uses: 6543,
    lastUpdated: '1 week ago',
    technologies: ['Python', 'FastAPI', 'SQLAlchemy', 'Pydantic'],
    accent: 'from-green-500 to-emerald-500',
  },
  {
    id: '4',
    name: 'AI Chat Application',
    description: 'GPT-powered chat application with streaming responses',
    category: 'ai',
    icon: '🤖',
    stars: 3245,
    uses: 15643,
    lastUpdated: '3 days ago',
    technologies: ['OpenAI', 'Next.js', 'Vercel AI SDK', 'Tailwind'],
    accent: 'from-purple-500 to-pink-500',
  },
  {
    id: '5',
    name: 'React Native App',
    description: 'Cross-platform mobile app with Expo and React Native',
    category: 'mobile',
    icon: '📱',
    stars: 987,
    uses: 4321,
    lastUpdated: '2 weeks ago',
    technologies: ['React Native', 'Expo', 'TypeScript'],
    accent: 'from-cyan-500 to-blue-500',
  },
  {
    id: '6',
    name: 'Rust Web Server',
    description: 'High-performance web server with Actix and Diesel',
    category: 'backend',
    icon: '🦀',
    stars: 1243,
    uses: 3254,
    lastUpdated: '4 days ago',
    technologies: ['Rust', 'Actix', 'Diesel', 'PostgreSQL'],
    accent: 'from-orange-500 to-red-500',
  },
];

export function Templates() {
  const { createPlan, setCurrentPage } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [isCreating, setIsCreating] = useState(false);

  const handleTemplateClick = async (template: typeof templates[0]) => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const taskDescription = `Template: ${template.name}. Description: ${template.description}. Technologies: ${template.technologies.join(', ')}.`;
      await createPlan(taskDescription, false);
      setCurrentPage('workspaces');
    } catch (error) {
      console.error('Failed to instantiate template plan:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = category === 'all' || template.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-white mb-2">Templates</h1>
        <p className="text-gray-400">Start building fast with production-ready templates.</p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-12 pr-4 py-3 rounded-lg bg-white/5 border border-white/5 text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {templateCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
                category === cat.id
                  ? 'bg-white/10 text-white border border-white/10'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            onClick={() => handleTemplateClick(template)}
            className="p-6 rounded-xl glass border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${template.accent} flex items-center justify-center text-2xl`}
                >
                  {template.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {template.technologies.slice(0, 3).join(' • ')}
                  </p>
                </div>
              </div>
              <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all opacity-0 group-hover:opacity-100">
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-gray-400 mb-4">{template.description}</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5" />
                  <span>{template.stars.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>{template.uses.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{template.lastUpdated}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex flex-wrap gap-2">
                {template.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="px-2 py-1 text-xs rounded bg-white/5 text-gray-300"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
