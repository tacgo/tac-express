## 2024-06-04 - Initial Setup\n**Learning:** Just starting out.\n**Action:** Keep looking for optimizations.
## 2024-06-04 - N+1 Queries in Promise.all

**Learning:** When fetching multiple records by ID (like shipments for a manifest), using `Promise.all(ids.map(id => getRecord(id)))` creates an N+1 query problem, hitting the DB N times.
**Action:** Always create a bulk fetch method like `getShipmentsByAwbs(awbs: string[])` using a `.in()` clause in Supabase to fetch all records in a single query.
