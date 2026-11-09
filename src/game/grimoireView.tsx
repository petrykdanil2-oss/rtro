import React from 'react';
import { Spell, ALL_SPELLS } from './spells';

interface GrimoireModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignedSpellIds: (string | null)[];
  onAssignSpell: (slotIndex: number, spellId: string | null) => void;
  resonance: number;
  magicGuard: number;
}

const ITEMS_PER_PAGE = 4;

export const GrimoireModal: React.FC<GrimoireModalProps> = ({
  isOpen,
  onClose,
  assignedSpellIds,
  onAssignSpell,
  resonance,
  magicGuard,
}) => {
  const [selectedSpell, setSelectedSpell] = React.useState<Spell | null>(null);
  const [pageIndex, setPageIndex] = React.useState<number>(0);
  const [draggedSpellId, setDraggedSpellId] = React.useState<string | null>(null);

  // Сортировка или группировка: сначала малые, потом большие знаки
  const allSpells = ALL_SPELLS;
  const totalPages = Math.ceil(allSpells.length / ITEMS_PER_PAGE);

  // Удерживаем pageIndex в допустимых границах
  const currentPage = Math.min(Math.max(0, pageIndex), Math.max(0, totalPages - 1));
  const currentSpells = allSpells.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  // Расчет шанса срыва d100
  const currentThreshold = Math.max(0, resonance - magicGuard * 2);
  const mishapChancePercent = Math.min(100, currentThreshold);

  // Листание колесиком мыши
  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY > 20) {
      // Скролл вниз -> следующая страница
      if (currentPage < totalPages - 1) {
        setPageIndex(currentPage + 1);
      }
    } else if (e.deltaY < -20) {
      // Скролл вверх -> предыдущая страница
      if (currentPage > 0) {
        setPageIndex(currentPage - 1);
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, spellId: string) => {
    e.dataTransfer.setData('text/plain', spellId);
    setDraggedSpellId(spellId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();
    const spellId = e.dataTransfer.getData('text/plain') || draggedSpellId;
    if (spellId) {
      onAssignSpell(slotIndex, spellId);
    }
    setDraggedSpellId(null);
  };

  if (!isOpen) return null;

  return (
    <div
      onWheel={handleWheel}
      className="absolute inset-0 bg-black/85 backdrop-blur-[4px] flex flex-col items-center justify-center p-3 z-40 select-none overflow-hidden"
    >
      {/* Контейнер книги и слотов */}
      <div className="relative max-w-4xl w-full flex flex-col items-center space-y-3">
        {/* Верхняя строка статуса книги: Название, Нагнетание, Кнопка закрытия */}
        <div className="w-full bg-[#1b120c] border border-[#523821] px-4 py-2 rounded flex items-center justify-between text-xs shadow-md">
          <div className="flex items-center gap-3">
            <span className="font-serif text-sm font-bold tracking-wider text-[#e5c158]">
              ГРИМУАР ВЕЧНОГО ПЕПЛА
            </span>
            <span className="text-[#785b37]">·</span>
            <span className="text-[#a855f7] font-semibold">
              Защита духа: +{magicGuard} (срезает {magicGuard * 2}% риска)
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[#baa485]">Нагнетание:</span>
              <div className="w-28 h-2.5 bg-[#0f0906] border border-[#5c3e24] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    resonance > 40 ? 'bg-[#ef4444]' : resonance > 20 ? 'bg-[#f59e0b]' : 'bg-[#a855f7]'
                  }`}
                  style={{ width: `${Math.min(100, resonance)}%` }}
                />
              </div>
              <span className="font-bold tabular-nums text-[#fef08a]">{Math.floor(resonance)} / 100</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[#baa485]">Риск срыва:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  mishapChancePercent > 0
                    ? 'bg-[#5c1313] text-[#fca5a5] border border-[#991b1b]'
                    : 'bg-[#144222] text-[#86efac] border border-[#166534]'
                }`}
              >
                {mishapChancePercent > 0 ? `${mishapChancePercent}%` : '0% (Безопасно)'}
              </span>
            </div>

            <button
              onClick={onClose}
              className="px-3 py-1 bg-[#2b180d] hover:bg-[#4a2a16] border border-[#a17840] text-[#fef08a] text-xs font-serif cursor-pointer shadow transition-colors"
            >
              Закрыть [G]
            </button>
          </div>
        </div>

        {/* НАСТОЯЩАЯ КНИГА: Кожаный переплёт, два разворота страниц */}
        <div className="relative w-full bg-[#27150a] border-4 border-[#140b05] rounded-xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] p-3">
          {/* Тонкий золотой орнамент по углам обложки */}
          <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-[#d4af37] pointer-events-none" />
          <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-[#d4af37] pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-[#d4af37] pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-[#d4af37] pointer-events-none" />

          {/* Центральный желоб корешка (аккуратная линия сгиба) */}
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-3 bg-gradient-to-r from-black/25 via-black/40 to-black/25 pointer-events-none z-20 shadow-[0_0_10px_rgba(0,0,0,0.5)]" />

          {/* Разворот двух страниц */}
          <div className="grid grid-cols-2 rounded-lg overflow-hidden border border-[#8a6840] shadow-inner bg-[#f1dfbf]">
            {/* ЛЕВАЯ СТРАНИЦА: Список заклинаний с крупными иконками и листанием */}
            <div className="p-5 flex flex-col justify-between border-r border-[#ba9a70] bg-gradient-to-r from-[#e7d4b4] to-[#f4e4c9] text-[#2c1b0c] min-h-[390px]">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b-2 border-[#9b774a] pb-1.5">
                  <span className="font-serif font-bold text-sm tracking-wide text-[#422309]">
                    СТРАНИЦА ЗНАКОВ
                  </span>
                  <span className="text-[11px] font-serif text-[#785b37]">
                    Стр. {currentPage + 1} из {totalPages}
                  </span>
                </div>

                {/* Список заклинаний (4 на страницу без скролла) */}
                <div className="space-y-2.5">
                  {currentSpells.map((s) => {
                    const isSelected = selectedSpell?.id === s.id;
                    const isMinor = s.circle === 'minor';

                    return (
                      <div
                        key={s.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, s.id)}
                        onClick={() => setSelectedSpell(s)}
                        className={`group relative p-2.5 border-2 rounded-sm cursor-grab active:cursor-grabbing transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#fff7ea] border-[#8c531b] shadow-[0_3px_10px_rgba(140,83,27,0.35)] scale-[1.01]'
                            : 'bg-[#ecd8b6] hover:bg-[#f5e5cc] border-[#b8976c]'
                        }`}
                      >
                        {/* Левая часть: Крупная иконка + Название */}
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-md border-2 border-[#452711] flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform"
                            style={{
                              backgroundColor: s.color,
                              boxShadow: `0 0 10px ${s.color}66`,
                            }}
                          >
                            {/* Символ круга внутри иконки */}
                            <span className="text-white text-xs font-bold drop-shadow-[0_1px_2px_#000]">
                              {isMinor ? 'I' : 'II'}
                            </span>
                          </div>

                          <div className="text-left">
                            <div className="font-serif text-xs font-bold text-[#2d1807]">
                              {s.name}
                            </div>
                            <div className="text-[10px] text-[#73512e] font-serif">
                              {isMinor ? 'Малый Знак' : 'Большой Знак'}
                            </div>
                          </div>
                        </div>

                        {/* Правая часть: Нагнетание и КД */}
                        <div className="text-right flex flex-col items-end">
                          <span
                            className={`text-[11px] font-bold ${
                              isMinor ? 'text-[#7e22ce]' : 'text-[#b91c1c]'
                            }`}
                          >
                            +{s.resonance} Нагн.
                          </span>
                          <span className="text-[10px] text-[#785b37]">{s.cooldown} сек</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Пагинация (стрелочки влево/вправо и подсказка про колесико) */}
              <div className="pt-3 border-t border-[#ba9a70] flex items-center justify-between">
                <button
                  disabled={currentPage === 0}
                  onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                  className={`px-3 py-1 font-serif text-xs font-bold border rounded transition-all ${
                    currentPage === 0
                      ? 'opacity-35 cursor-not-allowed border-[#b89c74] text-[#785b37]'
                      : 'bg-[#402410] text-[#fef08a] border-[#8a5722] hover:bg-[#5a3417] cursor-pointer shadow'
                  }`}
                >
                  ◀ Предыдущая
                </button>

                <span className="text-[10px] italic text-[#785b37]">Колёсико мыши листает</span>

                <button
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                  className={`px-3 py-1 font-serif text-xs font-bold border rounded transition-all ${
                    currentPage >= totalPages - 1
                      ? 'opacity-35 cursor-not-allowed border-[#b89c74] text-[#785b37]'
                      : 'bg-[#402410] text-[#fef08a] border-[#8a5722] hover:bg-[#5a3417] cursor-pointer shadow'
                  }`}
                >
                  Следующая ▶
                </button>
              </div>
            </div>

            {/* ПРАВАЯ СТРАНИЦА: Подробная информация (пусто, пока не кликнули) */}
            <div className="p-5 flex flex-col justify-between bg-gradient-to-r from-[#f4e4c9] to-[#e7d4b4] text-[#2c1b0c] min-h-[390px]">
              {selectedSpell ? (
                <div className="space-y-4">
                  {/* Заголовок заклинания с крупным бейджем */}
                  <div className="flex items-center gap-3.5 border-b-2 border-[#9b774a] pb-3">
                    <div
                      className="w-12 h-12 rounded-lg border-2 border-[#3d1f08] flex items-center justify-center flex-shrink-0 shadow-lg"
                      style={{
                        backgroundColor: selectedSpell.color,
                        boxShadow: `0 0 16px ${selectedSpell.color}88`,
                      }}
                    >
                      <div className="w-4 h-4 rounded-full bg-white/80 shadow" />
                    </div>
                    <div>
                      <h3 className="font-serif text-base font-bold text-[#301704]">
                        {selectedSpell.name}
                      </h3>
                      <p className="text-xs text-[#785b37] font-serif italic">
                        {selectedSpell.circle === 'minor'
                          ? 'Малый Знак — безопасное начертание'
                          : 'Большой Знак — мощное разрушительное плетение'}
                      </p>
                    </div>
                  </div>

                  {/* Атмосферное описание */}
                  <div className="bg-[#e9d6b5]/80 p-3 rounded border border-[#b8976c] font-serif text-xs leading-relaxed text-[#3d2510] italic">
                    «{selectedSpell.description}»
                  </div>

                  {/* Таблица параметров */}
                  <div className="bg-[#f9ebd3] p-3 rounded border border-[#ba9a70] space-y-2 font-serif text-xs">
                    <div className="flex justify-between border-b border-[#e1cbb0] pb-1.5">
                      <span className="text-[#634320]">Нагнетание риска:</span>
                      <span className="font-bold text-[#7e22ce]">+{selectedSpell.resonance} ед.</span>
                    </div>

                    {selectedSpell.damage && (
                      <div className="flex justify-between border-b border-[#e1cbb0] pb-1.5">
                        <span className="text-[#634320]">Прямой урон:</span>
                        <span className="font-bold text-[#b91c1c]">{selectedSpell.damage} ед.</span>
                      </div>
                    )}

                    {selectedSpell.heal && (
                      <div className="flex justify-between border-b border-[#e1cbb0] pb-1.5">
                        <span className="text-[#634320]">Исцеление плоти:</span>
                        <span className="font-bold text-[#15803d]">+{selectedSpell.heal} HP</span>
                      </div>
                    )}

                    <div className="flex justify-between border-b border-[#e1cbb0] pb-1.5">
                      <span className="text-[#634320]">Время восстановления:</span>
                      <span className="font-bold text-[#b45309]">{selectedSpell.cooldown} сек</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[#634320]">Стихия заклятия:</span>
                      <span className="font-bold uppercase text-[#452711]">{selectedSpell.element}</span>
                    </div>
                  </div>

                  <div className="text-[11px] font-serif text-[#785b37] bg-[#edd9b9] p-2 rounded border border-[#b8976c] text-center">
                    💡 <span className="font-semibold">Перетащите</span> этот знак мышью в нижние слоты [1 – 5]
                  </div>
                </div>
              ) : (
                /* Состояние покоя: когда заклинание ещё не выбрано */
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 my-auto">
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#a37f52] flex items-center justify-center text-[#856134] text-2xl font-serif">
                    ✧
                  </div>
                  <div className="font-serif text-sm font-bold text-[#5c3c1e]">
                    Страница пуста
                  </div>
                  <p className="font-serif text-xs text-[#785b37] max-w-[240px] italic">
                    Выберите заклинание на левой странице, чтобы прочесть древние руны и изучить его эффекты.
                  </p>
                </div>
              )}

              {/* Мудрость на полях страницы */}
              <div className="text-[10px] font-serif text-[#785b37] border-t border-[#ba9a70] pt-2 italic text-center">
                «Знание рун бережёт рассудок от срыва.»
              </div>
            </div>
          </div>
        </div>

        {/* СЛОТЫ БЫСТРОГО ДОСТУПА: Отдельная плашка СНИЗУ ПОД КНИГОЙ */}
        <div className="w-full bg-[#180e07] border-2 border-[#573d23] rounded-lg p-3 shadow-xl">
          <div className="font-serif text-xs font-bold text-[#e5c158] mb-2 flex items-center justify-between">
            <span>Слоты быстрого начертания [Клавиши 1 – 5]</span>
            <span className="text-[10px] text-[#a8957c] font-normal font-sans">
              Перетащите заклинание из книги в слот · ПКМ для очистки
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2.5">
            {[0, 1, 2, 3, 4].map((slotIdx) => {
              const spellId = assignedSpellIds[slotIdx];
              const spell = ALL_SPELLS.find((s) => s.id === spellId);

              return (
                <div
                  key={slotIdx}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, slotIdx)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onAssignSpell(slotIdx, null);
                  }}
                  className={`relative h-14 border-2 rounded p-1.5 flex flex-col items-center justify-center transition-all ${
                    spell
                      ? 'bg-[#2b170c] hover:bg-[#3d2212] border-[#e5c158] cursor-pointer shadow-[0_2px_10px_rgba(0,0,0,0.8)]'
                      : 'bg-[#120a05] border-[#4a321c] border-dashed hover:border-[#8c6536]'
                  }`}
                  title={
                    spell
                      ? `${spell.name} [Клавиша ${slotIdx + 1}]`
                      : `Слот ${slotIdx + 1} (Перетащите заклинание сюда)`
                  }
                >
                  <span className="absolute top-1 left-1.5 font-serif text-[10px] font-bold text-[#9e7d4d]">
                    {slotIdx + 1}
                  </span>

                  {spell ? (
                    <>
                      <div
                        className="w-4 h-4 rounded-md mb-0.5 shadow flex-shrink-0"
                        style={{
                          backgroundColor: spell.color,
                          boxShadow: `0 0 8px ${spell.color}`,
                        }}
                      />
                      <span className="font-serif text-[11px] font-bold text-[#fef08a] truncate max-w-[120px] leading-tight">
                        {spell.name}
                      </span>
                      <span className="text-[9px] text-[#f59e0b] leading-none mt-0.5">
                        +{spell.resonance} Нагн.
                      </span>
                    </>
                  ) : (
                    <span className="font-serif text-[11px] text-[#5e432a] italic">Пусто</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
