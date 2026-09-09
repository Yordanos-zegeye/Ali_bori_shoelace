import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Search, Plus, RefreshCw, 
  Layers, Tag, DollarSign, Package
} from 'lucide-react';
import { api } from '../api/client';
import { Product, ProductVariant } from '../types';

export const CatalogView: React.FC = () => {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [varsRes, prodsRes] = await Promise.all([
        api.get<any>('/catalog/variants/'),
        api.get<any>('/catalog/products/')
      ]);
      setVariants(varsRes.results || varsRes);
      setProducts(prodsRes.results || prodsRes);
    } catch (err) {
      console.error('Failed to load catalog data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredVariants = variants.filter((v) => {
    const term = searchTerm.toLowerCase();
    return (
      v.serial_code.toLowerCase().includes(term) ||
      (v.color_details?.name && v.color_details.name.toLowerCase().includes(term)) ||
      (v.thickness_details?.name && v.thickness_details.name.toLowerCase().includes(term))
    );
  });

  const totalCatalogVariants = variants.length;
  const totalShopStock = variants.reduce(
    (sum, v) => sum + parseFloat(v.stock?.calculated_stock || v.stock?.total || '0'),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-factory-darkCard p-5 rounded-xl border border-factory-darkBorder">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-factory-amber/10 text-factory-amber">
              <ShoppingBag className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold font-heading text-factory-paper">
              Shop Count & Finished Goods Catalog
            </h1>
          </div>
          <p className="text-xs text-factory-muted mt-1">
            Preserving Excel's PRODUCTES and shop count sheets: Serial codes, colors, thicknesses, daily products, and live shop balances.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="p-2.5 rounded-lg border border-factory-darkBorder text-factory-muted hover:text-factory-paper hover:bg-factory-darkBorder/40 transition-colors self-end sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono">
            Active Product Lines
          </div>
          <div className="text-2xl font-bold font-mono text-factory-paper mt-1">
            {products.length}
          </div>
          <div className="text-xs text-factory-muted mt-1">Shoelace categories</div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono">
            Total Product Variants
          </div>
          <div className="text-2xl font-bold font-mono text-factory-amber mt-1">
            {totalCatalogVariants}
          </div>
          <div className="text-xs text-factory-muted mt-1">Unique color & thickness combinations</div>
        </div>

        <div className="bg-factory-darkCard border border-factory-darkBorder p-4 rounded-xl">
          <div className="text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono">
            Shop Count Balance
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {totalShopStock.toFixed(1)} <span className="text-xs font-normal text-factory-muted">Units/Bags</span>
          </div>
          <div className="text-xs text-factory-muted mt-1">Calculated shop floor inventory</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-factory-muted" />
        <input
          type="text"
          placeholder="Search by Serial Code, Color, or Thickness..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-factory-darkCard border border-factory-darkBorder rounded-lg text-xs text-factory-paper placeholder-factory-muted focus:outline-none focus:border-factory-amber"
        />
      </div>

      {/* Variants Table */}
      <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-factory-dark/60 text-[11px] font-bold text-factory-muted uppercase tracking-wider font-mono border-b border-factory-darkBorder">
                <th className="py-3 px-4">Serial Code</th>
                <th className="py-3 px-4">Color</th>
                <th className="py-3 px-4">Thickness</th>
                <th className="py-3 px-4">Daily Product</th>
                <th className="py-3 px-4">In Qty</th>
                <th className="py-3 px-4">Out Qty</th>
                <th className="py-3 px-4">Shop Total</th>
                <th className="py-3 px-4 text-right">Standard Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-darkBorder/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-factory-muted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-factory-amber" />
                    Loading catalog & shop count...
                  </td>
                </tr>
              ) : filteredVariants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-factory-muted">
                    No product variants found.
                  </td>
                </tr>
              ) : (
                filteredVariants.map((v) => {
                  const stock = v.stock;
                  return (
                    <tr key={v.id} className="hover:bg-factory-darkBorder/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-factory-amber">
                        {v.serial_code}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-factory-paper">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-factory-dark border border-factory-darkBorder">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: v.color_details?.hex_code || '#C87A38' }}
                          />
                          {v.color_details?.name || 'Standard'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-factory-muted">
                        {v.thickness_details?.name || 'Standard'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-factory-paper">
                        {stock?.daily_product ? parseFloat(stock.daily_product).toFixed(1) : '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-emerald-400">
                        {stock?.in_qty ? `+${parseFloat(stock.in_qty).toFixed(1)}` : '0.0'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-factory-crimson">
                        {stock?.out_qty ? `-${parseFloat(stock.out_qty).toFixed(1)}` : '0.0'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-factory-paper">
                        {stock?.calculated_stock || stock?.total || '0.0'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-factory-amber font-bold">
                        {parseFloat(v.unit_price || '180.00').toFixed(2)} ETB
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
