export const today = () => new Date().toISOString().slice(0, 10);

export const formatDate = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
