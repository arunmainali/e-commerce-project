import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Toast } from '../components/Toast';
import { SafeImage } from '../components/SafeImage';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { itemsService } from '../services/itemsService';
import { uploadImage } from '../services/api';
import { formatCurrency } from '../utils/format';
import type { CategoryNode, CategorySlug, ItemCondition, PurchaseMode } from '../types';

export const SellPage: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const addToast = useToastStore((state) => state.addToast);

  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form State
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>('auction');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CategorySlug>('antiques');
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');

  // Specs
  const [condition, setCondition] = useState<ItemCondition>('Very Good');
  const [era, setEra] = useState('');
  const [origin, setOrigin] = useState('');
  const [material, setMaterial] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [provenance, setProvenance] = useState('');

  // Auction Specific
  const [startingBid, setStartingBid] = useState<number>(5000);
  const [minimumIncrement, setMinimumIncrement] = useState<number>(500);
  const [durationPreset, setDurationPreset] = useState<'24h' | '3d' | '5d' | '7d' | 'custom'>('3d');
  const [customEndTime, setCustomEndTime] = useState<string>('');

  // Buy Now Specific
  const [price, setPrice] = useState<number>(15000);
  const [stock, setStock] = useState<number>(1);

  // Images
  const [images, setImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Shipping
  const [shippingCost, setShippingCost] = useState<number>(500);
  const [estimatedDays, setEstimatedDays] = useState('3-5 business days');
  const [shippingMethod, setShippingMethod] = useState('Standard insured courier');

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    itemsService.getCategories().then((cats) => {
      setCategories(cats);
      if (cats.length > 0 && cats[0].children && cats[0].children.length > 0) {
        setSubcategory(cats[0].children[0].slug);
      }
    });
  }, []);

  // Update subcategory default when category changes
  const handleCategoryChange = (catSlug: CategorySlug) => {
    setCategory(catSlug);
    const cat = categories.find((c) => c.slug === catSlug);
    if (cat?.children && cat.children.length > 0) {
      setSubcategory(cat.children[0].slug);
    } else {
      setSubcategory(catSlug);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const res = await uploadImage(files[i]);
        if (res.url) {
          setImages((prev) => [...prev, res.url]);
        }
      }
      addToast('Image uploaded successfully', 'success');
    } catch (err: any) {
      addToast(err.message || 'Image upload failed', 'error');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleAddImageUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrlInput.trim()) return;
    setImages((prev) => [...prev, imageUrlInput.trim()]);
    setImageUrlInput('');
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateEndTime = (): string => {
    if (durationPreset === 'custom' && customEndTime) {
      return new Date(customEndTime).toISOString();
    }
    const now = new Date();
    const map = {
      '24h': 24 * 60 * 60 * 1000,
      '3d': 3 * 24 * 60 * 60 * 1000,
      '5d': 5 * 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    };
    return new Date(now.getTime() + (map[durationPreset as keyof typeof map] || map['3d'])).toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      addToast('Please sign in to list items for auction or sale', 'error');
      navigate('/auth');
      return;
    }

    const validation: Record<string, string> = {};
    if (!title.trim()) validation.title = 'Title is required';
    if (!description.trim()) validation.description = 'Description is required';

    if (purchaseMode === 'auction') {
      if (!startingBid || startingBid <= 0) validation.startingBid = 'Starting bid must be > 0';
      if (durationPreset === 'custom' && !customEndTime) validation.customEndTime = 'Select an ending date/time';
    } else {
      if (!price || price <= 0) validation.price = 'Price must be > 0';
      if (!stock || stock <= 0) validation.stock = 'Stock must be at least 1';
    }

    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      addToast('Please correct the highlighted fields', 'error');
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const computedEndTime = purchaseMode === 'auction' ? calculateEndTime() : undefined;
      const createdItem = await itemsService.createItem({
        title: title.trim(),
        category,
        subcategory: subcategory || category,
        description: description.trim(),
        specs: {
          condition,
          era: era.trim() || undefined,
          origin: origin.trim() || undefined,
          material: material.trim() || undefined,
          dimensions: dimensions.trim() || undefined,
          provenance: provenance.trim() || undefined,
        },
        images: images.length > 0 ? images : [
          `https://picsum.photos/seed/${encodeURIComponent(title.slice(0, 10))}/800/600`,
        ],
        purchaseMode,
        startingBid: purchaseMode === 'auction' ? Number(startingBid) : undefined,
        minimumIncrement: purchaseMode === 'auction' ? Number(minimumIncrement) : undefined,
        endTime: computedEndTime,
        price: purchaseMode === 'buy-now' ? Number(price) : undefined,
        stock: purchaseMode === 'buy-now' ? Number(stock) : undefined,
        shippingCost: Number(shippingCost) || 500,
        estimatedDays: estimatedDays.trim() || '3-5 business days',
        shippingMethods: [shippingMethod],
      });

      addToast(`Lot #${createdItem.lotNumber} listed successfully!`, 'success');
      navigate(`/items/${createdItem.id}`);
    } catch (err: any) {
      addToast(err.message || 'Failed to publish item', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedCategoryNode = categories.find((c) => c.slug === category);

  return (
    <div className="min-h-screen flex flex-col bg-background text-primary">
      <Header />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 py-6 text-left">
        {/* Header Breadcrumb / Title */}
        <div className="hairline-b pb-3 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs uppercase tracking-wider text-secondary font-mono">
              Consignment &amp; Catalog Entry
            </div>
            <h1 className="text-xl font-semibold text-primary">List an Item for Auction or Direct Sale</h1>
            <p className="text-xs text-secondary mt-0.5">
              Enter lot specifications. The entry will be immediately published to the live public catalog.
            </p>
          </div>
          {isAuthenticated && (
            <div className="text-xs text-secondary">
              Seller: <span className="font-semibold text-primary">{user?.name}</span> ({user?.email})
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-6">
            {/* Left 8 Cols: Input Form */}
            <div className="col-span-4 md:col-span-8 lg:col-span-8 space-y-6">

              {/* 1. FORMAT SELECTION */}
              <section className="border border-hairline p-4 bg-surface/30">
                <div className="text-xs font-semibold uppercase tracking-wider text-secondary mb-3">
                  1. Format &amp; Selling Mode
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`border p-3 cursor-pointer transition-colors flex items-start gap-3 ${
                      purchaseMode === 'auction'
                        ? 'border-primary bg-background ring-1 ring-primary'
                        : 'border-hairline bg-surface hover:border-secondary'
                    }`}
                  >
                    <input
                      type="radio"
                      name="purchaseMode"
                      value="auction"
                      checked={purchaseMode === 'auction'}
                      onChange={() => setPurchaseMode('auction')}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-semibold text-primary">Auction (Timed Bidding)</div>
                      <div className="text-xs text-secondary mt-1">
                        Open lot to competitive public bidding with starting bid, increment, and scheduled closing time.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`border p-3 cursor-pointer transition-colors flex items-start gap-3 ${
                      purchaseMode === 'buy-now'
                        ? 'border-primary bg-background ring-1 ring-primary'
                        : 'border-hairline bg-surface hover:border-secondary'
                    }`}
                  >
                    <input
                      type="radio"
                      name="purchaseMode"
                      value="buy-now"
                      checked={purchaseMode === 'buy-now'}
                      onChange={() => setPurchaseMode('buy-now')}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-semibold text-primary">Fixed Price (Buy Now)</div>
                      <div className="text-xs text-secondary mt-1">
                        Offer item for immediate checkout at a fixed price with direct cart settlement.
                      </div>
                    </div>
                  </label>
                </div>
              </section>

              {/* 2. GENERAL ITEM DETAILS */}
              <section className="border border-hairline p-4 bg-surface/30 space-y-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-secondary">
                  2. General Information
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    Lot Title <span className="text-accent">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. 19th Century Tibetan Gilded Bronze Buddha, circa 1880"
                    className={`input-field text-sm ${errors.title ? 'border-accent' : ''}`}
                    required
                  />
                  {errors.title && <p className="text-xs text-accent mt-0.5">{errors.title}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      Department / Category <span className="text-accent">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => handleCategoryChange(e.target.value as CategorySlug)}
                      className="input-field text-sm"
                    >
                      <option value="antiques">Antiques</option>
                      <option value="furniture">Furniture</option>
                      <option value="ceramics-glass">Ceramics &amp; Glass</option>
                      <option value="clocks-watches">Clocks &amp; Watches</option>
                      <option value="art">Art &amp; Paintings</option>
                      <option value="jewellery">Jewellery &amp; Precious Metals</option>
                      <option value="books-maps">Books &amp; Manuscripts</option>
                      <option value="general">General Marketplace</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      Classification / Subcategory
                    </label>
                    {selectedCategoryNode?.children && selectedCategoryNode.children.length > 0 ? (
                      <select
                        value={subcategory}
                        onChange={(e) => setSubcategory(e.target.value)}
                        className="input-field text-sm"
                      >
                        {selectedCategoryNode.children.map((sub) => (
                          <option key={sub.id} value={sub.slug}>
                            {sub.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={subcategory}
                        onChange={(e) => setSubcategory(e.target.value)}
                        placeholder="Subcategory"
                        className="input-field text-sm"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    Technical &amp; Historical Description <span className="text-accent">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide detailed information regarding craftsmanship, marks/hallmarks, material composition, structural soundness, and history..."
                    className={`input-field text-sm ${errors.description ? 'border-accent' : ''}`}
                    required
                  />
                  {errors.description && <p className="text-xs text-accent mt-0.5">{errors.description}</p>}
                </div>
              </section>

              {/* 3. PRICING & TIMINGS */}
              <section className="border border-hairline p-4 bg-surface/30 space-y-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-secondary">
                  3. {purchaseMode === 'auction' ? 'Auction Bidding & Duration' : 'Fixed Pricing & Inventory'}
                </div>

                {purchaseMode === 'auction' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-1">
                          Starting Bid (NPR) <span className="text-accent">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-secondary font-mono">
                            Rs.
                          </span>
                          <input
                            type="number"
                            min={100}
                            step={100}
                            value={startingBid}
                            onChange={(e) => setStartingBid(Number(e.target.value))}
                            className={`input-field text-sm pl-8 ${errors.startingBid ? 'border-accent' : ''}`}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-secondary mb-1">
                          Minimum Bid Increment (NPR)
                        </label>
                        <select
                          value={minimumIncrement}
                          onChange={(e) => setMinimumIncrement(Number(e.target.value))}
                          className="input-field text-sm"
                        >
                          <option value={100}>Rs. 100</option>
                          <option value={250}>Rs. 250</option>
                          <option value={500}>Rs. 500</option>
                          <option value={1000}>Rs. 1,000</option>
                          <option value={2500}>Rs. 2,500</option>
                          <option value={5000}>Rs. 5,000</option>
                          <option value={10000}>Rs. 10,000</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">
                        Auction Duration <span className="text-accent">*</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {(['24h', '3d', '5d', '7d', 'custom'] as const).map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setDurationPreset(preset)}
                            className={`py-1.5 px-2 text-xs border text-center font-medium transition-colors ${
                              durationPreset === preset
                                ? 'bg-primary text-white border-primary'
                                : 'bg-background border-hairline text-secondary hover:text-primary'
                            }`}
                          >
                            {preset === '24h' ? '24 Hours' : preset === '3d' ? '3 Days' : preset === '5d' ? '5 Days' : preset === '7d' ? '7 Days' : 'Custom'}
                          </button>
                        ))}
                      </div>

                      {durationPreset === 'custom' && (
                        <div className="mt-2">
                          <input
                            type="datetime-local"
                            value={customEndTime}
                            onChange={(e) => setCustomEndTime(e.target.value)}
                            className={`input-field text-sm ${errors.customEndTime ? 'border-accent' : ''}`}
                            min={new Date().toISOString().slice(0, 16)}
                          />
                          {errors.customEndTime && (
                            <p className="text-xs text-accent mt-0.5">{errors.customEndTime}</p>
                          )}
                        </div>
                      )}

                      <div className="mt-2 p-2 bg-background border border-hairline text-xs text-secondary flex items-center justify-between">
                        <span>Calculated Closing:</span>
                        <span className="font-semibold text-primary font-mono">
                          {new Date(calculateEndTime()).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">
                        Sale Price (NPR) <span className="text-accent">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-secondary font-mono">
                          Rs.
                        </span>
                        <input
                          type="number"
                          min={100}
                          step={100}
                          value={price}
                          onChange={(e) => setPrice(Number(e.target.value))}
                          className={`input-field text-sm pl-8 ${errors.price ? 'border-accent' : ''}`}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">
                        Stock Quantity Available
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={stock}
                        onChange={(e) => setStock(Number(e.target.value))}
                        className="input-field text-sm"
                        required
                      />
                    </div>
                  </div>
                )}
              </section>

              {/* 4. SPECIFICATIONS */}
              <section className="border border-hairline p-4 bg-surface/30 space-y-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-secondary">
                  4. Curatorial Specifications
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      Condition Assessment <span className="text-accent">*</span>
                    </label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value as ItemCondition)}
                      className="input-field text-sm"
                    >
                      <option value="Excellent">Excellent (Pristine, no visible wear)</option>
                      <option value="Very Good">Very Good (Minor age-appropriate wear)</option>
                      <option value="Good">Good (Sound, visible authentic patina)</option>
                      <option value="Fair">Fair (Noticeable wear or minor repairs)</option>
                      <option value="As Found">As Found (Restoration candidate)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Era / Period</label>
                    <input
                      type="text"
                      value={era}
                      onChange={(e) => setEra(e.target.value)}
                      placeholder="e.g. Victorian c.1890, 19th Century, Art Deco"
                      className="input-field text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Origin / Geography</label>
                    <input
                      type="text"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      placeholder="e.g. England, Kathmandu Valley, France"
                      className="input-field text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Primary Material</label>
                    <input
                      type="text"
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      placeholder="e.g. Solid Mahogany, Sterling Silver, Cast Bronze"
                      className="input-field text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Dimensions / Weight</label>
                    <input
                      type="text"
                      value={dimensions}
                      onChange={(e) => setDimensions(e.target.value)}
                      placeholder="e.g. 45cm H × 30cm W × 15cm D (1.8kg)"
                      className="input-field text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Provenance / History</label>
                    <input
                      type="text"
                      value={provenance}
                      onChange={(e) => setProvenance(e.target.value)}
                      placeholder="e.g. Private estate collection, Kathmandu"
                      className="input-field text-sm"
                    />
                  </div>
                </div>
              </section>

              {/* 5. PHOTOGRAPHS & MEDIA */}
              <section className="border border-hairline p-4 bg-surface/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wider text-secondary">
                    5. Photographs &amp; Documentation
                  </div>
                  <span className="text-xs text-secondary font-mono">{images.length} attached</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label className="w-full sm:w-auto btn-secondary text-xs py-1.5 px-3 cursor-pointer text-center">
                    <span>{uploadingImage ? 'Uploading…' : '+ Upload Image File'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>

                  <div className="flex items-center gap-2 w-full sm:flex-1">
                    <input
                      type="url"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      placeholder="Or paste external image URL..."
                      className="input-field text-xs py-1.5 flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      className="btn-secondary text-xs py-1.5 px-2.5 whitespace-nowrap"
                    >
                      Add URL
                    </button>
                  </div>
                </div>

                {images.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative group border border-hairline bg-surface p-1">
                        <img
                          src={img}
                          alt={`Uploaded view ${idx + 1}`}
                          className="w-full h-20 object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-1 right-1 bg-accent text-white w-5 h-5 flex items-center justify-center text-xs font-bold opacity-90 hover:opacity-100"
                          title="Remove image"
                        >
                          ×
                        </button>
                        {idx === 0 && (
                          <span className="absolute bottom-1 left-1 bg-primary text-white text-[9px] px-1 font-mono">
                            PRIMARY
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-secondary">
                  Supported formats: JPEG, PNG, WEBP, GIF (Max 10MB per image). First image serves as the catalog primary thumbnail.
                </p>
              </section>

              {/* 6. SHIPPING & DISPATCH */}
              <section className="border border-hairline p-4 bg-surface/30 space-y-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-secondary">
                  6. Shipping &amp; Logistics
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      Dispatch Cost (NPR)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-secondary font-mono">
                        Rs.
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={shippingCost}
                        onChange={(e) => setShippingCost(Number(e.target.value))}
                        className="input-field text-sm pl-8"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      Estimated Transit
                    </label>
                    <input
                      type="text"
                      value={estimatedDays}
                      onChange={(e) => setEstimatedDays(e.target.value)}
                      placeholder="e.g. 3-5 business days"
                      className="input-field text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      Carrier Method
                    </label>
                    <select
                      value={shippingMethod}
                      onChange={(e) => setShippingMethod(e.target.value)}
                      className="input-field text-sm"
                    >
                      <option value="Standard insured courier">Standard insured courier</option>
                      <option value="Express delivery">Express delivery</option>
                      <option value="Specialized fine art handling">Specialized fine art handling</option>
                      <option value="Local collection available">Local collection available</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* ACTION BUTTON */}
              <div className="pt-2 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="btn-secondary py-2 px-4 text-sm"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary py-2 px-6 text-sm font-semibold whitespace-nowrap"
                >
                  {loading ? 'Publishing Lot…' : 'Publish Lot to Catalog →'}
                </button>
              </div>
            </div>

            {/* Right 4 Cols: Live Preview Card */}
            <div className="col-span-4 md:col-span-8 lg:col-span-4">
              <div className="sticky top-20 border border-hairline p-4 bg-background">
                <div className="text-xs font-semibold uppercase tracking-wider text-secondary mb-3 pb-2 hairline-b">
                  Live Catalog Card Preview
                </div>

                <div className="border border-hairline p-2 bg-surface/30">
                  <div className="w-full h-44 bg-surface border border-hairline mb-2 flex items-center justify-center overflow-hidden">
                    {images.length > 0 ? (
                      <SafeImage src={images[0]} alt="Preview" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-xs text-secondary font-mono">No Image Attached</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] font-mono uppercase text-secondary">
                      {category} • {condition}
                    </div>
                    <div className="text-sm font-semibold text-primary truncate">
                      {title || 'Untitled Lot'}
                    </div>

                    <div className="pt-2 mt-2 hairline-t flex items-baseline justify-between">
                      <span className="text-xs text-secondary font-medium">
                        {purchaseMode === 'auction' ? 'Starting Bid' : 'Price'}:
                      </span>
                      <span className="text-sm font-mono font-semibold text-primary">
                        {formatCurrency(purchaseMode === 'auction' ? startingBid : price)}
                      </span>
                    </div>

                    {purchaseMode === 'auction' && (
                      <div className="text-[11px] text-secondary">
                        Increment: {formatCurrency(minimumIncrement)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 p-3 bg-surface text-xs text-secondary space-y-1 border border-hairline">
                  <div className="font-semibold text-primary">Catalog Standards:</div>
                  <p>• Items are subject to Auction Studio condition standards.</p>
                  <p>• Timed auctions close automatically and notify the winning bidder.</p>
                  <p>• Nepal buyer settlement via Khalti payment integration.</p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>

      <Footer />
      <Toast />
    </div>
  );
};
