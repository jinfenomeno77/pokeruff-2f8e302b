import { Link, useLocation } from "react-router-dom";
import { Home, Trophy, Clock, Shield } from "lucide-react";

const items = [
  { path: "/", label: "Início", icon: Home, suit: "♥" },
  { path: "/tournaments", label: "Torneios", icon: Trophy, suit: "♠" },
  { path: "/structure", label: "Estrutura", icon: Clock, suit: "♣" },
  { path: "/admin", label: "Admin", icon: Shield, suit: "♦" },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-background/95 backdrop-blur-md">
      <div className="flex items-center justify-around py-2">
        {items.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex flex-col items-center gap-0.5 rounded-md px-3 py-1 transition-colors ${
                active
                  ? "text-foreground bg-crimson/15 ring-1 ring-crimson/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="flex items-center gap-0.5 text-[10px] font-medium">
                {item.label}
                <span
                  aria-hidden
                  className="w-0 overflow-hidden text-crimson opacity-0 transition-all duration-200 group-hover:w-2 group-hover:opacity-100 group-active:w-2 group-active:opacity-100 group-focus-visible:w-2 group-focus-visible:opacity-100"
                >
                  {item.suit}
                </span>
              </span>
            </Link>

          );
        })}
      </div>
    </nav>
  );
}
