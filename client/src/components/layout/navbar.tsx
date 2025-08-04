import { Link, useLocation } from "wouter";
import { Users, Mail, Zap, BarChart3, Upload } from "lucide-react"; // <-- ADDED 'Upload' icon

export default function Navbar() {
  const [location] = useLocation();

  const navItems = [
    {
      id: 'bulk-import',
      path: '/bulk-import-audience',
      label: 'Bulk Import Audience',
      icon: Users
    },
    {
      id: 'single-import', // <-- ADDED THIS NEW NAVIGATION ITEM
      path: '/single-import',
      label: 'Single Import Audience',
      icon: Upload
    },
    {
      id: 'send-email',
      path: '/send-transactional-email',
      label: 'Send Transactional Email',
      icon: Mail
    },
    {
      id: 'analytics',
      path: '/analytics',
      label: 'Analytics Dashboard',
      icon: BarChart3
    }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-blue-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Loops.so Admin Panel
            </h1>
          </Link>
          
          <div className="flex space-x-1">
            {navItems.map((item) => {
              const isActive = location === item.path || (location === '/' && item.path === '/bulk-import-audience');
              const Icon = item.icon;
              
              return (
                <Link key={item.id} href={item.path}>
                  <button
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 text-sm ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-lg'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}