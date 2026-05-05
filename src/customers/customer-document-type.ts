export const customerDocumentTypes = ['CEDULA', 'NIT'] as const;

export type CustomerDocumentType = (typeof customerDocumentTypes)[number];
