import React, { useState, useEffect, useMemo } from 'react';
import { 
  Factory, Play, CheckCircle2, ArrowRightLeft, AlertTriangle, 
  Plus, Package, Calculator, Sparkles, Filter, RefreshCw,
  Pencil, Trash2, Eye, Scale, Droplets, Film, Check, X, Layers,
  Search, AlertCircle, ShoppingCart, Warehouse, ChevronRight
} from 'lucide-react';
import { api } from '../api/client';
import { ProductionBatch, ProductVariant, RawMaterialVariant } from '../types';

export const ProductionView: React.FC = () => {
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterialVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'phase1' | 'transfers' | 'phase2'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPackModal, setShowPackModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ProductionBatch | null>(null);
  const [inspectingBatch, setInspectingBatch] = useState<ProductionBatch | null>(null);
  const [editingBatch, setEditingBatch] = useState<ProductionBatch | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<ProductionBatch | null>(null);

  // Step 2 Modal: Move Processed Lace (B1 -> B2) by Weighing
  const [b2Batch, setB2Batch] = useState<ProductionBatch | null>(null);
  const [b2BraidedWeight, setB2BraidedWeight] = useState('96.20');
  const [b2TransferredBy, setB2TransferredBy] = useState('');
  const [b2Notes, setB2Notes] = useState('');

  // Step 3 Modal: Move from B2 to Store by Weighing & Packing Sacks (as much as desired)
  const [storeBatch, setStoreBatch] = useState<ProductionBatch | null>(null);
  const [storeFinishedWeight, setStoreFinishedWeight] = useState('96.00');
  const [storeSackWeights, setStoreSackWeights] = useState<string[]>(['32.00']);
  const [storeLocation, setStoreLocation] = useState('Finished Goods Store 1 - Shelf A');
  const [packSackDirectly, setPackSackDirectly] = useState(true);

  // New Batch Form State (Step 1: Start Run & Request Raw Materials - Standard 32 KG Batches)
  const [newBatch, setNewBatch] = useState({
    product_variant: '',
    raw_material_yarn: '',
    yarn_batch_count: 1,
    raw_yarn_input_kg: '32.00',
    acetone_used: '5.00',
    film_roll_variant: '',
    film_roll_used: '2.00',
    supervisor: 'Kebede Alemu',
    notes: 'Morning shift batch'
  });

  // Edit Batch Form State (Full flexibility to fix amounts)
  const [editFormData, setEditFormData] = useState({
    product_variant: '',
    raw_material_yarn: '',
    yarn_batch_count: 1,
    raw_yarn_input_kg: '32.00',
    acetone_used: '0.00',
    film_roll_variant: '',
    film_roll_used: '0.00',
    braided_output_kg: '0.00',
    tipping_input_kg: '0.00',
    finished_output_kg: '0.00',
    status: 'IN_PROGRESS',
    supervisor: '',
    notes: ''
  });

  // Bag Packing State (Strictly 25.00 - 40.00 KG)
  const [bagWeight, setBagWeight] = useState('30.00');
  const [packStoreLocation, setPackStoreLocation] = useState('Finished Goods Store 1 - Shelf A');
  const [packError, setPackError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filtered raw materials by category
  const yarnVariants = useMemo(() => {
    const list = rawMaterials.filter(rm => rm.material_type_name?.toLowerCase().includes('yarn'));
    return list.length > 0 ? list : rawMaterials;
  }, [rawMaterials]);

  const filmVariants = useMemo(() => {
    const list = rawMaterials.filter(rm => rm.material_type_name?.toLowerCase().includes('film'));
    return list.length > 0 ? list : rawMaterials;
  }, [rawMaterials]);

  const [stockLoading, setStockLoading] = useState(false);
  const [stockLastRefreshed, setStockLastRefreshed] = useState<Date | null>(null);

  // Dedicated function to fetch live warehouse stock for raw materials and products
  const fetchFreshStock = async () => {
    try {
      setStockLoading(true);
      const [variantsRes, rawRes] = await Promise.all([
        api.get<any>('/catalog/variants/'),
        api.get<any>('/inventory/variants/')
      ]);
      const vars = variantsRes.results || variantsRes;
      const rawList = rawRes.results || rawRes;
      setVariants(vars);
      setRawMaterials(rawList);
      setStockLastRefreshed(new Date());
      return { vars, rawList };
    } catch (err) {
      console.error('Failed to refresh warehouse stock', err);
      return null;
    } finally {
      setStockLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [batchesRes, variantsRes, rawRes] = await Promise.all([
        api.get<any>('/production/batches/'),
        api.get<any>('/catalog/variants/'),
        api.get<any>('/inventory/variants/')
      ]);
      setBatches(batchesRes.results || batchesRes);
      const vars = variantsRes.results || variantsRes;
      setVariants(vars);
      const rawList = rawRes.results || rawRes;
      setRawMaterials(rawList);
      setStockLastRefreshed(new Date());

      // Pre-select first yarn & film roll for modal convenience
      if (rawList.length > 0) {
        const firstYarn = rawList.find((r: any) => r.material_type_name?.toLowerCase().includes('yarn'));
        const firstFilm = rawList.find((r: any) => r.material_type_name?.toLowerCase().includes('film'));
        setNewBatch(prev => ({
          ...prev,
          raw_material_yarn: prev.raw_material_yarn || (firstYarn ? String(firstYarn.id) : String(rawList[0].id)),
          film_roll_variant: prev.film_roll_variant || (firstFilm ? String(firstFilm.id) : '')
        }));
      }
    } catch (err) {
      console.error('Failed to load production data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Open Step 1 Modal and immediately fetch fresh warehouse stock
  const handleOpenCreateModal = async () => {
    setActionError(null);
    setShowCreateModal(true);
    const fresh = await fetchFreshStock();
    if (fresh) {
      const { vars, rawList } = fresh;
      const yList = rawList.filter((rm: any) => rm.material_type_name?.toLowerCase().includes('yarn'));
      const fList = rawList.filter((rm: any) => rm.material_type_name?.toLowerCase().includes('film'));

      setNewBatch(prev => {
        let matchedYarnId = prev.raw_material_yarn;
        let matchedFilmId = prev.film_roll_variant;
        const prod = vars.find((v: any) => String(v.id) === String(prev.product_variant));

        if (prod) {
          const colorName = (prod.color_details?.name || '').toLowerCase();
          const colorCode = (prod.color_details?.code || '').toLowerCase();
          const matchedYarn = yList.find((y: any) => {
            const yCol = (y.color_name || '').toLowerCase();
            return yCol === colorName || (colorCode && yCol.startsWith(colorCode)) || (colorName && yCol.includes(colorName));
          });
          if (matchedYarn) matchedYarnId = String(matchedYarn.id);

          const matchedFilm = fList.find((f: any) => {
            const fCol = (f.color_name || '').toLowerCase();
            return fCol === colorName || (colorName && fCol.includes(colorName));
          });
          if (matchedFilm) matchedFilmId = String(matchedFilm.id);
        } else if (!matchedYarnId && yList.length > 0) {
          // Default to yarn with highest available stock
          const sorted = [...yList].sort((a: any, b: any) => parseFloat(b.total_available_kg || 0) - parseFloat(a.total_available_kg || 0));
          matchedYarnId = String(sorted[0].id);
        }

        if (!matchedFilmId && fList.length > 0) {
          matchedFilmId = String(fList[0].id);
        }

        return {
          ...prev,
          raw_material_yarn: matchedYarnId,
          film_roll_variant: matchedFilmId
        };
      });
    }
  };

  // When a product variant is selected, auto-match the corresponding raw yarn & film roll by color
  const handleSelectProduct = (productId: string) => {
    const prod = variants.find(v => String(v.id) === String(productId));
    let matchedYarnId = newBatch.raw_material_yarn;
    let matchedFilmId = newBatch.film_roll_variant;

    if (prod) {
      const colorName = (prod.color_details?.name || '').toLowerCase();
      const colorCode = (prod.color_details?.code || '').toLowerCase();

      const matchedYarn = yarnVariants.find(y => {
        const yCol = (y.color_name || '').toLowerCase();
        return yCol === colorName || (colorCode && yCol.startsWith(colorCode)) || (colorName && yCol.includes(colorName));
      });
      if (matchedYarn) {
        matchedYarnId = String(matchedYarn.id);
      }

      const matchedFilm = filmVariants.find(f => {
        const fCol = (f.color_name || '').toLowerCase();
        return fCol === colorName || (colorName && fCol.includes(colorName));
      });
      if (matchedFilm) {
        matchedFilmId = String(matchedFilm.id);
      }
    }

    setNewBatch(prev => ({
      ...prev,
      product_variant: productId,
      raw_material_yarn: matchedYarnId,
      film_roll_variant: matchedFilmId
    }));
  };

  // Computed live stock previews in create form
  const selectedProduct = useMemo(() => {
    if (!newBatch.product_variant) return null;
    return variants.find(v => String(v.id) === String(newBatch.product_variant)) || null;
  }, [newBatch.product_variant, variants]);

  const selectedYarnStock = useMemo(() => {
    if (!newBatch.raw_material_yarn) return null;
    return rawMaterials.find(r => String(r.id) === String(newBatch.raw_material_yarn)) || null;
  }, [newBatch.raw_material_yarn, rawMaterials]);

  const selectedFilmStock = useMemo(() => {
    if (!newBatch.film_roll_variant) return null;
    return rawMaterials.find(r => String(r.id) === String(newBatch.film_roll_variant)) || null;
  }, [newBatch.film_roll_variant, rawMaterials]);

  const acetoneStock = useMemo(() => {
    return rawMaterials.find(r => r.material_type_name?.toLowerCase().includes('acetone')) || null;
  }, [rawMaterials]);

  const yarnAvailableKg = useMemo(() => {
    if (!selectedYarnStock) return 0;
    return parseFloat(String(selectedYarnStock.total_available_kg || 0));
  }, [selectedYarnStock]);

  const yarnRequestedKg = useMemo(() => {
    return parseFloat(newBatch.raw_yarn_input_kg || '0');
  }, [newBatch.raw_yarn_input_kg]);

  const isYarnStockSufficient = useMemo(() => {
    return yarnAvailableKg >= yarnRequestedKg && yarnAvailableKg > 0;
  }, [yarnAvailableKg, yarnRequestedKg]);

  const yarnStockShortage = useMemo(() => {
    return Math.max(0, yarnRequestedKg - yarnAvailableKg);
  }, [yarnAvailableKg, yarnRequestedKg]);

  // Open Edit Modal & Populate Form
  const handleOpenEdit = (batch: ProductionBatch) => {
    setEditingBatch(batch);
    setActionError(null);
    const count = batch.yarn_batch_count || Math.max(1, Math.round(parseFloat(batch.raw_yarn_input_kg || '32') / 32));
    setEditFormData({
      product_variant: String(batch.product_variant),
      raw_material_yarn: batch.raw_material_yarn ? String(batch.raw_material_yarn) : '',
      yarn_batch_count: count,
      raw_yarn_input_kg: batch.raw_yarn_input_kg || String((count * 32).toFixed(2)),
      acetone_used: batch.acetone_used || '0.00',
      film_roll_variant: batch.film_roll_variant ? String(batch.film_roll_variant) : '',
      film_roll_used: batch.film_roll_used || '0.00',
      braided_output_kg: batch.braided_output_kg || '0.00',
      tipping_input_kg: batch.tipping_input_kg || '0.00',
      finished_output_kg: batch.finished_output_kg || '0.00',
      status: batch.status,
      supervisor: batch.supervisor || '',
      notes: batch.notes || ''
    });
  };

  // STEP 1: Submit Create Batch & Request Raw Materials
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (!newBatch.product_variant) {
      setActionError('Please select a shoe lace product to manufacture.');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/production/batches/', {
        product_variant: Number(newBatch.product_variant),
        raw_material_yarn: newBatch.raw_material_yarn ? Number(newBatch.raw_material_yarn) : null,
        yarn_batch_count: Number(newBatch.yarn_batch_count) || 1,
        raw_yarn_input_kg: newBatch.raw_yarn_input_kg,
        acetone_used: newBatch.acetone_used,
        film_roll_variant: newBatch.film_roll_variant ? Number(newBatch.film_roll_variant) : null,
        film_roll_used: newBatch.film_roll_used,
        supervisor: newBatch.supervisor,
        notes: newBatch.notes,
        status: 'IN_PROGRESS'
      });
      setShowCreateModal(false);
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to start production run and request raw materials.');
    } finally {
      setSubmitting(false);
    }
  };

  // STEP 2: Submit Move Processed Lace (B1 -> B2) by Weighing
  const handleMoveToB2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!b2Batch) return;
    setActionError(null);

    const weightNum = parseFloat(b2BraidedWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      setActionError('Please enter a valid processed lace weight greater than 0 KG.');
      return;
    }

    const rawIn = parseFloat(b2Batch.raw_yarn_input_kg || '0');
    if (rawIn > 0 && weightNum > rawIn) {
      setActionError(`Braided lace (${weightNum.toFixed(2)} KG) cannot exceed raw yarn input (${rawIn.toFixed(2)} KG). Output cannot exceed input.`);
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/production/batches/${b2Batch.id}/move_to_b2/`, {
        braided_output_kg: weightNum.toFixed(2),
        transferred_by: b2TransferredBy || b2Batch.supervisor || 'Braiding Supervisor',
        notes: b2Notes
      });
      setB2Batch(null);
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to record lace weight and move to Building 2.');
    } finally {
      setSubmitting(false);
    }
  };

  // STEP 3: Submit Move from B2 to Store by Weighing & Packing Sacks
  const handleMoveToStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeBatch) return;
    setActionError(null);

    const finishedWeightNum = parseFloat(storeFinishedWeight);
    if (isNaN(finishedWeightNum) || finishedWeightNum <= 0) {
      setActionError('Please enter a valid finished shoelaces weight greater than 0 KG.');
      return;
    }

    const maxAllowed = parseFloat(storeBatch.tipping_input_kg || storeBatch.braided_output_kg || storeBatch.raw_yarn_input_kg || '0');
    if (maxAllowed > 0 && finishedWeightNum > maxAllowed) {
      setActionError(`Finished shoelaces (${finishedWeightNum.toFixed(2)} KG) cannot exceed incoming braided cords (${maxAllowed.toFixed(2)} KG). Physical output cannot exceed input.`);
      return;
    }

    const payload: any = {
      finished_output_kg: finishedWeightNum.toFixed(2),
      store_location: storeLocation
    };

    if (packSackDirectly) {
      const validSacks = storeSackWeights
        .map((w) => parseFloat(w))
        .filter((w) => !isNaN(w) && w > 0);

      if (validSacks.length === 0) {
        setActionError('Please enter at least one sack scale weight greater than 0 KG.');
        return;
      }

      const sumSacks = validSacks.reduce((a, b) => a + b, 0);
      if (sumSacks > finishedWeightNum) {
        setActionError(`Total sack weights (${sumSacks.toFixed(2)} KG) cannot exceed weighed finished shoelaces (${finishedWeightNum.toFixed(2)} KG).`);
        return;
      }
      payload.sack_weights = validSacks.map((w) => w.toFixed(2));
    }

    try {
      setSubmitting(true);
      await api.post(`/production/batches/${storeBatch.id}/weigh_and_store/`, payload);
      setStoreBatch(null);
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to weigh finished shoelaces and move to Store.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Save Edit Batch
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;
    setActionError(null);

    try {
      setSubmitting(true);
      await api.patch(`/production/batches/${editingBatch.id}/`, {
        product_variant: Number(editFormData.product_variant),
        raw_material_yarn: editFormData.raw_material_yarn ? Number(editFormData.raw_material_yarn) : null,
        yarn_batch_count: Number(editFormData.yarn_batch_count) || 1,
        raw_yarn_input_kg: editFormData.raw_yarn_input_kg,
        acetone_used: editFormData.acetone_used,
        film_roll_variant: editFormData.film_roll_variant ? Number(editFormData.film_roll_variant) : null,
        film_roll_used: editFormData.film_roll_used,
        braided_output_kg: editFormData.braided_output_kg,
        tipping_input_kg: editFormData.tipping_input_kg,
        finished_output_kg: editFormData.finished_output_kg,
        status: editFormData.status,
        supervisor: editFormData.supervisor,
        notes: editFormData.notes
      });
      setEditingBatch(null);
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update production run.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Delete Batch
  const handleDeleteBatch = async () => {
    if (!deletingBatch) return;
    setActionError(null);
    const idToDelete = deletingBatch.id;
    try {
      setSubmitting(true);
      await api.delete(`/production/batches/${idToDelete}/`);
      setDeletingBatch(null);
      setBatches((prev) => prev.filter((b) => b.id !== idToDelete));
      fetchData();
    } catch (err: any) {
      if (err.status === 404 || err.message?.toLowerCase().includes('not found')) {
        setDeletingBatch(null);
        setBatches((prev) => prev.filter((b) => b.id !== idToDelete));
        fetchData();
      } else {
        setActionError(err.message || 'Failed to delete batch. Sacks may have already been dispatched.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Pack Additional Sacks Handler (pack as much as desired to store)
  const handlePackAdditionalSack = async (e: React.FormEvent) => {
    e.preventDefault();
    setPackError(null);
    const weightNum = parseFloat(bagWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      setPackError('Please enter a valid sack scale weight greater than 0 KG.');
      return;
    }
    if (!selectedBatch) return;

    const remainingNum = parseFloat(selectedBatch.remaining_unpacked_kg || '0');
    if (remainingNum <= 0) {
      setPackError('All finished shoelaces for this run have already been packed into store sacks! No unpacked product remains.');
      return;
    }
    if (weightNum > remainingNum) {
      setPackError(`Cannot pack ${weightNum.toFixed(2)} KG. Only ${remainingNum.toFixed(2)} KG of unpacked shoelaces remain for run ${selectedBatch.batch_number}.`);
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/store/bags/', {
        batch: selectedBatch.id,
        product_variant: selectedBatch.product_variant,
        weight_kg: weightNum.toFixed(2),
        store_location: packStoreLocation,
        status: 'IN_STORE'
      });
      setShowPackModal(false);
      setSelectedBatch(null);
      fetchData();
    } catch (err: any) {
      setPackError(err.message || 'Failed to pack sack into store.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete / Remove an accidental finished sack from warehouse
  const handleDeleteBag = async (bagId: string) => {
    if (!confirm(`Are you sure you want to remove sack ${bagId} from the warehouse store? This will restore the unpacked weight on the production run.`)) {
      return;
    }
    try {
      setSubmitting(true);
      await api.delete(`/store/bags/${bagId}/`);
      fetchData();
      if (inspectingBatch) {
        const updated = await api.get<ProductionBatch>(`/production/batches/${inspectingBatch.id}/`);
        setInspectingBatch(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to remove sack from store');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter batches by tab and search
  const filteredBatches = batches.filter((b) => {
    if (activeTab === 'phase1') {
      if (b.status !== 'IN_PROGRESS' && b.status !== 'PLANNED') return false;
    } else if (activeTab === 'transfers') {
      if (b.status !== 'PHASE_1_COMPLETE' && b.status !== 'TRANSFERRED') return false;
    } else if (activeTab === 'phase2') {
      if (b.status !== 'PHASE_2_IN_PROGRESS' && b.status !== 'COMPLETED') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNumber = b.batch_number?.toLowerCase().includes(q);
      const matchProduct = b.product_name?.toLowerCase().includes(q);
      const matchSupervisor = b.supervisor?.toLowerCase().includes(q);
      const matchReq = b.stock_request_number?.toLowerCase().includes(q);
      return matchNumber || matchProduct || matchSupervisor || matchReq;
    }
    return true;
  });

  // Live calculations for Step 2 Modal
  const b2Calculations = useMemo(() => {
    if (!b2Batch) return { wasteKg: 0, wastePct: 0, yieldPct: 0 };
    const rawIn = parseFloat(b2Batch.raw_yarn_input_kg) || 0;
    const braidedOut = parseFloat(b2BraidedWeight) || 0;
    const wasteKg = Math.max(0, rawIn - braidedOut);
    const wastePct = rawIn > 0 ? (wasteKg / rawIn) * 100 : 0;
    const yieldPct = rawIn > 0 ? (braidedOut / rawIn) * 100 : 0;
    return { wasteKg, wastePct, yieldPct };
  }, [b2Batch, b2BraidedWeight]);

  // Live calculations for Step 3 Modal
  const storeCalculations = useMemo(() => {
    if (!storeBatch) return { p1Waste: 0, p2Waste: 0, totalWaste: 0, yieldPct: 0, wastePct: 0 };
    const rawIn = parseFloat(storeBatch.raw_yarn_input_kg) || 0;
    const tippingIn = parseFloat(storeBatch.tipping_input_kg || storeBatch.braided_output_kg) || 0;
    const finishedOut = parseFloat(storeFinishedWeight) || 0;
    const p1Waste = parseFloat(storeBatch.phase1_waste_kg) || Math.max(0, rawIn - tippingIn);
    const p2Waste = Math.max(0, tippingIn - finishedOut);
    const totalWaste = p1Waste + p2Waste;
    const yieldPct = rawIn > 0 ? (finishedOut / rawIn) * 100 : 0;
    const wastePct = rawIn > 0 ? (totalWaste / rawIn) * 100 : 0;
    return { p1Waste, p2Waste, totalWaste, yieldPct, wastePct };
  }, [storeBatch, storeFinishedWeight]);

  // Live calculations for Edit Modal preview
  const editCalculations = useMemo(() => {
    const rawIn = parseFloat(editFormData.raw_yarn_input_kg) || 0;
    const braidedOut = parseFloat(editFormData.braided_output_kg) || 0;
    const tippingIn = parseFloat(editFormData.tipping_input_kg) || 0;
    const finishedOut = parseFloat(editFormData.finished_output_kg) || 0;

    const p1Waste = Math.max(0, rawIn - braidedOut);
    const p2Waste = Math.max(0, tippingIn - finishedOut);
    const totalWaste = p1Waste + p2Waste;
    const yieldPct = rawIn > 0 ? (finishedOut / rawIn) * 100 : 0;
    const wastePct = rawIn > 0 ? (totalWaste / rawIn) * 100 : 0;

    return { p1Waste, p2Waste, totalWaste, yieldPct, wastePct };
  }, [editFormData]);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-factory-darkCard p-5 rounded-xl border border-factory-darkBorder shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-factory-rust/20 text-factory-amber">
              <Factory className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold font-heading text-factory-paper">
              Shoe Lace Production (3-Step Factory Flow)
            </h1>
          </div>
          <p className="text-xs text-factory-muted mt-1">
            Step 1: Create Batch & Request Raw Materials → Step 2: Weigh Lace & Move (B1 → B2) → Step 3: Weigh & Move to Store
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-factory-muted" />
            <input
              type="text"
              placeholder="Search run #, product, or request #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-factory-dark border border-factory-darkBorder rounded-lg text-xs text-factory-paper placeholder-factory-muted focus:outline-none focus:border-factory-amber"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-factory-muted hover:text-factory-paper text-xs"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={fetchData}
            className="p-2.5 rounded-lg border border-factory-darkBorder text-factory-muted hover:text-factory-paper hover:bg-factory-darkBorder/40 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-factory-amber' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-factory-rust hover:bg-factory-rustLight text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-factory-rust/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Step 1: Start Batch & Request Materials
          </button>
        </div>
      </div>

      {/* 3 Step Interactive Workflow Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Step 1 Card */}
        <div className="bg-factory-darkCard/90 border border-factory-darkBorder p-4 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-factory-amber/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-factory-amber font-mono flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              STEP 1: BATCH & RAW MATERIALS
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-factory-amber/10 text-factory-amber font-bold">
              Building 1
            </span>
          </div>
          <p className="text-xs text-factory-muted mb-3">
            Create production run and request raw materials (Yarn, Acetone, Film Roll) directly from warehouse stock.
          </p>
          <div className="text-xs space-y-1 bg-factory-dark p-2.5 rounded-lg border border-factory-darkBorder text-factory-paper">
            <div className="flex justify-between">
              <span className="text-factory-muted">Materials Issued:</span>
              <span className="font-semibold text-factory-amber">Yarn (32 KG Batches), Film, Acetone</span>
            </div>
            <div className="flex justify-between">
              <span className="text-factory-muted">Ledger:</span>
              <span className="text-factory-paper">Auto-generates Stock Request</span>
            </div>
          </div>
        </div>

        {/* Step 2 Card */}
        <div className="bg-factory-darkCard/90 border border-factory-darkBorder p-4 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-blue-400 font-mono flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5" />
              STEP 2: WEIGH LACE & MOVE
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">
              B1 → B2 Transit
            </span>
          </div>
          <p className="text-xs text-factory-muted mb-3">
            Braided continuous lace is weighed coming off spindles, spindle waste is recorded, and cords move to Building 2.
          </p>
          <div className="text-xs space-y-1 bg-factory-dark p-2.5 rounded-lg border border-factory-darkBorder text-factory-paper">
            <div className="flex justify-between">
              <span className="text-factory-muted">Measured:</span>
              <span className="font-semibold text-blue-400">Processed Cord Weight (KG)</span>
            </div>
            <div className="flex justify-between text-factory-crimson">
              <span>Spindle Loss:</span>
              <span>Yarn In - Processed Cord Out</span>
            </div>
          </div>
        </div>

        {/* Step 3 Card */}
        <div className="bg-factory-darkCard/90 border border-factory-darkBorder p-4 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400 font-mono flex items-center gap-1.5">
              <Warehouse className="w-3.5 h-3.5" />
              STEP 3: WEIGH & MOVE TO STORE
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">
              Finished Goods
            </span>
          </div>
          <p className="text-xs text-factory-muted mb-3">
            Tipped & cut shoelaces are weighed, overall yield % is calculated, and finished sacks (25–40 KG) are moved to the store.
          </p>
          <div className="text-xs space-y-1 bg-factory-dark p-2.5 rounded-lg border border-factory-darkBorder text-factory-paper">
            <div className="flex justify-between">
              <span className="text-factory-muted">Measured:</span>
              <span className="font-semibold text-emerald-400">Finished Shoelaces (KG)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-factory-muted">Storage:</span>
              <span className="text-emerald-400 font-semibold">Weighed Sacks (25 to 40 KG)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-factory-darkBorder overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
            activeTab === 'all'
              ? 'border-factory-amber text-factory-amber'
              : 'border-transparent text-factory-muted hover:text-factory-paper'
          }`}
        >
          All Runs ({batches.length})
        </button>
        <button
          onClick={() => setActiveTab('phase1')}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
            activeTab === 'phase1'
              ? 'border-factory-amber text-factory-amber'
              : 'border-transparent text-factory-muted hover:text-factory-paper'
          }`}
        >
          Step 1: Braiding B1 ({batches.filter(b => b.status === 'IN_PROGRESS' || b.status === 'PLANNED').length})
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
            activeTab === 'transfers'
              ? 'border-factory-amber text-factory-amber'
              : 'border-transparent text-factory-muted hover:text-factory-paper'
          }`}
        >
          Step 2: Transit & B2 ({batches.filter(b => b.status === 'PHASE_1_COMPLETE' || b.status === 'TRANSFERRED').length})
        </button>
        <button
          onClick={() => setActiveTab('phase2')}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
            activeTab === 'phase2'
              ? 'border-factory-amber text-factory-amber'
              : 'border-transparent text-factory-muted hover:text-factory-paper'
          }`}
        >
          Step 3: Stored in Warehouse ({batches.filter(b => b.status === 'COMPLETED').length})
        </button>
      </div>

      {/* Batches Table */}
      <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-factory-dark/60 text-[11px] font-bold text-factory-muted uppercase tracking-wider border-b border-factory-darkBorder">
                <th className="py-3 px-4">Run # & Date</th>
                <th className="py-3 px-4">Shoe Lace Product</th>
                <th className="py-3 px-4">Materials Issued</th>
                <th className="py-3 px-4">Initial Yarn</th>
                <th className="py-3 px-4">Braided Lace (B1)</th>
                <th className="py-3 px-4">Finished (B2)</th>
                <th className="py-3 px-4">Total Waste</th>
                <th className="py-3 px-4">Yield %</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Step Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-darkBorder/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-factory-muted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-factory-amber" />
                    Loading production batches...
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-factory-muted">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-xl bg-factory-dark border border-factory-darkBorder mx-auto flex items-center justify-center text-factory-amber">
                        <Factory className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-semibold text-factory-paper">No Production Runs in this View</div>
                      <p className="text-xs text-factory-muted">
                        Click the button below to start your first batch, request raw materials from the store, and track it through all 3 stages.
                      </p>
                      <button
                        onClick={handleOpenCreateModal}
                        className="px-4 py-2 bg-factory-rust hover:bg-factory-rustLight text-white rounded-lg text-xs font-semibold shadow cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        + Step 1: Start Batch & Request Materials
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => {
                  const yieldNum = parseFloat(batch.yield_percentage || '0');
                  const rawIn = parseFloat(batch.raw_yarn_input_kg || '0');
                  const braidedOut = parseFloat(batch.braided_output_kg || '0');
                  const finishedOut = parseFloat(batch.finished_output_kg || '0');
                  const totalWaste = parseFloat(batch.total_waste_kg || '0');
                  const wastePct = parseFloat(batch.waste_percentage || '0');

                  return (
                    <tr key={batch.id} className="hover:bg-factory-darkBorder/20 transition-colors">
                      {/* Run Number & Linked Stock Request */}
                      <td className="py-3.5 px-4 font-mono">
                        <button
                          onClick={() => setInspectingBatch(batch)}
                          className="font-bold text-factory-amber hover:underline text-left cursor-pointer flex items-center gap-1"
                          title="View Full Run Details"
                        >
                          {batch.batch_number}
                          <Eye className="w-3 h-3 text-factory-muted opacity-60" />
                        </button>
                        <div className="text-[10px] text-factory-muted font-sans font-normal">
                          {batch.start_date ? new Date(batch.start_date).toLocaleDateString() : 'N/A'}
                        </div>
                        {batch.stock_request_number && (
                          <div className="text-[9px] font-mono text-factory-muted flex items-center gap-0.5 mt-0.5">
                            <span>Req:</span>
                            <span className="text-factory-amber/80 font-medium">{batch.stock_request_number}</span>
                          </div>
                        )}
                      </td>

                      {/* Product Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-factory-paper">{batch.product_name}</div>
                        <div className="text-[10px] text-factory-muted">
                          Sup: {batch.supervisor || 'N/A'}
                        </div>
                      </td>

                      {/* Materials Assigned (Yarn, Acetone, Film Roll) */}
                      <td className="py-3.5 px-4">
                        <div className="text-[11px] font-medium text-factory-paper">
                          {batch.raw_material_yarn_name || 'Standard Yarn'}
                        </div>
                        <div className="text-[10px] text-factory-muted flex items-center gap-2 mt-0.5">
                          {batch.acetone_used && parseFloat(batch.acetone_used) > 0 && (
                            <span className="flex items-center gap-0.5 text-blue-400">
                              <Droplets className="w-2.5 h-2.5" />
                              {batch.acetone_used} L
                            </span>
                          )}
                          {batch.film_roll_used && parseFloat(batch.film_roll_used) > 0 && (
                            <span className="flex items-center gap-0.5 text-factory-amber">
                              <Film className="w-2.5 h-2.5" />
                              {batch.film_roll_used} rolls
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Initial Yarn In */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-semibold text-factory-paper">
                          {batch.yarn_batch_count || Math.max(1, Math.round(rawIn / 32))} {(batch.yarn_batch_count || Math.max(1, Math.round(rawIn / 32))) === 1 ? 'Batch' : 'Batches'}
                        </div>
                        <div className="text-[10px] text-factory-muted">
                          {rawIn.toFixed(2)} KG (32 KG/batch)
                        </div>
                      </td>

                      {/* Braided Output & Phase 1 Waste */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="text-factory-paper font-medium">
                          {braidedOut > 0 ? `${braidedOut.toFixed(2)} KG` : '—'}
                        </div>
                        {parseFloat(batch.phase1_waste_kg || '0') > 0 && (
                          <div className="text-[10px] text-factory-crimson">
                            Spindle: {parseFloat(batch.phase1_waste_kg).toFixed(2)} KG
                          </div>
                        )}
                      </td>

                      {/* Finished Output & Store Sacks */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="text-emerald-400 font-bold">
                          {finishedOut > 0 ? `${finishedOut.toFixed(2)} KG` : '—'}
                        </div>
                        {finishedOut > 0 && (
                          <div className="mt-0.5 font-sans">
                            {batch.bag_count > 0 ? (
                              <div className="text-[10px] text-emerald-300 font-semibold flex items-center gap-1">
                                <Package className="w-2.5 h-2.5" />
                                <span>{batch.bag_count} {batch.bag_count === 1 ? 'sack' : 'sacks'} in store</span>
                                <span className="font-mono font-bold">({batch.total_packed_kg || finishedOut.toFixed(2)} KG)</span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-factory-muted">
                                0 sacks in store
                              </div>
                            )}
                            {parseFloat(batch.remaining_unpacked_kg || '0') > 0 && (
                              <div className="text-[9px] text-factory-amber font-medium">
                                {batch.remaining_unpacked_kg} KG unpacked
                              </div>
                            )}
                          </div>
                        )}
                        {parseFloat(batch.phase2_waste_kg || '0') > 0 && (
                          <div className="text-[10px] text-factory-crimson">
                            Tipping: {parseFloat(batch.phase2_waste_kg).toFixed(2)} KG
                          </div>
                        )}
                      </td>

                      {/* Total Waste */}
                      <td className="py-3.5 px-4 font-mono">
                        <span className={totalWaste > 0 ? 'text-factory-crimson font-medium' : 'text-factory-muted'}>
                          {totalWaste > 0 ? `${totalWaste.toFixed(2)} KG` : '—'}
                        </span>
                        {wastePct > 0 && (
                          <div className="text-[10px] text-factory-muted">
                            ({wastePct.toFixed(1)}%)
                          </div>
                        )}
                      </td>

                      {/* Overall Efficiency / Yield % */}
                      <td className="py-3.5 px-4 font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-xs inline-block ${
                            yieldNum >= 92
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : yieldNum > 0
                              ? 'bg-factory-amber/10 text-factory-amber'
                              : 'text-factory-muted'
                          }`}
                        >
                          {yieldNum > 0 ? `${yieldNum.toFixed(1)}%` : '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider inline-block ${
                            batch.status === 'COMPLETED'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : batch.status === 'TRANSFERRED'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : batch.status === 'PHASE_1_COMPLETE'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-factory-amber/20 text-factory-amber border border-factory-amber/30'
                          }`}
                        >
                          {batch.status === 'IN_PROGRESS'
                            ? '1. BRAIDING IN B1'
                            : batch.status === 'TRANSFERRED'
                            ? '2. IN TRANSIT / B2'
                            : batch.status === 'COMPLETED'
                            ? '3. STORED GOODS'
                            : batch.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Step Actions: Move to B2, Move to Store, Edit, Delete */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Step 2 Action: Move from B1 to B2 by Inputting Weight */}
                          {batch.status === 'IN_PROGRESS' && (
                            <button
                              onClick={() => {
                                setB2Batch(batch);
                                setB2BraidedWeight((rawIn * 0.965).toFixed(2));
                                setB2TransferredBy(batch.supervisor || '');
                                setB2Notes('');
                                setActionError(null);
                              }}
                              className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded border border-blue-500/30 text-xs font-semibold cursor-pointer flex items-center gap-1 shadow-sm"
                              title="Step 2: Input Processed Lace Weight & Move to Building 2"
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                              Weigh Lace & Move to B2
                            </button>
                          )}

                          {/* Step 3 Action: Weigh Finished Laces & Move to Store */}
                          {(batch.status === 'TRANSFERRED' || batch.status === 'PHASE_1_COMPLETE' || batch.status === 'PHASE_2_IN_PROGRESS') && (
                            <button
                              onClick={() => {
                                setStoreBatch(batch);
                                const inputCord = parseFloat(batch.tipping_input_kg || batch.braided_output_kg || '0');
                                const estFinished = (inputCord * 0.97).toFixed(2);
                                setStoreFinishedWeight(estFinished);
                                const estNum = parseFloat(estFinished);
                                const count = Math.max(1, Math.round(estNum / 32));
                                const defWeights = Array(count).fill((estNum / count).toFixed(2));
                                setStoreSackWeights(defWeights.length > 0 ? defWeights : ['32.00']);
                                setPackSackDirectly(true);
                                setActionError(null);
                              }}
                              className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded border border-emerald-500/30 text-xs font-semibold cursor-pointer flex items-center gap-1 shadow-sm"
                              title="Step 3: Weigh Finished Shoelaces & Move to Store"
                            >
                              <Warehouse className="w-3 h-3" />
                              Weigh & Move to Store
                            </button>
                          )}

                          {/* Completed Run: Pack Additional Sacks as much as desired */}
                          {batch.status === 'COMPLETED' && (
                            <button
                              onClick={() => {
                                setSelectedBatch(batch);
                                const rem = parseFloat(batch.remaining_unpacked_kg || '0');
                                setBagWeight(rem > 0 ? rem.toFixed(2) : '32.00');
                                setShowPackModal(true);
                              }}
                              className="px-2.5 py-1 bg-factory-rust hover:bg-factory-rustLight text-white rounded text-xs font-semibold flex items-center gap-1 shadow cursor-pointer"
                              title="Pack Finished Sacks to Store"
                            >
                              <Package className="w-3 h-3" />
                              + Pack Sacks ({batch.bag_count || 0})
                            </button>
                          )}

                          {/* Quick Edit Button (Edit/Fix Amounts Anytime) */}
                          <button
                            onClick={() => handleOpenEdit(batch)}
                            className="p-1.5 text-factory-muted hover:text-factory-amber hover:bg-factory-dark rounded transition-colors cursor-pointer"
                            title="Edit Run / Fix Amounts"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Delete Button */}
                          <button
                            onClick={() => {
                              setActionError(null);
                              setDeletingBatch(batch);
                            }}
                            className="p-1.5 text-factory-muted hover:text-factory-crimson hover:bg-factory-crimson/10 rounded transition-colors cursor-pointer"
                            title="Delete Production Run"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: STEP 1 - Start Batch & Request Raw Materials */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-factory-darkBorder pb-3">
              <div>
                <h2 className="text-base font-bold font-heading text-factory-paper flex items-center gap-2">
                  <Factory className="w-4 h-4 text-factory-amber" />
                  Step 1: Start Production Run & Request Raw Materials
                </h2>
                <p className="text-[11px] text-factory-muted mt-0.5">
                  Prepares the batch and automatically fetches live stock from the warehouse.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchFreshStock}
                  disabled={stockLoading}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-factory-darkBorder bg-factory-dark hover:bg-factory-darkCard text-factory-muted hover:text-factory-paper text-[11px] transition-colors cursor-pointer"
                  title="Re-check live warehouse inventory"
                >
                  <RefreshCw className={`w-3 h-3 ${stockLoading ? 'animate-spin text-factory-amber' : ''}`} />
                  <span>{stockLoading ? 'Fetching Stock...' : 'Refresh Stock'}</span>
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-factory-muted hover:text-factory-paper text-sm cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Live Warehouse Sync Status Banner */}
            <div className="px-3 py-1.5 rounded-lg bg-factory-dark/90 border border-factory-darkBorder/70 text-[11px] flex items-center justify-between text-factory-muted">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${stockLoading ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                <span className="text-factory-cream font-medium">
                  {stockLoading ? 'Syncing warehouse inventory...' : 'Live Warehouse Stock Connected'}
                </span>
              </span>
              {stockLastRefreshed && (
                <span className="font-mono text-[10px]">
                  Refreshed {stockLastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-factory-crimson/20 border border-factory-crimson/40 text-factory-crimson text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleCreateBatch} className="space-y-4 text-xs">
              {/* Shoe Lace Product */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-factory-muted font-medium">Shoe Lace Product to Produce *</label>
                  {selectedProduct && (
                    <span className="text-[10px] text-factory-muted font-mono">
                      Current Store: <strong className="text-emerald-400">{parseFloat(String(selectedProduct.stock?.calculated_stock || selectedProduct.stock?.total || '0')).toFixed(2)} KG</strong>
                    </span>
                  )}
                </div>
                <select
                  value={newBatch.product_variant}
                  onChange={(e) => handleSelectProduct(e.target.value)}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-amber"
                  required
                >
                  <option value="">-- Choose Product Variant --</option>
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.serial_code} - {v.color_details?.name || 'Standard'} ({v.thickness_details?.name || 'Standard'})
                    </option>
                  ))}
                </select>

                {selectedProduct && (
                  <div className="flex flex-wrap items-center justify-between mt-1.5 px-3 py-2 rounded-lg bg-factory-dark/80 border border-factory-darkBorder text-[11px] gap-2">
                    <div className="flex items-center gap-1.5 text-factory-cream">
                      <Package className="w-3.5 h-3.5 text-factory-amber" />
                      <span>Store Stock:</span>
                      <span className="font-semibold font-mono text-emerald-400">
                        {parseFloat(String(selectedProduct.stock?.calculated_stock || selectedProduct.stock?.total || '0')).toFixed(2)} KG
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-factory-muted">
                      <span>Color: <strong className="text-factory-paper">{selectedProduct.color_details?.name || 'Standard'}</strong></span>
                      <span className="text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
                        ✓ Auto-matched Yarn & Film
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Raw Material Selection: Yarn (Standard 32 KG Batches) */}
              <div className="bg-factory-dark/60 p-3.5 rounded-lg border border-factory-darkBorder space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-factory-amber font-semibold flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <Layers className="w-3.5 h-3.5" />
                    1. Raw Yarn Request (Standard 32 KG Batches)
                  </label>
                  {selectedYarnStock && (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      yarnAvailableKg > 0 
                        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' 
                        : 'bg-red-950/40 text-red-300 border-red-800/40'
                    }`}>
                      Store Stock: <strong className="font-bold">{yarnAvailableKg.toFixed(2)} KG</strong>
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Select Polyester Yarn *</label>
                  <select
                    value={newBatch.raw_material_yarn}
                    onChange={(e) => setNewBatch({ ...newBatch, raw_material_yarn: e.target.value })}
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-2.5 py-1.5 text-factory-paper focus:outline-none focus:border-factory-amber"
                    required
                  >
                    <option value="">-- Choose Yarn --</option>
                    {yarnVariants.map((y) => {
                      const avail = parseFloat(String(y.total_available_kg || 0));
                      return (
                        <option key={y.id} value={y.id}>
                          {y.material_type_name} - {y.color_name} ({avail.toFixed(1)} KG available in store)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Warehouse Stock Availability Preview Card */}
                {selectedYarnStock && (
                  <div className={`p-3 rounded-lg border text-xs space-y-2.5 transition-all ${
                    isYarnStockSufficient 
                      ? 'bg-emerald-950/20 border-emerald-500/30' 
                      : 'bg-amber-950/25 border-amber-500/40'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-factory-paper flex items-center gap-1.5">
                        <Warehouse className="w-3.5 h-3.5 text-factory-amber" />
                        Store Availability: {selectedYarnStock.color_name} Polyester Yarn
                      </span>
                      <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                        yarnAvailableKg > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                      }`}>
                        {yarnAvailableKg.toFixed(2)} KG Available
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                      <div className="bg-factory-dark/70 p-2 rounded border border-factory-darkBorder/60">
                        <div className="text-[10px] text-factory-muted">Available in Store</div>
                        <div className="font-mono font-bold text-emerald-400 mt-0.5">{yarnAvailableKg.toFixed(1)} KG</div>
                      </div>
                      <div className="bg-factory-dark/70 p-2 rounded border border-factory-darkBorder/60">
                        <div className="text-[10px] text-factory-muted">Required ({newBatch.yarn_batch_count}b)</div>
                        <div className="font-mono font-bold text-factory-paper mt-0.5">{yarnRequestedKg.toFixed(1)} KG</div>
                      </div>
                      <div className="bg-factory-dark/70 p-2 rounded border border-factory-darkBorder/60">
                        <div className="text-[10px] text-factory-muted">Balance After</div>
                        <div className={`font-mono font-bold mt-0.5 ${yarnAvailableKg >= yarnRequestedKg ? 'text-blue-400' : 'text-factory-crimson'}`}>
                          {(yarnAvailableKg - yarnRequestedKg).toFixed(1)} KG
                        </div>
                      </div>
                    </div>

                    {!isYarnStockSufficient && (
                      <div className="flex items-start gap-2 text-[11px] text-amber-200 bg-amber-950/60 p-2.5 rounded-lg border border-amber-600/40">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold block text-amber-300">Insufficient Warehouse Stock:</strong>
                          <span>
                            Only {yarnAvailableKg.toFixed(1)} KG available in store, but {yarnRequestedKg.toFixed(1)} KG is required for {newBatch.yarn_batch_count} {newBatch.yarn_batch_count === 1 ? 'batch' : 'batches'} (Deficit: {yarnStockShortage.toFixed(1)} KG). Please reduce batches or add new yarn stock in Raw Materials.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 32 KG Batch Standard Selector */}
                <div className="p-3 bg-factory-dark rounded-lg border border-factory-amber/30 space-y-2">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <span className="text-xs font-semibold text-factory-paper flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-factory-amber" />
                        Store Batch Count (1 Batch = 32 KG)
                      </span>
                      <p className="text-[10px] text-factory-muted">
                        Yarn leaves store in fixed 32 KG units (1=32kg, 2=64kg, 3=96kg, 4=128kg...)
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-factory-darkBorder rounded-lg bg-factory-darkCard overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            const nextCount = Math.max(1, (newBatch.yarn_batch_count || 1) - 1);
                            setNewBatch({
                              ...newBatch,
                              yarn_batch_count: nextCount,
                              raw_yarn_input_kg: (nextCount * 32).toFixed(2)
                            });
                          }}
                          className="px-2.5 py-1 text-factory-muted hover:text-factory-paper hover:bg-factory-dark transition-colors cursor-pointer text-sm font-bold"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={newBatch.yarn_batch_count}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value) || 1);
                            setNewBatch({
                              ...newBatch,
                              yarn_batch_count: val,
                              raw_yarn_input_kg: (val * 32).toFixed(2)
                            });
                          }}
                          className="w-12 py-1 text-center bg-transparent text-factory-paper font-mono font-bold text-xs focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const nextCount = (newBatch.yarn_batch_count || 1) + 1;
                            setNewBatch({
                              ...newBatch,
                              yarn_batch_count: nextCount,
                              raw_yarn_input_kg: (nextCount * 32).toFixed(2)
                            });
                          }}
                          className="px-2.5 py-1 text-factory-muted hover:text-factory-paper hover:bg-factory-dark transition-colors cursor-pointer text-sm font-bold"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-[11px] text-factory-amber font-mono font-semibold">
                        = {(Number(newBatch.yarn_batch_count) * 32).toFixed(2)} KG
                      </span>
                    </div>
                  </div>

                  {/* Quick Pick Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-factory-muted mr-1">Quick Pick:</span>
                    {[1, 2, 3, 4, 5].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => {
                          setNewBatch({
                            ...newBatch,
                            yarn_batch_count: cnt,
                            raw_yarn_input_kg: (cnt * 32).toFixed(2)
                          });
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                          newBatch.yarn_batch_count === cnt
                            ? 'bg-factory-amber text-black'
                            : 'bg-factory-darkCard border border-factory-darkBorder text-factory-paper hover:border-factory-amber'
                        }`}
                      >
                        {cnt} {cnt === 1 ? 'Batch' : 'Batches'} ({cnt * 32} KG)
                      </button>
                    ))}
                  </div>

                  {/* Measured scale total with fine-tuning */}
                  <div className="pt-1.5 flex items-center justify-between border-t border-factory-darkBorder/60 text-[11px]">
                    <span className="text-factory-muted">Scale Total Weight:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        value={newBatch.raw_yarn_input_kg}
                        onChange={(e) => {
                          const val = e.target.value;
                          const count = Math.max(1, Math.round(parseFloat(val || '32') / 32));
                          setNewBatch({
                            ...newBatch,
                            raw_yarn_input_kg: val,
                            yarn_batch_count: count
                          });
                        }}
                        className="w-24 bg-factory-darkCard border border-factory-darkBorder rounded px-2 py-0.5 text-right text-factory-paper font-semibold font-mono text-xs focus:outline-none focus:border-factory-amber"
                        required
                      />
                      <span className="text-factory-muted font-mono font-semibold">KG</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Raw Material Selection: Acetone & Film Roll */}
              <div className="bg-factory-dark/60 p-3.5 rounded-lg border border-factory-darkBorder space-y-2.5">
                <span className="text-blue-400 font-semibold flex items-center justify-between uppercase tracking-wider text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5" />
                    2. Tipping Materials Request (Step 2 Aglets)
                  </div>
                  <span className="text-[10px] text-factory-muted normal-case font-normal">
                    Plastic film & acetone for shoelace tips
                  </span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-factory-muted font-medium">Acetone Solvent (Liters)</label>
                      {acetoneStock && (
                        <span className="text-[10px] font-mono text-emerald-400">
                          Store: {parseFloat(String(acetoneStock.total_available_kg || 0)).toFixed(1)} L
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newBatch.acetone_used}
                      onChange={(e) => setNewBatch({ ...newBatch, acetone_used: e.target.value })}
                      className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-2.5 py-1.5 text-factory-paper font-mono focus:outline-none focus:border-factory-amber"
                    />
                    <span className="text-[10px] text-factory-muted mt-0.5 block">Solvent for tipping machine</span>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-factory-muted font-medium">Film Roll (Plastic Wrap)</label>
                      {selectedFilmStock && (
                        <span className="text-[10px] font-mono text-emerald-400">
                          Store: {parseFloat(String(selectedFilmStock.total_available_kg || 0)).toFixed(0)} rolls
                        </span>
                      )}
                    </div>
                    <select
                      value={newBatch.film_roll_variant}
                      onChange={(e) => setNewBatch({ ...newBatch, film_roll_variant: e.target.value })}
                      className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-2.5 py-1 text-factory-paper mb-1 focus:outline-none focus:border-factory-amber"
                    >
                      <option value="">-- Choose Film Roll --</option>
                      {filmVariants.map((f) => {
                        const rAvail = parseFloat(String(f.total_available_kg || 0));
                        return (
                          <option key={f.id} value={f.id}>
                            {f.color_name} ({rAvail.toFixed(0)} rolls in store)
                          </option>
                        );
                      })}
                    </select>
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newBatch.film_roll_used}
                        onChange={(e) => setNewBatch({ ...newBatch, film_roll_used: e.target.value })}
                        placeholder="Rolls"
                        className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-2.5 py-1 text-factory-paper text-xs font-mono"
                      />
                      <span className="text-[10px] text-factory-muted shrink-0">Rolls</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shift Supervisor */}
              <div>
                <label className="block text-factory-muted mb-1 font-medium">Shift Supervisor *</label>
                <input
                  type="text"
                  value={newBatch.supervisor}
                  onChange={(e) => setNewBatch({ ...newBatch, supervisor: e.target.value })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-amber"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-factory-muted mb-1 font-medium">Notes & Work Instructions</label>
                <textarea
                  value={newBatch.notes}
                  onChange={(e) => setNewBatch({ ...newBatch, notes: e.target.value })}
                  placeholder="Optional shift notes..."
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper h-16 focus:outline-none focus:border-factory-amber"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-factory-dark border border-factory-darkBorder/80 text-[11px] text-factory-muted flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Submitting will generate a formal Inventory Stock Request and issue materials to Building 1.</span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-factory-darkBorder rounded-lg text-factory-muted hover:text-factory-paper cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-factory-rust hover:bg-factory-rustLight text-white rounded-lg font-semibold flex items-center gap-2 cursor-pointer shadow"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Issue Materials & Start Braiding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: STEP 2 - Weigh Processed Lace & Move to Building 2 */}
      {b2Batch && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-factory-darkBorder pb-3">
              <div>
                <h2 className="text-base font-bold font-heading text-factory-paper flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                  Step 2: Weigh Lace & Move (B1 → B2)
                </h2>
                <p className="text-[11px] text-factory-muted">
                  Input braided cord weight to calculate spindle waste and move to Building 2.
                </p>
              </div>
              <button
                onClick={() => setB2Batch(null)}
                className="text-factory-muted hover:text-factory-paper text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-factory-crimson/20 border border-factory-crimson/40 text-factory-crimson text-xs">
                {actionError}
              </div>
            )}

            <form onSubmit={handleMoveToB2Submit} className="space-y-4 text-xs">
              <div className="bg-factory-dark p-3 rounded-lg border border-factory-darkBorder space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-factory-muted">Production Run:</span>
                  <span className="font-mono font-bold text-factory-amber">{b2Batch.batch_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-factory-muted">Shoe Lace Product:</span>
                  <span className="font-semibold text-factory-paper">{b2Batch.product_name}</span>
                </div>
                <div className="flex justify-between text-factory-paper">
                  <span className="text-factory-muted">Raw Yarn Issued:</span>
                  <span className="font-mono font-semibold">
                    {b2Batch.yarn_batch_count || Math.max(1, Math.round(parseFloat(b2Batch.raw_yarn_input_kg || '32') / 32))} {(b2Batch.yarn_batch_count || Math.max(1, Math.round(parseFloat(b2Batch.raw_yarn_input_kg || '32') / 32))) === 1 ? 'Batch' : 'Batches'} ({b2Batch.raw_yarn_input_kg} KG)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">
                  Weighed Processed Lace / Braided Cords (KG) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={b2BraidedWeight}
                  onChange={(e) => setB2BraidedWeight(e.target.value)}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper font-mono font-bold text-sm focus:outline-none focus:border-blue-400"
                  required
                  autoFocus
                />
                <span className="text-[11px] text-factory-muted mt-0.5 block">
                  Measured weight of continuous cords coming off the braiding spindles.
                </span>
              </div>

              {/* Live Spindle Waste Calculation Card */}
              <div className="p-3 bg-factory-dark rounded-lg border border-factory-darkBorder space-y-1.5 text-xs">
                <div className="flex justify-between text-factory-crimson font-medium">
                  <span>Phase 1 Spindle Yarn Waste:</span>
                  <span className="font-mono font-bold">{b2Calculations.wasteKg.toFixed(2)} KG ({b2Calculations.wastePct.toFixed(1)}%)</span>
                </div>
                <div className="flex justify-between text-blue-400 font-semibold">
                  <span>Braiding Yield Efficiency:</span>
                  <span className="font-mono">{b2Calculations.yieldPct.toFixed(1)}%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Transferred By</label>
                  <input
                    type="text"
                    value={b2TransferredBy}
                    onChange={(e) => setB2TransferredBy(e.target.value)}
                    placeholder="Floor supervisor"
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-2.5 py-1.5 text-factory-paper"
                  />
                </div>
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Handover Notes</label>
                  <input
                    type="text"
                    value={b2Notes}
                    onChange={(e) => setB2Notes(e.target.value)}
                    placeholder="Optional transit note"
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-2.5 py-1.5 text-factory-paper"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setB2Batch(null)}
                  className="px-4 py-2 border border-factory-darkBorder rounded-lg text-factory-muted hover:text-factory-paper cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center gap-2 cursor-pointer shadow"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Record Weight & Move to B2
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: STEP 3 - Weigh Finished Shoelaces & Move to Store */}
      {storeBatch && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-factory-darkBorder pb-3">
              <div>
                <h2 className="text-base font-bold font-heading text-factory-paper flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-emerald-400" />
                  Step 3: Weigh Finished Shoelaces & Move to Store
                </h2>
                <p className="text-[11px] text-factory-muted">
                  Record tipped lace weight, finalize factory yield %, and pack into store sacks.
                </p>
              </div>
              <button
                onClick={() => setStoreBatch(null)}
                className="text-factory-muted hover:text-factory-paper text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-factory-crimson/20 border border-factory-crimson/40 text-factory-crimson text-xs">
                {actionError}
              </div>
            )}

            <form onSubmit={handleMoveToStoreSubmit} className="space-y-4 text-xs">
              <div className="bg-factory-dark p-3 rounded-lg border border-factory-darkBorder grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-factory-muted block text-[10px]">Production Run:</span>
                  <span className="font-mono font-bold text-factory-amber">{storeBatch.batch_number}</span>
                </div>
                <div>
                  <span className="text-factory-muted block text-[10px]">Initial Yarn Batches:</span>
                  <span className="font-mono font-bold text-factory-paper">
                    {storeBatch.yarn_batch_count || Math.max(1, Math.round(parseFloat(storeBatch.raw_yarn_input_kg || '32') / 32))} Batches ({storeBatch.raw_yarn_input_kg} KG)
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-factory-muted block text-[10px]">Tipping Input Cords (from B1):</span>
                  <span className="font-mono font-bold text-blue-400">
                    {storeBatch.tipping_input_kg || storeBatch.braided_output_kg} KG
                  </span>
                </div>
              </div>

              {/* Finished Shoelaces Scale Weight */}
              <div>
                <label className="block text-factory-muted mb-1 font-medium">
                  Weighed Finished Shoelaces Output (KG) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={storeFinishedWeight}
                  onChange={(e) => setStoreFinishedWeight(e.target.value)}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-emerald-400 font-mono font-bold text-sm focus:outline-none focus:border-emerald-400"
                  required
                  autoFocus
                />
                <span className="text-[10px] text-factory-muted mt-0.5 block">
                  Total weight of plastic-tipped & cut shoelaces ready for warehouse store.
                </span>
              </div>

              {/* Live Waste & Yield Recalculation Card */}
              <div className="p-3 bg-factory-dark rounded-lg border border-factory-darkBorder space-y-1.5 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <span className="text-factory-muted block">Step 1 Spindle:</span>
                    <span className="font-mono text-factory-crimson font-medium">{storeCalculations.p1Waste.toFixed(2)} KG</span>
                  </div>
                  <div>
                    <span className="text-factory-muted block">Step 2 Tipping:</span>
                    <span className="font-mono text-factory-crimson font-medium">{storeCalculations.p2Waste.toFixed(2)} KG</span>
                  </div>
                  <div>
                    <span className="text-factory-muted block">Total Waste:</span>
                    <span className="font-mono text-factory-crimson font-bold">
                      {storeCalculations.totalWaste.toFixed(2)} KG ({storeCalculations.wastePct.toFixed(1)}%)
                    </span>
                  </div>
                  <div>
                    <span className="text-factory-muted block">Factory Yield:</span>
                    <span className="font-mono text-emerald-400 font-bold text-sm">
                      {storeCalculations.yieldPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Weigh & Pack Finished Sacks into Store */}
              <div className="bg-factory-dark/60 p-3.5 rounded-lg border border-factory-darkBorder space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-factory-paper font-semibold flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                      <Package className="w-3.5 h-3.5 text-emerald-400" />
                      Pack Finished Sacks into Store
                    </span>
                    <p className="text-[10px] text-factory-muted">
                      Pack as much as you want into finished sacks — all weighed sacks count directly from this production batch.
                    </p>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-factory-amber">
                    <input
                      type="checkbox"
                      checked={packSackDirectly}
                      onChange={(e) => setPackSackDirectly(e.target.checked)}
                      className="rounded border-factory-darkBorder accent-factory-amber"
                    />
                    <span>Pack Sacks to Store Now</span>
                  </label>
                </div>

                {packSackDirectly && (
                  <div className="space-y-3 pt-1">
                    {/* Quick Distribution Helpers */}
                    <div className="flex flex-wrap items-center gap-1.5 bg-factory-dark p-2 rounded-lg border border-factory-darkBorder">
                      <span className="text-[10px] text-factory-muted mr-1">Quick Presets:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const fin = parseFloat(storeFinishedWeight) || 0;
                          const count = Math.max(1, Math.round(fin / 32));
                          const equalWeight = (fin / count).toFixed(2);
                          setStoreSackWeights(Array(count).fill(equalWeight));
                        }}
                        className="px-2 py-0.5 rounded text-[10px] bg-factory-darkCard border border-factory-darkBorder text-factory-paper hover:border-factory-amber font-mono font-medium transition-colors cursor-pointer"
                      >
                        Auto-Split into 32 KG Sacks
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStoreSackWeights([storeFinishedWeight || '32.00']);
                        }}
                        className="px-2 py-0.5 rounded text-[10px] bg-factory-darkCard border border-factory-darkBorder text-factory-paper hover:border-factory-amber font-mono font-medium transition-colors cursor-pointer"
                      >
                        Single Sack ({storeFinishedWeight} KG)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStoreSackWeights((prev) => [...prev, '32.00']);
                        }}
                        className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="w-2.5 h-2.5" /> Add Another Sack
                      </button>
                    </div>

                    {/* Sack Inputs List */}
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {storeSackWeights.map((sw, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-factory-dark p-2 rounded-lg border border-factory-darkBorder">
                          <span className="text-[10px] font-mono text-factory-muted w-14 shrink-0">
                            Sack #{idx + 1}:
                          </span>
                          <div className="flex-1 flex items-center gap-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0.1"
                              value={sw}
                              onChange={(e) => {
                                const updated = [...storeSackWeights];
                                updated[idx] = e.target.value;
                                setStoreSackWeights(updated);
                              }}
                              placeholder="Weight in KG"
                              className="w-full bg-factory-darkCard border border-factory-darkBorder rounded px-2.5 py-1 text-factory-paper font-mono font-bold text-xs focus:outline-none focus:border-emerald-400"
                              required
                            />
                            <span className="text-[10px] text-factory-muted font-mono shrink-0">KG</span>
                          </div>
                          {storeSackWeights.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setStoreSackWeights(storeSackWeights.filter((_, i) => i !== idx));
                              }}
                              className="text-factory-muted hover:text-factory-crimson p-1 text-xs cursor-pointer"
                              title="Remove sack"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Live Packed vs Finished Tally */}
                    <div className="p-2 bg-factory-dark rounded border border-factory-darkBorder/80 flex flex-col sm:flex-row justify-between items-start sm:items-center text-[11px] gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-factory-muted">
                          Sacks to Store: <strong className="text-factory-paper font-mono">{storeSackWeights.length}</strong>
                        </span>
                        <span className="text-factory-muted">
                          Total Packed: <strong className="text-emerald-400 font-mono">
                            {storeSackWeights.reduce((sum, w) => sum + (parseFloat(w) || 0), 0).toFixed(2)} KG
                          </strong>
                        </span>
                      </div>
                      <div className="text-[10px]">
                        {parseFloat(storeFinishedWeight) > storeSackWeights.reduce((sum, w) => sum + (parseFloat(w) || 0), 0) ? (
                          <span className="text-factory-amber font-medium">
                            Remaining unpacked: {(parseFloat(storeFinishedWeight) - storeSackWeights.reduce((sum, w) => sum + (parseFloat(w) || 0), 0)).toFixed(2)} KG
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> All {storeFinishedWeight} KG accounted for
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-factory-muted mb-1 font-medium">Store Shelf Location</label>
                      <input
                        type="text"
                        value={storeLocation}
                        onChange={(e) => setStoreLocation(e.target.value)}
                        className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-2.5 py-1.5 text-factory-paper focus:outline-none focus:border-emerald-400 text-xs"
                        required={packSackDirectly}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStoreBatch(null)}
                  className="px-4 py-2 border border-factory-darkBorder rounded-lg text-factory-muted hover:text-factory-paper cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center gap-2 cursor-pointer shadow"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Save Weight & Move to Store
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Pack Additional Store Sack (Strictly 25.00 - 40.00 KG) */}
      {showPackModal && selectedBatch && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-factory-darkBorder pb-3">
              <h2 className="text-base font-bold font-heading text-factory-paper flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                Pack Additional Shoe Lace Sack
              </h2>
              <button
                onClick={() => setShowPackModal(false)}
                className="text-factory-muted hover:text-factory-paper text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-factory-dark p-3 rounded-lg border border-factory-darkBorder text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-factory-muted">Production Run:</span>
                <span className="font-semibold text-factory-amber">{selectedBatch.batch_number}</span>
              </div>
              <div className="text-factory-paper font-medium">{selectedBatch.product_name}</div>
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-factory-darkBorder/60 text-[11px]">
                <div>
                  <span className="text-factory-muted block">Finished Output:</span>
                  <span className="font-mono text-factory-paper font-semibold">{selectedBatch.finished_output_kg} KG</span>
                </div>
                <div>
                  <span className="text-factory-muted block">In Store:</span>
                  <span className="font-mono text-emerald-400 font-semibold">{selectedBatch.total_packed_kg || '0.00'} KG ({selectedBatch.bag_count || 0} sacks)</span>
                </div>
                <div>
                  <span className="text-factory-muted block">Remaining to Pack:</span>
                  <span className="font-mono text-factory-amber font-semibold">{selectedBatch.remaining_unpacked_kg || '0.00'} KG</span>
                </div>
              </div>
            </div>

            {packError && (
              <div className="p-3 rounded-lg bg-factory-crimson/20 border border-factory-crimson/40 text-factory-crimson text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{packError}</span>
              </div>
            )}

            <form onSubmit={handlePackAdditionalSack} className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-factory-muted font-medium">Sack Scale Weight (KG) *</label>
                  <div className="flex gap-1">
                    {parseFloat(selectedBatch.remaining_unpacked_kg || '0') > 0 && (
                      <button
                        type="button"
                        onClick={() => setBagWeight(selectedBatch.remaining_unpacked_kg || '32.00')}
                        className="text-[10px] px-2 py-0.5 bg-factory-darkCard border border-factory-darkBorder text-factory-amber hover:border-factory-amber rounded font-mono cursor-pointer"
                      >
                        Pack Remaining ({selectedBatch.remaining_unpacked_kg} KG)
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setBagWeight('32.00')}
                      className="text-[10px] px-2 py-0.5 bg-factory-darkCard border border-factory-darkBorder text-factory-paper hover:border-factory-amber rounded font-mono cursor-pointer"
                    >
                      32.00 KG
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={bagWeight}
                  onChange={(e) => setBagWeight(e.target.value)}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper font-semibold text-sm focus:outline-none focus:border-emerald-400 font-mono"
                  required
                />
                <p className="text-[11px] text-factory-muted mt-1">
                  Pack as much weight as needed. The sack will be registered into warehouse store inventory and counted against this batch.
                </p>
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">Store Shelf Location</label>
                <input
                  type="text"
                  value={packStoreLocation}
                  onChange={(e) => setPackStoreLocation(e.target.value)}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPackModal(false)}
                  className="px-4 py-2 border border-factory-darkBorder rounded-lg text-factory-muted hover:text-factory-paper cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center gap-2 shadow cursor-pointer"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Save Sack to Store
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: EDIT Production Batch (Flexibility to Fix Amounts) */}
      {editingBatch && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-factory-darkBorder pb-3">
              <div>
                <h2 className="text-base font-bold font-heading text-factory-paper flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-factory-amber" />
                  Edit Production Run: {editingBatch.batch_number}
                </h2>
                <p className="text-[11px] text-factory-muted">
                  Correct any weight, material, or status if a wrong amount was entered.
                </p>
              </div>
              <button
                onClick={() => setEditingBatch(null)}
                className="text-factory-muted hover:text-factory-paper text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-factory-crimson/20 border border-factory-crimson/40 text-factory-crimson text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {/* Product & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Shoe Lace Product</label>
                  <select
                    value={editFormData.product_variant}
                    onChange={(e) => setEditFormData({ ...editFormData, product_variant: e.target.value })}
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-2.5 py-1.5 text-factory-paper"
                    required
                  >
                    {variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.serial_code} - {v.color_details?.name || 'Standard'} ({v.thickness_details?.name || 'Standard'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Run Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-2.5 py-1.5 text-factory-paper font-mono font-semibold"
                  >
                    <option value="PLANNED">PLANNED</option>
                    <option value="IN_PROGRESS">1. IN PROGRESS (Braiding B1)</option>
                    <option value="TRANSFERRED">2. TRANSFERRED (Moved to B2)</option>
                    <option value="COMPLETED">3. COMPLETED (Stored in Warehouse)</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>

              {/* Weight Stages (Step 1 & Step 2) */}
              <div className="bg-factory-dark p-3 rounded-lg border border-factory-darkBorder space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-factory-amber uppercase tracking-wider block">
                    Measured Weights Across Lifecycle (KG)
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-factory-muted">Store Batches (32 KG):</span>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={editFormData.yarn_batch_count}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        setEditFormData({
                          ...editFormData,
                          yarn_batch_count: val,
                          raw_yarn_input_kg: (val * 32).toFixed(2)
                        });
                      }}
                      className="w-12 bg-factory-darkCard border border-factory-darkBorder rounded px-1.5 py-0.5 text-center text-factory-paper font-mono font-bold text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-factory-muted mb-1 font-medium">Initial Yarn (KG)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData.raw_yarn_input_kg}
                      onChange={(e) => {
                        const val = e.target.value;
                        const count = Math.max(1, Math.round(parseFloat(val || '32') / 32));
                        setEditFormData({
                          ...editFormData,
                          raw_yarn_input_kg: val,
                          yarn_batch_count: count
                        });
                      }}
                      className="w-full bg-factory-darkCard border border-factory-darkBorder rounded px-2 py-1 text-factory-paper font-semibold font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-factory-muted mb-1 font-medium">Braided (KG)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData.braided_output_kg}
                      onChange={(e) => setEditFormData({ ...editFormData, braided_output_kg: e.target.value })}
                      className="w-full bg-factory-darkCard border border-factory-darkBorder rounded px-2 py-1 text-factory-paper font-semibold font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-factory-muted mb-1 font-medium">Tipping In (KG)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData.tipping_input_kg}
                      onChange={(e) => setEditFormData({ ...editFormData, tipping_input_kg: e.target.value })}
                      className="w-full bg-factory-darkCard border border-factory-darkBorder rounded px-2 py-1 text-factory-paper font-semibold font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-factory-muted mb-1 font-medium">Finished (KG)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData.finished_output_kg}
                      onChange={(e) => setEditFormData({ ...editFormData, finished_output_kg: e.target.value })}
                      className="w-full bg-factory-darkCard border border-factory-darkBorder rounded px-2 py-1 text-emerald-400 font-bold font-mono"
                    />
                  </div>
                </div>

                {/* Live Recalculated Preview Card */}
                <div className="mt-2 p-2.5 bg-factory-darkCard rounded border border-factory-darkBorder/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <span className="text-factory-muted block">Step 1 Spindle:</span>
                    <span className="font-mono text-factory-crimson font-semibold">
                      {editCalculations.p1Waste.toFixed(2)} KG
                    </span>
                  </div>
                  <div>
                    <span className="text-factory-muted block">Step 2 Tipping:</span>
                    <span className="font-mono text-factory-crimson font-semibold">
                      {editCalculations.p2Waste.toFixed(2)} KG
                    </span>
                  </div>
                  <div>
                    <span className="text-factory-muted block">Total Waste:</span>
                    <span className="font-mono text-factory-crimson font-semibold">
                      {editCalculations.totalWaste.toFixed(2)} KG ({editCalculations.wastePct.toFixed(1)}%)
                    </span>
                  </div>
                  <div>
                    <span className="text-factory-muted block">Overall Yield:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {editCalculations.yieldPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Raw Materials (Yarn, Acetone, Film Roll) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Assigned Yarn</label>
                  <select
                    value={editFormData.raw_material_yarn}
                    onChange={(e) => setEditFormData({ ...editFormData, raw_material_yarn: e.target.value })}
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded px-2 py-1.5 text-factory-paper text-[11px]"
                  >
                    <option value="">-- Standard Yarn --</option>
                    {yarnVariants.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.material_type_name} - {y.color_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Acetone (Liters)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.acetone_used}
                    onChange={(e) => setEditFormData({ ...editFormData, acetone_used: e.target.value })}
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded px-2 py-1.5 text-factory-paper font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Film Roll Used</label>
                  <div className="flex items-center gap-1">
                    <select
                      value={editFormData.film_roll_variant}
                      onChange={(e) => setEditFormData({ ...editFormData, film_roll_variant: e.target.value })}
                      className="w-2/3 bg-factory-dark border border-factory-darkBorder rounded px-1.5 py-1.5 text-factory-paper text-[10px]"
                    >
                      <option value="">-- Film Roll --</option>
                      {filmVariants.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.color_name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData.film_roll_used}
                      onChange={(e) => setEditFormData({ ...editFormData, film_roll_used: e.target.value })}
                      placeholder="Rolls"
                      className="w-1/3 bg-factory-dark border border-factory-darkBorder rounded px-1.5 py-1.5 text-factory-paper text-[11px] font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Supervisor & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Supervisor</label>
                  <input
                    type="text"
                    value={editFormData.supervisor}
                    onChange={(e) => setEditFormData({ ...editFormData, supervisor: e.target.value })}
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper"
                  />
                </div>
                <div>
                  <label className="block text-factory-muted mb-1 font-medium">Notes</label>
                  <input
                    type="text"
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBatch(null)}
                  className="px-4 py-2 border border-factory-darkBorder rounded-lg text-factory-muted hover:text-factory-paper cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-factory-amber hover:bg-factory-amberDark text-black rounded-lg font-semibold flex items-center gap-2 cursor-pointer shadow"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Delete Confirmation */}
      {deletingBatch && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 text-factory-crimson">
              <span className="p-2.5 rounded-full bg-factory-crimson/20 border border-factory-crimson/40">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-factory-paper">Delete Production Run</h3>
                <p className="text-xs text-factory-muted">Remove this batch record.</p>
              </div>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-factory-crimson/20 border border-factory-crimson/40 text-factory-crimson text-xs">
                {actionError}
              </div>
            )}

            <div className="bg-factory-dark p-3 rounded-lg border border-factory-darkBorder text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-factory-muted">Run Number:</span>
                <span className="font-mono font-bold text-factory-amber">{deletingBatch.batch_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-factory-muted">Product:</span>
                <span className="font-semibold text-factory-paper">{deletingBatch.product_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-factory-muted">Yarn Input:</span>
                <span className="font-mono text-factory-paper">{deletingBatch.raw_yarn_input_kg} KG</span>
              </div>
            </div>

            <p className="text-xs text-factory-muted">
              Are you sure you want to delete this run? You can use this anytime if wrong amounts were entered.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingBatch(null)}
                className="px-4 py-2 border border-factory-darkBorder rounded-lg text-factory-muted hover:text-factory-paper text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteBatch}
                disabled={submitting}
                className="px-4 py-2 bg-factory-crimson hover:bg-factory-crimson/80 text-white rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer shadow"
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Yes, Delete Run
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: Full Batch Inspection / Lifecycle View */}
      {inspectingBatch && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-factory-darkBorder pb-3">
              <div>
                <h2 className="text-base font-bold font-heading text-factory-paper flex items-center gap-2">
                  <Eye className="w-4 h-4 text-factory-amber" />
                  Lifecycle Details: {inspectingBatch.batch_number}
                </h2>
                <p className="text-[11px] text-factory-muted">
                  Full step-by-step audit of materials, weights, and factory yields.
                </p>
              </div>
              <button
                onClick={() => setInspectingBatch(null)}
                className="text-factory-muted hover:text-factory-paper text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Product & Header Stats */}
              <div className="bg-factory-dark p-4 rounded-xl border border-factory-darkBorder flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <div className="text-[11px] text-factory-muted uppercase tracking-wider font-semibold">
                    Product Variant
                  </div>
                  <div className="text-sm font-bold text-factory-paper mt-0.5">
                    {inspectingBatch.product_name}
                  </div>
                  <div className="text-[11px] text-factory-muted mt-1">
                    Supervisor: {inspectingBatch.supervisor || 'N/A'} • Started: {inspectingBatch.start_date ? new Date(inspectingBatch.start_date).toLocaleDateString() : 'N/A'}
                    {inspectingBatch.stock_request_number && (
                      <span className="text-factory-amber font-mono ml-2">
                        • Stock Req: {inspectingBatch.stock_request_number}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-factory-muted uppercase tracking-wider block">Yield Efficiency</span>
                    <span className="text-lg font-mono font-bold text-emerald-400">
                      {parseFloat(inspectingBatch.yield_percentage || '0').toFixed(1)}%
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const b = inspectingBatch;
                      setInspectingBatch(null);
                      handleOpenEdit(b);
                    }}
                    className="px-3 py-1.5 bg-factory-darkCard hover:bg-factory-darkBorder/40 border border-factory-darkBorder text-factory-paper rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Pencil className="w-3 h-3 text-factory-amber" />
                    Edit
                  </button>
                </div>
              </div>

              {/* 3-Step Lifecycle Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Step 1 */}
                <div className="bg-factory-dark p-3.5 rounded-lg border border-factory-darkBorder space-y-2">
                  <div className="flex items-center justify-between text-factory-amber font-bold text-[11px] uppercase tracking-wider font-mono">
                    <span>1. Braiding (B1)</span>
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-factory-muted">Raw Yarn In:</span>
                      <span className="font-mono font-semibold text-factory-paper">
                        {inspectingBatch.yarn_batch_count || Math.max(1, Math.round(parseFloat(inspectingBatch.raw_yarn_input_kg || '32') / 32))} Batches ({inspectingBatch.raw_yarn_input_kg} KG)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-factory-muted">Braided Out:</span>
                      <span className="font-mono font-semibold text-factory-paper">{inspectingBatch.braided_output_kg} KG</span>
                    </div>
                    <div className="flex justify-between text-factory-crimson">
                      <span>Spindle Waste:</span>
                      <span className="font-mono font-semibold">{inspectingBatch.phase1_waste_kg} KG</span>
                    </div>
                  </div>
                </div>

                {/* Transfer */}
                <div className="bg-factory-dark p-3.5 rounded-lg border border-factory-darkBorder space-y-2">
                  <div className="flex items-center justify-between text-blue-400 font-bold text-[11px] uppercase tracking-wider font-mono">
                    <span>2. Transit B1 → B2</span>
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-factory-muted">Transferred:</span>
                      <span className="font-mono font-semibold text-factory-paper">
                        {inspectingBatch.tipping_input_kg || inspectingBatch.braided_output_kg} KG
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-factory-muted">Destination:</span>
                      <span className="text-blue-300 font-medium">B2 Tipping</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-factory-muted">Transit Loss:</span>
                      <span className="font-mono text-factory-muted">0.00 KG</span>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-factory-dark p-3.5 rounded-lg border border-factory-darkBorder space-y-2">
                  <div className="flex items-center justify-between text-emerald-400 font-bold text-[11px] uppercase tracking-wider font-mono">
                    <span>3. Stored Goods</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-factory-muted">Tipping In:</span>
                      <span className="font-mono font-semibold text-factory-paper">
                        {inspectingBatch.tipping_input_kg || inspectingBatch.braided_output_kg} KG
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-factory-muted">Finished Laces:</span>
                      <span className="font-mono font-bold text-emerald-400">{inspectingBatch.finished_output_kg} KG</span>
                    </div>
                    <div className="flex justify-between text-factory-crimson">
                      <span>Tip & Cut Waste:</span>
                      <span className="font-mono font-semibold">{inspectingBatch.phase2_waste_kg} KG</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Raw Materials Breakdown Table */}
              <div className="bg-factory-dark p-3.5 rounded-lg border border-factory-darkBorder">
                <span className="text-[11px] font-bold text-factory-amber uppercase tracking-wider block mb-2">
                  Raw Materials Issued from Warehouse
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-factory-darkCard p-2.5 rounded border border-factory-darkBorder">
                    <span className="text-factory-muted block text-[10px]">Polyester Yarn</span>
                    <span className="font-semibold text-factory-paper block">{inspectingBatch.raw_material_yarn_name || 'Standard'}</span>
                    <span className="font-mono text-factory-amber">
                      {inspectingBatch.yarn_batch_count || Math.max(1, Math.round(parseFloat(inspectingBatch.raw_yarn_input_kg || '32') / 32))} Batches ({inspectingBatch.raw_yarn_input_kg} KG)
                    </span>
                  </div>
                  <div className="bg-factory-darkCard p-2.5 rounded border border-factory-darkBorder">
                    <span className="text-factory-muted block text-[10px]">Acetone Solvent</span>
                    <span className="font-semibold text-factory-paper block">Industrial Acetone</span>
                    <span className="font-mono text-blue-400">{inspectingBatch.acetone_used || '0.00'} Liters</span>
                  </div>
                  <div className="bg-factory-darkCard p-2.5 rounded border border-factory-darkBorder">
                    <span className="text-factory-muted block text-[10px]">Film Roll (Aglet Wrap)</span>
                    <span className="font-semibold text-factory-paper block">{inspectingBatch.film_roll_name || 'Film Roll'}</span>
                    <span className="font-mono text-factory-amber">{inspectingBatch.film_roll_used || '0.00'} Rolls</span>
                  </div>
                </div>
              </div>

              {/* Finished Sacks List in Store */}
              {inspectingBatch.bags_list && inspectingBatch.bags_list.length > 0 && (
                <div className="bg-factory-dark p-3.5 rounded-lg border border-factory-darkBorder space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5" />
                      Sacks Shipped to Store ({inspectingBatch.bags_list.length} Sacks • {inspectingBatch.total_packed_kg || inspectingBatch.finished_output_kg} KG)
                    </span>
                    {parseFloat(inspectingBatch.remaining_unpacked_kg || '0') > 0 && (
                      <span className="text-[10px] text-factory-amber font-mono">
                        Remaining: {inspectingBatch.remaining_unpacked_kg} KG
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {inspectingBatch.bags_list.map((bag) => (
                      <div key={bag.id} className="bg-factory-darkCard p-2.5 rounded border border-factory-darkBorder flex justify-between items-center text-xs">
                        <div>
                          <span className="font-mono font-bold text-factory-paper">{bag.bag_id}</span>
                          <div className="text-[10px] text-factory-muted">{bag.store_location}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right font-mono">
                            <span className="text-emerald-400 font-bold">{bag.weight_kg} KG</span>
                            <div className="text-[9px] text-factory-muted">{bag.status}</div>
                          </div>
                          {bag.status !== 'DISPATCHED' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteBag(bag.id)}
                              className="p-1 text-factory-muted hover:text-factory-crimson hover:bg-factory-crimson/10 rounded transition-colors cursor-pointer"
                              title="Delete/remove this sack from store"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total Waste & Factory Yield Summary */}
              <div className="bg-factory-dark p-3.5 rounded-lg border border-factory-darkBorder flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-factory-muted text-[10px] uppercase block">Total Waste (P1 + P2)</span>
                    <span className="font-mono font-bold text-factory-crimson text-sm">
                      {inspectingBatch.total_waste_kg} KG ({inspectingBatch.waste_percentage}%)
                    </span>
                  </div>
                  <div>
                    <span className="text-factory-muted text-[10px] uppercase block">Net Output Ready</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      {inspectingBatch.finished_output_kg} KG
                    </span>
                  </div>
                </div>
                <div className="text-xs text-factory-muted">
                  Sacks in Store: <span className="font-semibold text-emerald-400 font-mono">{inspectingBatch.bag_count || 0}</span> sacks ({inspectingBatch.total_packed_kg || '0.00'} KG)
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setInspectingBatch(null)}
                className="px-4 py-2 bg-factory-dark border border-factory-darkBorder rounded-lg text-factory-paper text-xs cursor-pointer hover:bg-factory-darkBorder/40"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
