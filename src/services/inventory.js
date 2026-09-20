export const emptyInventoryFilters = { search: '', raw: '', quality: '', size: '', mark: '', status: 'all', sort: 'name' };
export function filterInventory(rows, filters) {
  const query = filters.search.trim().toLocaleLowerCase();
  const result = rows.filter(row =>
    (!query || `${row.name} ${row.bag_mark || ''}`.toLocaleLowerCase().includes(query)) &&
    (!filters.raw || String(row.raw_type_id) === filters.raw) &&
    (!filters.quality || String(row.quality) === filters.quality) &&
    (filters.size === '' || Number(row.bag_size || 0) === Number(filters.size)) &&
    (!filters.mark || row.bag_mark === filters.mark) &&
    (filters.status === 'all' || (filters.status === 'available' ? Number(row.available)>0 : filters.status === 'reserved' ? Number(row.reserved)>0 : Number(row.physical) === 0))
  );
  return result.sort((a,b) => filters.sort === 'available' ? Number(b.available)-Number(a.available) : filters.sort === 'physical' ? Number(b.physical)-Number(a.physical) : a.name.localeCompare(b.name) || Number(a.bag_size)-Number(b.bag_size) || (a.bag_mark || '').localeCompare(b.bag_mark || ''));
}
