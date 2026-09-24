// HTTP calls of the Product Replacement feature. Thin functions over the
// global axios instance (src/utils/api.js): token and interceptors come from
// AuthContext.
import { apiGet, apiPost, apiDelete } from '../../utils/api';

const BASE = '/api/product-replacements';

export const fetchReplacementsMeta = () => apiGet(`${BASE}/meta`).then((res) => res.data);

// Module cache of the meta ({ enabled, isManager, managers }), shared by the
// Navbar, the Orders screen and the page. Keyed by the user: logout/login do
// not reload the page, so without the key the next user would inherit the
// previous one's gate. A failure clears the cache so the next call retries.
let metaCache = { key: null, promise: null };
export const fetchReplacementsMetaCached = (cacheKey) => {
	if (metaCache.key !== cacheKey || !metaCache.promise) {
		metaCache = {
			key: cacheKey,
			promise: fetchReplacementsMeta().catch((error) => {
				metaCache = { key: null, promise: null };
				throw error;
			}),
		};
	}
	return metaCache.promise;
};

export const fetchReplacements = (search = '') =>
	apiGet(BASE, { params: search ? { search } : {} }).then((res) => res.data);

// { source_sku, replacements: [{ replacement_sku, comment? }] } -> created rows
export const createReplacements = (payload) => apiPost(BASE, payload).then((res) => res.data);

// Marks a product as having no replacement; the comment is required.
export const createNoReplacement = ({ source_sku, comment }) =>
	apiPost(BASE, { source_sku, no_replacement: true, comment }).then((res) => res.data);

export const removeReplacement = (id) => apiDelete(`${BASE}/${id}`).then((res) => res.data);

export const addReplacementComment = (id, body) =>
	apiPost(`${BASE}/${id}/comments`, { body }).then((res) => res.data);

export const removeReplacementComment = (id, commentId) =>
	apiDelete(`${BASE}/${id}/comments/${commentId}`).then((res) => res.data);

// Orders screen: everything registered for one original SKU.
export const fetchReplacementsForSku = (sku) =>
	apiGet(`${BASE}/for-sku/${encodeURIComponent(sku)}`).then((res) => res.data);

// { counts: { [sku]: n } }
export const fetchReplacementCounts = (skus) => {
	if (!skus || skus.length === 0) return Promise.resolve({});
	return apiGet(`${BASE}/counts`, { params: { skus: skus.join(',') } }).then((res) => res.data.counts || {});
};

// Product search for the pickers: the existing catalog search
// (GET /api/products?search=) returns { products, pagination }.
export const searchProducts = (term, limit = 8) =>
	apiGet('/api/products', { params: { search: term, page: 1, limit } }).then((res) => res.data?.products || []);

// Product preview for the cards: catalog data plus the live Magento name,
// image, description and store page (404 = not in the catalog nor in Magento).
export const fetchProductPreview = (sku) =>
	apiGet(`${BASE}/products/${encodeURIComponent(sku)}`)
		.then((res) => res.data || null)
		.catch((error) => {
			if (error?.response?.status === 404) return null;
			throw error;
		});
