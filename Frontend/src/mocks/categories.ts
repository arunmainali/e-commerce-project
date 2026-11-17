import type { CategoryNode } from '../types';

export const categories: CategoryNode[] = [
  {
    id: 'cat-1',
    label: 'Antiques',
    slug: 'antiques',
    children: [
      { id: 'cat-1-1', label: 'Decorative Arts', slug: 'decorative-arts' },
      { id: 'cat-1-2', label: 'Metalware', slug: 'metalware' },
      { id: 'cat-1-3', label: 'Textiles', slug: 'textiles' },
      { id: 'cat-1-4', label: 'Scientific Instruments', slug: 'scientific-instruments' },
    ],
  },
  {
    id: 'cat-2',
    label: 'Furniture',
    slug: 'furniture',
    children: [
      { id: 'cat-2-1', label: 'Tables', slug: 'tables' },
      { id: 'cat-2-2', label: 'Chairs & Seating', slug: 'chairs-seating' },
      { id: 'cat-2-3', label: 'Cabinets & Storage', slug: 'cabinets-storage' },
      { id: 'cat-2-4', label: 'Desks', slug: 'desks' },
    ],
  },
  {
    id: 'cat-3',
    label: 'Ceramics & Glass',
    slug: 'ceramics-glass',
    children: [
      { id: 'cat-3-1', label: 'Porcelain', slug: 'porcelain' },
      { id: 'cat-3-2', label: 'Pottery', slug: 'pottery' },
      { id: 'cat-3-3', label: 'Art Glass', slug: 'art-glass' },
      { id: 'cat-3-4', label: 'Stoneware', slug: 'stoneware' },
    ],
  },
  {
    id: 'cat-4',
    label: 'Clocks & Watches',
    slug: 'clocks-watches',
    children: [
      { id: 'cat-4-1', label: 'Mantel Clocks', slug: 'mantel-clocks' },
      { id: 'cat-4-2', label: 'Wall Clocks', slug: 'wall-clocks' },
      { id: 'cat-4-3', label: 'Pocket Watches', slug: 'pocket-watches' },
      { id: 'cat-4-4', label: 'Wristwatches', slug: 'wristwatches' },
    ],
  },
  {
    id: 'cat-5',
    label: 'Art',
    slug: 'art',
    children: [
      { id: 'cat-5-1', label: 'Paintings', slug: 'paintings' },
      { id: 'cat-5-2', label: 'Prints', slug: 'prints' },
      { id: 'cat-5-3', label: 'Sculpture', slug: 'sculpture' },
      { id: 'cat-5-4', label: 'Photography', slug: 'photography' },
    ],
  },
  {
    id: 'cat-6',
    label: 'Jewellery',
    slug: 'jewellery',
    children: [
      { id: 'cat-6-1', label: 'Rings', slug: 'rings' },
      { id: 'cat-6-2', label: 'Necklaces', slug: 'necklaces' },
      { id: 'cat-6-3', label: 'Brooches', slug: 'brooches' },
      { id: 'cat-6-4', label: 'Watches', slug: 'jewellery-watches' },
    ],
  },
  {
    id: 'cat-7',
    label: 'Books & Maps',
    slug: 'books-maps',
    children: [
      { id: 'cat-7-1', label: 'Rare Books', slug: 'rare-books' },
      { id: 'cat-7-2', label: 'Maps & Atlases', slug: 'maps-atlases' },
      { id: 'cat-7-3', label: 'Manuscripts', slug: 'manuscripts' },
    ],
  },
  {
    id: 'cat-8',
    label: 'General',
    slug: 'general',
    children: [
      { id: 'cat-8-1', label: 'Collectibles', slug: 'collectibles' },
      { id: 'cat-8-2', label: 'Vintage Electronics', slug: 'vintage-electronics' },
      { id: 'cat-8-3', label: 'Tools & Equipment', slug: 'tools-equipment' },
      { id: 'cat-8-4', label: 'Miscellaneous', slug: 'miscellaneous' },
    ],
  },
];
