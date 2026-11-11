import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentCategoryApi } from '../services/api';
import { LEVELS } from '../utils/constants';
import CurrencyInput from '../components/CurrencyInput';
import { Save, Plus, Pencil, Trash2, X, Search, Power, Package } from 'lucide-react';

const emptyCreateForm = { name: '', default_amount: '' };

export default function Catalog() {
  const qc = useQueryClient();
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [dirtyAmounts, setDirtyAmounts] = useState({});
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [renameGroup, setRenameGroup] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteGroup, setDeleteGroup] = useState(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['payment-categories'],
    queryFn: () => paymentCategoryApi.list().then((r) => r.data),
  });

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const apiError = (err, fallback) => {
    const errors = err.response?.data?.errors;
    if (errors) {
      const first = Object.values(errors)[0];
      if (Array.isArray(first) && first[0]) return first[0];
    }
    return err.response?.data?.message || fallback;
  };

  const serverAmounts = useMemo(() => {
    const amounts = {};
    (categories ?? []).forEach((cat) => {
      amounts[cat.id] = cat.default_amount;
    });
    return amounts;
  }, [categories]);

  const amountFor = (id) => (
    Object.prototype.hasOwnProperty.call(dirtyAmounts, id)
      ? dirtyAmounts[id]
      : serverAmounts[id]
  );

  const groupedCategories = useMemo(() => {
    if (!categories) return [];
    const map = new Map();
    categories.forEach((cat) => {
      if (!map.has(cat.name)) map.set(cat.name, []);
      map.get(cat.name).push(cat);
    });
    return Array.from(map.entries()).map(([name, items]) => ({
      name,
      items,
      isActive: items.every((item) => item.is_active),
    }));
  }, [categories]);

  const filteredGroups = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return groupedCategories;
    return groupedCategories.filter((group) => group.name.toLowerCase().includes(keyword));
  }, [groupedCategories, search]);

  const savePricesMutation = useMutation({
    mutationFn: (data) => paymentCategoryApi.update(data),
    onSuccess: (res) => {
      qc.setQueryData(['payment-categories'], res.data);
      setDirtyAmounts({});
      showToast('Harga katalog berhasil disimpan!', 'success');
    },
    onError: (err) => showToast(apiError(err, 'Gagal menyimpan harga katalog.'), 'error'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => paymentCategoryApi.createGroup(data),
    onSuccess: (res) => {
      qc.setQueryData(['payment-categories'], res.data);
      setCreateOpen(false);
      setCreateForm(emptyCreateForm);
      showToast('Kategori berhasil ditambahkan!', 'success');
    },
    onError: (err) => showToast(apiError(err, 'Gagal menambah kategori.'), 'error'),
  });

  const updateGroupMutation = useMutation({
    mutationFn: (data) => paymentCategoryApi.updateGroup(data),
    onSuccess: (res) => {
      qc.setQueryData(['payment-categories'], res.data);
      setRenameGroup(null);
      showToast('Kategori berhasil diperbarui!', 'success');
    },
    onError: (err) => showToast(apiError(err, 'Gagal memperbarui kategori.'), 'error'),
  });

  const toggleMutation = useMutation({
    mutationFn: (data) => paymentCategoryApi.updateGroup(data),
    onSuccess: (res) => {
      qc.setQueryData(['payment-categories'], res.data);
      showToast('Status kategori berhasil diperbarui!', 'success');
    },
    onError: (err) => showToast(apiError(err, 'Gagal memperbarui status kategori.'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (name) => paymentCategoryApi.deleteGroup(name),
    onSuccess: (res) => {
      qc.setQueryData(['payment-categories'], res.data);
      setDeleteGroup(null);
      showToast('Kategori berhasil dihapus!', 'success');
    },
    onError: (err) => showToast(apiError(err, 'Gagal menghapus kategori.'), 'error'),
  });

  const handleAmountChange = (id, value) => {
    setDirtyAmounts((prev) => ({ ...prev, [id]: value }));
  };

  const handleSavePrices = () => {
    const data = {
      categories: (categories ?? []).map((cat) => ({
        id: cat.id,
        default_amount: parseFloat(amountFor(cat.id)) || 0,
      })),
    };
    savePricesMutation.mutate(data);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;
    createMutation.mutate({
      name: createForm.name.trim(),
      default_amount: parseFloat(createForm.default_amount) || 0,
    });
  };

  const handleRename = (e) => {
    e.preventDefault();
    if (!renameValue.trim()) return;
    updateGroupMutation.mutate({
      original_name: renameGroup.name,
      name: renameValue.trim(),
    });
  };

  const handleToggle = (group) => {
    toggleMutation.mutate({
      original_name: group.name,
      name: group.name,
      is_active: !group.isActive,
    });
  };

  const openRename = (group) => {
    setRenameGroup(group);
    setRenameValue(group.name);
  };

  return (
    <div className="page">
      {toast && <div className={`toast toast--${toast.type}`}>{toast.msg}</div>}

      <div className="page-header">
        <div>
          <h1 className="page-title">Katalog</h1>
          <p className="page-subtitle">Kelola kategori biaya dan harga default per level siswa</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button className="btn btn-secondary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            <span>Tambah Kategori</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSavePrices}
            disabled={savePricesMutation.isPending || isLoading || !categories?.length}
          >
            <Save size={16} />
            {savePricesMutation.isPending ? 'Menyimpan...' : 'Simpan Harga'}
          </button>
        </div>
      </div>

      <div className="form-section">
        <div className="section-header">
          <Package size={18} className="section-icon" />
          <h2 className="section-title">Daftar Harga</h2>
        </div>
        <p className="section-desc">
          Harga ini muncul sebagai opsi quick-add saat membuat invoice baru sesuai level siswa.
          Kategori nonaktif tidak ditampilkan pada quick-add dan template import.
        </p>

        {!isLoading && groupedCategories.length > 0 && (
          <div className="filters-bar">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Cari kategori..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="table-empty"><div className="spinner" /></div>
        ) : groupedCategories.length === 0 ? (
          <div className="table-empty">
            <Package size={44} className="empty-icon" />
            <p>Belum ada kategori. <span className="link" onClick={() => setCreateOpen(true)}>Tambah sekarang</span></p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="table-empty">
            <Search size={40} className="empty-icon" />
            <p>Tidak ada kategori yang cocok dengan pencarian.</p>
          </div>
        ) : (
          <div className="category-matrix">
            <div className="category-matrix-header">
              <span className="cat-mx-name">Kategori</span>
              {LEVELS.map((level) => (
                <span key={level} className="cat-mx-level">{level}</span>
              ))}
              <span className="cat-mx-level">Aksi</span>
            </div>

            {filteredGroups.map((group) => (
              <div
                key={group.name}
                className={`category-matrix-row ${group.isActive ? '' : 'category-matrix-row--inactive'}`}
              >
                <div className="cat-mx-name cat-mx-name-wrap">
                  <span className="cat-mx-name-text">{group.name}</span>
                  <span className={`catalog-badge ${group.isActive ? 'catalog-badge--active' : 'catalog-badge--inactive'}`}>
                    {group.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                {LEVELS.map((level) => {
                  const cat = group.items.find((c) => c.student_level === level);
                  if (!cat) return <div key={level} className="cat-mx-cell" />;
                  return (
                    <div key={level} className="cat-mx-cell">
                      <div className="input-group input-group--compact">
                        <span className="input-prefix">Rp</span>
                        <CurrencyInput
                          className="form-input text-right"
                          value={amountFor(cat.id)}
                          onValueChange={(v) => handleAmountChange(cat.id, v)}
                        />
                      </div>
                    </div>
                  );
                })}

                <div className="cat-mx-actions">
                  <button
                    className="action-btn action-btn--edit"
                    title="Ubah nama kategori"
                    aria-label={`Ubah nama ${group.name}`}
                    onClick={() => openRename(group)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className={`action-btn action-btn--toggle ${group.isActive ? '' : 'action-btn--toggle-off'}`}
                    title={group.isActive ? 'Nonaktifkan kategori' : 'Aktifkan kategori'}
                    aria-label={group.isActive ? `Nonaktifkan ${group.name}` : `Aktifkan ${group.name}`}
                    onClick={() => handleToggle(group)}
                    disabled={toggleMutation.isPending}
                  >
                    <Power size={15} />
                  </button>
                  <button
                    className="action-btn action-btn--delete"
                    title="Hapus kategori"
                    aria-label={`Hapus ${group.name}`}
                    onClick={() => setDeleteGroup(group)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tambah Kategori */}
      {createOpen && (
        <div className="modal-overlay show" onClick={() => setCreateOpen(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleCreate}>
            <div className="modal-header">
              <h3 className="modal-title">Tambah Kategori</h3>
              <button type="button" className="btn-icon" onClick={() => setCreateOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nama Kategori</label>
                <input
                  className="form-input"
                  placeholder="Contoh: Seragam Sekolah"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Harga Awal (semua level) — opsional</label>
                <div className="input-group">
                  <span className="input-prefix">Rp</span>
                  <CurrencyInput
                    className="form-input text-right"
                    placeholder="0"
                    value={createForm.default_amount}
                    onValueChange={(v) => setCreateForm((f) => ({ ...f, default_amount: v }))}
                  />
                </div>
                <p className="section-desc mt-2">Harga per level tetap dapat diubah pada tabel setelah kategori dibuat.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)}>
                Batal
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={createMutation.isPending || !createForm.name.trim()}
              >
                {createMutation.isPending ? 'Menyimpan...' : 'Tambah'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ubah Nama Kategori */}
      {renameGroup && (
        <div className="modal-overlay show" onClick={() => setRenameGroup(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleRename}>
            <div className="modal-header">
              <h3 className="modal-title">Ubah Nama Kategori</h3>
              <button type="button" className="btn-icon" onClick={() => setRenameGroup(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nama Kategori</label>
                <input
                  className="form-input"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  autoFocus
                />
              </div>
              <p className="section-desc">Nama pada invoice lama tidak berubah; perubahan berlaku untuk data katalog dan invoice baru.</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setRenameGroup(null)}>
                Batal
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={updateGroupMutation.isPending || !renameValue.trim()}
              >
                {updateGroupMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Hapus Kategori */}
      {deleteGroup && (
        <div className="modal-overlay show" onClick={() => setDeleteGroup(null)}>
          <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body">
              <h3 className="modal-title">Hapus kategori &quot;{deleteGroup.name}&quot;?</h3>
              <p className="modal-desc">
                Harga default kategori ini akan hilang dari quick-add dan template import.
                Invoice yang sudah ada tetap menyimpan nama biaya tersebut.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteGroup(null)}>
                Batal
              </button>
              <button
                className="btn btn-danger"
                onClick={() => deleteMutation.mutate(deleteGroup.name)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
