export function exportLocalStorageToJSON() {
  const localStorageData = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);

    try {
      localStorageData[key] = JSON.parse(value);
    } catch (e) {
      localStorageData[key] = value;
    }
  }

  const jsonString = JSON.stringify(localStorageData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'localStorage.json';
  link.click();

  URL.revokeObjectURL(url);
}
