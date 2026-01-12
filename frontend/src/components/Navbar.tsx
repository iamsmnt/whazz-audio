import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Settings, User, AudioWaveform } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSettings = () => {
    // TODO: Navigate to settings page when implemented
    console.log('Settings clicked');
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-teal-100 px-6 py-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo/Brand */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-teal-500 to-cyan-600 p-2 rounded-xl shadow-md">
            <AudioWaveform className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Whazz Audio</span>
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-3 text-slate-700 hover:bg-teal-50 font-semibold px-4 py-2 rounded-xl"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-md">
                <User className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-bold">{user.username}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 bg-white/95 backdrop-blur-xl border border-teal-100 rounded-xl p-2 shadow-xl">
            <DropdownMenuLabel className="px-3 py-2">
              <div className="flex flex-col space-y-1">
                <p className="text-base font-bold text-slate-800">{user.username}</p>
                <p className="text-xs text-slate-600 font-medium">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-teal-100 my-2" />
            <DropdownMenuItem
              onClick={handleSettings}
              className="cursor-pointer hover:bg-teal-50 focus:bg-teal-50 text-slate-700 rounded-lg px-3 py-2 font-semibold"
            >
              <Settings className="w-4 h-4 mr-3 text-teal-600" strokeWidth={2.5} />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer hover:bg-red-50 focus:bg-red-50 text-red-600 rounded-lg px-3 py-2 font-semibold"
            >
              <LogOut className="w-4 h-4 mr-3" strokeWidth={2.5} />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
