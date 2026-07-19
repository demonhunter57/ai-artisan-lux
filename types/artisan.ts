export interface ArtisanProfile {
  company: string;
  manager: string;
  address: string;
  city: string;
  postal: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  tvaNumber: string;
  matricule: string;
  rcs: string;
  autorisation: string;
  iban?: string;
  bic?: string;
  logoUrl?: string | null;
}

export interface PriceCatalogItem {
  reference: string;
  description: string;
  unit: string;
  unitPrice: number;
}

export interface PriceCatalog {
  currency: string;
  updatedAt: string;
  items: PriceCatalogItem[];
}
