export function normalizeBrandKey(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export function normalizeBrandName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}
