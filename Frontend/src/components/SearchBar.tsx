import React, { useState, useEffect, useRef } from 'react';
import { itemsService } from '../services/itemsService';
import type { Item } from '../types';

interface SearchBarProps {
  onSelect?: (item: Item) => void;
  initialQuery?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSelect, initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<Item[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await itemsService.search(query);
        setSuggestions(results);
        setIsOpen(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          className="input-field pr-8"
          placeholder="Search items, eras, makers…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="search-suggestions-list"
        />
        {isLoading && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-secondary">
            ...
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul
          id="search-suggestions-list"
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 bg-background border border-hairline z-50 max-h-72 overflow-y-auto"
        >
          {suggestions.map((item) => (
            <li
              key={item.id}
              role="option"
              aria-selected={false}
              className="px-2 py-1.5 hover:bg-surface cursor-pointer hairline-b flex items-center justify-between text-sm"
              onClick={() => {
                setIsOpen(false);
                if (onSelect) {
                  onSelect(item);
                }
              }}
            >
              <div className="truncate">
                <span className="font-medium text-primary">{item.title}</span>
                <span className="ml-2 text-xs text-secondary">
                  [{item.specs.era ?? item.category}]
                </span>
              </div>
              <div className="text-xs text-secondary flex-shrink-0 ml-2">
                Lot {item.lotNumber}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
