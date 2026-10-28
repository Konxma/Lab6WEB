export enum ClothingSize {
  XS = 'XS', S = 'S', M = 'M', L = 'L', XL = 'XL',
}

export interface ClothingEntity {
  id: string;
  title: string;
  slug: string;
  price: number;
  size: ClothingSize;
  material: string;
  color: string;
}
