// When a pulled feed's vendor re-published the exact bytes of the current
// batch after the data date (confirmedAt comes from the backend). The panel
// shows it so "data from Oct 31" next to "on schedule" reads as "the vendor
// sent the same file again", not as a contradiction. Null when there is
// nothing later to show, including an old file left on the vendor's server.
export const republishedAt = (feed) => {
	const dataAsOf = feed?.currentBatch?.dataAsOf;
	const confirmedAt = feed?.confirmedAt;
	if (!dataAsOf || !confirmedAt) return null;
	return new Date(confirmedAt).getTime() > new Date(dataAsOf).getTime() ? confirmedAt : null;
};
