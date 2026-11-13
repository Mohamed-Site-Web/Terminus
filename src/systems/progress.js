// Fins découvertes, gardées dans le navigateur entre les parties.

const KEY = 'traintrain_endings';

export function foundEndings() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

export function recordEnding(id) {
  const found = foundEndings();
  const isNew = !found.has(id);
  found.add(id);
  try {
    localStorage.setItem(KEY, JSON.stringify([...found]));
  } catch {
    /* stockage indisponible : la fin n'est pas mémorisée */
  }
  return isNew;
}
