import { Camera, CalendarDays, Target, Utensils } from 'lucide-react';

export type AppTab = 'jurnal' | 'istoric' | 'obiective';

interface HeaderProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onQuickScan: () => void;
}

export function Header({ activeTab, onSelectTab, onQuickScan }: HeaderProps) {
  const navItems: Array<{ id: AppTab; label: string }> = [
    { id: 'jurnal', label: 'Jurnal azi' },
    { id: 'istoric', label: 'Istoric' },
    { id: 'obiective', label: 'Obiective' },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#F7F7F5]/90 backdrop-blur-md border-b border-[#E6E6E1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => onSelectTab('jurnal')}
            className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#141714] whitespace-nowrap shrink-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#166534] rounded"
          >
            NutriFoto
          </button>

          <nav aria-label="Navigare principală" className="hidden md:flex items-center gap-7">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#166534] rounded ${
                    isActive
                      ? 'text-[#141714]'
                      : 'text-[#5A605A] hover:text-[#141714]'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 right-0 -bottom-[1px] h-0.5 bg-[#166534]"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onQuickScan}
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] text-sm font-medium text-white bg-[#166534] hover:bg-[#14532D] rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#166534]"
            >
              <Camera className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Scanează masa</span>
            </button>
          </div>
        </div>
      </header>

      <nav
        aria-label="Navigare mobilă"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-white/95 backdrop-blur-md border-t border-[#E6E6E1] grid grid-cols-3"
      >
        <button
          type="button"
          onClick={() => onSelectTab('jurnal')}
          aria-current={activeTab === 'jurnal' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors ${
            activeTab === 'jurnal' ? 'text-[#166534] font-semibold' : 'text-[#5A605A]'
          }`}
        >
          <Utensils className="w-4 h-4" aria-hidden="true" />
          <span className="text-[11px] whitespace-nowrap">Jurnal azi</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('istoric')}
          aria-current={activeTab === 'istoric' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors ${
            activeTab === 'istoric' ? 'text-[#166534] font-semibold' : 'text-[#5A605A]'
          }`}
        >
          <CalendarDays className="w-4 h-4" aria-hidden="true" />
          <span className="text-[11px] whitespace-nowrap">Istoric</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('obiective')}
          aria-current={activeTab === 'obiective' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors ${
            activeTab === 'obiective' ? 'text-[#166534] font-semibold' : 'text-[#5A605A]'
          }`}
        >
          <Target className="w-4 h-4" aria-hidden="true" />
          <span className="text-[11px] whitespace-nowrap">Obiective</span>
        </button>
      </nav>
    </>
  );
}
