export function distributorCode(email: string): string {
  let hash = 5381;

  for (let index = 0; index < email.length; index += 1) {
    hash = ((hash * 33) ^ email.charCodeAt(index)) >>> 0;
  }

  return `NB${hash.toString(36).toUpperCase().slice(0, 8)}`;
}

export function promoLink(slug: string, code: string): string {
  return `https://nuvelle.ai/d/${slug}?ref=${code}`;
}
