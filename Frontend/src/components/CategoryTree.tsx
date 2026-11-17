import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { CategoryNode } from '../types';

interface CategoryTreeProps {
  categories: CategoryNode[];
  activeCategory?: string;
  activeSubcategory?: string;
}

export const CategoryTree: React.FC<CategoryTreeProps> = ({
  categories,
  activeCategory,
  activeSubcategory,
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (activeCategory) {
      initial[activeCategory] = true;
    }
    return initial;
  });

  const toggleExpand = (slug: string) => {
    setExpanded((prev) => ({ ...prev, [slug]: !prev[slug] }));
  };

  return (
    <nav className="w-full text-sm" aria-label="Categories">
      <div className="text-xs font-semibold uppercase tracking-wider text-secondary pb-1 hairline-b mb-1">
        Categories
      </div>
      <ul className="space-y-0.5">
        <li>
          <Link
            to="/items"
            className={`block py-0.5 hover:underline ${
              !activeCategory ? 'font-semibold text-primary' : 'text-primary'
            }`}
          >
            All Items
          </Link>
        </li>
        {categories.map((cat) => {
          const isCatActive = activeCategory === cat.slug;
          const isExpanded = expanded[cat.slug] || isCatActive;

          return (
            <li key={cat.id} className="py-0.5">
              <div className="flex items-center justify-between">
                <Link
                  to={`/items?category=${cat.slug}`}
                  className={`hover:underline flex-1 truncate ${
                    isCatActive && !activeSubcategory
                      ? 'font-semibold text-primary'
                      : 'text-primary'
                  }`}
                >
                  {cat.label}
                </Link>
                {cat.children && cat.children.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(cat.slug)}
                    className="px-1 text-secondary hover:text-primary text-xs"
                    aria-label={`Toggle ${cat.label}`}
                  >
                    {isExpanded ? '−' : '+'}
                  </button>
                )}
              </div>

              {isExpanded && cat.children && (
                <ul className="pl-2 border-l border-hairline mt-0.5 space-y-0.5">
                  {cat.children.map((sub) => {
                    const isSubActive =
                      activeCategory === cat.slug && activeSubcategory === sub.slug;
                    return (
                      <li key={sub.id}>
                        <Link
                          to={`/items?category=${cat.slug}&subcategory=${sub.slug}`}
                          className={`block py-0.5 text-xs hover:underline truncate ${
                            isSubActive
                              ? 'font-semibold text-primary'
                              : 'text-secondary hover:text-primary'
                          }`}
                        >
                          {sub.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
